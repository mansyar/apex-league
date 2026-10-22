/**
 * The action clock's hit rules: the shared heavy-hit rule (stagger and
 * knockback), the projectile impact resolution, and the announcer beat they
 * emit.
 *
 * Split out of the former monolithic battle/clock.ts (sim-voxel-size-guard,
 * phase 2) — pure relocation, no behavior change. The tick stepper lives in
 * ./engine, the shared vocabulary in ./types.
 */

import type { Rng } from "../../rng"
import { incomingTypeFactor, type TypeFactor } from "../chart"
import { strikeDamage } from "../damage"
import {
  type BattleEvent,
  type BattleEventKind,
  type FlyingShot,
  fighterKey,
  type RunFighter,
  STAGGER_DAMAGE_FRACTION,
  STAGGER_GRACE_TICKS,
  STAGGER_SE_FRACTION,
} from "./types"

/**
 * The typeless multiplier: the innate Strike carries no element, so it never
 * reads the type chart. Passing this to the shared heavy-hit rule is what
 * keeps a super-effective victim from earning the lighter SE stagger floor.
 */
export const TYPELESS: TypeFactor = Object.freeze({ num: 1, den: 1 })

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
 * The live context the hit rules need from the tick stepper: the current
 * tick, the fight's single RNG, and the post-step HP snapshot.
 */
export interface HitContext {
  /** The tick the events belong to. */
  readonly tick: number
  /** The fight's one RNG — the hit rules never draw from another. */
  readonly rng: Rng
  /** Both fighters' HP right now. */
  readonly hpAfter: () => Readonly<Record<string, number>>
}

/**
 * Push one announcer beat. The tick, the actor's identity, and the
 * post-step HP snapshot are the same on every event in the game — the
 * clock knows them, so no call site repeats them.
 */
export function pushEvent(
  events: BattleEvent[],
  ctx: HitContext,
  kind: BattleEventKind,
  actor: RunFighter,
  body: EventBody,
): void {
  events.push({
    tick: ctx.tick,
    kind,
    actor: actor.name,
    actorKey: fighterKey(actor),
    hpAfter: ctx.hpAfter(),
    ...body,
  })
}

/** Dodge chance against a target that closed while a shot was in flight. */
function dodgePercent(spd: number): number {
  return Math.min(70, 20 + spd * 3)
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
export function landHit(
  events: BattleEvent[],
  ctx: HitContext,
  attacker: RunFighter,
  victim: RunFighter,
  damage: number,
  type: TypeFactor,
  hit: {
    readonly kind: "basic" | "impact"
    readonly moveId: string
    readonly line: string
  },
): void {
  victim.hp -= damage
  const heavy =
    victim.hp > 0 &&
    (damage >= victim.stats.hp * STAGGER_DAMAGE_FRACTION ||
      (type.num > type.den && damage >= victim.stats.hp * STAGGER_SE_FRACTION))
  // The lock applies only through the grace gate.
  const staggers =
    heavy &&
    !victim.staggered &&
    ctx.tick - victim.lastStaggerTick >= STAGGER_GRACE_TICKS
  const knockedBack = heavy && victim.range === "near"
  if (heavy) {
    if (staggers) {
      victim.staggered = true
      victim.lastStaggerTick = ctx.tick
    }
    if (knockedBack) {
      victim.range = "far"
      attacker.range = "far"
    }
  }
  pushEvent(events, ctx, hit.kind, attacker, {
    target: victim.name,
    moveId: hit.moveId,
    damage,
    hit: true,
    line: hit.line,
    reaction: knockedBack ? "knockback" : staggers ? "stagger" : undefined,
  })
  if (knockedBack) {
    pushEvent(events, ctx, "knockback", victim, {
      line: `${victim.name} is knocked back.`,
    })
  }
  if (victim.hp <= 0) {
    pushEvent(events, ctx, "down", victim, { line: `${victim.name} is down!` })
  }
}

/** Resolve one shot's accuracy, dodge, damage, and down events. */
export function resolveShot(
  shot: FlyingShot,
  events: BattleEvent[],
  ctx: HitContext,
): void {
  const { shooter, target, move } = shot
  if (Math.floor(ctx.rng.next() * 100) >= move.accuracy) {
    pushEvent(events, ctx, "impact", shooter, {
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
    if (Math.floor(ctx.rng.next() * 100) < dodgePercent(target.stats.spd)) {
      pushEvent(events, ctx, "impact", shooter, {
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
  landHit(events, ctx, shooter, target, damage, type, {
    kind: "impact",
    moveId: move.id,
    line: `${move.displayName} hits ${target.name} for ${damage}.`,
  })
}
