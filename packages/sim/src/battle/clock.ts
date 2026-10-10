/**
 * Action clock: gauges, turn order, range, and immediate melee resolution.
 * Scripted actions only — tactics arrive in a later phase and projectiles
 * extend this stepper. Pure and deterministic.
 *
 * Cooldown semantics, pinned by the moves tests: the gate is checked before
 * the fighter's action, the entry steps after it. A newly used special is
 * set after the step, so it blocks exactly the move's next N actions.
 */

import type { CreatureStats, Element } from "../creature"
import { makeRng } from "../rng"
import { strikeDamage } from "./damage"
import type { MoveDef } from "./moves"
import { BASIC_MOVE, getMove, stepCooldown } from "./moves"

/** A fighter snapshot: identity plus battle stats. No conditions, no stage. */
export interface BattleFighter {
  readonly name: string
  readonly element: Element
  readonly stats: CreatureStats
}

/** Distance on the arena floor: `far` to start, `near` after a close. */
export type Range = "far" | "near"

/** A fighter mid-fight: snapshot plus live hp, range, gauge, and cooldowns. */
export interface ClockFighter {
  readonly name: string
  readonly element: Element
  readonly stats: CreatureStats
  /** Current hit points; a fighter at 0 or below never acts again. */
  readonly hp: number
  readonly range: Range
  /** Accumulated action gauge; the fighter acts once it reaches 12. */
  readonly gauge: number
  /** Remaining own-action cooldowns keyed by move id. */
  readonly cooldowns: Readonly<Record<string, number>>
}

/** One scripted choice for an acting fighter. */
export type PlannedAction =
  | { readonly kind: "close" }
  | { readonly kind: "hold" }
  | { readonly kind: "basic" }
  | { readonly kind: "special"; readonly moveId: string }

/** Injected decision hook: returns what the acting fighter does this action. */
export type PlanFn = (
  fighter: Readonly<ClockFighter>,
  opponent: Readonly<ClockFighter>,
) => PlannedAction

export const HOLD = Object.freeze({
  kind: "hold",
} as const) satisfies PlannedAction
export const CLOSE = Object.freeze({
  kind: "close",
} as const) satisfies PlannedAction
export const BASIC = Object.freeze({
  kind: "basic",
} as const) satisfies PlannedAction

export type BattleEventKind = "close" | "hold" | "basic" | "down"

/** One announcer-visible beat of the fight. Later phases add more kinds. */
export interface BattleEvent {
  readonly tick: number
  readonly kind: BattleEventKind
  /** The acting fighter; for a `down` event, the fighter that went down. */
  readonly actor: string
  /** The receiving fighter, where relevant. */
  readonly target?: string
  readonly moveId?: string
  readonly damage?: number
  readonly hit?: boolean
  /** Why a hit flag is false; set by the projectile phase. */
  readonly missReason?: "accuracy" | "dodge"
  /** Both fighters' HP right after the event. */
  readonly hpAfter: Readonly<Record<string, number>>
  /** One present-tense announcer sentence. */
  readonly line: string
}

/** What one tick produced. The resolver reads events and HP to rule endings. */
export interface TickOutcome {
  readonly events: readonly BattleEvent[]
}

/** The tick stepper for one exhibition. Mutates only its own run state. */
export interface Clock {
  /** The tick number of the most recent `advance`, 0 before it runs. */
  readonly tick: number
  readonly fighters: readonly ClockFighter[]
  advance(plan: PlanFn): TickOutcome
}

interface RunFighter {
  readonly name: string
  readonly element: Element
  readonly stats: CreatureStats
  hp: number
  range: Range
  gauge: number
  cooldowns: Map<string, number>
}

function view(f: RunFighter): ClockFighter {
  return {
    name: f.name,
    element: f.element,
    stats: f.stats,
    hp: f.hp,
    range: f.range,
    gauge: f.gauge,
    cooldowns: Object.freeze(Object.fromEntries(f.cooldowns)),
  }
}

