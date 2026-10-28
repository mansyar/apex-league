import type { MoveFx } from "../moves"
import { barrierBody, beamBody, dashBody, volleyFanBody } from "./verbs"

/**
 * Electric's move looks: every row carries the element's identity grammar —
 * jagged arc tendrils with high crackle sway, charge-orb windups, bright
 * yellow-white additive flash, arrivals that spider outward instead of
 * blooming — layered under each move name's verb. Chips snap fast and small,
 * heavies hold their charge long, and the ion_wall guard is a foe-targeted
 * barrier eruption with no projectile and no shove.
 */
export const ELECTRIC_FX: Record<string, MoveFx> = {
  // Static Jolt (tier 1 chip): the quickest crackle — a near-instant uneven
  // windup, one small fast bolt, and a snappy high-sway arrival. No muzzle
  // bloom, to separate it from the ion_dart dart at the travel anchor.
  static_jolt: {
    wind: 0.34,
    shots: [{ size: 0.7, life: 620, at: 0.34 }],
    muzzle: {},
    kick: -0.3,
    pose: {
      windup: { pitch: -0.14, roll: 0.1, rise: 0.03, coilX: 0.12 },
      recoil: { pitchOut: 0.08, sweepX: [0.12, -0.34] },
    },
    arrival: {
      burst: {
        puffs: 6,
        size: 0.9,
        life: 400,
        gravity: 4,
        sway: 2.2,
        flashGrow: 2.6,
      },
      shove: -0.35,
    },
  },
  // Volt Dash (tier 1 dash): the attacker lunges wreathed in arcs — the dash
  // verb carries the damage read, so the shot stays a single fast bolt and
  // the arrival lands as one forward-driving spider burst.
  volt_dash: {
    ...dashBody("electric"),
    shots: [{ size: 1.6, life: 620, at: 0.38 }],
    arrival: {
      burst: {
        puffs: 12,
        size: 1.5,
        life: 520,
        gravity: 4,
        sway: 2.2,
        flashGrow: 3,
      },
      shove: -0.6,
    },
  },
  // Arc Shot (tier 2 workhorse): the steady bolt — an uneven coil releasing
  // one midweight tendril on a fast flat line into a crackling arrival.
  arc_shot: {
    wind: 0.55,
    shots: [{ size: 1.7, life: 720, at: 0.55 }],
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 320,
      gravity: 4,
      sway: 2.2,
      flashGrow: 2.6,
    },
    kick: -0.55,
    pose: {
      windup: { pitch: -0.22, hold: true, roll: 0.1, rise: 0.04, coilX: 0.2 },
      recoil: { pitchOut: 0.14, sweepX: [0.2, -0.5] },
    },
    arrival: {
      burst: {
        puffs: 9,
        size: 1.5,
        life: 480,
        gravity: 4,
        sway: 2.2,
        flashGrow: 2.8,
      },
      shove: -0.5,
    },
  },
  // Storm Bolt (tier 2 charged bolt): the coil swells as a gathering charge
  // orb — held jitter plus a tendril draw-in at the mouth — then releases
  // one heavy bright bolt into a snapping arrival.
  storm_bolt: {
    wind: 0.6,
    shots: [{ size: 1.2, life: 640, at: 0.6 }],
    muzzle: {
      puffs: 7,
      size: 1.2,
      life: 380,
      gravity: 4,
      sway: 2.2,
      flashGrow: 2.6,
    },
    kick: -0.6,
    charge: { from: 0.25, to: 1.3 },
    pose: {
      windup: { pitch: -0.24, hold: true, roll: 0.11, rise: 0.04, coilX: 0.24 },
      recoil: { pitchOut: 0.16, sweepX: [0.24, -0.55] },
    },
    arrival: {
      burst: {
        puffs: 10,
        size: 1.6,
        life: 500,
        gravity: 4,
        sway: 2.2,
        flashGrow: 2.8,
      },
      shove: -0.55,
    },
  },
  // Ion Dart (tier 1 fast bolt): small, quick, flat-trajectory tendril — a
  // touch longer in flight than static_jolt with a brighter head at release,
  // and no charge phase to separate it from storm_bolt.
  ion_dart: {
    wind: 0.42,
    shots: [{ size: 0.9, life: 640, at: 0.42 }],
    muzzle: {
      puffs: 4,
      size: 0.8,
      life: 280,
      gravity: 4,
      sway: 2.2,
      flashGrow: 2.6,
    },
    kick: -0.36,
    pose: {
      windup: { pitch: -0.16, hold: true, roll: 0.1, rise: 0.04, coilX: 0.14 },
      recoil: { pitchOut: 0.1, sweepX: [0.14, -0.38] },
    },
    arrival: {
      burst: {
        puffs: 7,
        size: 1,
        life: 420,
        gravity: 4,
        sway: 2.2,
        flashGrow: 2.6,
      },
      shove: -0.4,
    },
  },
  // Gigavolt (tier 3 beam): the finisher — a long jittering charge swelling
  // into one heavy fast bolt that detonates as a wide spidering flash.
  gigavolt: {
    ...beamBody("electric"),
    muzzle: {
      puffs: 7,
      size: 1.1,
      life: 360,
      gravity: 4,
      sway: 2.2,
      flashGrow: 2.8,
    },
    pose: {
      windup: { pitch: -0.3, hold: true, roll: 0.12, rise: 0.05, coilX: 0.28 },
      recoil: { pitchOut: 0.18, sweepX: [0.28, -0.62] },
    },
    arrival: {
      burst: {
        puffs: 14,
        size: 1.8,
        life: 560,
        gravity: 4,
        sway: 2.2,
        flashGrow: 3.4,
      },
      shove: -0.6,
    },
  },
  // Storm Surge (tier 2 volley): three crackling bolts fanned across the
  // lane on ascending beats (vs the chips' single snap), each landing as a
  // light spider burst.
  storm_surge: {
    ...volleyFanBody("electric"),
    muzzle: {
      puffs: 4,
      size: 0.8,
      life: 300,
      gravity: 4,
      sway: 2.2,
      flashGrow: 2.4,
    },
    pose: {
      windup: { pitch: -0.16, hold: true, roll: 0.1, rise: 0.04, coilX: 0.14 },
      recoil: { pitchOut: 0.1, sweepX: [0.14, -0.38] },
    },
    arrival: {
      burst: {
        puffs: 8,
        size: 1.1,
        life: 460,
        gravity: 4,
        sway: 2.2,
        flashGrow: 2.6,
      },
      shove: -0.4,
    },
  },
  // Ion Wall (guard): a foe-targeted barrier eruption — no projectile, no
  // shove. A long raise swells a charge and lands as an arc-tendril ring at
  // the foe with the normal contact read, exactly like pyre_wall,
  // tide_aegis, and bramble_guard.
  ion_wall: {
    ...barrierBody("electric"),
    pose: {
      windup: { pitch: -0.22, hold: true, roll: 0.1, rise: 0.08, coilX: 0.2 },
      recoil: { pitchOut: 0.1, sweepX: [0.2, -0.4] },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.5,
        life: 600,
        gravity: 4,
        sway: 2.2,
        flashGrow: 3,
      },
      shove: 0,
    },
  },
}
