/**
 * Battle move catalog: the innate basic strike plus 12 ranged specials.
 * Pure data and small helpers — no DOM, no jobs, no I/O.
 * Cooldowns are counted in the fighter's own actions, never in clock ticks.
 */

import type { Element } from "../creature"

/** One fight move: the innate basic strike or a catalog special. */
export interface MoveDef {
  /** Stable move id used in loadouts and event logs. */
  id: string
  /** Proper-noun display name for announcer copy. */
  displayName: string
  /** Catalog element for specials; undefined for the typeless basic strike. */
  element?: Element | undefined
  /** Positive integer damage base applied on a hit. */
  power: number
  /** Hit chance in percent 1–100. */
  accuracy: number
  /** How many of the user's own following actions stay blocked. */
  cooldown: number
  /** Melee basic resolves only at near; specials are projectiles. */
  melee: boolean
}

/** The innate basic strike. Not one of the four loadout slots. */
export const BASIC_MOVE: MoveDef = Object.freeze({
  id: "basic",
  displayName: "Strike",
  element: undefined,
  power: 4,
  accuracy: 100,
  cooldown: 0,
  melee: true,
})

function special(
  id: string,
  displayName: string,
  element: Element,
  power: number,
  accuracy: number,
  cooldown: number,
): MoveDef {
  return Object.freeze({
    id,
    displayName,
    element,
    power,
    accuracy,
    cooldown,
    melee: false,
  })
}

/**
 * The 12 specials: four tiers per starter element with matching stat lines,
 * so type and stats are what differ, never a hidden power budget.
 */
export const CATALOG: readonly MoveDef[] = Object.freeze([
  special("spark", "Spark", "fire", 6, 100, 1),
  special("flame_charge", "Flame Charge", "fire", 8, 90, 1),
  special("cinder_shot", "Cinder Shot", "fire", 10, 85, 2),
  special("blaze_bolt", "Blaze Bolt", "fire", 12, 75, 2),
  special("seed_shot", "Seed Shot", "plant", 6, 100, 1),
  special("thorn_volley", "Thorn Volley", "plant", 8, 90, 1),
  special("spore_burst", "Spore Burst", "plant", 10, 85, 2),
  special("bramble_dart", "Bramble Dart", "plant", 12, 75, 2),
  special("bubble", "Bubble", "water", 6, 100, 1),
  special("tide_shot", "Tide Shot", "water", 8, 90, 1),
  special("foam_volley", "Foam Volley", "water", 10, 85, 2),
  special("splash_bolt", "Splash Bolt", "water", 12, 75, 2),
])

const MOVE_INDEX = new Map(
  [BASIC_MOVE, ...CATALOG].map((move) => [move.id, move]),
)

/** Look up a move by id, or undefined when unknown. */
export function getMove(id: string): MoveDef | undefined {
  return MOVE_INDEX.get(id)
}

/** A special is selectable once its remaining cooldown has counted down to 0. */
export function isMoveReady(remainingCooldown: number): boolean {
  return remainingCooldown <= 0
}

/** Decrements a cooldown after one of that fighter's actions, flooring at 0. */
export function stepCooldown(remainingCooldown: number): number {
  return Math.max(0, remainingCooldown - 1)
}

/**
 * Resolves an equipped list to its move definitions, throwing friendly
 * errors for anything that is not two to four known ids with no repeats.
 * (Battle core FR3 revision: early creatures legally spar with 2-3
 * specials; the basic strike keeps short fights legible.)
 */
export function validateLoadout(loadout: readonly unknown[]): MoveDef[] {
  if (loadout.length < 2 || loadout.length > 4) {
    throw new Error("A loadout needs two to four moves")
  }
  const seen = new Set<string>()
  const moves: MoveDef[] = []
  for (const id of loadout) {
    if (typeof id !== "string") {
      throw new Error("A loadout is a list of two to four move ids")
    }
    const move = getMove(id)
    if (!move) {
      throw new Error(`Unknown move: ${id}`)
    }
    if (move === BASIC_MOVE || id === BASIC_MOVE.id) {
      throw new Error("The basic strike is innate and cannot be equipped")
    }
    if (seen.has(id)) {
      throw new Error("This loadout repeats a move")
    }
    seen.add(id)
    moves.push(move)
  }
  return moves
}
