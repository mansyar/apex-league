/**
 * Stamina: the pool a fighter pays from to commit, and refills by not
 * committing.
 *
 * Continuous Arena Battle FR-10 and AC-10. A committed move costs its authored
 * `staminaCost`; a commit the pool cannot cover is refused, and the refusal is
 * observable — these functions return `null` rather than a fighter, so the
 * caller keeps the state it had. A dodge costs the same kind of fixed price.
 * Movement is free: nothing in ./movement reads this pool.
 *
 * Regeneration runs only while the fighter holds no attack, at a fixed number
 * of points per interval of fight time. The interval accumulator lives on the
 * fighter, so the refill is whole points on whole milliseconds and replays
 * exactly. Every function is pure.
 */

import { getFrameData } from "../frames"
import { type FighterState, STEP_MS } from "./types"

/** A fighter's stamina pool when the config names none (tunable). */
export const DEFAULT_STAMINA_MAX = 100

/** How much fight time one regeneration tick covers, in ms (tunable). */
export const STAMINA_REGEN_INTERVAL_MS = 500

/** Points regained per regeneration tick while not committed (tunable). */
export const STAMINA_REGEN_PER_INTERVAL = 1

/**
 * The least any committed attack costs (tunable, FR-4). The innate strike
 * authors 2; at 2 points/s that would allow one a second, so the floor makes
 * the cheapest attack cost 1.5 s of regeneration — FR-4's sustained rate.
 * Specials keep their authored 4-10, so they stay the expensive choice.
 *
 * The floor is a per-blow price. Phase 5 folded the old 3 x blow-weight floor
 * into the literal 6 (FR-2), so the cheapest attack still costs 1.5 s of
 * regeneration; the number is unchanged, only its derivation is gone.
 */
export const MIN_ATTACK_STAMINA_COST = 6

/** What one dodge costs, in points (tunable). */
export const DODGE_STAMINA_COST = 8

/**
 * What one step-around costs, in points (tunable, FR-11). It is cheaper than
 * a dodge because it buys position rather than safety, and it is charged on
 * the step the cut starts so a held order is one cut, not a meter drain.
 */
export const SLIP_STAMINA_COST = 6

/** The stamina fields one fighter carries; see `FighterState` in ./types. */
export interface StaminaFields {
  /** Points left to spend. */
  readonly stamina: number
  /** The pool's size, copied from the config and never changed. */
  readonly staminaMax: number
  /** Fight time banked toward the next regeneration tick, in ms. */
  readonly staminaRegenMs: number
}

/**
 * A full pool at the opening. The pool must be a positive whole number of
 * points: a zero pool could never pay for a move, which is a config error.
 */
export function openingStamina(
  max: number = DEFAULT_STAMINA_MAX,
): StaminaFields {
  if (!Number.isInteger(max)) {
    throw new Error(`staminaMax must be an integer: ${max}`)
  }
  if (max <= 0) throw new Error(`staminaMax must be positive: ${max}`)
  return { stamina: max, staminaMax: max, staminaRegenMs: 0 }
}

/** True when the pool covers `cost`. */
export function canAfford(fighter: FighterState, cost: number): boolean {
  return fighter.stamina >= cost
}

/**
 * Pay `cost` from the pool. Returns the paid fighter, or null when the pool
 * cannot cover it — a refusal leaves the fighter untouched, so the caller can
 * tell by identity and report the refusal as a boolean.
 */
export function spendStamina(
  fighter: FighterState,
  cost: number,
): FighterState | null {
  if (!Number.isInteger(cost)) {
    throw new Error(`stamina cost must be an integer: ${cost}`)
  }
  if (cost < 0) throw new Error(`stamina cost cannot be negative: ${cost}`)
  if (!canAfford(fighter, cost)) return null
  return { ...fighter, stamina: fighter.stamina - cost }
}

/**
 * The stamina price of committing a move: its authored weight, raised to
 * `MIN_ATTACK_STAMINA_COST` when cheaper. The authored row is the relative
 * cost; this is the price the pool actually pays.
 */
export function attackCost(moveId: string): number {
  const row = getFrameData(moveId)
  if (!row) throw new Error(`Unknown move: ${moveId}`)
  return Math.max(MIN_ATTACK_STAMINA_COST, row.staminaCost)
}

/** Pay for one committed move, or null when the pool cannot cover it. */
export function spendAttack(
  fighter: FighterState,
  moveId: string,
): FighterState | null {
  return spendStamina(fighter, attackCost(moveId))
}

/** Pay for one dodge, or null when the pool cannot cover it (Phase 6). */
export function spendDodge(fighter: FighterState): FighterState | null {
  return spendStamina(fighter, DODGE_STAMINA_COST)
}

/** Pay for one step-around, or null when the pool cannot cover it (FR-11). */
export function spendSlip(fighter: FighterState): FighterState | null {
  return spendStamina(fighter, SLIP_STAMINA_COST)
}

/**
 * Refill one fixed step of stamina (FR-10). A fighter committed to an attack
 * — any held attack, startup through recovery — regenerates nothing, which is
 * what makes a spent pool a real gate rather than a delay. A full pool holds
 * its accumulator at zero so the next spend starts the clock clean.
 */
export function regenerateStamina(fighter: FighterState): FighterState {
  if (fighter.attack) return fighter
  if (fighter.stamina >= fighter.staminaMax) {
    return fighter.staminaRegenMs === 0
      ? fighter
      : { ...fighter, staminaRegenMs: 0 }
  }
  const staminaRegenMs = fighter.staminaRegenMs + STEP_MS
  const gained =
    Math.floor(staminaRegenMs / STAMINA_REGEN_INTERVAL_MS) *
    STAMINA_REGEN_PER_INTERVAL
  if (gained === 0) return { ...fighter, staminaRegenMs }
  return {
    ...fighter,
    stamina: Math.min(fighter.staminaMax, fighter.stamina + gained),
    staminaRegenMs: staminaRegenMs % STAMINA_REGEN_INTERVAL_MS,
  }
}
