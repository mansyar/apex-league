/**
 * Bracket model — the pure display logic for the cup screens, extracted
 * from `createCup`'s DOM factory so it can be unit-tested without a DOM
 * (cup_engine_consolidation_20261012).
 *
 * The model derives the match tree from the session's bracket itself
 * (topology-agnostic: any power-of-two slot count) and assigns verdicts to
 * matches by participant names rather than list positions, so a change in
 * the sim's subtree ordering cannot silently desync the bracket walk. The
 * 8-slot wiring reproduces today's ids (`qf1`..`f1`), columns and labels
 * exactly.
 */
import {
  ACTION_POINTS_PER_DAY,
  CUP_REWARDS,
  type CupSession,
  type CupSlot,
  cupPlacement,
  doubleKoAdvancingName,
  type RoundVerdict,
} from "@apex/sim"

/** One displayable match of the bracket walk, in walk order. */
export interface BracketMatch {
  /** Stable display id: column + 1-based index within the column. */
  id: string
  /** 1-based round (1 = first round of the bracket). */
  round: number
  /** Grid column for the bracket layout (`cup-col-*` classes). */
  column: "qf" | "sf" | "f"
  /** Broadcast label for the round ("Quarterfinal", "Round of 16", …). */
  label: string
  /** Feeder slots; null while an upstream winner is undecided. */
  a: CupSlot | null
  b: CupSlot | null
  /** The resolved verdict, or null while the match is pending. */
  verdict: RoundVerdict | null
  /** Is this the player's own fight (they won every match leading here)? */
  isPlayerMatch: boolean
}

/** Round labels keyed by distance from the final (0 = the final). */
const ROUND_NAMES: readonly string[] = ["Final", "Semifinal", "Quarterfinal"]

/** Name for a round in a bracket of `totalRounds` rounds (1-based round). */
function roundLabel(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - round
  if (fromFinal < ROUND_NAMES.length) return ROUND_NAMES[fromFinal] ?? "Final"
  // Deep rounds in big brackets: the entrant count entering this round.
  return `Round of ${2 ** (totalRounds - round + 1)}`
}

/** Grid column: the last round is the final, the one before is the
 * semifinal column, everything earlier folds into the quarterfinal column. */
function columnOf(round: number, totalRounds: number): "qf" | "sf" | "f" {
  const fromFinal = totalRounds - round
  return fromFinal === 0 ? "f" : fromFinal === 1 ? "sf" : "qf"
}

/** The name that advances from a resolved pairing: the verdict's winner, or
 * — on a double-KO draw — the sim's tiebreak, the fighter with more HP left
 * standing (battle-sim-consolidation FR4). Falling back to `slotA` here
 * highlighted a fighter the sim had already eliminated, so the next round
 * showed the wrong contender. A forfeit carries no battle to read HP from,
 * so it keeps the earlier slot. */
function advancingName(verdict: RoundVerdict): string {
  if (verdict.winner) return verdict.winner
  const finalHp = verdict.battle?.finalHp
  if (!finalHp) return verdict.slotA
  return doubleKoAdvancingName(verdict.slotA, verdict.slotB, finalHp)
}

/** One entry of the bracket's static match plan (walk order): the display
 * identity of a match in a `slotCount`-entrant single-elimination bracket,
 * independent of any session. */
export interface BracketPlanEntry {
  id: string
  round: number
  column: "qf" | "sf" | "f"
  label: string
}

/** Derive the match plan for `slotCount` entrants (a power of two). The
 * DOM builds its cards from this once, before any session exists. */
export function bracketPlan(slotCount: number): BracketPlanEntry[] {
  const totalRounds = Math.max(1, Math.round(Math.log2(slotCount)))
  const perColumn = new Map<string, number>()
  const plan: BracketPlanEntry[] = []
  for (let round = 1; round <= totalRounds; round += 1) {
    const column = columnOf(round, totalRounds)
    const count = slotCount / 2 ** round
    for (let i = 0; i < count; i += 1) {
      const inColumn = (perColumn.get(column) ?? 0) + 1
      perColumn.set(column, inColumn)
      plan.push({
        id: `${column}${inColumn}`,
        round,
        column,
        label: roundLabel(round, totalRounds),
      })
    }
  }
  return plan
}

/**
 * Derive the displayable bracket from a live session. Walk order is
 * round-major, pairing index ascending — the order the broadcast reveals.
 * Pure: reads the session, returns fresh match views.
 */
