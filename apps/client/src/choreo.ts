/**
 * Per-archetype body language (FR5) — the choreography library's first
 * layer. Each arena archetype carries a motion identity: how it walks,
 * breathes, sways at rest, how hard it flinches, and how it commits to an
 * attack. Values are multipliers over the staging driver's base
 * constants, so the neutral profile reproduces today's behavior exactly.
 *
 * Pure data + pure functions — no THREE, no DOM — so the profiles are
 * table-tested here and the ranch can adopt them later (spec FR4).
 */

/** The neutral motion identity: every multiplier is exactly 1. */
const NEUTRAL: BodyProfile = {
  gaitAmp: 1,
  gaitFreq: 1,
  leanPitch: 1,
  swayAmp: 0.02,
  swayFreq: 1,
  breathAmp: 1,
  breathFreq: 1,
  hurtMult: 1,
  staggerMult: 1,
  windupMult: 1,
  recoilMult: 1,
  strikeMult: 1,
}

export interface BodyProfile {
  /** Walk-bob amplitude multiplier. */
  readonly gaitAmp: number
  /** Stride tempo multiplier (how fast the walk phase advances). */
  readonly gaitFreq: number
  /** Forward-lean multiplier while moving. */
  readonly leanPitch: number
  /** Resting lateral drift amplitude, in world units. */
  readonly swayAmp: number
  /** Resting lateral drift frequency multiplier. */
  readonly swayFreq: number
  /** Breathing depth multiplier. */
  readonly breathAmp: number
  /** Breathing rate multiplier. */
  readonly breathFreq: number
  /** Flinch impulse multiplier when a hit lands. */
  readonly hurtMult: number
  /** Stagger reel weight multiplier. */
  readonly staggerMult: number
  /** Windup coil amplitude multiplier for a move's posture (timing fixed). */
  readonly windupMult: number
  /** Recoil amplitude multiplier after a move releases (timing fixed). */
  readonly recoilMult: number
  /** Basic-strike commit amplitude multiplier (the arrival point is fixed). */
  readonly strikeMult: number
}

/**
 * The arena's body-language table (FR5). Signature notes:
 * - draconic: quick and light — fast stride, eager lean, subtle coil sway;
 *   snaps out of a short windup.
 * - bovine: heavy — big slow bob, deep breathing, the heaviest flinch;
 *   coils slow and deep, then commits the whole body.
 * - axolotl: fluid — soft gait, the strongest undulating idle sway; gives
 *   softly on the commit and absorbs the recoil.
 * - storm_hound: wired — a twitchy fast stride and a jittery idle; barely
 *   winds up, then bucks hard off the release.
 * - falcon: light and precise — almost no bob, a still exact stance; dives
 *   from a short windup and rides the recoil out.
 * - tortoise: ponderous and immovable — a slow low gait, deep slow breath;
 *   barely flinches, winds up forever, and commits the shell.
 * - frond: tall and alert — a springy high-kneed stride, an upright stance
 *   that leans in fast, a shallow quick breath, and a light flinch.
 * - crab: wide and skittering — a low stance that never leans far, the
 *   widest lateral drift in the arena, and a short punchy commit.
 * - smolder: banked heat — a heavy slow plod over a deep bellows breath;
 *   coils long and staggers big, then pushes the whole fleece through.
 */
