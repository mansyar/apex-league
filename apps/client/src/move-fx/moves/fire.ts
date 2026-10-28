import type { MoveFx } from "../moves"
import { barrierBody, beamBody, dashBody } from "./verbs"

/**
 * Fire's move looks: every row carries the element's identity grammar —
 * rising flicker flight (buoyant gravity plus upward drift), arrivals that
 * bloom upward, scorch-disc floor marks — layered under each move name's
 * verb. Chips are fast and small, heavies are charged and big, and the
 * pyre_wall guard is a foe-targeted barrier eruption — no projectile,
 * no shove.
 */
export const FIRE_FX: Record<string, MoveFx> = {
  // Spark (tier 1 chip, Phase 2 FR-2): a near-instant zigzag snap — no
  // windup to speak of, one small fast fork (MOVE_SHOT_LOOK geometry) that
  // crackles downrange in ~200ms, no mouth bloom, and a white-hot snap
  // flash on arrival: tiny core, tall swell, erratic scatter. The bright
  // fork plus the erratic flight carry visibility at the small size.
  spark: {
    wind: 0.12,
    shots: [{ size: 0.7, life: 200, at: 0.12 }],
    kick: -0.3,
    pose: {
      windup: { pitch: -0.14, hold: true, roll: 0.05, rise: 0.04, coilX: 0.12 },
      recoil: { pitchOut: 0.08, sweepX: [0.12, -0.34] },
    },
    arrival: {
      burst: {
        puffs: 4,
        size: 0.6,
        life: 260,
        gravity: -2.2,
        sway: 1.6,
        flashGrow: 4,
      },
      shove: -0.35,
    },
  },
  // Flame Charge (tier 1 dash): the attacker crosses wreathed in flame —
  // the crossing body is the hit, so the row flies zero shots. A charge
  // wreath swells around the body through the crossing and clears at
  // release, a nose-gap flare pops at launch, and the arrival lands as
  // one forward-driving bloom.
  flame_charge: {
    ...dashBody("fire"),
    wind: 0.34,
    shots: [],
    charge: { from: 0.3, to: 1.1 },
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 300,
      gravity: -2.2,
      sway: 0.4,
      flashGrow: 2.6,
    },
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
  // Cinder Shot (tier 1-2 workhorse, Phase 3 FR-3): a slow tumbling ember
  // chunk — a held coil with an upward rise, one heavy chunk
  // (MOVE_SHOT_LOOK geometry) rolling downrange on a 0.35 wobble, no mouth
  // bloom, and a slow heavy arrival that thuds down instead of rising.
  cinder_shot: {
    wind: 0.55,
    shots: [{ size: 1.8, life: 850, at: 0.55 }],
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
        puffs: 10,
        size: 1.6,
        life: 600,
        gravity: 6,
        sway: 0.3,
        flashGrow: 2.8,
      },
      shove: -0.5,
    },
  },
  // Blaze Bolt (tier 2 charged comet, Phase 3 FR-5): the charge swells as
  // gathering flame — held coil plus an ember draw-in at the mouth — then
  // releases one fast tapered jet (MOVE_SHOT_LOOK geometry) head-first
  // into the biggest lingering bloom.
  blaze_bolt: {
    wind: 0.6,
    shots: [{ size: 1.05, life: 300, at: 0.6 }],
    muzzle: {
      puffs: 7,
      size: 1.2,
      life: 260,
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
        puffs: 12,
        size: 1.9,
        life: 620,
        gravity: -2.2,
        sway: 0.4,
        flashGrow: 3.6,
      },
      shove: -0.55,
    },
  },
  // Flare Dart (tier 1 fast bolt, Phase 2 FR-4): a flat molten needle —
  // laser-straight flight (MOVE_SHOT_LOOK geometry, zeroed arc/ripple/
  // tumble/throb) with a minimal ember trail, landing as a small tight
  // pierce flash with a fast fade: no rise, no drift, no explosion bloom.
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
        puffs: 4,
        size: 0.7,
        life: 260,
        gravity: 0,
        sway: 0,
        flashGrow: 1.2,
      },
      shove: -0.4,
    },
  },
  // Pyre Lance (tier 3 beam): the heavy piercing read — the streak passes
  // clean through, so the row flies zero shots. The beam charge still
  // swells before release, a tight driftless flash pops on the pass line,
  // and the arrival lands as a beam-line triplet with a tall fast glow.
  pyre_lance: {
    ...beamBody("fire"),
    shots: [],
    muzzle: {
      puffs: 5,
      size: 0.7,
      life: 280,
      gravity: 0,
      sway: 0,
      flashGrow: 3.4,
    },
    pose: {
      windup: { pitch: -0.3, hold: true, roll: 0.1, rise: 0.07, coilX: 0.28 },
      recoil: { pitchOut: 0.18, sweepX: [0.28, -0.62] },
    },
    arrival: {
      burst: {
        puffs: 9,
        size: 1.1,
        life: 380,
        gravity: 0,
        sway: 0,
        flashGrow: 3.6,
      },
      lanes: [-0.18, 0, 0.18],
      shove: -0.6,
    },
  },
  // Cinder Dive (cindermoor's attack form): the ram's head-down plunge —
  // the diving body is the hit, so the row flies zero shots and carries
  // no muzzle or pilot light. A deep held coil launches the vertical
  // leap and the arrival lands as one down-slamming crater ring.
  cinder_dive: {
    ...dashBody("fire"),
    wind: 0.58,
    shots: [],
    muzzle: undefined,
    pose: {
      windup: { pitch: -0.32, hold: true, roll: 0.09, rise: 0.02, coilX: 0.3 },
      recoil: { pitchOut: 0.17, sweepX: [0.3, -0.62], riseOut: 0.03 },
    },
    arrival: {
      burst: {
        puffs: 14,
        ring: true,
        size: 2.0,
        life: 560,
        gravity: 6,
        sway: 0.2,
        flashGrow: 3.2,
      },
      shove: -0.6,
    },
  },
  // Pyre Wall (guard, Phase 4 FR-6): a foe-targeted barrier eruption — no
  // projectile, no shove. A long raise swells a charge and lands a ~2.5x
  // encirclement ring at the foe — denser rising jets plus the normal fire
  // contact read (scorch disc) — with the barrier timing held, exactly
  // like tide_aegis.
  pyre_wall: {
    ...barrierBody("fire"),
    pose: {
      windup: { pitch: -0.22, hold: true, roll: 0.08, rise: 0.12, coilX: 0.2 },
      recoil: { pitchOut: 0.1, sweepX: [0.2, -0.4] },
    },
    arrival: {
      burst: {
        puffs: 20,
        ring: true,
        size: 3.75,
        life: 560,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 3,
      },
      shove: 0,
    },
  },
}
