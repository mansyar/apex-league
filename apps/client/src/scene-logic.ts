/**
 * Scene-logic: pure, DOM-free motion math for the ranch scene. Unit-tested
 * here so `scene.ts` stays thin visual glue. Presentational only — nothing
 * in this module touches `@apex/sim` state, the save, or voxel geometry.
 *
 * Phase A: wind sway. Per-prop-class base amplitudes, a seeded phase hash
 * of each prop's world position, and a slow gust envelope. Sway is applied
 * by the scene as a runtime transform — the determinism gate sees nothing.
 */
import { makeRng, type Rng } from "@apex/voxel"

/**
 * Base sway amplitude (radians) per prop id, by class: tufts flutter most,
 * bushes medium, trees least; rocks and the food pile are anchored and
 * never move. Unknown ids fail closed to 0 so a new registry prop can't
 * accidentally start dancing before it is tuned.
 */
const WIND_BASE_AMPS: Record<string, number> = {
  tuft: 0.09,
  bush: 0.045,
  broadleafTree: 0.018,
  rock: 0,
  foodPile: 0,
}

export function windBaseAmp(propId: string): number {
  return WIND_BASE_AMPS[propId] ?? 0
}

/**
 * Gust envelope: two incommensurate slow waves (periods in the tens of
 * seconds) mixed with a faster ripple, remapped into [0.4, 1.2]. Sum of
 * sinusoids is smooth by construction — calm moments and stronger gusts
 * alternate, never storm force, with no discontinuities to pop the eye.
 *
 * Pure function of time; the same `t` always yields the same breeze.
 */
export function gustEnvelope(t: number): number {
  const waveA = Math.sin(t * ((2 * Math.PI) / 37))
  const waveB = Math.sin(t * ((2 * Math.PI) / 53) + 1.7)
  const ripple = Math.sin(t * ((2 * Math.PI) / 23) + 4.1)
  const mix = (waveA + 0.5 * waveB + 0.3 * ripple) / 1.8 // [-1, 1]
  return 0.8 + 0.4 * mix // [0.4, 1.2]
}

/**
 * Deterministic phase hash of a prop's world position: each prop sways on
 * its own clock so the meadow ripples rather than pulsing in lockstep.
 * Quantized to 1/32 of a unit so infinitesimal float drift in the scatter
 * can never shift the phase. Salt separates props placed at identical
 * positions. No `Math.random` anywhere — same position, same phase, forever.
 */
export function phaseHash(x: number, z: number, salt: number): number {
  const xi = Math.round(x * 32) | 0
  const zi = Math.round(z * 32) | 0
  let h =
    (Math.imul(xi, 0x9e3779b1) ^
      Math.imul(zi, 0x85ebca6b) ^
      Math.imul(salt | 0, 0xc2b2ae35)) >>>
    0
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d) >>> 0
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39) >>> 0
  h = (h ^ (h >>> 15)) >>> 0
  return (h / 4294967296) * Math.PI * 2
}

/** Season flutter cadence: slow enough to read as breeze, fast enough to notice. */
const WIND_OMEGA = 1.9

/**
 * Total sway angle (radians) for a prop at time `t`: base amplitude × gust
 * envelope × a phase-offset flutter. Reduced motion flattens every prop to
 * exactly 0 — the same gate the mood bounce already honors.
 */
export function swayAngle(
  baseAmp: number,
  phase: number,
  t: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion || baseAmp === 0) return 0
  return baseAmp * gustEnvelope(t) * Math.sin(t * WIND_OMEGA + phase)
}

// -- Feeding ceremony ---------------------------------------------------------

/**
 * Blend two yaw angles along the SHORTEST arc (shortest-arc turn for the
 * ceremony's facing phase — never a 5-radian spin to look at the food).
 */
export function lerpAngle(a: number, b: number, k: number): number {
  if (k <= 0) return a
  if (k >= 1) return b
  return a + wrapPi(b - a) * k
}

