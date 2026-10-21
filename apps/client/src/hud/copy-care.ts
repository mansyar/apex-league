import {
  type CareRejection,
  type Creature,
  type CreatureConditions,
  EXHAUSTED_ENERGY,
  FORM_COPY,
  FORM_DELTAS,
  type FormTier,
  formTier,
  type GameState,
  getTrainingProgram,
  previewTraining,
  SICK_HEALTH,
  type StatKey,
  type TrainingPreview,
  type TrainingProgram,
} from "@apex/sim"
import {
  driftCallout,
  graduationHint,
  growthHint,
  unlockCallout,
} from "./copy-growth"

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
export function previewNote(
  preview: "gained" | "sick" | "hungry" | "exhausted",
): string {
  if (preview === "gained") return "+1 tonight"
  if (preview === "sick") return "no gain — unwell"
  if (preview === "exhausted") return "no gain — too tired"
  return "no gain — hungry"
}

/** Why tonight's program cannot pay, in the row's own voice (≤ 1 sentence). */
export const NO_GAIN_TONIGHT = {
  sick: "Sick — no gain tonight",
  hungry: "Hungry — no gain tonight",
  exhausted: "Too tired to gain tonight",
} as const

/** The fallback line for a night with nothing to pay for another reason. */
export const NO_GAIN_TONIGHT_FALLBACK = "No gain tonight"

/**
 * A program's primary/trickle tradeoff in plain words, e.g. "ATK +1/night —
 * DEF on breakthrough nights". The sim owns the label and the blurb; this
 * line only spells the two stats out.
 */
export function programTradeoff(program: TrainingProgram): string {
  const def = getTrainingProgram(program)
  const primary = statLabel(def.primary)
  const trickle = statLabel(def.trickle)
  return `${primary} +1/night — ${trickle} on breakthrough nights`
}

/** The cap note a picker row reads once its primary cannot grow. */
export function cappedLine(stat: StatKey): string {
  return `${statLabel(stat)} capped`
}

/** "+1 ATK" or "+1 ATK, +1 DEF" — stat names always spelled out. */
export function gainsLine(gains: TrainingPreview["gains"]): string {
  return STATS.flatMap(({ key, label }) => {
    const gain = gains[key] ?? 0
    return gain > 0 ? [`+${gain} ${label}`] : []
  }).join(", ")
}

/** Tonight's line for a program row: what it pays, or why it pays nothing.
 * `extra` carries the payoff a program adds beyond stats (Ring Craft's mood
 * and bond), so two programs that train the same stats still read apart. */
export function tonightLine(preview: TrainingPreview, extra = ""): string {
  if (preview.result === "sick") return NO_GAIN_TONIGHT.sick
  if (preview.result === "hungry") return NO_GAIN_TONIGHT.hungry
  if (preview.result === "exhausted") return NO_GAIN_TONIGHT.exhausted
  const gains = gainsLine(preview.gains)
  if (gains === "") return NO_GAIN_TONIGHT_FALLBACK
  return extra === "" ? gains : `${gains} · ${extra}`
}

/** The train control's label: the assigned program, or the invitation. */
export function trainButtonLabel(program: TrainingProgram | null): string {
  return program === null
    ? "Choose tonight's training"
    : `Training: ${getTrainingProgram(program).label}`
}

/** The collapsed dock head's one-fact training read. */
export function dockHeadTraining(program: TrainingProgram | null): string {
  return program === null
    ? "No training set"
    : getTrainingProgram(program).label
}

/**
 * "Breakthrough in 2 nights" — the trickle night, three trained nights apart.
 * Tonight counts as a trained night when a program is assigned, so a counter on
 * a multiple of three reads "Breakthrough tonight" rather than "in 3 nights".
 */
export function breakthroughLine(
  trainingDays: number,
  assigned = false,
): string {
  const paid = assigned ? trainingDays : trainingDays + 1
  const m = paid % 3
  const nights = paid === 0 ? 3 : m === 0 ? 0 : 3 - m
  return nights === 0
    ? "Breakthrough tonight"
    : `Breakthrough in ${nights} ${nights === 1 ? "night" : "nights"}`
}

