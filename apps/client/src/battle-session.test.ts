import { describe, expect, test } from "bun:test"
import type { BattleResult } from "@apex/sim"
import {
  createFinishHold,
  cupStampTitle,
  sparStampTitle,
  type TimerPort,
} from "./battle-session"
import type { PlaybackFight } from "./playbackDriver"

const fight: PlaybackFight = {
  owned: { name: "Ember Drake", key: "left", element: "fire", maxHp: 40 },
  rival: { name: "Tide Axolotl", key: "right", element: "water", maxHp: 44 },
}
const mirror: PlaybackFight = {
  owned: { name: "Ember Drake", key: "left", element: "fire", maxHp: 40 },
  rival: { name: "Ember Drake", key: "right", element: "fire", maxHp: 40 },
}

const verdict = (winner: string | null): BattleResult =>
  ({
    winner,
    finalHp: { left: 10, right: 0 },
  }) as unknown as BattleResult

/** Fake timer port: recorded, manually fired. */
function fakeTimers(): TimerPort & {
  fire(): void
  advanceAll(): void
  pending: number
} {
  const jobs: { fn: () => void }[] = []
  let next = 0
  return {
    set(fn) {
      const token = next++
      jobs[token] = { fn }
      return token
    },
    clear(handle) {
      delete jobs[handle as number]
    },
    fire() {
      const idx = jobs.findIndex(Boolean)
      if (idx === -1) return
      const job = jobs[idx]
      delete jobs[idx]
      if (job) job.fn()
    },
    advanceAll() {
      const fns: (() => void)[] = []
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i]
        if (job) fns.push(job.fn)
        delete jobs[i]
      }
      for (const fn of fns) fn()
    },
    get pending() {
      return jobs.filter(Boolean).length
    },
  }
}

describe("createFinishHold", () => {
  test("runs the exit exactly once after the hold", () => {
    const timers = fakeTimers()
    const hold = createFinishHold(timers)
    let runs = 0
    hold.begin(() => {
      runs += 1
    }, 2200)
    expect(hold.pending()).toBe(true)
    timers.advanceAll()
    expect(runs).toBe(1)
    expect(hold.pending()).toBe(false)
  })

  test("cancel drops a pending hold without running it", () => {
    const timers = fakeTimers()
    const hold = createFinishHold(timers)
    let runs = 0
    hold.begin(() => {
      runs += 1
    }, 900)
    hold.cancel()
    expect(hold.pending()).toBe(false)
    timers.advanceAll()
    expect(runs).toBe(0)
  })

  test("a second begin supersedes the first (clear-then-set)", () => {
    const timers = fakeTimers()
    const hold = createFinishHold(timers)
    const ran: string[] = []
    hold.begin(() => ran.push("first"), 2200)
    hold.begin(() => ran.push("second"), 2200)
    timers.advanceAll()
    expect(ran).toEqual(["second"])
  })
})

describe("sparStampTitle", () => {
  test("draws read as a drawn spar", () => {
    expect(sparStampTitle(verdict(null), fight)).toBe("A drawn spar")
  })

  test("plain fights name the winner", () => {
    expect(sparStampTitle(verdict("Ember Drake"), fight)).toBe(
      "Victory — Ember Drake",
    )
  })

  test("mirror matches qualify the winner by side", () => {
    expect(sparStampTitle(verdict("Ember Drake"), mirror)).toBe(
      "Victory — your Ember Drake",
    )
    const rivalWon = verdict("Ember Drake")
    expect(
      sparStampTitle(rivalWon, {
        ...mirror,
        owned: { ...mirror.owned, key: "right" },
        rival: { ...mirror.rival, key: "left" },
      }),
    ).toBe("Victory — rival Ember Drake")
  })

  test("without fight context the title still names the winner", () => {
    expect(sparStampTitle(verdict("Ember Drake"), null)).toBe(
      "Victory — Ember Drake",
    )
  })
})

describe("cupStampTitle", () => {
  test("draws read plainly", () => {
    expect(cupStampTitle(verdict(null), fight)).toBe("A draw")
  })

  test("non-mirror matches read victory or defeat", () => {
    expect(cupStampTitle(verdict("Ember Drake"), fight)).toBe("Victory")
    expect(cupStampTitle(verdict("Tide Axolotl"), fight)).toBe("Defeat")
  })

  test("mirror matches qualify by side", () => {
    expect(cupStampTitle(verdict("Ember Drake"), mirror)).toBe(
      "Victory — your fighter",
    )
  })
})