/** Wrap an angle delta into (-π, π]. */
export function wrapPi(delta: number): number {
  let d = delta
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}
//
// Position-driven feeding ceremony (rework, 2026-10-10): after a successful
// Feed the creature strides by POSITION — walk from wherever it stands to
// the stand spot by the pile, nibble in place, then walk back to the home
// anchor — instead of riding a fixed clock. Movement is stepped by a
// clamped dt, so a paused tab or a long frame can never skip a phase or
// strand the body mid-path: the walk simply continues and converges.
// Policy: the ceremony is non-cancelable — HUD input applies to the sim
// immediately but never interrupts the motion.

export type CeremonyPhase = "idle" | "walk-out" | "nibble" | "walk-home"

/** Constant stride speed in world units per second. */
const WALK_SPEED = 2.2
/** In-place nibble time (seconds); 2.5 dip cycles fit inside it. */
const NIBBLE_TIME = 2.2
/** Pivot speed while turning in place (radians per second). */
const TURN_SPEED = 6
/** Yaw error above which the creature pivots before walking (radians).
 * Small enough that any residual angle while striding is invisible. */
const TURN_THRESHOLD = 0.12

/** Per-frame drive signal the scene applies directly to the creature. */
export interface WalkDrive {
  x: number
  z: number
  yaw: number
  phase: CeremonyPhase
  dipOffset: number
  done: boolean
  /** True while the creature pivots in place (legs stay still). */
  pivoting: boolean
}

export interface WalkMachine {
  /** Begin a walk from (fromX, fromZ) facing `fromYaw`, toward the stand
   * spot. Safe to call mid-walk: the new walk starts from the given pose
   * and eases the yaw rather than snapping it. */
  begin(
    fromX: number,
    fromZ: number,
    standX: number,
    standZ: number,
    fromYaw: number,
  ): void
  /** Advance one clamped-dt step from (x, z) and return the drive state. */
  advance(x: number, z: number, dt: number): WalkDrive
}

/** The creature mesh faces +z at rest (confirmed live: with the
 * visual-center anchor in place the walk-out toward −x read tail-first), so
 * heading toward a world direction (dx, dz) is atan2(dx, dz) directly. */
function heading(dx: number, dz: number): number {
  return Math.atan2(dx, dz)
}

export function createWalk(reducedMotion: boolean): WalkMachine {
  let standX = 0
  let standZ = 0
  let phase: CeremonyPhase = "idle"
  let yaw = 0
  let nibbleElapsed = 0

  /** Move (x, z) one clamped step toward the target at WALK_SPEED,
   * turning in place first when misaligned. Shared by the ceremony and
   * wander machines. Never overshoots. */
  const stride = (x: number, z: number, targetX: number, targetZ: number, step: number) => {
    const s = strideStep(x, z, yaw, targetX, targetZ, step)
    yaw = s.yaw
    return { x: s.x, z: s.z, arrived: s.arrived, pivoting: s.pivoting }
  }

  const advance = (x: number, z: number, dt: number): WalkDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    if (phase === "idle") {
      return { x, z, yaw, phase, dipOffset: 0, done: true, pivoting: false }
    }
    if (phase === "walk-out") {
      const s = stride(x, z, standX, standZ, step)
      if (s.arrived) {
        phase = "nibble"
        nibbleElapsed = 0
      }
      return {
        x: s.x,
        z: s.z,
        yaw,
        phase,
        dipOffset: 0,
        done: false,
        pivoting: s.pivoting,
      }
    }
    if (phase === "nibble") {
      nibbleElapsed += step
      const dipOffset = Math.abs(
        Math.sin((Math.PI * nibbleElapsed) / (NIBBLE_TIME / 2.5)),
      )
      if (nibbleElapsed >= NIBBLE_TIME) {
        // Reduced motion has no travel: the nibble ends the ceremony.
        phase = reducedMotion ? "idle" : "walk-home"
      }
      return {
        x,
        z,
        yaw,
        phase,
        dipOffset: phase === "nibble" ? dipOffset : 0,
        done: phase === "idle",
        pivoting: false,
      }
    }
    // walk-home: back to the home anchor at the origin.
    const s = stride(x, z, 0, 0, step)
    if (s.arrived) {
      phase = "idle"
      return {
        x: 0,
        z: 0,
        yaw,
        phase,
        dipOffset: 0,
        done: true,
        pivoting: false,
      }
    }
    return {
      x: s.x,
      z: s.z,
      yaw,
      phase,
      dipOffset: 0,
      done: false,
      pivoting: s.pivoting,
    }
  }

  return {
    /** Begin a walk from the creature's CURRENT pose. `fromYaw` is the
     * creature's rendered yaw; the machine eases from it instead of
     * snapping, so the turn reads as a pivot rather than a teleport. */
    begin(fromX, fromZ, sx, sz, fromYaw) {
      nibbleElapsed = 0
      yaw = fromYaw
      if (reducedMotion) {
        // No travel: nibble where you stand. The stand spot is ignored so
        // the scene never needs to guard against reduced-motion travel.
        standX = fromX
        standZ = fromZ
        phase = "nibble"
        return
      }
      standX = sx
      standZ = sz
      phase = "walk-out"
    },
    advance,
  }
}

