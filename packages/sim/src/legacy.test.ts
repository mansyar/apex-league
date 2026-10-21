/**
 * Legacy & Breeding tests — Task 1: the lineage slice and the prestige model.
 * Task 2: the graduation eligibility gate. Table-driven per the workflow
 * (success + failure cases).
 */

import { describe, expect, it } from "bun:test"
import { graduateWithPair, inheritedFloorFromPair } from "./breeding"
import { type CreatureStats, effectiveStats } from "./creature"
import {
  canGraduate,
  createInheritedCreature,
  GRADUATION_DAY,
  GRADUATION_HINT_DAY,
  graduate,
  INHERITANCE_FRACTION,
  inheritedFloor,
  initialLineage,
  lineagePerks,
  lineagePrestige,
  PRESTIGE_CHAMPION_STABLE,
  PRESTIGE_ESTABLISHED_LINE,
  PRESTIGE_FOUNDED,
  PRESTIGE_REFINED_BLOOD,
  PRESTIGE_WARM_BLOODLINE,
  WARM_BOND_START,
} from "./legacy"
import { getSpecies, type SpeciesDef } from "./species"
import {
  ACTION_POINTS_PER_DAY,
  chooseStarter,
  createInitialState,
  type GameState,
} from "./state"
import { dedupeTraits, effectiveTraits } from "./traits"

type Stage = "baby" | "juvenile" | "champion"

/** A single-creature state at a chosen stage/day/phase. */
function stateWith(
  stage: Stage,
  day: number,
  phase: "day" | "cup" = "day",
): GameState {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const creature = owned.creature
  if (!creature) throw new Error("expected a starter creature")
  return { ...owned, day, phase, creature: { ...creature, stage } }
}

describe("initialLineage", () => {
  it("starts a bloodline at generation 0 with an empty Hall of Fame", () => {
    expect(initialLineage()).toEqual({ generation: 0, hallOfFame: [] })
  })

  it("is part of the fresh GameState", () => {
    expect(createInitialState().lineage).toEqual({
      generation: 0,
      hallOfFame: [],
    })
  })
})

describe("lineagePrestige", () => {
  it("is 0 for a fresh save", () => {
    expect(lineagePrestige(createInitialState())).toBe(0)
  })

  it("sums completed generations and lifetime cup wins", () => {
    const s = createInitialState()
    const withLineage = {
      ...s,
      lineage: { ...s.lineage, generation: 4 },
      cupsWon: 3,
    }
    expect(lineagePrestige(withLineage)).toBe(7)
  })
})

describe("lineagePerks — milestone table", () => {
  it("exposes the pinned refined-blood and champion-stable milestones", () => {
    expect(PRESTIGE_REFINED_BLOOD).toBe(7)
    expect(PRESTIGE_CHAMPION_STABLE).toBe(9)
  })

  it("never collides with the older milestones", () => {
    const milestones = [
      PRESTIGE_FOUNDED,
      PRESTIGE_WARM_BLOODLINE,
      PRESTIGE_ESTABLISHED_LINE,
      PRESTIGE_REFINED_BLOOD,
      PRESTIGE_CHAMPION_STABLE,
    ]
    expect(new Set(milestones).size).toBe(milestones.length)
  })

  it("unlocks nothing below the founded threshold", () => {
    expect(lineagePerks(0)).toEqual({
      founded: false,
      warmBloodline: false,
      establishedLine: false,
      refinedBlood: false,
      championStable: false,
    })
  })

  it("unlocks founded at the founded milestone", () => {
    expect(lineagePerks(PRESTIGE_FOUNDED)).toEqual({
      founded: true,
      warmBloodline: false,
      establishedLine: false,
      refinedBlood: false,
      championStable: false,
    })
  })

  it("unlocks warm bloodline at its milestone", () => {
    expect(lineagePerks(PRESTIGE_WARM_BLOODLINE)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: false,
      refinedBlood: false,
      championStable: false,
    })
  })

  it("unlocks established line at its milestone", () => {
    expect(lineagePerks(PRESTIGE_ESTABLISHED_LINE)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: true,
      refinedBlood: false,
      championStable: false,
    })
  })

  it("keeps every lower perk below refined blood", () => {
    expect(lineagePerks(PRESTIGE_REFINED_BLOOD - 1)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: true,
      refinedBlood: false,
      championStable: false,
    })
  })

  it("unlocks refined blood at its milestone — without champion stable", () => {
    expect(lineagePerks(PRESTIGE_REFINED_BLOOD)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: true,
      refinedBlood: true,
      championStable: false,
    })
  })

  it("keeps refined blood below champion stable", () => {
    expect(lineagePerks(PRESTIGE_CHAMPION_STABLE - 1)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: true,
      refinedBlood: true,
      championStable: false,
    })
  })

  it("unlocks champion stable at its milestone", () => {
    expect(lineagePerks(PRESTIGE_CHAMPION_STABLE)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: true,
      refinedBlood: true,
      championStable: true,
    })
  })

  it("keeps every lower perk at a high prestige", () => {
    expect(lineagePerks(12)).toEqual({
      founded: true,
      warmBloodline: true,
      establishedLine: true,
      refinedBlood: true,
      championStable: true,
    })
  })
})

