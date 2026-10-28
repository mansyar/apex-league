import { PROJECTILE_LIFE_MS } from "./looks"
import { EARTH_FX } from "./moves/earth"
import { ELECTRIC_FX } from "./moves/electric"
import { fallbackFor } from "./moves/fallback"
import { FIRE_FX } from "./moves/fire"
import { PLANT_FX } from "./moves/plant"
import { WATER_FX } from "./moves/water"
import { WIND_FX } from "./moves/wind"

/**
 * Attack grammar, as fractions of the action's total length. The melee
 * strike now reads its boundaries from the enriched playback contract
 * (PLAYBACK_PHASES.melee — windup ends 0.26, contact lands 0.46); the
 * projectile shot still times its launch off CONTACT_T until its
 * bespoke Phase 2 choreography retunes the row.
 */
export const CONTACT_T = 0.46

export interface BurstStyle {
  /** Fragment count. */
  puffs?: number
  /** Scatter on a flat horizontal ring instead of a random sphere. */
  ring?: boolean
  /** Downward pull, units per second squared (element default). */
  gravity?: number
  /** Lateral sine drift on fragments, units per second (element default). */
  sway?: number
  /** Burst duration in ms (default 520). */
  life?: number
  /** How far the glow shell swells (default 2.4). */
  flashGrow?: number
  /** Radius multiplier for flash and fragments (default 1). */
  size?: number
  /** Override the element hue (e.g. dust grays). */
  tint?: string
  /** Set false for non-emissive bursts (dust) with no glow shell. */
  flash?: boolean
  /**
   * Spawn at the target group origin (feet/floor) instead of the lifted
   * burst base — opt-in for ground-erupting rings (Phase 7 pyre_wall).
   */
  grounded?: boolean
}

export interface Posture {
  /** Windup coil pitch amplitude (signed; hold => half-sine). */
  pitch?: number
  /** Hold the coil at full depth (half-sine) instead of a full sine. */
  hold?: boolean
  /** Windup roll amplitude (full sine). */
  roll?: number
  /** Windup vertical rise amplitude (full sine, signed). */
  rise?: number
  /** Quadratic backward pull into the windup. */
  coilX?: number
  /** Recoil pitch amplitude (positive, full sine). */
  pitchOut?: number
  /** Recoil horizontal sweep: [pull-back, overshoot]. */
  sweepX?: [number, number]
  /** Recoil vertical rise. */
  riseOut?: number
}

export interface ShotSpec {
  size: number
  life: number
  /** Lateral z offset for fanned volleys. */
  spread?: number
  /** Release beat as a fraction of the launch action. */
  at: number
}

export interface MoveFx {
  /** Windup fraction of the launch action at full pacing. */
  wind: number
  /** Projectiles released (one entry per shot; volleys list several). */
  shots: ShotSpec[]
  /** Flash at the thrower's mouth on the first release. */
  muzzle?: BurstStyle
  /** Backward impulse on each release beat. */
  kick: number
  /** A charge orb swelling at the mouth through the windup. */
  charge?: { from: number; to: number }
  /** Launch body posture: windup curve and recoil curve. */
  pose: { windup: Posture; recoil: Posture }
  /**
   * Attacker body transit during the launch action (Phase 5 fix): the
   * attacker mesh travels toward the target as a fraction of the live
   * gap (far-range safe) with an optional vertical arc peak, then rides
   * the same sine back home — offset-only, so later steps are
   * unaffected. Absent on every row but the body-first dash pair. An
   * optional `trail` style sheds flame puffs along the crossing (Phase 7).
   */
  transit?: { reach: number; lift?: number; trail?: BurstStyle }
  /**
   * Arrival treatment where the shot lands, plus the victim shove.
   * `beyond` shifts the burst past the target along the attack axis
   * (pass-through exit wound); absent everywhere but pyre_lance.
   */
  arrival: {
    burst: BurstStyle
    lanes?: number[]
    shove: number
    beyond?: number
  }
  /** Point-blank compression: squeezed windup, micro-flight, beats. */
  compressed?: { wind: number; flight: number; beats: number[] }
}

/**
 * Bespoke looks, keyed by move id (spec FR-2). A move with no entry renders
 * through its element's authored fallback body (`./moves/fallback`) plus
 * its element's shot look, so
 * two moves of the same element that are both absent from this map are
 * pixel-identical apart from the numbers in the log — which is why each
 * element's heavy finisher (move_pool_20261018) earns an entry even though
 * no side-by-side capture was needed to prove the pair matched.
 *
 * Split by element (battle_choreography_20261024): each `./moves/<element>`
 * table owns that element's rows and this record only assembles them, so the
 * element seam is also the size seam. All 48 catalog specials are bespoke
 * (elemental-identity track); unknown ids fall back to their element body.
 */
export const MOVE_FX: Record<string, MoveFx> = {
  ...FIRE_FX,
  ...WATER_FX,
  ...PLANT_FX,
  ...ELECTRIC_FX,
  ...EARTH_FX,
  ...WIND_FX,
}

/**
 * Shared tier 1-2 launch archetype; the fallback for unknown ids of unknown
 * elements. Known elements resolve to their authored fallback body first.
 */
export const DEFAULT_FX: MoveFx = {
  wind: CONTACT_T,
  shots: [{ size: 1, life: PROJECTILE_LIFE_MS, at: CONTACT_T }],
  kick: -0.35,
  pose: {
    windup: { pitch: -0.16, roll: 0.06, rise: 0.04, coilX: 0.14 },
    recoil: { pitchOut: 0.09, sweepX: [0.14, -0.34] },
  },
  arrival: { burst: {}, shove: 0 },
}

export const fxFor = (
  moveId: string | undefined,
  element?: string | undefined,
): MoveFx =>
  (moveId !== undefined ? MOVE_FX[moveId] : undefined) ??
  fallbackFor(element) ??
  DEFAULT_FX
