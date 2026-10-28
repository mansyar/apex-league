import type { MoveFx } from "../moves"
import { fallbackFor } from "./fallback"

/**
 * Verb-family choreography builders (spec FR-5): shared launch/land shapes
 * for the verbs move names carry — walls raise barriers, charges dash,
 * stomps erupt ground, sprays fan cones, volleys fan multiples, lances
 * beam. Each builder starts from the element's fallback body so the
 * element's shape language rides along, then layers the verb's read on
 * top. Phases 2-7 compose these into bespoke rows; the steps interpret the
 * result through the standard fire path, so no step dispatch changes are
 * needed.
 */

/** The element's fallback body, or a throw for an unknown element. */
function baseOf(element: string): MoveFx {
  const base = fallbackFor(element)
  if (base === undefined) throw new Error(`no fallback body for ${element}`)
  return base
}

/**
 * Barrier (pyre_wall, tide_aegis, bramble_guard, ion_wall, basalt_guard,
 * zephyr_veil): no projectile — a long raise into a swelling charge that
 * lands as a ring at the caster with no shove.
 */
export function barrierBody(element: string): MoveFx {
  const base = baseOf(element)
  return {
    ...base,
    wind: 0.62,
    shots: [],
    charge: { from: 0.25, to: 1.2 },
    arrival: {
      burst: {
        ...base.arrival.burst,
        ring: true,
        puffs: Math.max(base.arrival.burst.puffs ?? 6, 10),
      },
      shove: 0,
    },
  }
}

/**
 * Dash (flame_charge, volt_dash, thorn_charge, cinder_dive, riptide_rush):
 * a quick crouch that launches one fast shot with a deep shove.
 */
export function dashBody(element: string): MoveFx {
  const base = baseOf(element)
  return {
    ...base,
    wind: 0.38,
    shots: [{ size: 1.4, life: 500, at: 0.38 }],
    kick: Math.min(base.kick, -0.7),
    arrival: { ...base.arrival, shove: Math.min(base.arrival.shove, -0.6) },
  }
}

/**
 * Eruption (root_quake, quake_stomp, tectonic_slam): a long ground coil
 * that detonates a wide ring with a heavy shove.
 */
export function eruptionBody(element: string): MoveFx {
  const base = baseOf(element)
  return {
    ...base,
    wind: 0.6,
    pose: {
      windup: {
        ...base.pose.windup,
        hold: true,
        coilX: Math.max(base.pose.windup.coilX ?? 0, 0.28),
      },
      recoil: base.pose.recoil,
    },
    arrival: {
      burst: {
        ...base.arrival.burst,
        ring: true,
        puffs: Math.max(base.arrival.burst.puffs ?? 6, 16),
        size: Math.max(base.arrival.burst.size ?? 1, 1.7),
      },
      shove: Math.min(base.arrival.shove, -0.55),
    },
  }
}

/**
 * Cone (mist_spray, sand_blast, spore_burst): one wide shot at release
 * that lands across three lanes.
 */
export function coneBody(element: string): MoveFx {
  const base = baseOf(element)
  return {
    ...base,
    wind: 0.55,
    shots: [{ size: 1.6, life: 700, at: 0.55 }],
    arrival: {
      burst: { ...base.arrival.burst, ring: true },
      lanes: [-0.4, 0, 0.4],
      shove: base.arrival.shove,
    },
  }
}

/**
 * Volley fan (foam_volley, thorn_volley): three small shots fanned across
 * the lane on ascending beats with a light arrival each.
 */
export function volleyFanBody(element: string): MoveFx {
  const base = baseOf(element)
  return {
    ...base,
    wind: 0.28,
    shots: [
      { size: 0.85, life: 620, spread: -0.45, at: 0.3 },
      { size: 0.85, life: 620, spread: 0, at: 0.43 },
      { size: 0.85, life: 620, spread: 0.45, at: 0.56 },
    ],
    kick: -0.16,
    arrival: { ...base.arrival, shove: Math.max(base.arrival.shove, -0.4) },
  }
}

/**
 * Beam/lance (pyre_lance, gigavolt, sky_bolt): a long charge swelling into
 * one heavy fast shot with a focused arrival.
 */
export function beamBody(element: string): MoveFx {
  const base = baseOf(element)
  return {
    ...base,
    wind: 0.62,
    shots: [{ size: 2.2, life: 640, at: 0.62 }],
    charge: { from: 0.3, to: 1.6 },
    kick: Math.min(base.kick, -0.6),
    arrival: {
      burst: {
        ...base.arrival.burst,
        puffs: 8,
        size: 1.4,
        life: 480,
        flashGrow: 3,
      },
      shove: Math.min(base.arrival.shove, -0.55),
    },
  }
}
