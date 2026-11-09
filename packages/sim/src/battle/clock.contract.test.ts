/**
 * The seeded event-stream contract (battle-sim-consolidation_20261013,
 * Phase 0). This file is the *witness* for the behavior-identical parts of
 * that track: the clock consolidation (spec FR1/FR2) and the cup seed
 * extraction (FR3) must leave every seeded battle byte-for-byte identical.
 *
 * Unlike the rest of the suite this test is expected to pass both BEFORE and
 * AFTER a refactor — that is its whole job. It becomes a red test only when a
 * behavioral change is authorized by an FR (see `GOLDEN` notes below), and the
 * diff is recorded as part of that change.
 *
 * The matrix deliberately mixes mirrors with cross-element pairings: the
 * super-effective stagger branch (FR1) can only fire when the attacker's
 * element beats the defender's, so a mirror-only matrix would leave half the
 * heavy-hit rule unpinned.
 */

import { describe, expect, test } from "bun:test"
import { createCreature } from "../creature"
import { getSpecies, type SpeciesDef, STARTER_SPECIES } from "../species"
import { type BattleEvent, STAGGER_DAMAGE_FRACTION } from "./clock"
import { strikeDamage } from "./damage"
import { BASIC_MOVE } from "./moves"
import type { Tactic } from "./policy"
import { type BattleResult, type BattleSide, resolveBattle } from "./resolver"

/** Fixed creature seed: stats are identical across every case, so only the
 * battle seed and the loadout/tactic choices vary. */
const CREATURE_SEED = 777

/** Battle seeds replayed inside every case group. */
const BATTLE_SEEDS: readonly number[] = [11, 29, 47]

/** Kit tiers: the first 2, 3 or 4 moves of a species kit. */
const KIT_TIERS: readonly number[] = [2, 3, 4]

/** Tactic pairings, both sides' tactics. */
const TACTIC_PAIRS: readonly (readonly [Tactic, Tactic])[] = [
  ["balanced", "balanced"],
  ["specials", "specials"],
  ["balanced", "specials"],
  ["specials", "balanced"],
]

/** Six species pairings: three mirrors plus three cross-element matchups that
 * each hit a super-effective branch of the type chart. */
const SPECIES_PAIRS: readonly (readonly [string, string])[] = [
  ["fire_drake", "fire_drake"],
  ["plant_ox", "plant_ox"],
  ["water_axolotl", "water_axolotl"],
  ["fire_drake", "plant_ox"],
  ["fire_drake", "water_axolotl"],
  ["plant_ox", "water_axolotl"],
]

function species(id: string): SpeciesDef {
  const def = getSpecies(id)
  if (!def) throw new Error(`Unknown species: ${id}`)
  return def
}

function side(
  id: string,
  name: string,
  key: string,
  kitTier: number,
  tactic: Tactic,
): BattleSide {
  const def = species(id)
  const creature = createCreature(id, CREATURE_SEED)
  return {
    name,
    id: key,
    element: creature.element,
    stats: creature.stats,
    kit: def.kit.slice(0, kitTier),
    tactic,
    temperament: def.temperament,
  }
}

/** FNV-1a over the canonical serialization: a compact, stable fingerprint. */
function digest(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}

function hpSnapshot(hpAfter: Readonly<Record<string, number>>): string {
  return Object.keys(hpAfter)
    .sort()
    .map((key) => `${key}:${hpAfter[key] ?? 0}`)
    .join(",")
}

function serializeEvent(event: BattleEvent): string {
  return [
    event.tick,
    event.kind,
    event.actor,
    event.actorKey ?? "-",
    event.target ?? "-",
    event.moveId ?? "-",
    event.damage ?? "-",
    event.hit ?? "-",
    event.missReason ?? "-",
    event.reaction ?? "-",
    event.line,
    hpSnapshot(event.hpAfter),
  ].join("|")
}

function serialize(result: BattleResult): string {
  const head = [
    `winner=${result.winner ?? "-"}`,
    `reason=${result.reason}`,
    `finalHp=${hpSnapshot(result.finalHp)}`,
  ]
  return [...head, ...result.events.map(serializeEvent)].join("\n")
}

