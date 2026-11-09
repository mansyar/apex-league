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

import { faceOpponent, separateBodies } from "./contact"
import { tickCooldowns } from "./cooldown"
import { blowDirection, isStunned, reactToBlow } from "./impulse"
import {
  dodgeSpeed,
  type FencePin,
  moveFighter,
  moveStunned,
  slipSpeed,
} from "./movement"
import { advancePoise, applyPoiseDamage } from "./poise"
import {
  launchProjectile,
  type ProjectileState,
  resolveProjectiles,
  type ShotReport,
} from "./projectile"
import { regenerateStamina, spendDodge, spendSlip } from "./stamina"
import {
  advanceFighterAttack,
  resolveStrikes,
  type StrikeReport,
  type StrikeStats,
  type WhiffReport,
  whiffsOf,
} from "./strike"
import {
  type ArenaBounds,
  type Dir2,
  type FighterState,
  type FightState,
  HOLD,
  type MoveIntent,
  STEP_MS,
} from "./types"

/** A dodge order and whether the burst ran (FR-10, FR-20). */
export interface DodgeReport {
  /** The side that ordered the dodge. */
  readonly key: string
  /**
   * True when the burst ran; false when the body held. The price is charged
   * once, on the step the burst starts, so a held order keeps reporting true.
   */
  readonly paid: boolean
}

/** A step-around order and whether the cut ran (FR-11). */
export interface SlipReport {
  /** The side that ordered the cut. */
  readonly key: string
  /** True when the cut ran; false when the body held for lack of stamina. */
  readonly paid: boolean
}

/**
 * A body that spent the step pressed into the fence by knockback (FR-22): the
 * axes it was pinned on, so "no room to retreat" is readable from a step.
 */
export interface PinnedReport {
  /** The side held against the wall. */
  readonly key: string
  readonly x: FencePin["x"]
  readonly z: FencePin["z"]
}

/** What one advance produced: the next state and every blow that landed. */
export interface StepOutcome {
  readonly state: FightState
  readonly strikes: readonly StrikeReport[]
  /** Shots that resolved this step, hit or dodged (FR-8). */
  readonly shots: readonly ShotReport[]
  /** Shots launched this step, as their active windows opened (FR-8). */
  readonly launched: readonly ProjectileState[]
  /** Melee swings that closed their window without landing (FR-18). */
  readonly whiffs: readonly WhiffReport[]
  /** Dodge orders this step, paid or refused, in fighter order (FR-10). */
  readonly dodges: readonly DodgeReport[]
  /** Step-around orders this step, paid or refused, in fighter order (FR-11). */
  readonly slips: readonly SlipReport[]
  /** Bodies that knockback held against the fence this step (FR-22). */
  readonly pinned: readonly PinnedReport[]
}

/** What one advance produced: the next state, its hash, and what landed. */
export interface StepResult extends StepOutcome {
  readonly hash: number
}

/**
 * What one step needs beyond the state: the fence it is played inside and both
 * sides' strike stats. There is no random source: the step is seed-free
 * (NFR-1), and the seed only decides a capped fight in ./resolve.
 */
export interface StepContext {
  readonly bounds: ArenaBounds
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
  // Damage, poise, knockback and hitstun all settle through one seam, which
  // reads the blow directions off the top-of-step snapshot (FR-22, FR-23).
  const settled = settleMeters(
    before,
    struck.strikes,
    flight.shots,
    flight.fighters,
  )
  // Whiffs read the post-strike state: a blow that landed on the window's
  // final active step is a hit, not also a swing that touched nothing.
  const whiffs = whiffsOf(before, struck.fighters)
  const dodges: DodgeReport[] = []
  const slips: SlipReport[] = []
  const pinned: PinnedReport[] = []
  // `applyIntent` carries the attack and both meters across (FR-6, FR-9, FR-10)
  // and, for a stunned body, spends the step sliding on its knockback instead.
  const moved: readonly [FighterState, FighterState] = [
    applyIntent(settled[0], intents[0], bounds, dodges, slips, pinned),
    applyIntent(settled[1], intents[1], bounds, dodges, slips, pinned),
  ]
  // Bodies are solid, so overlapping centres push apart before the next step
  // (FR-17). Facing then turns from the pre-step facing toward the opponent,
  // so strafing no longer swings a body's back into a blow (FR-18, T2.3).
  const separated = separateBodies(moved, bounds)
  const fighters = faceOpponent(separated, before)
  return {
    state: {
      step: state.step + 1,
      elapsedMs: state.elapsedMs + STEP_MS,
      bounds,
      // One fixed step of live time comes off every running move cooldown.
      fighters: [tickCooldowns(fighters[0]), tickCooldowns(fighters[1])],
      projectiles: [...flight.projectiles, ...launched],
    },
    strikes: struck.strikes,
    shots: flight.shots,
    launched,
    whiffs,
    dodges,
    slips,
    pinned,
  }
}

