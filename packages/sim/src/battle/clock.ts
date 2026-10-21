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
 *
 * Stagger semantics (battle-animation-overhaul spec FR2): a hit dealing
 * >= STAGGER_DAMAGE_FRACTION of the victim's max HP — or a
 * super-effective hit that also clears STAGGER_SE_FRACTION — staggers a
 * standing victim. The victim's next action window is consumed reeling (a `stagger` event, gauge spent, no
 * action planned); cooldowns do not step during it. Downing blows never
 * stagger and the lock never stacks, and a fighter cannot be staggered
 * again until STAGGER_GRACE_TICKS have passed since the trigger (the
 * recovered fighter always gets to act). The same heavy blow also knocks
 * both fighters apart when the victim was in melee range (a `knockback`
 * event, both ranges to far) — re-engaging costs each side a closing
 * action; the separation is not grace-gated; against an already-far
 * victim it is a silent no-op.
 */

import type { CreatureStats, Element } from "../creature"
import { makeRng, type Rng } from "../rng"
import { incomingTypeFactor, type TypeFactor } from "./chart"
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
  /**
   * Secondary type affinity (save v20); absent for rivals, bosses, and any
   * pre-v20 source. Only the incoming (defender-side) shot math reads it.
   */
  readonly affinity?: Element | null
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

/**
 * The typeless multiplier: the innate Strike carries no element, so it never
 * reads the type chart. Passing this to the shared heavy-hit rule is what
 * keeps a super-effective victim from earning the lighter SE stagger floor.
 */
const TYPELESS: TypeFactor = Object.freeze({ num: 1, den: 1 })

/**
 * What every event carries beyond the fields the clock fills in for it: the
 * beat-specific line, plus any optional detail (`target`, `moveId`,
 * `damage`, `hit`, `missReason`, `reaction`).
 */
type EventBody = Omit<
  BattleEvent,
  "tick" | "kind" | "actor" | "actorKey" | "hpAfter"
>

/**
 * Stagger threshold (battle-animation-overhaul spec FR2, tunable): a
 * single hit dealing at least this fraction of the victim's max HP
 * staggers it, whatever the type chart says.
 */
export const STAGGER_DAMAGE_FRACTION = 0.35

/**
 * Super-effective stagger floor (FR2, tunable): a super-effective hit
 * must ALSO deal at least this fraction of the victim's max HP to
 * stagger — a light type-chart chip no longer locks a fighter.
 */
export const STAGGER_SE_FRACTION = 0.15

/**
 * Stagger grace (FR2, tunable): ticks that must pass after a stagger
 * trigger before the same fighter can be staggered again. Kills the
 * chain-lock death spiral: a recovered fighter always gets to act.
 */
export const STAGGER_GRACE_TICKS = 3

