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
  PLAYBACK_PHASES,
  type PlaybackStep,
  resolveBattle,
} from "@apex/sim"
import type { PlaybackDriverHandlers, PlaybackRun } from "./playbackDriver"
import {
  createPlaybackDriver,
  dilatedPace,
  KO_DILATION,
} from "./playbackDriver"
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
  seen: PlaybackStep[]
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
  const seen: PlaybackStep[] = []
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
      seen.push(step)
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
    seen,
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
    // Pacing: announced once at the start (normal speed), raised for the
    // terminal KO beat (FR8 dilation), restored at the finish.
    expect(h.paces).toEqual([2, 5, 2])
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

describe("playbackDriver — enriched playback contract (FR3)", () => {
  test("enriched step fields pass through untouched in paced runs and reduced dumps", async () => {
    for (const reduced of [false, true]) {
      const h = harness(() => reduced)
      const driver = createPlaybackDriver(h.handlers, { pace: TEST_PACE })
      const { fight, verdict } = realVerdict(7)
      driver.start(fight, verdict)
      await h.waitForFinishes(1)
      expect(h.seen.length).toBe(verdict.events.length)
      for (const step of h.seen) {
        expect(step.phases).toEqual(PLAYBACK_PHASES[step.kind])
        if ((step.kind === "melee" || step.kind === "impact") && step.hit) {
          expect(step.reaction).toBeDefined()
        }
        if (step.missReason === "dodge") {
          expect(step.dodgeDirection).toBeDefined()
        }
      }
      const down = h.seen.find((s) => s.kind === "down")
      if (down) expect(down.ko).toBe(true)
    }
  })

  describe("playbackDriver - time-dilated final blow (FR8)", () => {
    for (const reduced of [false, true]) {
      test(`the terminal KO step dilates the pacing around it (reduced=${reduced})`, async () => {
        const h = harness(() => reduced)
        const driver = createPlaybackDriver(h.handlers, { pace: TEST_PACE })
        const { fight, verdict } = realVerdict(22)
        driver.start(fight, verdict)
        await h.waitForFinishes(1)

        // The pure pacing contract: a KO step stretches the base wait.
        expect(KO_DILATION).toBeGreaterThan(1)
        expect(dilatedPace(900, false)).toBe(900)
        expect(dilatedPace(900, true)).toBe(Math.round(900 * KO_DILATION))
        expect(dilatedPace(140, true)).toBe(Math.round(140 * KO_DILATION))

        if (reduced) {
          // The instant dump has no timers, so no dilation calls happen.
          expect(h.paces).toEqual([])
          return
        }
        // start announces the base pace exactly once...
        expect(h.paces[0]).toBe(2)
        // ...the KO beat raises the live pace to base * KO_DILATION...
        expect(h.paces).toContain(5)
        // ...and the pace returns to base after the KO beat.
        expect(h.paces[h.paces.length - 1]).toBe(2)
        // Only one dilation ramp up (the KO step) and one ramp down.
        expect(h.paces.filter((p) => p === 5)).toHaveLength(1)
      })
    }
  })
})
