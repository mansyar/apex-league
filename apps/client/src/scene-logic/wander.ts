/**
 * Scene logic - sparse wandering: at most one sightseeing trip per 20-40 s
 * window to a nearby prop, seeded per scene and never part of a save.
 * Split out of scene-logic.ts (ranch_decomposition); behavior unchanged.
 */
import { makeRng, type Rng } from "@apex/voxel"
import { heading, strideStep } from "./walk"
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
