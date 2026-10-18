/**
 * Scene logic - the play ceremony: toss, chase, nudge, return, celebrate.
 * Split out of scene-logic.ts (ranch_decomposition); behavior unchanged.
 */
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
