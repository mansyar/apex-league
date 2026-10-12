/**
 * Per-archetype body language (FR5) — the choreography library's first
 * layer. Each arena archetype carries a motion identity: how it walks,
 * breathes, sways at rest, and how hard it flinches. Values are
 * multipliers over the staging driver's base constants, so the neutral
 * profile reproduces today's behavior exactly.
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
}

/**
 * The arena's body-language table (FR5). Signature notes:
 * - draconic: quick and light — fast stride, eager lean, subtle coil sway.
 * - bovine: heavy — big slow bob, deep breathing, the heaviest flinch.
 * - axolotl: fluid — soft gait, the strongest undulating idle sway.
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