export function buildBracketModel(session: CupSession): BracketMatch[] {
  const slots = session.bracket.slots
  const player = slots[0]?.name ?? ""
  const plan = bracketPlan(slots.length)
  // Verdicts are matched to pairings by the two fighter names, never by
  // list position — the sim's subtree ordering stays an internal detail.
  const pool = [
    ...session.playerVerdicts,
    ...session.rivalVerdicts,
    ...session.completionVerdicts,
  ]
  const used = new Set<number>()
  const take = (a: string, b: string): RoundVerdict | null => {
    const index = pool.findIndex(
      (v, i) =>
        !used.has(i) &&
        ((v.slotA === a && v.slotB === b) || (v.slotA === b && v.slotB === a)),
    )
    if (index === -1) return null
    used.add(index)
    return pool[index] ?? null
  }
  const matches: BracketMatch[] = []
  // names[i] = who holds pairing slot i entering the current round
  // (null while an upstream winner is undecided).
  let names: (string | null)[] = slots.map((s) => s.name)
  const totalRounds = plan.at(-1)?.round ?? 0
  for (let round = 1; round <= totalRounds && names.length >= 2; round += 1) {
    const label = plan[matches.length]?.label ?? ""
    const column = plan[matches.length]?.column ?? "qf"
    const winners: (string | null)[] = []
    for (let i = 0; i < names.length; i += 2) {
      const aName = names[i] ?? null
      const bName = names[i + 1] ?? null
      const a = aName ? (slots.find((s) => s.name === aName) ?? null) : null
      const b = bName ? (slots.find((s) => s.name === bName) ?? null) : null
      const entry = plan[matches.length]
      const match: BracketMatch = {
        id: entry?.id ?? `${column}${matches.length}`,
        round,
        column,
        label,
        a,
        b,
        verdict: null,
        isPlayerMatch: aName === player || bName === player,
      }
      if (a && b) match.verdict = take(a.name, b.name)
      matches.push(match)
      winners.push(match.verdict ? advancingName(match.verdict) : null)
    }
    names = winners
  }
  return matches
}

/** 1st / 2nd / 3rd / 4th — placements are 1..4 today; deeper placements
 * fall through to the plain suffix the old ternary produced. */
export function ordinalOf(placement: number): string {
  if (placement === 1) return "1st"
  if (placement === 2) return "2nd"
  if (placement === 3) return "3rd"
  return `${placement}th`
}

/** The round the player went out in (the results plate's exit line). */
export function exitStage(placement: number): string {
  return placement === 2
    ? "final"
    : placement === 3
      ? "semifinal"
      : "quarterfinal"
}

/** A ladder standing: what `state.ladder` carries today. */
export interface LadderStanding {
  points: number
  subTier: string
}

/** The results screen's ladder row: promotion-aware, forfeit-honest, and
 * calm when nothing moved. */
export function ladderRow(
  current: LadderStanding,
  before: LadderStanding | null,
  forfeited: boolean,
): string {
  if (before === null) {
    // Resumed walk without a snapshot: report the standing as-is.
    return `Ladder: Bronze ${current.subTier} · ${current.points} pts`
  }
  // A forfeit zeroes the run's points (bronze ladder): say so plainly
  // instead of the neutral "unchanged".
  const earned = current.points - before.points
  if (earned > 0) {
    return current.subTier !== before.subTier
      ? `Ladder +${earned} — promoted to Bronze ${current.subTier}`
      : `Ladder +${earned} · Bronze ${current.subTier}`
  }
  return forfeited ? "Forfeit — no ladder points" : "Ladder unchanged"
}

/**
 * The results screen's reward rows, in display order (top to bottom).
 * Pure; the DOM only renders the returned strings.
 */
export function resultRows(
  session: CupSession,
  ladder: LadderStanding,
  ladderBefore: LadderStanding | null,
): string[] {
  const won = session.status === "champion"
  const lastVerdict = session.playerVerdicts.at(-1)
  const forfeited = lastVerdict !== undefined && lastVerdict.battle === null
  const row = ladderRow(ladder, ladderBefore, forfeited)
  return won
    ? [
        `+1 action point tomorrow (${ACTION_POINTS_PER_DAY + 1} total)`,
        `Bond +${CUP_REWARDS.bond}`,
        `Mood +${CUP_REWARDS.mood}`,
        "🏆 Cup won",
        row,
      ]
    : [`Consolation: mood +${CUP_REWARDS.consolations.mood}`, row]
}

/** Placement of the player in a finished session (re-exported so the DOM
 * never imports the placement rule from two places). */
export { cupPlacement }