describe("canGraduate — eligibility gate", () => {
  it("exposes the pinned day constants", () => {
    expect(GRADUATION_DAY).toBe(60)
    expect(GRADUATION_HINT_DAY).toBe(55)
  })

  it("rejects a save with no creature", () => {
    expect(canGraduate(createInitialState())).toEqual({
      eligible: false,
      reason: "no-creature",
    })
  })

  it("rejects a no-creature save even mid-cup (no-creature precedes cup-phase)", () => {
    const noCreature: GameState = {
      ...createInitialState(),
      phase: "cup",
      day: GRADUATION_DAY,
    }
    expect(canGraduate(noCreature)).toEqual({
      eligible: false,
      reason: "no-creature",
    })
  })

  it("rejects a champion mid-cup with cup-phase", () => {
    expect(canGraduate(stateWith("champion", GRADUATION_DAY, "cup"))).toEqual({
      eligible: false,
      reason: "cup-phase",
    })
  })

  it("rejects a baby during the day phase with not-champion", () => {
    expect(canGraduate(stateWith("baby", GRADUATION_DAY))).toEqual({
      eligible: false,
      reason: "not-champion",
    })
  })

  it("rejects a juvenile during the day phase with not-champion", () => {
    expect(canGraduate(stateWith("juvenile", GRADUATION_DAY))).toEqual({
      eligible: false,
      reason: "not-champion",
    })
  })

  it("prefers not-champion over too-young for an under-age baby", () => {
    expect(canGraduate(stateWith("baby", 5))).toEqual({
      eligible: false,
      reason: "not-champion",
    })
  })

  it("rejects a champion one day under the age floor with too-young", () => {
    expect(canGraduate(stateWith("champion", GRADUATION_DAY - 1))).toEqual({
      eligible: false,
      reason: "too-young",
    })
  })

  it("accepts a champion on the age floor day", () => {
    expect(canGraduate(stateWith("champion", GRADUATION_DAY))).toEqual({
      eligible: true,
      reason: "eligible",
    })
  })

  it("stays eligible forever past the floor (no upper limit)", () => {
    expect(canGraduate(stateWith("champion", 200))).toEqual({
      eligible: true,
      reason: "eligible",
    })
  })
})

const drake: SpeciesDef = (() => {
  const s = getSpecies("fire_drake")
  if (!s) throw new Error("expected the fire_drake species")
  return s
})()

/** A neutral parent stat spread for inheritance tests (HP on the doubled scale). */
const parentStats: CreatureStats = { hp: 160, atk: 24, def: 16, spd: 18 }

describe("inheritedFloor", () => {
  it("uses half the pinned fraction", () => {
    expect(INHERITANCE_FRACTION).toBe(0.5)
  })

  it("returns half the parent's effective stats when inside bounds", () => {
    expect(inheritedFloor(parentStats, drake, 0)).toEqual({
      hp: 80,
      atk: 12,
      def: 8,
      spd: 9,
    })
  })

  it("clamps a huge parent down to the species maximums", () => {
    const huge: CreatureStats = { hp: 500, atk: 500, def: 500, spd: 500 }
    expect(inheritedFloor(huge, drake, 0)).toEqual({
      hp: 92,
      atk: 13,
      def: 10,
      spd: 12,
    })
  })

  it("clamps a weak parent up to the species minimums", () => {
    const weak: CreatureStats = { hp: 2, atk: 2, def: 2, spd: 2 }
    expect(inheritedFloor(weak, drake, 0)).toEqual({
      hp: 76,
      atk: 9,
      def: 7,
      spd: 9,
    })
  })

  it("adds +1 per stat at the established-line milestone (pre-clamp)", () => {
    expect(
      inheritedFloor(parentStats, drake, PRESTIGE_ESTABLISHED_LINE),
    ).toEqual({
      hp: 81,
      atk: 13,
      def: 9,
      spd: 10,
    })
  })

  it("grants no bonus below the milestone", () => {
    expect(
      inheritedFloor(parentStats, drake, PRESTIGE_ESTABLISHED_LINE - 1),
    ).toEqual({
      hp: 80,
      atk: 12,
      def: 8,
      spd: 9,
    })
  })

  it("stays at the 0.5 share at refined-blood prestige (FR-4 is dual-parent only)", () => {
    // A 0.55 share would lift hp to 89 — the single-parent successor floor
    // deliberately keeps the plain 0.5 fraction.
    expect(inheritedFloor(parentStats, drake, PRESTIGE_REFINED_BLOOD)).toEqual({
      hp: 81,
      atk: 13,
      def: 9,
      spd: 10,
    })
  })
})

