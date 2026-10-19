/**
 * Battle move data (pure, testable): the per-move fire/land grammar,
 * per-element shot looks, and element tint derivation. Data only -
 * no staging/scene/driver imports, so tests can exercise the tables
 * without a renderer. The staging driver interprets these declarations.
 */
import * as THREE from "three"
import { elementHue } from "./element"

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
 * Attack grammar, as fractions of the action's total length. The melee
 * strike now reads its boundaries from the enriched playback contract
 * (PLAYBACK_PHASES.melee — windup ends 0.26, contact lands 0.46); the
 * projectile shot still times its launch off CONTACT_T until its
 * bespoke Phase 2 choreography retunes the row.
 */
export const CONTACT_T = 0.46

/**
 * How a shot reads in flight (FR5): geometry family, glow, flight
 * dynamics, and trail style - declared per element and interpreted by
 * the shot builder. A new element slots in by adding one entry.
 */
export interface ShotLook {
  /** Core geometry family built by the interpreter. */
  geometry: "ember" | "teardrop" | "seedCluster" | "orb"
  /** Additive halo opacity at the core (0 = none). */
  glow?: number
  /** Core size pulse amplitude (0 = none). */
  pulse?: number
  /** Lateral wobble amplitude in world units (0 = none). */
  wobble?: number
  /** Spin rate around the travel axis, radians per ms. */
  spin?: number
  /** Stretches the core along travel (teardrop) - 1 = round. */
  stretch?: number
  /** Arc-lift multiplier over PROJECTILE_ARC. */
  arc?: number
  /** Trail segment family streaming behind the shot. */
  trail: "embers" | "droplets" | "seeds" | "orbs"
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
}

export const lookFor = (element: string | undefined): ShotLook =>
  (element !== undefined ? SHOT_LOOKS[element] : undefined) ?? {
    geometry: "orb",
    arc: 1,
    trail: "orbs",
  }

export interface BurstStyle {
  /** Fragment count. */
  puffs?: number
  /** Scatter on a flat horizontal ring instead of a random sphere. */
  ring?: boolean
  /** Downward pull, units per second squared (element default). */
  gravity?: number
  /** Lateral sine drift on fragments, units per second (element default). */
  sway?: number
  /** Burst duration in ms (default 520). */
  life?: number
  /** How far the glow shell swells (default 2.4). */
  flashGrow?: number
  /** Radius multiplier for flash and fragments (default 1). */
  size?: number
  /** Override the element hue (e.g. dust grays). */
  tint?: string
  /** Set false for non-emissive bursts (dust) with no glow shell. */
  flash?: boolean
}

export interface Posture {
  /** Windup coil pitch amplitude (signed; hold => half-sine). */
  pitch?: number
  /** Hold the coil at full depth (half-sine) instead of a full sine. */
  hold?: boolean
  /** Windup roll amplitude (full sine). */
  roll?: number
  /** Windup vertical rise amplitude (full sine, signed). */
  rise?: number
  /** Quadratic backward pull into the windup. */
  coilX?: number
  /** Recoil pitch amplitude (positive, full sine). */
  pitchOut?: number
  /** Recoil horizontal sweep: [pull-back, overshoot]. */
  sweepX?: [number, number]
  /** Recoil vertical rise. */
  riseOut?: number
}

export interface ShotSpec {
  size: number
  life: number
  /** Lateral z offset for fanned volleys. */
  spread?: number
  /** Release beat as a fraction of the launch action. */
  at: number
}

export interface MoveFx {
  /** Windup fraction of the launch action at full pacing. */
  wind: number
  /** Projectiles released (one entry per shot; volleys list several). */
  shots: ShotSpec[]
  /** Flash at the thrower's mouth on the first release. */
  muzzle?: BurstStyle
  /** Backward impulse on each release beat. */
  kick: number
  /** A charge orb swelling at the mouth through the windup. */
  charge?: { from: number; to: number }
  /** Launch body posture: windup curve and recoil curve. */
  pose: { windup: Posture; recoil: Posture }
  /** Arrival treatment where the shot lands, plus the victim shove. */
  arrival: { burst: BurstStyle; lanes?: number[]; shove: number }
  /** Point-blank compression: squeezed windup, micro-flight, beats. */
  compressed?: { wind: number; flight: number; beats: number[] }
}

