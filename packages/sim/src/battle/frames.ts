/**
 * Authored frame data for every move in the battle catalog.
 *
 * Continuous Arena Battle FR-5: the continuous engine reads a move's timing
 * and space budget from here — startup, active, and recovery windows, reach,
 * the height band a blow sweeps, projectile speed, poise damage, and stamina
 * cost. The values are authored per move, never derived from power or
 * cooldown; the one ordering rule is that heavier rows start slower and
 * recover longer, which frames.test.ts pins. Recovery is a real commitment:
 * the 20261109 cadence track widened every tail so it is comparable to startup
 * plus active, and the same track's blow-weight pass then multiplied the three
 * per-blow fields (recovery, poise damage, stamina cost) by `BLOW_WEIGHT` so a
 * fight lands a third as many blows, each three times heavier. The table below
 * carries the weighted values; the pre-weight numbers are `row / BLOW_WEIGHT`.
 *
 * Units are fixed-point integers: durations in milliseconds, distances in
 * millimetres, speeds in millimetres per millisecond (1 mm/ms = 1 m/s). `y` is
 * pinned to 0 in this track, so reach is planar and height is a band.
 * Pure data plus one validator — no DOM, no client imports, no I/O.
 */

import { STEP_MS } from "./continuous/types"
import type { MoveDef } from "./moves"

/**
 * The vertical slice of space a blow or shot can reach, in mm above the
 * floor. A body occupies `0..heightMm`, so a band hits only when it starts
 * below the body's head and ends above its feet (FR-17).
 */
export interface HeightBand {
  readonly fromMm: number
  readonly toMm: number
}

/** One move's authored timing and space budget. */
export interface FrameData {
  /** Wind-up before the active window opens, in ms. */
  readonly startupMs: number
  /** Window in which the move can connect, in ms. */
  readonly activeMs: number
  /** Locked tail after the active window, in ms. Always positive. */
  readonly recoveryMs: number
  /**
   * Distance from the attacker's surface at which the move connects, in mm.
   * Reach is edge to edge: both body radii come off the gap (FR-18).
   */
  readonly reachMm: number
  /** The height band the move sweeps, in mm above the floor (FR-17). */
  readonly band: HeightBand
  /** Projectile travel speed in mm/ms (1 m/s); 0 for a melee move. */
  readonly speedMmPerMs: number
  /** Poise removed from the victim on a landed hit. */
  readonly poiseDamage: number
  /** Stamina the attacker pays to commit. */
  readonly staminaCost: number
}

/**
 * Body radius in mm: the default per-body radius a fighter opens with, and
 * the floor under every authored reach. Two bodies may stand one radius each
 * apart, so a strike only has to cross the space between their surfaces.
 */
export const BODY_RADIUS_MM = 220

/**
 * The blow weight (tunable, Phase 6): how many of the authored unit blows one
 * live blow is worth. It is applied to every per-blow quantity, never to a
 * per-second one, so a fight keeps its length and its shape and only its
 * granularity changes — a third as many blows, each three times heavier.
 *
 * - Damage: `positionalDamage` multiplies the numerator by it (not
 *   `strikeDamage`, which the frozen legacy clock shares).
 * - Recovery, poise damage and stamina cost: every row below is authored
 *   already multiplied, so the three cannot drift apart.
 * - Knockback: `KNOCKBACK_PER_POISE` divides it back out, because a blow now
 *   carries three times the poise for the same shove.
 *
 * It is deliberately not applied to a rate: stamina regeneration, the dodge
 * price, decision cadence and the HP scale stay as they are, which is what
 * keeps the stamina budget and the fight length per second unchanged.
 */
export const BLOW_WEIGHT = 3

/** No authored band may reach higher than this, in mm (sane-range guard). */
const BAND_CEILING_MM = 2000

// The three authored slices: a sweep along the floor, a body-height blow, and
// an overhead line. Every roster body stands 650-1200 mm, so all three overlap
// a real fighter; a shorter or taller body can still fall outside one.
const LOW_FROM = 0
const LOW_TO = 600
const MID_FROM = 150
const MID_TO = 1100
const HIGH_FROM = 700
const HIGH_TO = 1500
const BASIC_FROM = 100
const BASIC_TO = 1000