describe("createInheritedCreature", () => {
  it("is seed-reproducible", () => {
    const a = createInheritedCreature("fire_drake", 7, parentStats, 0)
    const b = createInheritedCreature("fire_drake", 7, parentStats, 0)
    expect(a).toEqual(b)
  })

  it("never rolls below the parent-derived floor and stays within bounds", () => {
    const floor = inheritedFloor(parentStats, drake, 0)
    for (let seed = 0; seed < 60; seed++) {
      const c = createInheritedCreature("fire_drake", seed, parentStats, 0)
      expect(c.stats.hp).toBeGreaterThanOrEqual(floor.hp)
      expect(c.stats.atk).toBeGreaterThanOrEqual(floor.atk)
      expect(c.stats.def).toBeGreaterThanOrEqual(floor.def)
      expect(c.stats.spd).toBeGreaterThanOrEqual(floor.spd)
      expect(c.stats.hp).toBeLessThanOrEqual(drake.statBounds.hp[1])
      expect(c.stats.atk).toBeLessThanOrEqual(drake.statBounds.atk[1])
      expect(c.stats.def).toBeLessThanOrEqual(drake.statBounds.def[1])
      expect(c.stats.spd).toBeLessThanOrEqual(drake.statBounds.spd[1])
    }
  })

  it("raises the starting bond under the warm-bloodline perk", () => {
    const cold = createInheritedCreature("fire_drake", 3, parentStats, 0)
    expect(cold.conditions.bond).toBe(10)
    const warm = createInheritedCreature(
      "fire_drake",
      3,
      parentStats,
      PRESTIGE_WARM_BLOODLINE,
    )
    expect(warm.conditions.bond).toBe(WARM_BOND_START)
  })

  it("applies the established-line floor bonus to the successor", () => {
    const floor = inheritedFloor(parentStats, drake, PRESTIGE_ESTABLISHED_LINE)
    const c = createInheritedCreature(
      "fire_drake",
      11,
      parentStats,
      PRESTIGE_ESTABLISHED_LINE,
    )
    expect(c.stats.hp).toBeGreaterThanOrEqual(floor.hp)
    expect(c.stats.atk).toBeGreaterThanOrEqual(floor.atk)
    expect(c.stats.def).toBeGreaterThanOrEqual(floor.def)
    expect(c.stats.spd).toBeGreaterThanOrEqual(floor.spd)
  })

  it("honors the chosen species while inheriting (cross-species succession)", () => {
    const ox = createInheritedCreature("plant_ox", 5, parentStats, 0)
    expect(ox.speciesId).toBe("plant_ox")
    expect(ox.stage).toBe("baby")
    const oxSpecies = getSpecies("plant_ox")
    if (!oxSpecies) throw new Error("expected plant_ox")
    const oxFloor = inheritedFloor(parentStats, oxSpecies, 0)
    expect(ox.stats.hp).toBeGreaterThanOrEqual(oxFloor.hp)
  })

  it("throws on an unknown species", () => {
    expect(() => createInheritedCreature("nope", 1, parentStats, 0)).toThrow()
  })
})

function creatureOf(state: GameState) {
  const c = state.creature
  if (!c) throw new Error("expected a creature")
  return c
}

