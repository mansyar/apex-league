/**
 * Spar setup copy (spar_modules split): the temperament lines and the two
 * tactic buttons' labels and previews. Moved verbatim out of spar.ts.
 */

import type { DoctrineId, SpeciesDef, Tactic } from "@apex/sim"

/** FR6 temperament lines, coach-side. */
export const TEMPERAMENT_LINES: Record<SpeciesDef["temperament"], string> = {
  rush: "Rushes in. May ignore a cautious plan.",
  slow: "Slow to start.",
  obedient: "Follows the tactic.",
}

/** One-line previews shown on the tactic buttons before the whistle (FR11).
 * Copy describes the revised FR6 behavior: Balanced now also fires specials
 * whose sustained damage beats the innate Strike, and Favor Specials falls
 * back to the Strike only when the kit cannot out-damage it. */
export const TACTIC_PREVIEWS: Record<Tactic, string> = {
  balanced:
    "Closes in and strikes. Saves specials for a type advantage, a finisher, or when the kit out-damages the Strike.",
  specials:
    "Fires the kit's best sustained special. Closes or Strikes only when nothing out-damages the Strike.",
}

export const TACTIC_LABELS: Record<Tactic, string> = {
  balanced: "Balanced",
  specials: "Favor Specials",
}

/** The four positioning doctrines, named the way the HUD names them. */
export const DOCTRINE_LABELS: Record<DoctrineId, string> = {
  press: "Press",
  circle: "Circle",
  kite: "Kite",
  counter: "Counter",
}

/** One line per doctrine, shown before the whistle (FR-11). */
export const DOCTRINE_PREVIEWS: Record<DoctrineId, string> = {
  press: "Walks them down, stays on the front foot, barely circles.",
  circle: "Circles hard and hunts the rear arc.",
  kite: "Holds long range, backs off below its band, dodges often.",
  counter: "Holds mid range, waits out startup, punishes recovery.",
}

/**
 * The ghost bout's intro (ghost_data_async_rivals FR-5): the champion's name
 * answers from the board, and one clause says the bout is free — no stakes,
 * nothing saved.
 */
export function ghostBoutIntro(champion: string): string {
  return `${champion} answers from the board. A free bout — nothing saved.`
}