/**
 * Captured from the pre-consolidation code. Every digest here must survive
 * Phase 1 and Phase 2 untouched. It may only change when an FR authorizes a
 * behavioral change, and the change must be justified in the track's phase
 * notes. Recaptured once during Phase 3: the revised FR6 (per-tactic
 * ranking + the sustained-score qualifier) changed every mirror and every
 * fire-vs-plant / plant-vs-fire / ox-vs-axolotl battle — the authorized
 * rebalance — while fire-vs-water kit2 and water-vs-fire kit2 happened to
 * keep their streams. Recaptured again in Phase 5 (FR-10): folding the blow
 * weight into MoveDef.power doubles legacy damage, so every stream moves.
 * Recaptured in Phase 9 (FR-10): the tier-2 mid row moves 18 -> 19 to restore
 * the light < mid < heavy damage order, which the frozen clock reads through
 * MoveDef.power. Only kit3 and kit4 move — kit2 does not field a tier-2 row.
 */
const GOLDEN: Readonly<Record<string, string>> = {
  // Mirrors: each species fights itself (three kit tiers).
  "fire_drake|fire_drake|kit2": "7c03d0f9",
  "fire_drake|fire_drake|kit3": "78bd1ea6",
  "fire_drake|fire_drake|kit4": "6c96af79",
  "plant_ox|plant_ox|kit2": "1bf2d529",
  "plant_ox|plant_ox|kit3": "6a98ace2",
  "plant_ox|plant_ox|kit4": "22de4ae5",
  "water_axolotl|water_axolotl|kit2": "878b18ad",
  "water_axolotl|water_axolotl|kit3": "c50ac736",
  "water_axolotl|water_axolotl|kit4": "1ccb8f81",
  // Cross-element: fire>plant, water>fire, plant>water, both side orders.
  "fire_drake|plant_ox|kit2": "b4eb3829",
  "fire_drake|plant_ox|kit3": "08fc352f",
  "fire_drake|plant_ox|kit4": "e127a571",
  "plant_ox|fire_drake|kit2": "2dd325e1",
  "plant_ox|fire_drake|kit3": "6f885739",
  "plant_ox|fire_drake|kit4": "22689a4f",
  "fire_drake|water_axolotl|kit2": "268c4749",
  "fire_drake|water_axolotl|kit3": "9bc21b21",
  "fire_drake|water_axolotl|kit4": "2f065bb0",
  "water_axolotl|fire_drake|kit2": "6ac78389",
  "water_axolotl|fire_drake|kit3": "8c6ff0f7",
  "water_axolotl|fire_drake|kit4": "1682534e",
  "plant_ox|water_axolotl|kit2": "3905bf45",
  "plant_ox|water_axolotl|kit3": "3349ec29",
  "plant_ox|water_axolotl|kit4": "442424fd",
  "water_axolotl|plant_ox|kit2": "19cf768d",
  "water_axolotl|plant_ox|kit3": "d2bb6e2d",
  "water_axolotl|plant_ox|kit4": "4201a5e7",
}

interface RunSummary {
  /** Reaction coverage across the whole matrix, for the path assertions. */
  impactStagger: number
  impactKnockback: number
  downs: number
  staggers: number
  knockbacks: number
  draws: number
}

function emptySummary(): RunSummary {
  return {
    impactStagger: 0,
    impactKnockback: 0,
    downs: 0,
    staggers: 0,
    knockbacks: 0,
    draws: 0,
  }
}

const SPECIES_CASE_IDS: readonly string[] = SPECIES_PAIRS.flatMap(([a, b]) => [
  `${a}|${b}`,
  `${b}|${a}`,
])

