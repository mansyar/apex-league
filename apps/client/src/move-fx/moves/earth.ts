import type { MoveFx } from "../moves"
import { barrierBody, coneBody, eruptionBody } from "./verbs"

/**
 * Earth's move looks: every row carries the element's identity grammar —
 * tumbling grit with high gravity (rocks fall, they don't float), grey-tan
 * dust motes with a sideways kick-up, wide flat non-luminous dust rings that
 * thud outward, deep ground coils with long holds for the heavies. Dust, not
 * flash: flashGrow stays modest except the finisher, and every burst sets
 * flash false with the dust tint — hue stays single-sourced. The
 * basalt_guard guard is a foe-targeted barrier eruption with no projectile
 * and no shove.
 */
export const EARTH_FX: Record<string, MoveFx> = {
  // Pebble Shot (tier 1 chip): the quick rock-flick — a light coil loosing
  // one small fast pebble into a modest dust ring. No charge phase, to read
  // apart from the dust_devil swirl at the travel anchor.
  pebble_shot: {
    wind: 0.36,
    shots: [{ size: 0.8, life: 640, at: 0.36 }],
    muzzle: {
      puffs: 4,
      size: 0.8,
      life: 300,
      gravity: 12,
      flashGrow: 2.4,
      flash: false,
      tint: "#9c8f7d",
    },
    kick: -0.3,
    pose: {
      windup: {
        pitch: -0.14,
        hold: true,
        roll: 0.1,
        rise: -0.06,
        coilX: 0.12,
      },
      recoil: { pitchOut: 0.08, sweepX: [0.12, -0.34] },
    },
    arrival: {
      burst: {
        puffs: 6,
        ring: true,
        size: 1,
        life: 560,
        gravity: 12,
        flashGrow: 2.6,
        flash: false,
        tint: "#9c8f7d",
      },
      shove: -0.35,
    },
  },
  // Dust Devil (tier 1-2 swirl): the ground swirl — a deeper coil whipping
  // three simultaneous dust streaks across the lane (vs the volley stagger
  // the element never uses and the cone's single fan), landing as one quick
  // kicked-up ring.
  dust_devil: {
    wind: 0.42,
    shots: [
      { size: 0.85, life: 620, spread: -0.5, at: 0.42 },
      { size: 0.85, life: 620, spread: 0, at: 0.42 },
      { size: 0.85, life: 620, spread: 0.5, at: 0.42 },
    ],
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 280,
      gravity: 12,
      flashGrow: 2.4,
      flash: false,
      tint: "#9c8f7d",
    },
    kick: -0.42,
    pose: {
      windup: {
        pitch: -0.2,
        hold: true,
        roll: 0.12,
        rise: -0.08,
        coilX: 0.18,
      },
      recoil: { pitchOut: 0.14, sweepX: [0.18, -0.6] },
    },
    arrival: {
      burst: {
        puffs: 8,
        ring: true,
        size: 1.1,
        life: 480,
        gravity: 12,
        flashGrow: 2.6,
        flash: false,
        tint: "#9c8f7d",
      },
      shove: -0.45,
    },
  },
  // Clay Burst (tier 2 workhorse): the steady midweight toss — a held coil
  // releasing one heavy slab into a wide dust ring, the read the chips and
  // the cone both orbit around.
  clay_burst: {
    wind: 0.55,
    shots: [{ size: 1.7, life: 780, at: 0.55 }],
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 320,
      gravity: 12,
      flashGrow: 2.6,
      flash: false,
      tint: "#9c8f7d",
    },
    kick: -0.55,
    pose: {
      windup: {
        pitch: -0.22,
        hold: true,
        roll: 0.1,
        rise: -0.08,
        coilX: 0.2,
      },
      recoil: { pitchOut: 0.14, sweepX: [0.2, -0.5] },
    },
    arrival: {
      burst: {
        puffs: 9,
        ring: true,
        size: 1.5,
        life: 600,
        gravity: 12,
        flashGrow: 2.8,
        flash: false,
        tint: "#9c8f7d",
      },
      shove: -0.5,
    },
  },
  // Boulder Toss (tier 2 heavy): the high arc — a long held coil swelling a
  // charge, then one massive slow slab lobbed heavy over the lane into a
  // deep thudding ring.
  boulder_toss: {
    wind: 0.6,
    shots: [{ size: 2.2, life: 850, at: 0.6 }],
    muzzle: {
      puffs: 7,
      size: 1.1,
      life: 360,
      gravity: 12,
      flashGrow: 2.8,
      flash: false,
      tint: "#9c8f7d",
    },
    kick: -0.62,
    charge: { from: 0.3, to: 1.6 },
    pose: {
      windup: {
        pitch: -0.3,
        hold: true,
        roll: 0.1,
        rise: -0.1,
        coilX: 0.3,
      },
      recoil: { pitchOut: 0.18, sweepX: [0.3, -0.62] },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.7,
        life: 640,
        gravity: 12,
        flashGrow: 3.2,
        flash: false,
        tint: "#9c8f7d",
      },
      shove: -0.6,
    },
  },
  // Sand Blast (tier 1 cone): one wide fan at release that lands across
  // three lanes as driven grit over a dust ring — the cone verb in earth
  // grammar.
  sand_blast: {
    ...coneBody("earth"),
    muzzle: {
      puffs: 6,
      size: 1.2,
      life: 380,
      gravity: 12,
      flashGrow: 2.6,
      flash: false,
      tint: "#9c8f7d",
    },
    pose: {
      windup: {
        pitch: -0.2,
        hold: true,
        roll: 0.1,
        rise: -0.07,
        coilX: 0.2,
      },
      recoil: { pitchOut: 0.12, sweepX: [0.2, -0.46] },
    },
    arrival: {
      burst: {
        puffs: 10,
        ring: true,
        size: 1.2,
        life: 560,
        gravity: 12,
        flashGrow: 2.8,
        flash: false,
        tint: "#9c8f7d",
      },
      lanes: [-0.4, 0, 0.4],
      shove: -0.4,
    },
  },
  // Tectonic Slam (tier 3 finisher): the eruption finisher — the longest
  // ground coil swelling a charge, then one colossal slab detonating as the
  // widest dust ring with the heaviest shove. The one row allowed a big
  // flashGrow.
  tectonic_slam: {
    ...eruptionBody("earth"),
    wind: 0.62,
    shots: [{ size: 2.4, life: 820, at: 0.62 }],
    muzzle: {
      puffs: 7,
      size: 1.2,
      life: 380,
      gravity: 12,
      flashGrow: 2.8,
      flash: false,
      tint: "#9c8f7d",
    },
    kick: -0.65,
    charge: { from: 0.3, to: 1.6 },
    pose: {
      windup: {
        pitch: -0.32,
        hold: true,
        roll: 0.12,
        rise: -0.12,
        coilX: 0.32,
      },
      recoil: { pitchOut: 0.2, sweepX: [0.32, -0.68], riseOut: 0.03 },
    },
    arrival: {
      burst: {
        puffs: 18,
        ring: true,
        size: 1.9,
        life: 760,
        gravity: 12,
        flashGrow: 3.4,
        flash: false,
        tint: "#9c8f7d",
      },
      shove: -0.65,
    },
  },
  // Quake Stomp (tier 2 eruption): the ground-splitter — a long deep coil
  // swelling a charge, then one heavy slab detonating as a wide dust ring.
  // Upgraded to the eruption verb and the earth identity grammar: the old
  // row kept a bare burst with no charge and no dust tint.
  quake_stomp: {
    ...eruptionBody("earth"),
    wind: 0.58,
    shots: [{ size: 2, life: 800, at: 0.58 }],
    muzzle: {
      puffs: 7,
      size: 1.1,
      life: 360,
      gravity: 12,
      flashGrow: 2.8,
      flash: false,
      tint: "#9c8f7d",
    },
    kick: -0.62,
    charge: { from: 0.3, to: 1.6 },
    pose: {
      windup: {
        pitch: -0.3,
        hold: true,
        roll: 0.1,
        rise: -0.1,
        coilX: 0.3,
      },
      recoil: { pitchOut: 0.18, sweepX: [0.3, -0.62] },
    },
    arrival: {
      burst: {
        puffs: 16,
        ring: true,
        size: 1.8,
        life: 700,
        gravity: 12,
        flashGrow: 3.2,
        flash: false,
        tint: "#9c8f7d",
      },
      shove: -0.6,
    },
  },
  // Basalt Guard (guard): a foe-targeted barrier eruption — no projectile,
  // no shove. A long raise swells a charge and lands as a basalt ring at
  // the foe with the normal contact read, exactly like pyre_wall,
  // tide_aegis, bramble_guard, and ion_wall.
  basalt_guard: {
    ...barrierBody("earth"),
    pose: {
      windup: { pitch: -0.22, hold: true, roll: 0.1, rise: 0.08, coilX: 0.2 },
      recoil: { pitchOut: 0.1, sweepX: [0.2, -0.4] },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.5,
        life: 640,
        gravity: 12,
        flashGrow: 3,
        flash: false,
        tint: "#9c8f7d",
      },
      shove: 0,
    },
  },
}
