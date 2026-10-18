/**
 * Scene logic - the position-driven feeding ceremony: stride to the stand
 * spot, nibble, stride home. Split out of scene-logic.ts
 * (ranch_decomposition); behavior unchanged.
 */
import { strideStep } from "./walk"
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

/** In-place nibble time (seconds); 2.5 dip cycles fit inside it. */
const NIBBLE_TIME = 2.2

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