/** A stable, seed-derived hash for one name (FNV-1a over UTF-16 units). */
function nameHash(name: string): number {
  let hash = 2166136261
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * The equal-SPD tie order for one fight, drawn once from the battle seed so
 * same-SPD fighters keep the same relative order every tick.
 */
export function createTieOrder(
  seed: number,
  fighters: readonly BattleFighter[],
): readonly string[] {
  const ranked = fighters.map((f) => ({
    name: f.name,
    priority: makeRng((seed >>> 0) ^ nameHash(f.name)).next(),
  }))
  ranked.sort((a, b) => a.priority - b.priority)
  return ranked.map((r) => r.name)
}

/** A fresh fighter: full HP, far, empty gauge, nothing on cooldown. */
export function createClockFighter(fighter: BattleFighter): ClockFighter {
  return {
    name: fighter.name,
    element: fighter.element,
    stats: fighter.stats,
    hp: fighter.stats.hp,
    range: "far",
    gauge: 0,
    cooldowns: Object.freeze({}),
  }
}

export function createClock(
  initial: readonly ClockFighter[],
  tieOrder: readonly string[],
): Clock {
  const run = initial.map((f) => ({
    name: f.name,
    element: f.element,
    stats: f.stats,
    hp: f.hp,
    range: f.range,
    gauge: f.gauge,
    cooldowns: new Map(Object.entries(f.cooldowns)),
  }))
  const tieIndex = new Map(tieOrder.map((name, i) => [name, i]))
  let tick = 0

  const hpAfter = (): Readonly<Record<string, number>> =>
    Object.freeze(Object.fromEntries(run.map((f) => [f.name, f.hp])))

  return {
    get tick() {
      return tick
    },
    get fighters() {
      return run.map(view)
    },
    advance(plan) {
      tick += 1
      for (const f of run) f.gauge += f.stats.spd

      const ready = [...run]
        .filter((f) => f.gauge >= 12)
        .sort((a, b) => {
          if (b.stats.spd !== a.stats.spd) return b.stats.spd - a.stats.spd
          const ia = tieIndex.get(a.name) ?? run.length
          const ib = tieIndex.get(b.name) ?? run.length
          return ia - ib
        })

      const events: BattleEvent[] = []
      for (const actor of ready) {
        if (actor.hp <= 0) continue
        const opponent = run.find((f) => f !== actor)
        if (!opponent) throw new Error("The battle needs two fighters")
        const action = plan(view(actor), view(opponent))

        // Legality first: an illegal plan must not spend the gauge.
        let usedSpecial: MoveDef | undefined
        if (action.kind === "close" && actor.range === "near") {
          throw new Error(`${actor.name} is already near`)
        }
        if (action.kind === "basic" && actor.range !== "near") {
          throw new Error(`The basic strike needs near: ${actor.name} is far`)
        }
        if (action.kind === "special") {
          const move = getMove(action.moveId)
          if (!move) throw new Error(`Unknown move: ${action.moveId}`)
          if (move.id === BASIC_MOVE.id) {
            throw new Error(
              "The basic strike is innate and cannot be fired as a special",
            )
          }
          const remaining = actor.cooldowns.get(move.id) ?? 0
          if (remaining > 0) {
            throw new Error(`${move.displayName} is on cooldown`)
          }
          usedSpecial = move
        }

        actor.gauge -= 12

        switch (action.kind) {
          case "hold":
            events.push({
              tick,
              kind: "hold",
              actor: actor.name,
              hpAfter: hpAfter(),
              line: `${actor.name} hesitates.`,
            })
            break
          case "close":
            actor.range = "near"
            events.push({
              tick,
              kind: "close",
              actor: actor.name,
              hpAfter: hpAfter(),
              line: `${actor.name} closes in.`,
            })
            break
          case "basic": {
            const damage = strikeDamage(
              BASIC_MOVE.power,
              actor.stats.atk,
              opponent.stats.def,
              1,
              1,
              true,
            )
            opponent.hp -= damage
            events.push({
              tick,
              kind: "basic",
              actor: actor.name,
              target: opponent.name,
              moveId: BASIC_MOVE.id,
              damage,
              hit: true,
              hpAfter: hpAfter(),
              line: `${actor.name} strikes ${opponent.name} for ${damage}.`,
            })
            if (opponent.hp <= 0) {
              events.push({
                tick,
                kind: "down",
                actor: opponent.name,
                hpAfter: hpAfter(),
                line: `${opponent.name} is down!`,
              })
            }
            break
          }
          case "special":
            // The launch/impact events arrive with the projectile phase.
            break
        }

        // After the action: step every tracked cooldown, then apply a newly
        // used special's full cooldown so it blocks exactly its next N actions.
        for (const [id, remaining] of actor.cooldowns) {
          actor.cooldowns.set(id, stepCooldown(remaining))
        }
        if (usedSpecial) {
          actor.cooldowns.set(usedSpecial.id, usedSpecial.cooldown)
        }
      }

      return { events }
    },
  }
}
