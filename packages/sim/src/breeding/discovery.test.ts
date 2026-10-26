/**
 * Breeding discovery (`roster_wave_3` FR-4): the three fixed parent-element
 * recipes resolve deterministically inside the existing breeding flow, both
 * parent orders, with unlisted and same-element pairs inheriting exactly as
 * before — and no new persisted state.
 */

import { describe, expect, test } from "bun:test"
import type { Element } from "../creature"
import { GRADUATION_DAY } from "../legacy"
import type { RetiredRecord } from "../legacy/lineage"
import { SAVE_VERSION } from "../save/schema"
import {
  createMemoryAdapter,
  loadGame,
  loadSave,
  saveGame,
} from "../save/storage"
import { getSpecies } from "../species"
import { chooseStarter, createInitialState, type GameState } from "../state"
import {
  discoverySpeciesForElements,
  discoverySpeciesForParents,
  graduateWithPair,
  speciesOptions,
} from "../breeding"

/** A retired Hall record of the given species and generation. */
function record(speciesId: string, generation: number): RetiredRecord {
  const species = getSpecies(speciesId)
  if (!species) throw new Error(`species missing: ${speciesId}`)
  return {
    name: species.displayName,
    speciesId,
    archetypeId: species.archetypeId,
    element: species.element,
    affinity: null,
    stats: { hp: 90, atk: 12, def: 9, spd: 11 },
    trained: { hp: 0, atk: 0, def: 0, spd: 0 },
    cupsWon: 1,
    generation,
    retiredOnDay: 60,
    traits: [],
    parents: [],
    branch: "legacy",
    giftEgg: false,
  }
}

/**
 * A graduation-eligible champion whose Hall already holds an electric and a
 * wind retiree: the pair the first recipe fires on.
 */
function recipeState(): GameState {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const creature = owned.creature
  if (!creature) throw new Error("expected a starter creature")
  return {
    ...owned,
    day: GRADUATION_DAY,
    lineage: {
      generation: 2,
      hallOfFame: [record("electric_hound", 0), record("wind_falcon", 1)],
    },
    creature: { ...creature, stage: "champion", ageDays: GRADUATION_DAY },
  }
}

describe("discoverySpeciesForElements", () => {
  test("fires each recipe in both parent orders", () => {
    expect(discoverySpeciesForElements("electric", "wind")).toBe("voltfox")
    expect(discoverySpeciesForElements("wind", "electric")).toBe("voltfox")
    expect(discoverySpeciesForElements("wind", "water")).toBe("galeheron")
    expect(discoverySpeciesForElements("water", "wind")).toBe("galeheron")
    expect(discoverySpeciesForElements("earth", "fire")).toBe("shalemole")
    expect(discoverySpeciesForElements("fire", "earth")).toBe("shalemole")
  })

  test("same-element pairs inherit — no recipe lists a pair with itself", () => {
    for (const element of [
      "fire",
      "water",
      "plant",
      "electric",
      "earth",
      "wind",
    ] as const) {
      expect(discoverySpeciesForElements(element, element)).toBeNull()
    }
  })

  test("unlisted cross-element pairs inherit exactly as before", () => {
    const unlisted: Array<[Element, Element]> = [
      ["fire", "plant"],
      ["fire", "water"],
      ["plant", "water"],
      ["electric", "fire"],
      ["electric", "plant"],
      ["electric", "water"],
      ["electric", "earth"],
      ["wind", "fire"],
      ["wind", "plant"],
      ["wind", "earth"],
      ["earth", "water"],
      ["earth", "plant"],
    ]
    for (const [a, b] of unlisted) {
      expect(discoverySpeciesForElements(a, b), `${a}+${b}`).toBeNull()
    }
  })
})

describe("discoverySpeciesForParents", () => {
  test("reads the parents' primary elements in either order", () => {
    const hound = record("electric_hound", 0)
    const falcon = record("wind_falcon", 1)
    expect(discoverySpeciesForParents([hound, falcon])).toBe("voltfox")
    expect(discoverySpeciesForParents([falcon, hound])).toBe("voltfox")
  })

  test("returns null unless the pair is exactly two recipe records", () => {
    const hound = record("electric_hound", 0)
    const drake = record("fire_drake", 1)
    expect(discoverySpeciesForParents([hound])).toBeNull()
    expect(discoverySpeciesForParents([])).toBeNull()
    expect(discoverySpeciesForParents([hound, hound])).toBeNull()
    expect(discoverySpeciesForParents([hound, drake])).toBeNull()
  })
})

describe("speciesOptions with discovery", () => {
  test("appends the discovered line after the parents' species", () => {
    expect(
      speciesOptions([record("electric_hound", 0), record("wind_falcon", 1)]),
    ).toEqual(["electric_hound", "wind_falcon", "voltfox"])
  })

  test("an unlisted pair reads exactly the parents, as before", () => {
    expect(
      speciesOptions([record("fire_drake", 0), record("plant_ox", 1)]),
    ).toEqual(["fire_drake", "plant_ox"])
  })

  test("a same-element pair reads one chip, as before", () => {
    expect(
      speciesOptions([
        record("electric_hound", 0),
        record("electric_hound", 1),
      ]),
    ).toEqual(["electric_hound"])
  })

  test("a discovered parent breeding true needs no duplicate chip", () => {
    // Voltfox × galeheron is electric × wind again: the recipe fires, but the
    // voltfox is already listed, so the options do not change.
    expect(
      speciesOptions([record("voltfox", 2), record("galeheron", 3)]),
    ).toEqual(["voltfox", "galeheron"])
    expect(
      speciesOptions([record("galeheron", 3), record("water_axolotl", 1)]),
    ).toEqual(["galeheron", "water_axolotl"])
    expect(
      speciesOptions([record("shalemole", 2), record("fire_drake", 0)]),
    ).toEqual(["shalemole", "fire_drake"])
  })
})

describe("graduateWithPair to a discovered line", () => {
  test("an electric × wind pair graduates a voltfox", () => {
    const before = recipeState()
    const res = graduateWithPair(before, [0, 1], "voltfox", 77)
    if (!res.ok) throw new Error(`graduation failed: ${res.reason}`)
    expect(res.state.creature?.speciesId).toBe("voltfox")
    expect(res.state.creature?.element).toBe("electric")
    expect(res.state.creature?.stage).toBe("baby")
    expect(res.state.creature?.parents).toEqual([0, 1])
  })

  test("still rejects a species outside the pair's options", () => {
    const before = recipeState()
    expect(graduateWithPair(before, [0, 1], "shalemole", 1)).toEqual({
      ok: false,
      reason: "invalid-species",
    })
  })

  test("persists nothing new: the save stays at v25 and round-trips", () => {
    const before = recipeState()
    expect(SAVE_VERSION).toBe(25)
    const res = graduateWithPair(before, [0, 1], "voltfox", 77)
    if (!res.ok) throw new Error(`graduation failed: ${res.reason}`)
    // The state shape is the GameState shape — no new top-level slice.
    expect(Object.keys(res.state).sort()).toEqual(Object.keys(before).sort())
    const adapter = createMemoryAdapter()
    saveGame(adapter, res.state, 1)
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.speciesId).toBe("voltfox")
    expect(loadSave(adapter)?.version).toBe(25)
  })
})
