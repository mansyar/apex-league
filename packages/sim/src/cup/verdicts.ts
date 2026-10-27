/**
 * Cup pairing resolution (part of the cup, live-cup spec): one rival-vs-
 * rival pairing resolves into a verdict the client can replay.
 *
 * Everything here is pure and DOM-free. Authored bosses (slots carrying a
 * bossId) never lose the rival subtree — their pairings are walkovers, so
 * the player always meets the boss in the final.
 *
 * Split out of the former monolithic cup.ts (cup_module_refactor_20261018)
 * — pure relocation, no behavior change. Bracket construction lives in
 * ./bracket, the live session in ./session.
 */

import { type BattleResult, type BattleSide, resolveBattle } from "../battle"
import { rivalBranch, rivalKit } from "../battle/rival-kit"
import { getBoss } from "../bosses"
import { makeRng } from "../rng"
import { getSpecies } from "../species"
import type { CupSlot } from "./bracket"

/** The verdict of one pairing inside a cup round. */
export interface RoundVerdict {
  readonly round: number
  readonly slotA: string
  readonly slotB: string
  /** The winner's name, or null on a double-KO. */
  readonly winner: string | null
  /** One announcer line (product voice). */
  readonly line: string
  /** The full battle replay (live cup): the arena replays from these
   * events (spec FR5). Null only on a forfeit verdict — the round was
   * given away without a fight. */
  readonly battle: BattleResult | null
  /** The two sides that fought, in fight order, present exactly when
   * `battle` is present. The ghost bundle (cup/ghost) replays from these,
   * so a finished session already carries everything a later reader needs
   * without re-deriving kits from the bracket. */
  readonly sides?: readonly BattleSide[] | null
}

/** One pre-resolved rival pairing of the player-independent subtree: the
 * verdict for display, plus the slots that advance/exit (progression). */
export interface RivalResolution {
  readonly verdict: RoundVerdict
  readonly winner: CupSlot
  readonly loser: CupSlot
}

/**
 * The per-pairing battle seed for one cup matchup: a linear mix of the cup
 * day, the round number, and the pairing index inside that round.
 *
 * Every cup battle derives its seed here — the pre-resolved rival subtree,
 * the player's own matches, and the bracket completion all read this one
 * function, so a pairing's battle cannot silently change meaning because a
 * second copy of the formula drifted. Contract pinned in
 * cup-contracts.test.ts and the draw-stream goldens.
 */
export function cupMatchSeed(
  day: number,
  round: number,
  pairingIndex: number,
): number {
  return (day * 97 + round * 13 + pairingIndex * 7) >>> 0
}

/**
 * Assemble a BattleSide from a bracket slot. A boss slot (bossId set) fights
 * with its pinned kit and tactic straight from the registry (FR8) — no RNG
 * is spent on it; a generated rival rolls its tactic from the pairing seed
 * exactly as before. Exported for the boss-contract tests.
 */
export function battleSideForSlot(slot: CupSlot, seed: number): BattleSide {
  const species = getSpecies(slot.speciesId)
  if (!species) throw new Error(`Unknown species: ${slot.speciesId}`)
  if (slot.bossId) {
    const boss = getBoss(slot.bossId)
    if (!boss) throw new Error(`Unknown boss: ${slot.bossId}`)
    return {
      name: slot.name,
      element: species.element,
      stats: slot.stats,
      kit: boss.loadout,
      tactic: boss.tactic,
      temperament: species.temperament,
      branch: boss.branch,
    }
  }
  const rng = makeRng(seed ^ (slot.name.length * 31 + slot.speciesId.length))
  const TACTICS = ["balanced", "specials"] as const
  const tactic = TACTICS[rng.int(TACTICS.length)] ?? "balanced"
  return {
    name: slot.name,
    element: species.element,
    stats: slot.stats,
    kit: rivalKit(
      species,
      seed ^ (slot.name.length * 31 + slot.speciesId.length),
    ),
    tactic,
    temperament: species.temperament,
    // Derived here, at battle time, from the slot's own seeded profile:
    // brackets and sessions stay branch-free and their goldens unchanged.
    branch: rivalBranch(species, slot.stats),
    // Only the player's slot ever carries a secondary (rival slots are
    // built without one); omitted when absent so slots without a secondary
    // build byte-identical sides. The boss branch above never reads it.
    ...(slot.affinity ? { affinity: slot.affinity } : {}),
  }
}

