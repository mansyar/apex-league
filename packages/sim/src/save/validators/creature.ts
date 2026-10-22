/**
 * Save payload validators, part one: the shape rules for the creatures and
 * the Hall of Fame records a persisted save must pass before the game trusts
 * them.
 *
 * Split out of the former monolithic save/validators.ts
 * (sim-voxel-size-guard, phase 2) — pure relocation, no behavior change.
 * The save- and session-level rules live in ./session.
 */

import { getBranch, LEGACY_BRANCH } from "../../branches"
import { type Creature, TRAINING_CAP } from "../../creature"
import { SICK_COOLDOWN_NIGHTS } from "../../evolution"
import type { RetiredRecord } from "../../legacy"
import { getSpecies } from "../../species"
import { isTrainingProgram } from "../../training"
import { isLineageTrait } from "../../traits"

const ELEMENTS = ["fire", "water", "plant", "electric", "earth", "wind"]
const STAGES = ["baby", "juvenile", "champion"]
const STAT_KEYS = ["hp", "atk", "def", "spd"]
const TRAINING_RESULTS = ["gained", "sick", "hungry", "exhausted"]

/** Save v15: a lineage trait list is canonical, unique, and at most four. */
function isValidTraitList(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 4) return false
  const seen = new Set<string>()
  for (const id of value) {
    if (!isLineageTrait(id) || seen.has(id)) return false
    seen.add(id)
  }
  return true
}

/**
 * Save v15: parentage is at most two generation numbers (one for the founder
 * successor path, two for a bred pair), never negative or duplicated.
 */
function isValidParentList(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 2) return false
  const seen = new Set<number>()
  for (const generation of value) {
    if (
      typeof generation !== "number" ||
      !Number.isInteger(generation) ||
      generation < 0 ||
      seen.has(generation)
    ) {
      return false
    }
    seen.add(generation)
  }
  return true
}

/**
 * Save v19: a baby is always `branch: null` (it earns a form at the juvenile
 * gate). A juvenile or champion may be `null` (not yet resolved by a
 * hand-built or migrated payload), the migration-only `legacy` line, or a real
 * branch id owned by its species.
 */
function isValidCreatureBranch(creature: Record<string, unknown>): boolean {
  const branch = creature.branch
  if (creature.stage === "baby") return branch === null
  if (branch === null) return true
  if (typeof branch !== "string") return false
  const def = getBranch(branch)
  if (!def) return false
  if (branch === LEGACY_BRANCH.id) return true
  return def.speciesId === creature.speciesId
}

