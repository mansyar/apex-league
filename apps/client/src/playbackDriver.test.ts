/**
 * The shared playback driver (live-cup track, Phase C): the timer chain,
 * speed toggle, reduced-motion instant dump, and slow-replay fallback that
 * spar.ts owned alone. These tests pin the contract so the cup can reuse
 * it with zero behavior drift.
 */
import { describe, expect, test } from "bun:test"
import {
  type BattleResult,
  createCreature,
  makeExhibition,
  resolveBattle,
} from "@apex/sim"
import type { PlaybackDriverHandlers, PlaybackRun } from "./playbackDriver"
import { createPlaybackDriver } from "./playbackDriver"
import type { PlaybackSpeed } from "./playbackSpeed"

/** A real resolved battle to drive: owned fire drake, seeded rival. */
function realVerdict(seed: number) {
  const creature = createCreature("fire_drake", 42)
  const setup = makeExhibition(creature, "balanced", seed)
  const verdict = resolveBattle(setup.ownedSide, setup.rivalSide, seed)
  const fight = {
    owned: {
      name: setup.ownedSide.name,
      key: setup.ownedSide.id ?? setup.ownedSide.name,
      element: setup.ownedSide.element,
      maxHp: setup.ownedSide.stats.hp,
    },
    rival: {
      name: setup.rivalSide.name,
      key: setup.rivalSide.id ?? setup.rivalSide.name,
      element: setup.rivalSide.element,
      maxHp: setup.rivalSide.stats.hp,
    },
  }
  return { fight, verdict }
}

/** Harness: collects every callback, pace collapsed to 1ms for speed. */
function harness(motionPref: () => boolean = () => false): {
  handlers: PlaybackDriverHandlers
  steps: Array<{ instant: boolean; index: number }>
  lines: string[]
  finishes: Array<{
    verdict: Readonly<BattleResult>
    replayed: boolean
    instant: boolean
  }>
  paces: number[]
  replayStarts: PlaybackRun[]
  done: Promise<void>
  waitForFinishes: (n: number) => Promise<void>
} {
  const steps: Array<{ instant: boolean; index: number }> = []
  const lines: string[] = []
  const finishes: Array<{
    verdict: Readonly<BattleResult>
    replayed: boolean
    instant: boolean
  }> = []
  const paces: number[] = []
  const replayStarts: PlaybackRun[] = []
  let waiters: Array<{ n: number; resolve: () => void }> = []
  const done = new Promise<void>((resolve) => {
    waiters.push({ n: 1, resolve })
  })
  const handlers: PlaybackDriverHandlers = {
    onStep: (step, instant) => {
      steps.push({ instant, index: steps.length })
      void step
    },
    onLine: (text) => lines.push(text),
    onReplayStart: (run) => replayStarts.push(run),
    onFinish: (info) => {
      finishes.push(info)
      const pending = waiters
      waiters = []
      for (const w of pending) {
        if (finishes.length >= w.n) w.resolve()
        else waiters.push(w)
      }
    },
    onPace: (ms) => paces.push(ms),
    motionPref,
  }
  const waitForFinishes = (n: number): Promise<void> => {
    if (finishes.length >= n) return Promise.resolve()
    return new Promise((resolve) => waiters.push({ n, resolve }))
  }
  return {
    handlers,
    steps,
    lines,
    finishes,
    paces,
    replayStarts,
    done,
    waitForFinishes,
  }
}

/** The driver paces via PLAYBACK_SPEED_MS; tests collapse it to 1-2ms. */
const TEST_PACE = (speed: PlaybackSpeed): number => (speed === "fast" ? 1 : 2)

describe("playbackDriver — reduced motion", () => {
  test("start dumps every step instantly and finishes without timers", async () => {
    const h = harness(() => true)
    const driver = createPlaybackDriver(h.handlers, { pace: TEST_PACE })
    const { fight, verdict } = realVerdict(7)
    driver.start(fight, verdict)
    // The dump is synchronous: everything is already on the table.
    expect(h.steps.length).toBe(verdict.events.length)
    expect(h.steps.every((s) => s.instant)).toBe(true)
    expect(h.lines.length).toBe(verdict.events.length)
    expect(h.finishes).toEqual([{ verdict, replayed: false, instant: true }])
    expect(h.paces).toEqual([])
    await h.done
  })

  test("replay after a reduced dump plays paced, not instant", async () => {
    let reduced = true
    const h = harness(() => reduced)
    const driver = createPlaybackDriver(h.handlers, { pace: TEST_PACE })
    const { fight, verdict } = realVerdict(7)
    driver.start(fight, verdict)
    reduced = false
    driver.replay()
    await h.waitForFinishes(2)
    expect(h.replayStarts.length).toBe(1)
    expect(h.replayStarts[0]?.fight).toEqual(fight)
    // The replay pass itself arrives non-instant.
    const replayed = h.steps.slice(verdict.events.length)
    expect(replayed.length).toBe(verdict.events.length)
    expect(replayed.every((s) => !s.instant)).toBe(true)
    expect(h.finishes).toEqual([
      { verdict, replayed: false, instant: true },
      { verdict, replayed: true, instant: true },
    ])
  })
})

describe("playbackDriver — paced runs", () => {
  test("start plays every step through the timer chain and finishes", async () => {
    const h = harness()
    const driver = createPlaybackDriver(h.handlers, { pace: TEST_PACE })
    const { fight, verdict } = realVerdict(7)
    driver.start(fight, verdict)
    await h.done
    expect(h.steps.length).toBe(verdict.events.length)
    expect(h.steps.every((s) => !s.instant)).toBe(true)
    expect(h.finishes).toEqual([{ verdict, replayed: false, instant: false }])
    // Pacing is announced once at the start (normal speed).
    expect(h.paces).toEqual([2])
  })

  test("speedToggle flips normal⇄fast and re-announces the pace", () => {
    const h = harness()
    const driver = createPlaybackDriver(h.handlers, { pace: TEST_PACE })
    expect(driver.speedToggle()).toBe("fast")
    expect(driver.speedToggle()).toBe("normal")
    expect(h.paces).toEqual([1, 2])
  })

  test("stop() cancels the chain: no more steps, no finish", async () => {
    const h = harness()
    const driver = createPlaybackDriver(h.handlers, { pace: TEST_PACE })
    const { fight, verdict } = realVerdict(7)
    driver.start(fight, verdict)
    driver.stop()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(h.steps.length).toBeLessThan(verdict.events.length)
    expect(h.finishes.length).toBe(0)
  })

  test("replay before any run is a guarded no-op", () => {
    const h = harness()
    const driver = createPlaybackDriver(h.handlers, { pace: TEST_PACE })
    driver.replay()
    expect(h.replayStarts.length).toBe(0)
    expect(h.steps.length).toBe(0)
  })
})
