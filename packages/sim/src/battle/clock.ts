/**
 * Action clock: gauges, turn order, range, melee, and projectile travel.
 * Scripted actions only — tactics arrive in a later phase. Pure and
 * deterministic given the seed.
 *
 * Cooldown semantics, pinned by the moves tests: the gate is checked before
 * the fighter's action, the entry steps after it. A newly used special is
 * set after the step, so it blocks exactly the move's next N actions.
 *
 * Projectile semantics (spec FR4): a far special launches on the acting
 * tick and impacts as the first step of the next tick; a point-blank
 * special resolves during the acting tick. At impact the accuracy roll
 * `0-99 < accuracy` runs first; a standing target consumes no dodge roll.
 * A target that closed between launch and impact then rolls
 * `0-99 < min(70, 20 + spd * 3)` against its own SPD. An impact step with
 * several shots in flight resolves all of them in launch order (spec FR8
 * revision 2026-10-10); the fight is judged after the whole step, so a
 * same-step double down is reachable. Shots still airborne after the
 * judgment are discarded.
 */

import type { CreatureStats, Element } from "../creature"
import { makeRng, type Rng } from "../rng"
import { typeFactor } from "./chart"
import { strikeDamage } from "./damage"
import type { MoveDef } from "./moves"
import { BASIC_MOVE, getMove, stepCooldown } from "./moves"

/** A fighter snapshot: identity plus battle stats. No conditions, no stage. */
export interface BattleFighter {
  readonly name: string
  /**
   * Stable side key used for hp snapshots and tie-order maps. Display
   * names alone cannot distinguish a mirror match (rival rolled the
   * same species), so keyed data must never trust the name.
   */
  readonly id?: string
  readonly element: Element
  readonly stats: CreatureStats
}

/** The stable map key for a fighter: its side id, else its display name. */
export function fighterKey(f: {
  readonly id?: string
  readonly name: string
}): string {
  return f.id ?? f.name
}

/** Distance on the arena floor: `far` to start, `near` after a close. */
export type Range = "far" | "near"

/** A fighter mid-fight: snapshot plus live hp, range, gauge, and cooldowns. */
export interface ClockFighter {
  readonly name: string
  /** The stable side key; see BattleFighter.id. */
  readonly id?: string
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

export type BattleEventKind =
  | "close"
  | "hold"
  | "basic"
  | "down"
  | "launch"
  | "impact"
  | "time"
  | "draw"

/** One announcer-visible beat of the fight. */
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
  /** Why a hit flag is false: `accuracy` or `dodge`. */
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
  readonly id?: string
  readonly element: Element
  readonly stats: CreatureStats
  hp: number
  range: Range
  gauge: number
  cooldowns: Map<string, number>
}

/** A special already in the air, awaiting the first step of the next tick. */
interface FlyingShot {
  readonly shooter: RunFighter
  readonly target: RunFighter
  readonly move: MoveDef
  /** The target's range when the shot launched; closure during travel dodges. */
  readonly targetRangeAtLaunch: Range
}

function view(f: RunFighter): ClockFighter {
  return {
    name: f.name,
    id: f.id,
    element: f.element,
    stats: f.stats,
    hp: f.hp,
    range: f.range,
    gauge: f.gauge,
    cooldowns: Object.freeze(Object.fromEntries(f.cooldowns)),
  }
}

/** A stable, seed-derived hash for one fighter key (FNV-1a over UTF-16). */
function keyHash(key: string): number {
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Dodge chance against a target that closed while a shot was in flight. */
function dodgePercent(spd: number): number {
  return Math.min(70, 20 + spd * 3)
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
    key: fighterKey(f),
    priority: makeRng((seed >>> 0) ^ keyHash(fighterKey(f))).next(),
  }))
  ranked.sort((a, b) => a.priority - b.priority)
  return ranked.map((r) => r.key)
}

