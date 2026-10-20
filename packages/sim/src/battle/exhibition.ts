/**
 * The exhibition helper (spec FR10): builds a spar from the owned creature,
 * the player's tactic, and a seed. The rival is a seeded pick among
 * *available* starters only, rolled from `createCreature` with a seed
 * derived from the battle seed, and fights four of the six moves its species
 * knows. The owner's side reads combat prep — the creature's post-training
 * stats through `battleStats` (the single form seam, form.ts) and the chosen
 * loadout, defaulting to the stage slicing of the kit gate, and reports the
 * earned form (or `legacy` while unbranched) as display data. The rival is a
 * fresh seeded creature that never carries mood or bond, so its side reads
 * plain `rival.stats`; its form is the deterministic lean over those seeded
 * stats (`branchLean`), attached as display data only and never fed back
 * into its stats, kit, or the battle seed. Pure — the owned creature is
 * never mutated.
 */

import { branchLean } from "../branches"
import { type Creature, createCreature } from "../creature"
import { battleStats } from "../form"
import { defaultLoadout } from "../loadout"
import { makeRng } from "../rng"
import { getSpecies, STARTER_SPECIES } from "../species"
import type { Tactic } from "./policy"
import type { BattleSide } from "./resolver"
import { rivalKit } from "./rival-kit"

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

  const rolled = createCreature(rivalSpecies.id, creatureSeed)
  const rivalSpeciesDef = getSpecies(rolled.speciesId)
  if (!rivalSpeciesDef) throw new Error(`Unknown species: ${rolled.speciesId}`)
  // The seeded rival earns the same lean a player would from those stats.
  const rival: Creature = {
    ...rolled,
    branch: branchLean(rolled, rivalSpeciesDef).branch.id,
  }

  const ownedSide: BattleSide = {
    name: owned.name,
    id: "owned",
    element: owned.element,
    stats: battleStats(owned),
    kit: owned.loadout ?? defaultLoadout(owned, species),
    tactic,
    temperament: species.temperament,
    branch: owned.branch ?? "legacy",
  }
  const rivalSide: BattleSide = {
    name: rival.name,
    id: "rival",
    element: rival.element,
    stats: rival.stats,
    kit: rivalKit(rivalSpeciesDef, creatureSeed),
    tactic: rivalTactic,
    temperament: rivalSpeciesDef.temperament,
    branch: rival.branch ?? "legacy",
  }

  return {
    ownedSide,
    rivalSide,
    rival,
    rivalSpeciesId: rivalSpecies.id,
    rivalTactic,
  }
}
