import { describe, expect, test } from "bun:test"
import type { CreatureStats, Element } from "../creature"
import type { BattleEvent } from "./clock"
import {
  type BattleResult,
  type BattleSide,
  MAX_TICKS,
  resolveBattle,
} from "./resolver"

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

describe("resolveBattle", () => {
  test("side ids keep the log unambiguous when both fighters share a name", () => {
    // A mirror match (rival rolled the same species) gives both fighters
    // the same display name. With ids on the sides, every hp snapshot
    // must key the two fighters apart instead of collapsing them.
    const a = side("Ember Drake", "fire", { hp: 45, atk: 12 }, { id: "owned" })
    const b = side(
      "Ember Drake",
      "fire",
      { hp: 43 },
      {
        kit: OX_KIT,
        id: "rival",
      },
    )
    const result = resolveBattle(a, b, 22)

    expect(result.events.length).toBeGreaterThan(0)
    for (const event of result.events) {
      expect(Object.keys(event.hpAfter).sort()).toEqual(["owned", "rival"])
    }
    expect(Object.keys(result.finalHp).sort()).toEqual(["owned", "rival"])
  })

  test("a one-sided KO ends with winner, reason ko, and a down event", () => {
    // Seed 22's first two rolls (62, 23) are under both accuracies, so the
    // ATK 20 fights resolve: T1 both launch (Flame Charge / Thorn Volley),
    // T2 Flame Charge hits Reed for 24 (1.5x, pow 8) and staggers her while
    // Thorn Volley clips Bolt for 5 (2/3x), and Bolt queues Blaze Bolt.
    // T3 Blaze Bolt lands for 36 and downs the 40-HP Reed (24 + 36 = 60).
    // The stagger keeps Reed from ever launching the cooldown-2 Bramble
    // Dart, so Bolt keeps 35 of 40.
    const bolt = side("Bolt", "fire", { atk: 20 })
    const reed = side("Reed", "plant", {}, { kit: OX_KIT })
    const result = resolveBattle(bolt, reed, 22)

    expect(result.reason).toBe("ko")
    expect(result.winner).toBe("Bolt")
    expect(result.finalHp).toEqual({ Bolt: 35, Reed: -20 })
    // The down lands mid-log now: the whole impact step resolves before the
    // judgment, so Reed's own Bramble Dart still appears after the down.
    const down = result.events.find(
      (e) => e.kind === "down" && e.actor === "Reed",
    )
    expect(down?.line).toBe("Reed is down!")
  })

  test("a same-step double down is a draw with reason double_ko", () => {
    // Blaze Bolt (atk 23, 1.5x into plant) deals 41, Bramble Dart (atk 50,
    // 2/3x into fire) deals 40: both 40-HP fighters go down in the same
    // impact step, so the fight is judged after the step (FR8 revision).
    // Seed 22's rolls (62, 23) are under both accuracies.
    const bolt = side("Bolt", "fire", { atk: 23 })
    const reed = side("Reed", "plant", { atk: 50 }, { kit: OX_KIT })
    const result = resolveBattle(bolt, reed, 22)

    expect(result.reason).toBe("double_ko")
    expect(result.winner).toBeNull()
    const kinds = result.events.map((e) => e.kind)
    expect(kinds).toContain("draw")
  })

  test("the 40-tick cap picks the higher remaining HP percent", () => {
    // DEF 100 makes every hit land for 1, far short of either HP pool, so
    // symmetric kits run into the safety cap. Equal damage means the
    // larger HP pool (Bolt, 120) keeps the higher percent and wins.
    const bolt = side("Bolt", "fire", { hp: 120, def: 100 })
    const reed = side("Reed", "fire", { hp: 100, def: 100 })
    const result = resolveBattle(bolt, reed, 5)

    expect(result.reason).toBe("time")
    expect(result.winner).toBe("Bolt")
    expect(result.finalHp.Bolt).toBeGreaterThan(result.finalHp.Reed ?? 0)
    const last = result.events[result.events.length - 1]
    expect(last?.kind).toBe("time")
    expect(last?.line).toBe("Time's up. Bolt is still standing.")
    for (const event of result.events) {
      expect(event.line.toLowerCase()).not.toContain("judge")
      expect(event.line.toLowerCase()).not.toContain("death")
    }
  })

  test("every log event carries the full record and one announcer line", () => {
    const bolt = side("Bolt", "fire", { atk: 20 })
    const reed = side("Reed", "plant", {}, { kit: OX_KIT })
    const result: BattleResult = resolveBattle(bolt, reed, 22)

    expect(result.events.length).toBeGreaterThan(0)
    for (const event of result.events) {
      const e: BattleEvent = event
      expect(e.tick).toBeGreaterThan(0)
      expect(e.actor.length).toBeGreaterThan(0)
      expect(e.line.length).toBeGreaterThan(0)
      expect(Object.keys(e.hpAfter).sort()).toEqual(["Bolt", "Reed"])
    }
  })

  test("two resolves with the same input and seed match in full", () => {
    const bolt = side("Bolt", "fire", { atk: 20 })
    const reed = side("Reed", "plant", {}, { kit: OX_KIT })
    const first = resolveBattle(bolt, reed, 22)
    const second = resolveBattle(bolt, reed, 22)
    expect(second).toEqual(first)
  })
})

describe("the safety cap scales with the HP scale (element_chart_20261016)", () => {
  test("the cap doubled with the HP scale: 40 -> 80", () => {
    expect(MAX_TICKS).toBe(80)
  })

  test("a stall battle ends by the cap, never beyond it", () => {
    // Neutral mirror, negligible damage: hp 200 vs atk 1 / def 30 means one
    // damage per hit — hundreds of hits needed, far past any cap.
    const tankA = side(
      "TankA",
      "fire",
      { hp: 200, atk: 1, def: 30 },
      { tactic: "balanced" },
    )
    const tankB = side(
      "TankB",
      "fire",
      { hp: 200, atk: 1, def: 30 },
      { tactic: "balanced" },
    )
    const result = resolveBattle(tankA, tankB, 7)
    expect(result.reason).toBe("time")
    const last = result.events.at(-1)
    if (!last) throw new Error("expected a time-out event")
    expect(last.tick).toBeLessThanOrEqual(MAX_TICKS)
    expect(result.winner).not.toBeNull()
  })
})
