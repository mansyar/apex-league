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
  /** Current stride destination (the stand spot or the home anchor). */
  targetX: number
  targetZ: number
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
  const stride = (
    x: number,
    z: number,
    targetX: number,
    targetZ: number,
    step: number,
  ) => {
    const s = strideStep(x, z, yaw, targetX, targetZ, step)
    yaw = s.yaw
    return { x: s.x, z: s.z, arrived: s.arrived, pivoting: s.pivoting }
  }

  const advance = (x: number, z: number, dt: number): WalkDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    if (phase === "idle") {
      return {
        x,
        z,
        yaw,
        phase,
        dipOffset: 0,
        done: true,
        pivoting: false,
        targetX: x,
        targetZ: z,
      }
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
        targetX: standX,
        targetZ: standZ,
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
        targetX: standX,
        targetZ: standZ,
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
        targetX: 0,
        targetZ: 0,
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
      targetX: 0,
      targetZ: 0,
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
// Evolution ceremony
// ---------------------------------------------------------------------------

// The growth moment (evolution track, 2026-10-11): the creature walks to
// the ranch center, glows while it swells, and the scene swaps the baby rig
// for the juvenile rig at the pulse's peak. Position-driven like the feed
// ceremony — a paused tab or a long frame can never skip the swap; the
// machine simply continues and converges. Reduced motion skips straight to
// the swap where the creature stands (spec R5).

/** World-units holder scale for the baby stage (juvenile fills 1.0). */
export const BABY_SCALE = 0.6
/** World-units holder scale from the juvenile stage on. */
export const JUVENILE_SCALE = 1
/** World-units holder scale for the champion stage: the grander silhouette
 * comes from the holder only (learnings.md — the rig children keep their
 * rig-unit contract; the proportion maturation happens in the voxel build). */
export const CHAMPION_SCALE = 1.15

/** Holder scale for a life stage — single-sources the ranch stage ladder. */
export function stageScale(stage: "baby" | "juvenile" | "champion"): number {
  return stage === "baby"
    ? BABY_SCALE
    : stage === "champion"
      ? CHAMPION_SCALE
      : JUVENILE_SCALE
}

export type EvolutionPhase = "idle" | "walk" | "glow" | "settle"

export interface EvolutionDrive {
  x: number
  z: number
  yaw: number
  phase: EvolutionPhase
  /** Holder scale to apply this frame. */
  scale: number
  /** Emissive pulse intensity 0..1 for the glow. */
  glow: number
  /** True exactly once, on the frame the mesh swap should happen. */
  swap: boolean
  /** True while the creature pivots in place (legs stay still). */
  pivoting: boolean
  /** True while the machine owns the creature. */
  active: boolean
}

/** Glow swell time and settle time, in seconds (wall-pace, dt-clamped). */
const GLOW_TIME = 1.4
const SETTLE_TIME = 0.6
/** How far above the baby scale the swell peaks before the swap. */
const SWELL = 0.18
/** Settle overshoot above the juvenile scale. */
const OVERSHOOT = 0.08

export interface EvolutionMachine {
  /** Begin from the creature's current pose: only the yaw and the motion
   * preference are needed (advance reads the live position). Reduced
   * motion swaps in place. The scale journey is parametrized so a
   * champion ceremony (juvenile → champion) can start at the juvenile
   * scale and settle grander; the defaults keep the classic baby →
   * juvenile journey. */
  begin(
    fromYaw: number,
    reducedMotion: boolean,
    scales?: { fromScale?: number; toScale?: number },
  ): void
  /** Advance one clamped-dt step from (x, z). */
  advance(x: number, z: number, dt: number): EvolutionDrive
}

export function createEvolutionCeremony(): EvolutionMachine {
  let phase: EvolutionPhase = "idle"
  let yaw = 0
  let elapsed = 0
  let swapPending = false
  let fromScale = BABY_SCALE
  let toScale = JUVENILE_SCALE

  const begin = (
    fromYaw: number,
    reducedMotion: boolean,
    scales?: { fromScale?: number; toScale?: number },
  ): void => {
    yaw = fromYaw
    elapsed = 0
    fromScale = scales?.fromScale ?? BABY_SCALE
    toScale = scales?.toScale ?? JUVENILE_SCALE
    if (reducedMotion) {
      // Instant variant: swap where you stand — no travel, no glow.
      swapPending = true
      phase = "settle"
      elapsed = SETTLE_TIME
      return
    }
    phase = "walk"
  }

  const advance = (x: number, z: number, dt: number): EvolutionDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    if (phase === "walk") {
      const s = strideStep(x, z, yaw, 0, 0, step)
      yaw = s.yaw
      if (s.arrived) {
        phase = "glow"
        elapsed = 0
      }
      return {
        x: s.x,
        z: s.z,
        yaw,
        phase: "walk",
        scale: fromScale,
        glow: 0,
        swap: false,
        pivoting: s.pivoting,
        active: true,
      }
    }
    if (phase === "glow") {
      elapsed += step
      const k = Math.min(1, elapsed / GLOW_TIME)
      if (k >= 1) {
        phase = "settle"
        elapsed = 0
        swapPending = true
      }
      return {
        x,
        z,
        yaw,
        phase: "glow",
        scale: fromScale + SWELL * k,
        glow: k * (0.6 + 0.4 * Math.sin(elapsed * 7)),
        swap: false,
        pivoting: false,
        active: true,
      }
    }
    if (phase === "settle") {
      elapsed += step
      const k = Math.min(1, elapsed / SETTLE_TIME)
      const swap = swapPending
      swapPending = false
      if (k >= 1) phase = "idle"
      return {
        x,
        z,
        yaw,
        phase: "settle",
        scale: toScale + OVERSHOOT * (1 - k),
        glow: (1 - k) * 0.4,
        swap,
        pivoting: false,
        active: true,
      }
    }
    return {
      x,
      z,
      yaw,
      phase: "idle",
      scale: toScale,
      glow: 0,
      swap: false,
      pivoting: false,
      active: false,
    }
  }

  return { begin, advance }
}

