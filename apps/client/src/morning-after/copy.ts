/**
 * The one morning-after copy table (FR-10): every ritual line lives here —
 * the four class debriefs and the four amplifier lines — so a copy edit is
 * a single-file change and nothing else carries ritual prose (checked by
 * the golden test). Tone rule: warm coach voice, at most two sentences, and
 * no identifiers left in braces when a line reaches the player (the
 * interpolate contract below).
 *
 * Tokens: `{name}` is the creature's name, `{boss}` a boss display name.
 */

import type { MorningAfterClass, MorningAfterDerivation } from "./derive"
import type { Amplifier } from "./milestones"

/** What the caller supplies for token interpolation: `{name}` always, and
 * `{boss}` when the moment names a boss (a gatekeep class or a first scalp
 * the caller knows the display name of). */
export interface DebriefContext {
  readonly name: string
  readonly boss?: string
}

/** The ritual copy table — the single source for every morning-after line
 * (FR-10). Line feel may be refined at review; the location and keys hold. */
export interface CopyTable {
  readonly classes: Record<MorningAfterClass, string>
  readonly amplifiers: Record<Amplifier["kind"], string>
}

export const MORNING_AFTER_COPY: CopyTable = {
  classes: {
    title:
      "League champion. {name} took us all the way — let her enjoy it today.",
    gatekeep:
      "{boss} had our number today. We'll bring a better answer next time.",
    exit: "Not the result we wanted, but the work is never wasted. Bowls and patience, as always.",
    withdrawn: "We packed it in early today. Rest is part of the sport too.",
  },
  amplifiers: {
    first_title: "The first crown in the family. Pin this morning to the wall.",
    first_legend_title: "A plateau title. They'll be writing about this one.",
    first_scalp: "First wall down — {boss}. That one's going on the wall.",
    new_tier:
      "League post just came through: a new egg is waiting in the nursery.",
  },
}

/** The amplifier priority order for FR-6's single debrief: when one
 * finalize crosses several firsts, the earliest in this order takes the
 * morning's line; the rest of the list stays data for richer surfaces. */
const AMPLIFIER_PRIORITY = [
  "first_title",
  "first_legend_title",
  "first_scalp",
  "new_tier",
] as const satisfies ReadonlyArray<Amplifier["kind"]>

/**
 * A plain replace-all interpolation: every `{key}` occurrence becomes the
 * value for that key; braces without a supplied value pass through (the
 * table has no such tokens, and the golden test pins the survivors never
 * reach a debrief).
 */
export function interpolate(
  text: string,
  tokens: Readonly<Record<string, string>>,
): string {
  return Object.entries(tokens).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(value),
    text,
  )
}

/**
 * Pick one debrief line for the morning: an amplifier's line when any
 * persisted first crossed (the priority order above selects which), the
 * class line otherwise, interpolated with the context's tokens.
 *
 * `{name}` is the creature's name; `{boss}` is the context's boss display
 * name when supplied, else the derivation's own boss id (the classifier
 * surfaces it for exactly the lines that name the boss) — so a debrief
 * never ships a bare brace to the player; callers pass display names via
 * context.boss.
 */
export function pickDebriefCopy(
  derivation: MorningAfterDerivation,
  context: DebriefContext,
): { readonly text: string; readonly amplifier: boolean } {
  const chosen = AMPLIFIER_PRIORITY.flatMap((kind) =>
    derivation.amplifiers.filter((a) => a.kind === kind),
  )[0]
  const raw = chosen
    ? MORNING_AFTER_COPY.amplifiers[chosen.kind]
    : MORNING_AFTER_COPY.classes[derivation.class]
  let boss = context.boss
  if (!boss && chosen?.kind === "first_scalp") boss = chosen.bossId
  if (!boss && derivation.class === "gatekeep") {
    boss = derivation.bossId ?? undefined
  }
  const text = interpolate(raw, { name: context.name, boss: boss ?? "" })
  return { text, amplifier: chosen !== undefined }
}