// ---------------------------------------------------------------------------
// Diagonal-pair walk gait
// ---------------------------------------------------------------------------

/** Step-cycle angular speed: a full cycle (one step per diagonal pair) every
 * ~0.5 s — brisk enough to read as a walk at ceremony travel speeds. */
export const GAIT_CADENCE = (Math.PI * 2) / 0.5
/** Leg swing amplitude in radians around each hip pivot. */
export const GAIT_SWING = 0.35
/** Body bob amplitude (world units) — one bump per step pair. */
export const GAIT_BOB = 0.05
/** Weight-shift roll amplitude (radians on the body pivot). */
export const GAIT_ROLL = 0.03

/** One frame of the walk cycle, ready to map onto the creature rig. */
export interface GaitPose {
  /** Front-left / back-right swing (rotation.x on the hip pivots). */
  fl: number
  br: number
  /** Front-right / back-left swing — exactly counterphase to fl/br. */
  fr: number
  bl: number
  /** Body lift (0..GAIT_BOB·amp), one bump per step pair. */
  bob: number
  /** Weight shift left/right (rotation.z on the body pivot). */
  roll: number
}

/**
 * Sample the walk cycle at time `t`. `amp` (0..1) scales the whole pose so
 * callers can blend the gait in/out with a walk phase's easing — the scene
 * drives amp from the ceremony's walk phase progress. Reduced motion
 * flattens everything to zero.
 */
export function gaitPose(
  t: number,
  amp: number,
  reducedMotion: boolean,
): GaitPose {
  const zero: GaitPose = { fl: 0, br: 0, fr: 0, bl: 0, bob: 0, roll: 0 }
  if (reducedMotion || amp <= 0) return zero
  const phase = t * GAIT_CADENCE
  const swing = Math.sin(phase) * GAIT_SWING * amp
  return {
    fl: swing,
    br: swing,
    fr: -swing,
    bl: -swing,
    bob: Math.abs(Math.sin(phase)) * GAIT_BOB * amp,
    roll: Math.sin(phase) * GAIT_ROLL * amp,
  }
}

/** One clamped step of straight-line travel, shared by the ceremony and
 * wander machines: pivot in place until facing the target within
 * TURN_THRESHOLD, then move at WALK_SPEED with yaw locked. Never
 * overshoots. The caller owns the returned yaw. */