// ---------------------------------------------------------------------------
// Rest ceremony (ranch_rituals_20261018 FR3)
// ---------------------------------------------------------------------------

// After a successful Rest the creature curls down where it stands, holds a
// deep-sleep beat with slower deeper breathing (applied by ranch-motion),
// then wakes with a stretch. Position-clock like the feed/evolution
// machines — dt-clamped steps, so a paused tab or a long frame can never
// skip a phase. Reduced motion skips the curl/wake animation: a still
// short sleep, no stretch arc.

export type RestPhase = "idle" | "curl" | "sleep" | "wake"

export interface RestDrive {
  phase: RestPhase
  /** Curl-down amount 0..1 (1 = fully curled asleep). */
  curl: number
  /** Wake-stretch amount 0..1 (0 outside the wake phase). */
  stretch: number
  /** True while the machine owns the creature. */
  active: boolean
  /** True when the ceremony has finished (or never started). */
  done: boolean
}

/** Curl-down time, deep-sleep hold, and wake-stretch time (seconds). */
export const REST_CURL_TIME = 0.8
export const REST_SLEEP_TIME = 4
export const REST_WAKE_TIME = 1.2
/** Reduced motion: no animations, a shorter still hold. */
export const REST_SLEEP_TIME_REDUCED = 2

export interface RestMachine {
  /** Begin a rest where the creature stands. */
  begin(reducedMotion: boolean): void
  /** Advance one clamped-dt step. */
  advance(dt: number): RestDrive
}