const PROFILES: Record<string, BodyProfile> = {
  draconic: {
    gaitAmp: 1.15,
    gaitFreq: 1.15,
    leanPitch: 1.2,
    swayAmp: 0.015,
    swayFreq: 1.2,
    breathAmp: 1,
    breathFreq: 1.2,
    hurtMult: 1.1,
    staggerMult: 1.1,
    windupMult: 0.75,
    recoilMult: 1.15,
    strikeMult: 1.2,
  },
  bovine: {
    gaitAmp: 1.35,
    gaitFreq: 0.8,
    leanPitch: 0.8,
    swayAmp: 0.01,
    swayFreq: 0.7,
    breathAmp: 1.2,
    breathFreq: 0.7,
    hurtMult: 1.25,
    staggerMult: 1.3,
    windupMult: 1.45,
    recoilMult: 1.3,
    strikeMult: 1.35,
  },
  axolotl: {
    gaitAmp: 0.8,
    gaitFreq: 1.2,
    leanPitch: 0.7,
    swayAmp: 0.03,
    swayFreq: 1.4,
    breathAmp: 0.9,
    breathFreq: 1.1,
    hurtMult: 0.9,
    staggerMult: 0.9,
    windupMult: 1.1,
    recoilMult: 0.85,
    strikeMult: 0.85,
  },
  storm_hound: {
    gaitAmp: 1.25,
    gaitFreq: 1.45,
    leanPitch: 1.35,
    swayAmp: 0.022,
    swayFreq: 1.55,
    breathAmp: 1.1,
    breathFreq: 1.5,
    hurtMult: 0.95,
    staggerMult: 0.9,
    windupMult: 0.8,
    recoilMult: 1.35,
    strikeMult: 1.2,
  },
  falcon: {
    gaitAmp: 0.7,
    gaitFreq: 1.55,
    leanPitch: 1.5,
    swayAmp: 0.008,
    swayFreq: 0.9,
    breathAmp: 0.6,
    breathFreq: 1.55,
    hurtMult: 0.8,
    staggerMult: 0.75,
    windupMult: 0.65,
    recoilMult: 0.7,
    strikeMult: 1.45,
  },
  tortoise: {
    gaitAmp: 0.9,
    gaitFreq: 0.55,
    leanPitch: 0.6,
    swayAmp: 0.012,
    swayFreq: 0.55,
    breathAmp: 1.45,
    breathFreq: 0.55,
    hurtMult: 0.6,
    staggerMult: 0.55,
    windupMult: 1.55,
    recoilMult: 0.55,
    strikeMult: 1.5,
  },
  frond: {
    gaitAmp: 1.1,
    gaitFreq: 1.05,
    leanPitch: 1.25,
    swayAmp: 0.017,
    swayFreq: 1.1,
    breathAmp: 0.95,
    breathFreq: 1.15,
    hurtMult: 0.9,
    staggerMult: 1,
    windupMult: 0.9,
    recoilMult: 1,
    strikeMult: 1.1,
  },
  crab: {
    gaitAmp: 0.85,
    gaitFreq: 1.35,
    leanPitch: 0.65,
    swayAmp: 0.038,
    swayFreq: 1.6,
    breathAmp: 0.85,
    breathFreq: 1.25,
    hurtMult: 1.05,
    staggerMult: 0.85,
    windupMult: 0.85,
    recoilMult: 1.05,
    strikeMult: 1.25,
  },
  smolder: {
    gaitAmp: 1.3,
    gaitFreq: 0.75,
    leanPitch: 0.95,
    swayAmp: 0.014,
    swayFreq: 0.8,
    breathAmp: 1.3,
    breathFreq: 0.75,
    hurtMult: 1.15,
    staggerMult: 1.2,
    windupMult: 1.3,
    recoilMult: 1.2,
    strikeMult: 1.3,
  },
  fox: {
    gaitAmp: 1.2,
    gaitFreq: 1.5,
    leanPitch: 1.3,
    swayAmp: 0.024,
    swayFreq: 1.5,
    breathAmp: 1,
    breathFreq: 1.4,
    hurtMult: 0.9,
    staggerMult: 0.85,
    windupMult: 0.7,
    recoilMult: 1.3,
    strikeMult: 1.35,
  },
  heron: {
    gaitAmp: 0.75,
    gaitFreq: 1,
    leanPitch: 1.1,
    swayAmp: 0.02,
    swayFreq: 1,
    breathAmp: 0.8,
    breathFreq: 1.2,
    hurtMult: 0.85,
    staggerMult: 0.8,
    windupMult: 0.7,
    recoilMult: 0.9,
    strikeMult: 1.5,
  },
  mole: {
    gaitAmp: 0.95,
    gaitFreq: 0.85,
    leanPitch: 0.7,
    swayAmp: 0.016,
    swayFreq: 0.75,
    breathAmp: 1.25,
    breathFreq: 0.7,
    hurtMult: 1.1,
    staggerMult: 1.15,
    windupMult: 1.35,
    recoilMult: 1,
    strikeMult: 1.2,
  },
  cub: {
    gaitAmp: 1.05,
    gaitFreq: 1.3,
    leanPitch: 1,
    swayAmp: 0.019,
    swayFreq: 1.3,
    breathAmp: 1.05,
    breathFreq: 1.3,
    hurtMult: 1,
    staggerMult: 0.95,
    windupMult: 0.6,
    recoilMult: 1.25,
    strikeMult: 1.4,
  },
  boar: {
    gaitAmp: 1.4,
    gaitFreq: 0.65,
    leanPitch: 0.5,
    swayAmp: 0.011,
    swayFreq: 0.65,
    breathAmp: 1.35,
    breathFreq: 0.6,
    hurtMult: 1.3,
    staggerMult: 1.35,
    windupMult: 1.5,
    recoilMult: 1.4,
    strikeMult: 1.15,
  },
  otter: {
    gaitAmp: 1,
    gaitFreq: 1.25,
    leanPitch: 1.15,
    swayAmp: 0.028,
    swayFreq: 1.35,
    breathAmp: 1.15,
    breathFreq: 1.35,
    hurtMult: 0.7,
    staggerMult: 0.7,
    windupMult: 1,
    recoilMult: 0.95,
    strikeMult: 1.05,
  },
}

