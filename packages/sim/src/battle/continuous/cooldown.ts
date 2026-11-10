/**
 * Per-move cooldowns in live fight time (FR-19, AC-16).
 *
 * The catalog authors a cooldown *tier* per special (1/2/3); `COOLDOWN_MS` in
 * `../moves` is the one place that tier becomes milliseconds. The timer is
 * charged at commit, not at landing, so the gate is predictable: a fighter
 * knows the move is spent the moment it starts, even if the blow misses.
 *
 * The timer is held per move id on `FighterState`, ticks down by one step and
 * clamps at zero. It is separate from recovery (which is the move's own
 * timing) and from stamina (the shared pool): neither is folded in, and a
 * ready move still has to be affordable and committable.
 */

import { cooldownMsFor } from "../moves"
import { type FighterState, STEP_MS } from "./types"

/** Milliseconds left on `moveId`; 0 when the move is ready. */
export function cooldownRemaining(
  fighter: FighterState,
  moveId: string,
): number {
  return fighter.cooldowns?.[moveId] ?? 0
}

/** True when the move may be committed or chosen. */
export function isCooldownReady(
  fighter: FighterState,
  moveId: string,
): boolean {
  return cooldownRemaining(fighter, moveId) <= 0
}

/**
 * Charge a move's full cooldown at commit. The innate strike authors tier 0,
 * so this returns the fighter untouched and the strike is never gated.
 */
export function chargeCooldown(
  fighter: FighterState,
  moveId: string,
): FighterState {
  const ms = cooldownMsFor(moveId)
  if (ms <= 0) return fighter
  return {
    ...fighter,
    cooldowns: { ...fighter.cooldowns, [moveId]: ms },
  }
}

/**
 * Tick every running cooldown by one fixed step. Expired entries are dropped,
 * so a ready fighter carries an empty record and hashes the same as one that
 * has never committed. A fighter with nothing running is returned by identity.
 */
export function tickCooldowns(fighter: FighterState): FighterState {
  const running = fighter.cooldowns
  if (!running) return fighter
  const ids = Object.keys(running)
  if (ids.length === 0) return fighter
  const next: Record<string, number> = {}
  let changed = false
  for (const id of ids) {
    const left = Math.max(0, (running[id] ?? 0) - STEP_MS)
    if (left > 0) next[id] = left
    if (left !== running[id]) changed = true
  }
  return changed ? { ...fighter, cooldowns: next } : fighter
}