export function createRestCeremony(): RestMachine {
  let phase: RestPhase = "idle"
  let elapsed = 0
  let reduced = false

  const begin = (reducedMotion: boolean): void => {
    reduced = reducedMotion
    elapsed = 0
    if (reducedMotion) {
      // Still sleep: no curl animation, no stretch arc.
      phase = "sleep"
      return
    }
    phase = "curl"
  }

  const advance = (dt: number): RestDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    if (phase === "curl") {
      elapsed += step
      const k = Math.min(1, elapsed / REST_CURL_TIME)
      if (k >= 1) {
        phase = "sleep"
        elapsed = 0
        return {
          phase: "sleep",
          curl: 1,
          stretch: 0,
          active: true,
          done: false,
        }
      }
      return {
        phase: "curl",
        curl: smoothstepLocal(k),
        stretch: 0,
        active: true,
        done: false,
      }
    }
    if (phase === "sleep") {
      elapsed += step
      const limit = reduced ? REST_SLEEP_TIME_REDUCED : REST_SLEEP_TIME
      if (elapsed >= limit) {
        if (reduced) {
          phase = "idle"
          elapsed = 0
          return {
            phase: "idle",
            curl: 0,
            stretch: 0,
            active: false,
            done: true,
          }
        }
        phase = "wake"
        elapsed = 0
        return { phase: "wake", curl: 1, stretch: 0, active: true, done: false }
      }
      return { phase: "sleep", curl: 1, stretch: 0, active: true, done: false }
    }
    if (phase === "wake") {
      elapsed += step
      const k = Math.min(1, elapsed / REST_WAKE_TIME)
      if (k >= 1) {
        phase = "idle"
        return { phase: "idle", curl: 0, stretch: 0, active: false, done: true }
      }
      return {
        phase: "wake",
        curl: 1 - smoothstepLocal(k),
        stretch: Math.sin(k * Math.PI),
        active: true,
        done: false,
      }
    }
    return { phase: "idle", curl: 0, stretch: 0, active: false, done: true }
  }

  return { begin, advance }
}

/** Local smoothstep (the module's own easing used by gait intensity). */
const smoothstepLocal = (k: number): number => k * k * (3 - 2 * k)

// ---------------------------------------------------------------------------
// Treat ceremony
// ---------------------------------------------------------------------------

/** The treat ceremony's phases: settle into a subdued posture, the balm
 * moment (relief sparkle window while subdued), then recover back to the
 * normal stance. */
export type TreatPhase = "idle" | "settle" | "balm" | "recover"

/** Per-frame pose drive for the treat ceremony (ranch_rituals_20261018
 * FR4). `subdued` eases the creature into a quiet, lowered stance while
 * the balm does its work; `relief` arcs 0 → 1 → 0 across the balm hold and
 * gates the sparkle burst. */
export interface TreatDrive {
  phase: TreatPhase
  /** 0 = normal stance, 1 = fully subdued (slumped) posture. */
  subdued: number
  /** Relief sparkle intensity (0 outside the balm moment; reduced motion
   * keeps it at 0 — no decorative pulse). */
  relief: number
  /** True while the machine owns the creature. */
  active: boolean
  /** True when the ceremony has finished (or never started). */
  done: boolean
}

/** Settle-into-subdued, balm hold, and recover times (seconds). */
export const TREAT_SETTLE_TIME = 0.6
export const TREAT_BALM_TIME = 1.4
export const TREAT_RECOVER_TIME = 0.8
/** Reduced motion: no easing to watch, a shorter still hold. */
export const TREAT_BALM_TIME_REDUCED = 0.8

export interface TreatMachine {
  /** Begin the treat ceremony where the creature stands. */
  begin(reducedMotion: boolean): void
  /** Advance one clamped-dt step. */
  advance(dt: number): TreatDrive
}