/** A fresh fighter: full HP, far, empty gauge, nothing on cooldown. */
export function createClockFighter(fighter: BattleFighter): ClockFighter {
  return {
    name: fighter.name,
    id: fighter.id,
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
  seed: number,
): Clock {
  const run = initial.map((f) => ({
    name: f.name,
    id: f.id,
    element: f.element,
    stats: f.stats,
    hp: f.hp,
    range: f.range,
    gauge: f.gauge,
    cooldowns: new Map(Object.entries(f.cooldowns)),
  }))
  const tieIndex = new Map(tieOrder.map((key, i) => [key, i]))
  const rng: Rng = makeRng(seed >>> 0)
  /** Shots in the air, in launch order; at most one per fighter at a time. */
  const shots: FlyingShot[] = []
  let tick = 0

  const hpAfter = (): Readonly<Record<string, number>> =>
    Object.freeze(Object.fromEntries(run.map((f) => [fighterKey(f), f.hp])))

  /** Resolve one shot's accuracy, dodge, damage, and down events. */
  const resolveShot = (shot: FlyingShot, events: BattleEvent[]): void => {
    const { shooter, target, move } = shot
    if (Math.floor(rng.next() * 100) >= move.accuracy) {
      events.push({
        tick,
        kind: "impact",
        actor: shooter.name,
        target: target.name,
        moveId: move.id,
        damage: 0,
        hit: false,
        missReason: "accuracy",
        hpAfter: hpAfter(),
        line: `${move.displayName} misses ${target.name}.`,
      })
      return
    }
    // A dodge is only possible when the target closed during travel.
    if (shot.targetRangeAtLaunch === "far" && target.range === "near") {
      if (Math.floor(rng.next() * 100) < dodgePercent(target.stats.spd)) {
        events.push({
          tick,
          kind: "impact",
          actor: shooter.name,
          target: target.name,
          moveId: move.id,
          damage: 0,
          hit: false,
          missReason: "dodge",
          hpAfter: hpAfter(),
          line: `${target.name} slips in. ${move.displayName} misses.`,
        })
        return
      }
    }
    const type = typeFactor(shooter.element, target.element)
    const damage = strikeDamage(
      move.power,
      shooter.stats.atk,
      target.stats.def,
      type.num,
      type.den,
      true,
    )
    target.hp -= damage
    events.push({
      tick,
      kind: "impact",
      actor: shooter.name,
      target: target.name,
      moveId: move.id,
      damage,
      hit: true,
      hpAfter: hpAfter(),
      line: `${move.displayName} hits ${target.name} for ${damage}.`,
    })
    if (target.hp <= 0) {
      events.push({
        tick,
        kind: "down",
        actor: target.name,
        hpAfter: hpAfter(),
        line: `${target.name} is down!`,
      })
    }
  }

  return {
    get tick() {
      return tick
    },
    get fighters() {
      return run.map(view)
    },
    advance(plan) {
      tick += 1
      const events: BattleEvent[] = []

      // First step of the tick: every in-flight shot launched on the
      // previous tick, in launch order. All of them resolve against the
      // pre-step HP, and the judgment happens after the whole step (FR8).
      const wasDown = run.some((f) => f.hp <= 0)
      while (shots.length > 0) {
        const shot = shots.shift()
        if (!shot) break
        resolveShot(shot, events)
      }
      if (!wasDown && run.some((f) => f.hp <= 0)) {
        shots.length = 0
        return { events }
      }

      for (const f of run) f.gauge += f.stats.spd

      const ready = [...run]
        .filter((f) => f.gauge >= 12)
        .sort((a, b) => {
          if (b.stats.spd !== a.stats.spd) return b.stats.spd - a.stats.spd
          const ia = tieIndex.get(fighterKey(a)) ?? run.length
          const ib = tieIndex.get(fighterKey(b)) ?? run.length
          return ia - ib
        })

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
            opponent.range = "near"
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
          case "special": {
            if (!usedSpecial) break
            if (actor.range === "far") {
              shots.push({
                shooter: actor,
                target: opponent,
                move: usedSpecial,
                targetRangeAtLaunch: opponent.range,
              })
              events.push({
                tick,
                kind: "launch",
                actor: actor.name,
                target: opponent.name,
                moveId: usedSpecial.id,
                hpAfter: hpAfter(),
                line: `${actor.name} looses a ${usedSpecial.displayName}!`,
              })
            } else {
              // Point-blank: no travel, so the target can never have moved.
              resolveShot(
                {
                  shooter: actor,
                  target: opponent,
                  move: usedSpecial,
                  targetRangeAtLaunch: "near",
                },
                events,
              )
            }
            break
          }
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
