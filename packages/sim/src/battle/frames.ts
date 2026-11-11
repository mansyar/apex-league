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
 * plus active, and the same track's blow-weight pass then multiplied all five
 * frame fields (startup, active, recovery, poise damage, stamina cost) by 2 so
 * a fight lands half as many blows, each twice as heavy. Phase 5 folded that
 * weight into `MoveDef.power` and into these rows (FR-2), so the table is now
 * the literal budget: a blow that is twice as heavy also takes twice as long
 * to arrive and to commit, and damage per second stays put.
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
  /**
   * Inner edge of the move's space, in mm: the move whiffs when the centre gap
   * is closer than this plus both body radii. `0` means no dead zone (FR-1).
   */
  readonly minReachMm: number
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
 * Build one frozen row. The argument order is startup, active, recovery, reach,
 * band from, band to, projectile speed, poise damage, stamina cost, then the
 * minimum reach, which defaults to `0` so a row with no dead zone stays a
 * short line. Rows stay one line each so the table reads as a table and the
 * module stays inside the sim size cap.
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
  minReachMm = 0,
): FrameData {
  return Object.freeze({
    startupMs,
    activeMs,
    recoveryMs,
    reachMm,
    minReachMm,
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
  basic: frame(160, 120, 606, 420, BASIC_FROM, BASIC_TO, 0, 4, 4),

  // fire — fast projectiles, quick chip, slow pyre
  spark: frame(260, 120, 726, 5200, MID_FROM, MID_TO, 12, 6, 8, 90),
  flame_charge: frame(300, 140, 798, 5600, MID_FROM, MID_TO, 14, 8, 10, 90),
  cinder_shot: frame(440, 160, 1138, 6000, MID_FROM, MID_TO, 11, 10, 12, 90),
  blaze_bolt: frame(560, 180, 1234, 6200, HIGH_FROM, HIGH_TO, 13, 14, 16, 90),
  flare_dart: frame(220, 100, 726, 5000, MID_FROM, MID_TO, 15, 6, 8, 90),
  pyre_lance: frame(720, 220, 1670, 6500, HIGH_FROM, HIGH_TO, 10, 18, 20, 90),

  // plant — slow seeds, long roots
  seed_shot: frame(260, 120, 726, 5200, MID_FROM, MID_TO, 8, 6, 8, 90),
  thorn_volley: frame(340, 140, 798, 5600, MID_FROM, MID_TO, 9, 8, 10, 90),
  spore_burst: frame(440, 160, 1138, 6000, LOW_FROM, LOW_TO, 7, 10, 12, 90),
  bramble_dart: frame(560, 180, 1234, 6200, MID_FROM, MID_TO, 10, 14, 16, 90),
  vine_lash: frame(220, 100, 726, 5000, MID_FROM, MID_TO, 9, 6, 8, 90),
  root_quake: frame(760, 220, 1718, 6500, LOW_FROM, LOW_TO, 6, 18, 20, 90),

  // water — steady travel, wide spray
  bubble: frame(260, 120, 726, 5200, MID_FROM, MID_TO, 8, 6, 8, 90),
  tide_shot: frame(340, 140, 798, 5600, MID_FROM, MID_TO, 10, 8, 10, 90),
  foam_volley: frame(440, 160, 1138, 6000, LOW_FROM, LOW_TO, 9, 10, 12, 90),
  splash_bolt: frame(560, 180, 1234, 6200, MID_FROM, MID_TO, 11, 14, 16, 90),
  mist_spray: frame(220, 100, 726, 5000, LOW_FROM, LOW_TO, 12, 6, 8, 90),
  maelstrom: frame(720, 220, 1670, 6500, HIGH_FROM, HIGH_TO, 7, 18, 20, 90),

  // wider pool: dashes and walls, then the branch signatures
  cinder_dive: frame(480, 200, 1186, 6000, MID_FROM, MID_TO, 16, 14, 16, 90),
  pyre_wall: frame(520, 440, 1138, 4200, LOW_FROM, LOW_TO, 8, 10, 12),
  thorn_charge: frame(520, 200, 1234, 5800, MID_FROM, MID_TO, 12, 14, 16, 90),
  bramble_guard: frame(560, 480, 1162, 4000, LOW_FROM, LOW_TO, 6, 10, 12),
  riptide_rush: frame(500, 180, 1210, 5800, MID_FROM, MID_TO, 14, 14, 16, 90),
  tide_aegis: frame(540, 440, 1138, 4200, LOW_FROM, LOW_TO, 7, 10, 12),

  // electric — the fastest shots in the catalog
  static_jolt: frame(240, 120, 726, 5200, MID_FROM, MID_TO, 14, 6, 8, 90),
  volt_dash: frame(280, 140, 798, 5600, MID_FROM, MID_TO, 18, 8, 10, 90),
  arc_shot: frame(400, 160, 1112, 6000, MID_FROM, MID_TO, 15, 10, 12, 90),
  storm_bolt: frame(520, 180, 1210, 6200, HIGH_FROM, HIGH_TO, 16, 14, 16, 90),
  ion_dart: frame(200, 100, 726, 5000, MID_FROM, MID_TO, 17, 6, 8, 90),
  gigavolt: frame(680, 220, 1646, 6500, HIGH_FROM, HIGH_TO, 13, 18, 20, 90),

  storm_surge: frame(480, 180, 1186, 6200, MID_FROM, MID_TO, 18, 14, 16, 90),
  ion_wall: frame(500, 400, 1112, 4400, LOW_FROM, LOW_TO, 12, 10, 12),

  // earth — heavy, slow, hard to dodge
  pebble_shot: frame(300, 120, 750, 5200, MID_FROM, MID_TO, 7, 6, 8, 90),
  dust_devil: frame(380, 140, 822, 5600, LOW_FROM, LOW_TO, 8, 8, 10, 90),
  clay_burst: frame(480, 160, 1162, 6000, MID_FROM, MID_TO, 6, 10, 12, 90),
  // R5: startup pulled from 600 to 512, the one frame field the tortoise can
  // spend on volume. Recovery is SPD-scaled (2.5x at spd 4) and frozen, so a
  // swing it cannot shorten is a swing it cannot afford; startup is authored
  // and stays 512 — still a step above clay_burst, still under the finisher.
  boulder_toss: frame(512, 180, 1258, 6200, HIGH_FROM, HIGH_TO, 5, 14, 16, 90),
  sand_blast: frame(240, 100, 726, 5000, LOW_FROM, LOW_TO, 9, 6, 8, 90),
  // P8.T3.2: the earth finisher had the longest swing of any heavy (2,762 ms),
  // which left it the only one out-earned by its own light row on the damage
  // clock. Its recovery is pulled back to the other heavies' band (2,690 ms of
  // swing) so the tier is worth carrying; startup, active, poise and stamina
  // are unchanged.
  tectonic_slam: frame(800, 220, 1670, 6500, LOW_FROM, LOW_TO, 4, 18, 20, 90),

  quake_stomp: frame(640, 240, 1258, 5200, LOW_FROM, LOW_TO, 5, 14, 16, 90),
  basalt_guard: frame(600, 520, 1186, 3800, LOW_FROM, LOW_TO, 4, 10, 12),

  // wind — the quickest starts, the lightest footing
  gust: frame(220, 120, 726, 5200, MID_FROM, MID_TO, 15, 6, 8, 90),
  feather_dart: frame(280, 140, 798, 5600, MID_FROM, MID_TO, 18, 8, 10, 90),
  gale_cutter: frame(400, 160, 1112, 6000, MID_FROM, MID_TO, 16, 10, 12, 90),
  sky_bolt: frame(500, 180, 1210, 6200, HIGH_FROM, HIGH_TO, 17, 14, 16, 90),
  talon_slash: frame(180, 100, 726, 5000, MID_FROM, MID_TO, 19, 6, 8, 90),
  hurricane_spiral: frame(
    680,
    220,
    1622,
    6500,
    HIGH_FROM,
    HIGH_TO,
    12,
    18,
    20,
    90,
  ),

  cyclone_dive: frame(460, 180, 1162, 6000, MID_FROM, MID_TO, 20, 14, 16, 90),
  zephyr_veil: frame(480, 420, 1112, 4400, LOW_FROM, LOW_TO, 14, 10, 12),
})

/** The authored row for a move id, or undefined when the id is unknown. */
export function getFrameData(moveId: string): FrameData | undefined {
  return Object.hasOwn(FRAME_DATA, moveId) ? FRAME_DATA[moveId] : undefined
}

/**
 * Rejects authored data the continuous engine cannot run: a move that never
 * leaves recovery, an active window shorter than one step, a projectile that
 * never travels, a band that is empty or implausible, a strike that does not
 * reach past its own body, or a dead zone that swallows the whole move. Throws
 * on the first problem, naming the move.
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
  if (row.minReachMm < 0) {
    throw new Error(`Minimum reach cannot be negative: ${move.id}`)
  }
  if (row.minReachMm >= row.reachMm) {
    throw new Error(`Minimum reach must stay inside the reach: ${move.id}`)
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
