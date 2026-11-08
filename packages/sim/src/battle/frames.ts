/**
 * Authored frame data for every move in the battle catalog.
 *
 * Continuous Arena Battle FR-5: the continuous engine reads a move's timing
 * and space budget from here — startup, active, and recovery windows, reach,
 * the height band a blow sweeps, projectile speed, poise damage, and stamina
 * cost. The values are authored per move, never derived from power or
 * cooldown; the one ordering rule is that heavier rows start slower and
 * recover longer, which frames.test.ts pins. Balance is a later track, so the
 * numbers are plausible, not tuned.
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
  basic: frame(80, 60, 140, 420, BASIC_FROM, BASIC_TO, 0, 2, 2),

  // fire — fast projectiles, quick chip, slow pyre
  spark: frame(130, 60, 180, 5200, MID_FROM, MID_TO, 12, 3, 4),
  flame_charge: frame(150, 70, 210, 5600, MID_FROM, MID_TO, 14, 4, 5),
  cinder_shot: frame(220, 80, 280, 6000, MID_FROM, MID_TO, 11, 5, 6),
  blaze_bolt: frame(280, 90, 340, 6200, HIGH_FROM, HIGH_TO, 13, 7, 8),
  flare_dart: frame(110, 50, 160, 5000, MID_FROM, MID_TO, 15, 3, 4),
  pyre_lance: frame(360, 110, 460, 6500, HIGH_FROM, HIGH_TO, 10, 9, 10),

  // plant — slow seeds, long roots
  seed_shot: frame(130, 60, 180, 5200, MID_FROM, MID_TO, 8, 3, 4),
  thorn_volley: frame(170, 70, 210, 5600, MID_FROM, MID_TO, 9, 4, 5),
  spore_burst: frame(220, 80, 280, 6000, LOW_FROM, LOW_TO, 7, 5, 6),
  bramble_dart: frame(280, 90, 340, 6200, MID_FROM, MID_TO, 10, 7, 8),
  vine_lash: frame(110, 50, 160, 5000, MID_FROM, MID_TO, 9, 3, 4),
  root_quake: frame(380, 110, 480, 6500, LOW_FROM, LOW_TO, 6, 9, 10),

  // water — steady travel, wide spray
  bubble: frame(130, 60, 180, 5200, MID_FROM, MID_TO, 8, 3, 4),
  tide_shot: frame(170, 70, 210, 5600, MID_FROM, MID_TO, 10, 4, 5),
  foam_volley: frame(220, 80, 280, 6000, LOW_FROM, LOW_TO, 9, 5, 6),
  splash_bolt: frame(280, 90, 340, 6200, MID_FROM, MID_TO, 11, 7, 8),
  mist_spray: frame(110, 50, 160, 5000, LOW_FROM, LOW_TO, 12, 3, 4),
  maelstrom: frame(360, 110, 460, 6500, HIGH_FROM, HIGH_TO, 7, 9, 10),

  // wider pool: dashes and walls, then the branch signatures
  cinder_dive: frame(240, 100, 340, 6000, MID_FROM, MID_TO, 16, 7, 8),
  pyre_wall: frame(260, 220, 300, 4200, LOW_FROM, LOW_TO, 8, 5, 6),
  thorn_charge: frame(260, 100, 360, 5800, MID_FROM, MID_TO, 12, 7, 8),
  bramble_guard: frame(280, 240, 320, 4000, LOW_FROM, LOW_TO, 6, 5, 6),
  riptide_rush: frame(250, 90, 350, 5800, MID_FROM, MID_TO, 14, 7, 8),
  tide_aegis: frame(270, 220, 310, 4200, LOW_FROM, LOW_TO, 7, 5, 6),

  // electric — the fastest shots in the catalog
  static_jolt: frame(120, 60, 170, 5200, MID_FROM, MID_TO, 14, 3, 4),
  volt_dash: frame(140, 70, 200, 5600, MID_FROM, MID_TO, 18, 4, 5),
  arc_shot: frame(200, 80, 260, 6000, MID_FROM, MID_TO, 15, 5, 6),
  storm_bolt: frame(260, 90, 320, 6200, HIGH_FROM, HIGH_TO, 16, 7, 8),
  ion_dart: frame(100, 50, 150, 5000, MID_FROM, MID_TO, 17, 3, 4),
  gigavolt: frame(340, 110, 440, 6500, HIGH_FROM, HIGH_TO, 13, 9, 10),

  storm_surge: frame(240, 90, 330, 6200, MID_FROM, MID_TO, 18, 7, 8),
  ion_wall: frame(250, 200, 300, 4400, LOW_FROM, LOW_TO, 12, 5, 6),

  // earth — heavy, slow, hard to dodge
  pebble_shot: frame(150, 60, 200, 5200, MID_FROM, MID_TO, 7, 3, 4),
  dust_devil: frame(190, 70, 230, 5600, LOW_FROM, LOW_TO, 8, 4, 5),
  clay_burst: frame(240, 80, 300, 6000, MID_FROM, MID_TO, 6, 5, 6),
  boulder_toss: frame(300, 90, 360, 6200, HIGH_FROM, HIGH_TO, 5, 7, 8),
  sand_blast: frame(120, 50, 170, 5000, LOW_FROM, LOW_TO, 9, 3, 4),
  tectonic_slam: frame(400, 110, 500, 6500, LOW_FROM, LOW_TO, 4, 9, 10),

  quake_stomp: frame(320, 120, 400, 5200, LOW_FROM, LOW_TO, 5, 7, 8),
  basalt_guard: frame(300, 260, 340, 3800, LOW_FROM, LOW_TO, 4, 5, 6),

  // wind — the quickest starts, the lightest footing
  gust: frame(110, 60, 160, 5200, MID_FROM, MID_TO, 15, 3, 4),
  feather_dart: frame(140, 70, 190, 5600, MID_FROM, MID_TO, 18, 4, 5),
  gale_cutter: frame(200, 80, 250, 6000, MID_FROM, MID_TO, 16, 5, 6),
  sky_bolt: frame(250, 90, 310, 6200, HIGH_FROM, HIGH_TO, 17, 7, 8),
  talon_slash: frame(90, 50, 150, 5000, MID_FROM, MID_TO, 19, 3, 4),
  hurricane_spiral: frame(340, 110, 440, 6500, HIGH_FROM, HIGH_TO, 12, 9, 10),

  cyclone_dive: frame(230, 90, 320, 6000, MID_FROM, MID_TO, 20, 7, 8),
  zephyr_veil: frame(240, 210, 290, 4400, LOW_FROM, LOW_TO, 14, 5, 6),
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
