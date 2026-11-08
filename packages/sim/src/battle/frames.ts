/**
 * Authored frame data for every move in the battle catalog.
 *
 * Continuous Arena Battle FR-5: the continuous engine reads a move's timing
 * and space budget from here — startup, active, and recovery windows, reach,
 * projectile speed, poise damage, and stamina cost. The values are authored
 * per move, never derived from power or cooldown; the one ordering rule is
 * that heavier rows start slower and recover longer, which frames.test.ts
 * pins. Balance is a later track, so the numbers are plausible, not tuned.
 *
 * Units are fixed-point integers: durations in milliseconds, distances in
 * millimetres, speeds in millimetres per millisecond (1 mm/ms = 1 m/s).
 * `y` is pinned to 0 in this track, so reach is planar distance.
 * Pure data plus one validator — no DOM, no client imports, no I/O.
 */

import type { MoveDef } from "./moves"

/** One move's authored timing and space budget. */
export interface FrameData {
  /** Wind-up before the active window opens, in ms. */
  readonly startupMs: number
  /** Window in which the move can connect, in ms. */
  readonly activeMs: number
  /** Locked tail after the active window, in ms. Always positive. */
  readonly recoveryMs: number
  /** Planar centre-to-centre distance at which the move connects, in mm. */
  readonly reachMm: number
  /** Projectile travel speed in mm/ms (1 m/s); 0 for a melee move. */
  readonly speedMmPerMs: number
  /** Poise removed from the victim on a landed hit. */
  readonly poiseDamage: number
  /** Stamina the attacker pays to commit. */
  readonly staminaCost: number
}

/**
 * Body radius in mm: the closest two fighter centres can stand without
 * overlapping. A strike cannot connect inside its own body, so every
 * authored reach must clear it (see `validateFrameData`).
 */
export const BODY_RADIUS_MM = 220

/**
 * Build one frozen row. The argument order is the field order of
 * `FrameData`: startup, active, recovery, reach, projectile speed, poise
 * damage, stamina cost. Rows stay one line each so the table reads as a
 * table and the module stays inside the sim size cap.
 */
function frame(
  startupMs: number,
  activeMs: number,
  recoveryMs: number,
  reachMm: number,
  speedMmPerMs: number,
  poiseDamage: number,
  staminaCost: number,
): FrameData {
  return Object.freeze({
    startupMs,
    activeMs,
    recoveryMs,
    reachMm,
    speedMmPerMs,
    poiseDamage,
    staminaCost,
  })
}

/**
 * One authored row per catalog move, keyed by move id and ordered like
 * `moves.ts`: the innate basic strike, each element's six kit rows, then the
 * wider pool and the two branch signatures. A repeated key is a type error,
 * and frames.test.ts proves the key set matches the catalog exactly.
 */