describe("graduate — succession", () => {
  it("rejects every ineligible state with its reason", () => {
    expect(graduate(createInitialState(), "plant_ox", 1)).toEqual({
      ok: false,
      reason: "no-creature",
    })
    expect(
      graduate(stateWith("juvenile", GRADUATION_DAY), "plant_ox", 1),
    ).toEqual({ ok: false, reason: "not-champion" })
    expect(
      graduate(stateWith("champion", GRADUATION_DAY - 1), "plant_ox", 1),
    ).toEqual({ ok: false, reason: "too-young" })
    expect(
      graduate(stateWith("champion", GRADUATION_DAY, "cup"), "plant_ox", 1),
    ).toEqual({ ok: false, reason: "cup-phase" })
  })

  it("hatches the chosen species as a baby and archives the retiree", () => {
    const before = stateWith("champion", GRADUATION_DAY)
    const retiree = creatureOf(before)
    const res = graduate(before, "plant_ox", 99)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.state.creature?.speciesId).toBe("plant_ox")
    expect(res.state.creature?.stage).toBe("baby")
    expect(res.state.lineage.generation).toBe(1)
    expect(res.state.lineage.hallOfFame).toHaveLength(1)
    expect(res.state.lineage.hallOfFame[0]).toMatchObject({
      name: retiree.name,
      speciesId: "fire_drake",
      archetypeId: retiree.archetypeId,
      element: "fire",
      stats: effectiveStats(retiree),
      trained: retiree.trained,
      cupsWon: 0,
      generation: 0,
      retiredOnDay: GRADUATION_DAY,
    })
  })

  it("resets the day's action points and carries day/cups/ladder/settings", () => {
    const before = {
      ...stateWith("champion", GRADUATION_DAY),
      cupsWon: 2,
      lastCupDay: 56,
    }
    const res = graduate(before, "water_axolotl", 7)
    if (!res.ok) throw new Error("expected ok")
    expect(res.state.actionPoints).toBe(ACTION_POINTS_PER_DAY)
    expect(res.state.day).toBe(before.day)
    expect(res.state.cupsWon).toBe(2)
    expect(res.state.lastCupDay).toBe(56)
    expect(res.state.ladder).toEqual(before.ladder)
    expect(res.state.settings).toEqual(before.settings)
  })

  it("is mutation-pure", () => {
    const before = stateWith("champion", GRADUATION_DAY)
    const snapshot = structuredClone(before)
    graduate(before, "plant_ox", 5)
    expect(before).toEqual(snapshot)
  })

  it("accumulates Hall of Fame records oldest-first across generations", () => {
    const first = graduate(stateWith("champion", GRADUATION_DAY), "plant_ox", 5)
    if (!first.ok) throw new Error("expected ok")
    const promoted: GameState = {
      ...first.state,
      creature: { ...creatureOf(first.state), stage: "champion" },
    }
    const second = graduate(promoted, "plant_ox", 6)
    if (!second.ok) throw new Error("expected ok")
    expect(second.state.lineage.generation).toBe(2)
    expect(second.state.lineage.hallOfFame.map((r) => r.generation)).toEqual([
      0, 1,
    ])
    expect(second.state.lineage.hallOfFame.map((r) => r.speciesId)).toEqual([
      "fire_drake",
      "plant_ox",
    ])
  })

  it("passes the family's prestige (generations + cups) to the successor", () => {
    const before = { ...stateWith("champion", GRADUATION_DAY), cupsWon: 5 }
    const res = graduate(before, "plant_ox", 42)
    if (!res.ok) throw new Error("expected ok")
    expect(lineagePrestige(res.state)).toBe(res.state.lineage.generation + 5)
    expect(res.state.creature?.conditions.bond).toBe(WARM_BOND_START)
    const ox = getSpecies("plant_ox")
    if (!ox) throw new Error("expected plant_ox")
    const floor = inheritedFloor(
      effectiveStats(creatureOf(before)),
      ox,
      lineagePrestige(res.state),
    )
    const successor = creatureOf(res.state)
    expect(successor.stats.hp).toBeGreaterThanOrEqual(floor.hp)
    expect(successor.stats.atk).toBeGreaterThanOrEqual(floor.atk)
  })

  it("leaves the successor cold when the family has not reached a milestone", () => {
    const res = graduate(stateWith("champion", GRADUATION_DAY), "plant_ox", 42)
    if (!res.ok) throw new Error("expected ok")
    expect(res.state.creature?.conditions.bond).toBe(10)
  })

  it("stamps the founder successor's parent generation and derived trait", () => {
    const res = graduate(stateWith("champion", GRADUATION_DAY), "plant_ox", 42)
    if (!res.ok) throw new Error("expected ok")
    expect(res.state.creature?.parents).toEqual([0])
    expect(res.state.creature?.traits.length).toBe(1)
    expect(res.state.lineage.hallOfFame[0]?.parents).toEqual([])
  })

  it("starts a champion-stable successor's first day with +1 max AP", () => {
    // The successor's prestige is 1 + 8 = 9: Champion Stable.
    const before = { ...stateWith("champion", GRADUATION_DAY), cupsWon: 8 }
    const res = graduate(before, "plant_ox", 42)
    if (!res.ok) throw new Error("expected ok")
    expect(res.state.actionPoints).toBe(ACTION_POINTS_PER_DAY + 1)
  })
})

