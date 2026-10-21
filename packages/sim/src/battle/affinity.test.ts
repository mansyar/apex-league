/**
 * The cancel-to-neutral defense rule (affinity-drift FR-3): a defender with a
 * secondary affinity softens exactly one super-effective incoming matchup —
 * the incoming element must be super-effective against the primary AND
 * resisted by the secondary, and only then does the pair collapse to neutral.
 * Incoming-only: outgoing damage math never reads the secondary.
 */

import { describe, expect, test } from "bun:test"
import type { Creature, CreatureStats, Element } from "../creature"
import { createCreature } from "../creature"
import { incomingTypeFactor, typeFactor } from "./chart"
import { strikeDamage } from "./damage"
import { makeExhibition } from "./exhibition"
import { type BattleSide, resolveBattle } from "./resolver"

const DRAKE_KIT = [
  "spark",
  "flame_charge",
  "cinder_shot",
  "blaze_bolt",
] as const
const OX_KIT = [
  "seed_shot",
  "thorn_volley",
  "spore_burst",
  "bramble_dart",
] as const

function side(
  name: string,
  element: Element,
  s: Partial<CreatureStats> = {},
  over: Partial<BattleSide> = {},
): BattleSide {
  const stats: CreatureStats = {
    hp: s.hp ?? 40,
    atk: s.atk ?? 10,
    def: s.def ?? 10,
    spd: s.spd ?? 12,
  }
  return {
    name,
    element,
    stats,
    kit: DRAKE_KIT,
    tactic: "specials",
    temperament: "obedient",
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

describe("balance guardrails (no rival or boss carries a secondary)", () => {
  test("the exhibition rival side never carries a secondary", () => {
    const spar = makeExhibition(createCreature("fire_drake", 7), "specials", 7)
    expect("affinity" in spar.rivalSide).toBe(false)
    expect(spar.ownedSide.affinity).toBeNull()
  })

  test("the owned side threads the creature's secondary through", () => {
    const owned: Creature = {
      ...createCreature("fire_drake", 7),
      affinity: "water",
    }
    const spar = makeExhibition(owned, "specials", 7)
    expect(spar.ownedSide.affinity).toBe("water")
  })
})

describe("incomingTypeFactor (cancel-to-neutral)", () => {
  test("super-effective vs primary AND resisted by secondary resolves neutral", () => {
    // Fire beats plant (super-effective) while water beats fire (resisted):
    // the plant defender with a water affinity takes incoming fire at 1x.
    expect(incomingTypeFactor("fire", "plant", "water")).toEqual({
      num: 1,
      den: 1,
    })
  })

  test("neutral vs primary stays neutral whatever the secondary", () => {
    expect(incomingTypeFactor("fire", "fire", "water")).toEqual({
      num: 1,
      den: 1,
    })
    expect(incomingTypeFactor("electric", "fire", "water")).toEqual({
      num: 1,
      den: 1,
    })
    expect(incomingTypeFactor("fire", "fire", null)).toEqual({
      num: 1,
      den: 1,
    })
  })

  test("resisted vs primary stays resisted whatever the secondary", () => {
    // Plant into fire is resisted; a water affinity neither weakens it
    // further nor cancels it — the primary matchup is not super-effective.
    expect(incomingTypeFactor("plant", "fire", "water")).toEqual({
      num: 2,
      den: 3,
    })
    expect(incomingTypeFactor("plant", "fire", null)).toEqual({
      num: 2,
      den: 3,
    })
  })

  test("super-effective vs primary without a secondary resist is unchanged", () => {
    // Fire into plant stays super-effective against an electric affinity
    // (electric is neutral vs fire) and against no affinity at all.
    expect(incomingTypeFactor("fire", "plant", "electric")).toEqual({
      num: 3,
      den: 2,
    })
    expect(incomingTypeFactor("fire", "plant", null)).toEqual({
      num: 3,
      den: 2,
    })
  })

  test("the outgoing chart factor is untouched", () => {
    expect(typeFactor("fire", "plant")).toEqual({ num: 3, den: 2 })
    expect(strikeDamage(8, 20, 10, 3, 2, true)).toBe(24)
  })
})

describe("the cancel rule rides the resolver's incoming damage path", () => {
  test("a defended plant takes softened fire damage; an undefended one does not", () => {
    const bolt = side("Bolt", "fire", { atk: 20 })
    const reed = side("Reed", "plant", {}, { kit: OX_KIT })
    const defended = side(
      "Reed",
      "plant",
      {},
      {
        kit: OX_KIT,
        affinity: "water",
      },
    )
    // Seed 22 (pinned in resolver.test.ts): the first Flame Charge impact
    // lands at the super-effective 3/2x for 24. The water affinity cancels
    // the incoming pair to neutral 1x for 16 (same power, atk, def).
    const bare = resolveBattle(bolt, reed, 22)
    const soft = resolveBattle(bolt, defended, 22)
    expect(firstImpactOn(bare, "Reed")).toEqual({
      moveId: "flame_charge",
      damage: strikeDamage(8, 20, 10, 3, 2, true),
    })
    expect(firstImpactOn(soft, "Reed")).toEqual({
      moveId: "flame_charge",
      damage: strikeDamage(8, 20, 10, 1, 1, true),
    })
    expect(soft.finalHp.Reed).toBeGreaterThan(bare.finalHp.Reed ?? 0)
  })

  test("an attacker's secondary never moves outgoing damage", () => {
    const reed = side("Reed", "plant", {}, { kit: OX_KIT })
    const bolt = side("Bolt", "fire", { atk: 20 })
    const drifted = side("Bolt", "fire", { atk: 20 }, { affinity: "water" })
    // Fire's outgoing 3/2x into plant is exactly the pair the cancel rule
    // would collapse were it bidirectional (water resists fire): if the
    // chart or policy ever read the attacker's affinity, this fight would
    // diverge. It must be byte-identical.
    expect(resolveBattle(drifted, reed, 22)).toEqual(
      resolveBattle(bolt, reed, 22),
    )
  })
})