export function createTreatCeremony(): TreatMachine {
  let phase: TreatPhase = "idle"
  let elapsed = 0
  let reduced = false

  const begin = (reducedMotion: boolean): void => {
    reduced = reducedMotion
    elapsed = 0
    if (reducedMotion) {
      // Still subdued hold: no settle/recover easing, no relief pulse.
      phase = "balm"
      return
    }
    phase = "settle"
  }

  const advance = (dt: number): TreatDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    if (phase === "settle") {
      elapsed += step
      const k = Math.min(1, elapsed / TREAT_SETTLE_TIME)
      if (k >= 1) {
        phase = "balm"
        elapsed = 0
        return {
          phase: "balm",
          subdued: 1,
          relief: 0,
          active: true,
          done: false,
        }
      }
      return {
        phase: "settle",
        subdued: smoothstepLocal(k),
        relief: 0,
        active: true,
        done: false,
      }
    }
    if (phase === "balm") {
      elapsed += step
      const limit = reduced ? TREAT_BALM_TIME_REDUCED : TREAT_BALM_TIME
      if (elapsed >= limit) {
        if (reduced) {
          phase = "idle"
          elapsed = 0
          return {
            phase: "idle",
            subdued: 0,
            relief: 0,
            active: false,
            done: true,
          }
        }
        phase = "recover"
        elapsed = 0
        return {
          phase: "recover",
          subdued: 1,
          relief: 0,
          active: true,
          done: false,
        }
      }
      const k = elapsed / TREAT_BALM_TIME
      return {
        phase: "balm",
        subdued: 1,
        relief: reduced ? 0 : Math.sin(k * Math.PI),
        active: true,
        done: false,
      }
    }
    if (phase === "recover") {
      elapsed += step
      const k = Math.min(1, elapsed / TREAT_RECOVER_TIME)
      if (k >= 1) {
        phase = "idle"
        return {
          phase: "idle",
          subdued: 0,
          relief: 0,
          active: false,
          done: true,
        }
      }
      return {
        phase: "recover",
        subdued: 1 - smoothstepLocal(k),
        relief: 0,
        active: true,
        done: false,
      }
    }
    return { phase: "idle", subdued: 0, relief: 0, active: false, done: true }
  }

  return { begin, advance }
}

// ---------------------------------------------------------------------------
// Play ceremony — toss, chase, nudge, return, celebrate (FR5)
// ---------------------------------------------------------------------------

export type PlayPhase =
  | "idle"
  | "toss"
  | "chase"
  | "nudge"
  | "return"
  | "celebrate"

/** Per-frame drive for the play ceremony. The ball position is world-space;
 * `bounce` is the celebrate hop envelope (0..1) mapped onto the creature. */
export interface PlayDrive {
  phase: PlayPhase
  ballVisible: boolean
  ballX: number
  ballY: number
  ballZ: number
  bounce: number
  active: boolean
  done: boolean
}

export interface PlayMachine {
  /** Begin the ceremony: the ball arcs from the creature out to the landing
   * spot, the creature chases, nudges it further, trots home and celebrates. */
  begin(
    originX: number,
    originZ: number,
    landingX: number,
    landingZ: number,
    reducedMotion: boolean,
  ): void
  /** Advance one clamped-dt step. */
  advance(dt: number): PlayDrive
  /** The scene reports that the current walk leg (chase or return) finished;
   * the waiting phases use this as their transition signal. A no-op outside
   * the waiting phases (e.g. during the toss). */
  walkDone(): void
}

/** Flight time of the toss arc (seconds). */
export const PLAY_TOSS_TIME = 0.5
/** Peak height of the toss arc above the straight line (world units). */
export const PLAY_TOSS_ARC = 1.6
/** Nudge slide time (seconds). */
export const PLAY_NUDGE_TIME = 0.7
/** How far the nudge knocks the ball past its landing spot (world units). */
export const PLAY_NUDGE_DIST = 2.4
/** Celebrate hop window (seconds). */
export const PLAY_CELEBRATE_TIME = 1.2
/** Hops inside the celebrate window (each a half sine). */
export const PLAY_CELEBRATE_HOPS = 3

