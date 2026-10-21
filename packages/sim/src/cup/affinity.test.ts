/**
 * Cup-side affinity threading (affinity-drift FR-3, plan amendment
 * 92ba3b0): the player's frozen bracket slot carries the creature's
 * secondary affinity into the battle side, so the cancel-to-neutral
 * defense rule also governs live cup matches. Rival and boss slots never
 * gain a secondary. Slots without one resolve byte-identically to before.
 */

import { describe, expect, test } from "bun:test"
import {
  type BattleSide,
  getMove,
  resolveBattle,
  strikeDamage,
} from "../battle"
import { getBoss } from "../bosses"
import {
  type Creature,
  type CreatureStats,
  createCreature,
  type Element,
} from "../creature"
import { substituteFinalBoss } from "../cup"
import { makeBracket } from "../index"
import type { CupSlot } from "./bracket"
import { battleSideForSlot } from "./verdicts"

const DRAKE_KIT = [
  "spark",
  "flame_charge",
  "cinder_shot",
  "blaze_bolt",
] as const
const WATER: Element = "water"

function fireAttacker(): BattleSide {
  return {
    name: "Bolt",
    element: "fire",
    stats: { hp: 40, atk: 20, def: 10, spd: 12 },
    kit: DRAKE_KIT,
    tactic: "specials",
    temperament: "obedient",
  }
}

function slot(over: Partial<CupSlot> = {}): CupSlot {
  const stats: CreatureStats = { hp: 40, atk: 10, def: 10, spd: 12 }
  return {
    isPlayer: false,
    name: "Reed",
    speciesId: "plant_ox",
    stats,
    ...over,
  }
}

/** The first landed impact event against the named target. */
function firstImpactOn(
  result: ReturnType<typeof resolveBattle>,
  target: string,
): { moveId: string; damage: number } {
  const event = result.events.find(
    (e) => e.kind === "impact" && e.target === target && e.hit === true,
  )
  if (!event) throw new Error(`No landed impact against ${target}`)
  if (event.moveId === undefined || event.damage === undefined) {
    throw new Error("The impact event carries no move or damage")
  }
  return { moveId: event.moveId, damage: event.damage }
}

describe("cup slot affinity threads into the battle side", () => {
  test("battleSideForSlot carries the slot's secondary", () => {
    const bare = battleSideForSlot(slot(), 22)
    const defended = battleSideForSlot(slot({ affinity: WATER }), 22)
    expect(defended).toEqual({ ...bare, affinity: "water" })
  })

  test("a defended cup slot takes the incoming super-effective hit neutral", () => {
    // Fire into plant_ox is super-effective; a water secondary resists fire,
    // so the incoming pair collapses to neutral. Seed 22 (pinned in
    // resolver.test.ts): the first Flame Charge impact lands at 3/2x without
    // the secondary and at 1x with it.
    const bare = resolveBattle(
      fireAttacker(),
      battleSideForSlot(slot(), 22),
      22,
    )
    const soft = resolveBattle(
      fireAttacker(),
      battleSideForSlot(slot({ affinity: WATER }), 22),
      22,
    )
    const bareHit = firstImpactOn(bare, "Reed")
    const softHit = firstImpactOn(soft, "Reed")
    expect(bareHit.moveId).toBe(softHit.moveId)
    const move = getMove(bareHit.moveId)
    if (!move) throw new Error(`Unknown move: ${bareHit.moveId}`)
    expect(bareHit.damage).toBe(strikeDamage(move.power, 20, 10, 3, 2, true))
    expect(softHit.damage).toBe(strikeDamage(move.power, 20, 10, 1, 1, true))
    expect(soft.finalHp.Reed).toBeGreaterThan(bare.finalHp.Reed ?? 0)
  })

  test("a slot without a secondary is byte-identical; null behaves as absent", () => {
    expect("affinity" in battleSideForSlot(slot(), 22)).toBe(false)
    expect(
      resolveBattle(
        fireAttacker(),
        battleSideForSlot(slot({ affinity: null }), 22),
        22,
      ),
    ).toEqual(resolveBattle(fireAttacker(), battleSideForSlot(slot(), 22), 22))
  })

  test("boss slots never gain a secondary, even if a slot carried one", () => {
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const bossSide = battleSideForSlot(
      slot({ bossId: boss.id, affinity: WATER }),
      22,
    )
    expect("affinity" in bossSide).toBe(false)
  })
})

describe("the bracket stamps the creature's secondary on the player slot only", () => {
  test("the player slot carries the owned creature's affinity; rivals carry none", () => {
    const owned: Creature = {
      ...createCreature("fire_drake", 42),
      affinity: WATER,
    }
    const bracket = makeBracket(owned, 7, 101)
    expect(bracket.slots[0]?.affinity).toBe("water")
    for (const rival of bracket.slots.slice(1)) {
      expect("affinity" in rival).toBe(false)
    }
    expect("affinity" in bracket.finalRival).toBe(false)
  })

  test("the substituted boss slot never carries a secondary", () => {
    const owned: Creature = {
      ...createCreature("fire_drake", 42),
      affinity: WATER,
    }
    const bracket = makeBracket(owned, 7, 101)
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const promoted = substituteFinalBoss(bracket, boss, "promotion")
    expect("affinity" in (promoted.slots[7] ?? {})).toBe(false)
  })
})
