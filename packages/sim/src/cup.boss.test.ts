/**
 * Promotion-cup substitution (silver_ladder_bosses_20261016, FR3).
 *
 * The final rival slot is substituted with the authored boss AFTER the
 * bracket's draw sequence completes — no draws added or pruned, so regular
 * brackets for existing saves stay byte-identical (the golden stream test
 * in cup.test.ts stays green untouched).
 */
import { describe, expect, test } from "bun:test"
import { getBoss } from "./bosses"
import { type Creature, createCreature } from "./creature"
import {
  battleSideForSlot,
  makeBracket,
  startCupSession,
  substituteFinalBoss,
} from "./cup"
import { prepareCup } from "./machine"
import { chooseStarter, createInitialState } from "./state"

function playerCreature(seed = 11): Creature {
  return createCreature("fire_drake", seed)
}

const cupDay = 7

/** A game state whose ladder stands at Bronze I with points banked past
 * the ceiling — the Promotion Cup gate. */
function promotionGateState() {
  const started = chooseStarter(createInitialState(), "fire_drake", 42)
  return {
    ...started,
    ladder: { points: 15, tier: "bronze" as const, subTier: "I" as const },
  }
}

describe("substituteFinalBoss", () => {
  test("replaces the final rival slot with the boss' pinned build", () => {
    const bracket = makeBracket(playerCreature(), cupDay, 101)
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const promoted = substituteFinalBoss(bracket, boss, "promotion")
    const finalSlot = promoted.slots[7]
    if (!finalSlot) throw new Error("expected a final slot")
    expect(finalSlot).toEqual({
      isPlayer: false,
      name: boss.name,
      speciesId: boss.speciesId,
      stats: boss.stats,
      bossId: boss.id,
    })
    expect(promoted.finalRival).toEqual(finalSlot)
    // The rest of the draw is untouched.
    expect(promoted.slots.slice(0, 7)).toEqual(bracket.slots.slice(0, 7))
  })

  test("carries the presentation metadata on the bracket", () => {
    const bracket = makeBracket(playerCreature(), cupDay, 101)
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const promoted = substituteFinalBoss(bracket, boss, "promotion")
    expect(promoted.kind).toBe("promotion")
    expect(promoted.banner).toBe("Promotion Cup")
    expect(promoted.bossIntro).toBe(boss.intro)
  })

  test("a substituted championship final carries the boss framing", () => {
    const bracket = makeBracket(playerCreature(), cupDay, 101)
    const boss = getBoss("hesse")
    if (!boss) throw new Error("missing boss hesse")
    const framed = substituteFinalBoss(bracket, boss, "championship")
    expect(framed.kind).toBe("championship")
    expect(framed.banner).toBe(`Boss Final · ${boss.name}`)
    expect(framed.bossIntro).toBe(boss.intro)
  })

  test("the substitution never touches the draw sequence", () => {
    // The first seven slots of a substituted bracket must equal the same
    // slots of the plain bracket, for every seed — substitution is a pure
    // post-step on the completed draw.
    for (const seed of [1, 2, 3, 7, 42, 101]) {
      const plain = makeBracket(playerCreature(11), cupDay, seed)
      const boss = getBoss("koda")
      if (!boss) throw new Error("missing boss koda")
      const promoted = substituteFinalBoss(plain, boss, "promotion")
      expect(promoted.slots.slice(0, 7)).toEqual(plain.slots.slice(0, 7))
    }
  })
})

describe("boss slots fight with their pinned build", () => {
  test("a boss slot's battle side uses the pinned kit and tactic", () => {
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const side = battleSideForSlot(
      {
        isPlayer: false,
        name: boss.name,
        speciesId: boss.speciesId,
        stats: boss.stats,
        bossId: boss.id,
      },
      12345,
    )
    expect(side.tactic).toBe(boss.tactic)
    expect([...side.kit]).toEqual([...boss.loadout])
    expect(side.stats).toEqual(boss.stats)
    expect(side.name).toBe(boss.name)
  })

  test("a generated rival slot still rolls its tactic from the seed", () => {
    const slot = {
      isPlayer: false,
      name: "Driftbelle",
      speciesId: "water_axolotl",
      stats: { hp: 44, atk: 10, def: 9, spd: 9 },
    }
    const side = battleSideForSlot(slot, 12345)
    expect(side.tactic).toBeDefined()
    expect(["balanced", "specials"]).toContain(side.tactic)
  })
})

describe("startCupSession with a boss final", () => {
  test("flags the bracket and plants the boss in the far half", () => {
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const session = startCupSession(
      playerCreature(),
      cupDay,
      101,
      "promotion",
      boss,
    )
    expect(session.bracket.kind).toBe("promotion")
    expect(session.bracket.slots[7]?.bossId).toBe("koda")
    expect(session.bracket.bossIntro).toBe(boss.intro)
    // The player's first opponent is unaffected (slot 1 of the near half).
    expect(session.nextOpponent?.name).toBe(session.bracket.slots[1]?.name)
  })

  test("a regular session stays championship with no boss metadata", () => {
    const session = startCupSession(playerCreature(), cupDay, 101)
    expect(session.bracket.kind).toBe("championship")
    expect(session.bracket.banner).toBeUndefined()
    expect(session.bracket.bossIntro).toBeUndefined()
    for (const slot of session.bracket.slots) {
      expect(slot.bossId).toBeUndefined()
    }
  })
})

describe("prepareCup threads the boss decision", () => {
  test("a promotion-eligible save opens a Promotion Cup against Koda", () => {
    const session = prepareCup(promotionGateState())
    if (!session) throw new Error("expected a session")
    expect(session.bracket.kind).toBe("promotion")
    expect(session.bracket.slots[7]?.bossId).toBe("koda")
    expect(session.bracket.banner).toBe("Promotion Cup")
  })

  test("a save below the gate opens a regular championship cup", () => {
    const session = prepareCup(
      chooseStarter(createInitialState(), "fire_drake", 42),
    )
    if (!session) throw new Error("expected a session")
    expect(session.bracket.kind).toBe("championship")
    for (const slot of session.bracket.slots) {
      expect(slot.bossId).toBeUndefined()
    }
  })

  test("the promotion seed never changes the drawn field", () => {
    // The same save on the same day draws the same seven rivals whether or
    // not the boss gate is open — only slot 8 differs.
    const plain = prepareCup(
      chooseStarter(createInitialState(), "fire_drake", 42),
    )
    const gated = prepareCup(promotionGateState())
    if (!plain || !gated) throw new Error("expected sessions")
    // Different ladder totals fold into the entry seed only via identity…
    // they do not: the seed folds the creature's effective stats, not the
    // ladder. Same creature, same day → same seven rivals.
    expect(plain.seed).toBe(gated.seed)
    expect(gated.bracket.slots.slice(0, 7)).toEqual(
      plain.bracket.slots.slice(0, 7),
    )
    expect(gated.bracket.slots[7]?.bossId).toBe("koda")
  })
})
