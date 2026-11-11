import { describe, expect, test } from "bun:test"
import { branchesForSpecies } from "../../branches"
import { ALL_SPECIES, type SpeciesDef } from "../../species"
import type { BattleReason, BattleSide } from "../resolver"
import {
  DOCTRINE_IDS,
  type DoctrineId,
  tacticForDoctrine,
} from "./controller-profile"
import { resolveContinuous } from "./resolve"

/**
 * Kite regression pin (variance Phase 3, FR-6 / AC-6): the doctrine probe's
 * fixed matchup (fire_drake, measured side varies, electric_hound stays on
 * press, three seeds x both orders = six fights per doctrine) records a
 * non-zero Kite win share without a doctrine redesign, and no other doctrine
 * sits at zero. Phases 1 (honest ladder) and 2 (execution noise) moved the
 * probe from the R1 0/6 verdict to 2/6 with every other row non-zero, so this
 * pins the outcome rather than retuning a band: the doctrine table below is
 * frozen and this file asserts the measured result, never the tuning.
 */
const STANDARD_SPECIES = "fire_drake"
const DOCTRINE_OPPONENT = "electric_hound"
const STANDARD_DOCTRINE: DoctrineId = "press"
const DOCTRINE_SEEDS = [20261109, 20261110, 20261111] as const

type StatLine = { hp: number; atk: number; def: number; spd: number }

function typicalLine(species: SpeciesDef): StatLine {
  const bounds = species.statBounds
  return {
    hp: Math.floor((bounds.hp[0] + bounds.hp[1]) / 2),
    atk: Math.floor((bounds.atk[0] + bounds.atk[1]) / 2),
    def: Math.floor((bounds.def[0] + bounds.def[1]) / 2),
    spd: Math.floor((bounds.spd[0] + bounds.spd[1]) / 2),
  }
}

function probeSide(species: SpeciesDef, doctrine: DoctrineId): BattleSide {
  return {
    name: species.displayName,
    id: species.id,
    element: species.element,
    stats: typicalLine(species),
    kit: species.kit.slice(0, 4),
    tactic: tacticForDoctrine(doctrine),
    doctrine,
    temperament: species.temperament,
    branch: branchesForSpecies(species.id)[0]?.id,
  }
}

/** One measured-side fight on the pinned seeds: who won and what dodging cost. */
export interface ProbeFight {
  readonly seed: (typeof DOCTRINE_SEEDS)[number]
  readonly order: 0 | 1
  /** "measured" when the doctrine side won, "opponent", or null on a draw. */
  readonly winner: "measured" | "opponent" | null
  readonly reason: BattleReason
  /** Paid dodges by the measured side — the FR-1 per-fight figure. */
  readonly measuredDodges: number
  readonly finalHp: Readonly<Record<string, number>>
}

/** One doctrine-table fight per seed and order: fire_drake, measured side varies. */
export function probeFights(doctrine: DoctrineId): ProbeFight[] {
  const standard = ALL_SPECIES.find((s) => s.id === STANDARD_SPECIES)
  const opponent = ALL_SPECIES.find((s) => s.id === DOCTRINE_OPPONENT)
  if (!standard || !opponent)
    throw new Error("the probe matchup left the roster")
  const fights: ProbeFight[] = []
  for (const order of [0, 1] as const) {
    for (const seed of DOCTRINE_SEEDS) {
      const home = order === 0 ? standard : opponent
      const away = order === 0 ? opponent : standard
      const homeSide = probeSide(
        home,
        order === 0 ? doctrine : STANDARD_DOCTRINE,
      )
      const awaySide = probeSide(
        away,
        order === 0 ? STANDARD_DOCTRINE : doctrine,
      )
      const result = resolveContinuous(homeSide, awaySide, seed)
      const watch = order === 0 ? 0 : 1
      const watchName = watch === 0 ? homeSide.name : awaySide.name
      fights.push({
        seed,
        order,
        winner:
          result.winner === null
            ? null
            : result.winner === watchName
              ? "measured"
              : "opponent",
        reason: result.reason,
        measuredDodges: result.dodges?.[watch] ?? 0,
        finalHp: result.finalHp,
      })
    }
  }
  return fights
}

const DODGE_SUBJECT = "electric_hound"
const DODGE_OPPONENT = "earth_tortoise"

/**
 * One dodge-probe fight per seed and order (R1, F2): electric_hound, measured
 * side varies, opponent stays press. The doctrine table's fixed matchup draws
 * no paid dodge, so this is where the per-fight dodge volume lives.
 */
