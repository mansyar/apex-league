import {
  type CareRejection,
  CHAMPION_EVOLUTION_DAY,
  CHAMPION_HINT_DAY,
  CHAMPION_STAT_BOOST,
  type Creature,
  type CreatureConditions,
  canGraduate,
  EVOLUTION_DAY,
  EVOLUTION_HINT_DAY,
  EVOLUTION_STAT_BOOST,
  EXHAUSTED_ENERGY,
  type GameState,
  GRADUATION_HINT_DAY,
  getMove,
  getSpecies,
  lineagePrestige,
  MOVE_TIER3_DAYS,
  MOVE_TIER4_DAYS,
  PRESTIGE_ESTABLISHED_LINE,
  PRESTIGE_WARM_BLOODLINE,
  previewTraining,
  requiredTierDays,
  SICK_HEALTH,
  type StatKey,
} from "@apex/sim"

/**
 * The HUD's copy engine: every coach-voice line the HUD can say, as pure
 * (state → string) functions. No DOM, no wiring — the plates/dock/settings
 * modules and the hud root consume these, and the mock page reuses them so
 * its copy can never drift from the live HUD's.
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
 * The fresh-unlock coach line: while the trained-days counter sits exactly
 * on a tier threshold, the coach names the move that just became legal.
 * Under training and condition copy in precedence — a quiet morning only.
 */
export function unlockCallout(creature: Creature): string {
  const days = creature.trainingDays
  if (days !== MOVE_TIER3_DAYS && days !== MOVE_TIER4_DAYS) {
    return ""
  }
  const species = getSpecies(creature.speciesId)
  if (!species) return ""
  const moveIndex = species.kit.findIndex(
    (_, index) => requiredTierDays(index, creature.stage) === days,
  )
  const moveId = species.kit[moveIndex]
  if (moveId === undefined) return ""
  const move = getMove(moveId)
  if (!move) return ""
  const tail =
    days === MOVE_TIER3_DAYS
      ? ` Train ${MOVE_TIER4_DAYS - days} more days for the next tier.`
      : ""
  return `New move available: ${move.displayName}.${tail}`
}

/**
 * Life-stage display name for the nameplate badge.
 */
export function stageLabel(stage: Creature["stage"]): string {
  if (stage === "juvenile") return "Juvenile"
  if (stage === "champion") return "Champion"
  return "Baby"
}

/** Roman tally symbols, descending — the generation numeral alphabet. */
const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
]

/**
 * A generation as a Roman numeral (1 → "I", 2 → "II"). Out-of-range or
 * non-integer input falls back to "#n" so the plate never renders "NaN".
 */
export function romanNumeral(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return `#${n}`
  let rest = n
  let out = ""
  for (const [value, symbol] of ROMAN) {
    while (rest >= value) {
      out += symbol
      rest -= value
    }
  }
  return out
}

/**
 * The bloodline's display name: the founder is unnumbered, every successor
 * carries its Roman numeral (generation 1 → "<Name> II"), so a dynasty reads
 * as one family rather than a list of strangers.
 */
export function familyName(name: string, generation: number): string {
  return generation > 0 ? `${name} ${romanNumeral(generation + 1)}` : name
}

/**
 * The growth hint (care track): from the hinted day on, the coach
 * occasionally teases that the baby is maturing — without disclosing the
 * threshold. Priority sits below unlock news and condition coach lines,
 * above flavor: raising is the game, but urgent care still leads.
 * Requires the current day, so the caller passes it in.
 */
export function growthHint(day: number, creature: Creature): string {
  if (creature.stage === "champion") return ""
  if (creature.stage === "juvenile") {
    // The champion tease (champion track): same direction-only contract —
    // it points at the bond and the cups without naming the thresholds.
    if (day < CHAMPION_HINT_DAY) return ""
    if (day < CHAMPION_EVOLUTION_DAY) {
      return `${creature.name} is growing into something grand — keep the bond strong and win another cup together.`
    }
    // Past the gate age and still juvenile: the climb is still open, so
    // the hint keeps pointing (discovered-not-hidden — never a dead end).
    return `${creature.name} is ready to become a champion — keep the bond strong and win another cup.`
  }
  if (day < EVOLUTION_HINT_DAY || day >= EVOLUTION_DAY) return ""
  return `${creature.name} is filling out — keep the routine steady and one morning soon it will surprise you.`
}

/**
 * The graduation hint (legacy track): from the hinted day on, a champion
 * gets one direction-only coach line about the send-off — what graduating
 * does, never a threshold or a demand. Ranks above flavor, below care.
 */
export function graduationHint(day: number, creature: Creature): string {
  if (creature.stage !== "champion" || day < GRADUATION_HINT_DAY) return ""
  return `${creature.name} has had a full career — graduating passes a stat floor to the next egg.`
}

