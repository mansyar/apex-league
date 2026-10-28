import type { MoveFx } from "../moves"
import {
  barrierBody,
  coneBody,
  dashBody,
  eruptionBody,
  volleyFanBody,
} from "./verbs"

/**
 * Plant's move looks: every row carries the element's identity grammar —
 * seed clusters with sideways drift (low gravity plus high sway), arrivals
 * that coil outward as bramble rings, held coils with a slight dip —
 * layered under each move name's verb. Chips are quick and small, heavies
 * are charged and big, and the bramble_guard guard is a foe-targeted
 * barrier eruption with no shove.
 */
export const PLANT_FX: Record<string, MoveFx> = {
  // Seed Shot (tier 1 chip): the quick seed flick — a light held coil
  // loosing one small fast seed into a modest drifting ring.
  seed_shot: {
    wind: 0.36,
    shots: [{ size: 0.8, life: 640, at: 0.36 }],
    muzzle: {
      puffs: 4,
      size: 0.8,
      life: 300,
      gravity: 1.8,
      sway: 1,
      flashGrow: 2.4,
    },
    kick: -0.3,
    pose: {
      windup: { pitch: -0.14, hold: true, rise: -0.05, coilX: 0.12 },
      recoil: { pitchOut: 0.08, sweepX: [0.12, -0.34] },
    },
    arrival: {
      burst: {
        puffs: 6,
        ring: true,
        size: 1,
        life: 560,
        gravity: 1.8,
        sway: 1,
        flashGrow: 2.6,
      },
      shove: -0.35,
    },
  },
  // Thorn Volley (tier 1-2 volley): three barbed seeds fanned across the
  // lane on ascending beats, each landing as a light bramble ring.
  thorn_volley: {
    ...volleyFanBody("plant"),
    muzzle: {
      puffs: 4,
      size: 0.8,
      life: 300,
      gravity: 1.8,
      sway: 1,
      flashGrow: 2.4,
    },
    pose: {
      windup: { pitch: -0.16, hold: true, rise: -0.05, coilX: 0.14 },
      recoil: { pitchOut: 0.1, sweepX: [0.14, -0.38] },
    },
    arrival: {
      burst: {
        puffs: 8,
        ring: true,
        size: 1,
        life: 560,
        gravity: 1.8,
        sway: 1,
        flashGrow: 2.6,
      },
      shove: -0.4,
    },
  },
  // Spore Burst (tier 2 cone): one wide spore fan at release that lands
  // across three lanes as drifting spores over a bramble ring.
  spore_burst: {
    ...coneBody("plant"),
    muzzle: {
      puffs: 6,
      size: 1.2,
      life: 380,
      gravity: 1.8,
      sway: 1,
      flashGrow: 2.6,
    },
    pose: {
      windup: { pitch: -0.2, hold: true, rise: -0.06, coilX: 0.2 },
      recoil: { pitchOut: 0.12, sweepX: [0.2, -0.46] },
    },
    arrival: {
      burst: {
        puffs: 10,
        ring: true,
        size: 1.2,
        life: 600,
        gravity: 1.8,
        sway: 1,
        flashGrow: 2.8,
      },
      lanes: [-0.4, 0, 0.4],
      shove: -0.4,
    },
  },
  // Bramble Dart (tier 2 workhorse): the steady thorn shot — a held coil
  // with a slight dip releasing one midweight barb into a coiling ring.
  bramble_dart: {
    wind: 0.55,
    shots: [{ size: 1.7, life: 780, at: 0.55 }],
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 320,
      gravity: 1.8,
      sway: 1,
      flashGrow: 2.6,
    },
    kick: -0.55,
    pose: {
      windup: { pitch: -0.22, hold: true, rise: -0.06, coilX: 0.2 },
      recoil: { pitchOut: 0.14, sweepX: [0.2, -0.5] },
    },
    arrival: {
      burst: {
        puffs: 9,
        ring: true,
        size: 1.5,
        life: 600,
        gravity: 1.8,
        sway: 1,
        flashGrow: 2.8,
      },
      shove: -0.5,
    },
  },
  // Vine Lash (tier 1 lash): the quick snap — a short coil whipping one
  // fast vine tip that clings on landing rather than bursting outward.
  vine_lash: {
    wind: 0.44,
    shots: [{ size: 1, life: 560, at: 0.44 }],
    muzzle: {
      puffs: 4,
      size: 0.8,
      life: 280,
      gravity: 1.8,
      sway: 1,
      flashGrow: 2.6,
    },
    kick: -0.4,
    pose: {
      windup: { pitch: -0.18, hold: true, rise: -0.06, coilX: 0.16 },
      recoil: { pitchOut: 0.12, sweepX: [0.16, -0.42] },
    },
    arrival: {
      burst: {
        puffs: 8,
        ring: true,
        size: 1.1,
        life: 560,
        gravity: 1.8,
        sway: 1,
        flashGrow: 2.8,
      },
      shove: -0.45,
    },
  },
  // Root Quake (tier 3 eruption): the ground-splitter — a long deep coil
  // swelling a charge, then one heavy root mass detonating as a wide
  // bramble ring with a heavy shove.
  root_quake: {
    ...eruptionBody("plant"),
    wind: 0.62,
    shots: [{ size: 1.6, life: 760, at: 0.62 }],
    muzzle: {
      puffs: 7,
      size: 1.1,
      life: 360,
      gravity: 1.8,
      sway: 1,
      flashGrow: 2.8,
    },
    kick: -0.62,
    charge: { from: 0.3, to: 1.6 },
    pose: {
      windup: { pitch: -0.3, hold: true, rise: -0.08, coilX: 0.3 },
      recoil: { pitchOut: 0.18, sweepX: [0.3, -0.62] },
    },
    arrival: {
      burst: {
        puffs: 16,
        ring: true,
        size: 1.7,
        life: 640,
        gravity: 1.8,
        sway: 1,
        flashGrow: 3.2,
      },
      shove: -0.6,
    },
  },
  // Thorn Charge (fernstag's attack form): the antlered run — a held coil
  // launching the body itself, so the dash carries the damage read and the
  // arrival lands as one driving bramble burst.
  thorn_charge: {
    ...dashBody("plant"),
    wind: 0.56,
    shots: [{ size: 2, life: 620, at: 0.56 }],
    pose: {
      windup: { pitch: -0.3, hold: true, rise: -0.08, coilX: 0.28 },
      recoil: { pitchOut: 0.17, sweepX: [0.28, -0.6], riseOut: 0.03 },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.6,
        life: 600,
        gravity: 1.8,
        sway: 1,
        flashGrow: 3.2,
      },
      shove: -0.6,
    },
  },
  // Bramble Guard (guard): a foe-targeted barrier eruption — no
  // projectile, no shove. A long raise swells a charge and lands as a
  // bramble ring at the foe with the normal contact read, exactly like
  // pyre_wall and tide_aegis.
  bramble_guard: {
    ...barrierBody("plant"),
    pose: {
      windup: { pitch: -0.22, hold: true, rise: 0.08, coilX: 0.2 },
      recoil: { pitchOut: 0.1, sweepX: [0.2, -0.4] },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.5,
        life: 640,
        gravity: 1.8,
        sway: 1,
        flashGrow: 3,
      },
      shove: 0,
    },
  },
}
