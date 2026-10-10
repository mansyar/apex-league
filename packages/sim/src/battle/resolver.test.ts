import { describe, expect, test } from "bun:test"
import type { CreatureStats, Element } from "../creature"
import type { BattleEvent } from "./clock"
import { type BattleResult, type BattleSide, resolveBattle } from "./resolver"

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
  test("a one-sided KO ends with winner, reason ko, and a down event", () => {
    // Seed 22's first two rolls (62, 23) are under both accuracies, so the
    // ATK 20 Blaze Bolt downs the 40-HP Reed with 48 and Reed's Bramble
    // Dart still lands 6 into fire (0.5x).
    const bolt = side("Bolt", "fire", { atk: 20 })
    const reed = side("Reed", "plant", {}, { kit: OX_KIT })
    const result = resolveBattle(bolt, reed, 22)

    expect(result.reason).toBe("ko")
    expect(result.winner).toBe("Bolt")
    expect(result.finalHp).toEqual({ Bolt: 34, Reed: -8 })
    // The down lands mid-log now: the whole impact step resolves before the
    // judgment, so Reed's own Bramble Dart still appears after the down.
    const down = result.events.find(
      (e) => e.kind === "down" && e.actor === "Reed",
    )
    expect(down?.line).toBe("Reed is down!")
  })

  test("a same-step double down is a draw with reason double_ko", () => {
    // Blaze Bolt (atk 17, 2x into plant) deals 40, Bramble Dart (atk 67,
    // 0.5x into fire) deals 40: both 40-HP fighters go down in the same
    // impact step, so the fight is judged after the step (FR8 revision).
    // Seed 22's rolls (62, 23) are under both accuracies.
    const bolt = side("Bolt", "fire", { atk: 17 })
    const reed = side("Reed", "plant", { atk: 67 }, { kit: OX_KIT })
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