/** A fighter mid-fight: snapshot plus live hp, range, gauge, and cooldowns. */
export interface ClockFighter {
  readonly name: string
  /** The stable side key; see BattleFighter.id. */
  readonly id?: string
  readonly element: Element
  readonly affinity?: Element | null
  readonly stats: CreatureStats
  /** Current hit points; a fighter at 0 or below never acts again. */
  readonly hp: number
  readonly range: Range
  /** Accumulated action gauge; the fighter acts once it reaches 12. */
  readonly gauge: number
  /** Remaining own-action cooldowns keyed by move id. */
  readonly cooldowns: Readonly<Record<string, number>>
  /**
   * True while the fighter owes a stagger recovery: its next action
   * window is consumed reeling instead of acting.
   */
  readonly staggered: boolean
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
  | "stagger"
  | "knockback"
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
  /**
   * The acting fighter's stable side key (`id ?? name`) — display names
   * alone cannot distinguish mirror matches (two "Ember Drake"s), so
   * client-side actor mapping keys off this when present.
   */
  readonly actorKey?: string
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
  /**
   * Additive playback hint (battle-animation-overhaul FR3), set only on
   * heavy landing blows: the victim's non-down reaction — reeling where
   * it stands, or being knocked out of melee range. The `down` reaction
   * is derived by the playback contract from the adjacent down event.
   */
  readonly reaction?: "stagger" | "knockback"
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
  readonly affinity?: Element | null
  readonly stats: CreatureStats
  /** Tick of the last stagger trigger; grace counts from here. */
  lastStaggerTick: number
  hp: number
  range: Range
  gauge: number
  cooldowns: Map<string, number>
  staggered: boolean
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
    affinity: f.affinity,
    stats: f.stats,
    hp: f.hp,
    range: f.range,
    gauge: f.gauge,
    cooldowns: Object.freeze(Object.fromEntries(f.cooldowns)),
    staggered: f.staggered,
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
    affinity: fighter.affinity,
    stats: fighter.stats,
    hp: fighter.stats.hp,
    range: "far",
    gauge: 0,
    cooldowns: Object.freeze({}),
    staggered: false,
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
    affinity: f.affinity,
    stats: f.stats,
    hp: f.hp,
    range: f.range,
    gauge: f.gauge,
    cooldowns: new Map(Object.entries(f.cooldowns)),
    staggered: f.staggered,
    lastStaggerTick: Number.NEGATIVE_INFINITY,
  }))
  const tieIndex = new Map(tieOrder.map((key, i) => [key, i]))
  const rng: Rng = makeRng(seed >>> 0)
  /** Shots in the air, in launch order; at most one per fighter at a time. */
  const shots: FlyingShot[] = []
  let tick = 0

  const hpAfter = (): Readonly<Record<string, number>> =>
    Object.freeze(Object.fromEntries(run.map((f) => [fighterKey(f), f.hp])))

  /**
   * Push one announcer beat. The tick, the actor's identity, and the
   * post-step HP snapshot are the same on every event in the game — the
   * clock knows them, so no call site repeats them.
   */
  const pushEvent = (
    events: BattleEvent[],
    kind: BattleEventKind,
    actor: RunFighter,
    body: EventBody,
  ): void => {
    events.push({
      tick,
      kind,
      actor: actor.name,
      actorKey: fighterKey(actor),
      hpAfter: hpAfter(),
      ...body,
    })
  }

  /**
   * Land one hit and apply the whole heavy-hit rule to it — the single
   * implementation behind both the projectile `impact` path and the melee
   * `basic` path (battle-sim-consolidation FR1).
   *
   * A heavy hit staggers a standing victim (FR2): heavy means the damage
   * crosses the fraction floor, or a super-effective blow that also clears
   * its own (lighter) floor. The victim's next action window is consumed
   * reeling. A downing blow never staggers, an already-staggered victim
   * never re-locks (one lock, never stacked), and the grace window keeps a
   * freshly recovered fighter acting. A heavy blow against a NEAR victim
   * also knocks BOTH fighters apart (range-shifting knockback): re-engaging
   * costs each side a closing action, and the separation itself is NOT
   * grace-gated — spacing stays dynamic even when the reel is suppressed.
   * A far victim has nothing to shift — the knockback is a silent no-op.
   *
   * The reaction hint advertises the ACTUAL outcome, not the raw heaviness:
   * a grace-blocked blow must not promise a reel the client never sees.
   *
   * `type` is the attacker's type factor against the victim, and callers pass
   * it explicitly: the projectile path reads the chart, the innate Strike
   * passes {@link TYPELESS}.
   */
  const landHit = (
    events: BattleEvent[],
    attacker: RunFighter,
    victim: RunFighter,
    damage: number,
    type: TypeFactor,
    hit: {
      readonly kind: "basic" | "impact"
      readonly moveId: string
      readonly line: string
    },
  ): void => {
    victim.hp -= damage
    const heavy =
      victim.hp > 0 &&
      (damage >= victim.stats.hp * STAGGER_DAMAGE_FRACTION ||
        (type.num > type.den &&
          damage >= victim.stats.hp * STAGGER_SE_FRACTION))
    // The lock applies only through the grace gate.
    const staggers =
      heavy &&
      !victim.staggered &&
      tick - victim.lastStaggerTick >= STAGGER_GRACE_TICKS
    const knockedBack = heavy && victim.range === "near"
    if (heavy) {
      if (staggers) {
        victim.staggered = true
        victim.lastStaggerTick = tick
      }
      if (knockedBack) {
        victim.range = "far"
        attacker.range = "far"
      }
    }
    pushEvent(events, hit.kind, attacker, {
      target: victim.name,
      moveId: hit.moveId,
      damage,
      hit: true,
      line: hit.line,
      reaction: knockedBack ? "knockback" : staggers ? "stagger" : undefined,
    })
    if (knockedBack) {
      pushEvent(events, "knockback", victim, {
        line: `${victim.name} is knocked back.`,
      })
    }
    if (victim.hp <= 0) {
      pushEvent(events, "down", victim, { line: `${victim.name} is down!` })
    }
  }

  /** Resolve one shot's accuracy, dodge, damage, and down events. */
  const resolveShot = (shot: FlyingShot, events: BattleEvent[]): void => {
    const { shooter, target, move } = shot
    if (Math.floor(rng.next() * 100) >= move.accuracy) {
      pushEvent(events, "impact", shooter, {
        target: target.name,
        moveId: move.id,
        damage: 0,
        hit: false,
        missReason: "accuracy",
        line: `${move.displayName} misses ${target.name}.`,
      })
      return
    }
    // A dodge is only possible when the target closed during travel.
    if (shot.targetRangeAtLaunch === "far" && target.range === "near") {
      if (Math.floor(rng.next() * 100) < dodgePercent(target.stats.spd)) {
        pushEvent(events, "impact", shooter, {
          target: target.name,
          moveId: move.id,
          damage: 0,
          hit: false,
          missReason: "dodge",
          line: `${target.name} slips in. ${move.displayName} misses.`,
        })
        return
      }
    }
    const type = incomingTypeFactor(
      shooter.element,
      target.element,
      target.affinity ?? null,
    )
    const damage = strikeDamage(
      move.power,
      shooter.stats.atk,
      target.stats.def,
      type.num,
      type.den,
      true,
    )
    landHit(events, shooter, target, damage, type, {
      kind: "impact",
      moveId: move.id,
      line: `${move.displayName} hits ${target.name} for ${damage}.`,
    })
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
        // A staggered fighter's window is consumed reeling: the gauge is
        // spent, no action is planned, and cooldowns do not step (they
        // count actions, and this window is not one).
        if (actor.staggered) {
          actor.staggered = false
          actor.gauge -= 12
          pushEvent(events, "stagger", actor, {
            line: `${actor.name} reels from the blow.`,
          })
          continue
        }
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
            pushEvent(events, "hold", actor, {
              line: `${actor.name} hesitates.`,
            })
            break
          case "close":
            actor.range = "near"
            opponent.range = "near"
            pushEvent(events, "close", actor, {
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
            // The typeless basic can only stagger by sheer size (FR2): it
            // rides the shared heavy-hit rule with a neutral type factor, so
            // a super-effective victim never earns the lighter SE floor.
            landHit(events, actor, opponent, damage, TYPELESS, {
              kind: "basic",
              moveId: BASIC_MOVE.id,
              line: `${actor.name} strikes ${opponent.name} for ${damage}.`,
            })
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
              pushEvent(events, "launch", actor, {
                target: opponent.name,
                moveId: usedSpecial.id,
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