/** Deterministic double-KO tiebreak by name: the fighter with the higher
 * remaining HP advances; an exact tie (or a missing finalHp entry, treated as
 * 0) falls to the earlier slot in field order. Pure — the verdict line still
 * reports the draw; only bracket advancement is decided here.
 *
 * Name-level because the bracket screen must render the same advancement from
 * a stored verdict, and a verdict carries names plus finalHp, not slots.
 * {@link doubleKoWinner} is this rule over slot objects. */
export function doubleKoAdvancingName(
  a: string,
  b: string,
  finalHp: Readonly<Record<string, number>>,
): string {
  return (finalHp[b] ?? 0) > (finalHp[a] ?? 0) ? b : a
}

/** {@link doubleKoAdvancingName} over the pair's bracket slots. */
export function doubleKoWinner(
  a: CupSlot,
  b: CupSlot,
  finalHp: Readonly<Record<string, number>>,
): CupSlot {
  return doubleKoAdvancingName(a.name, b.name, finalHp) === a.name ? a : b
}

/** Resolve one rival-vs-rival pairing into a verdict (pure). The player's
 * own matches resolve through resolvePlayerMatch instead — the coaching
 * room's picks never ride the bracket resolver.
 *
 * Authored bosses (slots carrying a bossId) never lose the rival subtree:
 * the whole point of the substitution is that the player faces the boss in
 * the final, so a boss pairing is a walkover — the boss advances without a
 * battle. This reads no RNG (battle seeds fold day/round/pairing only, and
 * the bracket draw stream was consumed long before this point), so the
 * stream invariant is untouched. */
export function resolvePairing(
  round: number,
  a: CupSlot,
  b: CupSlot,
  seed: number,
): { verdict: RoundVerdict; winner: CupSlot; loser: CupSlot } {
  const bossSlot = a.bossId ? a : b.bossId ? b : null
  if (bossSlot) {
    const boss = bossSlot.bossId ? getBoss(bossSlot.bossId) : undefined
    if (!boss) throw new Error(`Unknown boss id: ${bossSlot.bossId}`)
    return {
      verdict: {
        round,
        slotA: a.name,
        slotB: b.name,
        winner: bossSlot.name,
        line: `${boss.name} takes the ${roundLabel(round)}!`,
        battle: null,
      },
      winner: bossSlot,
      loser: bossSlot === a ? b : a,
    }
  }
  const aSide = battleSideForSlot(a, seed)
  const bSide = battleSideForSlot(b, seed ^ 1)
  const result: BattleResult = resolveBattle(aSide, bSide, seed)
  const line = result.winner
    ? `${result.winner} takes the ${roundLabel(round)}!`
    : `Both fighters are down — the ${roundLabel(round)} is a draw.`
  const winnerSlot = result.winner === a.name ? a : b
  // On a draw (double-ko) the verdict still reads "draw", but the bracket
  // must keep shrinking: the slot with the higher remaining HP advances
  // (exact tie → the earlier slot). See doubleKoWinner.
  const advancing = result.winner
    ? winnerSlot
    : doubleKoWinner(a, b, result.finalHp)
  return {
    verdict: {
      round,
      slotA: a.name,
      slotB: b.name,
      winner: result.winner,
      line,
      battle: result,
      sides: [aSide, bSide],
    },
    winner: advancing,
    loser: advancing === a ? b : a,
  }
}

export function roundLabel(round: number): string {
  return ["Quarterfinal", "Semifinal", "Final"][round - 1] ?? `Round ${round}`
}
