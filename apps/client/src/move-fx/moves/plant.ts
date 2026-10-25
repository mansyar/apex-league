import type { MoveFx } from "../moves"

/**
 * Plant's move looks: the tier 1-2 dart, the three-shot spore fan, and the
 * ground-shaking root finisher.
 */
export const PLANT_FX: Record<string, MoveFx> = {
  bramble_dart: {
    wind: 0.5,
    shots: [{ size: 2.2, life: 1000, at: 0.5 }],
    kick: -0.5,
    pose: {
      windup: { pitch: -0.3, hold: true, rise: -0.04, coilX: 0.26 },
      recoil: { pitchOut: 0.2, sweepX: [0.26, -0.6] },
    },
    arrival: {
      burst: { puffs: 10, size: 1.3, life: 700, gravity: 6, flashGrow: 3 },
      shove: -0.45,
    },
  },
  spore_burst: {
    wind: 0.26,
    shots: [
      { size: 1, life: 700, spread: -0.5, at: 0.36 },
      { size: 1, life: 700, spread: 0, at: 0.48 },
      { size: 1, life: 700, spread: 0.5, at: 0.6 },
    ],
    kick: -0.18,
    pose: {
      windup: { pitch: -0.1, rise: -0.05, coilX: 0.1 },
      recoil: { pitchOut: 0.06, sweepX: [0.1, -0.3] },
    },
    arrival: {
      burst: {
        puffs: 10,
        ring: true,
        gravity: 1.2,
        life: 900,
        flashGrow: 3.4,
        size: 1.4,
      },
      shove: 0,
    },
    compressed: { wind: 0.3, flight: 220, beats: [0.38, 0.44, 0.5] },
  },
  root_quake: {
    wind: 0.58,
    shots: [{ size: 2.3, life: 1000, at: 0.58 }],
    kick: -0.58,
    pose: {
      windup: { pitch: -0.34, hold: true, rise: -0.1, coilX: 0.3 },
      recoil: { pitchOut: 0.2, sweepX: [0.3, -0.62], riseOut: 0.04 },
    },
    arrival: {
      burst: {
        puffs: 14,
        ring: true,
        size: 1.5,
        life: 700,
        gravity: 4,
        flashGrow: 3.4,
      },
      shove: -0.5,
    },
  },
  // Thorn Charge (fernstag's attack form): the antlered run — a held coil,
  // one heavy seed-cluster at contact, and a shove that reads as a body
  // check rather than a blast.
  thorn_charge: {
    wind: 0.54,
    shots: [{ size: 2, life: 900, at: 0.54 }],
    kick: -0.54,
    pose: {
      windup: { pitch: -0.32, hold: true, rise: -0.06, coilX: 0.28 },
      recoil: { pitchOut: 0.18, sweepX: [0.28, -0.58] },
    },
    arrival: {
      burst: { puffs: 11, size: 1.4, life: 700, gravity: 6, flashGrow: 3.2 },
      shove: -0.5,
    },
  },
}
