import type { MoveFx } from "../moves"
import { barrierBody, beamBody, dashBody } from "./verbs"

/**
 * Fire's move looks: every row carries the element's identity grammar —
 * rising flicker flight (buoyant gravity plus upward drift), arrivals that
 * bloom upward, scorch-disc floor marks — layered under each move name's
 * verb. Chips are fast and small, heavies are charged and big, and the
 * pyre_wall guard is a self-targeted barrier with no projectile.
 */
export const FIRE_FX: Record<string, MoveFx> = {
  // Spark (tier 1 chip): the fastest, smallest fire row — a near-instant
  // windup, one small fast ember, and a snappy buoyant arrival.
  spark: {
    wind: 0.34,
    shots: [{ size: 0.7, life: 420, at: 0.34 }],
    muzzle: {},
    kick: -0.3,
    pose: {
      windup: { pitch: -0.14, hold: true, roll: 0.05, rise: 0.04, coilX: 0.12 },
      recoil: { pitchOut: 0.08, sweepX: [0.12, -0.34] },
    },
    arrival: {
      burst: {
        puffs: 6,
        size: 0.9,
        life: 380,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 2.4,
      },
      shove: -0.35,
    },
  },
  // Flame Charge (tier 1 dash): the attacker dashes wreathed in flame —
  // the dash verb carries the damage read, so the shot stays a single fast
  // ember and the arrival lands as one forward-driving bloom.
  flame_charge: {
    ...dashBody("fire"),
    arrival: {
      burst: {
        puffs: 11,
        size: 1.5,
        life: 500,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 3,
      },
      shove: -0.6,
    },
  },
  // Cinder Shot (tier 1-2 workhorse): the steady ember shot — a held coil
  // with an upward rise, one midweight ember, and a buoyant arrival.
  cinder_shot: {
    wind: 0.55,
    shots: [{ size: 1.8, life: 850, at: 0.55 }],
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 320,
      gravity: -2.2,
      sway: 0.5,
      flashGrow: 2.4,
    },
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
      burst: {
        puffs: 9,
        size: 1.6,
        life: 460,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 2.8,
      },
      shove: -0.5,
    },
  },
  // Blaze Bolt (tier 2 charged bolt): the charge swells as gathering flame
  // — held coil plus an ember draw-in at the mouth — then releases one
  // bright bolt into a rising bloom.
  blaze_bolt: {
    wind: 0.6,
    shots: [{ size: 1.05, life: 300, at: 0.6 }],
    muzzle: {
      puffs: 7,
      size: 1.2,
      life: 380,
      gravity: -2.2,
      sway: 0.5,
      flashGrow: 2.6,
    },
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
      burst: {
        puffs: 9,
        size: 1.5,
        life: 460,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 2.8,
      },
      shove: -0.55,
    },
  },
  // Flare Dart (tier 1 fast bolt): small, quick, flat-trajectory ember —
  // a touch longer in flight than spark with a brighter head at release,
  // and no charge phase to separate it from blaze_bolt.
  flare_dart: {
    wind: 0.42,
    shots: [{ size: 0.9, life: 560, at: 0.42 }],
    muzzle: {
      puffs: 4,
      size: 0.8,
      life: 280,
      gravity: -2.2,
      sway: 0.5,
      flashGrow: 2.6,
    },
    kick: -0.36,
    pose: {
      windup: {
        pitch: -0.16,
        hold: true,
        roll: 0.06,
        rise: 0.05,
        coilX: 0.14,
      },
      recoil: { pitchOut: 0.1, sweepX: [0.14, -0.38] },
    },
    arrival: {
      burst: {
        puffs: 7,
        size: 1,
        life: 400,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 2.6,
      },
      shove: -0.4,
    },
  },
  // Pyre Lance (tier 3 beam): the heavy piercing read — a long charge
  // swelling into one heavy fast shot that lands as a deep upward bloom.
  pyre_lance: {
    ...beamBody("fire"),
    muzzle: {
      puffs: 7,
      size: 1.1,
      life: 360,
      gravity: -2.2,
      sway: 0.5,
      flashGrow: 2.8,
    },
    pose: {
      windup: { pitch: -0.3, hold: true, roll: 0.1, rise: 0.07, coilX: 0.28 },
      recoil: { pitchOut: 0.18, sweepX: [0.28, -0.62] },
    },
    arrival: {
      burst: {
        puffs: 12,
        size: 1.7,
        life: 540,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 3.2,
      },
      shove: -0.6,
    },
  },
  // Cinder Dive (cindermoor's attack form): the ram's head-down plunge —
  // a deep held coil launching the body itself, so the dive carries the
  // damage read and the arrival is one heavy ember burst at contact.
  cinder_dive: {
    ...dashBody("fire"),
    wind: 0.58,
    shots: [{ size: 2.1, life: 600, at: 0.58 }],
    pose: {
      windup: { pitch: -0.32, hold: true, roll: 0.09, rise: 0.02, coilX: 0.3 },
      recoil: { pitchOut: 0.17, sweepX: [0.3, -0.62], riseOut: 0.03 },
    },
    arrival: {
      burst: {
        puffs: 12,
        size: 1.7,
        life: 520,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 3.2,
      },
      shove: -0.6,
    },
  },
  // Pyre Wall (guard): a self-targeted barrier — no projectile, no enemy
  // contact frame. A long raise swells a charge at the caster and lands
  // as a flame ring with a scorch disc, with no shove.
  pyre_wall: {
    ...barrierBody("fire"),
    pose: {
      windup: { pitch: -0.22, hold: true, roll: 0.08, rise: 0.12, coilX: 0.2 },
      recoil: { pitchOut: 0.1, sweepX: [0.2, -0.4] },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.5,
        life: 560,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 3,
      },
      shove: 0,
    },
  },
}