export const FRAME_DATA: Readonly<Record<string, FrameData>> = Object.freeze({
  basic: frame(80, 60, 140, 420, 0, 2, 2),

  // fire — fast projectiles, quick chip, slow pyre
  spark: frame(130, 60, 180, 5200, 12, 3, 4),
  flame_charge: frame(150, 70, 210, 5600, 14, 4, 5),
  cinder_shot: frame(220, 80, 280, 6000, 11, 5, 6),
  blaze_bolt: frame(280, 90, 340, 6200, 13, 7, 8),
  flare_dart: frame(110, 50, 160, 5000, 15, 3, 4),
  pyre_lance: frame(360, 110, 460, 6500, 10, 9, 10),

  // plant — slow seeds, long roots
  seed_shot: frame(130, 60, 180, 5200, 8, 3, 4),
  thorn_volley: frame(170, 70, 210, 5600, 9, 4, 5),
  spore_burst: frame(220, 80, 280, 6000, 7, 5, 6),
  bramble_dart: frame(280, 90, 340, 6200, 10, 7, 8),
  vine_lash: frame(110, 50, 160, 5000, 9, 3, 4),
  root_quake: frame(380, 110, 480, 6500, 6, 9, 10),

  // water — steady travel, wide spray
  bubble: frame(130, 60, 180, 5200, 8, 3, 4),
  tide_shot: frame(170, 70, 210, 5600, 10, 4, 5),
  foam_volley: frame(220, 80, 280, 6000, 9, 5, 6),
  splash_bolt: frame(280, 90, 340, 6200, 11, 7, 8),
  mist_spray: frame(110, 50, 160, 5000, 12, 3, 4),
  maelstrom: frame(360, 110, 460, 6500, 7, 9, 10),

  // wider pool: dashes and walls, then the branch signatures
  cinder_dive: frame(240, 100, 340, 6000, 16, 7, 8),
  pyre_wall: frame(260, 220, 300, 4200, 8, 5, 6),
  thorn_charge: frame(260, 100, 360, 5800, 12, 7, 8),
  bramble_guard: frame(280, 240, 320, 4000, 6, 5, 6),
  riptide_rush: frame(250, 90, 350, 5800, 14, 7, 8),
  tide_aegis: frame(270, 220, 310, 4200, 7, 5, 6),

  // electric — the fastest shots in the catalog
  static_jolt: frame(120, 60, 170, 5200, 14, 3, 4),
  volt_dash: frame(140, 70, 200, 5600, 18, 4, 5),
  arc_shot: frame(200, 80, 260, 6000, 15, 5, 6),
  storm_bolt: frame(260, 90, 320, 6200, 16, 7, 8),
  ion_dart: frame(100, 50, 150, 5000, 17, 3, 4),
  gigavolt: frame(340, 110, 440, 6500, 13, 9, 10),

  storm_surge: frame(240, 90, 330, 6200, 18, 7, 8),
  ion_wall: frame(250, 200, 300, 4400, 12, 5, 6),

  // earth — heavy, slow, hard to dodge
  pebble_shot: frame(150, 60, 200, 5200, 7, 3, 4),
  dust_devil: frame(190, 70, 230, 5600, 8, 4, 5),
  clay_burst: frame(240, 80, 300, 6000, 6, 5, 6),
  boulder_toss: frame(300, 90, 360, 6200, 5, 7, 8),
  sand_blast: frame(120, 50, 170, 5000, 9, 3, 4),
  tectonic_slam: frame(400, 110, 500, 6500, 4, 9, 10),

  quake_stomp: frame(320, 120, 400, 5200, 5, 7, 8),
  basalt_guard: frame(300, 260, 340, 3800, 4, 5, 6),

  // wind — the quickest starts, the lightest footing
  gust: frame(110, 60, 160, 5200, 15, 3, 4),
  feather_dart: frame(140, 70, 190, 5600, 18, 4, 5),
  gale_cutter: frame(200, 80, 250, 6000, 16, 5, 6),
  sky_bolt: frame(250, 90, 310, 6200, 17, 7, 8),
  talon_slash: frame(90, 50, 150, 5000, 19, 3, 4),
  hurricane_spiral: frame(340, 110, 440, 6500, 12, 9, 10),

  cyclone_dive: frame(230, 90, 320, 6000, 20, 7, 8),
  zephyr_veil: frame(240, 210, 290, 4400, 14, 5, 6),
})

/** The authored row for a move id, or undefined when the id is unknown. */
export function getFrameData(moveId: string): FrameData | undefined {
  return Object.hasOwn(FRAME_DATA, moveId) ? FRAME_DATA[moveId] : undefined
}

/**
 * Rejects authored data the continuous engine cannot run: a move that never
 * leaves recovery, a projectile that never travels, or a strike shorter than
 * its own body. Throws on the first problem, naming the move.
 */
export function validateFrameData(move: MoveDef, row: FrameData): void {
  if (row.startupMs < 0) {
    throw new Error(`Startup cannot be negative: ${move.id}`)
  }
  if (row.activeMs <= 0) {
    throw new Error(`A move needs a positive active window: ${move.id}`)
  }
  if (row.recoveryMs <= 0) {
    throw new Error(`A move needs a positive recovery: ${move.id}`)
  }
  if (row.reachMm < BODY_RADIUS_MM) {
    throw new Error(`Reach is below the body radius: ${move.id}`)
  }
  if (move.melee && row.speedMmPerMs !== 0) {
    throw new Error(`A melee move carries no projectile speed: ${move.id}`)
  }
  if (!move.melee && row.speedMmPerMs <= 0) {
    throw new Error(`A ranged move needs a projectile speed: ${move.id}`)
  }
  if (row.poiseDamage < 0) {
    throw new Error(`Poise damage cannot be negative: ${move.id}`)
  }
  if (row.staminaCost < 0) {
    throw new Error(`Stamina cost cannot be negative: ${move.id}`)
  }
}
