/**
 * Loadout state: the kit slice unlocked by trained days, the default loadout,
 * and the pure set/clear helpers over GameState.
 */

import {
  chooseStarter,
  createCreature,
  createInitialState,
  type Creature,
  type GameState,
  getSpecies,
  type SpeciesDef,
} from "./index"
import {
  clearLoadout,
  defaultLoadout,
  MOVE_TIER3_DAYS,
  MOVE_TIER4_DAYS,
  setLoadout,
  unlockedKit,
} from "./index"

/** Day-1 state with an owned creature carrying hand-set training fields. */
function stateWith(
  fields: Partial<Pick<Creature, "trainingDays">>,
): GameState {
  const s = chooseStarter(createInitialState(), "fire_drake", 42)
  if (!s.creature) throw new Error("starter not created")
  return { ...s, creature: { ...s.creature, ...fields } }
}

/** Every species (including locked ones) for slicing coverage. */
function speciesOf(id: string): SpeciesDef {
  const species = getSpecies(id)
  if (!species) throw new Error(`Unknown species: ${id}`)
  return species
}

describe("unlock gate constants", () => {
  test("tier 3 opens at 3 trained days, tier 4 at 6", () => {
    expect(MOVE_TIER3_DAYS).toBe(3)
    expect(MOVE_TIER4_DAYS).toBe(6)
  })
})

describe("unlockedKit", () => {
  test("0-2 trained days unlock tiers 1-2 for every species", () => {
    for (const days of [0, 1, 2]) {
      for (const id of ["fire_drake", "plant_ox", "water_axolotl"]) {
        const species = speciesOf(id)
        const creature: Creature = {
          ...createCreature(id, 5),
          trainingDays: days,
        }
        expect(unlockedKit(creature, species)).toEqual(species.kit.slice(0, 2))
      }
    }
  })

  test("3-5 trained days unlock tier 3", () => {
    for (const days of [3, 4, 5]) {
      const species = speciesOf("fire_drake")
      const creature: Creature = { ...createCreature("fire_drake", 5), trainingDays: days }
      expect(unlockedKit(creature, species)).toEqual(species.kit.slice(0, 3))
    }
  })

  test("6+ trained days unlock the full kit", () => {
    for (const days of [6, 9]) {
      for (const id of ["fire_drake", "plant_ox", "water_axolotl"]) {
        const species = speciesOf(id)
        const creature: Creature = { ...createCreature(id, 5), trainingDays: days }
        expect(unlockedKit(creature, species)).toEqual([...species.kit])
      }
    }
  })

  test("the slice is derived state — no seed, same inputs same slice", () => {
    const species = speciesOf("plant_ox")
    const a = unlockedKit({ trainingDays: 3 } as Creature, species)
    const b = unlockedKit({ trainingDays: 3 } as Creature, species)
    expect(a).toEqual(b)
    expect(a).toEqual(species.kit.slice(0, 3))
  })

  test("defaultLoadout returns the unlocked slice", () => {
    const creature = createCreature("plant_ox", 5)
    expect(defaultLoadout(creature, speciesOf("plant_ox"))).toEqual(
      unlockedKit(creature, speciesOf("plant_ox")),
    )
  })
})

describe("setLoadout", () => {
  test("stores two unlocked moves in any order", () => {
    const s = stateWith({ trainingDays: 0 })
    const r = setLoadout(s, ["flame_charge", "spark"])
    expect(r.creature?.loadout).toEqual(["flame_charge", "spark"])
  })

  test("stores three and four unlocked moves at higher gates", () => {
    const three = stateWith({ trainingDays: 3 })
    expect(setLoadout(three, ["spark", "cinder_shot", "flame_charge"]).creature?.loadout).toEqual([
      "spark",
      "cinder_shot",
      "flame_charge",
    ])
    const four = stateWith({ trainingDays: 6 })
    expect(
      setLoadout(four, [
        "blaze_bolt",
        "cinder_shot",
        "flame_charge",
        "spark",
      ]).creature?.loadout,
    ).toEqual(["blaze_bolt", "cinder_shot", "flame_charge", "spark"])
  })

  test("rejects an unknown move", () => {
    const s = stateWith({ trainingDays: 6 })
    expect(() => setLoadout(s, ["spark", "nope"])).toThrow(
      "Unknown move: nope",
    )
  })

  test("rejects a repeated move", () => {
    const s = stateWith({ trainingDays: 6 })
    expect(() => setLoadout(s, ["spark", "spark"])).toThrow(
      "This loadout repeats a move",
    )
  })

  test("rejects a locked move with days-remaining flavor", () => {
    const s = stateWith({ trainingDays: 1 })
    expect(() => setLoadout(s, ["spark", "cinder_shot"])).toThrow(
      "Not unlocked yet: cinder_shot. Train more days.",
    )
  })

  test("rejects sizes outside 2-4", () => {
    const s = stateWith({ trainingDays: 6 })
    expect(() => setLoadout(s, ["spark"])).toThrow(
      "A loadout needs two to four moves",
    )
    expect(() =>
      setLoadout(s, ["spark", "flame_charge", "cinder_shot", "blaze_bolt", "seed_shot"]),
    ).toThrow("A loadout needs two to four moves")
  })

  test("rejects the innate basic strike", () => {
    const s = stateWith({ trainingDays: 6 })
    expect(() => setLoadout(s, ["basic", "spark"])).toThrow(
      "The basic strike is innate and cannot be equipped",
    )
  })

  test("success is pure — does not mutate the input state", () => {
    const s = stateWith({ trainingDays: 6 })
    const snapshot = structuredClone(s)
    setLoadout(s, ["spark", "flame_charge"])
    expect(s).toEqual(snapshot)
  })
})

describe("clearLoadout", () => {
  test("restores the null (default slicing) loadout", () => {
    const chosen = stateWith({ trainingDays: 6 })
    const stored = setLoadout(chosen, ["spark", "blaze_bolt", "cinder_shot"])
    expect(stored.creature?.loadout).not.toBeNull()
    const cleared = clearLoadout(stored)
    expect(cleared.creature?.loadout).toBeNull()
  })

  test("clearing is pure — does not mutate the input state", () => {
    const s = stateWith({ trainingDays: 0 })
    const snapshot = structuredClone(s)
    clearLoadout(s)
    expect(s).toEqual(snapshot)
  })
})