/**
 * Apply one side's order. A stunned body cannot act: the order is ignored, a
 * dodge is reported refused and never charged, and the step is spent sliding
 * on the knockback (FR-23). A body that was pinned against the fence is
 * reported so the caller can see it had nowhere to go (FR-22).
 *
 * Otherwise a dodge pays its price first: paid, the burst runs along the
 * ordered direction; unpayable, the order is refused into a hold, so the body
 * neither bursts nor slides, and the refusal is reported.
 */
function applyIntent(
  fighter: FighterState,
  intent: MoveIntent,
  bounds: ArenaBounds,
  dodges: DodgeReport[],
  slips: SlipReport[],
  pinned: PinnedReport[],
): FighterState {
  if (isStunned(fighter)) {
    if ("dodge" in intent) dodges.push({ key: fighter.key, paid: false })
    if ("slip" in intent) slips.push({ key: fighter.key, paid: false })
    const stunned = moveStunned(fighter, bounds)
    if (stunned.pinned.x !== 0 || stunned.pinned.z !== 0) {
      pinned.push({ key: fighter.key, ...stunned.pinned })
    }
    return stunned.fighter
  }
  if (!("dodge" in intent) && !("slip" in intent)) {
    return moveFighter(fighter, intent, bounds)
  }
  const dodge = "dodge" in intent
  const dir = dodge ? intent.dodge : intent.slip
  const speed = dodge ? dodgeSpeed(fighter.spd) : slipSpeed(fighter.spd)
  const paid = bursting(fighter, dir, speed)
    ? fighter
    : dodge
      ? spendDodge(fighter)
      : spendSlip(fighter)
  if (!paid) {
    if (dodge) dodges.push({ key: fighter.key, paid: false })
    else slips.push({ key: fighter.key, paid: false })
    return moveFighter(fighter, HOLD, bounds)
  }
  if (dodge) dodges.push({ key: fighter.key, paid: true })
  else slips.push({ key: fighter.key, paid: true })
  return moveFighter(paid, intent, bounds)
}

/**
 * True when the body is already running the burst it was ordered into: its
 * velocity is at or beyond lunge speed along that direction. A dodge charges
 * its price once, when the burst starts, so holding the order through the
 * window is the same lunge rather than a second one (FR-20).
 */
function bursting(fighter: FighterState, dir: Dir2, speed: number): boolean {
  const moving = fighter.vel.x * fighter.vel.x + fighter.vel.z * fighter.vel.z
  if (moving < speed * speed) return false
  return fighter.vel.x * dir.x + fighter.vel.z * dir.z > 0
}

/**
 * Launch one shot for each side whose active window just opened (FR-8). A
 * melee move launches nothing, and a window that is already active fired on
 * the step it opened, so one committed move fires exactly once. `frames.ts`
 * rejects an active window shorter than one step, so the opening step is
 * always observed here rather than skipped over (FR-19, audit finding 8). The
 * shot's id is the launching step and side, which is unique because a side
 * opens at most one window per step.
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
 * Settle both meters for one step (FR-9, FR-10, FR-12): clocks and
 * regeneration advance first, so a break opened now serves its whole window,
 * and a window that expires now refills before this step's blows land. Every
 * blow that lands then spends poise, hit points and hitstun through one seam;
 * hit points floor at zero, which is what the endings read.
 *
 * The knockback direction is read off the top-of-step snapshot: a melee blow
 * pushes along the line from the attacker's centre to the victim's, a shot
 * along the direction it was fired in (FR-22).
 */
function settleMeters(
  before: readonly [FighterState, FighterState],
  strikes: readonly StrikeReport[],
  shots: readonly ShotReport[],
  fighters: readonly [FighterState, FighterState],
): readonly [FighterState, FighterState] {
  const settled: [FighterState, FighterState] = [
    regenerateStamina(advancePoise(fighters[0])),
    regenerateStamina(advancePoise(fighters[1])),
  ]
  const sideOf = (key: string): 0 | 1 => (settled[0].key === key ? 0 : 1)
  const hit = (
    key: string,
    poiseDamage: number,
    damage: number,
    dir: Dir2,
  ): void => {
    const side = sideOf(key)
    const poised = applyPoiseDamage(settled[side], poiseDamage)
    const broke = poised.poiseBreakMs > 0 && settled[side].poiseBreakMs === 0
    settled[side] = applyDamage(
      reactToBlow(poised, dir, poiseDamage, broke),
      damage,
    )
  }
  for (const strike of strikes) {
    const dir = blowDirection(
      before[sideOf(strike.attackerKey)].pos,
      before[sideOf(strike.targetKey)].pos,
    )
    hit(strike.targetKey, strike.poiseDamage, strike.damage, dir)
  }
  for (const shot of shots) {
    if (shot.outcome === "hit") {
      hit(shot.targetKey, shot.poiseDamage, shot.damage, shot.dir)
    }
  }
  return settled
}

/**
 * Take one blow's damage: whole points off the pool, floored at zero so a
 * downed fighter reads 0 and never goes negative (FR-12).
 */
function applyDamage(fighter: FighterState, damage: number): FighterState {
  if (damage <= 0) return fighter
  return { ...fighter, hp: Math.max(0, fighter.hp - damage) }
}
