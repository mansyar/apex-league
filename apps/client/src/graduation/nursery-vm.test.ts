import { describe, expect, test } from "bun:test"
import {
  createBredCreature,
  effectiveTraits,
  getSpecies,
  inheritedFloorFromPair,
  type RetiredRecord,
  TRAIT_ORDER,
} from "@apex/sim"
import {
  chooseSpecies,
  createNurseryState,
  hatchEnabled,
  hatchPreview,
  parentageLabel,
  toggleParent,
  traitCopy,
} from "./nursery-vm"

const ZERO = { hp: 0, atk: 0, def: 0, spd: 0 }

function record(overrides: Partial<RetiredRecord> = {}): RetiredRecord {
  return {
    name: "Rolo",
    speciesId: "fire_drake",
    archetypeId: "draconic",
    element: "fire",
    stats: { hp: 160, atk: 24, def: 16, spd: 18 },
    trained: { ...ZERO },
    cupsWon: 1,
    generation: 0,
    retiredOnDay: 60,
    traits: ["sturdy"],
    parents: [],
    ...overrides,
    branch: overrides.branch ?? "legacy",
  }
}

const ROLO = record({})
const MOSS = record({
  name: "Moss",
  speciesId: "plant_ox",
  archetypeId: "bovine",
  element: "plant",
  stats: { hp: 180, atk: 20, def: 24, spd: 12 },
  generation: 1,
  traits: ["guarded"],
})
const TIDE = record({
  name: "Tide",
  speciesId: "water_axolotl",
  archetypeId: "axolotl",
  element: "water",
  stats: { hp: 170, atk: 26, def: 18, spd: 20 },
  generation: 2,
  traits: ["fierce"],
})

const POOL = [ROLO, MOSS, TIDE]

function names(state: { selected: RetiredRecord[] }): string[] {
  return state.selected.map((parent) => parent.name)
}

function optionIds(state: { speciesOptions: Array<{ id: string }> }): string[] {
  return state.speciesOptions.map((option) => option.id)
}

function previewRow(
  preview: ReturnType<typeof hatchPreview>,
  key: "hp" | "atk" | "def" | "spd",
) {
  if (!preview) throw new Error("expected a preview")
  const row = preview.rows.find((candidate) => candidate.key === key)
  if (!row) throw new Error(`expected a ${key} row`)
  return row
}

describe("createNurseryState — initial selection", () => {
  test("preselects the retiring champion, the last pool record", () => {
    const state = createNurseryState(POOL)
    expect(names(state)).toEqual(["Tide"])
    expect(
      state.parents
        .filter((parent) => parent.selected)
        .map((parent) => parent.record.name),
    ).toEqual(["Tide"])
    expect(optionIds(state)).toEqual([])
    expect(hatchEnabled(state)).toBe(false)
    expect(state.rejectedThird).toBe(false)
  })

  test("an empty pool has nothing selected", () => {
    const state = createNurseryState([])
    expect(state.selected).toEqual([])
    expect(state.parents).toEqual([])
    expect(hatchEnabled(state)).toBe(false)
  })
})

describe("toggleParent — two-parent selection", () => {
  test("adds parents in click order and offers both species", () => {
    const state = toggleParent(createNurseryState(POOL), 0)
    expect(names(state)).toEqual(["Tide", "Rolo"])
    expect(optionIds(state)).toEqual(["water_axolotl", "fire_drake"])
  })

  test("toggles a selected parent off", () => {
    const once = toggleParent(createNurseryState(POOL), 0)
    const twice = toggleParent(once, 0)
    expect(names(twice)).toEqual(["Tide"])
    expect(optionIds(twice)).toEqual([])
  })

  test("rejects a third parent without evicting anyone", () => {
    const pair = toggleParent(createNurseryState(POOL), 0)
    const third = toggleParent(pair, 1)
    expect(names(third)).toEqual(["Tide", "Rolo"])
    expect(third.rejectedThird).toBe(true)
    expect(hatchEnabled(third)).toBe(false)
  })

  test("an unknown generation is ignored", () => {
    const state = createNurseryState(POOL)
    expect(toggleParent(state, 99)).toEqual(state)
  })
})

