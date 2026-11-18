/**
 * Breeding discovery (`roster_wave_3` FR-4, `roster_wave_4` FR-3): the six
 * fixed parent-element recipes resolve deterministically inside the existing
 * breeding flow, both parent orders, with unlisted and same-element pairs
 * inheriting exactly as before — and no new persisted state.
 */

import { describe, expect, test } from "bun:test"
import {
  discoverySpeciesForElements,
  discoverySpeciesForParents,
  graduateWithPair,
  speciesOptions,
} from "../breeding"
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
    expect(discoverySpeciesForElements("fire", "plant")).toBe("embercub")
    expect(discoverySpeciesForElements("plant", "fire")).toBe("embercub")
    expect(discoverySpeciesForElements("plant", "water")).toBe("mossboar")
    expect(discoverySpeciesForElements("water", "plant")).toBe("mossboar")
    expect(discoverySpeciesForElements("fire", "water")).toBe("mistkit")
    expect(discoverySpeciesForElements("water", "fire")).toBe("mistkit")
    expect(discoverySpeciesForElements("earth", "wind")).toBe("dune_jerboa")
    expect(discoverySpeciesForElements("wind", "earth")).toBe("dune_jerboa")
    expect(discoverySpeciesForElements("fire", "electric")).toBe("spark_ray")
    expect(discoverySpeciesForElements("electric", "fire")).toBe("spark_ray")
    expect(discoverySpeciesForElements("plant", "wind")).toBe("gale_moth")
    expect(discoverySpeciesForElements("wind", "plant")).toBe("gale_moth")
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
    // earth+wind, fire+electric and plant+wind are listed this wave, so they
    // are deliberately absent here; every pair below still inherits.
    const unlisted: Array<[Element, Element]> = [
      ["electric", "plant"],
      ["electric", "water"],
      ["electric", "earth"],
      ["wind", "fire"],
      ["earth", "water"],
      ["earth", "plant"],
    ]
    for (const [a, b] of unlisted) {
      expect(discoverySpeciesForElements(a, b), `${a}+${b}`).toBeNull()
    }
  })

  test("no two recipes share an order-independent key", () => {
    // A key collision would silently overwrite one line in RECIPE_INDEX. The
    // nine parent pairs must stay distinct once sorted.
    const pairs: Array<[Element, Element]> = [
      ["electric", "wind"],
      ["wind", "water"],
      ["earth", "fire"],
      ["fire", "plant"],
      ["plant", "water"],
      ["fire", "water"],
      ["earth", "wind"],
      ["fire", "electric"],
      ["plant", "wind"],
    ]
    const keys = pairs.map(([a, b]) => [a, b].sort().join("+"))
    expect(new Set(keys).size).toBe(keys.length)
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
    expect(discoverySpeciesForParents([hound])).toBeNull()
    expect(discoverySpeciesForParents([])).toBeNull()
    expect(discoverySpeciesForParents([hound, hound])).toBeNull()
    // electric + water is unlisted, unlike electric + fire (spark_ray).
    expect(
      discoverySpeciesForParents([hound, record("water_axolotl", 1)]),
    ).toBeNull()
  })
})

