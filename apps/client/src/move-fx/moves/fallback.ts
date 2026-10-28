import type { MoveFx } from "../moves"

/**
 * Shared dust tint for earth's non-luminous grit (neutral, not an element
 * hue — NFR-4 hue contract untouched). Single-sourced so the grit can't
 * drift between rows.
 */
export const EARTH_DUST_TINT = "#9c8f7d"

/**
 * Per-element fallback bodies (spec FR-1): one authored launch/land grammar
 * per element for every move without a bespoke row. Each body carries its
 * element's shape language — fire rises and flickers, water lands heavy and
 * foams, electric snaps erratic around a swelling core, earth thuds down
 * non-luminous, wind streaks through and gusts outward, plant clusters and
 * petals — so no move ever renders generic again. The sibling per-element
 * tables layer verb reads on top for bespoke rows.
 */
export const ELEMENT_FALLBACK_FX: Record<string, MoveFx> = {
  fire: {
    // Rising flicker shards: a held coil with an upward rise, one ember at
    // release, and a buoyant arrival that climbs instead of falling.
    wind: 0.52,
    shots: [{ size: 1.2, life: 750, at: 0.52 }],
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 320,
      gravity: -2.2,
      sway: 0.5,
      flashGrow: 2.4,
    },
    kick: -0.42,
    pose: {
      windup: { pitch: -0.2, hold: true, roll: 0.07, rise: 0.05, coilX: 0.18 },
      recoil: { pitchOut: 0.12, sweepX: [0.18, -0.46] },
    },
    arrival: {
      burst: {
        puffs: 9,
        size: 1.3,
        life: 480,
        gravity: -2.2,
        sway: 0.5,
        flashGrow: 2.8,
      },
      shove: -0.45,
    },
  },
  water: {
    // Heavy droplets plus a foam ring: a low crouch into the release and a
    // flat ring burst that reads as a splash landing.
    wind: 0.5,
    shots: [{ size: 1.3, life: 680, at: 0.5 }],
    muzzle: { puffs: 5, size: 1, life: 340, gravity: 10, flashGrow: 2.6 },
    kick: -0.42,
    pose: {
      windup: { pitch: -0.18, rise: -0.07, coilX: 0.18 },
      recoil: { pitchOut: 0.12, sweepX: [0.18, -0.44], riseOut: 0.04 },
    },
    arrival: {
      burst: {
        puffs: 12,
        ring: true,
        size: 1.3,
        life: 620,
        gravity: 10,
        flashGrow: 3,
      },
      shove: -0.45,
    },
  },
  plant: {
    // Seed cluster plus petals: a held coil, one heavy seed at release, and
    // a slow sideways-drifting ring that settles instead of scattering.
    wind: 0.52,
    shots: [{ size: 1.4, life: 850, at: 0.52 }],
    muzzle: {
      puffs: 5,
      size: 0.9,
      life: 360,
      gravity: 1.8,
      sway: 1,
      flashGrow: 2.4,
    },
    kick: -0.44,
    pose: {
      windup: { pitch: -0.22, hold: true, rise: -0.05, coilX: 0.2 },
      recoil: { pitchOut: 0.13, sweepX: [0.2, -0.48] },
    },
    arrival: {
      burst: {
        puffs: 10,
        ring: true,
        size: 1.3,
        life: 750,
        gravity: 1.8,
        sway: 1,
        flashGrow: 3,
      },
      shove: -0.45,
    },
  },
  electric: {
    // Arc-tendril halo plus a hot core: a quick uneven windup, a charge orb
    // swelling at the mouth line, one fast bolt, and a high-sway arrival
    // that snaps instead of blooming.
    wind: 0.48,
    shots: [{ size: 1.1, life: 560, at: 0.48 }],
    muzzle: {
      puffs: 7,
      size: 1,
      life: 300,
      gravity: 4,
      sway: 2.2,
      flashGrow: 2.8,
    },
    kick: -0.4,
    charge: { from: 0.2, to: 0.9 },
    pose: {
      windup: { pitch: -0.16, roll: 0.1, rise: 0.03, coilX: 0.16 },
      recoil: { pitchOut: 0.11, sweepX: [0.16, -0.42] },
    },
    arrival: {
      burst: {
        puffs: 11,
        size: 1.2,
        life: 460,
        gravity: 4,
        sway: 2.2,
        flashGrow: 3,
      },
      shove: -0.4,
    },
  },
  earth: {
    // Tumbling grit, non-luminous: a deep ground coil, one heavy slab at
    // release, and a wide dust ring with no glow shell, dust-tinted.
    wind: 0.56,
    shots: [{ size: 1.5, life: 800, at: 0.56 }],
    muzzle: {
      puffs: 6,
      size: 1.1,
      life: 380,
      gravity: 12,
      flashGrow: 2.2,
      flash: false,
      tint: EARTH_DUST_TINT,
    },
    kick: -0.5,
    pose: {
      windup: { pitch: -0.3, hold: true, roll: 0.1, rise: -0.1, coilX: 0.26 },
      recoil: { pitchOut: 0.18, sweepX: [0.26, -0.56], riseOut: 0.02 },
    },
    arrival: {
      burst: {
        puffs: 14,
        ring: true,
        size: 1.6,
        life: 700,
        gravity: 12,
        flashGrow: 2.6,
        flash: false,
        tint: EARTH_DUST_TINT,
      },
      shove: -0.55,
    },
  },
  wind: {
    // Stretched streaks plus a gust ring: a rising windup, one fast streak
    // at release, and a wide flat ring that reads as the gust front.
    wind: 0.46,
    shots: [{ size: 1.2, life: 600, at: 0.46 }],
    muzzle: {
      puffs: 6,
      size: 1,
      life: 320,
      gravity: 2,
      sway: 1.6,
      flashGrow: 2.6,
    },
    kick: -0.38,
    pose: {
      windup: { pitch: -0.18, hold: true, roll: 0.14, rise: 0.14, coilX: 0.16 },
      recoil: { pitchOut: 0.13, sweepX: [0.16, -0.42], riseOut: 0.07 },
    },
    arrival: {
      burst: {
        puffs: 10,
        ring: true,
        size: 1.2,
        life: 560,
        gravity: 2.4,
        sway: 1.6,
        flashGrow: 3,
      },
      shove: -0.35,
    },
  },
}

/**
 * The fallback body for an element, or undefined when the element is
 * unknown. The `MOVE_FX` lookup falls through to the shared `DEFAULT_FX`
 * from there, so an unknown element keeps today's generic read.
 */
export const fallbackFor = (
  element: string | undefined,
): MoveFx | undefined => {
  if (element === undefined) return undefined
  return ELEMENT_FALLBACK_FX[element]
}
