import type { MoveFx } from "../moves"

/**
 * The innate Strike (sim `BASIC_MOVE`, id "basic"): a compact melee jab, the
 * one authored row with no projectile — the fist is the hit. It is
 * element-less by contract, so it gets a one-row table of its own rather than
 * living inside one of the six element tables. Its windup / recoil / contact
 * / arrival beats are authored here instead of borrowing `DEFAULT_FX`'s
 * tier-1 shot body.
 */
export const BASIC_FX: Record<string, MoveFx> = {
  basic: {
    // Commit at the melee windup boundary (PLAYBACK_PHASES.melee ends 0.26),
    // well ahead of the 0.46 shot release — a jab is a snap, not a lob.
    wind: 0.26,
    // No flight: contact happens on the approach line, so no mouth flash and
    // nothing travels downrange.
    shots: [],
    // A light shoulder recoil, deliberately gentler than the default's -0.35
    // shot kick.
    kick: -0.2,
    pose: {
      // Short coil, no held windup: the fist chambers and goes.
      windup: { pitch: -0.12, roll: 0.02, rise: -0.02, coilX: 0.1 },
      // A quick straight snap with a small overshoot back through stance.
      recoil: { pitchOut: 0.06, sweepX: [0.1, -0.24] },
    },
    // Contact: one tight knuckle pop at the struck point plus a light
    // forward shove — the melee read, not the default's empty arrival.
    arrival: {
      burst: { puffs: 4, size: 0.6, life: 220, flashGrow: 1.8 },
      shove: -0.16,
    },
  },
}
