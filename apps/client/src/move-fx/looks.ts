import * as THREE from "three"
import { elementHue } from "../element"

/**
 * Element hues come from ui/element.ts, which re-derives them from the
 * sim's canonical ELEMENT_HUE contract (Fire 18°, Plant 110°, Water 205°,
 * Electric 50°, Earth 28°, Wind 165°). A projectile reads as its type at
 * a glance, and the color survives color-blindness checks when paired
 * with the move icon in the HUD.
 */
export const ELEMENT_COLOR_FALLBACK = "#cfd6e4"

export const elementColor = (element: string | undefined): string =>
  element === undefined
    ? ELEMENT_COLOR_FALLBACK
    : new THREE.Color()
        .setHSL((elementHue(element) % 360) / 360, 0.75, 0.6)
        .getStyle()

/** Flight + arc constants shared by the shot tables and the flight interpreter. */
export const PROJECTILE_LIFE_MS = 700
export const PROJECTILE_ARC = 0.55

/**
 * How a shot reads in flight (FR5): geometry family, glow, flight
 * dynamics, and trail style - declared per element and interpreted by
 * the shot builder. A new element slots in by adding one entry.
 */
export interface ShotLook {
  /** Core geometry family built by the interpreter. */
  geometry:
    | "ember"
    | "teardrop"
    | "seedCluster"
    | "orb"
    | "boulder"
    | "streak"
    | "fork"
    | "chunk"
    | "needle"
    | "jet"
  /** Additive halo opacity at the core (0 = none). */
  glow?: number
  /** Core size pulse amplitude (0 = none). */
  pulse?: number
  /** Lateral wobble amplitude in world units (0 = none). */
  wobble?: number
  /** Spin rate around the travel axis, radians per ms. */
  spin?: number
  /** Stretches the core along travel (teardrop, streak) - 1 = round. */
  stretch?: number
  /** Arc-lift multiplier over PROJECTILE_ARC. */
  arc?: number
  /** Trail segment family streaming behind the shot. */
  trail: "embers" | "droplets" | "seeds" | "orbs" | "dust" | "streaks"
}

export const SHOT_LOOKS: Record<string, ShotLook> = {
  fire: {
    geometry: "ember",
    glow: 0.32,
    pulse: 0.18,
    arc: 0.7,
    spin: 0.012,
    trail: "embers",
  },
  water: {
    geometry: "teardrop",
    stretch: 1.5,
    wobble: 0.05,
    pulse: 0.05,
    arc: 0.55,
    trail: "droplets",
  },
  plant: {
    geometry: "seedCluster",
    spin: 0.02,
    arc: 1.4,
    trail: "seeds",
  },
  electric: {
    geometry: "orb",
    arc: 1,
    trail: "orbs",
  },
  earth: {
    // A heavy, non-luminous lob: a flat boulder tumbling slowly through a
    // high arc, shedding flat dust facets on the way.
    geometry: "boulder",
    arc: 1.35,
    spin: 0.004,
    trail: "dust",
  },
  wind: {
    // A wind-only streak (FR-4): a faceted needle pulled hard along
    // travel, spinning fast on a low flat arc with a sliver tail. It
    // shares no geometry with water's smooth teardrop and no trail with
    // plant's seeds — wind owns every part it renders.
    geometry: "streak",
    stretch: 2.1,
    wobble: 0.04,
    spin: 0.03,
    arc: 0.3,
    trail: "streaks",
  },
}

/**
 * Per-row shot-look overrides (fire identity FR-1): a row listed here
 * renders its own geometry + trail instead of its element's default, while
 * every other look field rides the element row. Spark + flare_dart opted
 * in during Phase 2 and cinder_shot during Phase 3 (P3.T1); blaze_bolt
 * follows in P3.T2. Resolution pairs with `fxFor(moveId, element)`: pass
 * the same pair to `lookFor`.
 */
export const MOVE_SHOT_LOOK: Record<string, Partial<ShotLook>> = {
  // Spark (Phase 2, FR-2): a bright zigzag fork that snaps across the
  // lane — high lateral wobble so the short flight crackles instead of
  // reading as a travel ball. The halo and trail ride the fire default.
  spark: { geometry: "fork", wobble: 0.3 },
  // Flare Dart (Phase 2, FR-4): a molten needle on a laser-straight lane
  // — no arc lift, no ripple, no tumble, no throb. The small row size
  // keeps the inherited ember trail minimal.
  flare_dart: { geometry: "needle", arc: 0, wobble: 0, spin: 0, pulse: 0 },
  // Cinder Shot (Phase 3, FR-3): a heavy tumbling ember chunk — the rock
  // plus its crack veins read at the large row size, and the 0.35 lateral
  // wobble rolls it downrange instead of the fork's erratic crackle. Halo,
  // pulse, arc, and trail ride the fire default.
  cinder_shot: { geometry: "chunk", wobble: 0.35 },
}

/**
 * Resolve the shot look for a launch: the row's override merged over its
 * element default, or the element default when the row opts out. Calling
 * with no moveId keeps the exact pre-override read (the same object).
 */
export const lookFor = (
  element: string | undefined,
  moveId?: string | undefined,
): ShotLook => {
  const base: ShotLook = (element !== undefined
    ? SHOT_LOOKS[element]
    : undefined) ?? {
    geometry: "orb",
    arc: 1,
    trail: "orbs",
  }
  const override = moveId !== undefined ? MOVE_SHOT_LOOK[moveId] : undefined
  return override === undefined ? base : { ...base, ...override }
}
