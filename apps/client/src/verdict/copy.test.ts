import { describe, expect, test } from "bun:test"
import type { BattleResult } from "@apex/sim"
import { battleStampCopy, cupResultCopy, type StampFight } from "./copy"

/**
 * Minimal BattleResult carrying only the fields the copy seam reads. Winner
 * name and finalHp are deliberately independent: the spar reads the winning
 * side key, the cup reads the winner name (or the key only for mirror names).
 */
function verdict(
  winner: string | null,
  finalHp: Record<string, number> = { left: 10, right: 0 },
  reason: BattleResult["reason"] = "ko",
): BattleResult {
  return { winner, reason, finalHp, events: [] }
}

const distinct: StampFight = {
  owned: { key: "left", name: "Ember Drake" },
  rival: { key: "right", name: "Tide Axolotl" },
}

const mirror: StampFight = {
  owned: { key: "left", name: "Ember Drake" },
  rival: { key: "right", name: "Ember Drake" },
}

const KNOCKOUT = "A knockout finish."
const CLOCK = "The clock ran out on this one."
const DOUBLE_DOWN = "A double down — both went out together."

describe("battleStampCopy — spar stamp copy", () => {
  const cases: {
    name: string
    verdict: BattleResult
    fight: StampFight | null
    title: string
    sub: string
  }[] = [
    {
      name: "null winner is a drawn spar",
      verdict: verdict(null),
      fight: distinct,
      title: "A drawn spar",
      sub: KNOCKOUT,
    },
    {
      name: "a verdict before a fight is cast still names the winner",
      verdict: verdict("Ember Drake"),
      fight: null,
      title: "Victory — Ember Drake",
      sub: KNOCKOUT,
    },
    {
      name: "owned-key win with distinct names names the winner",
      verdict: verdict("Ember Drake", { left: 10, right: 0 }),
      fight: distinct,
      title: "Victory — Ember Drake",
      sub: KNOCKOUT,
    },
    {
      name: "rival-key win with distinct names names the rival",
      verdict: verdict("Tide Axolotl", { left: 0, right: 10 }),
      fight: distinct,
      title: "Victory — Tide Axolotl",
      sub: KNOCKOUT,
    },
    {
      name: "owned-key win with mirror names qualifies as your fighter",
      verdict: verdict("Ember Drake", { left: 10, right: 0 }),
      fight: mirror,
      title: "Victory — your Ember Drake",
      sub: KNOCKOUT,
    },
    {
      name: "rival-key win with mirror names qualifies as the rival",
      verdict: verdict("Ember Drake", { left: 0, right: 10 }),
      fight: mirror,
      title: "Victory — rival Ember Drake",
      sub: KNOCKOUT,
    },
    {
      name: "an unknown winning key falls back to the bare winner name",
      verdict: verdict("Mystery", { other: 7 }),
      fight: distinct,
      title: "Victory — Mystery",
      sub: KNOCKOUT,
    },
    {
      name: "empty finalHp yields no side qualification",
      verdict: verdict("Ember Drake", {}),
      fight: mirror,
      title: "Victory — Ember Drake",
      sub: KNOCKOUT,
    },
  ]
  for (const row of cases) {
    test(row.name, () => {
      const copy = battleStampCopy({
        verdict: row.verdict,
        fight: row.fight,
        flow: "spar",
      })
      expect(copy.title).toBe(row.title)
      expect(copy.sub).toBe(row.sub)
    })
  }
})

