/**
 * The dense playback path (FR-13, AC-13): a fight resolved in this session
 * plays as a playhead over its 50 Hz trace, with the event log speaking at
 * the tick each line belongs to, the speed pill scaling fight time, and the
 * verdict stamp landing on the same beat the paced path holds for.
 *
 * The clock is a stub so the whole fight plays in a loop, not in real time;
 * the trace is built by hand so the beats land on known steps.
 */

import { describe, expect, test } from "bun:test"
import {
  type BattleEvent,
  type BattleResult,
  createCreature,
  type FightStream,
  makeExhibition,
  rememberStream,
  resolveBattle,
  STREAM_FIELD,
  STREAM_FIELDS,
  STREAM_PHASE,
  stepIndexAt,
  streamOf,
} from "@apex/sim"
import type { DenseClock } from "./dense-runner"
import { denseSpeedFactor } from "./pacing"
import type { PlaybackFight } from "./playbackDriver"
import {
  createPlaybackDriver,
  type PlaybackDriverHandlers,
} from "./playbackDriver"

/** A clock the test drives by hand: one frame per advance, no wall time. */
function fakeClock(): {
  clock: DenseClock
  advance(ms: number): void
  pending(): number
} {
  let now = 0
  let nextId = 1
  const queued = new Map<number, () => void>()
  return {
    clock: {
      now: () => now,
      request: (fn) => {
        const id = nextId++
        queued.set(id, fn)
        return id
      },
      cancel: (handle) => {
        queued.delete(handle as number)
      },
    },
    advance(ms) {
      now += ms
      const due = [...queued.values()]
      queued.clear()
      for (const fn of due) fn()
    },
    pending: () => queued.size,
  }
}

/** The HUD-side description of both fighters. */
function fightOf(): PlaybackFight {
  return {
    owned: { name: "Ember", key: "ember", element: "fire", maxHp: 400 },
    rival: { name: "Brook", key: "brook", element: "water", maxHp: 400 },
  }
}

/** A 601-step trace whose blows land on known ticks. */
function trace(steps = 601): FightStream {
  const data = new Int16Array(steps * 2 * STREAM_FIELDS)
  for (let step = 0; step < steps; step++) {
    for (const side of [0, 1] as const) {
      const base = (step * 2 + side) * STREAM_FIELDS
      const away = side === 0 ? -1 : 1
      data[base + STREAM_FIELD.x] = away * Math.max(600, 2000 - step * 20)
      data[base + STREAM_FIELD.z] = 0
      data[base + STREAM_FIELD.facingX] = -away * 1000
      data[base + STREAM_FIELD.facingZ] = 0
      // The left side swings from step 10; the right answers from step 30.
      const swinging =
        (side === 0 && step >= 10 && step < 14) ||
        (side === 1 && step >= 30 && step < 34)
      data[base + STREAM_FIELD.phase] = swinging
        ? STREAM_PHASE.startup
        : STREAM_PHASE.none
      data[base + STREAM_FIELD.phaseT] = swinging ? (step % 4) * 80 : 0
      data[base + STREAM_FIELD.hp] =
        side === 1 ? 400 - Math.min(step, 400) : 400
      data[base + STREAM_FIELD.hitstunMs] = 0
      data[base + STREAM_FIELD.pinned] = 0
    }
  }
  return {
    steps,
    stepMs: 20,
    bounds: { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 },
    keys: ["ember", "brook"],
    data,
  }
}

