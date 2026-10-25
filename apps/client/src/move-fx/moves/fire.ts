import type { MoveFx } from "../moves"

/**
 * Fire's move looks: the tier 1-2 shot, the charged bolt, and the heavy
 * lance that carries the element's weight beside them.
 */
export const FIRE_FX: Record<string, MoveFx> = {
  cinder_shot: {
    wind: 0.55,
    shots: [{ size: 1.8, life: 850, at: 0.55 }],
    muzzle: {},
    kick: -0.55,
    pose: {
      windup: {
        pitch: -0.24,
        hold: true,
        roll: 0.08,
        rise: 0.05,
        coilX: 0.2,
      },
      recoil: { pitchOut: 0.14, sweepX: [0.2, -0.5] },
    },
    arrival: {
      burst: { puffs: 9, size: 1.6, life: 460, gravity: 9, flashGrow: 2.8 },
      shove: -0.5,
    },
  },
  blaze_bolt: {
    wind: 0.6,
    shots: [{ size: 1.05, life: 300, at: 0.6 }],
    muzzle: { puffs: 7, size: 1.2, life: 380, gravity: 6, flashGrow: 2.6 },
    kick: -0.6,
    charge: { from: 0.25, to: 1.3 },
    pose: {
      windup: {
        pitch: -0.26,
        hold: true,
        roll: 0.09,
        rise: 0.06,
        coilX: 0.24,
      },
      recoil: { pitchOut: 0.16, sweepX: [0.24, -0.55] },
    },
    arrival: {
      burst: { puffs: 9, size: 1.5, life: 460, gravity: 9, flashGrow: 2.8 },
      shove: -0.55,
    },
  },
  pyre_lance: {
    wind: 0.62,
    shots: [{ size: 2.4, life: 900, at: 0.62 }],
    muzzle: { puffs: 9, size: 1.5, life: 420, gravity: 7, flashGrow: 3 },
    kick: -0.66,
    charge: { from: 0.3, to: 1.6 },
    pose: {
      windup: { pitch: -0.3, hold: true, roll: 0.1, rise: 0.07, coilX: 0.28 },
      recoil: { pitchOut: 0.18, sweepX: [0.28, -0.62] },
    },
    arrival: {
      burst: { puffs: 12, size: 1.8, life: 520, gravity: 9, flashGrow: 3.2 },
      shove: -0.6,
    },
  },
  // Cinder Dive (cindermoor's attack form): the ram's head-down plunge —
  // a deep held coil with a forward rise, one heavy ember at contact.
  cinder_dive: {
    wind: 0.58,
    shots: [{ size: 2.1, life: 880, at: 0.58 }],
    muzzle: {},
    kick: -0.6,
    pose: {
      windup: { pitch: -0.28, hold: true, roll: 0.09, rise: 0.02, coilX: 0.26 },
      recoil: { pitchOut: 0.17, sweepX: [0.26, -0.58], riseOut: 0.03 },
    },
    arrival: {
      burst: { puffs: 11, size: 1.7, life: 500, gravity: 9, flashGrow: 3 },
      shove: -0.55,
    },
  },
}
