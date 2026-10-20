import { describe, expect, test } from "bun:test"
import {
  type Creature,
  createCreature,
  TRAINING_CAP,
  TRAINING_PROGRAMS,
} from "@apex/sim"
import {
  allPrimariesCapped,
  nextRowIndex,
  programRow,
  programRows,
  rovingRow,
} from "./programs"

const fresh = createCreature("fire_drake", 42)

function trained(overrides: Partial<Creature["trained"]>): Creature {
  return { ...fresh, trained: { ...fresh.trained, ...overrides } }
}

function assigned(program: Creature["trainingProgram"]): Creature {
  return { ...fresh, trainingProgram: program }
}

function condition(overrides: Partial<Creature["conditions"]>): Creature {
  return { ...fresh, conditions: { ...fresh.conditions, ...overrides } }
}

describe("the program picker rows", () => {
  test("follows the catalog order and never invents a label or blurb", () => {
    const rows = programRows(fresh)
    expect(rows.map((row) => row.id)).toEqual(
      TRAINING_PROGRAMS.map((program) => program.id),
    )
    expect(rows.map((row) => row.label)).toEqual([
      "Power Lifting",
      "Endurance Circuit",
      "Sprint Work",
      "Ring Craft",
    ])
    expect(rows.map((row) => row.blurb)).toEqual(
      TRAINING_PROGRAMS.map((program) => program.blurb),
    )
  })

  test("spells the primary/trickle tradeoff out in stat names", () => {
    expect(programRow(fresh, "power").tradeoff).toBe(
      "ATK +1/night — DEF on breakthrough nights",
    )
    expect(programRow(fresh, "endurance").tradeoff).toBe(
      "HP +1/night — DEF on breakthrough nights",
    )
    expect(programRow(fresh, "sprint").tradeoff).toBe(
      "SPD +1/night — ATK on breakthrough nights",
    )
    expect(programRow(fresh, "ring").tradeoff).toBe(
      "ATK +1/night — DEF on breakthrough nights",
    )
  })

  test("projects tonight's gain for the row's own program", () => {
    expect(programRows(fresh).map((row) => row.tonight)).toEqual([
      "+1 ATK",
      "+1 HP",
      "+1 SPD",
      "+1 ATK · +5 MOOD · +2 BOND",
    ])
  })

  test("ring craft is told apart from power lifting by its payoff", () => {
    // Same two stats, but only the ring lifts mood and bond: the four rows
    // must never read alike, or the picker cannot be used.
    const power = programRow(fresh, "power")
    const ring = programRow(fresh, "ring")
    expect(ring.tradeoff).toBe(power.tradeoff)
    expect(ring.tonight).toContain("+5 MOOD")
    expect(ring.tonight).toContain("+2 BOND")
    expect(new Set(programRows(fresh).map((row) => row.tonight)).size).toBe(4)
  })

  test("ring craft drops a payoff that is already maxed", () => {
    const full = condition({ mood: 100, bond: 100 })
    expect(programRow(full, "ring").tonight).toBe("+1 ATK")
    expect(programRow(condition({ mood: 100, bond: 10 }), "ring").tonight).toBe(
      "+1 ATK · +2 BOND",
    )
  })

  test("projects both stats on a breakthrough night", () => {
    // Tonight is the third trained night (two behind, one paid now), so the
    // trickle pays as well as the primary.
    const breaking = { ...fresh, trainingDays: 2 }
    expect(programRow(breaking, "power").tonight).toBe("+1 ATK, +1 DEF")
    // A counter already on a multiple of three means tonight is the fourth.
    expect(programRow({ ...fresh, trainingDays: 3 }, "power").tonight).toBe(
      "+1 ATK",
    )
  })

  test("the assigned row does not count the night twice", () => {
    // An assigned creature's counter already includes tonight (the pick spent
    // the AP), so the projection must not bump it again.
    const assigned = {
      ...fresh,
      trainingDays: 3,
      trainingProgram: "power" as const,
    }
    expect(programRow(assigned, "power").tonight).toBe("+1 ATK, +1 DEF")
  })

  test("says why a night will not pay instead of showing a gain", () => {
    expect(programRow(condition({ health: 50 }), "power").tonight).toBe(
      "Sick — no gain tonight",
    )
    expect(programRow(condition({ energy: 10 }), "sprint").tonight).toBe(
      "Too tired to gain tonight",
    )
    expect(programRow(condition({ hunger: 0 }), "endurance").tonight).toBe(
      "Hungry — no gain tonight",
    )
  })

  test("marks the assigned program, and only it", () => {
    const rows = programRows(assigned("ring"))
    expect(rows.map((row) => row.assigned)).toEqual([false, false, false, true])
    expect(programRow(assigned("endurance"), "endurance").assigned).toBe(true)
  })

  test("a capped primary closes that row only, never the picker", () => {
    // ATK is power's and ring's primary, so capping it closes those two rows
    // only — endurance (HP) and sprint (SPD) still have room.
    const atkCapped = trained({ atk: TRAINING_CAP })
    expect(allPrimariesCapped(atkCapped)).toBe(false)
    const rows = programRows(atkCapped)
    expect(rows.map((row) => row.disabled)).toEqual([true, false, false, true])
    expect(rows[0]?.tonight).toBe("ATK capped")
  })

  test("reports every primary capped only when all four are", () => {
    const capped = trained({
      hp: TRAINING_CAP,
      atk: TRAINING_CAP,
      def: TRAINING_CAP,
      spd: TRAINING_CAP,
    })
    expect(allPrimariesCapped(capped)).toBe(true)
    expect(programRows(capped).every((row) => row.disabled)).toBe(true)
  })
})

describe("the picker's roving tab stop", () => {
  test("starts on the assigned row", () => {
    expect(rovingRow(programRows(assigned("sprint")))).toBe(2)
  })

  test("falls to the first pickable row when nothing is assigned", () => {
    expect(rovingRow(programRows(fresh))).toBe(0)
    expect(rovingRow(programRows(trained({ atk: TRAINING_CAP })))).toBe(1)
  })

  test("skips rows that cannot be picked, and wraps", () => {
    const rows = programRows(trained({ atk: TRAINING_CAP }))
    // power (0) and ring (3) are capped: 1 -> 2 -> wraps to 1.
    expect(nextRowIndex(rows, 1, 1)).toBe(2)
    expect(nextRowIndex(rows, 2, 1)).toBe(1)
    expect(nextRowIndex(rows, 1, -1)).toBe(2)
  })

  test("returns -1 when every row is capped", () => {
    const capped = programRows(
      trained({
        hp: TRAINING_CAP,
        atk: TRAINING_CAP,
        def: TRAINING_CAP,
        spd: TRAINING_CAP,
      }),
    )
    expect(nextRowIndex(capped, 0, 1)).toBe(-1)
    expect(rovingRow(capped)).toBe(0)
  })

  test("handles an empty list without throwing", () => {
    expect(nextRowIndex([], 0, 1)).toBe(-1)
    expect(rovingRow([])).toBe(-1)
  })
})