export function createPlayCeremony(): PlayMachine {
  let phase: PlayPhase = "idle"
  let reduced = false
  let originX = 0
  let originZ = 0
  let landingX = 0
  let landingZ = 0
  let nudgeX = 0
  let nudgeZ = 0
  let tossT = 0
  let nudgeT = 0
  let celebrateT = 0

  const begin = (
    ox: number,
    oz: number,
    lx: number,
    lz: number,
    reducedMotion: boolean,
  ): void => {
    originX = ox
    originZ = oz
    landingX = lx
    landingZ = lz
    reduced = reducedMotion
    tossT = 0
    nudgeT = 0
    celebrateT = 0
    if (reduced) {
      // No toss arc, no nudge slide, no celebrate hops — straight to the
      // chase leg (the walk machinery carries the visible motion).
      phase = "chase"
    } else {
      phase = "toss"
    }
  }

  const advance = (dt: number): PlayDrive => {
    const step = Math.min(Math.max(dt, 0), 0.1)
    const active = phase !== "idle"
    const base = {
      active,
      done: phase === "idle",
      bounce: 0,
      ballX: 0,
      ballY: 0,
      ballZ: 0,
      ballVisible:
        phase === "toss" ||
        phase === "chase" ||
        phase === "nudge" ||
        phase === "return",
    }
    if (phase === "toss") {
      tossT += step
      const k = Math.min(1, tossT / PLAY_TOSS_TIME)
      const x = originX + (landingX - originX) * k
      const z = originZ + (landingZ - originZ) * k
      const y = Math.sin(k * Math.PI) * PLAY_TOSS_ARC
      if (k >= 1) {
        phase = "chase"
        return {
          ...base,
          phase: "chase",
          ballVisible: true,
          ballX: landingX,
          ballY: 0,
          ballZ: landingZ,
        }
      }
      return { ...base, phase: "toss", ballX: x, ballY: y, ballZ: z }
    }
    if (phase === "chase") {
      return {
        ...base,
        phase,
        ballX: landingX,
        ballY: 0,
        ballZ: landingZ,
      }
    }
    if (phase === "nudge") {
      nudgeT += step
      const k = Math.min(1, nudgeT / PLAY_NUDGE_TIME)
      // Ease-out slide: the bop sends the ball decelerating away.
      const ease = 1 - (1 - k) * (1 - k)
      const x = landingX + (nudgeX - landingX) * ease
      const z = landingZ + (nudgeZ - landingZ) * ease
      if (k >= 1) {
        phase = "return"
        return {
          ...base,
          phase: "return",
          ballX: nudgeX,
          ballY: 0,
          ballZ: nudgeZ,
        }
      }
      return { ...base, phase: "nudge", ballX: x, ballY: 0, ballZ: z }
    }
    if (phase === "return") {
      return {
        ...base,
        phase,
        ballX: nudgeX,
        ballY: 0,
        ballZ: nudgeZ,
      }
    }
    if (phase === "celebrate") {
      celebrateT += step
      const k = Math.min(1, celebrateT / PLAY_CELEBRATE_TIME)
      const bounce = Math.abs(Math.sin(k * Math.PI * PLAY_CELEBRATE_HOPS))
      if (k >= 1) {
        phase = "idle"
        return {
          ...base,
          phase: "idle",
          ballVisible: false,
          active: false,
          done: true,
          bounce: 0,
        }
      }
      return { ...base, phase: "celebrate", bounce }
    }
    return { ...base, phase, ballX: 0, ballY: 0, ballZ: 0 }
  }

  const walkDone = (): void => {
    if (phase === "chase") {
      // The bop continues the ball's line away from where it was thrown.
      const dx = landingX - originX
      const dz = landingZ - originZ
      const d = Math.hypot(dx, dz) || 1
      nudgeX = landingX + (dx / d) * PLAY_NUDGE_DIST
      nudgeZ = landingZ + (dz / d) * PLAY_NUDGE_DIST
      nudgeT = 0
      phase = reduced ? "return" : "nudge"
      return
    }
    if (phase === "return") {
      if (reduced) {
        phase = "idle"
        return
      }
      celebrateT = 0
      phase = "celebrate"
    }
  }

  return { begin, advance, walkDone }
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
export const WANDER_MIN_PILE_DIST = 1.8 /** Visits stop this far short of the chosen prop. */
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
  /** Current stride destination (the visit spot or the home anchor). */
  targetX: number
  targetZ: number
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
  /** Force home-idle while KEEPING the accrued gap — used when the scene
   * rebuilds the creature (day advance, training) so the wandering rhythm
   * survives visual rebuilds instead of restarting its 20–40 s window. */
  pause(): void
  /** Advance the machine. `yawNow` is the creature's actual rendered
   * facing (the scene reads it off the rig every frame), `allow` is the
   * mood/reduced-motion/ceremony gate: gaps accrue only while allowed,
   * and trips are started only while allowed (an already-running trip is
   * always finished gracefully). A starting trip eases from `yawNow` so
   * no stale machine yaw ever snaps the creature on the first frame. */
  advance(
    x: number,
    z: number,
    yawNow: number,
    dt: number,
    allow: boolean,
  ): WanderDrive
}

