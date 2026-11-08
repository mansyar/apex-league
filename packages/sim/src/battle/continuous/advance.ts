/**
 * The per-step pipeline: one 20 ms advance of the continuous fight.
 *
 * Continuous Arena Battle FR-1. Both sides move from the same pre-step state,
 * so neither sees the other's move until the next step, and both strike tests
 * read that same snapshot so overlapping active frames trade (FR-7). The step
 * is integer arithmetic on the state in ./types and the movement lives in
 * ./movement.
 *
 * This is also the seam that owns fighter state, so the dodge price is charged
 * here (FR-10): a dodge order pays `DODGE_STAMINA_COST` before it bursts, and
 * an order the pool cannot cover is refused into a hold, reported back on the
 * outcome. Extracted from ./step, which keeps the factory, the hash, and the
 * commit path.
 */

import type { Rng } from "../../rng"
import { moveFighter } from "./movement"
import { advancePoise, applyPoiseDamage } from "./poise"
import {
  launchProjectile,
  type ProjectileState,
  resolveProjectiles,
  type ShotReport,
} from "./projectile"
import { regenerateStamina, spendDodge } from "./stamina"
import {
  advanceFighterAttack,
  resolveStrikes,
  type StrikeReport,
  type StrikeStats,
} from "./strike"
import {
  type ArenaBounds,
  type FighterState,
  type FightState,
  HOLD,
  type MoveIntent,
  STEP_MS,
} from "./types"

/** A dodge order and whether the pool covered it (FR-10). */
export interface DodgeReport {
  /** The side that ordered the dodge. */
  readonly key: string
  /** True when the pool paid and the burst ran; false when the body held. */
  readonly paid: boolean
}

/** What one advance produced: the next state and every blow that landed. */
export interface StepOutcome {
  readonly state: FightState
  readonly strikes: readonly StrikeReport[]
  /** Shots that resolved this step, hit or dodged (FR-8). */
  readonly shots: readonly ShotReport[]
  /** Dodge orders this step, paid or refused, in fighter order (FR-10). */
  readonly dodges: readonly DodgeReport[]
}

/** What one advance produced: the next state, its hash, and what landed. */
export interface StepResult extends StepOutcome {
  readonly hash: number
}

/**
 * What one step needs beyond the state: the fence it is played inside, the
 * fight's single seeded stream (FR-1), and both sides' strike stats.
 */
export interface StepContext {
  readonly bounds: ArenaBounds
  readonly rng: Rng
  /** Both sides' strike stats, in fighter order. */
  readonly stats: readonly [StrikeStats, StrikeStats]
}

/**
 * Advance one fixed step. Both sides move from the same pre-step state, so
 * neither sees the other's move until the next step, and both strike tests
 * read that same snapshot so overlapping active frames trade (FR-7).
 */
export function stepFight(
  state: FightState,
  intents: readonly [MoveIntent, MoveIntent],
  context: StepContext,
): StepOutcome {
  const bounds = context.bounds
  const before = state.fighters
  const advanced: readonly [FighterState, FighterState] = [
    advanceFighterAttack(before[0]),
    advanceFighterAttack(before[1]),
  ]
  const struck = resolveStrikes(before, advanced, context.stats)
  const flight = resolveProjectiles(
    state.projectiles,
    before,
    struck.fighters,
    context.stats,
  )
  const launched = launchShots(state.step, before, advanced)
  const settled = settleMeters(struck.strikes, flight.shots, flight.fighters)
  const dodges: DodgeReport[] = []
  // `applyIntent` carries the attack and both meters across (FR-6, FR-9, FR-10).
  const fighters: readonly [FighterState, FighterState] = [
    applyIntent(settled[0], intents[0], bounds, dodges),
    applyIntent(settled[1], intents[1], bounds, dodges),
  ]
  return {
    state: {
      step: state.step + 1,
      elapsedMs: state.elapsedMs + STEP_MS,
      bounds,
      fighters,
      projectiles: [...flight.projectiles, ...launched],
    },
    strikes: struck.strikes,
    shots: flight.shots,
    dodges,
  }
}

/**
 * Apply one side's order. A dodge pays its price first: paid, the burst runs
 * along the ordered direction; unpayable, the order is refused into a hold, so
 * the body neither bursts nor slides, and the refusal is reported.
 */
function applyIntent(
  fighter: FighterState,
  intent: MoveIntent,
  bounds: ArenaBounds,
  dodges: DodgeReport[],
): FighterState {
  if (!("dodge" in intent)) return moveFighter(fighter, intent, bounds)
  const paid = spendDodge(fighter)
  if (!paid) {
    dodges.push({ key: fighter.key, paid: false })
    return moveFighter(fighter, HOLD, bounds)
  }
  dodges.push({ key: fighter.key, paid: true })
  return moveFighter(paid, intent.dodge, bounds)
}

/**
 * Launch one shot for each side whose active window just opened (FR-8). A
 * melee move launches nothing, and a window that is already active fired on
 * the step it opened, so one committed move fires exactly once. The shot's id
 * is the launching step and side, which is unique because a side opens at
 * most one window per step.
 */
function launchShots(
  step: number,
  before: readonly [FighterState, FighterState],
  after: readonly [FighterState, FighterState],
): ProjectileState[] {
  const shots: ProjectileState[] = []
  for (const side of [0, 1] as const) {
    const attack = after[side].attack
    if (attack?.phase !== "active") continue
    if (before[side].attack?.phase === "active") continue
    const shot = launchProjectile(
      step * 2 + side,
      before[side],
      before[side === 0 ? 1 : 0],
      attack.moveId,
    )
    if (shot) shots.push(shot)
  }
  return shots
}

/**
 * Settle both meters for one step (FR-9, FR-10): clocks and regeneration
 * advance first, so a break opened now serves its whole window, and a window
 * that expires now refills before this step's blows land.
 */
function settleMeters(
  strikes: readonly StrikeReport[],
  shots: readonly ShotReport[],
  fighters: readonly [FighterState, FighterState],
): readonly [FighterState, FighterState] {
  const settled: [FighterState, FighterState] = [
    regenerateStamina(advancePoise(fighters[0])),
    regenerateStamina(advancePoise(fighters[1])),
  ]
  const hit = (key: string, poiseDamage: number): void => {
    const side = settled[0].key === key ? 0 : 1
    settled[side] = applyPoiseDamage(settled[side], poiseDamage)
  }
  for (const strike of strikes) hit(strike.targetKey, strike.poiseDamage)
  for (const shot of shots) {
    if (shot.outcome === "hit") hit(shot.targetKey, shot.poiseDamage)
  }
  return settled
}
