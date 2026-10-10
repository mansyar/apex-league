import { describe, expect, test } from "bun:test"
import type { CreatureStats, Element } from "../creature"
import type { BattleEvent } from "./clock"
import { getMove } from "./moves"
import {
  buildPlaybackScript,
  PLAYBACK_BEATS,
  type PlaybackStep,
} from "./playback"
import { type BattleSide, resolveBattle } from "./resolver"

const DRAKE_KIT = ["spark", "flame_charge", "cinder_shot", "blaze_bolt"]
const OX_KIT = ["seed_shot", "thorn_volley", "spore_burst", "bramble_dart"]

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

describe("buildPlaybackScript", () => {
  test("maps a resolved battle one-to-one: one step per event, in order", () => {
    const result = resolveBattle(
      side("Bolt", "fire", { atk: 20 }),
      side("Reed", "plant", {}, { kit: OX_KIT }),
      22,
    )
    const script = buildPlaybackScript(result.events)
    expect(script.length).toBe(result.events.length)
    script.forEach((step, i) => {
      const event = result.events[i] as BattleEvent
      expect(step.actor).toBe(event.actor)
      expect(step.tick).toBe(event.tick)
      expect(step.line).toBe(event.line)
      expect(step.hpAfter).toEqual(event.hpAfter)
    })
  })

  test("event kinds map to the documented playback kinds", () => {
    const result = resolveBattle(
      side("Bolt", "fire", { atk: 20 }),
      side("Reed", "plant", {}, { kit: OX_KIT, temperament: "rush" }),
      3,
    )
    const script = buildPlaybackScript(result.events)
    const expected: Record<string, PlaybackStep["kind"]> = {
      close: "approach",
      hold: "idle",
      basic: "melee",
      down: "down",
      launch: "projectile",
      impact: "impact",
      time: "judge",
      draw: "judge",
    }
    result.events.forEach((event, i) => {
      expect(script[i]?.kind).toBe(expected[event.kind])
    })
  })

  test("ticks never go backwards across the script", () => {
    const result = resolveBattle(
      side("Bolt", "fire"),
      side("Reed", "plant", {}, { kit: OX_KIT }),
      7,
    )
    const script = buildPlaybackScript(result.events)
    for (let i = 1; i < script.length; i++) {
      const current = script[i] as PlaybackStep
      const before = script[i - 1] as PlaybackStep
      expect(current.tick).toBeGreaterThanOrEqual(before.tick)
    }
  })

  test("every step kind carries its playback beats", () => {
    expect(PLAYBACK_BEATS.approach).toBe(3)
    expect(PLAYBACK_BEATS.idle).toBe(2)
    expect(PLAYBACK_BEATS.melee).toBe(3)
    expect(PLAYBACK_BEATS.projectile).toBe(2)
    expect(PLAYBACK_BEATS.impact).toBe(2)
    expect(PLAYBACK_BEATS.down).toBe(3)
    expect(PLAYBACK_BEATS.judge).toBe(3)
    const result = resolveBattle(
      side("Bolt", "fire", { atk: 20 }),
      side("Reed", "plant", {}, { kit: OX_KIT }),
      22,
    )
    for (const step of buildPlaybackScript(result.events)) {
      expect(step.beats).toBe(
        PLAYBACK_BEATS[step.kind as keyof typeof PLAYBACK_BEATS],
      )
    }
  })

  test("a launch step carries the projectile element from the move catalog", () => {
    const result = resolveBattle(
      side("Bolt", "fire"),
      side("Reed", "plant", {}, { kit: OX_KIT }),
      7,
    )
    const script = buildPlaybackScript(result.events)
    const launched = script.find((s) => s.kind === "projectile")
    expect(launched).toBeDefined()
    const move = getMove(launched?.moveId ?? "")
    expect(move).toBeDefined()
    expect(launched?.element).toBe(move?.element)
  })

  test("a melee step stays typeless — the basic strike has no element", () => {
    const result = resolveBattle(
      side("Dash", "fire", {}, { kit: ["spark", "bubble"] }),
      side("Reed", "plant", {}, { kit: OX_KIT, temperament: "rush" }),
      11,
    )
    const script = buildPlaybackScript(result.events)
    const melee = script.find((s) => s.kind === "melee")
    if (melee) {
      expect(melee.element).toBeUndefined()
      expect(melee.target).toBeDefined()
      expect(melee.damage).toBeGreaterThan(0)
    }
  })

  test("damage, hit, and missReason pass through onto impact steps", () => {
    const result = resolveBattle(
      side("Bolt", "fire", { atk: 20 }),
      side("Reed", "plant", {}, { kit: OX_KIT }),
      22,
    )
    const script = buildPlaybackScript(result.events)
    const impacts = script.filter((s) => s.kind === "impact")
    expect(impacts.length).toBeGreaterThan(0)
    const landed = impacts.find((s) => s.hit === true)
    expect(landed).toBeDefined()
    expect(landed?.damage).toBeGreaterThan(0)
    const miss = impacts.find((s) => s.hit === false)
    if (miss) {
      expect(
        miss.missReason === "accuracy" || miss.missReason === "dodge",
      ).toBe(true)
      expect(miss.damage).toBe(0)
    }
  })

  test("HP never heals: each fighter's HP series is non-increasing", () => {
    const result = resolveBattle(
      side("Bolt", "fire", { atk: 20 }),
      side("Reed", "plant", {}, { kit: OX_KIT }),
      22,
    )
    const script = buildPlaybackScript(result.events)
    const names = Object.keys(result.finalHp)
    for (const name of names) {
      let previous = Number.POSITIVE_INFINITY
      for (const step of script) {
        const hp = step.hpAfter[name]
        if (hp === undefined) throw new Error(`Missing HP for ${name}`)
        expect(hp).toBeLessThanOrEqual(previous)
        previous = hp
      }
    }
  })

  test("the last step's hpAfter matches the resolver's finalHp", () => {
    const result = resolveBattle(
      side("Bolt", "fire", { atk: 20 }),
      side("Reed", "plant", {}, { kit: OX_KIT }),
      22,
    )
    const script = buildPlaybackScript(result.events)
    const final = script.at(-1)
    expect(final?.hpAfter).toEqual(result.finalHp)
  })

  test("a KO script contains a down step for the defeated fighter", () => {
    const result = resolveBattle(
      side("Bolt", "fire", { atk: 20 }),
      side("Reed", "plant", {}, { kit: OX_KIT }),
      22,
    )
    expect(result.reason).toBe("ko")
    const script = buildPlaybackScript(result.events)
    const losers = Object.entries(result.finalHp)
      .filter(([, hp]) => hp <= 0)
      .map(([name]) => name)
    expect(losers.length).toBe(1)
    const down = script.find((s) => s.kind === "down" && s.actor === losers[0])
    expect(down).toBeDefined()
  })

  test("an empty event log yields an empty script (no throw)", () => {
    expect(buildPlaybackScript([])).toEqual([])
  })
})
