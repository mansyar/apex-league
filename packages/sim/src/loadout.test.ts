/**
 * Loadout state: the kit slice unlocked by trained days, the default loadout,
 * and the pure set/clear helpers over GameState.
 */

import { describe, expect, test } from "bun:test"
import {
  type Creature,
  chooseStarter,
  clearLoadout,
  createCreature,
  createInitialState,
  defaultLoadout,
  type GameState,
  getSpecies,
  knownMoves,
  MOVE_TIER3_DAYS,
  MOVE_TIER4_DAYS,
  requiredTierDays,
  type SpeciesDef,
  setLoadout,
  unlockedKit,
} from "./index"

/** Day-1 state with an owned creature carrying hand-set training fields. */
function stateWith(fields: Partial<Pick<Creature, "trainingDays">>): GameState {
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

  test("the two wider-pool indices cost the tier-4 gate at every stage", () => {
    for (const stage of ["baby", "juvenile", "champion"] as const) {
      expect(requiredTierDays(3, stage)).toBe(6)
      expect(requiredTierDays(4, stage)).toBe(6)
      expect(requiredTierDays(5, stage)).toBe(6)
    }
    // Index 2 keeps its stage exemption: evolution teaches it outright.
    expect(requiredTierDays(2, "baby")).toBe(3)
    expect(requiredTierDays(2, "juvenile")).toBe(0)
  })
})

describe("unlockedKit", () => {
  test("0-2 trained days unlock tiers 1-2 for every species", () => {
    for (const days of [0, 1, 2]) {
      for (const id of ["fire_drake", "plant_ox", "water_axolotl"]) {
        const species = speciesOf(id)
        const creature: Creature = {
          ...createCreature("fire_drake", 5),
          trainingDays: days,
        }
        expect(unlockedKit(creature, species)).toEqual(species.kit.slice(0, 2))
      }
    }
  })

  test("3-5 trained days unlock tier 3", () => {
    for (const days of [3, 4, 5]) {
      const species = speciesOf("fire_drake")
      const creature: Creature = {
        ...createCreature("fire_drake", 5),
        trainingDays: days,
      }
      expect(unlockedKit(creature, species)).toEqual(species.kit.slice(0, 3))
    }
  })

  test("6+ trained days unlock the full six-move kit", () => {
    for (const days of [6, 9]) {
      for (const id of ["fire_drake", "plant_ox", "water_axolotl"]) {
        const species = speciesOf(id)
        const creature: Creature = {
          ...createCreature("fire_drake", 5),
          trainingDays: days,
        }
        expect(unlockedKit(creature, species)).toEqual([...species.kit])
        expect(unlockedKit(creature, species).length).toBe(6)
      }
    }
  })

  test("evolution alone teaches the third move, never the wider pool", () => {
    const species = speciesOf("fire_drake")
    const juvenile: Creature = {
      ...createCreature("fire_drake", 5),
      stage: "juvenile",
      trainingDays: 0,
    }
    expect(unlockedKit(juvenile, species)).toEqual(species.kit.slice(0, 3))
    expect(
      unlockedKit({ ...juvenile, stage: "champion" }, species).length,
    ).toBe(3)
  })

  test("knownMoves is the same slice under the new name", () => {
    const species = speciesOf("plant_ox")
    for (const days of [0, 3, 6]) {
      const creature: Creature = {
        ...createCreature("plant_ox", 5),
        trainingDays: days,
      }
      expect(knownMoves(creature, species)).toEqual(
        unlockedKit(creature, species),
      )
    }
  })

  test("the slice is derived state — no seed, same inputs same slice", () => {
    const species = speciesOf("plant_ox")
    const a = unlockedKit({ trainingDays: 3 } as Creature, species)
    const b = unlockedKit({ trainingDays: 3 } as Creature, species)
    expect(a).toEqual(b)
    expect(a).toEqual(species.kit.slice(0, 3))
  })

  test("defaultLoadout returns the first four known moves", () => {
    const species = speciesOf("plant_ox")
    const juvenile = createCreature("plant_ox", 5)
    expect(defaultLoadout(juvenile, species)).toEqual(species.kit.slice(0, 2))
    const threeDays: Creature = { ...juvenile, trainingDays: 3 }
    expect(defaultLoadout(threeDays, species)).toEqual(species.kit.slice(0, 3))
    // Six known moves, but the default kit is still today's four: a save with
    // a null loadout must fight exactly the battle it fought before the pool
    // widened.
    const sixDays: Creature = { ...juvenile, trainingDays: 6 }
    expect(knownMoves(sixDays, species).length).toBe(6)
    expect(defaultLoadout(sixDays, species)).toEqual(species.kit.slice(0, 4))
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
    expect(
      setLoadout(three, ["spark", "cinder_shot", "flame_charge"]).creature
        ?.loadout,
    ).toEqual(["spark", "cinder_shot", "flame_charge"])
    const four = stateWith({ trainingDays: 6 })
    expect(
      setLoadout(four, ["blaze_bolt", "cinder_shot", "flame_charge", "spark"])
        .creature?.loadout,
    ).toEqual(["blaze_bolt", "cinder_shot", "flame_charge", "spark"])
  })

  test("equips a wider-pool move once six trained days are in", () => {
    const s = stateWith({ trainingDays: 6 })
    expect(
      setLoadout(s, ["flare_dart", "pyre_lance", "spark", "blaze_bolt"])
        .creature?.loadout,
    ).toEqual(["flare_dart", "pyre_lance", "spark", "blaze_bolt"])
  })

  test("refuses a wider-pool move at five trained days", () => {
    const s = stateWith({ trainingDays: 5 })
    expect(() => setLoadout(s, ["spark", "flare_dart"])).toThrow(
      "Not unlocked yet: flare_dart. Train 1 more days.",
    )
  })

  test("a pre-pool four-move loadout is still legal", () => {
    const s = stateWith({ trainingDays: 6 })
    expect(
      setLoadout(s, ["spark", "flame_charge", "cinder_shot", "blaze_bolt"])
        .creature?.loadout,
    ).toEqual(["spark", "flame_charge", "cinder_shot", "blaze_bolt"])
  })

  test("rejects an unknown move", () => {
    const s = stateWith({ trainingDays: 6 })
    expect(() => setLoadout(s, ["spark", "nope"])).toThrow("Unknown move: nope")
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
      "Not unlocked yet: cinder_shot. Train 2 more days.",
    )
  })

  test("rejects sizes outside 2-4", () => {
    const s = stateWith({ trainingDays: 6 })
    expect(() => setLoadout(s, ["spark"])).toThrow(
      "A loadout needs two to four moves",
    )
    expect(() =>
      setLoadout(s, [
        "spark",
        "flame_charge",
        "cinder_shot",
        "blaze_bolt",
        "seed_shot",
      ]),
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
