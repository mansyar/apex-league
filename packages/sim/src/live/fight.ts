/**
 * An incrementally stepped live fight (FR-3). The resolver already knows how
 * to run a whole fight; this is the same decision/commit/advance/recorder
 * pipeline cut at step boundaries so a server can drive it from an intent
 * feed. High-level orders steer the controller profile and try move triggers;
 * positional steering stays deferred (owner decision 2026-11-19).
 */

import type {
  BattleEvent,
  BattleReason,
  BattleResult,
  BattleSide,
  DoctrineId,
} from "../battle"
import {
  type ControllerProfile,
  type ControllerState,
  createController,
  DOCTRINES,
  decide,
  profileForDoctrine,
} from "../battle/continuous/controller"
import { hpSnapshot, type Sides, stepEvents } from "../battle/continuous/report"
import {
  ARENA_BOUNDS,
  downEnding,
  engagementFor,
  FIGHT_CAP_STEPS,
  initFor,
  pointsWinner,
} from "../battle/continuous/resolve"
import { createFight, type Fight } from "../battle/continuous/step"
import {
  createStreamRecorder,
  type FightStream,
  rememberStream,
  type StreamRecorder,
} from "../battle/continuous/stream"
import { HOLD, type MoveIntent } from "../battle/continuous/types"
import type { LiveIntent, SeatIndex } from "./types"

export interface LiveFightConfig {
  readonly seed: number
  readonly sides: readonly [BattleSide, BattleSide]
}

export interface LiveFightOutcome {
  readonly result: BattleResult
  readonly winnerSeat: SeatIndex | null
  readonly reason: BattleReason
}

export interface LiveFight {
  /** Advance exactly one 20 ms sim step with the latest high-level orders. */
  step(orders: readonly [LiveIntent | null, LiveIntent | null]): void
  /** A one-step dense stream of the current state — the visual contract. */
  snapshot(): FightStream
  /** The terminal verdict with the accumulated dense trace attached. */
  outcome(): LiveFightOutcome
  readonly over: boolean
  readonly stepCount: number
  readonly elapsedMs: number
}

function fighterKey(side: BattleSide): string {
  return side.id ?? side.name
}

function fightKeys(sides: LiveFightConfig["sides"]): [string, string] {
  const first = fighterKey(sides[0])
  const second = fighterKey(sides[1])
  return [first, first === second ? `${second}#1` : second]
}

/** Open one fight. No clock, transport or DOM is consulted. */
export function createLiveFight(config: LiveFightConfig): LiveFight {
  const { seed, sides } = config
  const keys = fightKeys(sides)
  const names = [sides[0].name, sides[1].name] as [string, string]
  const reporting: Sides = { names, keys }
  const fight: Fight = createFight({
    seed,
    bounds: ARENA_BOUNDS,
    fighters: [initFor(sides[0], keys[0], 0), initFor(sides[1], keys[1], 1)],
  })
  const brains: [ControllerState, ControllerState] = [
    createController(),
    createController(),
  ]
  const defaults: [ControllerProfile, ControllerProfile] = [
    engagementFor(sides[0].temperament, sides[0].tactic, sides[0].doctrine),
    engagementFor(sides[1].temperament, sides[1].tactic, sides[1].doctrine),
  ]
  const kits: [readonly string[], readonly string[]] = [
    sides[0].kit,
    sides[1].kit,
  ]
  const poiseDealt: [number, number] = [0, 0]
  const dodges: [number, number] = [0, 0]
  const downed = new Set<number>()
  const events: BattleEvent[] = []
  const recorder: StreamRecorder = createStreamRecorder(
    keys,
    ARENA_BOUNDS,
    FIGHT_CAP_STEPS + 1,
    fight.state,
  )

  function profileFor(
    side: 0 | 1,
    intent: LiveIntent | null,
  ): ControllerProfile {
    const doctrine: DoctrineId | null = intent?.doctrine ?? null
    if (doctrine === null || !(doctrine in DOCTRINES)) return defaults[side]
    return profileForDoctrine(DOCTRINES[doctrine], sides[side].temperament)
  }

  function sideOf(key: string): 0 | 1 {
    return fight.state.fighters[0].key === key ? 0 : 1
  }

  return {
    step(orders: readonly [LiveIntent | null, LiveIntent | null]): void {
      const before = fight.state
      const intents: [MoveIntent, MoveIntent] = [HOLD, HOLD]
      for (const side of [0, 1] as const) {
        const order = orders[side] ?? null
        let committed = false
        for (const trigger of order?.triggers ?? []) {
          if (fight.commit(side, trigger)) {
            committed = true
            break
          }
        }
        const decision = decide(
          {
            state: before,
            side,
            controller: brains[side],
            profile: profileFor(side, order),
            kit: kits[side],
            rule: sides[side].rule,
          },
          fight.rng,
        )
        brains[side] = decision.state
        intents[side] = decision.intent
        if (!committed && decision.commit) fight.commit(side, decision.commit)
      }

      const result = fight.advance(intents)
      for (const dodge of result.dodges) {
        if (dodge.paid) dodges[sideOf(dodge.key)] += 1
      }
      for (const strike of result.strikes) {
        poiseDealt[sideOf(strike.attackerKey)] += strike.poiseDamage
      }
      for (const shot of result.shots) {
        if (shot.outcome === "hit") {
          poiseDealt[sideOf(shot.ownerKey)] += shot.poiseDamage
        }
      }
      events.push(...stepEvents(result, reporting, before, downed))
      recorder.push(result.state, result.pinned, result.dodges)
    },

    snapshot(): FightStream {
      return createStreamRecorder(keys, ARENA_BOUNDS, 1, fight.state).finish()
    },

    outcome(): LiveFightOutcome {
      const state = fight.state
      let ending = downEnding(state)
      if (!ending) {
        const side = pointsWinner(state, poiseDealt, seed)
        ending = { side, reason: "time" }
        events.push({
          tick: state.step,
          kind: "time",
          actor: names[side],
          actorKey: keys[side],
          hpAfter: hpSnapshot(state, keys),
          line: `Time's up. ${names[side]} is still standing.`,
        })
      } else if (ending.reason === "double_ko") {
        events.push({
          tick: state.step,
          kind: "draw",
          actor: names[0],
          actorKey: keys[0],
          hpAfter: hpSnapshot(state, keys),
          line: "Both fighters are down. The spar is a draw.",
        })
      }
      const result: BattleResult = {
        winner: ending.side === null ? null : names[ending.side],
        reason: ending.reason,
        finalHp: hpSnapshot(state, keys),
        events,
        dodges,
      }
      return {
        result: rememberStream(result, recorder.finish()),
        winnerSeat: ending.side,
        reason: ending.reason,
      }
    },

    get over(): boolean {
      return (
        downEnding(fight.state) !== null || fight.state.step >= FIGHT_CAP_STEPS
      )
    },

    get stepCount(): number {
      return fight.state.step
    },

    get elapsedMs(): number {
      return fight.state.elapsedMs
    },
  }
}
