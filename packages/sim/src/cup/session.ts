/**
 * The live cup session (part of the cup, live-cup spec): the bracket
 * pre-resolves its player-independent rival subtree at entry; the player's
 * branch resolves on demand with the coaching room's picks, and the bracket
 * always plays out to a champion.
 *
 * Everything here is pure and DOM-free: every resolution returns a new
 * immutable session. Split out of the former monolithic cup.ts
 * (cup_module_refactor_20261018) — pure relocation, no behavior change.
 * Bracket construction lives in ./bracket, pairing resolution in
 * ./verdicts.
 */

import { type BattleResult, resolveBattle, type Tactic } from "../battle"
import type { BossDef } from "../bosses"
import type { Creature } from "../creature"
import type { CupKind } from "../ladder"
import { getSpecies, type SpeciesDef } from "../species"
import {
  CUP_ROUNDS,
  type CupBracket,
  type CupSlot,
  makeBracket,
  substituteFinalBoss,
} from "./bracket"
import {
  battleSideForSlot,
  cupMatchSeed,
  type RivalResolution,
  type RoundVerdict,
  resolvePairing,
  roundLabel,
} from "./verdicts"

/** A live cup session (live-cup spec FR2): the seeded bracket plus the
 * player-independent subtree resolved at entry. The player's own branch
 * (QF1, SF1, Final) resolves on demand at fight time, with the loadout
 * and tactic picked in the coaching room. Immutable: every resolution
 * returns a new session. */
export interface CupSession {
  readonly bracket: CupBracket
  /** The bracket seed — the determinism anchor (day + creature identity). */
  readonly seed: number
  /** Pre-resolved rival pairings in reveal order: QF2, QF3, QF4, SF2. */
  readonly rivalResolutions: readonly RivalResolution[]
  /** The rival verdicts (display contract, in reveal order). */
  readonly rivalVerdicts: readonly RoundVerdict[]
  /** The player's live-resolved verdicts, in round order. */
  readonly playerVerdicts: readonly RoundVerdict[]
  /** Rival matches resolved after the player's exit (auto-complete). */
  readonly completionVerdicts: readonly RoundVerdict[]
  /** The round the player fights next (1-3); 0 once eliminated or crowned. */
  readonly nextPlayerRound: number
  /** The player's next opponent, or null when the player is done. */
  readonly nextOpponent: CupSlot | null
  readonly status: "player-turn" | "eliminated" | "champion"
  /** The champion once the cup completes; null while the player is live. */
  readonly championName: string | null
}

/** Start a live cup session: build the seeded bracket and pre-resolve the
 * player-independent subtree — QF2/QF3/QF4, then SF2 from their winners —
 * with the same per-pairing seed formula the one-sitting resolver uses, so
 * rival battles stay byte-identical with the legacy flow. When `boss` is
 * given (the machine resolved the ladder's gate), the bracket's final rival
 * is substituted after the draw and flagged with `kind`. `pool` widens the
 * rival species list (FR-7: the reward line joins the field once the save
 * can own it). Pure. */
export function startCupSession(
  owned: Readonly<Creature>,
  day: number,
  seed: number,
  kind: CupKind = "championship",
  boss?: BossDef,
  pool?: readonly SpeciesDef[],
): CupSession {
  let bracket = makeBracket(owned, day, seed, pool)
  if (boss) bracket = substituteFinalBoss(bracket, boss, kind)
  const slotAt = (i: number): CupSlot => {
    const slot = bracket.slots[i]
    if (!slot) throw new Error("Bracket slot missing")
    return slot
  }
  // Per-pairing battle seed: the pairing index inside its round.
  const rivalSeed = (round: number, i: number): number =>
    cupMatchSeed(day, round, i)
  const qf2 = resolvePairing(1, slotAt(2), slotAt(3), rivalSeed(1, 1))
  const qf3 = resolvePairing(1, slotAt(4), slotAt(5), rivalSeed(1, 2))
  const qf4 = resolvePairing(1, slotAt(6), slotAt(7), rivalSeed(1, 3))
  // The round-2 field is the round-1 winners in slot order, so SF2 pairs
  // the QF3 and QF4 winners (SF1 would pair the QF1/QF2 winners).
  const sf2 = resolvePairing(2, qf3.winner, qf4.winner, rivalSeed(2, 1))
  const rivalResolutions: readonly RivalResolution[] = [qf2, qf3, qf4, sf2]
  return {
    bracket,
    seed,
    rivalResolutions,
    rivalVerdicts: rivalResolutions.map((r) => r.verdict),
    playerVerdicts: [],
    completionVerdicts: [],
    nextPlayerRound: 1,
    nextOpponent: slotAt(1),
    status: "player-turn",
    championName: null,
  }
}

