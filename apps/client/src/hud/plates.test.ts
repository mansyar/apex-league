import { describe, expect, test } from "bun:test"
import { createCreature, type GameState } from "@apex/sim"
import {
  apPipPlan,
  conditionDelta,
  ladderRead,
  lineageMeta,
  promotionLine,
  statCell,
} from "./plates"

const ladder = (
  tier: GameState["ladder"]["tier"],
  subTier: GameState["ladder"]["subTier"],
  points: number,
): GameState["ladder"] => ({ tier, subTier, points })

describe("ladderRead", () => {
  test("golden: Bronze III reads progress toward Bronze II (6)", () => {
    expect(ladderRead(ladder("bronze", "III", 0))).toEqual({
      tierName: "Bronze",
      rank: "Bronze III",
      points: "0/6",
      ariaLabel: "League standing: Bronze III, 0 of 6 points toward Bronze II",
      isSilver: false,
    })
  })

  test("golden: Bronze II reads progress toward Bronze I (12)", () => {
    expect(ladderRead(ladder("bronze", "II", 7))).toEqual({
      tierName: "Bronze",
      rank: "Bronze II",
      points: "7/12",
      ariaLabel: "League standing: Bronze II, 7 of 12 points toward Bronze I",
      isSilver: false,
    })
  })

  test("golden: Bronze I banks its points toward Silver", () => {
    expect(ladderRead(ladder("bronze", "I", 15))).toEqual({
      tierName: "Bronze",
      rank: "Bronze I",
      points: "15 pts",
      ariaLabel: "League standing: Bronze I, 15 points banked",
      isSilver: false,
    })
  })

  test("golden: Silver III reads progress toward Silver II (18)", () => {
    expect(ladderRead(ladder("silver", "III", 10))).toEqual({
      tierName: "Silver",
      rank: "Silver III",
      points: "10/18",
      ariaLabel:
        "League standing: Silver III, 10 of 18 points toward Silver II",
      isSilver: true,
    })
  })

  test("golden: Silver II reads progress toward Silver I (24)", () => {
    expect(ladderRead(ladder("silver", "II", 20))).toEqual({
      tierName: "Silver",
      rank: "Silver II",
      points: "20/24",
      ariaLabel: "League standing: Silver II, 20 of 24 points toward Silver I",
      isSilver: true,
    })
  })

  test("golden: Silver I is the apex — points banked", () => {
    expect(ladderRead(ladder("silver", "I", 30))).toEqual({
      tierName: "Silver",
      rank: "Silver I",
      points: "30 pts",
      ariaLabel: "League standing: Silver I, 30 points banked",
      isSilver: true,
    })
  })
})

describe("apPipPlan", () => {
  test("golden: a plain day renders the daily max with no flash", () => {
    expect(apPipPlan(3, null)).toEqual({
      bonus: 0,
      clamped: 3,
      wantPips: 3,
      flash: null,
    })
  })

  test("golden: cup bonus points extend past the daily max", () => {
    expect(apPipPlan(5, null)).toEqual({
      bonus: 2,
      clamped: 3,
      wantPips: 5,
      flash: null,
    })
    expect(apPipPlan(12, null)).toEqual({
      bonus: 9,
      clamped: 3,
      wantPips: 12,
      flash: null,
    })
  })

  test("golden: a fresh spend flashes the drained pip", () => {
    expect(apPipPlan(2, 3)).toMatchObject({ flash: 2 })
    expect(apPipPlan(0, 3)).toMatchObject({ flash: 0, clamped: 0 })
  })

  test("golden: the first update never flashes", () => {
    expect(apPipPlan(3, null).flash).toBeNull()
  })
})

describe("conditionDelta", () => {
  test("golden: the first observation never flashes", () => {
    expect(conditionDelta(null, 80)).toEqual({ swing: 0, text: null })
  })

  test("golden: swings of ±2 or more produce a signed delta chip", () => {
    expect(conditionDelta(80, 82)).toEqual({ swing: 2, text: "+2" })
    expect(conditionDelta(80, 78)).toEqual({ swing: -2, text: "−2" })
    expect(conditionDelta(80, 85)).toEqual({ swing: 5, text: "+5" })
  })

  test("golden: small drift stays quiet", () => {
    expect(conditionDelta(80, 81)).toEqual({ swing: 1, text: null })
    expect(conditionDelta(80, 80)).toEqual({ swing: 0, text: null })
  })
})

describe("statCell", () => {
  const drake = createCreature("fire_drake", 42)

  test("golden: total is rolled base + trained, bonus shows when trained", () => {
    expect(statCell(drake, "hp")).toEqual({ total: drake.stats.hp, bonus: "" })
    const trained = { ...drake, trained: { ...drake.trained, hp: 3 } }
    expect(statCell(trained, "hp")).toEqual({
      total: drake.stats.hp + 3,
      bonus: "+3",
    })
  })
})

describe("lineageMeta", () => {
  test("golden: singular cup reads bare", () => {
    expect(lineageMeta(1, 2, 1)).toBe("Gen 1 · Prestige 2 · 1 cup")
  })

  test("golden: plural and zero cups", () => {
    expect(lineageMeta(0, 0, 3)).toBe("Gen 0 · Prestige 0 · 3 cups")
    expect(lineageMeta(2, 0, 0)).toBe("Gen 2 · Prestige 0 · 0 cups")
  })
})

describe("promotionLine", () => {
  test("golden: the promotion callout", () => {
    expect(promotionLine("Bronze", "II")).toBe("Promotion — Bronze II!")
    expect(promotionLine("Silver", "I")).toBe("Promotion — Silver I!")
  })
})
