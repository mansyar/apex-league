/**
 * Pure view-models for the cup screens (cup_module_refactor_20261018
 * FR4). Extracted verbatim from `createCup`'s decision logic so the
 * screen flow, results assembly, give-up semantics and entry-chip copy
 * are unit-testable without a DOM (learnings §11: browser behavior is
 * verified in a real browser, decisions are verified here).
 *
 * Every function is pure: it reads its inputs and returns data or copy —
 * it never touches a node, a timer, or a handler.
 */
import {
  type bossForCup,
  type Creature,
  type CupSession,
  cupPlacement,
  defaultLoadout,
  type GameState,
  getSpecies,
  isCupDay,
  type RoundVerdict,
  type Tactic,
} from "@apex/sim"
import {
  buildBracketModel,
  exitStage,
  type LadderStanding,
  ordinalOf,
  resultRows,
} from "../bracket-model"
import { TIER_NAME } from "../tier-name"

/** What the sim's `bossForCup` hands the chip (null = regular cup). */
export type CupGate = NonNullable<ReturnType<typeof bossForCup>>

// ---------------------------------------------------------------------
// The bracket walk
// ---------------------------------------------------------------------

/** One presentation beat of the strict-order reveal walk. */
export type WalkStep =
  /** The model is exhausted: finalize the cup. */
  | { kind: "done" }
  /** The player's pending match: open the CTA and pause the walk. */
  | { kind: "playerTurn"; id: string; label: string; line: string }
  /** A resolved match: speak its line, then crown or advance the walk. */
  | {
      kind: "reveal"
      id: string
      line: string
      verdict: RoundVerdict
      after: "crown" | "advance"
    }
  /** Defensive: nothing resolved to show — the walk stops silently. */
  | { kind: "stall"; id: string }

/** The presentation decision for the match at `cursor` of the walk. */
export function walkStep(session: CupSession, cursor: number): WalkStep {
  const entry = buildBracketModel(session)[cursor]
  if (!entry) return { kind: "done" }
  if (entry.isPlayerMatch && !entry.verdict) {
    return {
      kind: "playerTurn",
      id: entry.id,
      label: entry.label,
      line: `Your ${entry.label.toLowerCase()}. The coaching room is open.`,
    }
  }
  if (!entry.verdict) return { kind: "stall", id: entry.id }
  return {
    kind: "reveal",
    id: entry.id,
    line: entry.verdict.line,
    verdict: entry.verdict,
    after: entry.id === "f1" ? "crown" : "advance",
  }
}

/** The opening line when the player steps into the bracket. */
export function entryLine(playerName: string): string {
  return `${playerName} steps into the bracket!`
}

/** The feed line after the player gives up mid-bracket. */
export function giveupLine(playerName: string): string {
  return `${playerName} forfeits — the rival advances.`
}

/** The coach-room tab: "{Round} · ready". */
export function coachTabLabel(label: string): string {
  return `${label} · ready`
}

/** The coach's working picks for a pending match: the creature's own
 * loadout (or the species default) and the balanced tactic, fresh every
 * time the coaching room opens. */
export function initialPicks(creature: Creature): {
  loadout: string[]
  tactic: Tactic
} {
  const cs = getSpecies(creature.speciesId)
  if (!cs) throw new Error("Unknown species: cannot open the coach")
  return {
    loadout: [...(creature.loadout ?? defaultLoadout(creature, cs))],
    tactic: "balanced",
  }
}

// ---------------------------------------------------------------------
// The results screen
// ---------------------------------------------------------------------

/** Everything the results screen renders, derived in one pure pass. */
export interface ResultsView {
  /** Champion status — the title follows the status, not the placement. */
  won: boolean
  title: string
  cupName: string
  sub: string
  /** The placement plate's tab and line. */
  tab: string
  line: string
  /** The reward rows, in display order. */
  rows: string[]
}

/** Assemble the results screen's copy from a finalized session. */
export function resultsView(
  session: CupSession,
  ladder: LadderStanding,
  ladderBefore: LadderStanding | null,
  legendTitles = 0,
  giftPending = false,
): ResultsView {
  const placement = cupPlacement(session)
  const won = session.status === "champion"
  // The cup is named for the tier it serves; a Promotion Cup win reads
  // as the gate it is.
  const cupName =
    session.bracket.kind === "promotion"
      ? "Promotion Cup"
      : `${TIER_NAME[ladderBefore?.tier ?? "bronze"]} Cup`
  const player = session.bracket.slots[0]?.name ?? ""
  return {
    won,
    title: won ? "Champion" : "Eliminated",
    cupName,
    sub: won
      ? `${player} takes the ${cupName}!`
      : session.championName
        ? `${session.championName} takes the ${cupName}.`
        : "The cup ends without a champion.",
    tab: ordinalOf(placement),
    line: won
      ? `${player} · unbeaten through three rounds`
      : `${player} · out in the ${exitStage(placement)}`,
    rows: resultRows(session, ladder, ladderBefore, legendTitles, giftPending),
  }
}

// ---------------------------------------------------------------------
// Close / give-up semantics
// ---------------------------------------------------------------------

/** What the bracket's close button must do right now. */
export type CloseIntent =
  /** Inside an arena battle: the close button does nothing. */
  | "dismiss"
  /** Free look (nothing consumed) or a finished run: close quietly. */
  | "free"
  /** A live player-turn session after the commit: offer the give-up. */
  | "giveup"

export function closeIntent(input: {
  inBattle: boolean
  committed: boolean
  status: CupSession["status"] | null
}): CloseIntent {
  if (input.inBattle) return "dismiss"
  if (!input.committed) return "free"
  return input.status === "player-turn" ? "giveup" : "free"
}

// ---------------------------------------------------------------------
// The Enter Cup chip
// ---------------------------------------------------------------------

/** The chip's visibility, enablement and hint line. */
export function chipView(input: {
  day: number
  phase: GameState["phase"]
  hasCreature: boolean
  ladder: LadderStanding
  hasSession: boolean
  /** The sim's raw gate decision (nulled here while a session is live —
   * with a live session the standing is the honest read). */
  gate: CupGate | null
}): { visible: boolean; enabled: boolean; hint: string } {
  const cupToday =
    isCupDay(input.day) && input.phase === "cup" && input.hasCreature
  const resumable = input.hasSession
  const tierName = TIER_NAME[input.ladder.tier]
  const gate = resumable ? null : input.gate
  const hint = gate
    ? gate.kind === "promotion"
      ? "Promotion Cup awaits"
      : `${gate.boss.name} holds the final`
    : `${tierName} ${input.ladder.subTier} · ${input.ladder.points} pts`
  return {
    visible: cupToday || resumable,
    enabled: cupToday || resumable,
    hint,
  }
}

// ---------------------------------------------------------------------
// The bracket board header
// ---------------------------------------------------------------------

/** The occasion leads the board: a sim banner wins, else "{tier} Cup". */
export function bracketHeader(
  session: CupSession,
  day: number,
  tier: GameState["ladder"]["tier"],
): { title: string; sub: string } {
  return {
    title: session.bracket.banner ?? `${TIER_NAME[tier]} Cup`,
    sub: `Day ${day} · single elimination`,
  }
}