describe("battleStampCopy — cup stamp copy", () => {
  const cases: {
    name: string
    verdict: BattleResult
    fight: StampFight
    title: string
    sub: string
  }[] = [
    {
      name: "null winner is a draw",
      verdict: verdict(null),
      fight: distinct,
      title: "A draw",
      sub: KNOCKOUT,
    },
    {
      name: "owned-name win with distinct names is a victory",
      verdict: verdict("Ember Drake", { left: 10, right: 0 }),
      fight: distinct,
      title: "Victory",
      sub: KNOCKOUT,
    },
    {
      name: "rival-name win with distinct names is a defeat",
      verdict: verdict("Tide Axolotl", { left: 0, right: 10 }),
      fight: distinct,
      title: "Defeat",
      sub: KNOCKOUT,
    },
    {
      name: "owned-key win with mirror names qualifies as your fighter",
      verdict: verdict("Ember Drake", { left: 10, right: 0 }),
      fight: mirror,
      title: "Victory — your fighter",
      sub: KNOCKOUT,
    },
    {
      name: "rival-key win with mirror names qualifies as the rival",
      verdict: verdict("Ember Drake", { left: 0, right: 10 }),
      fight: mirror,
      title: "Defeat — the rival",
      sub: KNOCKOUT,
    },
    {
      name: "an unknown winning key falls back to the rival in a mirror",
      verdict: verdict("Ember Drake", { other: 7 }),
      fight: mirror,
      title: "Defeat — the rival",
      sub: KNOCKOUT,
    },
    {
      name: "empty finalHp yields no owned-side qualification in a mirror",
      verdict: verdict("Ember Drake", {}),
      fight: mirror,
      title: "Defeat — the rival",
      sub: KNOCKOUT,
    },
  ]
  for (const row of cases) {
    test(row.name, () => {
      const copy = battleStampCopy({
        verdict: row.verdict,
        fight: row.fight,
        flow: "cup",
      })
      expect(copy.title).toBe(row.title)
      expect(copy.sub).toBe(row.sub)
    })
  }
})

describe("battleStampCopy — reason subline through both flows", () => {
  const cases: {
    reason: BattleResult["reason"]
    sub: string
  }[] = [
    { reason: "ko", sub: KNOCKOUT },
    { reason: "time", sub: CLOCK },
    { reason: "double_ko", sub: DOUBLE_DOWN },
  ]
  for (const flow of ["spar", "cup"] as const) {
    for (const row of cases) {
      test(`${flow} with reason ${row.reason} reads "${row.sub}"`, () => {
        const copy = battleStampCopy({
          verdict: verdict("Ember Drake", { left: 10, right: 0 }, row.reason),
          fight: distinct,
          flow,
        })
        expect(copy.sub).toBe(row.sub)
      })
    }
  }
})

describe("cupResultCopy — cup results card copy", () => {
  const cases: {
    name: string
    won: boolean
    player: string
    cupName: string
    championName: string | null
    title: string
    sub: string
  }[] = [
    {
      name: "the champion takes the cup",
      won: true,
      player: "Ember Drake",
      cupName: "Bronze Cup",
      championName: "Ember Drake",
      title: "Champion",
      sub: "Ember Drake takes the Bronze Cup!",
    },
    {
      name: "an eliminated player sees the champion take the cup",
      won: false,
      player: "Tide Axolotl",
      cupName: "Silver Cup",
      championName: "Koda",
      title: "Eliminated",
      sub: "Koda takes the Silver Cup.",
    },
    {
      name: "an eliminated player with no champion sees a quiet ending",
      won: false,
      player: "Tide Axolotl",
      cupName: "Bronze Cup",
      championName: null,
      title: "Eliminated",
      sub: "The cup ends without a champion.",
    },
  ]
  for (const row of cases) {
    test(row.name, () => {
      const copy = cupResultCopy({
        won: row.won,
        player: row.player,
        cupName: row.cupName,
        championName: row.championName,
      })
      expect(copy.title).toBe(row.title)
      expect(copy.sub).toBe(row.sub)
    })
  }
})

describe("copy results are frozen", () => {
  test("both seams return frozen objects", () => {
    const stamp = battleStampCopy({
      verdict: verdict(null),
      fight: distinct,
      flow: "spar",
    })
    const result = cupResultCopy({
      won: true,
      player: "Ember Drake",
      cupName: "Bronze Cup",
      championName: "Ember Drake",
    })
    expect(Object.isFrozen(stamp)).toBe(true)
    expect(Object.isFrozen(result)).toBe(true)
  })
})
