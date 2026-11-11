/**
 * Reach-derived telegraph scaling (presentation mapping FR-6): the startup
 * tell's length and arc come from the committed move's `reachMm` plus the
 * attacker's body radius. Both stay client-side — the stream carries no move
 * id, but the startup window's length is authored (never `spd`-scaled), so
 * the run of startup steps identifies the row. The sim is untouched; this
 * module only reads its published frame table.
 *
 * The sim barrel does not re-export the table, and this phase may not edit
 * `packages/sim`, so — as in `arena-scale.ts` — the deep import is the only
 * way to keep one source of truth.
 */

import { STREAM_MOVE_IDS } from "@apex/sim"
import {
  FRAME_DATA,
  type FrameData,
} from "../../../packages/sim/src/battle/frames"
import { clamp01 } from "./anim"
import { MM_TO_WORLD } from "./arena-scale"

/** The wedge's fixed inner radius, in world units (the body's own ground). */
export const TELL_INNER = 0.3

/**
 * The wedge never paints past the show floor: the arena's half-diagonal in
 * world units (3.2 x 2.4), so even a lance reads as a long threat without
 * spilling onto the dark.
 */
export const TELL_MAX_OUTER = 4.0

/** Reach assumed before the second startup sample firms the estimate. */
export const DEFAULT_TELL_REACH_MM = 420

interface StartupRow {
  readonly startupMs: number
  readonly reachMm: number
}

/**
 * One row per authored startup length, longest reach wins: several moves
 * share a startup (260 ms is all 5,200; 500 ms spans 4,400–6,200), so the
 * tell reads the longest threat rather than understating the blow.
 * Deterministic by construction — sorted, frozen, no randomness.
 */
function startupRows(table: Readonly<Record<string, FrameData>>): StartupRow[] {
  const best = new Map<number, number>()
  for (const row of Object.values(table)) {
    const prev = best.get(row.startupMs)
    if (prev === undefined || row.reachMm > prev) {
      best.set(row.startupMs, row.reachMm)
    }
  }
  return [...best.entries()]
    .map(([startupMs, reachMm]) => ({ startupMs, reachMm }))
    .sort((a, b) => a.startupMs - b.startupMs)
}

export const STARTUP_REACH: readonly StartupRow[] = Object.freeze(
  startupRows(FRAME_DATA),
)

/**
 * The committed move's reach for an estimated startup length: the nearest
 * authored startup wins, ties read the longer threat. Basic (160 ms) maps to
 * 420 mm; every lance tier (680–800 ms) maps to 6,500 mm.
 */
export function reachForStartupMs(estimateMs: number): number {
  let best = STARTUP_REACH[0]?.reachMm ?? DEFAULT_TELL_REACH_MM
  let bestGap = Math.abs((STARTUP_REACH[0]?.startupMs ?? 0) - estimateMs)
  for (const row of STARTUP_REACH) {
    const gap = Math.abs(row.startupMs - estimateMs)
    if (gap < bestGap || (gap === bestGap && row.reachMm > best)) {
      best = row.reachMm
      bestGap = gap
    }
  }
  return best
}

/**
 * The committed move's reach for a stream move index (R1/F2): exact, no
 * bucket involved — an ion_wall startup reads ~4,400 mm even though its
 * 500 ms bucket's longest threat is 6,200. Returns `undefined` for 0 (no
 * attack, or a legacy trace), which keeps the estimator path below.
 */
export function reachForMoveIdx(moveIdx: number): number | undefined {
  if (moveIdx <= 0) return undefined
  const id = STREAM_MOVE_IDS[moveIdx - 1]
  if (id === undefined) return undefined
  return FRAME_DATA[id]?.reachMm
}

/**
 * Estimate the startup length from one run of startup frames. Fight time
 * advances exactly `stepMs` per step, so the phaseT span between the first
 * and latest sample measures the window: duration = steps x 255 / span.
 * Needs two samples and a positive span (quantization can stall one step);
 * otherwise `undefined` and the caller keeps its current reach.
 */
export function estimateStartupMs(
  runSteps: number,
  firstPhaseT: number,
  lastPhaseT: number,
  stepMs: number,
): number | undefined {
  if (runSteps < 2 || stepMs <= 0) return undefined
  const span = lastPhaseT - firstPhaseT
  if (span <= 0) return undefined
  return Math.round(((runSteps - 1) * stepMs * 255) / span)
}

/**
 * Wedge length in world units: reach plus the attacker's own body radius,
 * clamped to the show floor. Short reach reads short, a lance reads long.
 */
export function tellOuterWorld(reachMm: number, radiusMm: number): number {
  return Math.min(
    TELL_MAX_OUTER,
    Math.max(TELL_INNER + 0.05, (reachMm + radiusMm) * MM_TO_WORLD),
  )
}

/**
 * Wedge arc in radians: a short-range swing fans wide, a lance runs narrow.
 * Linear in reach, clamped — basic reads ~0.59, a 6,500 mm lance ~0.22.
 */
export function tellHalfAngle(reachMm: number): number {
  return Math.min(0.62, Math.max(0.22, 0.62 - (reachMm / 6500) * 0.4))
}

/**
 * One telegraph ring pulse per half startup: the ring sweeps from the
 * body's ground to the wedge's edge, thinning as it travels. Pure progress
 * math — no clock, so a paused frame holds its ring.
 */
export function tellRing(
  progressT: number,
  outerWorld: number,
): { radius: number; opacity: number } {
  const t = clamp01(progressT)
  const pulse = (t * 2) % 1
  return {
    radius: TELL_INNER + (outerWorld - TELL_INNER) * pulse,
    opacity: 0.5 * (1 - pulse) * (0.35 + 0.65 * t),
  }
}
