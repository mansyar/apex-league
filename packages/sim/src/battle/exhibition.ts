/**
 * The exhibition helper (spec FR10): builds a spar from the owned creature,
 * the player's tactic, and a seed. The rival is a seeded pick among
 * *available* starters only, rolled from `createCreature` with a seed
 * derived from the battle seed, and fights with its species kit and
 * temperament. The owner's side reads combat prep: effective stats
 * (stats + trained) and the chosen loadout, defaulting to the stage slicing
 * of the kit gate. Pure — the owned creature is never mutated.
 */

import { type Creature, createCreature, effectiveStats } from "../creature"
import { defaultLoadout, MAX_LOADOUT } from "../loadout"
import { makeRng } from "../rng"
import { getSpecies, STARTER_SPECIES } from "../species"
import type { Tactic } from "./policy"
import type { BattleSide } from "./resolver"

export interface SparSetup {
  /** The player's side, assembled from the owned creature and its species. */
  readonly ownedSide: BattleSide
  /** The rival's side: seeded species, stats, kit, temperament, tactic. */
  readonly rivalSide: BattleSide
  /** The rival as a full creature, for the spar panel display. */
  readonly rival: Creature
  /** The seeded rival species id, drawn from the available starters. */
  readonly rivalSpeciesId: string
  /** The seeded rival tactic. */
  readonly rivalTactic: Tactic
}

const TACTICS: readonly Tactic[] = ["balanced", "specials"]

export function makeExhibition(
  owned: Readonly<Creature>,
  tactic: Tactic,
  seed: number,
): SparSetup {
  const species = getSpecies(owned.speciesId)
  if (!species) throw new Error(`Unknown species: ${owned.speciesId}`)

  const rng = makeRng(seed >>> 0)
  const available = STARTER_SPECIES.filter((s) => s.available)
  const rivalIndex = rng.int(available.length)
  const rivalSpecies = available[rivalIndex]
  if (!rivalSpecies) throw new Error("No starter species is available")
  const creatureSeed = Math.floor(rng.next() * 0x7fffffff)
  const rivalTactic = TACTICS[rng.int(TACTICS.length)] ?? "balanced"

  const rival = createCreature(rivalSpecies.id, creatureSeed)
  const rivalSpeciesDef = getSpecies(rival.speciesId)
  if (!rivalSpeciesDef) throw new Error(`Unknown species: ${rival.speciesId}`)

  const ownedSide: BattleSide = {
    name: owned.name,
    id: "owned",
    element: owned.element,
    stats: effectiveStats(owned),
    kit: owned.loadout ?? defaultLoadout(owned, species),
    tactic,
    temperament: species.temperament,
  }
  const rivalSide: BattleSide = {
    name: rival.name,
    id: "rival",
    element: rival.element,
    stats: rival.stats,
    // Rivals field four of the six they know; the seeded pick lands in Phase 2
    // of the move-pool track, so today's matches stay byte-identical.
    kit: rivalSpeciesDef.kit.slice(0, MAX_LOADOUT),
    tactic: rivalTactic,
    temperament: rivalSpeciesDef.temperament,
  }

  return {
    ownedSide,
    rivalSide,
    rival,
    rivalSpeciesId: rivalSpecies.id,
    rivalTactic,
  }
}