/** A verdict whose log is spaced out over the trace's ticks. */
function continuous(): Readonly<BattleResult> {
  const hp = (brook: number): Record<string, number> => ({
    ember: 400,
    brook,
  })
  const events: BattleEvent[] = [
    {
      tick: 4,
      kind: "basic",
      actor: "Ember",
      actorKey: "ember",
      hpAfter: hp(400),
      line: "Ember opens with a straight.",
    },
    {
      tick: 20,
      kind: "basic",
      actor: "Ember",
      actorKey: "ember",
      hpAfter: hp(300),
      line: "Ember lands clean.",
    },
    {
      tick: 40,
      kind: "basic",
      actor: "Brook",
      actorKey: "brook",
      hpAfter: hp(260),
      line: "Brook answers.",
    },
    {
      tick: 50,
      kind: "down",
      actor: "Ember",
      actorKey: "ember",
      hpAfter: hp(0),
      line: "Ember finishes it.",
    },
  ]
  const verdict: BattleResult = {
    winner: "Ember",
    reason: "ko",
    finalHp: hp(0),
    events,
  }
  rememberStream(verdict, trace())
  return verdict
}

/** A legacy gauge-clock verdict: no dense trace exists for it. */
function legacy(): Readonly<BattleResult> {
  const setup = makeExhibition(createCreature("fire_drake", 42), "balanced", 7)
  return resolveBattle(setup.ownedSide, setup.rivalSide, 7)
}

interface Harness {
  steps: number
  lines: number
  frames: Array<{ step: number; stream: FightStream }>
  finishes: Array<{ verdict: Readonly<BattleResult>; instant: boolean }>
  paces: number[]
  start(verdict: Readonly<BattleResult>): "instant" | "paced"
}

function harness(
  clock: DenseClock,
  motionPref = () => false,
): { driver: ReturnType<typeof createPlaybackDriver>; h: Harness } {
  const h: Harness = {
    steps: 0,
    lines: 0,
    frames: [],
    finishes: [],
    paces: [],
    start(verdict) {
      return driver.start(fightOf(), verdict)
    },
  }
  const handlers: PlaybackDriverHandlers = {
    onStep: () => {
      h.steps++
    },
    onLine: () => {
      h.lines++
    },
    onFrame: (stream, step) => {
      h.frames.push({ step, stream })
    },
    onFinish: ({ verdict, instant }) => {
      h.finishes.push({ verdict, instant })
    },
    onPace: (msPerStep) => {
      h.paces.push(msPerStep)
    },
    motionPref,
  }
  const driver = createPlaybackDriver(handlers, { clock })
  return { driver, h }
}

/** Run the stub clock until the run finishes (or the guard trips). */
function play(clock: ReturnType<typeof fakeClock>, h: Harness): void {
  for (let i = 0; i < 5000 && h.finishes.length === 0; i++) clock.advance(100)
}

