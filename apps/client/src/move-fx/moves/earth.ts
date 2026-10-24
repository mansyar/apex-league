import type { MoveFx } from "../moves"

/**
 * Earth's move looks. `quake_stomp` is the heavy finisher: a long ground coil
 * that detonates a high-gravity dust ring. Its steady sibling `basalt_guard`
 * stays on the default body on purpose.
 */
export const EARTH_FX: Record<string, MoveFx> = {
  quake_stomp: {
    wind: 0.58,
    shots: [{ size: 2.2, life: 820, at: 0.58 }],
    kick: -0.62,
    pose: {
      windup: {
        pitch: -0.36,
        hold: true,
        roll: 0.12,
        rise: -0.12,
        coilX: 0.32,
      },
      recoil: { pitchOut: 0.22, sweepX: [0.32, -0.68], riseOut: 0.03 },
    },
    arrival: {
      burst: {
        puffs: 18,
        ring: true,
        size: 1.9,
        life: 780,
        gravity: 12,
        flashGrow: 3.6,
        flash: false,
        tint: "#9c8f7d",
      },
      shove: -0.62,
    },
  },
}