export function createWander(
  reducedMotion: boolean,
  seed: number,
): WanderMachine {
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

  let yawNow = 0

  const startTrip = (fromX: number, fromZ: number) => {
    // Ease from the creature's ACTUAL rendered facing, captured by advance
    // this frame — never a stale yaw left over from a previous trip or a
    // creature rebuild (review 2026-10-10: one-frame yaw snap at trip start).
    yaw = yawNow
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
    phase = "walk-out"
    return true
  }

  return {
    setCandidates(list) {
      candidates = list
    },

    begin() {
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

    pause() {
      phase = "home-idle"
      // The countdown survives: this machine outlives visual rebuilds.
    },

    advance(x, z, yawActual, dt, allow) {
      const step = Math.min(Math.max(dt, 0), 0.1)
      yawNow = yawActual
      if (phase === "home-idle") {
        if (allow && !reducedMotion) {
          gapAccum += step
          if (gapAccum >= gap && candidates.length > 0) {
            startTrip(x, z)
          }
        }
        return {
          phase,
          x,
          z,
          yaw,
          lookOffset: 0,
          pivoting: false,
          targetX: targetX,
          targetZ: targetZ,
        }
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
          targetX,
          targetZ,
        }
      }
      if (phase === "visit-pause") {
        pauseElapsed += step
        // Gentle look-around: one full sweep over the pause.
        const t = pauseElapsed / Math.max(pauseDuration, 1e-6)
        const lookOffset = reducedMotion
          ? 0
          : Math.sin(t * Math.PI * 2) * VISIT_LOOK_SPAN
        if (pauseElapsed >= pauseDuration) {
          phase = "walk-home"
        }
        return {
          phase,
          x,
          z,
          yaw: lookBase,
          lookOffset,
          pivoting: false,
          targetX,
          targetZ,
        }
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
          targetX: 0,
          targetZ: 0,
        }
      }
      return {
        phase,
        x: s.x,
        z: s.z,
        yaw,
        lookOffset: 0,
        pivoting: s.pivoting,
        targetX: 0,
        targetZ: 0,
      }
    },
  }
}

/**
 * Broadcast arena framing compensation for narrow viewports (F6,
 * responsive_foundation_20261013). The fixed broadcast shot was tuned on
 * a wide desktop window; on portrait phones the horizontal field of view
 * shrinks with the aspect and crops the stage corners out of frame.
 *
 * Compensation backs the camera off (radius multiplier) and widens the
 * lens (added vertical FOV) as the aspect narrows past the 1.2
 * reference, with hard caps so a phone gets a usable shot rather than an
 * absurd telescope pull. Landscape keeps the framing untouched.
 */
export interface ArenaFramingAdjustment {
  /** Multiplier on the broadcast framing radius (>= 1). */
  radiusMult: number
  /** Added vertical FOV in degrees (>= 0). */
  fovAdd: number
}

/** Viewport aspect at or above which the broadcast framing is untouched. */
const ARENA_ASPECT_FLOOR = 1.2
/** Cap on the radius pull-back multiplier. */
const ARENA_RADIUS_MULT_CAP = 1.5
/** Cap on the added vertical FOV, in degrees. */
const ARENA_FOV_ADD_CAP = 12
/** How aggressively the radius pulls back per unit of missing aspect
 * (exponent on the ratio; sub-1 so wide-ish tablets barely move). */
const ARENA_RADIUS_EXPONENT = 0.6
/** Added vertical FOV degrees per unit of missing aspect. */
const ARENA_FOV_SLOPE = 10

export function arenaFramingAdjust(aspect: number): ArenaFramingAdjustment {
  const safe = aspect > 0 ? aspect : ARENA_ASPECT_FLOOR
  const ratio = ARENA_ASPECT_FLOOR / safe
  if (ratio <= 1) return { radiusMult: 1, fovAdd: 0 }
  const radiusMult = Math.min(
    ARENA_RADIUS_MULT_CAP,
    ratio ** ARENA_RADIUS_EXPONENT,
  )
  const fovAdd = Math.min(ARENA_FOV_ADD_CAP, (ratio - 1) * ARENA_FOV_SLOPE)
  return { radiusMult, fovAdd }
}
