/**
 * The dense state stream (Continuous Arena Battle FR-13, AC-13).
 *
 * The continuous engine steps at 50 Hz, so a 25-40 s fight is 1,250-2,000
 * steps. That is the replay the client needs to draw a fight that never
 * snaps between poses: one small integer record per side per step, played
 * back at `STEP_MS` scaled by the speed pill.
 *
 * What is stored is only what the renderer cannot derive: where each body
 * stands (millimetres, `y` always 0 — FR-17 pins the floor), which way it
 * faces, which attack window it is in and how far through it, its hit
 * points, the hitstun it is holding, and whether knockback has it pinned to
 * the fence. Gait, lean, bob, breathing and the topple are animation and
 * stay in the client's fighter driver; nothing here bakes a pose.
 *
 * The layout is a flat `Int16Array`, interleaved `[step][side][field]`, so a
 * full fight is ~72 KB and every read is an index — no per-frame objects.
 * Values fit comfortably: positions are ±4,000 mm, facing is ±1,000
 * (`DIR_SCALE`), phase progress is 0-255, and hit points are in the
 * hundreds.
 *
 * The stream rides alongside the `BattleResult` in a `WeakMap` keyed by the
 * result object rather than as a field on it: a result is carried inside
 * cup verdicts, and those are serialised into the save. The map keeps the
 * trace in memory for the arena that just resolved the fight, and a
 * restored or replayed pre-track verdict simply has no stream — the client
 * then falls back to the legacy step playback it has always used.
 */

import { FRAME_DATA } from "../frames"
import type { BattleResult } from "../resolver"
import type { PinnedReport } from "./advance"
import {
  type ArenaBounds,
  type AttackState,
  type FightState,
  STEP_MS,
} from "./types"

/** How many numbers each side contributes to one step. */
export const STREAM_FIELDS = 9

/** Field order inside a side's record. */
export const STREAM_FIELD = Object.freeze({
  /** Body position, millimetres (`y` is always 0). */
  x: 0,
  z: 1,
  /** Facing direction, in `DIR_SCALE` units. */
  facingX: 2,
  facingZ: 3,
  /** `StreamPhase`. */
  phase: 4,
  /** Progress through the current phase, 0-255. */
  phaseT: 5,
  /** Hit points remaining. */
  hp: 6,
  /** Hitstun still to serve, ms. */
  hitstunMs: 7,
  /** 1 while knockback holds the body against the fence. */
  pinned: 8,
} as const)

/** The attack window a body is in, as the stream stores it. */
export const STREAM_PHASE = Object.freeze({
  none: 0,
  startup: 1,
  active: 2,
  recovery: 3,
} as const)

export type StreamPhase = (typeof STREAM_PHASE)[keyof typeof STREAM_PHASE]

/** One side's readable state at one step. */
export interface StreamFrame {
  x: number
  z: number
  facingX: number
  facingZ: number
  phase: StreamPhase
  /** 0-255 through the current phase; 0 when there is no attack. */
  phaseT: number
  hp: number
  hitstunMs: number
  pinned: boolean
}

/** A resolved fight's dense trace, ready to play back. */
export interface FightStream {
  /** Recorded steps, including the opening state at index 0. */
  readonly steps: number
  /** Milliseconds of fight time per step. */
  readonly stepMs: number
  /** The fence the fight was played inside, in millimetres. */
  readonly bounds: ArenaBounds
  /** Both sides' stable keys, in fight order. */
  readonly keys: readonly [string, string]
  /** Interleaved `[step][side][field]`, `STREAM_FIELDS` per side. */
  readonly data: Int16Array
}

const PHASE_OF: Readonly<Record<AttackState["phase"], StreamPhase>> =
  Object.freeze({
    startup: STREAM_PHASE.startup,
    active: STREAM_PHASE.active,
    recovery: STREAM_PHASE.recovery,
  })

/** How far through its own window an attack is, 0-255. */
function phaseProgress(attack: AttackState): number {
  const row = FRAME_DATA[attack.moveId]
  if (!row) return 0
  const duration =
    attack.phase === "startup"
      ? row.startupMs
      : attack.phase === "active"
        ? row.activeMs
        : row.recoveryMs
  if (duration <= 0) return 0
  return Math.min(255, Math.round((attack.elapsedMs / duration) * 255))
}

