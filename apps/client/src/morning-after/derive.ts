/**
 * The morning-after outcome classifier (FR-1): a finalized cup session plus
 * the pre-finalize and post-finalize game states derive the outcome class,
 * the gatekeeper boss id, and the persisted-first amplifiers.
 *
 * Pure and DOM-free: it reads session facts and snapshot pairs only. The
 * facts it banks on (verified against the sim):
 *
 * - A completed session ends `champion` or `eliminated` with a champion
 *   crowned; the title follows the session's status, not the placement, so
 *   a drawn final (double KO) still crowns per the existing results rule.
 * - The machine's forfeit fact (machine.ts): the last `playerVerdict`
 *   replays no battle. A forfeit overrides every other class.
 * - The eliminating final opponent is a session verdict fact, not a
 *   placement depth: an authored gatekeeper boss carries a `bossId` on its
 *   bracket slot.
 * - Placement is not persisted — it is never read, and never mistaken for
 *   a milestone (FR-1/FR-4).
 */

import type { CupSession, GameState } from "@apex/sim"
import { type Amplifier, milestoneAmplifiers } from "./milestones"

/** The four outcome classes of the morning-after ritual (FR-1). */
export type MorningAfterClass = "title" | "gatekeep" | "exit" | "withdrawn"

/** Everything the ritual day needs from a cup finalize: the outcome class,
 * the boss id when a gatekeeper stands in the elimination, and the
 * persisted-first amplifiers the finalize crossed (FR-4). */
export interface MorningAfterDerivation {
  readonly class: MorningAfterClass
  readonly amplifiers: readonly Amplifier[]
  /** The authored boss' registry id for a `gatekeep` elimination; null
   * otherwise. */
  readonly bossId: string | null
}

/**
 * Derive the morning-after outcome from a finalized cup session and the
 * state snapshots around its finalize (FR-1, FR-4).
 *
 * The caller invokes this only with the session that just finalized; the
 * defensive null answers non-cup input: a null session, a still-live
 * session, or a bracket that never completed (no champion). Pure; no
 * randomness anywhere (NFR-5).
 */
export function deriveMorningAfter(
  session: CupSession | null,
  preState: GameState,
  postState: GameState,
): MorningAfterDerivation | null {
  if (
    !session ||
    session.status === "player-turn" ||
    session.championName === null
  ) {
    return null
  }
  // Forfeit (machine.ts's exact fact: the last verdict replays no battle)
  // overrides every other class.
  if (session.playerVerdicts.at(-1)?.battle === null) {
    return {
      class: "withdrawn",
      amplifiers: amplifiers(preState, postState),
      bossId: null,
    }
  }
  if (session.status === "champion") {
    return {
      class: "title",
      amplifiers: amplifiers(preState, postState),
      bossId: null,
    }
  }
  // The final match's opponent is the player's last verdict's slotB; a
  // bracket slot carrying a bossId is an authored gatekeeper boss.
  const rival = session.bracket.slots.find(
    (slot) => slot.name === session.playerVerdicts.at(-1)?.slotB,
  )
  if (rival?.bossId) {
    return {
      class: "gatekeep",
      amplifiers: amplifiers(preState, postState),
      bossId: rival.bossId,
    }
  }
  return {
    class: "exit",
    amplifiers: amplifiers(preState, postState),
    bossId: null,
  }
}

/** The persisted-first milestones this finalize crossed (FR-4), composed
 * once so every class branch reports the same detection pass. */
function amplifiers(preState: GameState, postState: GameState): Amplifier[] {
  return milestoneAmplifiers(preState, postState)
}
