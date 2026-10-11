import { describe, expect, test } from "bun:test"
import { EVOLUTION_STAT_BOOST } from "@apex/sim"
import { visualSeedOf } from "./staging"

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
})
