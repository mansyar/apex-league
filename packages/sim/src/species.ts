/**
 * Species registry. The catalog tables live in the `./species` submodules —
 *
 * - `./species/types` — the shared `SpeciesDef` shape
 * - `./species/starters` — the three starter lines
 * - `./species/rewards` — the ladder-reward lines
 * - `./species/discovery` — the breeding-discovery lines (roster_wave_3)
 * - `./species/catalog` — the joined roster, acquisition gate, and lookup
 *
 * This module re-exports the same public surface the monolith exported, so
 * every consumer import (`./species`, `../species`) stays untouched.
 *
 * It also owns the contact body table the continuous fight reads (FR-17).
 * The voxel pipeline authors a uniform 56-voxel grid and only shifts girth by
 * stage, so it carries no absolute body size to reuse; a body volume has to be
 * authored once, per archetype, here — the one place a species' shape lives.
 *
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

export {
  ALL_SPECIES,
  getSpecies,
  obtainableSpecies,
} from "./species/catalog"
export { DISCOVERY_SPECIES } from "./species/discovery"
export { REWARD_SPECIES, STORM_GIFT_SPECIES_ID } from "./species/rewards"
export { STARTER_SPECIES } from "./species/starters"
export type { SpeciesDef, Temperament } from "./species/types"

/**
 * The volume a fighter's body occupies on the floor, in millimetres: a
 * vertical cylinder of `radiusMm` around the centre and `heightMm` tall. Two
 * bodies cannot share space, and a blow has to sweep a band that overlaps the
 * height to connect (FR-17).
 */
export interface BodyProfile {
  /** Half the body's width, in mm. */
  readonly radiusMm: number
  /** Standing height, in mm, measured up from the floor. */
  readonly heightMm: number
}

/** The profile any archetype without an authored row falls back to. */
export const DEFAULT_BODY_PROFILE: BodyProfile = Object.freeze({
  radiusMm: 220,
  heightMm: 900,
})

/** Freeze one authored row. */
function profile(radiusMm: number, heightMm: number): BodyProfile {
  return Object.freeze({ radiusMm, heightMm })
}

/**
 * One authored body per voxel archetype, in mm. Small and low for the
 * burrowers and the axolotl, broad and tall for the draconic and bovine
 * lines, in between for the rest. Authored, not derived: a body's width is a
 * design choice, and every consumer reads the same row.
 */
export const BODY_PROFILES: Readonly<Record<string, BodyProfile>> =
  Object.freeze({
    draconic: profile(260, 1250),
    bovine: profile(300, 1200),
    axolotl: profile(200, 650),
    storm_hound: profile(240, 900),
    falcon: profile(190, 750),
    tortoise: profile(300, 700),
    frond: profile(280, 1100),
    crab: profile(280, 600),
    smolder: profile(240, 900),
    fox: profile(210, 800),
    heron: profile(180, 1000),
    mole: profile(220, 650),
    cub: profile(200, 700),
    boar: profile(270, 950),
    otter: profile(210, 750),
  })

/** The body an archetype opens with, or the default when it has no row. */
export function bodyProfileFor(archetypeId: string | undefined): BodyProfile {
  if (!archetypeId || !Object.hasOwn(BODY_PROFILES, archetypeId)) {
    return DEFAULT_BODY_PROFILE
  }
  return BODY_PROFILES[archetypeId] ?? DEFAULT_BODY_PROFILE
}