/**
 * The evolution-moment coach line: what changed, in stat numbers. Shown
 * once by the HUD right after the ceremony, ahead of the routine status.
 * The boost follows the stage: the champion's grander leap gets its own
 * pinned numbers.
 */
export function evolveCallout(creature: Creature): string {
  const b =
    creature.stage === "champion" ? CHAMPION_STAT_BOOST : EVOLUTION_STAT_BOOST
  return `Evolution! ${creature.name} grew into a ${stageLabel(creature.stage)} — +${b.hp} HP · +${b.atk} ATK · +${b.def} DEF · +${b.spd} SPD. The ranch just got livelier.`
}

/**
 * The graduation send-off coach line (legacy track): names the retiree, the
 * generation the bloodline just started, and the successor. Warm, proud —
 * a hand-off, never a loss.
 */
export function graduationCallout(
  retireeName: string,
  successorName: string,
  generation: number,
): string {
  return `${retireeName} graduated to the Hall of Fame — generation ${generation} begins with ${successorName}.`
}

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
 * One onboarding hint: a coach-voice nudge that appears once at the moment
 * it matters, then never again (dismissal persists in settings.seenHints).
 */
export interface HudHint {
  id: string
  text: string
}

// Onboarding callouts (save v7). First match wins — the array order below
// is the teaching order: AP first, kit depth second, cup last.
const HINTS: Array<HudHint & { when: (state: GameState) => boolean }> = [
  {
    id: "ap-basics",
    when: (s) => s.phase === "day" && s.day === 1 && s.creature !== null,
    text: "Three action points a day — feed, rest, treat, play. Spend them like they matter.",
  },
  {
    id: "training-tier",
    when: (s) => s.phase === "day" && s.day === 5 && s.creature !== null,
    text: "Training focus sticks between days, and the kit keeps growing — one more move unlocks tomorrow.",
  },
  {
    id: "cup-eve",
    when: (s) => s.phase === "day" && s.day % 7 === 6 && s.creature !== null,
    text: "Cup day is tomorrow. The bracket takes your partner as they are — spend today wisely.",
  },
  {
    // Silver Ladder (FR11): one-time coach line setting up the Silver
    // division — Bronze-only, since a Silver I climber tops a different
    // tier now.
    id: "silver-awaits",
    when: (s) =>
      s.creature !== null &&
      s.ladder.tier === "bronze" &&
      s.ladder.subTier === "I" &&
      s.ladder.points > 0,
    text: "You've topped Bronze — the Silver division awaits. Keep banking cup wins; the climb continues soon.",
  },
  {
    // Legacy (v10): the send-off unlocks — teach what graduating does.
    id: "graduation-ready",
    when: (s) => canGraduate(s).eligible,
    text: "A full career. Graduating retires this champion to the Hall of Fame and passes a stat floor to the next egg.",
  },
  {
    // Legacy prestige milestones (v10): teach each perk the first time it
    // takes effect. Gated on a founded line (>0 generations) so a
    // pre-legacy save's cup tally can never trigger them early. The
    // thresholds are the sim's constants, never literals — retuning a
    // milestone there must retune the coach line with it.
    id: "prestige-warm-bloodline",
    when: (s) =>
      s.lineage.generation > 0 && lineagePrestige(s) >= PRESTIGE_WARM_BLOODLINE,
    text: "Warm bloodline — your next egg will start with a stronger bond.",
  },
  {
    id: "prestige-established-line",
    when: (s) =>
      s.lineage.generation > 0 &&
      lineagePrestige(s) >= PRESTIGE_ESTABLISHED_LINE,
    text: "Established line — every inherited stat floor gains +1 from here on.",
  },
  // Silver Ladder (FR11): one-time boss-defeat callouts, deduped by
  // seenHints like every other coach line — the ledger is the trigger,
  // so the callout fires exactly once per scalp, even across reloads.
  {
    id: "boss-koda",
    when: (s) => s.bossDefeats.includes("koda"),
    text: "The Promotion gate is DOWN — Sear Marshal Koda never saw it coming. Silver, meet your climber.",
  },
  {
    id: "boss-hesse",
    when: (s) => s.bossDefeats.includes("hesse"),
    text: "Verdant Dame Hesse falls. The ridge is behind you — the summit is ahead.",
  },
  {
    id: "boss-marlow",
    when: (s) => s.bossDefeats.includes("marlow"),
    text: "Marlow's tide breaks. Silver is yours — the Gold horizon waits.",
  },
]

/** The first unseen hint whose moment is now, or null when all is quiet. */
export function selectHint(
  state: GameState,
  seenIds: ReadonlySet<string>,
): HudHint | null {
  return HINTS.find((h) => h.when(state) && !seenIds.has(h.id)) ?? null
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
