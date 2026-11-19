/**
 * The incremental fight driver is the resolver cut at a step boundary (FR-3):
 * identical seeds and orders replay identically, and its snapshots use the
 * existing dense stream rather than a second visual protocol.
 */

import { describe, expect, test } from "bun:test"
import {
  type BattleSide,
  DOCTRINE_IDS,
  readFrame,
  STREAM_FIELDS,
  STREAM_PHASE,
  type StreamFrame,
  streamOf,
} from "../battle"
import { createLiveFight } from "./fight"
import type { LiveIntent } from "./types"

function side(name: string, id: string): BattleSide {
  return {
    name,
    id,
    element: "fire",
    stats: { hp: 80, atk: 10, def: 8, spd: 10 },
    kit: ["basic", "spark", "flare_dart"],
    tactic: "balanced",
    temperament: "rush",
  }
}

const NONE: readonly [LiveIntent | null, LiveIntent | null] = [null, null]

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

function play(seed: number, steps: number, order: LiveIntent | null = null) {
  const fight = createLiveFight({
    seed,
    sides: [side("Ember", "host"), side("Brook", "guest")],
  })
  for (let i = 0; i < steps && !fight.over; i++) {
    fight.step([order, order])
  }
  return fight
}

describe("the incremental live fight", () => {
  test("steps at 20 ms and opens on the arena's starting posts", () => {
    const fight = createLiveFight({
      seed: 7,
      sides: [side("Ember", "host"), side("Brook", "guest")],
    })
    expect(fight.stepCount).toBe(0)
    const opening = fight.snapshot()
    expect(opening.steps).toBe(1)
    expect(opening.stepMs).toBe(20)
    expect(readFrame(opening, 0, 0, blank()).x).toBe(2000)
    expect(readFrame(opening, 0, 1, blank()).x).toBe(-2000)
  })

  test("a snapshot is one dense frame per side", () => {
    const fight = play(7, 10)
    const stream = fight.snapshot()
    expect(stream.data.length).toBe(2 * STREAM_FIELDS)
    expect(stream.keys).toEqual(["host", "guest"])
  })

  test("identical seeds and orders replay identically", () => {
    const left = play(7, 40)
    const right = play(7, 40)
    expect(left.stepCount).toBe(40)
    expect(Array.from(left.snapshot().data)).toEqual(
      Array.from(right.snapshot().data),
    )
    expect(left.outcome().result.finalHp).toEqual(
      right.outcome().result.finalHp,
    )
  })

  test("a different seed plays a different fight", () => {
    const seven = play(7, 40).snapshot()
    const eight = play(8, 40).snapshot()
    expect(Array.from(seven.data)).not.toEqual(Array.from(eight.data))
  })

  test("high-level orders steer without breaking the step contract", () => {
    const doctrine = DOCTRINE_IDS[0]
    if (!doctrine) throw new Error("no doctrines are defined")
    const steered = play(7, 20, {
      doctrine,
      triggers: ["basic"],
    })
    expect(steered.stepCount).toBe(20)
    expect(steered.snapshot().data.length).toBe(2 * STREAM_FIELDS)
  })

  test("the outcome carries the dense trace with the result", () => {
    const fight = play(7, 40)
    while (!fight.over && fight.stepCount < 2000) fight.step(NONE)
    const outcome = fight.outcome()
    expect(streamOf(outcome.result)).toBeDefined()
    expect(["ko", "double_ko", "time"]).toContain(outcome.reason)
  })
})
