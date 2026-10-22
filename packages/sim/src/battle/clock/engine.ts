/**
 * The action clock's tick stepper: turn order, range, melee, and projectile
 * travel. Pure and deterministic given the seed.
 *
 * Split out of the former monolithic battle/clock.ts (sim-voxel-size-guard,
 * phase 2) — pure relocation, no behavior change. The shared vocabulary
 * (fighter snapshots, events, tuning constants) lives in ./types, the hit
 * rules in ./hits.
 */

import { makeRng, type Rng } from "../../rng"
import { strikeDamage } from "../damage"
import { BASIC_MOVE, getMove, type MoveDef, stepCooldown } from "../moves"
import {
  type HitContext,
  landHit,
  pushEvent,
  resolveShot,
  TYPELESS,
} from "./hits"
import {
  type BattleEvent,
  type BattleFighter,
  type Clock,
  type ClockFighter,
  type FlyingShot,
  fighterKey,
  type RunFighter,
} from "./types"

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
  const run: RunFighter[] = initial.map((f) => ({
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
      const ctx: HitContext = { tick, rng, hpAfter }

      // First step of the tick: every in-flight shot launched on the
      // previous tick, in launch order. All of them resolve against the
      // pre-step HP, and the judgment happens after the whole step (FR8).
      const wasDown = run.some((f) => f.hp <= 0)
      while (shots.length > 0) {
        const shot = shots.shift()
        if (!shot) break
        resolveShot(shot, events, ctx)
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
          pushEvent(events, ctx, "stagger", actor, {
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
            pushEvent(events, ctx, "hold", actor, {
              line: `${actor.name} hesitates.`,
            })
            break
          case "close":
            actor.range = "near"
            opponent.range = "near"
            pushEvent(events, ctx, "close", actor, {
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
            landHit(events, ctx, actor, opponent, damage, TYPELESS, {
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
              pushEvent(events, ctx, "launch", actor, {
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
                ctx,
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
