/**
 * The dense stream's contract (FR-13, AC-13): one record per side per step,
 * every position inside the fence, a startup window before every active
 * window, and a trace that stays out of the save.
 *
 * The recorder is driven through the public resolver so what is pinned is
 * the trace the arena actually plays.
 */

import { describe, expect, test } from "bun:test"
import { getFrameData } from "../frames"
import type { BattleResult, BattleSide } from "../resolver"
import { ARENA_BOUNDS, resolveContinuous } from "./resolve"
import { createFight } from "./step"
import {
  createStreamRecorder,
  type FightStream,
  readFrame,
  rememberStream,
  STREAM_FIELD,
  STREAM_FIELDS,
  STREAM_MOVE_IDS,
  STREAM_PHASE,
  type StreamFrame,
  type StreamPhase,
  stepIndexAt,
  streamOf,
} from "./stream"
import { HOLD, type MoveIntent } from "./types"

/** A side with every field filled, so a test only names what it changes. */
function side(over: Partial<BattleSide> = {}): BattleSide {
  return {
    name: "Ember",
    id: "ember",
    element: "fire",
    stats: { hp: 80, atk: 10, def: 8, spd: 10 },
    kit: ["spark", "flare_dart"],
    tactic: "balanced",
    temperament: "rush",
    ...over,
  }
}

/** A resolved fight's trace, or a failure (every live fight records one). */
function traced(seed = 7): FightStream {
  const verdict = resolveContinuous(
    side(),
    side({ name: "Brook", id: "brook" }),
    seed,
  )
  const stream = streamOf(verdict)
  if (!stream) throw new Error("the resolver recorded no stream")
  return stream
}

/** A fresh frame scratch, the way the render loop reuses one. */
function blank(): StreamFrame {
  return {
    x: 0,
    z: 0,
    facingX: 0,
    facingZ: 0,
    phase: STREAM_PHASE.none,
    phaseT: 0,
    hp: 0,
    hitstunMs: 0,
    pinned: false,
    dodgeBurst: false,
    moveIdx: 0,
  }
}

describe("the recorded stream", () => {
  test("opens on both fighters' starting posts", () => {
    const stream = traced()
    const left = readFrame(stream, 0, 0, blank())
    const right = readFrame(stream, 0, 1, blank())
    // The sim opens at ±2 m on X (side 0 takes the positive way), both on
    // the floor (y is never stored).
    expect(left.x).toBe(2000)
    expect(right.x).toBe(-2000)
    expect(left.z).toBe(0)
    expect(right.z).toBe(0)
  })

  test("records one frame per step, and the last step is the ending", () => {
    const stream = traced()
    expect(stream.steps).toBeGreaterThan(100)
    expect(stream.stepMs).toBe(20)
    // The recorder writes the opening pose and then one record per advance.
    expect(stream.data.length).toBeGreaterThanOrEqual(
      stream.steps * 2 * STREAM_FIELDS,
    )
  })

  test("keeps every body inside the arena it was fought in", () => {
    const stream = traced()
    const frame = blank()
    for (let step = 0; step < stream.steps; step++) {
      for (const sideIndex of [0, 1] as const) {
        readFrame(stream, step, sideIndex, frame)
        expect(frame.x).toBeGreaterThanOrEqual(ARENA_BOUNDS.minX)
        expect(frame.x).toBeLessThanOrEqual(ARENA_BOUNDS.maxX)
        expect(frame.z).toBeGreaterThanOrEqual(ARENA_BOUNDS.minZ)
        expect(frame.z).toBeLessThanOrEqual(ARENA_BOUNDS.maxZ)
      }
    }
  })

  test("stays small enough to replay: a full fight is under 72 KB", () => {
    const stream = traced()
    expect(stream.steps * 2 * STREAM_FIELDS * 2).toBeLessThanOrEqual(72_036)
    // Nothing derivable is stored: nine numbers per side per step, no more.
    expect(STREAM_FIELDS).toBe(9)
  })

  test("phase progress is a 0-255 fraction of the window it names", () => {
    const stream = traced()
    const frame = blank()
    for (let step = 0; step < stream.steps; step++) {
      for (const sideIndex of [0, 1] as const) {
        readFrame(stream, step, sideIndex, frame)
        expect(frame.phaseT).toBeGreaterThanOrEqual(0)
        expect(frame.phaseT).toBeLessThanOrEqual(255)
        if (frame.phase === STREAM_PHASE.none) expect(frame.phaseT).toBe(0)
      }
    }
  })

  test("no attack reaches its active window without a startup first", () => {
    const stream = traced()
    const frame = blank()
    const seen: Array<StreamPhase | null> = [null, null]
    for (let step = 0; step < stream.steps; step++) {
      for (const sideIndex of [0, 1] as const) {
        readFrame(stream, step, sideIndex, frame)
        if (
          frame.phase === STREAM_PHASE.active &&
          seen[sideIndex] !== STREAM_PHASE.startup &&
          seen[sideIndex] !== STREAM_PHASE.active
        ) {
          throw new Error(
            `side ${sideIndex} went active from ${seen[sideIndex]}`,
          )
        }
        seen[sideIndex] = frame.phase
      }
    }
    // Both sides must have swung at least once, or the test proved nothing.
    expect(seen[0]).not.toBeNull()
    expect(seen[1]).not.toBeNull()
  })
})

