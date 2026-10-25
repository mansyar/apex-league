/**
 * Scene logic — the morning-after's per-archetype pose choreography
 * (postcup_morning_after FR-3): the ceremony every archetype plays from
 * the same class stance, each build reading it through the rig's existing
 * pose vocabulary (chest-forward bearing, in-place prance, tail
 * carriage, sag) instead of any new rig or animation asset (NFR-4). Also
 * the pure bookkeeping of the day-long idle tint's latch: set on the
 * ritual arrival, cleared at the night settle (FR-9). No DOM, no Three,
 * no randomness (NFR-5) — the same derivation always reads the same pose.
 */

import type { MorningAfterClass } from "../morning-after/derive"
import type { MorningAfterDrive } from "./morning-after"
import { morningAfterTintOf } from "./morning-after"

// ---------------------------------------------------------------------------
// The archetype roster and its pose temper
// ---------------------------------------------------------------------------

/** The six voxel archetypes (packages/sim's species registry: the three
 * starters plus the Silver/Gold/Legend reward species) — the choreography's
 * roster; anything else falls back to a neutral stance. */
export const MORNING_AFTER_ARCHETYPES = [
  "draconic",
  "bovine",
  "axolotl",
  "storm_hound",
  "falcon",
  "tortoise",
] as const

/** How strongly one archetype reads a stance through each move: `bear`
 * (chest-forward lift), `slump` (the sag's depth), `tail` (tail carriage
 * announcing the strut), `prance` (the in-place leg flourish's arc). */
interface ArchetypeTemper {
  readonly bear: number
  readonly slump: number
  readonly tail: number
  readonly prance: number
}

const TEMPER: Record<string, ArchetypeTemper> = {
  // The showboating drake: proud tail carriage, light menace.
  draconic: { bear: 0.45, slump: 0.4, tail: 0.5, prance: 0.35 },
  // The heavy-footed ox: mass carries the win, carriage stays low.
  bovine: { bear: 0.6, slump: 0.6, tail: 0.1, prance: 0.12 },
  // The buoyant axolotl: the springiest in-place wiggle on the roster.
  axolotl: { bear: 0.3, slump: 0.3, tail: 0.3, prance: 0.5 },
  // The sprinter hound: quick feet over proud neck.
  storm_hound: { bear: 0.4, slump: 0.45, tail: 0.3, prance: 0.45 },
  // The restless falcon barely sinks — it naps mid-gust and never drops
  // a feather, so even a loss reads light.
  falcon: { bear: 0.35, slump: 0.25, tail: 0.35, prance: 0.4 },
  // The patient tortoise: slowest feet, and a loss sinks its shell deep.
  tortoise: { bear: 0.5, slump: 0.7, tail: 0.05, prance: 0.08 },
}

/** The neutral temper an unknown archetype rides — every rig still gets
 * the ceremony, just without the per-build flavor. */
const NEUTRAL_TEMPER: ArchetypeTemper = {
  bear: 0.35,
  slump: 0.45,
  tail: 0.25,
  prance: 0.3,
}

/** One archetype's choreography pose: final-form values the pose writer
 * applies directly. `headLift`/`chest` are fractions (of the rig's head
 * base / a scale delta), `roll`/`tailCarry` are radians, `prance` the
 * 0..1 leg-flourish amplitude, `glow` the drive's pulse passthrough. */
export interface MorningAfterArchetypePose {
  readonly headLift: number
  readonly chest: number
  readonly roll: number
  readonly tailCarry: number
  readonly prance: number
  readonly glow: number
}

/**
 * Derive one archetype's pose from the ceremony's drive. Pure: strut
 * the stance blend, droop the graded sag, glow rides through; the loss
 * never prances. An unknown future archetype id degrades to the neutral
 * temper, so a rig never breaks the ceremony.
 */
export function morningAfterPoseOf(
  archetypeId: string,
  drive: MorningAfterDrive,
): MorningAfterArchetypePose {
  const t = TEMPER[archetypeId] ?? NEUTRAL_TEMPER
  const s = drive.strut
  const d = drive.droop
  return {
    headLift: s * t.bear * 0.6 - d * t.slump * 0.55,
    chest: s * t.bear * 0.8 - d * t.slump * 0.4,
    roll: s * t.prance * 0.12 + d * 0.06,
    tailCarry: s * t.tail - d * t.tail * 0.4,
    prance: s * t.prance,
    glow: drive.glow,
  }
}

// ---------------------------------------------------------------------------
// The day-long tint's pure latch (FR-3)
// ---------------------------------------------------------------------------

/** The adapter-held tint latch state — client memory of the ritual day's
 * stance, never persisted (NFR-1). */
export interface MorningAfterTintState {
  active: boolean
  /** The day the tint belongs to; the night settle delays past it. */
  day: number | null
  strut: number
  droop: number
}

/** Latch the class stance as this day's idle tint (called on the arrival). */
export function setMorningAfterTint(
  state: MorningAfterTintState,
  cls: MorningAfterClass,
  day: number,
): void {
  const tint = morningAfterTintOf(cls)
  state.active = true
  state.day = day
  state.strut = tint.strut
  state.droop = tint.droop
}

/** The night settle (FR-9): a tint belonging to an earlier day clears.
 * Same-day calls keep it — the stance holds until the day actually ends. */
export function retireMorningAfterTint(
  state: MorningAfterTintState,
  day: number,
): void {
  if (!state.active || state.day === null || day <= state.day) return
  state.active = false
  state.day = null
  state.strut = 0
  state.droop = 0
}