export function dodgeProbeFights(doctrine: DoctrineId): ProbeFight[] {
  const subject = ALL_SPECIES.find((s) => s.id === DODGE_SUBJECT)
  const rival = ALL_SPECIES.find((s) => s.id === DODGE_OPPONENT)
  if (!subject || !rival) throw new Error("the dodge fixture left the roster")
  const fights: ProbeFight[] = []
  for (const order of [0, 1] as const) {
    for (const seed of DOCTRINE_SEEDS) {
      const home = order === 0 ? subject : rival
      const away = order === 0 ? rival : subject
      const homeSide = probeSide(
        home,
        order === 0 ? doctrine : STANDARD_DOCTRINE,
      )
      const awaySide = probeSide(
        away,
        order === 0 ? STANDARD_DOCTRINE : doctrine,
      )
      const result = resolveContinuous(homeSide, awaySide, seed)
      const watch = order === 0 ? 0 : 1
      const watchName = watch === 0 ? homeSide.name : awaySide.name
      fights.push({
        seed,
        order,
        winner:
          result.winner === null
            ? null
            : result.winner === watchName
              ? "measured"
              : "opponent",
        reason: result.reason,
        measuredDodges: result.dodges?.[watch] ?? 0,
        finalHp: result.finalHp,
      })
    }
  }
  return fights
}

/** Measured-side wins and draws over its six probe fights. */
function probeRow(doctrine: DoctrineId): { wins: number; draws: number } {
  let wins = 0
  let draws = 0
  for (const fight of probeFights(doctrine)) {
    if (fight.winner === null) draws += 1
    else if (fight.winner === "measured") wins += 1
  }
  return { wins, draws }
}

describe("Kite records a non-zero probe share with every doctrine non-zero (FR-6, AC-6)", () => {
  test("kite wins at least one of its six sampled fights", () => {
    const kite = probeRow("kite")
    expect(kite.wins).toBeGreaterThan(0)
  })

  test("no doctrine sits at zero in the same probe", () => {
    for (const doctrine of DOCTRINE_IDS) {
      const row = probeRow(doctrine)
      expect(row.wins + row.draws / 2).toBeGreaterThan(0)
    }
  })

  test("the kite probe records wins and paid dodges per fight on pinned seeds (FR-1, AC-1)", () => {
    // FR-1's baseline lives here as data, not just as aggregate wins: six
    // doctrine-table fights and six dodge-probe fights, each naming its seed,
    // order, winner and the measured side's paid dodges. The table is printed
    // so the CI log carries the pre-change baseline the verdict measures from.
    const table = probeFights("kite")
    expect(table).toHaveLength(6)
    expect(table.map((fight) => fight.seed)).toEqual([
      ...DOCTRINE_SEEDS,
      ...DOCTRINE_SEEDS,
    ])
    expect(table.map((fight) => fight.order)).toEqual([0, 0, 0, 1, 1, 1])
    const row = probeRow("kite")
    expect(table.filter((fight) => fight.winner === "measured")).toHaveLength(
      row.wins,
    )
    expect(table.filter((fight) => fight.winner === null)).toHaveLength(
      row.draws,
    )
    const dodgeTable = dodgeProbeFights("kite")
    expect(dodgeTable).toHaveLength(6)
    // Dodge volume is data, not the verdict — but the per-fight figures must
    // exist before Phase 2 can rule them in or out (FR-2).
    const paid = dodgeTable.reduce(
      (total, fight) => total + fight.measuredDodges,
      0,
    )
    expect(paid).toBeGreaterThan(0)
    const lines = [
      "kite probe per-fight baseline (measured side varies, opponent press)",
      "doctrine table (fire_drake v electric_hound):",
      ...table.map(
        (fight) =>
          `  seed=${fight.seed} order=${fight.order} winner=${fight.winner ?? "draw"} reason=${fight.reason} paid-dodges=${fight.measuredDodges} finalHp=${JSON.stringify(fight.finalHp)}`,
      ),
      "dodge probe (electric_hound v earth_tortoise):",
      ...dodgeTable.map(
        (fight) =>
          `  seed=${fight.seed} order=${fight.order} winner=${fight.winner ?? "draw"} reason=${fight.reason} paid-dodges=${fight.measuredDodges} finalHp=${JSON.stringify(fight.finalHp)}`,
      ),
    ]
    console.log(lines.join("\n"))
  })
})