/** The ATK delta a form tier applies, spelled out so colour is never it. */
export function formDeltaLine(tier: FormTier): string {
  const atk = FORM_DELTAS[tier].atk
  return `ATK ${atk >= 0 ? `+${atk}` : `${atk}`}`
}

/**
 * "Sluggish — Neglected and ailing: -2 ATK.": the tier and its consequence in
 * one line for the spar card and the coach room. Shared so both surfaces read
 * the same words, and testable without a DOM.
 */
export function formReadout(tier: FormTier): string {
  return `${FORM_COPY[tier].label} — ${FORM_COPY[tier].line}`
}

/** The form block every fight surface shares, as data (FR-14). */
export interface FormRead {
  label: string
  line: string
  delta: string
  /** The pinning sentence, only for a partner under the sickness line. */
  sickNote: string | null
}

/** Read one creature's form for a fight surface: tier, consequence, pin note. */
export function formRead(creature: Creature): FormRead {
  const tier = formTier(creature)
  return {
    label: FORM_COPY[tier].label,
    line: FORM_COPY[tier].line,
    delta: formDeltaLine(tier),
    sickNote: creature.conditions.health < SICK_HEALTH ? FORM_SICK_NOTE : null,
  }
}

/** Why a sick creature reads Sluggish whatever its mood. */
export const FORM_SICK_NOTE =
  "Sick, so form is pinned to Sluggish — medicine would help."

/** The Training tab's empty program state and its pointer to the dock. */
export const TRAINING_EMPTY = "Nothing assigned tonight."
export const TRAINING_EMPTY_POINTER =
  "Pick a program in the ranch dock to start."

/** Section headings shared by the Training tab (never colour-only). */
export const TRAINING_TAB_HEADINGS = {
  program: "Tonight's program",
  progress: "Progress",
  form: "Form",
  table: "Programs",
} as const

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
 * The status line leads with training: the program preview while one is
 * assigned, the morning result after Advance Day, and the condition coach
 * line only when training has nothing to say.
 */
export function trainingStatus(
  creature: NonNullable<GameState["creature"]>,
  lastProgram: TrainingProgram | null,
): string {
  if (creature.trainingProgram) {
    const stat = statLabel(getTrainingProgram(creature.trainingProgram).primary)
    const preview = previewTraining(creature).result
    if (preview === "gained") {
      return `A full night's rest will sharpen ${stat}.`
    }
    if (preview === "sick") {
      return "Too unwell to gain from training — medicine would help."
    }
    if (preview === "exhausted") {
      return "Too tired to gain from tonight's training."
    }
    return "Too hungry to gain from tonight's training."
  }
  switch (creature.trainingResult) {
    case "gained":
      return lastProgram
        ? `Last night's rest sharpened ${statLabel(
            getTrainingProgram(lastProgram).primary,
          )}.`
        : "A night of rest paid off in training."
    case "sick":
      return `${creature.name} was too unwell to gain from training.`
    case "hungry":
      return `${creature.name} was too hungry to gain from training.`
    case "exhausted":
      return `${creature.name} was too tired to gain from training.`
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
  lastProgram: TrainingProgram | null,
  climb: string | null,
): string {
  return (
    climb ||
    trainingStatus(creature, lastProgram) ||
    coachVoice(creature.conditions, creature.name) ||
    unlockCallout(creature) ||
    growthHint(creature) ||
    graduationHint(creature) ||
    flavorCallout(creature)
  )
}

/**
 * The hatch-day ticker line: on a drifted hatch the drift statement leads
 * the routine precedence — element-independent, so a water partner's flavor
 * line can never bury it. Any other day runs the routine precedence
 * untouched.
 */
export function hatchDayStatusLine(
  creature: NonNullable<GameState["creature"]>,
  state: GameState,
  lastProgram: TrainingProgram | null,
  climb: string | null,
): string {
  return (
    driftCallout(creature, state.lineage, state.day) ||
    statusLine(creature, lastProgram, climb)
  )
}
