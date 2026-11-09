/**
 * Poise: the meter that decides when a fighter can be broken open.
 *
 * Continuous Arena Battle FR-9 and AC-9. Every landed blow or shot removes the
 * move's authored `poiseDamage`. When the meter reaches zero the fighter breaks:
 * its attack is cancelled, it cannot commit a new one, and it is open for a
 * punish window measured in **milliseconds**. When that window runs out the
 * meter refills and a grace period, also in milliseconds, must pass before the
 * fighter can break again — the legacy `STAGGER_GRACE_TICKS` expressed as a
 * duration instead of a count of actions.
 *
 * Everything here is integer arithmetic on whole points and whole ms, and the
 * only clock it reads is `STEP_MS`, so a replay is exact. The functions are
 * pure: each returns a new fighter or the same one, never a mutation.
 */

import { type FighterState, STEP_MS } from "./types"

/** A fighter's poise pool when the config names none (tunable). */
export const DEFAULT_POISE_MAX = 20

/**
 * How long a break lasts, in ms: the punish window (tunable). Roughly one
 * committed attack, so a break costs the victim its next exchange.
 */
export const POISE_BREAK_MS = 600

/**
 * How long a refilled fighter is safe from another break, in ms (tunable).
 * The successor to `STAGGER_GRACE_TICKS`: three actions' worth of time, so a
 * fighter that just recovered always gets to act.
 */
export const POISE_GRACE_MS = 1200

/** The poise fields one fighter carries; see `FighterState` in ./types. */
export interface PoiseFields {
  /** Poise points left before the next break. */
  readonly poise: number
  /** The pool's size, copied from the config and never changed. */
  readonly poiseMax: number
  /** Break time still to serve, in ms; 0 when the fighter is not broken. */
  readonly poiseBreakMs: number
  /** Grace time still to run before another break, in ms; 0 when none. */
  readonly poiseGraceMs: number
}

/**
 * A full meter at the opening. A pool must be a positive whole number of
 * points: a zero pool would break on the first tick of contact, which is a
 * config error rather than a fight.
 */
export function openingPoise(max: number = DEFAULT_POISE_MAX): PoiseFields {
  if (!Number.isInteger(max)) {
    throw new Error(`poiseMax must be an integer: ${max}`)
  }
  if (max <= 0) throw new Error(`poiseMax must be positive: ${max}`)
  return { poise: max, poiseMax: max, poiseBreakMs: 0, poiseGraceMs: 0 }
}

/** True while the fighter is serving a break: its punish window is open. */
export function isBroken(fighter: FighterState): boolean {
  return fighter.poiseBreakMs > 0
}

/** True when a landed blow is allowed to break the fighter right now. */
export function canBreak(fighter: FighterState): boolean {
  return !isBroken(fighter) && fighter.poiseGraceMs === 0
}

/**
 * Land `amount` poise damage on a fighter (FR-9).
 *
 * A broken fighter absorbs it: one break never stacks into a longer lock. A
 * fighter inside its grace period keeps at least one point, so the meter can
 * never sit empty without a break — the grace holds the break, and the meter
 * refills to full only when a break itself ends. Reaching zero outside grace
 * breaks the fighter: the attack it was holding is cancelled, the punish
 * window opens, and the meter stays empty until that window runs out.
 */
export function applyPoiseDamage(
  fighter: FighterState,
  amount: number,
): FighterState {
  if (!Number.isInteger(amount)) {
    throw new Error(`poise damage must be an integer: ${amount}`)
  }
  if (amount <= 0) return fighter
  if (isBroken(fighter)) return fighter
  const poise = fighter.poise - amount
  if (poise > 0) return { ...fighter, poise }
  if (!canBreak(fighter)) return { ...fighter, poise: 1 }
  return {
    ...fighter,
    poise: 0,
    poiseBreakMs: POISE_BREAK_MS,
    poiseGraceMs: 0,
    attack: null,
  }
}

/**
 * Advance the poise clocks one fixed step (FR-9, AC-9).
 *
 * A break counts down to zero, then refills the meter and starts the grace
 * period; the grace then counts down to zero. Timers are advanced before a
 * step's blows land, so a break opened this step serves its whole window.
 */
export function advancePoise(fighter: FighterState): FighterState {
  if (isBroken(fighter)) {
    const poiseBreakMs = Math.max(0, fighter.poiseBreakMs - STEP_MS)
    if (poiseBreakMs > 0) return { ...fighter, poiseBreakMs }
    return {
      ...fighter,
      poise: fighter.poiseMax,
      poiseBreakMs: 0,
      poiseGraceMs: POISE_GRACE_MS,
    }
  }
  if (fighter.poiseGraceMs > 0) {
    return {
      ...fighter,
      poiseGraceMs: Math.max(0, fighter.poiseGraceMs - STEP_MS),
    }
  }
  return fighter
}
