/**
 * Derived form (`20261020-training-programs-form`): how a creature's care shows
 * up in a fight, as one pure read of mood, bond and health.
 *
 * This module reads `creature.conditions` only. It never draws from the RNG,
 * never mutates its input, and moves ATK alone: HP stays out of it, so the
 * doubled-HP scale and the FR12 fairness bands stay exactly where they were
 * tuned, and SPD stays out of it because turn order is discrete — a speed delta
 * flips initiative on the FR12 boundary and turns a fair gatekeeper into a
 * 0%/90% cliff (phase-3 probe, 2026-10-20). Form is computed on demand — O(1),
 * no cached state, no save field.
 *
 * The score is `0.6 * mood + 0.4 * bond` because mood is the faster-moving
 * signal (it swings with a single night's care) while bond is the slow,
 * accumulated one; four fifths of the score therefore still needs a real
 * relationship behind it. The `steady` band deliberately starts at 40 and
 * includes it: a freshly created creature sits at mood 60 / bond 10, which
 * scores exactly 40, so its delta is all zeros and a starting-condition battle
 * stays byte-identical to the pre-form output (NFR-2 golden stability). Any
 * narrowing of that band would silently rebalance every existing golden.
 *
 * Sickness outranks the score: a creature below `SICK_HEALTH` is `sluggish`
 * whatever its mood, so neglect can never be bought off with treats.
 */

import { type Creature, type CreatureStats, effectiveStats } from "./creature"
import { SICK_HEALTH } from "./settlement"

/** The four derived form tiers, best to worst. */
export type FormTier = "sharp" | "steady" | "flat" | "sluggish"

/** Score at or above which a healthy creature is `sharp`. */
const SHARP_SCORE = 65

/** Score at or above which a healthy creature is `steady`. */
const STEADY_SCORE = 40

/** Score at or above which a healthy creature is `flat`; below is `sluggish`. */
const FLAT_SCORE = 20

/**
 * The stat delta each tier applies on top of `effectiveStats`. HP and DEF are
 * always 0, and SPD is always 0 by decision: form is a form of the fighter, not
 * a second health pool, and ATK is the one stat that scales smoothly instead of
 * flipping turn order, so the FR12 fairness bands stay inside their envelope.
 */
export const FORM_DELTAS: Readonly<Record<FormTier, Readonly<CreatureStats>>> =
  Object.freeze({
    sharp: Object.freeze({ hp: 0, atk: 1, def: 0, spd: 0 }),
    steady: Object.freeze({ hp: 0, atk: 0, def: 0, spd: 0 }),
    flat: Object.freeze({ hp: 0, atk: -1, def: 0, spd: 0 }),
    sluggish: Object.freeze({ hp: 0, atk: -2, def: 0, spd: 0 }),
  })

/**
 * Coach-voice copy for each tier, reused verbatim by the cup coach room, the
 * spar card, the creature plate and the handbook. Each line is a single
 * sentence that stands alone out of context and names the stats it moves, so
 * the tier is never carried by colour alone.
 */
export const FORM_COPY: Readonly<
  Record<FormTier, Readonly<{ label: string; line: string }>>
> = Object.freeze({
  sharp: Object.freeze({
    label: "Sharp",
    line: "Bonded and in fine fettle: +1 ATK.",
  }),
  steady: Object.freeze({
    label: "Steady",
    line: "Settled and content: no change to ATK.",
  }),
  flat: Object.freeze({
    label: "Flat",
    line: "Out of sorts: -1 ATK.",
  }),
  sluggish: Object.freeze({
    label: "Sluggish",
    line: "Neglected and ailing: -2 ATK.",
  }),
})

/** The form score: 0.6 * mood + 0.4 * bond, unrounded. */
export function formScore(creature: Creature): number {
  return 0.6 * creature.conditions.mood + 0.4 * creature.conditions.bond
}

/**
 * The creature's derived form tier. Sickness pins the result to `sluggish`;
 * otherwise the score picks the band (boundaries are inclusive at the bottom
 * of each better tier).
 */
export function formTier(creature: Creature): FormTier {
  if (creature.conditions.health < SICK_HEALTH) return "sluggish"
  const score = formScore(creature)
  if (score >= SHARP_SCORE) return "sharp"
  if (score >= STEADY_SCORE) return "steady"
  if (score >= FLAT_SCORE) return "flat"
  return "sluggish"
}

/** The complete stat delta for the creature's form (zeros where none). */
export function formModifier(creature: Creature): CreatureStats {
  return { ...FORM_DELTAS[formTier(creature)] }
}

/**
 * The combat stat line for a pre-fight readout: `effectiveStats` plus the form
 * delta. SPD is passed through verbatim — form never moves it — and the ATK
 * penalty is floored at 1 so no creature is ever unusable. Pure — it reads the
 * creature and returns a fresh object.
 */
export function battleStats(creature: Creature): CreatureStats {
  const effective = effectiveStats(creature)
  const delta = formModifier(creature)
  return {
    hp: Math.max(1, effective.hp + delta.hp),
    atk: Math.max(1, effective.atk + delta.atk),
    def: Math.max(1, effective.def + delta.def),
    spd: effective.spd,
  }
}
