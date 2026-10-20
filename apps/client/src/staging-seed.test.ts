import { describe, expect, test } from "bun:test"
import { BRANCHES, CHAMPION_STAT_BOOST, EVOLUTION_STAT_BOOST } from "@apex/sim"
import { visualSeedOf } from "./staging-seed"

const base = { hp: 43, atk: 11, def: 10, spd: 11 }
const boosted = {
  hp: base.hp + EVOLUTION_STAT_BOOST.hp,
  atk: base.atk + EVOLUTION_STAT_BOOST.atk,
  def: base.def + EVOLUTION_STAT_BOOST.def,
  spd: base.spd + EVOLUTION_STAT_BOOST.spd,
}

describe("visualSeedOf stage awareness", () => {
  test("baby seed is the legacy stats-only formula", () => {
    expect(visualSeedOf(base, "baby")).toBe(
      (base.hp * 7 + base.atk * 13 + base.def * 17 + base.spd * 23) % 2 ** 31,
    )
    expect(visualSeedOf(base)).toBe(visualSeedOf(base, "baby"))
  })

  test("a juvenile's boosted stats keep the creation seed (same individual)", () => {
    expect(visualSeedOf(boosted, "juvenile")).toBe(visualSeedOf(base, "baby"))
  })

  test("without the stage, boosted stats would re-roll the individual", () => {
    // The regression this guard exists for: an arena cast or ranch rebuild
    // that forgets the stage must not silently change the DNA seed.
    expect(visualSeedOf(boosted)).not.toBe(visualSeedOf(base, "baby"))
  })

  test("a champion's cumulative boost also folds back to the creation seed", () => {
    // A champion carries the juvenile step plus the champion step on the
    // rolled base, so the offset is the sum of both pinned tables.
    const total = {
      hp: EVOLUTION_STAT_BOOST.hp + CHAMPION_STAT_BOOST.hp,
      atk: EVOLUTION_STAT_BOOST.atk + CHAMPION_STAT_BOOST.atk,
      def: EVOLUTION_STAT_BOOST.def + CHAMPION_STAT_BOOST.def,
      spd: EVOLUTION_STAT_BOOST.spd + CHAMPION_STAT_BOOST.spd,
    }
    const champion = {
      hp: base.hp + total.hp,
      atk: base.atk + total.atk,
      def: base.def + total.def,
      spd: base.spd + total.spd,
    }
    expect(visualSeedOf(champion, "champion")).toBe(visualSeedOf(base, "baby"))
    expect(visualSeedOf(champion, "champion", "legacy")).toBe(
      visualSeedOf(base, "baby"),
    )
  })
})

describe("visualSeedOf earned branches", () => {
  const offset = (
    stats: typeof base,
    boost: { hp: number; atk: number; def: number; spd: number },
  ) => ({
    hp: stats.hp + boost.hp,
    atk: stats.atk + boost.atk,
    def: stats.def + boost.def,
    spd: stats.spd + boost.spd,
  })

  const courser = BRANCHES.find((branch) => branch.id === "cinder_courser")
  const warden = BRANCHES.find((branch) => branch.id === "pyre_warden")
  if (!courser || !warden) throw new Error("fire branches missing from catalog")

  test("each real branch folds back to the same individual", () => {
    for (const branch of [courser, warden]) {
      const juvenile = offset(base, branch.juvenileBoost)
      expect(visualSeedOf(juvenile, "juvenile", branch.id)).toBe(
        visualSeedOf(base, "baby"),
      )
      const champion = offset(juvenile, branch.championBoost)
      expect(visualSeedOf(champion, "champion", branch.id)).toBe(
        visualSeedOf(base, "baby"),
      )
    }
  })

  test("the legacy branch keeps the old tables and the old seed", () => {
    const juvenile = offset(base, EVOLUTION_STAT_BOOST)
    expect(visualSeedOf(juvenile, "juvenile", "legacy")).toBe(
      visualSeedOf(juvenile, "juvenile"),
    )
    expect(visualSeedOf(juvenile, "juvenile", null)).toBe(
      visualSeedOf(base, "baby"),
    )
  })

  test("subtracting another branch's boost would re-roll the individual", () => {
    const juvenile = offset(base, courser.juvenileBoost)
    expect(visualSeedOf(juvenile, "juvenile", warden.id)).not.toBe(
      visualSeedOf(base, "baby"),
    )
  })
})
