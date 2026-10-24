import type { MoveFx } from "../moves"

/**
 * Wind's move looks. `cyclone_dive` is the heavy finisher: a rising windup
 * that dives into a swept, laned gust. Its steady sibling `zephyr_veil` stays
 * on the default body on purpose.
 */
export const WIND_FX: Record<string, MoveFx> = {
  cyclone_dive: {
    wind: 0.5,
    shots: [{ size: 1.7, life: 640, at: 0.5 }],
    muzzle: {
      puffs: 8,
      size: 1.2,
      life: 380,
      gravity: 2,
      sway: 1.4,
      flashGrow: 2.6,
    },
    kick: -0.48,
    pose: {
      windup: { pitch: -0.24, hold: true, roll: 0.16, rise: 0.18, coilX: 0.2 },
      recoil: { pitchOut: 0.16, sweepX: [0.2, -0.5], riseOut: 0.08 },
    },
    arrival: {
      burst: {
        puffs: 12,
        size: 1.3,
        life: 640,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 3.2,
      },
      lanes: [-0.42, 0, 0.42],
      shove: -0.32,
    },
  },
}