/** The player's BattleSide from their frozen bracket slot (live cup): the
 * snapshot stats taken at entry, plus the coaching room's loadout/tactic. */
function slotPlayerSide(
  slot: CupSlot,
  loadout: readonly string[],
  tactic: Tactic,
): ReturnType<typeof battleSideForSlot> {
  const species = getSpecies(slot.speciesId)
  if (!species) throw new Error(`Unknown species: ${slot.speciesId}`)
  return {
    name: slot.name,
    element: species.element,
    stats: slot.stats,
    kit: loadout,
    tactic,
    temperament: species.temperament,
    // The frozen player slot's secondary, if the creature drift-bred one;
    // omitted when absent so pre-amendment slots build identical sides.
    ...(slot.affinity ? { affinity: slot.affinity } : {}),
  }
}

/** Resolve the player's current match live with the coaching room's picks
 * (live-cup spec FR3/FR5). The battle seed follows the per-pairing formula
 * `(day*97 + round*13 + i*7)` with the player's pairing always first in
 * its round (i = 0). Pure: returns a fresh advanced session;
 * throws when the session is not waiting on the player.
 */
export function resolvePlayerMatch(
  session: CupSession,
  loadout: readonly string[],
  tactic: Tactic,
): { session: CupSession; verdict: RoundVerdict } {
  if (session.status !== "player-turn") {
    throw new Error("The cup is not waiting on the player")
  }
  const round = session.nextPlayerRound
  const opponent = session.nextOpponent
  const playerSlot = session.bracket.slots[0]
  if (!opponent || !playerSlot) {
    throw new Error("The session has no pending player pairing")
  }
  // The player's own pairing is index 0 of its round.
  const seed = cupMatchSeed(session.bracket.day, round, 0)
  const result: BattleResult = resolveBattle(
    slotPlayerSide(playerSlot, loadout, tactic),
    battleSideForSlot(opponent, seed),
    seed,
  )
  const line = result.winner
    ? `${result.winner} takes the ${roundLabel(round)}!`
    : `Both fighters are down — the ${roundLabel(round)} is a draw.`
  const verdict: RoundVerdict = {
    round,
    slotA: playerSlot.name,
    slotB: opponent.name,
    winner: result.winner,
    line,
    battle: result,
  }
  // On a draw the player holds their slot: they advance (slot a here).
  const playerWon = result.winner === null || result.winner === playerSlot.name
  if (playerWon && round === CUP_ROUNDS) {
    return {
      session: {
        ...session,
        playerVerdicts: [...session.playerVerdicts, verdict],
        nextPlayerRound: 0,
        nextOpponent: null,
        status: "champion",
        championName: playerSlot.name,
      },
      verdict,
    }
  }
  if (!playerWon) {
    return {
      session: {
        ...session,
        playerVerdicts: [...session.playerVerdicts, verdict],
        nextPlayerRound: 0,
        nextOpponent: null,
        status: "eliminated",
      },
      verdict,
    }
  }
  // Advanced to the next round: the player now meets the winner of the
  // opposing pairing (QF2's winner in the semifinal, SF2's in the final).
  const nextOpponent =
    round === 1
      ? session.rivalResolutions[0]?.winner
      : session.rivalResolutions[3]?.winner
  if (!nextOpponent) throw new Error("Missing rival winner for the next round")
  return {
    session: {
      ...session,
      playerVerdicts: [...session.playerVerdicts, verdict],
      nextPlayerRound: round + 1,
      nextOpponent,
    },
    verdict,
  }
}

/** Resolve the remaining rival pairings from `conqueror` to a champion
 * (live-cup spec: the bracket always plays out). Uses the same per-pairing
 * seeds as the pre-resolved subtree, so a finished bracket matches the
 * draw-stream goldens. Pure. */
