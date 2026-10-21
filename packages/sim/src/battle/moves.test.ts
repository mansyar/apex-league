import { describe, expect, test } from "bun:test"
import type { Creature } from "../creature"
import { createCreature, getSpecies } from "../index"
import { defaultLoadout, knownMoves } from "../loadout"
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
  test("holds exactly 32 specials with unique ids", () => {
    expect(CATALOG.length).toBe(32)
    const ids = new Set(CATALOG.map((m) => m.id))
    expect(ids.size).toBe(32)
  })

  test("covers fire, plant, water, and electric elements only", () => {
    for (const move of CATALOG) {
      expect(move.element === undefined).toBe(false)
    }
    const elements = new Set(CATALOG.map((m) => m.element))
    expect(Array.from(elements).sort()).toEqual([
      "electric",
      "fire",
      "plant",
      "water",
    ])
  })

  test("same six-row tier table for every element", () => {
    const tiers = [
      { power: 6, accuracy: 100, cooldown: 1 },
      { power: 8, accuracy: 90, cooldown: 1 },
      { power: 10, accuracy: 85, cooldown: 2 },
      { power: 12, accuracy: 75, cooldown: 2 },
      { power: 7, accuracy: 95, cooldown: 1 },
      { power: 14, accuracy: 70, cooldown: 3 },
    ]
    for (const element of ["fire", "plant", "water", "electric"] as const) {
      const rows = CATALOG.filter((m) => m.element === element).slice(0, 6)
      expect(rows.length).toBe(6)
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

  test("the four original rows keep their ids, numbers, and indices", () => {
    const original = [
      "spark",
      "flame_charge",
      "cinder_shot",
      "blaze_bolt",
      "seed_shot",
      "thorn_volley",
      "spore_burst",
      "bramble_dart",
      "bubble",
      "tide_shot",
      "foam_volley",
      "splash_bolt",
    ]
    const numbers: Readonly<Record<string, readonly [number, number, number]>> =
      {
        spark: [6, 100, 1],
        flame_charge: [8, 90, 1],
        cinder_shot: [10, 85, 2],
        blaze_bolt: [12, 75, 2],
        seed_shot: [6, 100, 1],
        thorn_volley: [8, 90, 1],
        spore_burst: [10, 85, 2],
        bramble_dart: [12, 75, 2],
        bubble: [6, 100, 1],
        tide_shot: [8, 90, 1],
        foam_volley: [10, 85, 2],
        splash_bolt: [12, 75, 2],
      }
    for (const id of original) {
      const move = CATALOG.find((m) => m.id === id)
      if (!move) throw new Error(`original move missing: ${id}`)
      const expected = numbers[id]
      if (!expected) throw new Error(`no numbers recorded for ${id}`)
      expect([move.power, move.accuracy, move.cooldown]).toEqual([...expected])
    }
    // The new rows are appended, so the first four of every element are the
    // untouched originals in their original order.
    const originals: Readonly<Record<string, readonly string[]>> = {
      fire: original.slice(0, 4),
      plant: original.slice(4, 8),
      water: original.slice(8, 12),
    }
    for (const element of ["fire", "plant", "water"] as const) {
      const rows = CATALOG.filter((m) => m.element === element).map((m) => m.id)
      const expectedOriginal = originals[element]
      if (!expectedOriginal) throw new Error(`no originals for ${element}`)
      expect(rows.slice(0, 4)).toEqual([...expectedOriginal])
    }
  })

  test("the original 18 keep their order as the catalog prefix", () => {
    const prefix = [
      "spark",
      "flame_charge",
      "cinder_shot",
      "blaze_bolt",
      "flare_dart",
      "pyre_lance",
      "seed_shot",
      "thorn_volley",
      "spore_burst",
      "bramble_dart",
      "vine_lash",
      "root_quake",
      "bubble",
      "tide_shot",
      "foam_volley",
      "splash_bolt",
      "mist_spray",
      "maelstrom",
    ]
    expect(CATALOG.slice(0, prefix.length).map((m) => m.id)).toEqual(prefix)
    expect(CATALOG.slice(prefix.length).map((m) => m.id)).toEqual([
      "cinder_dive",
      "pyre_wall",
      "thorn_charge",
      "bramble_guard",
      "riptide_rush",
      "tide_aegis",
      "static_jolt",
      "volt_dash",
      "arc_shot",
      "storm_bolt",
      "ion_dart",
      "gigavolt",
      "storm_surge",
      "ion_wall",
    ])
  })

  test("branch signatures pair a heavy and a reliable row of equal expected damage", () => {
    const pairs = [
      ["cinder_dive", "pyre_wall"],
      ["thorn_charge", "bramble_guard"],
      ["riptide_rush", "tide_aegis"],
      ["storm_surge", "ion_wall"],
    ] as const
    for (const [offenseId, defenseId] of pairs) {
      const offense = getMove(offenseId)
      const defense = getMove(defenseId)
      if (!offense || !defense)
        throw new Error(`signature missing: ${offenseId}`)
      expect([offense.power, offense.accuracy, offense.cooldown]).toEqual([
        12, 75, 2,
      ])
      expect([defense.power, defense.accuracy, defense.cooldown]).toEqual([
        9, 100, 2,
      ])
      expect(offense.element).toBe(defense.element)
      expect((offense.power * offense.accuracy) / 100).toBe(
        (defense.power * defense.accuracy) / 100,
      )
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

  test("is not part of the 18-slot catalog", () => {
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
  test("each starter has the six moves of its element", () => {
    const expected = {
      fire_drake: [
        "spark",
        "flame_charge",
        "cinder_shot",
        "blaze_bolt",
        "flare_dart",
        "pyre_lance",
      ],
      plant_ox: [
        "seed_shot",
        "thorn_volley",
        "spore_burst",
        "bramble_dart",
        "vine_lash",
        "root_quake",
      ],
      water_axolotl: [
        "bubble",
        "tide_shot",
        "foam_volley",
        "splash_bolt",
        "mist_spray",
        "maelstrom",
      ],
    }
    const drake = getSpecies("fire_drake")
    const ox = getSpecies("plant_ox")
    const axolotl = getSpecies("water_axolotl")
    if (!drake || !ox || !axolotl) throw new Error("starter species missing")
    expect(drake.kit).toEqual(expected.fire_drake)
    expect(ox.kit).toEqual(expected.plant_ox)
    expect(axolotl.kit).toEqual(expected.water_axolotl)
    for (const species of [drake, ox, axolotl]) {
      expect(species.kit.length).toBe(6)
      expect(new Set(species.kit).size).toBe(6)
      for (const id of species.kit) {
        if (!getMove(id)) throw new Error(`kit move unknown: ${id}`)
        if (getMove(id)?.element !== species.element)
          throw new Error(`kit move off-element: ${id}`)
      }
    }
  })

  test("axolotl kit is complete now that the species is unlocked", () => {
    const axolotl = getSpecies("water_axolotl")
    if (!axolotl) throw new Error("water_axolotl species missing")
    expect(axolotl.available).toBe(true)
    expect(axolotl.kit.length).toBe(6)
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
      expect(validateLoadout(kit.slice(0, 4)).map((m) => m.id)).toEqual(
        kit.slice(0, 4),
      )
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

describe("electric kit (electric_species_line)", () => {
  const HOUND_KIT = [
    "static_jolt",
    "volt_dash",
    "arc_shot",
    "storm_bolt",
    "ion_dart",
    "gigavolt",
  ] as const

  /** The universal tier table, pinned for the electric rows too. */
  const TIERS: Readonly<Record<string, readonly [number, number, number]>> = {
    static_jolt: [6, 100, 1],
    volt_dash: [8, 90, 1],
    arc_shot: [10, 85, 2],
    storm_bolt: [12, 75, 2],
    ion_dart: [7, 95, 1],
    gigavolt: [14, 70, 3],
  }

  /** A minimal creature pick for the learn/equip helpers. */
  function pick(
    trainingDays: number,
    stage: Creature["stage"],
    branch: string | null,
  ): Pick<Creature, "trainingDays" | "stage" | "branch"> {
    return { trainingDays, stage, branch }
  }

  function hound() {
    const species = getSpecies("electric_hound")
    if (!species) throw new Error("electric_hound species missing")
    return species
  }

  test("the hound's kit is the six electric kit rows in tier order", () => {
    const species = hound()
    expect(species.kit).toEqual([...HOUND_KIT])
    for (const id of HOUND_KIT) {
      const move = getMove(id)
      if (!move) throw new Error(`kit move unknown: ${id}`)
      expect(move.element).toBe("electric")
      const tier = TIERS[id]
      if (!tier) throw new Error(`no tier recorded for ${id}`)
      expect([move.power, move.accuracy, move.cooldown]).toEqual([...tier])
    }
  })

  test("birth kit: a newborn knows exactly two moves", () => {
    expect(knownMoves(pick(0, "baby", null), hound())).toEqual(
      HOUND_KIT.slice(0, 2),
    )
  })

  test("three trained days unlock the third kit row", () => {
    expect(knownMoves(pick(3, "baby", null), hound())).toEqual(
      HOUND_KIT.slice(0, 3),
    )
  })

  test("evolving unlocks the third row and the signature at any training count", () => {
    expect(knownMoves(pick(0, "juvenile", "storm_courser"), hound())).toEqual([
      ...HOUND_KIT.slice(0, 3),
      "storm_surge",
    ])
  })

  test("six trained days open the full pool", () => {
    expect(knownMoves(pick(6, "baby", null), hound())).toEqual([...HOUND_KIT])
  })

  test("a trained branch adds its signature after the pool opens", () => {
    expect(knownMoves(pick(6, "juvenile", "storm_courser"), hound())).toEqual([
      ...HOUND_KIT,
      "storm_surge",
    ])
    expect(knownMoves(pick(6, "juvenile", "tempest_warden"), hound())).toEqual([
      ...HOUND_KIT,
      "ion_wall",
    ])
  })

  test("the default loadout fields four kit moves, never the signature", () => {
    expect(
      defaultLoadout(pick(6, "juvenile", "storm_courser"), hound()),
    ).toEqual(HOUND_KIT.slice(0, 4))
  })

  test("equip-4: the first four kit moves validate; five do not", () => {
    expect(validateLoadout(HOUND_KIT.slice(0, 4)).map((m) => m.id)).toEqual(
      HOUND_KIT.slice(0, 4),
    )
    expect(() => validateLoadout([...HOUND_KIT])).toThrow(/two to four/)
  })

  test("the branch signature is equippable once learned", () => {
    expect(
      validateLoadout([...HOUND_KIT.slice(0, 3), "storm_surge"]).map(
        (m) => m.id,
      ),
    ).toEqual([...HOUND_KIT.slice(0, 3), "storm_surge"])
  })

  test("a sibling signature is never known", () => {
    expect(
      knownMoves(pick(6, "juvenile", "storm_courser"), hound()),
    ).not.toContain("ion_wall")
  })
})