function strideStep(
  x: number,
  z: number,
  yaw: number,
  targetX: number,
  targetZ: number,
  step: number,
): { x: number; z: number; yaw: number; arrived: boolean; pivoting: boolean } {
  const dx = targetX - x
  const dz = targetZ - z
  const d = Math.hypot(dx, dz)
  const reach = WALK_SPEED * step
  if (d <= reach + 1e-4)
    return { x: targetX, z: targetZ, yaw, arrived: true, pivoting: false }
  const want = heading(dx, dz)
  const err = wrapPi(want - yaw)
  if (Math.abs(err) > TURN_THRESHOLD) {
    // Pivot first: rotate toward the heading without translating, so
    // the subsequent travel is a visibly straight line.
    const turn = Math.min(Math.abs(err), TURN_SPEED * step)
    return {
      x,
      z,
      yaw: yaw + Math.sign(err) * turn,
      arrived: false,
      pivoting: true,
    }
  }
  const k = reach / d
  return {
    x: x + dx * k,
    z: z + dz * k,
    yaw,
    arrived: false,
    pivoting: false,
  }
}

// ---------------------------------------------------------------------------
// Sparse wandering (FR3). While the creature is home-idle and in an eligible
// mood, it takes at most one trip per 20–40 s window to look at a tuft or
// bush, then returns home. The gap and targets come from a free-running rng
// seeded per scene (visualSeed ^ stepCount) — never wall-clock, never part
// of a save, never passed to the sim.
// ---------------------------------------------------------------------------

/** The home anchor sits at the scene origin; the food pile never hosts a
 * wander visit. */
export const WANDER_PILE = { x: -2.4, z: 0.4 }
export const WANDER_DISC_RADIUS = 8.5
export const WANDER_MIN_PILE_DIST = 1.8/** Visits stop this far short of the chosen prop. */
export const WANDER_VISIT_STOP = 0.9
export const WANDER_VISIT_NEAR = 1.6
export const WANDER_GAP_MIN = 20
export const WANDER_GAP_MAX = 40
/** How far, in radians, the head/yaw sweeps while sightseeing. */
const VISIT_LOOK_SPAN = 0.45

export type WanderPhase = "home-idle" | "walk-out" | "visit-pause" | "walk-home"

export interface WanderProp {
  x: number
  z: number
}

export interface WanderDrive {
  phase: WanderPhase
  x: number
  z: number
  yaw: number
  /** Extra yaw sweep while sightseeing (drive by the scene additively). */
  lookOffset: number
  pivoting: boolean
}

/** A free-running 20–40 s wander gap from the given rng (seeded per scene,
 * deterministic under the gate). */
export function nextGap(rng: Rng): number {
  return WANDER_GAP_MIN + rng.next() * (WANDER_GAP_MAX - WANDER_GAP_MIN)
}

/** Choose a visit spot near one of the candidate props, but never near the
 * food pile (which is anchored at the pile position and excluded by the
 * scene) and never outside the moss disc. Deterministic in the rng state.
 * Returns null when nothing qualifies. */
export function pickVisitTarget(
  props: WanderProp[],
  fromX: number,
  fromZ: number,
  rng: Rng,
): { x: number; z: number } | null {
  if (props.length === 0) return null
  // Try each candidate from a seeded starting index; every option is
  // examined at most once so the chooser is exhaustive and finite.
  const start = rng.int(props.length)
  for (let i = 0; i < props.length; i++) {
    const p = props[(start + i) % props.length]
    if (!p) continue
    const dx = p.x - fromX
    const dz = p.z - fromZ
    const d = Math.hypot(dx, dz) || 1
    // Stand short of the prop on the line from where we are: the visit
    // reads as "walked up to it and stopped".
    const x = p.x - (dx / d) * WANDER_VISIT_STOP
    const z = p.z - (dz / d) * WANDER_VISIT_STOP
    if (Math.hypot(x, z) > WANDER_DISC_RADIUS) continue
    const nearPile = Math.hypot(x - WANDER_PILE.x, z - WANDER_PILE.z)
    if (nearPile < WANDER_MIN_PILE_DIST) continue
    const nearProp = Math.hypot(x - p.x, z - p.z)
    if (nearProp > WANDER_VISIT_NEAR) continue
    return { x, z }
  }
  return null
}

