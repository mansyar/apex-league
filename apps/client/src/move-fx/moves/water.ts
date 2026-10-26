import type { MoveFx } from "../moves"

/**
 * Water's move looks: the tier 1-2 bolt, the two-stream maelstrom, and the
 * three-lane foam volley.
 */
export const WATER_FX: Record<string, MoveFx> = {
  splash_bolt: {
    wind: 0.52,
    shots: [{ size: 1.6, life: 620, at: 0.52 }],
    kick: -0.45,
    pose: {
      windup: { pitch: -0.18, rise: -0.08, coilX: 0.18 },
      recoil: { pitchOut: 0.13, sweepX: [0.18, -0.45], riseOut: 0.05 },
    },
    arrival: {
      burst: { puffs: 12, size: 1.2, life: 600, gravity: 8, flashGrow: 3 },
      shove: -0.5,
    },
  },
  maelstrom: {
    wind: 0.56,
    shots: [
      { size: 1.5, life: 760, spread: -0.25, at: 0.5 },
      { size: 1.5, life: 760, spread: 0.25, at: 0.56 },
    ],
    kick: -0.5,
    pose: {
      windup: { pitch: -0.22, hold: true, rise: -0.06, coilX: 0.24 },
      recoil: { pitchOut: 0.15, sweepX: [0.24, -0.56] },
    },
    arrival: {
      burst: {
        puffs: 16,
        ring: true,
        size: 1.4,
        life: 700,
        gravity: 6,
        flashGrow: 3.4,
      },
      shove: -0.5,
    },
    compressed: { wind: 0.32, flight: 240, beats: [0.42, 0.5] },
  },
  foam_volley: {
    wind: 0.26,
    shots: [
      { size: 0.75, life: 520, spread: 0, at: 0.28 },
      { size: 0.75, life: 520, spread: 0, at: 0.4 },
      { size: 0.75, life: 520, spread: 0, at: 0.52 },
    ],
    kick: -0.12,
    pose: {
      windup: { pitch: -0.1, rise: -0.05, coilX: 0.1 },
      recoil: { pitchOut: 0.06, sweepX: [0.1, -0.3] },
    },
    arrival: {
      burst: { size: 0.8, life: 380 },
      lanes: [-0.3, 0, 0.3],
      shove: -0.4,
    },
    compressed: { wind: 0.3, flight: 220, beats: [0.38, 0.44, 0.5] },
  },
  // Riptide Rush (reefclaw's attack form): the pincer's forward surge — a
  // low, held coil that releases one wide teardrop and lands as a wash.
  riptide_rush: {
    wind: 0.54,
    shots: [{ size: 1.8, life: 700, at: 0.54 }],
    kick: -0.52,
    pose: {
      windup: { pitch: -0.24, hold: true, rise: -0.1, coilX: 0.22 },
      recoil: { pitchOut: 0.16, sweepX: [0.22, -0.52], riseOut: 0.04 },
    },
    arrival: {
      burst: { puffs: 13, size: 1.3, life: 640, gravity: 7, flashGrow: 3.2 },
      shove: -0.5,
    },
  },
}
