import type { MoveFx } from "../moves"
import { barrierBody, beamBody } from "./verbs"

/**
 * Wind bespoke rows (FR-2/FR-4/FR-5): the stretched-streak + gust-ring
 * grammar. Every shot flies the wind-only streak core (a faceted needle,
 * never water's smooth teardrop) with a streak-sliver trail (never plant's
 * seeds); every arrival lands as a low, drifting gust ring (gravity ~2.4,
 * sway ~1.6, additive) with a rising windup behind it.
 */
export const WIND_FX: Record<string, MoveFx> = {
  // Gust (chip P6): one quick thin streak, no charge to swell it.
  gust: {
    wind: 0.34,
    shots: [{ size: 0.7, life: 640, at: 0.34 }],
    muzzle: {
      puffs: 4,
      size: 0.8,
      life: 280,
      gravity: 2,
      sway: 1.6,
      flashGrow: 2.4,
    },
    kick: -0.3,
    pose: {
      windup: { pitch: -0.14, hold: true, roll: 0.14, rise: 0.14, coilX: 0.12 },
      recoil: { pitchOut: 0.08, sweepX: [0.12, -0.34], riseOut: 0.07 },
    },
    arrival: {
      burst: {
        puffs: 6,
        ring: true,
        size: 0.9,
        life: 420,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 2.6,
      },
      shove: -0.35,
    },
  },
  // Feather Dart (P8): one small fast dart, a lighter read than the gust.
  feather_dart: {
    wind: 0.42,
    shots: [{ size: 0.9, life: 660, at: 0.42 }],
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 300,
      gravity: 2,
      sway: 1.6,
      flashGrow: 2.4,
    },
    kick: -0.36,
    pose: {
      windup: { pitch: -0.16, hold: true, roll: 0.14, rise: 0.16, coilX: 0.14 },
      recoil: { pitchOut: 0.1, sweepX: [0.14, -0.42], riseOut: 0.07 },
    },
    arrival: {
      burst: {
        puffs: 7,
        ring: true,
        size: 1.0,
        life: 440,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 2.6,
      },
      shove: -0.4,
    },
  },
  // Gale Cutter (workhorse P10): one wide sweeping blade streak, held coil.
  gale_cutter: {
    wind: 0.55,
    shots: [{ size: 1.7, life: 780, at: 0.55 }],
    muzzle: {
      puffs: 6,
      size: 1.1,
      life: 340,
      gravity: 2,
      sway: 1.6,
      flashGrow: 2.6,
    },
    kick: -0.55,
    pose: {
      windup: { pitch: -0.2, hold: true, roll: 0.14, rise: 0.16, coilX: 0.22 },
      recoil: { pitchOut: 0.14, sweepX: [0.22, -0.62], riseOut: 0.08 },
    },
    arrival: {
      burst: {
        puffs: 9,
        ring: true,
        size: 1.5,
        life: 520,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 2.8,
      },
      shove: -0.5,
    },
  },
  // Sky Bolt (P12): a fast long bolt called down from above — the beam
  // verb with a steep plunging recoil, so it reads as a dive from the
  // sky rather than a level lance.
  sky_bolt: {
    ...beamBody("wind"),
    muzzle: {
      puffs: 7,
      size: 1.2,
      life: 380,
      gravity: 2,
      sway: 1.6,
      flashGrow: 2.8,
    },
    pose: {
      windup: { pitch: -0.26, hold: true, roll: 0.14, rise: 0.2, coilX: 0.24 },
      recoil: { pitchOut: 0.18, sweepX: [0.24, -0.55], riseOut: -0.05 },
    },
    arrival: {
      burst: {
        puffs: 10,
        ring: true,
        size: 1.6,
        life: 500,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 2.8,
      },
      shove: -0.55,
    },
  },
  // Talon Slash (P7): three simultaneous rake streaks on one shared beat —
  // wind's lash verb. Simultaneous, never staggered: staggered beats read
  // as a volley, not a slash.
  talon_slash: {
    wind: 0.42,
    shots: [
      { size: 0.85, life: 640, at: 0.42, spread: -0.5 },
      { size: 0.85, life: 640, at: 0.42, spread: 0 },
      { size: 0.85, life: 640, at: 0.42, spread: 0.5 },
    ],
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 260,
      gravity: 2,
      sway: 1.6,
      flashGrow: 2.4,
    },
    kick: -0.5,
    pose: {
      windup: { pitch: -0.22, hold: true, roll: 0.14, rise: 0.1, coilX: 0.2 },
      recoil: { pitchOut: 0.16, sweepX: [0.2, -0.75], riseOut: 0.06 },
    },
    arrival: {
      burst: {
        puffs: 6,
        ring: true,
        size: 0.9,
        life: 400,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 2.0,
      },
      shove: -0.5,
    },
  },
  // Hurricane Spiral (finisher P14): a swirling multi-streak column on one
  // shared beat — the vortex verb. Longest coil plus charge, the widest
  // gust ring, the heaviest shove; the one row allowed the biggest ring.
  hurricane_spiral: {
    wind: 0.64,
    charge: { from: 0.3, to: 1.6 },
    shots: [
      { size: 1.5, life: 800, at: 0.64, spread: -0.3 },
      { size: 1.5, life: 800, at: 0.64, spread: 0 },
      { size: 1.5, life: 800, at: 0.64, spread: 0.3 },
    ],
    muzzle: {
      puffs: 8,
      size: 1.4,
      life: 420,
      gravity: 2,
      sway: 1.6,
      flashGrow: 3.0,
    },
    kick: -0.65,
    pose: {
      windup: { pitch: -0.32, hold: true, roll: 0.16, rise: 0.18, coilX: 0.32 },
      recoil: { pitchOut: 0.2, sweepX: [0.32, -0.68], riseOut: 0.08 },
    },
    arrival: {
      burst: {
        puffs: 18,
        ring: true,
        size: 1.9,
        life: 760,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 3.4,
      },
      shove: -0.65,
    },
  },
  // Cyclone Dive (P12): the dive verb — a rising windup, then one plunging
  // streak swept across three lanes. Stepped down from the spiral on every
  // axis: earlier release, no charge, one streak, a narrower ring, a
  // lighter shove.
  cyclone_dive: {
    wind: 0.58,
    shots: [{ size: 2.0, life: 720, at: 0.58 }],
    muzzle: {
      puffs: 7,
      size: 1.2,
      life: 380,
      gravity: 2,
      sway: 1.6,
      flashGrow: 3.0,
    },
    kick: -0.6,
    pose: {
      windup: { pitch: -0.28, hold: true, roll: 0.14, rise: 0.16, coilX: 0.26 },
      recoil: { pitchOut: 0.18, sweepX: [0.26, -0.6], riseOut: -0.02 },
    },
    arrival: {
      burst: {
        puffs: 14,
        ring: true,
        size: 1.7,
        life: 640,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 3.2,
      },
      lanes: [-0.42, 0, 0.42],
      shove: -0.45,
    },
  },
  // Zephyr Veil (guard P9): the barrier verb — a foe-targeted gust-ring
  // eruption, no projectile, no shove. Same rule as the other five guards.
  zephyr_veil: {
    ...barrierBody("wind"),
    pose: {
      windup: { pitch: -0.22, hold: true, roll: 0.14, rise: 0.14, coilX: 0.2 },
      recoil: { pitchOut: 0.1, sweepX: [0.2, -0.4], riseOut: 0.07 },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.5,
        life: 640,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 3.0,
      },
      shove: 0,
    },
  },
}