export interface WanderMachine {
  /** Feed the current world-space target candidates (tufts/bushes — the
   * scene already filters to visible scenery and excludes the pile). */
  setCandidates(props: WanderProp[]): void
  /** (Re)seed the free-running rng and reset the countdown. */
  begin(x: number, z: number): void
  /** Cancel-free external reset (a feed ceremony taking the creature): end
   * the trip immediately; the scene stops applying wander drives. */
   abort(): void
  /** Advance the machine. `allow` is the mood/reduced-motion/ceremony gate:
   * gaps accrue only while allowed, and trips are started only while
   * allowed (an already-running trip is always finished gracefully). */
  advance(x: number, z: number, dt: number, allow: boolean): WanderDrive
}

export function createWander(reducedMotion: boolean, seed: number): WanderMachine {
  let rng = makeRng(seed)
  let candidates: WanderProp[] = []
  let phase: WanderPhase = "home-idle"
  let gap = nextGap(rng)
  let gapAccum = 0
  let targetX = 0
  let targetZ = 0
  let yaw = 0
  let pauseElapsed = 0
  let pauseDuration = 0
  let lookBase = 0

  const startTrip = (fromX: number, fromZ: number) => {
    const pick = pickVisitTarget(candidates, fromX, fromZ, rng)
    if (!pick) {
      // Nothing to visit this window — re-roll the gap and stay home.
      gap = nextGap(rng)
      gapAccum = 0
      return false
    }
    targetX = pick.x
    targetZ = pick.z
    pauseDuration = rng.next() + 1 // 1–2 s in the 1..2 window
    pauseElapsed = 0
    lookBase = heading(targetX - fromX, targetZ - fromZ)
    yaw = 0 // the stride eases this from the creature's actual facing
    phase = "walk-out"
    return true
  }

  return {
    setCandidates(list) {
      candidates = list
    },

    begin(x, z) {
      // Re-seed from the seed plus the outgoing gap so successive trips
      // re-roll deterministically, without wall-clock or save input.
      rng = makeRng((seed ^ Math.round(gap * 4096)) >>> 0)
      gap = nextGap(rng)
      gapAccum = 0
      phase = "home-idle"
    },

    abort() {
      phase = "home-idle"
      gapAccum = 0
      gap = nextGap(rng)
    },

    advance(x, z, dt, allow) {
      const step = Math.min(Math.max(dt, 0), 0.1)
      if (phase === "home-idle") {
        if (allow && !reducedMotion) {
          gapAccum += step
          if (gapAccum >= gap && candidates.length > 0) {
            startTrip(x, z)
          }
        }
        return { phase, x, z, yaw, lookOffset: 0, pivoting: false }
      }
      if (phase === "walk-out") {
        const s = strideStep(x, z, yaw, targetX, targetZ, step)
        yaw = s.yaw
        if (s.arrived) {
          phase = "visit-pause"
          pauseElapsed = 0
        }
        return {
          phase,
          x: s.x,
          z: s.z,
          yaw,
          lookOffset: 0,
          pivoting: s.pivoting,
        }
      }
      if (phase === "visit-pause") {
        pauseElapsed += step
        // Gentle look-around: one full sweep over the pause.
        const t = pauseElapsed / Math.max(pauseDuration, 1e-6)
        const lookOffset =
          reducedMotion
            ? 0
            : Math.sin(t * Math.PI * 2) * VISIT_LOOK_SPAN
        if (pauseElapsed >= pauseDuration) {
          phase = "walk-home"
        }
        return { phase, x, z, yaw: lookBase, lookOffset, pivoting: false }
      }
      // walk-home: back to the home anchor at the origin.
      const s = strideStep(x, z, yaw, 0, 0, step)
      yaw = s.yaw
      if (s.arrived) {
        phase = "home-idle"
        gapAccum = 0
        gap = nextGap(rng)
        return {
          phase,
          x: 0,
          z: 0,
          yaw,
          lookOffset: 0,
          pivoting: false,
        }
      }
      return {
        phase,
        x: s.x,
        z: s.z,
        yaw,
        lookOffset: 0,
        pivoting: s.pivoting,
      }
    },
  }
}