describe("chooseSpecies — pair validity", () => {
  test("enables the hatch only with a pair and an offered species", () => {
    let state = toggleParent(createNurseryState(POOL), 0)
    expect(hatchEnabled(state)).toBe(false)
    state = chooseSpecies(state, "fire_drake")
    expect(state.speciesId).toBe("fire_drake")
    expect(hatchEnabled(state)).toBe(true)
  })

  test("rejects a species outside the pair's options", () => {
    const pair = toggleParent(createNurseryState(POOL), 0)
    expect(chooseSpecies(pair, "plant_ox")).toEqual(pair)
  })

  test("resets a species the new pair cannot hatch", () => {
    let state = toggleParent(createNurseryState(POOL), 0)
    state = chooseSpecies(state, "fire_drake")
    // Pair [Tide, Rolo] → drop Rolo (species kept while the pair is open),
    // then add Moss: fire is no longer offered, so the choice resets.
    state = toggleParent(state, 0)
    expect(state.speciesId).toBe("fire_drake")
    state = toggleParent(state, 1)
    expect(optionIds(state)).toEqual(["water_axolotl", "plant_ox"])
    expect(state.speciesId).toBeNull()
    expect(hatchEnabled(state)).toBe(false)
  })

  test("keeps a species that remains valid", () => {
    let state = createNurseryState(POOL)
    state = toggleParent(state, 2) // drop the retiree
    state = toggleParent(state, 0) // Rolo
    state = toggleParent(state, 1) // Moss
    state = chooseSpecies(state, "fire_drake")
    state = toggleParent(state, 1) // drop Moss
    state = toggleParent(state, 2) // add Tide → fire is still offered
    expect(optionIds(state)).toEqual(["fire_drake", "water_axolotl"])
    expect(state.speciesId).toBe("fire_drake")
    expect(hatchEnabled(state)).toBe(true)
  })
})

describe("hatchPreview — floors, values, and copy", () => {
  test("matches the real hatched creature for the same seed", () => {
    for (const seed of [1, 42, 99]) {
      const preview = hatchPreview([ROLO, MOSS], "fire_drake", seed, 3)
      const child = createBredCreature("fire_drake", seed, [ROLO, MOSS], 3)
      if (!preview) throw new Error(`expected a preview for seed ${seed}`)
      for (const row of preview.rows) {
        expect(row.value, `${seed}:${row.key}`).toBe(child.stats[row.key])
      }
    }
  })

  test("shows the guaranteed dual-parent floor per stat", () => {
    const species = getSpecies("fire_drake")
    if (!species) throw new Error("expected fire_drake")
    const traits = TRAIT_ORDER.filter((id) =>
      [ROLO, MOSS].some((parent) => effectiveTraits(parent).includes(id)),
    )
    const floor = inheritedFloorFromPair(
      ROLO.stats,
      MOSS.stats,
      species,
      3,
      traits,
    )
    const preview = hatchPreview([ROLO, MOSS], "fire_drake", 42, 3)
    if (!preview) throw new Error("expected a preview")
    for (const row of preview.rows) {
      expect(row.floor, row.key).toBe(floor[row.key])
    }
  })

  test("names the stronger parent for each stat", () => {
    const preview = hatchPreview([ROLO, MOSS], "fire_drake", 42, 3)
    expect(previewRow(preview, "hp").bestParent).toEqual({
      name: "Moss",
      value: 180,
    })
    expect(previewRow(preview, "atk").bestParent).toEqual({
      name: "Rolo",
      value: 24,
    })
    expect(previewRow(preview, "spd").bestParent).toEqual({
      name: "Rolo",
      value: 18,
    })
  })

  test("carries parent names, species, trait badges, and the mutation note", () => {
    const preview = hatchPreview([ROLO, MOSS], "fire_drake", 42, 3)
    if (!preview) throw new Error("expected a preview")
    expect(preview.parentNames).toEqual(["Rolo", "Moss"])
    expect(preview.speciesName).toBe("Ember Drake")
    expect(preview.traits.map((trait) => trait.label)).toEqual([
      "Sturdy",
      "Guarded",
    ])
    expect(preview.mutationNote).toContain("mutation")
    expect(preview.prestige).toBe(3)
  })

  test("returns null for an unknown species", () => {
    expect(hatchPreview([ROLO, MOSS], "no_such_species", 42, 3)).toBeNull()
  })

  test("returns null unless there are exactly two parents", () => {
    expect(hatchPreview([ROLO], "fire_drake", 42, 3)).toBeNull()
  })
})

describe("parentageLabel / traitCopy", () => {
  test("labels founders and one- and two-parent lineages", () => {
    expect(parentageLabel([])).toBe("Founder")
    expect(parentageLabel([0])).toBe("Child of Gen 0")
    expect(parentageLabel([1, 0])).toBe("Child of Gen 0 × Gen 1")
  })

  test("looks up trait copy and falls back for unknown ids", () => {
    expect(traitCopy("sturdy")).toMatchObject({
      label: "Sturdy",
    })
    expect(traitCopy("sturdy").description.length).toBeGreaterThan(0)
    expect(traitCopy("not_a_trait")).toEqual({
      label: "Unknown trait",
      description: "",
    })
  })
})
