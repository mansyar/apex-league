import { describe, expect, test } from "bun:test"
import { branchesForSpecies } from "../../branches"
import { ALL_SPECIES, type SpeciesDef } from "../../species"
import type { BattleSide } from "../resolver"
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

/** Measured-side wins and draws over its six probe fights. */
function probeRow(doctrine: DoctrineId): { wins: number; draws: number } {
  const standard = ALL_SPECIES.find((s) => s.id === STANDARD_SPECIES)
  const opponent = ALL_SPECIES.find((s) => s.id === DOCTRINE_OPPONENT)
  if (!standard || !opponent)
    throw new Error("the probe matchup left the roster")
  let wins = 0
  let draws = 0
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
      if (result.winner === null) draws += 1
      else if (result.winner === watchName) wins += 1
    }
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
})