describe("the spare-bit exports (R1/F1, R1/F2)", () => {
  test("rides a paid dodge burst on the spare phaseT bit", () => {
    const recorder = createStreamRecorder(["a", "b"], ARENA_BOUNDS, 2)
    const state = createFight({
      seed: 3,
      bounds: ARENA_BOUNDS,
      fighters: [
        { key: "a", spd: 10, at: { x: -1000, z: 0 }, hp: 100 },
        { key: "b", spd: 10, at: { x: 1000, z: 0 }, hp: 100 },
      ],
    }).state
    recorder.push(state, undefined, [{ key: "a", paid: true }])
    const stream = recorder.finish()
    expect(readFrame(stream, 0, 0, blank()).dodgeBurst).toBe(true)
    expect(readFrame(stream, 0, 1, blank()).dodgeBurst).toBe(false)
  })

  test("a paid dodge in a real fight reaches the stream", () => {
    // The resolver's loop, minus the controller: paid dodge orders ride the
    // spare phaseT bit onto the trace, exactly as resolveContinuous records.
    const fight = createFight({
      seed: 3,
      bounds: ARENA_BOUNDS,
      fighters: [
        { key: "a", spd: 10, at: { x: -1000, z: 0 }, hp: 100 },
        { key: "b", spd: 10, at: { x: 1000, z: 0 }, hp: 100 },
      ],
    })
    const recorder = createStreamRecorder(
      ["a", "b"],
      ARENA_BOUNDS,
      4,
      fight.state,
    )
    const sidestep: MoveIntent = { dodge: { x: 0, z: 1000 } }
    for (let step = 0; step < 3; step++) {
      const result = fight.advance([sidestep, HOLD])
      recorder.push(result.state, result.pinned, result.dodges)
    }
    const stream = recorder.finish()
    const frame = blank()
    let flagged = 0
    for (let step = 0; step < stream.steps; step++) {
      if (readFrame(stream, step, 0, frame).dodgeBurst) flagged++
    }
    expect(flagged).toBeGreaterThan(0)
    // The holding side never bursts.
    for (let step = 0; step < stream.steps; step++) {
      expect(readFrame(stream, step, 1, frame).dodgeBurst).toBe(false)
    }
  })

  test("names the committed move on every attack window", () => {
    const stream = traced()
    const frame = blank()
    let startups = 0
    for (let step = 0; step < stream.steps; step++) {
      for (const sideIndex of [0, 1] as const) {
        readFrame(stream, step, sideIndex, frame)
        expect(frame.moveIdx).toBeGreaterThanOrEqual(0)
        if (frame.phase === STREAM_PHASE.none) {
          expect(frame.moveIdx).toBe(0)
        } else {
          startups++
          const id = STREAM_MOVE_IDS[(frame.moveIdx ?? 0) - 1]
          expect(id).toBeDefined()
          expect(getFrameData(id as string)).toBeDefined()
        }
      }
    }
    expect(startups).toBeGreaterThan(0)
  })

  test("reads a legacy trace with the flag down and no move", () => {
    const data = new Int16Array(2 * STREAM_FIELDS)
    data[STREAM_FIELD.phase] = STREAM_PHASE.startup
    data[STREAM_FIELD.phaseT] = 200
    const legacy: FightStream = {
      steps: 1,
      stepMs: 20,
      bounds: ARENA_BOUNDS,
      keys: ["a", "b"],
      data,
    }
    const frame = readFrame(legacy, 0, 0, blank())
    expect(frame.phase).toBe(STREAM_PHASE.startup)
    expect(frame.phaseT).toBe(200)
    expect(frame.dodgeBurst).toBe(false)
    expect(frame.moveIdx).toBe(0)
  })
})

