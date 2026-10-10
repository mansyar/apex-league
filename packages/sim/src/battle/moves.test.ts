import { describe, expect, test } from "bun:test"
import { createCreature, getSpecies } from "../index"
import {
  BASIC_MOVE,
  CATALOG,
  getMove,
  isMoveReady,
  stepCooldown,
  validateLoadout,
} from "./moves"

// Spec section 3: moves, basic strike, equip-4.

describe("battle catalog", () => {
  test("holds exactly 12 specials with unique ids", () => {
    expect(CATALOG.length).toBe(12)
    const ids = new Set(CATALOG.map((m) => m.id))
    expect(ids.size).toBe(12)
  })

  test("covers fire, plant, and water elements only", () => {
    for (const move of CATALOG) {
      expect(move.element === undefined).toBe(false)
    }
    const elements = new Set(CATALOG.map((m) => m.element))
    expect(Array.from(elements).sort()).toEqual(["fire", "plant", "water"])
  })

  test("same tier table for every element", () => {
    const tiers = [
      { power: 6, accuracy: 100, cooldown: 1 },
      { power: 8, accuracy: 90, cooldown: 1 },
      { power: 10, accuracy: 85, cooldown: 2 },
      { power: 12, accuracy: 75, cooldown: 2 },
    ]
    for (const element of ["fire", "plant", "water"] as const) {
      const rows = CATALOG.filter((m) => m.element === element)
      expect(rows.length).toBe(4)
      for (const [i, move] of rows.entries()) {
        const row = tiers[i]
        if (!row) throw new Error("tier table incomplete")
        expect([move.power, move.accuracy, move.cooldown]).toEqual([
          row.power,
          row.accuracy,
          row.cooldown,
        ])
      }
    }
  })

  test("every catalog move is a ranged special", () => {
    for (const move of CATALOG) {
      expect(move.melee).toBe(false)
    }
  })
})

describe("basic strike", () => {
  test("is innate: power 4, accuracy 100, no cooldown, typeless melee", () => {
    expect(BASIC_MOVE.power).toBe(4)
    expect(BASIC_MOVE.accuracy).toBe(100)
    expect(BASIC_MOVE.cooldown).toBe(0)
    expect(BASIC_MOVE.element).toBeUndefined()
    expect(BASIC_MOVE.melee).toBe(true)
  })

  test("is not part of the 12-slot catalog", () => {
    expect(CATALOG.find((m) => m.id === BASIC_MOVE.id)).toBeUndefined()
  })

  test("is resolvable by id", () => {
    expect(getMove(BASIC_MOVE.id)?.id).toBe(BASIC_MOVE.id)
    expect(getMove("no_such_move")).toBeUndefined()
  })
})

describe("cooldown", () => {
  // Counted in the fighter's own actions, not clock ticks. After a special
  // with cooldown N fires, the next N of that fighter's actions cannot
  // select it, and the action after that can.
  test("blocks exactly N of the fighter's own following actions", () => {
    for (const cooldown of [1, 2]) {
      // Gate before each action, step after it: the cooldown still blocks
      // each of the N actions inside the window, then action N+1 is ready.
      let remaining = cooldown
      for (let action = 1; action <= cooldown; action++) {
        expect(isMoveReady(remaining)).toBe(false)
        remaining = stepCooldown(remaining)
      }
      remaining = stepCooldown(remaining)
      expect(isMoveReady(remaining)).toBe(true)
    }
  })

  test("cooldown 0 is always ready", () => {
    expect(isMoveReady(0)).toBe(true)
    expect(stepCooldown(0)).toBe(0)
  })
})

describe("species kit", () => {
  test("each starter has the four moves of its element", () => {
    const expected = {
      fire_drake: ["spark", "flame_charge", "cinder_shot", "blaze_bolt"],
      plant_ox: ["seed_shot", "thorn_volley", "spore_burst", "bramble_dart"],
      water_axolotl: ["bubble", "tide_shot", "foam_volley", "splash_bolt"],
    }
    const drake = getSpecies("fire_drake")
    const ox = getSpecies("plant_ox")
    const axolotl = getSpecies("water_axolotl")
    if (!drake || !ox || !axolotl) throw new Error("starter species missing")
    expect(drake.kit).toEqual(expected.fire_drake)
    expect(ox.kit).toEqual(expected.plant_ox)
    expect(axolotl.kit).toEqual(expected.water_axolotl)
    for (const species of [drake, ox, axolotl]) {
      expect(species.kit.length).toBe(4)
      expect(new Set(species.kit).size).toBe(4)
      for (const id of species.kit) {
        if (!getMove(id)) throw new Error(`kit move unknown: ${id}`)
        if (getMove(id)?.element !== species.element)
          throw new Error(`kit move off-element: ${id}`)
      }
    }
  })

  test("axolotl kit exists even while the species is locked", () => {
    const axolotl = getSpecies("water_axolotl")
    if (!axolotl) throw new Error("water_axolotl species missing")
    expect(axolotl.available).toBe(false)
    expect(axolotl.kit.length).toBe(4)
  })
})

describe("species temperament", () => {
  test("each starter carries its fixed temperament", () => {
    const drake = getSpecies("fire_drake")
    const ox = getSpecies("plant_ox")
    const axolotl = getSpecies("water_axolotl")
    if (!drake || !ox || !axolotl) throw new Error("starter species missing")
    expect(drake.temperament).toBe("rush")
    expect(ox.temperament).toBe("slow")
    expect(axolotl.temperament).toBe("obedient")
  })

  test("temperament lives on species data, not on the saved creature", () => {
    const creature = createCreature("fire_drake", 7)
    expect("temperament" in creature).toBe(false)
  })
})

describe("validateLoadout", () => {
  test("accepts each starter kit", () => {
    for (const species of [
      "fire_drake",
      "plant_ox",
      "water_axolotl",
    ] as const) {
      const kit = getSpecies(species)?.kit
      if (!kit) throw new Error(`${species} species missing`)
      expect(validateLoadout(kit).map((m) => m.id)).toEqual([...kit])
    }
  })

  test("accepts two- and three-move loadouts (battle_core FR3 revision)", () => {
    expect(validateLoadout(["spark", "flame_charge"]).map((m) => m.id)).toEqual(
      ["spark", "flame_charge"],
    )
    expect(
      validateLoadout(["cinder_shot", "spark", "flame_charge"]).map(
        (m) => m.id,
      ),
    ).toEqual(["cinder_shot", "spark", "flame_charge"])
  })

  test("rejects a loadout with fewer than two or more than four moves", () => {
    expect(() => validateLoadout(["spark"])).toThrow(/two to four/)
    expect(() =>
      validateLoadout([
        "spark",
        "flame_charge",
        "cinder_shot",
        "blaze_bolt",
        "basic",
      ]),
    ).toThrow(/two to four/)
  })

  test("rejects unknown moves", () => {
    expect(() =>
      validateLoadout(["spark", "flame_charge", "cinder_shot", "nope"]),
    ).toThrow(/Unknown/)
  })

  test("rejects repeated ids", () => {
    expect(() =>
      validateLoadout(["spark", "spark", "flame_charge", "cinder_shot"]),
    ).toThrow(/repeats/)
  })
})