/** True when this side was held against the fence this step. */
function pinnedThisStep(
  pinned: readonly PinnedReport[] | undefined,
  key: string,
): boolean {
  if (!pinned) return false
  for (const report of pinned) {
    if (report.key === key) return true
  }
  return false
}

/** Collects the per-step records while a fight runs. */
export interface StreamRecorder {
  /** Record one state (the opening state first, then each advanced step). */
  push(state: FightState, pinned?: readonly PinnedReport[]): void
  /** The finished stream; safe to call more than once. */
  finish(): FightStream
}

/**
 * A recorder sized for one fight. `capacity` is the number of steps the
 * fight may run, plus the opening frame (see `FIGHT_CAP_STEPS + 1`). Pass
 * `first` to record the opening pose right away.
 */
export function createStreamRecorder(
  keys: readonly [string, string],
  bounds: ArenaBounds,
  capacity: number,
  first?: FightState,
): StreamRecorder {
  const data = new Int16Array(capacity * 2 * STREAM_FIELDS)
  let steps = 0

  const record = (state: FightState, pinned?: readonly PinnedReport[]) => {
    if (steps >= capacity) return
    for (const side of [0, 1] as const) {
      const fighter = state.fighters[side]
      const attack = fighter.attack
      const base = (steps * 2 + side) * STREAM_FIELDS
      data[base + STREAM_FIELD.x] = fighter.pos.x
      data[base + STREAM_FIELD.z] = fighter.pos.z
      data[base + STREAM_FIELD.facingX] = fighter.facing.x
      data[base + STREAM_FIELD.facingZ] = fighter.facing.z
      data[base + STREAM_FIELD.phase] = attack
        ? PHASE_OF[attack.phase]
        : STREAM_PHASE.none
      data[base + STREAM_FIELD.phaseT] = attack ? phaseProgress(attack) : 0
      data[base + STREAM_FIELD.hp] = fighter.hp
      data[base + STREAM_FIELD.hitstunMs] = Math.round(fighter.hitstunMs)
      data[base + STREAM_FIELD.pinned] = pinnedThisStep(pinned, fighter.key)
        ? 1
        : 0
    }
    steps++
  }

  if (first) record(first)
  return {
    push: record,
    finish() {
      return { steps, stepMs: STEP_MS, bounds, keys, data }
    },
  }
}

/**
 * One side's frame at `step`, written into `out` (reused by the render loop,
 * so playback allocates nothing per frame). `step` is clamped to the
 * recorded range, which keeps a frame at the very end readable.
 */
export function readFrame(
  stream: FightStream,
  step: number,
  side: 0 | 1,
  out: StreamFrame,
): StreamFrame {
  const at = Math.max(0, Math.min(stream.steps - 1, Math.trunc(step)))
  const base = (at * 2 + side) * STREAM_FIELDS
  const data = stream.data
  out.x = data[base + STREAM_FIELD.x] as number
  out.z = data[base + STREAM_FIELD.z] as number
  out.facingX = data[base + STREAM_FIELD.facingX] as number
  out.facingZ = data[base + STREAM_FIELD.facingZ] as number
  out.phase = data[base + STREAM_FIELD.phase] as StreamPhase
  out.phaseT = data[base + STREAM_FIELD.phaseT] as number
  out.hp = data[base + STREAM_FIELD.hp] as number
  out.hitstunMs = data[base + STREAM_FIELD.hitstunMs] as number
  out.pinned = data[base + STREAM_FIELD.pinned] !== 0
  return out
}

/** The step a playhead at `elapsedMs` of fight time stands on. */
export function stepIndexAt(stream: FightStream, elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0
  return Math.min(stream.steps - 1, Math.floor(elapsedMs / stream.stepMs))
}

/**
 * The traces of results resolved in this session, keyed by the result
 * object. A `WeakMap` so a dropped verdict drops its stream with it, and so
 * nothing about a `BattleResult` changes for the save, the goldens, or any
 * other consumer.
 */
const traces = new WeakMap<BattleResult, FightStream>()

/** Attach a fight's trace to the result it belongs to, and return it. */
export function rememberStream<T extends BattleResult>(
  result: T,
  stream: FightStream,
): T {
  traces.set(result, stream)
  return result
}

/**
 * The dense trace for a result, when it was resolved in this session.
 * `undefined` for a verdict rebuilt from a save or a legacy replay — the
 * caller then plays the event log the old way.
 */
export function streamOf(
  result: Readonly<BattleResult>,
): FightStream | undefined {
  return traces.get(result as BattleResult)
}