describe("seeded battle event-stream contract", () => {
  test("every seeded matchup reproduces its captured digest", () => {
    const coverage = emptySummary()
    const actual: Record<string, string> = {}

    for (const [leftId, rightId] of SPECIES_PAIRS) {
      for (const ordered of [
        [leftId, rightId],
        [rightId, leftId],
      ] as const) {
        const [aId, bId] = ordered
        for (const kitTier of KIT_TIERS) {
          const caseId = `${aId}|${bId}|kit${kitTier}`
          const lines: string[] = []
          for (const [aTactic, bTactic] of TACTIC_PAIRS) {
            for (const seed of BATTLE_SEEDS) {
              const a = side(
                aId,
                `${species(aId).displayName} A`,
                "a",
                kitTier,
                aTactic,
              )
              const b = side(
                bId,
                `${species(bId).displayName} B`,
                "b",
                kitTier,
                bTactic,
              )
              const result = resolveBattle(a, b, seed)
              lines.push(
                `-- ${aTactic}/${bTactic} seed=${seed}\n${serialize(result)}`,
              )
              for (const event of result.events) {
                if (event.kind === "down") coverage.downs += 1
                if (event.kind === "stagger") coverage.staggers += 1
                if (event.kind === "knockback") coverage.knockbacks += 1
                if (event.kind === "draw") coverage.draws += 1
                if (event.kind === "impact") {
                  if (event.reaction === "stagger") coverage.impactStagger += 1
                  if (event.reaction === "knockback")
                    coverage.impactKnockback += 1
                }
              }
            }
          }
          actual[caseId] = digest(lines.join("\n"))
        }
      }
    }

    // Coverage: the contract is worthless unless the matrix actually walks
    // the heavy-hit rule — which it reaches through the projectile path.
    expect({
      impactStagger: coverage.impactStagger > 0,
      impactKnockback: coverage.impactKnockback > 0,
      downs: coverage.downs > 0,
      staggers: coverage.staggers > 0,
      knockbacks: coverage.knockbacks > 0,
    }).toEqual({
      impactStagger: true,
      impactKnockback: true,
      downs: true,
      staggers: true,
      knockbacks: true,
    })

    // The melee branch's heavy rule is unreachable with starter stats, so it
    // contributes no events here. See the reachability test below; the melee
    // rules themselves are unit-tested in clock.test.ts.

    const mismatches = Object.keys(actual).filter(
      (id) => GOLDEN[id] !== actual[id],
    )
    expect(
      mismatches.map((id) => ({
        case: id,
        expected: GOLDEN[id],
        actual: actual[id],
      })),
    ).toEqual([])

    expect(actual).toEqual({ ...GOLDEN })
    expect(SPECIES_CASE_IDS).toHaveLength(SPECIES_PAIRS.length * 2)
  })

  test("the innate Strike can never reach the heavy-hit thresholds", () => {
    // Why the melee branch of the heavy-hit rule contributes nothing to the
    // digest matrix above: the best attainable Strike damage (max ATK vs min
    // DEF across every starter pairing) is well under the lowest heavy
    // threshold (STAGGER_DAMAGE_FRACTION of the lowest max HP). The branch is
    // defensive code, unit-tested in clock.test.ts with synthetic stats.
    let bestStrike = 0
    let lowestThreshold = Number.POSITIVE_INFINITY
    for (const attacker of STARTER_SPECIES) {
      for (const defender of STARTER_SPECIES) {
        const damage = strikeDamage(
          BASIC_MOVE.power,
          attacker.statBounds.atk[1],
          defender.statBounds.def[0],
          1,
          1,
          true,
        )
        bestStrike = Math.max(bestStrike, damage)
        lowestThreshold = Math.min(
          lowestThreshold,
          defender.statBounds.hp[0] * STAGGER_DAMAGE_FRACTION,
        )
      }
    }
    // Phase 5 fold (FR-10): the innate Strike is power 10, so the best
    // attainable Strike is 18 (still under the lowest heavy threshold).
    expect(bestStrike).toBe(18)
    expect(bestStrike).toBeLessThan(lowestThreshold)
  })

  test("draw endings stay reachable in the matrix", () => {
    // A safety net for the coverage block above: at least one decided-or-drawn
    // outcome variety exists, so the digest matrix is not degenerate.
    let sawDraw = false
    for (const [aId, bId] of SPECIES_PAIRS) {
      for (const [aTactic, bTactic] of TACTIC_PAIRS) {
        for (const seed of BATTLE_SEEDS) {
          const result = resolveBattle(
            side(aId, "A", "a", 4, aTactic),
            side(bId, "B", "b", 4, bTactic),
            seed,
          )
          if (result.reason !== "ko") sawDraw = true
        }
      }
    }
    expect(sawDraw).toBe(true)
  })
})
