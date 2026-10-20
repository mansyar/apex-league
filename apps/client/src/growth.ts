/**
 * Growth view-model (evolution_discovery_20261020, Phase 2). Pure data in,
 * pure data out: no DOM, no timers. The detail panel renders whatever this
 * returns, so the gate rules and the coach copy both live here.
 *
 * The met predicates read the same constants `evaluateEvolution` reads, so a
 * row can never disagree with the verdict that actually blocks the gate. While
 * a gate is undiscovered the whole section is digit-free — which is why the
 * undiscovered summary spells its met count out in words — and a revealed
 * gate shows the current value over the target.
 */
import {
  CHAMPION_BOND,
  CHAMPION_CUPS,
  CHAMPION_EVOLUTION_DAY,
  type Creature,
  EVOLUTION_DAY,
  EVOLUTION_MOOD,
  type GameState,
} from "@apex/sim"

export type GrowthRowId = "age" | "recovery" | "mood" | "bond" | "cups"

export interface GrowthRow {
  id: GrowthRowId
  /** Human label, e.g. "Mood", "Clean nights", "Day". */
  label: string
  /** Whether the creature currently satisfies this condition. */
  met: boolean
  /**
   * Undiscovered: a qualitative sentence with no digits and no threshold
   * words. Discovered: the short value/target pair, e.g. "35 / 40".
   */
  detail: string
  /** Discovered only: target, e.g. "10". null when undiscovered. */
  target: string | null
}

export interface GrowthView {
  /** The gate being explained: the stage the creature is growing INTO. */
  gate: "juvenile" | "champion" | "final"
  /** Whether this gate's thresholds are known to the save. */
  discovered: boolean
  /** Section heading, e.g. "Growing up". */
  title: string
  /** One coach line for the section, or null. */
  note: string | null
  rows: GrowthRow[]
  /** Accessible name/status summary for the section, e.g. "Growth, 2 of 3 met". */
  summary: string
}

type Gate = GrowthView["gate"]

/** A condition row before the undiscovered/discovered copy is chosen. */
interface Condition {
  id: GrowthRowId
  label: string
  met: boolean
  /** Revealed current/target pair, e.g. "6 / 10". */
  shown: string
  /** Revealed target alone, e.g. "10". */
  target: string
  /** Digit-free copy, keyed by the met flag. */
  quiet: { met: string; unmet: string }
}

const COUNT_WORDS = ["none", "one", "two", "three", "four", "five"] as const

const TITLES: Record<Gate, string> = {
  juvenile: "Growing up",
  champion: "Champion climb",
  final: "Final stage",
}

function countWord(count: number): string {
  return COUNT_WORDS[count] ?? "several"
}

/** The gate is the stage the creature is growing INTO, never its own stage. */
function gateFor(stage: Creature["stage"]): Gate {
  if (stage === "baby") return "juvenile"
  if (stage === "juvenile") return "champion"
  return "final"
}

function ageCondition(day: number, target: number): Condition {
  return {
    id: "age",
    label: "Day",
    met: day >= target,
    shown: `${day} / ${target}`,
    target: String(target),
    quiet: { met: "old enough now", unmet: "still a few days off" },
  }
}

function recoveryCondition(creature: Creature): Condition {
  const nights = creature.sickCooldown
  return {
    id: "recovery",
    label: "Clean nights",
    met: nights === 0,
    shown:
      nights === 0
        ? "clear"
        : `${nights} clean night${nights === 1 ? "" : "s"} to go`,
    target: "0",
    quiet: { met: "all clear", unmet: "recovering from a rough night" },
  }
}

function moodCondition(creature: Creature): Condition {
  const mood = creature.conditions.mood
  return {
    id: "mood",
    label: "Mood",
    met: mood >= EVOLUTION_MOOD,
    shown: `${mood} / ${EVOLUTION_MOOD}`,
    target: String(EVOLUTION_MOOD),
    quiet: { met: "in good spirits", unmet: "needs a lift" },
  }
}

function bondCondition(creature: Creature): Condition {
  const bond = creature.conditions.bond
  return {
    id: "bond",
    label: "Bond",
    met: bond >= CHAMPION_BOND,
    shown: `${bond} / ${CHAMPION_BOND}`,
    target: String(CHAMPION_BOND),
    quiet: { met: "thick as thieves", unmet: "still warming up to you" },
  }
}

function cupsCondition(cupsWon: number): Condition {
  return {
    id: "cups",
    label: "Cups won",
    met: cupsWon >= CHAMPION_CUPS,
    shown: `${cupsWon} / ${CHAMPION_CUPS}`,
    target: String(CHAMPION_CUPS),
    quiet: { met: "cup in the bag", unmet: "no cup win yet" },
  }
}

function gateConditions(
  state: GameState,
  creature: Creature,
  gate: Gate,
): Condition[] {
  if (gate === "juvenile") {
    return [
      ageCondition(state.day, EVOLUTION_DAY),
      recoveryCondition(creature),
      moodCondition(creature),
    ]
  }
  return [
    ageCondition(state.day, CHAMPION_EVOLUTION_DAY),
    recoveryCondition(creature),
    moodCondition(creature),
    bondCondition(creature),
    cupsCondition(state.cupsWon),
  ]
}

function noteFor(gate: Gate, discovered: boolean): string {
  if (gate === "final") return "Full-grown champion — no more gates to clear."
  if (gate === "juvenile") {
    return discovered
      ? "You've cleared this gate before, so the marks are plain to see."
      : "Keep the routine steady and one morning soon it will surprise you."
  }
  return discovered
    ? "Bond and cup wins carry this gate, and you know the marks to beat."
    : "Keep the bond strong and win a cup together, and the title follows."
}

function toRow(condition: Condition, discovered: boolean): GrowthRow {
  if (!discovered) {
    return {
      id: condition.id,
      label: condition.label,
      met: condition.met,
      detail: condition.met ? condition.quiet.met : condition.quiet.unmet,
      target: null,
    }
  }
  return {
    id: condition.id,
    label: condition.label,
    met: condition.met,
    detail: condition.shown,
    target: condition.target,
  }
}

/** null when there is no creature (starter pending) — never throws. */
export function growthView(state: GameState): GrowthView | null {
  const creature = state.creature
  if (!creature) return null
  const gate = gateFor(creature.stage)
  // For the final gate the flag mirrors the champion gate just cleared; there
  // are no thresholds left to reveal either way.
  const discovered =
    gate === "juvenile"
      ? state.evolutionKnowledge.juvenile
      : state.evolutionKnowledge.champion
  if (gate === "final") {
    return {
      gate,
      discovered,
      title: TITLES.final,
      note: noteFor(gate, discovered),
      rows: [],
      summary: "Growth, final stage",
    }
  }
  const rows = gateConditions(state, creature, gate).map((condition) =>
    toRow(condition, discovered),
  )
  const met = rows.filter((row) => row.met).length
  return {
    gate,
    discovered,
    title: TITLES[gate],
    note: noteFor(gate, discovered),
    rows,
    summary: discovered
      ? `Growth, ${met} of ${rows.length} met`
      : `Growth, ${countWord(met)} of ${countWord(rows.length)} met`,
  }
}
