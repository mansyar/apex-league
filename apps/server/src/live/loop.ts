/**
 * The authoritative match loop (FR-3, AC-3): it turns 20 Hz high-level intents
 * into 50 Hz sim steps and 20 Hz dense-stream snapshots, then emits exactly one
 * verdict. The clock and transport are injected, so tests use only fakes — no
 * timers, ports, network calls or background work (NFR-6).
 */

import {
  type BattleSide,
  createLiveFight,
  LIVE_PROTOCOL_VERSION,
  type LiveFight,
  type LiveIntent,
  type SeatIndex,
  type SnapshotMessage,
  STEP_MS,
  type VerdictMessage,
} from "@apex/sim"
import type { TrainerIdentity } from "./room"

export interface LiveClock {
  now(): number
}

export interface MatchTransport {
  send(message: SnapshotMessage | VerdictMessage): void
}

export interface MatchLoopConfig {
  readonly code: string
  readonly seed: number
  readonly sides: readonly [BattleSide, BattleSide]
  readonly identities: readonly [TrainerIdentity, TrainerIdentity]
  readonly clock: LiveClock
  readonly transport: MatchTransport
}

export interface MatchLoop {
  /** Record a strictly increasing per-seat order; false when stale. */
  intent(seat: SeatIndex, seq: number, intent: LiveIntent): boolean
  /** Bring the sim and its snapshot stream up to the clock's current time. */
  pump(): void
  /** End the match now because a seat disconnected. */
  forfeit(seat: SeatIndex): void
  readonly finished: boolean
  readonly stepCount: number
  readonly snapshotCount: number
  readonly staleIntents: number
  readonly verdictCount: number
}

/** Client orders arrive at 20 Hz; one background-throttled client cannot starve the sim. */
export const INTENT_INTERVAL_MS = 50
/** Snapshots go out at 20 Hz over the same dense stream the renderer already reads. */
export const SNAPSHOT_INTERVAL_MS = 50

export function createMatchLoop(config: MatchLoopConfig): MatchLoop {
  const fight: LiveFight = createLiveFight({
    seed: config.seed,
    sides: config.sides,
  })
  const startMs = config.clock.now()
  const orders: [LiveIntent | null, LiveIntent | null] = [null, null]
  const lastSeq: [number, number] = [-1, -1]
  let stepsSent = 0
  let snapshotsSent = 0
  let cadenceSent = 0
  let bootstrapped = false
  let staleIntents = 0
  let verdictCount = 0
  let finished = false

  function sendSnapshot(): void {
    const message: SnapshotMessage = {
      v: LIVE_PROTOCOL_VERSION,
      kind: "snapshot",
      code: config.code,
      step: fight.stepCount,
      elapsedMs: fight.elapsedMs,
      stream: fight.snapshot(),
    }
    config.transport.send(message)
    snapshotsSent++
  }

  function sendVerdict(
    reason: VerdictMessage["reason"],
    winnerSeat: SeatIndex | null,
    result: VerdictMessage["result"],
  ): void {
    config.transport.send({
      v: LIVE_PROTOCOL_VERSION,
      kind: "verdict",
      code: config.code,
      reason,
      winnerSeat,
      result,
    })
    verdictCount++
    finished = true
  }

  return {
    intent(seat: SeatIndex, seq: number, intent: LiveIntent): boolean {
      if (finished) return false
      if (!Number.isInteger(seq) || seq < 0) return false
      if (seq <= lastSeq[seat]) {
        staleIntents++
        return false
      }
      lastSeq[seat] = seq
      orders[seat] = intent
      return true
    },

    pump(): void {
      if (finished) return
      // The client waits for its first frame before starting the intent timer,
      // and there is no production timer. The opening pump must therefore send
      // the step-0 frame or neither side will ever move (20 Hz starts here).
      if (!bootstrapped) {
        bootstrapped = true
        sendSnapshot()
      }
      const elapsed = Math.max(0, config.clock.now() - startMs)
      const targetSteps = Math.floor(elapsed / STEP_MS)
      while (stepsSent < targetSteps && !fight.over) {
        fight.step(orders)
        stepsSent++
      }

      const due = Math.floor(elapsed / SNAPSHOT_INTERVAL_MS)
      const targetSnapshots = fight.over
        ? Math.min(due, Math.floor(fight.elapsedMs / SNAPSHOT_INTERVAL_MS))
        : due
      // The bootstrap frame is not part of the timed cadence; counting it
      // separately keeps the terminal cap from emitting a duplicate frame.
      while (cadenceSent < targetSnapshots && !finished) {
        sendSnapshot()
        cadenceSent++
      }

      if (fight.over && !finished) {
        const outcome = fight.outcome()
        sendVerdict(outcome.reason, outcome.winnerSeat, outcome.result)
      }
    },

    forfeit(seat: SeatIndex): void {
      if (finished) return
      const winnerSeat: SeatIndex = seat === 0 ? 1 : 0
      sendVerdict("forfeit", winnerSeat, null)
    },

    get finished(): boolean {
      return finished
    },

    get stepCount(): number {
      return stepsSent
    },

    get snapshotCount(): number {
      return snapshotsSent
    },

    get staleIntents(): number {
      return staleIntents
    },

    get verdictCount(): number {
      return verdictCount
    },
  }
}