function completeBracket(session: CupSession, conqueror: CupSlot): CupSession {
  const wins = session.playerVerdicts.filter(
    (v) => v.winner === session.bracket.slots[0]?.name,
  ).length
  const day = session.bracket.day
  const seedFor = (round: number, i: number): number =>
    cupMatchSeed(day, round, i)
  const completion: RoundVerdict[] = []
  // A player who lost the final (2 wins) left the SF2 winner as champion.
  if (wins >= CUP_ROUNDS - 1) {
    const champion =
      session.rivalResolutions[session.rivalResolutions.length - 1]?.winner
    return {
      ...session,
      completionVerdicts: completion,
      championName: champion?.name ?? null,
    }
  }
  let a: CupSlot = conqueror
  // The player lost the quarterfinal: their conqueror meets the QF2
  // winner in SF1 (pairing index 0 of round 2 — the player's branch feeds
  // the top half of the field).
  if (wins === 0) {
    const rival = session.rivalResolutions[0]?.winner
    if (!rival) throw new Error("Missing QF2 winner")
    const sf1 = resolvePairing(2, a, rival, seedFor(2, 0))
    completion.push(sf1.verdict)
    a = sf1.winner
  }
  const sf2Winner =
    session.rivalResolutions[session.rivalResolutions.length - 1]?.winner
  if (!sf2Winner) throw new Error("Missing SF2 winner")
  const final = resolvePairing(3, a, sf2Winner, seedFor(3, 0))
  completion.push(final.verdict)
  return {
    ...session,
    completionVerdicts: completion,
    championName: final.winner.name,
  }
}

/**
 * Resolve the remaining rival matches after the player's exit so the cup
 * crowns a champion (live-cup spec). Throws on a live session — the player
 * still has fights to play.
 */
export function completeCup(session: CupSession): CupSession {
  if (session.status !== "eliminated") {
    throw new Error("The player is still live in this cup")
  }
  const last = session.playerVerdicts[session.playerVerdicts.length - 1]
  if (!last) throw new Error("The player left without a verdict")
  const conqueror = session.bracket.slots.find((s) => s.name === last.slotB)
  if (!conqueror) throw new Error("Unknown conqueror slot")
  return completeBracket(session, conqueror)
}

/**
 * Forfeit the current round (the give-up modal, live-cup spec): the
 * opponent advances without a battle, the bracket auto-completes, and the
 * placement lands as-if-lost. Pure; throws when the player has no fight
 * pending.
 */
export function forfeitCup(session: CupSession): CupSession {
  if (session.status !== "player-turn") {
    throw new Error("The cup is not waiting on the player")
  }
  const round = session.nextPlayerRound
  const opponent = session.nextOpponent
  const playerSlot = session.bracket.slots[0]
  if (!opponent || !playerSlot) {
    throw new Error("The session has no pending player pairing")
  }
  const verdict: RoundVerdict = {
    round,
    slotA: playerSlot.name,
    slotB: opponent.name,
    winner: opponent.name,
    line: `${opponent.name} advances — ${playerSlot.name} forfeits the ${roundLabel(round)}.`,
    battle: null,
  }
  return completeBracket(
    {
      ...session,
      playerVerdicts: [...session.playerVerdicts, verdict],
      nextPlayerRound: 0,
      nextOpponent: null,
      status: "eliminated",
    },
    opponent,
  )
}

/** The player's placement from a finished session: champion 1, else by
 * rounds survived (QF exit 4, SF exit 3, final loss 2). Placement counts
 * rounds played rather than wins so a drawn verdict (double-KO, winner
 * null) that still advanced the player cannot under-place them. */
export function cupPlacement(session: CupSession): 1 | 2 | 3 | 4 {
  if (session.status === "champion") return 1
  const played = session.playerVerdicts.length
  return played >= CUP_ROUNDS ? 2 : played === 2 ? 3 : 4
}

/**
 * Which boss ids the player scalped in this session (silver_ladder_bosses_20261016,
 * FR9). The player scalps a boss by beating the boss' slot in one of their
 * own matches — rival-subtree verdicts (including the boss cutting through
 * the far half) never count. A forfeit verdict (null winner) scalps
 * nothing. Pure; empty when the bracket carries no boss.
 */
export function bossScalps(session: CupSession): string[] {
  const bossSlot = session.bracket.slots.find((slot) => slot.bossId)
  const bossId = bossSlot?.bossId
  if (!bossSlot || !bossId) return []
  const scalped = session.playerVerdicts.some(
    (verdict) =>
      verdict.winner !== null &&
      verdict.winner === verdict.slotA &&
      verdict.slotB === bossSlot.name,
  )
  return scalped ? [bossId] : []
}
