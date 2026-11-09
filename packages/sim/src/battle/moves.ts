/**
 * Battle move catalog: the innate basic strike plus the ranged specials, eight
 * per authored element (fire, plant, water, electric, earth, wind). The first
 * six of each element are the species kit (four classic rows, then the wider
 * pool's fast chip move and heavy finisher); the last two are the branch
 * signatures, one heavy and one reliable.
 * Pure data and small helpers — no DOM, no jobs, no I/O.
 * Cooldowns are counted in the fighter's own actions, never in clock ticks.
 *
 * Power is one authored ladder, 10..22: the innate strike is 10, the kit rows
 * are 12/16/18/20 with the fast chip at 14, and the heavy finisher is 22.
 * These already carry the 2x blow weight the continuous engine used to apply
 * (Phase 5 folded it in, FR-2), just as the HP stat carries the old 210%
 * arena scale: the sheet's number is the number the fight resolves with. On
 * the folded reference line (189 pool) a base hit is therefore 5.3-11.6%,
 * inside the 4-12% band (FR-1); a rear counter may still reach 1.875x that,
 * which is the reward for earning the angle, not a hole in the band.
 *
 * The heavy finisher authors accuracy 100 (P8.T3.2). At 70 it lost to its own
 * light row on damage per second even with the cooldown gate pulled back to its
 * swing; the finisher is the slot you spend on a payoff, not on a miss.
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
  power: 10,
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
  special("spark", "Spark", "fire", 12, 100, 1),
  special("flame_charge", "Flame Charge", "fire", 16, 90, 1),
  special("cinder_shot", "Cinder Shot", "fire", 18, 85, 2),
  special("blaze_bolt", "Blaze Bolt", "fire", 20, 75, 2),
  special("flare_dart", "Flare Dart", "fire", 14, 95, 1),
  special("pyre_lance", "Pyre Lance", "fire", 22, 100, 3),
  special("seed_shot", "Seed Shot", "plant", 12, 100, 1),
  special("thorn_volley", "Thorn Volley", "plant", 16, 90, 1),
  special("spore_burst", "Spore Burst", "plant", 18, 85, 2),
  special("bramble_dart", "Bramble Dart", "plant", 20, 75, 2),
  special("vine_lash", "Vine Lash", "plant", 14, 95, 1),
  special("root_quake", "Root Quake", "plant", 22, 100, 3),
  special("bubble", "Bubble", "water", 12, 100, 1),
  special("tide_shot", "Tide Shot", "water", 16, 90, 1),
  special("foam_volley", "Foam Volley", "water", 18, 85, 2),
  special("splash_bolt", "Splash Bolt", "water", 20, 75, 2),
  special("mist_spray", "Mist Spray", "water", 14, 95, 1),
  special("maelstrom", "Maelstrom", "water", 22, 100, 3),
  special("cinder_dive", "Cinder Dive", "fire", 20, 80, 2),
  special("pyre_wall", "Pyre Wall", "fire", 16, 100, 2),
  special("thorn_charge", "Thorn Charge", "plant", 20, 80, 2),
  special("bramble_guard", "Bramble Guard", "plant", 16, 100, 2),
  special("riptide_rush", "Riptide Rush", "water", 20, 80, 2),
  special("tide_aegis", "Tide Aegis", "water", 16, 100, 2),
  special("static_jolt", "Static Jolt", "electric", 12, 100, 1),
  special("volt_dash", "Volt Dash", "electric", 16, 90, 1),
  special("arc_shot", "Arc Shot", "electric", 18, 85, 2),
  special("storm_bolt", "Storm Bolt", "electric", 20, 75, 2),
  special("ion_dart", "Ion Dart", "electric", 14, 95, 1),
  special("gigavolt", "Gigavolt", "electric", 22, 100, 3),
  special("storm_surge", "Storm Surge", "electric", 20, 80, 2),
  special("ion_wall", "Ion Wall", "electric", 16, 100, 2),
  special("pebble_shot", "Pebble Shot", "earth", 12, 100, 1),
  special("dust_devil", "Dust Devil", "earth", 16, 90, 1),
  special("clay_burst", "Clay Burst", "earth", 18, 85, 2),
  special("boulder_toss", "Boulder Toss", "earth", 20, 75, 2),
  special("sand_blast", "Sand Blast", "earth", 14, 95, 1),
  special("tectonic_slam", "Tectonic Slam", "earth", 22, 100, 3),
  special("quake_stomp", "Quake Stomp", "earth", 20, 80, 2),
  special("basalt_guard", "Basalt Guard", "earth", 16, 100, 2),
  special("gust", "Gust", "wind", 12, 100, 1),
  special("feather_dart", "Feather Dart", "wind", 16, 90, 1),
  special("gale_cutter", "Gale Cutter", "wind", 18, 85, 2),
  special("sky_bolt", "Sky Bolt", "wind", 20, 75, 2),
  special("talon_slash", "Talon Slash", "wind", 14, 95, 1),
  special("hurricane_spiral", "Hurricane Spiral", "wind", 22, 100, 3),
  special("cyclone_dive", "Cyclone Dive", "wind", 20, 80, 2),
  special("zephyr_veil", "Zephyr Veil", "wind", 16, 100, 2),
])

const MOVE_INDEX = new Map(
  [BASIC_MOVE, ...CATALOG].map((move) => [move.id, move]),
)

/** Look up a move by id, or undefined when unknown. */
export function getMove(id: string): MoveDef | undefined {
  return MOVE_INDEX.get(id)
}

/**
 * The live cooldown tier, in milliseconds (FR-19, AC-16, P8.T3). The catalog's
 * `cooldown` field is the tier key; this table is the one place the duration
 * is written. Every value is a whole 20 ms step, so the timer never rounds.
 * Tier 0 is the innate strike, never gated.
 *
 * Phase 8 measured the gate against the swing: the exchange rate is set by the
 * swing (startup + active + recovery) and the press band, not by this timer.
 * The gate's job is narrower and still real — a special cannot be fired twice
 * in a row before its own timer runs out. Tiers 1 and 2 sit just above their
 * own swing (spark 1,106 ms against 1.5 s; cinder_shot 1,738 ms against 2 s).
 * Tier 3 is authored *at* its swing (pyre_lance 2,610 ms against 2.6 s) because
 * P8.T3.2 proved the heavy has to stop paying twice: a 3 s gate on a 2.61 s
 * swing was the last thing making the finisher worse per second than the light
 * it displaces. Anything shorter than a tier's swing is inert, and an inert
 * gate is honest — the recovery already covers it.
 */
export const COOLDOWN_MS: Readonly<Record<number, number>> = Object.freeze({
  0: 0,
  1: 1500,
  2: 2000,
  3: 2600,
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
