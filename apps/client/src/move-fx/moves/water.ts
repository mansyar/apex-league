import type { MoveFx } from "../moves"
import { barrierBody, coneBody, dashBody, volleyFanBody } from "./verbs"

/**
 * Water's move looks: every row carries the element's identity grammar —
 * heavy droplets with high gravity, foam-ring arrivals that burst
 * downward/outward, low crouch windups — layered under each move name's
 * verb. Chips are small and quick, heavies are charged and big, and the
 * tide_aegis guard is a foe-targeted barrier eruption with no shove.
 */
export const WATER_FX: Record<string, MoveFx> = {
  // Bubble (tier 1 chip): the floaty slow orb — a quick low crouch loosing
  // one small slow droplet into a modest foam-ring splash.
  bubble: {
    wind: 0.36,
    shots: [{ size: 0.8, life: 720, at: 0.36 }],
    muzzle: { puffs: 4, size: 0.8, life: 300, gravity: 10, flashGrow: 2.4 },
    kick: -0.3,
    pose: {
      windup: { pitch: -0.14, hold: true, rise: -0.06, coilX: 0.12 },
      recoil: { pitchOut: 0.08, sweepX: [0.12, -0.34] },
    },
    arrival: {
      burst: {
        puffs: 6,
        ring: true,
        size: 1,
        life: 420,
        gravity: 10,
        flashGrow: 2.6,
      },
      shove: -0.35,
    },
  },
  // Tide Shot (tier 1-2 workhorse): the mid arcing shot — a held crouch
  // releasing one midweight droplet on a heavy arc into a foam burst.
  tide_shot: {
    wind: 0.55,
    shots: [{ size: 1.7, life: 780, at: 0.55 }],
    muzzle: { puffs: 5, size: 0.9, life: 320, gravity: 10, flashGrow: 2.6 },
    kick: -0.55,
    pose: {
      windup: { pitch: -0.22, hold: true, rise: -0.07, coilX: 0.2 },
      recoil: { pitchOut: 0.14, sweepX: [0.2, -0.5] },
    },
    arrival: {
      burst: {
        puffs: 9,
        ring: true,
        size: 1.5,
        life: 480,
        gravity: 10,
        flashGrow: 2.8,
      },
      shove: -0.5,
    },
  },
  // Foam Volley (tier 2 volley): three small droplets fanned across the lane
  // on ascending beats, each landing as a light foam splash.
  foam_volley: {
    ...volleyFanBody("water"),
    muzzle: { puffs: 4, size: 0.8, life: 300, gravity: 10, flashGrow: 2.4 },
    pose: {
      windup: { pitch: -0.16, hold: true, rise: -0.06, coilX: 0.14 },
      recoil: { pitchOut: 0.1, sweepX: [0.14, -0.38] },
    },
    arrival: {
      burst: {
        puffs: 8,
        ring: true,
        size: 1,
        life: 420,
        gravity: 10,
        flashGrow: 2.6,
      },
      shove: -0.4,
    },
  },
  // Splash Bolt (tier 2 charged bolt): the crouch swells as gathering water
  // — held coil plus a foam draw-in at the mouth — then releases one heavy
  // bolt into a downward-bursting splash.
  splash_bolt: {
    wind: 0.6,
    shots: [{ size: 1.2, life: 420, at: 0.6 }],
    muzzle: { puffs: 7, size: 1.2, life: 380, gravity: 10, flashGrow: 2.6 },
    kick: -0.6,
    charge: { from: 0.25, to: 1.3 },
    pose: {
      windup: { pitch: -0.24, hold: true, rise: -0.07, coilX: 0.24 },
      recoil: { pitchOut: 0.16, sweepX: [0.24, -0.55] },
    },
    arrival: {
      burst: {
        puffs: 9,
        ring: true,
        size: 1.5,
        life: 460,
        gravity: 10,
        flashGrow: 2.8,
      },
      shove: -0.55,
    },
  },
  // Mist Spray (tier 1 cone): one wide fan at release that lands across
  // three lanes as drifting mist over a foam ring.
  mist_spray: {
    ...coneBody("water"),
    muzzle: { puffs: 6, size: 1.2, life: 380, gravity: 10, flashGrow: 2.6 },
    pose: {
      windup: { pitch: -0.2, hold: true, rise: -0.06, coilX: 0.2 },
      recoil: { pitchOut: 0.12, sweepX: [0.2, -0.46] },
    },
    arrival: {
      burst: {
        puffs: 10,
        ring: true,
        size: 1.2,
        life: 520,
        gravity: 10,
        flashGrow: 2.8,
      },
      lanes: [-0.4, 0, 0.4],
      shove: -0.4,
    },
  },
  // Maelstrom (tier 3 heavy): the whirlpool — a long charged coil releasing
  // twin heavy streams that detonate as one wide foam ring.
  maelstrom: {
    wind: 0.62,
    shots: [
      { size: 1.6, life: 760, spread: -0.25, at: 0.56 },
      { size: 1.6, life: 760, spread: 0.25, at: 0.62 },
    ],
    muzzle: { puffs: 7, size: 1.1, life: 360, gravity: 10, flashGrow: 2.8 },
    kick: -0.62,
    charge: { from: 0.3, to: 1.6 },
    pose: {
      windup: { pitch: -0.3, hold: true, rise: -0.08, coilX: 0.28 },
      recoil: { pitchOut: 0.18, sweepX: [0.28, -0.62] },
    },
    arrival: {
      burst: {
        puffs: 16,
        ring: true,
        size: 1.7,
        life: 560,
        gravity: 10,
        flashGrow: 3.2,
      },
      shove: -0.6,
    },
  },
  // Riptide Rush (reefclaw's attack form): the pincer's forward surge — a
  // low, held coil launching the body itself, so the dash carries the damage
  // read and the arrival lands as one driving wash.
  riptide_rush: {
    ...dashBody("water"),
    wind: 0.56,
    shots: [{ size: 2, life: 620, at: 0.56 }],
    pose: {
      windup: { pitch: -0.3, hold: true, rise: -0.1, coilX: 0.28 },
      recoil: { pitchOut: 0.17, sweepX: [0.28, -0.6], riseOut: 0.03 },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.6,
        life: 520,
        gravity: 10,
        flashGrow: 3.2,
      },
      shove: -0.6,
    },
  },
  // Tide Aegis (guard): a foe-targeted barrier eruption — no projectile, no
  // shove. A long raise swells a charge and lands as a foam ring at the foe
  // with the normal contact read, exactly like pyre_wall.
  tide_aegis: {
    ...barrierBody("water"),
    pose: {
      windup: { pitch: -0.22, hold: true, rise: 0.08, coilX: 0.2 },
      recoil: { pitchOut: 0.1, sweepX: [0.2, -0.4] },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.5,
        life: 560,
        gravity: 10,
        flashGrow: 3,
      },
      shove: 0,
    },
  },
}
