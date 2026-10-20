import {
  type CareRejection,
  type Creature,
  type CreatureConditions,
  EXHAUSTED_ENERGY,
  type GameState,
  previewTraining,
  SICK_HEALTH,
  type StatKey,
} from "@apex/sim"
import { graduationHint, growthHint, unlockCallout } from "./copy-growth"

/**
 * The care half of the HUD's copy engine: care actions, condition and stat
 * copy, the training status line and the routine ticker precedence. Pure
 * (state → string) functions — no DOM, no wiring.
 */

/** Coach-voice copy for disabled actions (≤ 2 sentences, never punishing). */
export const REJECTION_COPY: Record<CareRejection, string> = {
  "no-creature": "No partner yet.",
  "no-ap": "No AP left today.",
  "not-sick": "Not sick — save the medicine.",
  "too-sick": "Too sick to play today.",
  "too-tired": "Too tired to play.",
}

/** Display labels for the four trainable stats (shared by copy + plates). */
export const STATS: Array<{ key: StatKey; label: string }> = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
]

/** The display label for one of the four trainable stat keys. */
export function statLabel(key: StatKey): string {
  return STATS.find((s) => s.key === key)?.label ?? key
}

/** The short parenthetical note for what tonight's rest would do. */
export function previewNote(preview: "gained" | "sick" | "hungry"): string {
  if (preview === "gained") return "+1 tonight"
  if (preview === "sick") return "no gain — unwell"
  return "no gain — hungry"
}

/**
 * The condition coach line: at most one gentle nudge for whatever needs
 * care most, in strict priority (unwell > exhausted > down > hungry).
 * Empty when the partner is fine — silence is the healthy baseline.
 */
export function coachVoice(
  conditions: CreatureConditions,
  name: string,
): string {
  if (conditions.health < SICK_HEALTH) {
    return `${name} seems unwell — medicine would help.`
  }
  if (conditions.energy <= EXHAUSTED_ENERGY) {
    return `${name} seems sluggish today…`
  }
  if (conditions.mood < 30) return `${name} seems a little down today.`
  if (conditions.hunger <= 20) return `${name} looks hungry.`
  return ""
}

/**
 * The element-flavored idle line: when nothing else needs saying, a water
 * partner gets a small water-flavored moment (echoing its catalog flavor).
 * Coach-voice, ≤ 2 sentences, never punishing. Empty for other elements.
 */
export function flavorCallout(creature: Creature): string {
  if (creature.element !== "water") return ""
  return `${creature.name} hums a contented bubble song.`
}

/**
 * The status line leads with training: the preview while a focus is set,
 * the morning result after Advance Day, and the condition coach line only
 * when training has nothing to say.
 */
export function trainingStatus(
  creature: NonNullable<GameState["creature"]>,
  lastFocus: StatKey | null,
): string {
  if (creature.trainingFocus) {
    const stat = statLabel(creature.trainingFocus)
    const preview = previewTraining(creature)
    if (preview === "gained") {
      return `A full night's rest will sharpen ${stat}.`
    }
    if (preview === "sick") {
      return "Too unwell to gain from training — medicine would help."
    }
    return "Too hungry to gain from tonight's training."
  }
  switch (creature.trainingResult) {
    case "gained":
      return lastFocus
        ? `Last night's rest sharpened ${statLabel(lastFocus)}.`
        : "A night of rest paid off in training."
    case "sick":
      return `${creature.name} was too unwell to gain from training.`
    case "hungry":
      return `${creature.name} was too hungry to gain from training.`
    default:
      return ""
  }
}

/**
 * Index of the AP pip that just drained when the spend total goes down
 * (drives the one-shot spend flash), or null when nothing was spent.
 */
export const spendFlashIndex = (prev: number, next: number): number | null =>
  next < prev ? next : null

/**
 * The save-failure coach line: calm, blame-free, non-blocking. Shown once
 * when a persist fails (quota, private mode) — the day carries on.
 */
export function saveFailureNotice(): string {
  return "Heads up — that progress didn't save. Your partner's day carries on anyway."
}

/**
 * The corrupt-save coach line: calm, blame-free, non-blocking. Shown once
 * at boot when an existing save cannot be read — the game starts fresh,
 * and the player deserves to know why.
 */
export function corruptSaveNotice(): string {
  return "That old save couldn't be read — starting fresh. Sorry about that."
}

/**
 * The status ticker's routine line, in strict precedence: promotion news
 * first (the ticker holds its last line until the next update, so the
 * promotion stays visible after the cup overlay closes), then training,
 * then the condition coach line, then fresh-unlock news, then the growth
 * hints, then flavor.
 */
export function statusLine(
  creature: NonNullable<GameState["creature"]>,
  day: number,
  lastFocus: StatKey | null,
  climb: string | null,
): string {
  return (
    climb ||
    trainingStatus(creature, lastFocus) ||
    coachVoice(creature.conditions, creature.name) ||
    unlockCallout(creature) ||
    growthHint(day, creature) ||
    graduationHint(day, creature) ||
    flavorCallout(creature)
  )
}
