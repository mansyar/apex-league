/**
 * Branch balance probe (branching_evolution AC-11, FR-4/FR-9/NFR-6): the two
 * forms of each starter must be sidegrades, not a best pick behind an
 * evolution gate.
 *
 * The probe builds sides directly from real evolved creatures — a champion
 * has already paid both boosts at this point — and runs the production
 * `resolveBattle` with the normal balanced policy, never a stub. Per species,
 * on a fixed seed set, it measures:
 *
 * 1. sibling: the two real forms against each other (the sidegrade question);
 * 2. legacy: each real form against the old line it replaces.
 *
 * Every matchup runs both name assignments and both seat orders, because the
 * resolver's tie order is keyed by fighter name: a single orientation would
 * measure the name hash, not the form.
 *
 * The signature is in play: a branched side fields three kit moves plus its
 * own signature, the legacy side fields the leading four kit moves (legacy
 * knows no signature by contract).
 *
 * Bands mirror AC-11: sibling forms inside 45–55%, each branch against legacy
 * inside 40–70%. `APEX_BRANCH_BALANCE_REPORT=1` prints the markdown table
 * recorded in the phase evidence.
 */

import { describe, expect, test } from "bun:test"
import { type BranchDef, branchesForSpecies, getBranch } from "../branches"
import { type Creature, createCreature } from "../creature"
import { evolveCreature } from "../evolution"
import { battleStats } from "../form"
import { getSpecies } from "../species"
import type { Tactic } from "./policy"
import { type BattleSide, resolveBattle } from "./resolver"

const SPECIES = ["fire_drake", "plant_ox", "water_axolotl"] as const

/** Eight base profiles sample the roll space; twelve battle seeds replay each. */
const CREATURE_SEEDS: readonly number[] = [11, 42, 77, 101, 143, 202, 307, 409]
const BATTLE_SEEDS: readonly number[] = [
  11, 29, 47, 53, 71, 89, 97, 113, 131, 149, 167, 191,
]
const TACTIC: Tactic = "balanced"
const TRAINED = { hp: 6, atk: 6, def: 6, spd: 6 } as const

const SIBLING_MIN = 0.45
const SIBLING_MAX = 0.55
const LEGACY_MIN = 0.4
const LEGACY_MAX = 0.7

/** A champion creature of `speciesId` that earned `branchId`. */
function evolved(speciesId: string, seed: number, branchId: string): Creature {
  const base = createCreature(speciesId, seed)
  const baby = { ...base, trained: TRAINED, branch: branchId }
  return evolveCreature(evolveCreature(baby))
}

/** A battle side carrying the branch's signature in the fourth slot. */
function side(
  creature: Creature,
  name: string,
  signature: boolean,
): BattleSide {
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error(`Unknown species: ${creature.speciesId}`)
  const branch = getBranch(creature.branch ?? "legacy")
  const signed = signature ? (branch?.signatureMove ?? null) : null
  return {
    name,
    id: name,
    element: creature.element,
    stats: battleStats(creature),
    kit:
      signed === null
        ? species.kit.slice(0, 4)
        : [...species.kit.slice(0, 3), signed],
    tactic: TACTIC,
    temperament: species.temperament,
    branch: creature.branch ?? "legacy",
  }
}

interface Tally {
  readonly won: number
  readonly games: number
  readonly rate: number
}

/** The two name assignments; each matchup also swaps seats, so both the
 * name-keyed tie order and the seat iteration order cancel out of the rate. */
const NAME_PAIRS = [
  ["Challenger", "Opponent"],
  ["Opponent", "Challenger"],
] as const

/** One matchup: every creature seed x battle seed x name pair x seat order.
 * `sibling` pits the species' two real branches against each other: the form
 * fairness probe (a self-mirror of identical builds can only re-measure the
 * resolver's name-keyed tie order, not the branch). */
function runMatchup(
  speciesId: string,
  branchId: string,
  against: "sibling" | "legacy",
): Tally {
  let won = 0
  let games = 0
  const sibling = branchesForSpecies(speciesId).find(
    (def) => def.id !== branchId,
  )
  if (!sibling) throw new Error(`No sibling branch for ${speciesId}`)
  for (const creatureSeed of CREATURE_SEEDS) {
    const mineCreature = evolved(speciesId, creatureSeed, branchId)
    const foeCreature = evolved(
      speciesId,
      creatureSeed,
      against === "sibling" ? sibling.id : "legacy",
    )
    for (const battleSeed of BATTLE_SEEDS) {
      for (const [mineName, foeName] of NAME_PAIRS) {
        const mine = side(mineCreature, mineName, true)
        const foe = side(foeCreature, foeName, true)
        for (const [first, second] of [
          [mine, foe],
          [foe, mine],
        ] as const) {
          const result = resolveBattle(first, second, battleSeed)
          games += 1
          if (result.winner === mine.name) won += 1
          else if (result.winner === null) won += 0.5
        }
      }
    }
  }
  return { won, games, rate: won / games }
}

const MATCHUPS = SPECIES.flatMap((speciesId) =>
  branchesForSpecies(speciesId).flatMap((branch) => [
    { speciesId, branch, against: "sibling" as const },
    { speciesId, branch, against: "legacy" as const },
  ]),
)

const TALLIES = MATCHUPS.map((matchup) => ({
  ...matchup,
  tally: runMatchup(matchup.speciesId, matchup.branch.id, matchup.against),
}))

function label(branch: BranchDef): string {
  return branch.label
}

describe("branch balance probes (AC-11)", () => {
  test("both real forms of every species are covered", () => {
    expect(MATCHUPS.length).toBe(SPECIES.length * 2 * 2)
  })

  test("sibling forms stay inside 45–55%", () => {
    for (const { against, tally } of TALLIES) {
      if (against !== "sibling") continue
      expect(tally.rate).toBeGreaterThanOrEqual(SIBLING_MIN)
      expect(tally.rate).toBeLessThanOrEqual(SIBLING_MAX)
      expect(tally.games).toBe(
        CREATURE_SEEDS.length * BATTLE_SEEDS.length * NAME_PAIRS.length * 2,
      )
    }
  })

  test("each branch stays inside the 40-70% band against legacy", () => {
    for (const { against, tally } of TALLIES) {
      if (against !== "legacy") continue
      expect(tally.rate).toBeGreaterThanOrEqual(LEGACY_MIN)
      expect(tally.rate).toBeLessThanOrEqual(LEGACY_MAX)
    }
  })

  test("both signatures appear in the tested loadouts", () => {
    const signatures = new Set<string>()
    for (const { speciesId, branch } of TALLIES) {
      const kit = side(
        evolved(speciesId, 11, branch.id),
        "Challenger",
        true,
      ).kit
      const signature = branch.signatureMove
      expect(signature).not.toBeNull()
      if (signature !== null) {
        expect(kit).toContain(signature)
        signatures.add(signature)
      }
    }
    expect(signatures.size).toBe(6)
  })

  test("the probe reports a complete table", () => {
    if (!process.env.APEX_BRANCH_BALANCE_REPORT) return
    const rows = TALLIES.map(
      ({ speciesId, branch, against, tally }) =>
        `| ${speciesId} | ${label(branch)} | ${against} | ${tally.won}/${tally.games} | ${(tally.rate * 100).toFixed(1)}% |`,
    )
    console.log(
      [
        "| species | branch | against | won/games | rate |",
        "| --- | --- | --- | --- | --- |",
        ...rows,
      ].join("\n"),
    )
  })
})