export const MOVE_FX: Record<string, MoveFx> = {
  cinder_shot: {
    wind: 0.55,
    shots: [{ size: 1.8, life: 850, at: 0.55 }],
    muzzle: {},
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
      burst: { puffs: 9, size: 1.6, life: 460, gravity: 9, flashGrow: 2.8 },
      shove: -0.5,
    },
  },
  blaze_bolt: {
    wind: 0.6,
    shots: [{ size: 1.05, life: 300, at: 0.6 }],
    muzzle: { puffs: 7, size: 1.2, life: 380, gravity: 6, flashGrow: 2.6 },
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
      burst: { puffs: 9, size: 1.5, life: 460, gravity: 9, flashGrow: 2.8 },
      shove: -0.55,
    },
  },
  bramble_dart: {
    wind: 0.5,
    shots: [{ size: 2.2, life: 1000, at: 0.5 }],
    kick: -0.5,
    pose: {
      windup: { pitch: -0.3, hold: true, rise: -0.04, coilX: 0.26 },
      recoil: { pitchOut: 0.2, sweepX: [0.26, -0.6] },
    },
    arrival: {
      burst: { puffs: 10, size: 1.3, life: 700, gravity: 6, flashGrow: 3 },
      shove: -0.45,
    },
  },
  splash_bolt: {
    wind: 0.52,
    shots: [{ size: 1.6, life: 620, at: 0.52 }],
    kick: -0.45,
    pose: {
      windup: { pitch: -0.18, rise: -0.08, coilX: 0.18 },
      recoil: { pitchOut: 0.13, sweepX: [0.18, -0.45], riseOut: 0.05 },
    },
    arrival: {
      burst: { puffs: 12, size: 1.2, life: 600, gravity: 8, flashGrow: 3 },
      shove: -0.5,
    },
  },
  spore_burst: {
    wind: 0.26,
    shots: [
      { size: 1, life: 700, spread: -0.5, at: 0.36 },
      { size: 1, life: 700, spread: 0, at: 0.48 },
      { size: 1, life: 700, spread: 0.5, at: 0.6 },
    ],
    kick: -0.18,
    pose: {
      windup: { pitch: -0.1, rise: -0.05, coilX: 0.1 },
      recoil: { pitchOut: 0.06, sweepX: [0.1, -0.3] },
    },
    arrival: {
      burst: {
        puffs: 10,
        ring: true,
        gravity: 1.2,
        life: 900,
        flashGrow: 3.4,
        size: 1.4,
      },
      shove: 0,
    },
    compressed: { wind: 0.3, flight: 220, beats: [0.38, 0.44, 0.5] },
  },
  // The wider pool adds one heavy finisher per element beside a steady move
  // that shares the default tier 1-2 read. These three carry the weight so the
  // pair is distinguishable in play; the steady moves inherit the defaults.
  pyre_lance: {
    wind: 0.62,
    shots: [{ size: 2.4, life: 900, at: 0.62 }],
    muzzle: { puffs: 9, size: 1.5, life: 420, gravity: 7, flashGrow: 3 },
    kick: -0.66,
    charge: { from: 0.3, to: 1.6 },
    pose: {
      windup: { pitch: -0.3, hold: true, roll: 0.1, rise: 0.07, coilX: 0.28 },
      recoil: { pitchOut: 0.18, sweepX: [0.28, -0.62] },
    },
    arrival: {
      burst: { puffs: 12, size: 1.8, life: 520, gravity: 9, flashGrow: 3.2 },
      shove: -0.6,
    },
  },
  root_quake: {
    wind: 0.58,
    shots: [{ size: 2.3, life: 1000, at: 0.58 }],
    kick: -0.58,
    pose: {
      windup: { pitch: -0.34, hold: true, rise: -0.1, coilX: 0.3 },
      recoil: { pitchOut: 0.2, sweepX: [0.3, -0.62], riseOut: 0.04 },
    },
    arrival: {
      burst: {
        puffs: 14,
        ring: true,
        size: 1.5,
        life: 700,
        gravity: 4,
        flashGrow: 3.4,
      },
      shove: -0.5,
    },
  },
  maelstrom: {
    wind: 0.56,
    shots: [
      { size: 1.5, life: 760, spread: -0.25, at: 0.5 },
      { size: 1.5, life: 760, spread: 0.25, at: 0.56 },
    ],
    kick: -0.5,
    pose: {
      windup: { pitch: -0.22, hold: true, rise: -0.06, coilX: 0.24 },
      recoil: { pitchOut: 0.15, sweepX: [0.24, -0.56] },
    },
    arrival: {
      burst: {
        puffs: 16,
        ring: true,
        size: 1.4,
        life: 700,
        gravity: 6,
        flashGrow: 3.4,
      },
      shove: -0.5,
    },
    compressed: { wind: 0.32, flight: 240, beats: [0.42, 0.5] },
  },
  foam_volley: {
    wind: 0.26,
    shots: [
      { size: 0.75, life: 520, spread: 0, at: 0.28 },
      { size: 0.75, life: 520, spread: 0, at: 0.4 },
      { size: 0.75, life: 520, spread: 0, at: 0.52 },
    ],
    kick: -0.12,
    pose: {
      windup: { pitch: -0.1, rise: -0.05, coilX: 0.1 },
      recoil: { pitchOut: 0.06, sweepX: [0.1, -0.3] },
    },
    arrival: {
      burst: { size: 0.8, life: 380 },
      lanes: [-0.3, 0, 0.3],
      shove: -0.4,
    },
    compressed: { wind: 0.3, flight: 220, beats: [0.38, 0.44, 0.5] },
  },
}

/** Shared tier 1-2 launch archetype; also the fallback for unknown ids. */
export const DEFAULT_FX: MoveFx = {
  wind: CONTACT_T,
  shots: [{ size: 1, life: PROJECTILE_LIFE_MS, at: CONTACT_T }],
  kick: -0.35,
  pose: {
    windup: { pitch: -0.16, roll: 0.06, rise: 0.04, coilX: 0.14 },
    recoil: { pitchOut: 0.09, sweepX: [0.14, -0.34] },
  },
  arrival: { burst: {}, shove: 0 },
}

export const fxFor = (moveId: string | undefined): MoveFx =>
  (moveId !== undefined ? MOVE_FX[moveId] : undefined) ?? DEFAULT_FX