describe("the dense path", () => {
  test("plays the trace and finishes on the same verdict", () => {
    const clock = fakeClock()
    const { h } = harness(clock.clock)
    const verdict = continuous()
    expect(streamOf(verdict)).toBeDefined()
    expect(h.start(verdict)).toBe("paced")

    // The opening pose is drawn before the first frame, and the dense path
    // announces no step pace: the stream owns the pacing.
    expect(h.frames.length).toBe(1)
    expect(h.frames[0]?.step).toBe(0)
    expect(h.paces).toEqual([])

    play(clock, h)
    expect(h.finishes.length).toBe(1)
    expect(h.finishes[0]?.verdict).toBe(verdict)
    expect(h.finishes[0]?.instant).toBe(false)

    // The playhead only moves forward and ends on the recorded end.
    for (let i = 1; i < h.frames.length; i++) {
      const now = h.frames[i]?.step ?? -1
      const before = h.frames[i - 1]?.step ?? -1
      expect(now).toBeGreaterThanOrEqual(before)
    }
    expect(h.frames[h.frames.length - 1]?.step).toBe(trace().steps - 1)
    // Every log line and its step were spoken exactly once.
    expect(h.lines).toBe(verdict.events.length)
    expect(h.steps).toBe(verdict.events.length)
  })

  test("the log speaks at the tick each line belongs to", () => {
    const clock = fakeClock()
    const { h } = harness(clock.clock)
    const verdict = continuous()
    h.start(verdict)
    // Two seconds of fight time: the first two beats are in, the rest are not.
    for (let i = 0; i < 20; i++) clock.advance(100)
    const step = h.frames[h.frames.length - 1]?.step ?? 0
    const spoken = verdict.events.filter((event) => event.tick <= step).length
    expect(h.lines).toBe(spoken)
    expect(spoken).toBeGreaterThan(0)
  })

  test("the telegraph data is on the wire: startup frames reach the arena", () => {
    const clock = fakeClock()
    const { h } = harness(clock.clock)
    const verdict = continuous()
    h.start(verdict)
    play(clock, h)
    const stream = streamOf(verdict)
    if (!stream) throw new Error("no trace")
    const seen = new Set<number>()
    for (let step = 0; step < stream.steps; step++) {
      for (const side of [0, 1] as const) {
        seen.add(stream.data[(step * 2 + side) * STREAM_FIELDS + 4] as number)
      }
    }
    expect(seen.has(STREAM_PHASE.startup)).toBe(true)
    // And the arena was handed frames throughout, not just at the end.
    expect(h.frames.length).toBeGreaterThan(20)
  })

  test("fast-forward scales fight time, not the log", () => {
    const clock = fakeClock()
    const { driver, h } = harness(clock.clock)
    h.start(continuous())
    expect(denseSpeedFactor("fast")).toBeCloseTo(900 / 140)

    // At normal speed a 100 ms frame covers five steps.
    const start = h.frames[h.frames.length - 1]?.step ?? 0
    clock.advance(100)
    const normal = (h.frames[h.frames.length - 1]?.step ?? 0) - start
    expect(normal).toBe(5)

    driver.speedToggle()
    const before = h.frames[h.frames.length - 1]?.step ?? 0
    clock.advance(100)
    const fast = (h.frames[h.frames.length - 1]?.step ?? 0) - before
    // 6.4× wall time, so the same frame covers six times the fight.
    expect(fast).toBeGreaterThan(normal * 5)
    // The log still speaks in order, once per event.
    expect(h.lines).toBeLessThanOrEqual(4)
  })

  test("a hidden tab holds the playhead and resumes where it stood", () => {
    const clock = fakeClock()
    const { driver, h } = harness(clock.clock)
    h.start(continuous())
    clock.advance(100)
    clock.advance(100)
    const held = h.frames[h.frames.length - 1]?.step ?? 0
    driver.setPaused(true)
    const atPause = h.frames.length
    for (let i = 0; i < 10; i++) clock.advance(100)
    expect(h.frames.length).toBe(atPause)
    driver.setPaused(false)
    clock.advance(100)
    expect(h.frames[h.frames.length - 1]?.step ?? 0).toBeGreaterThanOrEqual(
      held,
    )
    expect(clock.pending()).toBe(1)
  })

  test("reduced motion still dumps the fight instantly", () => {
    const clock = fakeClock()
    const { h } = harness(clock.clock, () => true)
    const verdict = continuous()
    expect(h.start(verdict)).toBe("instant")
    expect(h.finishes.length).toBe(1)
    expect(h.finishes[0]?.instant).toBe(true)
    // No stream frames: the text path is the whole fight.
    expect(h.frames).toEqual([])
    expect(h.lines).toBe(verdict.events.length)
    expect(h.steps).toBe(verdict.events.length)
  })

  test("a verdict with no trace falls back to the paced step path", () => {
    const clock = fakeClock()
    const { driver, h } = harness(clock.clock)
    const verdict = legacy()
    expect(streamOf(verdict)).toBeUndefined()
    expect(h.start(verdict)).toBe("paced")
    // The legacy path announces its step pace and draws no frames; the
    // dense path never announces a pace. The first beat is still a timer.
    expect(h.paces.length).toBe(1)
    expect(h.frames).toEqual([])
    expect(h.steps).toBe(0)
    driver.stop()
  })

  test("the playhead never runs past the recording", () => {
    const stream = trace()
    expect(stepIndexAt(stream, Number.MAX_SAFE_INTEGER)).toBe(stream.steps - 1)
  })
})
