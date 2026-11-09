/**
 * Battle move catalog: the innate basic strike plus the ranged specials, eight
 * per authored element (fire, plant, water, electric, earth, wind). The first
 * six of each element are the species kit (four classic rows, then the wider
 * pool's fast chip move and heavy finisher); the last two are the branch
 * signatures, one heavy and one reliable.
 * Pure data and small helpers — no DOM, no jobs, no I/O.
 * Cooldowns are counted in the fighter's own actions, never in clock ticks.
 *
 * Power is one authored ladder, 5..11: the innate strike is 5, the kit rows
 * are 6/8/9/10 with the fast chip at 7, and the heavy finisher is 11. On the
 * reference line a base hit is therefore 5.3-11.6% of the pool, inside the
 * 4-12% band (FR-1); a rear counter may still reach 1.875x that, which is the
 * reward for earning the angle, not a hole in the band.
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
  power: 5,
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
 * The specials: six kit rows per element with matching stat lines, so type
 * and stats are what differ, never a hidden power budget. Appending the wider
 * pool and then the branch signatures keeps every pre-existing kit prefix
 * identical.
 */
export const CATALOG: readonly MoveDef[] = Object.freeze([
  special("spark", "Spark", "fire", 6, 100, 1),
  special("flame_charge", "Flame Charge", "fire", 8, 90, 1),
  special("cinder_shot", "Cinder Shot", "fire", 9, 85, 2),
  special("blaze_bolt", "Blaze Bolt", "fire", 10, 75, 2),
  special("flare_dart", "Flare Dart", "fire", 7, 95, 1),
  special("pyre_lance", "Pyre Lance", "fire", 11, 70, 3),
  special("seed_shot", "Seed Shot", "plant", 6, 100, 1),
  special("thorn_volley", "Thorn Volley", "plant", 8, 90, 1),
  special("spore_burst", "Spore Burst", "plant", 9, 85, 2),
  special("bramble_dart", "Bramble Dart", "plant", 10, 75, 2),
  special("vine_lash", "Vine Lash", "plant", 7, 95, 1),
  special("root_quake", "Root Quake", "plant", 11, 70, 3),
  special("bubble", "Bubble", "water", 6, 100, 1),
  special("tide_shot", "Tide Shot", "water", 8, 90, 1),
  special("foam_volley", "Foam Volley", "water", 9, 85, 2),
  special("splash_bolt", "Splash Bolt", "water", 10, 75, 2),
  special("mist_spray", "Mist Spray", "water", 7, 95, 1),
  special("maelstrom", "Maelstrom", "water", 11, 70, 3),
  special("cinder_dive", "Cinder Dive", "fire", 10, 80, 2),
  special("pyre_wall", "Pyre Wall", "fire", 8, 100, 2),
  special("thorn_charge", "Thorn Charge", "plant", 10, 80, 2),
  special("bramble_guard", "Bramble Guard", "plant", 8, 100, 2),
  special("riptide_rush", "Riptide Rush", "water", 10, 80, 2),
  special("tide_aegis", "Tide Aegis", "water", 8, 100, 2),
  special("static_jolt", "Static Jolt", "electric", 6, 100, 1),
  special("volt_dash", "Volt Dash", "electric", 8, 90, 1),
  special("arc_shot", "Arc Shot", "electric", 9, 85, 2),
  special("storm_bolt", "Storm Bolt", "electric", 10, 75, 2),
  special("ion_dart", "Ion Dart", "electric", 7, 95, 1),
  special("gigavolt", "Gigavolt", "electric", 11, 70, 3),
  special("storm_surge", "Storm Surge", "electric", 10, 80, 2),
  special("ion_wall", "Ion Wall", "electric", 8, 100, 2),
  special("pebble_shot", "Pebble Shot", "earth", 6, 100, 1),
  special("dust_devil", "Dust Devil", "earth", 8, 90, 1),
  special("clay_burst", "Clay Burst", "earth", 9, 85, 2),
  special("boulder_toss", "Boulder Toss", "earth", 10, 75, 2),
  special("sand_blast", "Sand Blast", "earth", 7, 95, 1),
  special("tectonic_slam", "Tectonic Slam", "earth", 11, 70, 3),
  special("quake_stomp", "Quake Stomp", "earth", 10, 80, 2),
  special("basalt_guard", "Basalt Guard", "earth", 8, 100, 2),
  special("gust", "Gust", "wind", 6, 100, 1),
  special("feather_dart", "Feather Dart", "wind", 8, 90, 1),
  special("gale_cutter", "Gale Cutter", "wind", 9, 85, 2),
  special("sky_bolt", "Sky Bolt", "wind", 10, 75, 2),
  special("talon_slash", "Talon Slash", "wind", 7, 95, 1),
  special("hurricane_spiral", "Hurricane Spiral", "wind", 11, 70, 3),
  special("cyclone_dive", "Cyclone Dive", "wind", 10, 80, 2),
  special("zephyr_veil", "Zephyr Veil", "wind", 8, 100, 2),
])

const MOVE_INDEX = new Map(
  [BASIC_MOVE, ...CATALOG].map((move) => [move.id, move]),
)

/** Look up a move by id, or undefined when unknown. */
export function getMove(id: string): MoveDef | undefined {
  return MOVE_INDEX.get(id)
}

/**
 * The live cooldown tier, in milliseconds (FR-19, AC-16). The catalog's
 * `cooldown` field is the tier key; this table is the one place the duration
 * is written. One second per tier step, and every value is a whole 20 ms step
 * (60 / 100 / 120), so the timer never rounds. Tier 3 is the heavy's gate.
 * Tier 0 is the innate strike, never gated.
 *
 * PROVISIONAL: these durations are owned by the balance phase (P8.T4). They
 * exist to prove the mechanism and to measure its pacing cost; Phase 8 tunes
 * them against the roster. The damage band is authored independently and must
 * not move to fit them.
 */
export const COOLDOWN_MS: Readonly<Record<number, number>> = Object.freeze({
  0: 0,
  1: 1200,
  2: 2000,
  3: 2400,
})

/** The live cooldown of a move, in ms; 0 for the innate strike. */
export function cooldownMsFor(id: string): number {
  const move = getMove(id)
  if (!move) throw new Error(`Unknown move: ${id}`)
  const ms = COOLDOWN_MS[move.cooldown]
  if (ms === undefined) {
    throw new Error(`No cooldown tier for ${id}: ${move.cooldown}`)
  }
  return ms
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
