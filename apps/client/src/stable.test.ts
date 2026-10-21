/**
 * The stable surface (stable & partner reserve FR-9): the decisions behind the
 * modal — what a waiting pet reads as, when the chip shows, and what a refused
 * swap says.
 *
 * The DOM around these rules is verified in the browser (the Phase 3 visual
 * pass); these are the decisions under it.
 */
import { describe, expect, test } from "bun:test"
import {
  type Creature,
  chooseStarter,
  createCreature,
  createGiftEgg,
  createInitialState,
  type GameState,
} from "@apex/sim"
import {
  ageLabel,
  STABLE_EMPTY_COPY,
  stableChipVisible,
  stableMeta,
  stableRefusalCopy,
  stableRow,
  stableRows,
} from "./stable"

/** A waiting pet: the starter species, renamed and aged. */
const pet = (over: Partial<Creature> = {}): Creature => ({
  ...createCreature("fire_drake", 42),
  name: "Rolo",
  ...over,
})

/** A ranch with one pet in it and `stable` pets waiting. */
const stateWith = (stable: Creature[]): GameState => {
  const base = chooseStarter(createInitialState(), "fire_drake", 42)
  return { ...base, stable }
}

describe("ageLabel", () => {
  test("counts the pet's own days", () => {
    expect(ageLabel(1)).toBe("1 day")
    expect(ageLabel(12)).toBe("12 days")
    expect(ageLabel(60)).toBe("60 days")
  })
})

describe("stableRow", () => {
  test("reads name, species, stage and the pet's own age", () => {
    const row = stableRow(pet({ name: "Rolo", ageDays: 12 }), 0)
    expect(row.id).toBe("stable:0")
    expect(row.name).toBe("Rolo")
    expect(row.species).toBe("Ember Drake")
    expect(row.stage).toBe("Baby")
    expect(row.age).toBe("12 days")
  })

  test("the slot id is the sim's own, so the swap can address the pet", () => {
    expect(stableRow(pet(), 2).id).toBe("stable:2")
  })
})

describe("stableMeta — the line a waiting pet reads as", () => {
  test("an unrenamed pet does not repeat its species", () => {
    const row = stableRow(pet({ name: "Ember Drake", ageDays: 12 }), 0)
    expect(row.species).toBeNull()
    expect(stableMeta(row)).toBe("Baby · 12 days")
  })

  test("a renamed pet still says what it is", () => {
    const row = stableRow(pet({ name: "Rolo", ageDays: 12 }), 0)
    expect(row.species).toBe("Ember Drake")
    expect(stableMeta(row)).toBe("Ember Drake · Baby · 12 days")
  })

  test("the comparison ignores case, so a name that matches reads cleanly", () => {
    const row = stableRow(pet({ name: "ember drake" }), 0)
    expect(row.species).toBeNull()
    expect(stableMeta(row)).toBe("Baby · 1 day")
  })

  test("a renamed pet of the gift species keeps the species line", () => {
    const hound = createGiftEgg(4242)
    const row = stableRow({ ...hound, name: "Rolo" }, 0)
    expect(row.species).toBe("Storm Hound")
    expect(stableMeta(row)).toBe("Storm Hound · Baby · 1 day")
  })
})

describe("stableRows", () => {
  test("lists every waiting pet in stable order", () => {
    const rows = stableRows(
      stateWith([
        pet({ name: "Rolo", ageDays: 3 }),
        pet({ name: "Bramble", ageDays: 9, stage: "juvenile" }),
      ]),
    )
    expect(rows.map((row) => row.id)).toEqual(["stable:0", "stable:1"])
    expect(rows.map((row) => row.name)).toEqual(["Rolo", "Bramble"])
    expect(rows[1]?.stage).toBe("Juvenile")
    expect(rows[1]?.age).toBe("9 days")
  })

  test("an empty stable lists nothing", () => {
    expect(stableRows(stateWith([]))).toEqual([])
  })
})

describe("stableChipVisible", () => {
  test("the chip folds away while the stable is empty", () => {
    expect(stableChipVisible(stateWith([]))).toBe(false)
  })

  test("the chip shows as soon as a pet waits", () => {
    expect(stableChipVisible(stateWith([pet()]))).toBe(true)
  })
})

describe("stableRefusalCopy", () => {
  test("the day-phase lock reads as coaching, never a dead button", () => {
    const copy = stableRefusalCopy("cup-phase")
    expect(copy).toContain("cup")
    expect(copy.length).toBeGreaterThan(0)
  })

  test("every refusal says something", () => {
    for (const reason of [
      "cup-phase",
      "no-creature",
      "only-pet",
      "unknown-pet",
    ] as const) {
      expect(stableRefusalCopy(reason).length).toBeGreaterThan(0)
    }
  })
})

describe("the empty stable", () => {
  test("the modal says so in words, never a blank panel", () => {
    expect(STABLE_EMPTY_COPY).toContain("No pets in the stable yet")
  })
})
