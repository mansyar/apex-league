/**
 * The legacy surfaces' contracts (graduation_modules split): the host handler
 * object and the flow handle the app talks to. Same names and signatures as
 * when they lived in graduation.ts, which still re-exports both.
 */

import type { GameState, GraduatePairReason } from "@apex/sim"

/**
 * What the player picked on the egg screen: a starter species, or a pet that
 * is already waiting in the stable (stable & partner reserve FR-8). The two
 * are different kinds of choice — a fresh hatch against a pet the player
 * already owns.
 */
export type EggChoice =
  | { kind: "species"; speciesId: string }
  | { kind: "stable"; creatureId: string }

export interface GraduationHandlers {
  /** The player confirmed the send-off; main plays the ceremony + opens the
   * egg screen. */
  onConfirm: () => void
  /** The player chose the next creature: a starter species or a stashed pet. */
  onPick: (choice: EggChoice) => void
  /** The player hatched a dual-parent egg in the Nursery. */
  onHatch: (generations: number[], speciesId: string, seed: number) => void
}

export interface GraduationFlow {
  /** Open the confirm modal ("start the send-off?"). */
  openConfirm(state: GameState): void
  /** Open the egg screen (choose the successor, floor previewed). */
  showEggScreen(state: GameState): void
  /** Open the Nursery (pair two Hall records, preview the seeded hatch). */
  showNursery(state: GameState): void
  /** Explain a rejected hatch in the open Nursery; nothing commits. */
  rejectHatch(reason: GraduatePairReason): void
  /** Open the Hall of Fame panel. */
  openHallOfFame(state: GameState): void
  /** Mirror live state into any open surface (family name / records). */
  update(state: GameState): void
  /** Close every surface. */
  close(): void
}