describe("graduateWithPair — dual-parent succession", () => {
  /** Two archived generations plus a champion of the second successor. */
  function twoGenerationState(): GameState {
    const first = graduate(stateWith("champion", GRADUATION_DAY), "plant_ox", 5)
    if (!first.ok) throw new Error("expected first graduation")
    const promoted: GameState = {
      ...first.state,
      creature: { ...creatureOf(first.state), stage: "champion" },
    }
    const second = graduate(promoted, "water_axolotl", 6)
    if (!second.ok) throw new Error("expected second graduation")
    return {
      ...second.state,
      day: 70,
      creature: { ...creatureOf(second.state), stage: "champion" },
    }
  }

  it("rejects an ineligible career before touching the pair", () => {
    expect(
      graduateWithPair(
        stateWith("juvenile", GRADUATION_DAY),
        [0, 1],
        "fire_drake",
        1,
      ),
    ).toEqual({ ok: false, reason: "not-champion" })
  })

  it("rejects a malformed or unknown pair", () => {
    const before = twoGenerationState()
    expect(graduateWithPair(before, [0], "fire_drake", 1)).toEqual({
      ok: false,
      reason: "invalid-pair",
    })
    expect(graduateWithPair(before, [0, 0], "fire_drake", 1)).toEqual({
      ok: false,
      reason: "invalid-pair",
    })
    expect(graduateWithPair(before, [0, 99], "fire_drake", 1)).toEqual({
      ok: false,
      reason: "invalid-pair",
    })
  })

  it("rejects a species outside the pair's options", () => {
    const before = twoGenerationState()
    expect(graduateWithPair(before, [0, 1], "water_axolotl", 1)).toEqual({
      ok: false,
      reason: "invalid-species",
    })
  })

  it("archives the retiree, advances the generation, and hatches a parent species", () => {
    const before = twoGenerationState()
    const retiree = creatureOf(before)
    const res = graduateWithPair(before, [0, 1], "plant_ox", 77)
    if (!res.ok) throw new Error("expected ok")
    expect(res.state.lineage.generation).toBe(3)
    expect(res.state.lineage.hallOfFame).toHaveLength(3)
    expect(res.state.lineage.hallOfFame[2]).toMatchObject({
      name: retiree.name,
      speciesId: "water_axolotl",
      generation: 2,
      parents: [1],
    })
    expect(res.state.creature?.speciesId).toBe("plant_ox")
    expect(res.state.creature?.stage).toBe("baby")
    expect(res.state.creature?.parents).toEqual([0, 1])
    expect(res.state.actionPoints).toBe(ACTION_POINTS_PER_DAY)
  })

  it("floors the egg with the dual-parent formula and their trait union", () => {
    const before = twoGenerationState()
    const res = graduateWithPair(before, [0, 1], "plant_ox", 77)
    if (!res.ok) throw new Error("expected ok")
    const [a, b] = res.state.lineage.hallOfFame
    if (!a || !b) throw new Error("expected two parents")
    const species = getSpecies("plant_ox")
    if (!species) throw new Error("expected plant_ox")
    const traits = dedupeTraits([...effectiveTraits(a), ...effectiveTraits(b)])
    // Generation 3 + zero lifetime cups: the egg belongs to the new lineage.
    const floor = inheritedFloorFromPair(a.stats, b.stats, species, 3, traits)
    const egg = creatureOf(res.state)
    for (const key of ["hp", "atk", "def", "spd"] as const) {
      expect(egg.stats[key], key).toBeGreaterThanOrEqual(floor[key])
    }
    expect(egg.traits).toEqual(traits)
    expect(egg.parents).toEqual([0, 1])
  })

  it("can pair the retiring champion with an archived record", () => {
    const before = twoGenerationState()
    const res = graduateWithPair(before, [0, 2], "water_axolotl", 9)
    if (!res.ok) throw new Error("expected ok")
    expect(res.state.creature?.parents).toEqual([0, 2])
    expect(res.state.creature?.speciesId).toBe("water_axolotl")
  })

  it("carries day/cups/ladder/settings and is mutation-pure", () => {
    const before = { ...twoGenerationState(), cupsWon: 4, lastCupDay: 66 }
    const snapshot = structuredClone(before)
    const res = graduateWithPair(before, [0, 1], "fire_drake", 3)
    if (!res.ok) throw new Error("expected ok")
    expect(res.state.day).toBe(70)
    expect(res.state.cupsWon).toBe(4)
    expect(res.state.lastCupDay).toBe(66)
    expect(res.state.ladder).toEqual(before.ladder)
    expect(res.state.settings).toEqual(before.settings)
    expect(before).toEqual(snapshot)
  })
})