export const DEFAULT_PROFILE: BodyProfile = Object.freeze(NEUTRAL)

/** Resolve an archetype's motion identity; unknown ids stay neutral. */
export function profileFor(archetypeId: string): BodyProfile {
  return PROFILES[archetypeId] ?? DEFAULT_PROFILE
}

/** Flinch impulse for a landed hit, weighted by the archetype. */
export function hurtImpulse(profile: BodyProfile, base: number): number {
  return base * profile.hurtMult
}

/** Stagger reel weight, weighted by the archetype. */
export function staggerReel(profile: BodyProfile, base: number): number {
  return base * profile.staggerMult
}

/**
 * Resting lateral drift (the body's slow sway while idle). Pure: a sine
 * over wall-clock milliseconds with the fighter's phase offset.
 */
export function idleSway(
  profile: BodyProfile,
  nowMs: number,
  phase: number,
): number {
  return Math.sin((nowMs / 1000) * profile.swayFreq + phase) * profile.swayAmp
}

// Freeze the table so no choreography can quietly rewrite an identity.
Object.freeze(PROFILES)
for (const p of Object.values(PROFILES)) Object.freeze(p)

/**
 * Reaction library (FR5): how a fighter takes a hit. The sim's enriched
 * playback contract names the reaction kind; the archetype profile
 * weights the body's response. Movement (slide/dash) stays global —
 * it must agree with the sim's far/near semantics, not a species'
 * personality.
 */
export type ReactionKind = "glance" | "stagger" | "knockback" | "dodge" | "down"

/** One reaction's choreography, resolved for a specific body. */
export interface ReactionSpec {
  /** Squash spring kick at the moment of impact (sign per staging). */
  readonly impulse: number
  /** Reel duration as a fraction of the reaction step (0 = none). */
  readonly reel: number
  /** Off-balance backward lean amplitude through the reel. */
  readonly reelPitch: number
  /** Persistent outward stage slide (the sim's range shift). */
  readonly slide: number
  /** Instant dash distance (evasion). */
  readonly dash: number
}

interface ReactionBase extends ReactionSpec {
  /** Which profile weight scales the body response ("none" = global). */
  readonly weight: "hurt" | "stagger" | "none"
}

const REACTION_BASES: Record<ReactionKind, ReactionBase> = {
  glance: {
    impulse: 0.85,
    reel: 0,
    reelPitch: 0,
    slide: 0,
    dash: 0,
    weight: "hurt",
  },
  stagger: {
    impulse: 0.85,
    reel: 0.85,
    reelPitch: 0.2,
    slide: 0.3,
    dash: 0,
    weight: "stagger",
  },
  knockback: {
    impulse: 0.85,
    reel: 0.65,
    reelPitch: 0.14,
    slide: 0.9,
    dash: 0,
    weight: "stagger",
  },
  dodge: {
    impulse: -0.3,
    reel: 0,
    reelPitch: 0,
    slide: 0,
    dash: 0.85,
    weight: "none",
  },
  down: {
    impulse: 0.9,
    reel: 0.7,
    reelPitch: 0,
    slide: 0,
    dash: 0,
    weight: "hurt",
  },
}

/** Resolve a reaction for a body; unknown kinds read as a plain glance. */
export function reactionFor(
  kind: ReactionKind,
  profile: BodyProfile,
): ReactionSpec {
  const base = REACTION_BASES[kind] ?? REACTION_BASES.glance
  const weight =
    base.weight === "hurt"
      ? profile.hurtMult
      : base.weight === "stagger"
        ? profile.staggerMult
        : 1
  return Object.freeze({
    impulse: base.impulse * weight,
    reel: base.reel,
    reelPitch: base.reelPitch * weight,
    slide: base.slide,
    dash: base.dash,
  })
}

for (const r of Object.values(REACTION_BASES)) Object.freeze(r)