describe("speciesOptions with discovery", () => {
  test("appends the discovered line after the parents' species", () => {
    expect(
      speciesOptions([record("electric_hound", 0), record("wind_falcon", 1)]),
    ).toEqual(["electric_hound", "wind_falcon", "voltfox"])
  })

  test("an unlisted pair reads exactly the parents, as before", () => {
    // electric + water has no recipe; electric + fire now discovers spark_ray.
    expect(
      speciesOptions([record("electric_hound", 0), record("water_axolotl", 1)]),
    ).toEqual(["electric_hound", "water_axolotl"])
  })

  test("each fire-triangle recipe appends its line after the parents", () => {
    expect(
      speciesOptions([record("fire_drake", 0), record("plant_ox", 1)]),
    ).toEqual(["fire_drake", "plant_ox", "embercub"])
    expect(
      speciesOptions([record("plant_ox", 1), record("fire_drake", 0)]),
    ).toEqual(["plant_ox", "fire_drake", "embercub"])
    expect(
      speciesOptions([record("plant_ox", 0), record("water_axolotl", 1)]),
    ).toEqual(["plant_ox", "water_axolotl", "mossboar"])
    expect(
      speciesOptions([record("fire_drake", 0), record("water_axolotl", 1)]),
    ).toEqual(["fire_drake", "water_axolotl", "mistkit"])
  })

  test("each new recipe appends its line after the parents, in either order", () => {
    const cases: Array<[string, string, string]> = [
      ["earth_tortoise", "wind_falcon", "dune_jerboa"],
      ["wind_falcon", "earth_tortoise", "dune_jerboa"],
      ["electric_hound", "fire_drake", "spark_ray"],
      ["fire_drake", "electric_hound", "spark_ray"],
      ["plant_ox", "wind_falcon", "gale_moth"],
      ["wind_falcon", "plant_ox", "gale_moth"],
    ]
    for (const [a, b, discovered] of cases) {
      expect(speciesOptions([record(a, 3), record(b, 4)])).toEqual([
        a,
        b,
        discovered,
      ])
    }
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
    // A fire-triangle line breeding true: embercub × plant_ox is fire ×
    // plant again, so the recipe fires but the embercub is already listed.
    expect(
      speciesOptions([record("embercub", 2), record("plant_ox", 0)]),
    ).toEqual(["embercub", "plant_ox"])
    expect(
      speciesOptions([record("mossboar", 2), record("water_axolotl", 0)]),
    ).toEqual(["mossboar", "water_axolotl"])
    expect(
      speciesOptions([record("mistkit", 2), record("fire_drake", 0)]),
    ).toEqual(["mistkit", "fire_drake"])
    // This wave's lines breeding true: the recipe still fires, but the
    // discovered parent is already an option, so no duplicate appears.
    expect(
      speciesOptions([record("dune_jerboa", 2), record("wind_falcon", 0)]),
    ).toEqual(["dune_jerboa", "wind_falcon"])
    expect(
      speciesOptions([record("spark_ray", 2), record("fire_drake", 0)]),
    ).toEqual(["spark_ray", "fire_drake"])
    expect(
      speciesOptions([record("gale_moth", 2), record("plant_ox", 0)]),
    ).toEqual(["gale_moth", "plant_ox"])
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

  test("a fire × plant pair graduates an embercub", () => {
    const owned = chooseStarter(createInitialState(), "fire_drake", 42)
    const creature = owned.creature
    if (!creature) throw new Error("expected a starter creature")
    const before: GameState = {
      ...owned,
      day: GRADUATION_DAY,
      lineage: {
        generation: 2,
        hallOfFame: [record("fire_drake", 0), record("plant_ox", 1)],
      },
      creature: { ...creature, stage: "champion", ageDays: GRADUATION_DAY },
    }
    const res = graduateWithPair(before, [0, 1], "embercub", 77)
    if (!res.ok) throw new Error(`graduation failed: ${res.reason}`)
    expect(res.state.creature?.speciesId).toBe("embercub")
    expect(res.state.creature?.element).toBe("fire")
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
    expect(SAVE_VERSION).toBe(26)
    const res = graduateWithPair(before, [0, 1], "voltfox", 77)
    if (!res.ok) throw new Error(`graduation failed: ${res.reason}`)
    // The state shape is the GameState shape — no new top-level slice.
    expect(Object.keys(res.state).sort()).toEqual(Object.keys(before).sort())
    const adapter = createMemoryAdapter()
    saveGame(adapter, res.state, 1)
    const loaded = loadGame(adapter)
    expect(loaded?.creature?.speciesId).toBe("voltfox")
    expect(loadSave(adapter)?.version).toBe(26)
  })
})