/** A creature is valid when every field is the right type and in range. */
export function isValidCreature(c: unknown): c is Creature {
  if (typeof c !== "object" || c === null) return false
  const creature = c as Record<string, unknown>
  if (typeof creature.speciesId !== "string" || creature.speciesId.length === 0)
    return false
  // The species must exist in the catalog — a hand-edited save referencing
  // an unknown species would crash the client on first render otherwise.
  if (getSpecies(creature.speciesId) === undefined) return false
  if (typeof creature.bondedToday !== "boolean") return false
  if (!ELEMENTS.includes(creature.element as string)) return false
  if (!STAGES.includes(creature.stage as string)) return false
  if (!isValidCreatureBranch(creature)) return false
  const stats = creature.stats
  if (typeof stats !== "object" || stats === null) return false
  for (const value of Object.values(stats as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
      return false
  }
  const conditions = creature.conditions
  if (typeof conditions !== "object" || conditions === null) return false
  for (const value of Object.values(conditions as Record<string, unknown>)) {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 100
    ) {
      return false
    }
  }
  // v3: training fields must be present and well-formed. Trained bonuses
  // stay within [0, TRAINING_CAP]; the assigned program is one of the
  // catalog's ids (or the absent null after a program night), and the result
  // is the sim's own union.
  const trained = creature.trained
  if (typeof trained !== "object" || trained === null) return false
  const t = trained as Record<string, unknown>
  for (const key of STAT_KEYS) {
    const value = t[key]
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > TRAINING_CAP
    ) {
      return false
    }
  }
  // v18: the single-stat focus grew into a program; an unknown id (or a
  // missing field) fails the load rather than silently dropping the night's
  // assignment.
  const program = creature.trainingProgram
  if (program !== null && !isTrainingProgram(program)) return false
  const result = creature.trainingResult
  if (result !== null && !TRAINING_RESULTS.includes(result as string))
    return false
  // v4: the daily food flag is a strict boolean and always present.
  if (typeof creature.fedToday !== "boolean") return false
  // v6: the sickness cooldown is a small non-negative integer — the sim
  // only ever writes 0..SICK_COOLDOWN_NIGHTS.
  const cooldown = creature.sickCooldown
  if (
    typeof cooldown !== "number" ||
    !Number.isInteger(cooldown) ||
    cooldown < 0 ||
    cooldown > SICK_COOLDOWN_NIGHTS
  ) {
    return false
  }
  // v15: lineage fields are always present after migration.
  if (!isValidTraitList(creature.traits)) return false
  if (!isValidParentList(creature.parents)) return false
  // v20: the secondary affinity is a valid element or null, and never the
  // creature's own primary element — validation, not clamping.
  const affinity = creature.affinity
  if (affinity !== null && !ELEMENTS.includes(affinity as string)) return false
  if (affinity === creature.element) return false
  // v21: the gift-egg lineage marker is a plain boolean.
  if (typeof creature.giftEgg !== "boolean") return false
  // v23: the pet's own age is a positive integer — the days it has lived.
  // A missing or malformed age fails the load instead of letting the growth
  // gates read a broken number.
  const ageDays = creature.ageDays
  if (
    typeof ageDays !== "number" ||
    !Number.isInteger(ageDays) ||
    ageDays < 1
  ) {
    return false
  }
  // v24: the loadout is checked here as well — the stable holds whole pets
  // only, so a half-kit fails the load rather than half-kitting a pet.
  const loadout = creature.loadout
  if (
    loadout !== null &&
    loadout !== undefined &&
    (!Array.isArray(loadout) || !loadout.every((id) => typeof id === "string"))
  ) {
    return false
  }
  return true
}

/**
 * A Hall of Fame record (save v10) is valid when every field the client
 * displays is well-typed: a known species, an element, integer stats/trained
 * in range, and non-negative counters.
 */
export function isValidRetiredRecord(r: unknown): r is RetiredRecord {
  if (typeof r !== "object" || r === null) return false
  const rec = r as Record<string, unknown>
  if (typeof rec.name !== "string" || rec.name.length === 0) return false
  if (
    typeof rec.speciesId !== "string" ||
    getSpecies(rec.speciesId) === undefined
  )
    return false
  if (typeof rec.archetypeId !== "string") return false
  if (!ELEMENTS.includes(rec.element as string)) return false
  const stats = rec.stats
  if (typeof stats !== "object" || stats === null) return false
  for (const value of Object.values(stats as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
      return false
  }
  const trained = rec.trained
  if (typeof trained !== "object" || trained === null) return false
  for (const value of Object.values(trained as Record<string, unknown>)) {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > TRAINING_CAP
    ) {
      return false
    }
  }
  if (!Number.isInteger(rec.cupsWon) || (rec.cupsWon as number) < 0)
    return false
  if (!Number.isInteger(rec.generation) || (rec.generation as number) < 0)
    return false
  if (!Number.isInteger(rec.retiredOnDay) || (rec.retiredOnDay as number) < 1)
    return false
  // v15: every archived career carries its derived traits and parentage.
  if (!isValidTraitList(rec.traits)) return false
  if (!isValidParentList(rec.parents)) return false
  // v19: every archived career records the form it earned; a migrated record
  // is "legacy". An unknown id (or a missing field) fails the load, and a real
  // branch must belong to the record's species (legacy fits any species).
  if (typeof rec.branch !== "string") return false
  const branchDef = getBranch(rec.branch)
  if (branchDef === undefined) return false
  if (rec.branch !== LEGACY_BRANCH.id && branchDef.speciesId !== rec.speciesId)
    return false
  // v20: the secondary affinity is a valid element or null, and never the
  // record's primary element — validation, not clamping.
  const affinity = rec.affinity
  if (affinity !== null && !ELEMENTS.includes(affinity as string)) return false
  if (affinity === rec.element) return false
  // v21: the gift-egg lineage marker is a plain boolean.
  if (typeof rec.giftEgg !== "boolean") return false
  return true
}