/**
 * Build one frozen row. The argument order is the field order of
 * `FrameData`: startup, active, recovery, reach, band from, band to,
 * projectile speed, poise damage, stamina cost. Rows stay one line each so the
 * table reads as a table and the module stays inside the sim size cap.
 */
function frame(
  startupMs: number,
  activeMs: number,
  recoveryMs: number,
  reachMm: number,
  fromMm: number,
  toMm: number,
  speedMmPerMs: number,
  poiseDamage: number,
  staminaCost: number,
): FrameData {
  return Object.freeze({
    startupMs,
    activeMs,
    recoveryMs,
    reachMm,
    band: Object.freeze({ fromMm, toMm }),
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
  basic: frame(80, 60, 750, 420, BASIC_FROM, BASIC_TO, 0, 6, 6),

  // fire — fast projectiles, quick chip, slow pyre
  spark: frame(130, 60, 900, 5200, MID_FROM, MID_TO, 12, 9, 12),
  flame_charge: frame(150, 70, 990, 5600, MID_FROM, MID_TO, 14, 12, 15),
  cinder_shot: frame(220, 80, 1410, 6000, MID_FROM, MID_TO, 11, 15, 18),
  blaze_bolt: frame(280, 90, 1530, 6200, HIGH_FROM, HIGH_TO, 13, 21, 24),
  flare_dart: frame(110, 50, 900, 5000, MID_FROM, MID_TO, 15, 9, 12),
  pyre_lance: frame(360, 110, 2070, 6500, HIGH_FROM, HIGH_TO, 10, 27, 30),

  // plant — slow seeds, long roots
  seed_shot: frame(130, 60, 900, 5200, MID_FROM, MID_TO, 8, 9, 12),
  thorn_volley: frame(170, 70, 990, 5600, MID_FROM, MID_TO, 9, 12, 15),
  spore_burst: frame(220, 80, 1410, 6000, LOW_FROM, LOW_TO, 7, 15, 18),
  bramble_dart: frame(280, 90, 1530, 6200, MID_FROM, MID_TO, 10, 21, 24),
  vine_lash: frame(110, 50, 900, 5000, MID_FROM, MID_TO, 9, 9, 12),
  root_quake: frame(380, 110, 2130, 6500, LOW_FROM, LOW_TO, 6, 27, 30),

  // water — steady travel, wide spray
  bubble: frame(130, 60, 900, 5200, MID_FROM, MID_TO, 8, 9, 12),
  tide_shot: frame(170, 70, 990, 5600, MID_FROM, MID_TO, 10, 12, 15),
  foam_volley: frame(220, 80, 1410, 6000, LOW_FROM, LOW_TO, 9, 15, 18),
  splash_bolt: frame(280, 90, 1530, 6200, MID_FROM, MID_TO, 11, 21, 24),
  mist_spray: frame(110, 50, 900, 5000, LOW_FROM, LOW_TO, 12, 9, 12),
  maelstrom: frame(360, 110, 2070, 6500, HIGH_FROM, HIGH_TO, 7, 27, 30),

  // wider pool: dashes and walls, then the branch signatures
  cinder_dive: frame(240, 100, 1470, 6000, MID_FROM, MID_TO, 16, 21, 24),
  pyre_wall: frame(260, 220, 1410, 4200, LOW_FROM, LOW_TO, 8, 15, 18),
  thorn_charge: frame(260, 100, 1530, 5800, MID_FROM, MID_TO, 12, 21, 24),
  bramble_guard: frame(280, 240, 1440, 4000, LOW_FROM, LOW_TO, 6, 15, 18),
  riptide_rush: frame(250, 90, 1500, 5800, MID_FROM, MID_TO, 14, 21, 24),
  tide_aegis: frame(270, 220, 1410, 4200, LOW_FROM, LOW_TO, 7, 15, 18),

  // electric — the fastest shots in the catalog
  static_jolt: frame(120, 60, 900, 5200, MID_FROM, MID_TO, 14, 9, 12),
  volt_dash: frame(140, 70, 990, 5600, MID_FROM, MID_TO, 18, 12, 15),
  arc_shot: frame(200, 80, 1380, 6000, MID_FROM, MID_TO, 15, 15, 18),
  storm_bolt: frame(260, 90, 1500, 6200, HIGH_FROM, HIGH_TO, 16, 21, 24),
  ion_dart: frame(100, 50, 900, 5000, MID_FROM, MID_TO, 17, 9, 12),
  gigavolt: frame(340, 110, 2040, 6500, HIGH_FROM, HIGH_TO, 13, 27, 30),

  storm_surge: frame(240, 90, 1470, 6200, MID_FROM, MID_TO, 18, 21, 24),
  ion_wall: frame(250, 200, 1380, 4400, LOW_FROM, LOW_TO, 12, 15, 18),

  // earth — heavy, slow, hard to dodge
  pebble_shot: frame(150, 60, 930, 5200, MID_FROM, MID_TO, 7, 9, 12),
  dust_devil: frame(190, 70, 1020, 5600, LOW_FROM, LOW_TO, 8, 12, 15),
  clay_burst: frame(240, 80, 1440, 6000, MID_FROM, MID_TO, 6, 15, 18),
  boulder_toss: frame(300, 90, 1560, 6200, HIGH_FROM, HIGH_TO, 5, 21, 24),
  sand_blast: frame(120, 50, 900, 5000, LOW_FROM, LOW_TO, 9, 9, 12),
  tectonic_slam: frame(400, 110, 2160, 6500, LOW_FROM, LOW_TO, 4, 27, 30),

  quake_stomp: frame(320, 120, 1560, 5200, LOW_FROM, LOW_TO, 5, 21, 24),
  basalt_guard: frame(300, 260, 1470, 3800, LOW_FROM, LOW_TO, 4, 15, 18),

  // wind — the quickest starts, the lightest footing
  gust: frame(110, 60, 900, 5200, MID_FROM, MID_TO, 15, 9, 12),
  feather_dart: frame(140, 70, 990, 5600, MID_FROM, MID_TO, 18, 12, 15),
  gale_cutter: frame(200, 80, 1380, 6000, MID_FROM, MID_TO, 16, 15, 18),
  sky_bolt: frame(250, 90, 1500, 6200, HIGH_FROM, HIGH_TO, 17, 21, 24),
  talon_slash: frame(90, 50, 900, 5000, MID_FROM, MID_TO, 19, 9, 12),
  hurricane_spiral: frame(340, 110, 2010, 6500, HIGH_FROM, HIGH_TO, 12, 27, 30),

  cyclone_dive: frame(230, 90, 1440, 6000, MID_FROM, MID_TO, 20, 21, 24),
  zephyr_veil: frame(240, 210, 1380, 4400, LOW_FROM, LOW_TO, 14, 15, 18),
})

/** The authored row for a move id, or undefined when the id is unknown. */
export function getFrameData(moveId: string): FrameData | undefined {
  return Object.hasOwn(FRAME_DATA, moveId) ? FRAME_DATA[moveId] : undefined
}

/**
 * Rejects authored data the continuous engine cannot run: a move that never
 * leaves recovery, an active window shorter than one step, a projectile that
 * never travels, a band that is empty or implausible, or a strike that does
 * not reach past its own body. Throws on the first problem, naming the move.
 */
export function validateFrameData(move: MoveDef, row: FrameData): void {
  if (row.startupMs < 0) {
    throw new Error(`Startup cannot be negative: ${move.id}`)
  }
  if (row.activeMs < STEP_MS) {
    throw new Error(
      `A move needs an active window of at least one step: ${move.id}`,
    )
  }
  if (row.recoveryMs <= 0) {
    throw new Error(`A move needs a positive recovery: ${move.id}`)
  }
  if (row.reachMm < BODY_RADIUS_MM) {
    throw new Error(`Reach is below the body radius: ${move.id}`)
  }
  if (row.band.fromMm < 0) {
    throw new Error(`Height band starts below the floor: ${move.id}`)
  }
  if (row.band.toMm <= row.band.fromMm) {
    throw new Error(`Height band must span a positive height: ${move.id}`)
  }
  if (row.band.toMm > BAND_CEILING_MM) {
    throw new Error(`Height band reaches implausibly high: ${move.id}`)
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