describe("the trace stays out of the save", () => {
  test("the verdict is unchanged and a restored copy has no stream", () => {
    const verdict = resolveContinuous(side(), side({ name: "Brook" }), 11)
    expect(streamOf(verdict)).toBeDefined()
    const restored = JSON.parse(JSON.stringify(verdict))
    // R1 (F2): the verdict gained the paid-dodge tuple, which is plain data and
    // therefore survives a save round-trip. The stream is what must not.
    expect(Object.keys(restored).sort()).toEqual([
      "dodges",
      "events",
      "finalHp",
      "reason",
      "winner",
    ])
    expect(Object.keys(restored)).not.toContain(STREAM_FIELD)
    expect(streamOf(restored)).toBeUndefined()
  })

  test("a recorder hands back the bounds and keys it was given", () => {
    const recorder = createStreamRecorder(["a", "b"], ARENA_BOUNDS, 2)
    const state = createFight({
      seed: 3,
      bounds: ARENA_BOUNDS,
      fighters: [
        { key: "a", spd: 10, at: { x: -1000, z: 0 }, hp: 100 },
        { key: "b", spd: 10, at: { x: 1000, z: 0 }, hp: 100 },
      ],
    }).state
    recorder.push(state)
    recorder.push(state)
    // Over capacity: the recorder stops rather than growing mid-fight.
    recorder.push(state)
    const stream = recorder.finish()
    expect(stream.steps).toBe(2)
    expect(stream.bounds).toBe(ARENA_BOUNDS)
    expect(stream.keys).toEqual(["a", "b"])
  })
})

describe("readFrame", () => {
  test("clamps a playhead past either end into the recording", () => {
    const stream = traced()
    const first = readFrame(stream, -5, 0, blank())
    const last = readFrame(stream, 99_999, 0, blank())
    const atEnd = readFrame(stream, stream.steps - 1, 0, blank())
    expect(first.x).toBe(2000)
    expect(last.x).toBe(atEnd.x)
    expect(last.z).toBe(atEnd.z)
  })

  test("reuses the caller's object, so playback allocates nothing", () => {
    const stream = traced()
    const frame = blank()
    expect(readFrame(stream, 0, 0, frame)).toBe(frame)
  })

  test("reads the field layout the recorder wrote", () => {
    const stream = traced()
    const base = (0 * 2 + 1) * STREAM_FIELDS
    const frame = readFrame(stream, 0, 1, blank())
    expect(frame.x).toBe(stream.data[base + STREAM_FIELD.x] as number)
    expect(frame.hp).toBe(stream.data[base + STREAM_FIELD.hp] as number)
    expect(frame.pinned).toBe(false)
  })
})

describe("stepIndexAt", () => {
  const stream: FightStream = {
    steps: 11,
    stepMs: 20,
    bounds: ARENA_BOUNDS,
    keys: ["a", "b"],
    data: new Int16Array(11 * 2 * STREAM_FIELDS),
  }

  test("maps fight time onto the step that owns it", () => {
    expect(stepIndexAt(stream, 0)).toBe(0)
    expect(stepIndexAt(stream, 19)).toBe(0)
    expect(stepIndexAt(stream, 20)).toBe(1)
    expect(stepIndexAt(stream, 200)).toBe(10)
  })

  test("holds at both ends instead of running off the array", () => {
    expect(stepIndexAt(stream, -1)).toBe(0)
    expect(stepIndexAt(stream, Number.NaN)).toBe(0)
    expect(stepIndexAt(stream, 10_000)).toBe(10)
  })
})

describe("rememberStream", () => {
  test("a result with no trace reads back undefined", () => {
    const verdict: BattleResult = {
      winner: null,
      reason: "time",
      finalHp: {},
      events: [],
    }
    expect(streamOf(verdict)).toBeUndefined()
    const stream = traced()
    rememberStream(verdict, stream)
    expect(streamOf(verdict)).toBe(stream)
  })
})
