/**
 * Spar setup copy (spar_modules split): the temperament lines and the two
 * tactic buttons' labels and previews. Moved verbatim out of spar.ts.
 */

import type { SpeciesDef, Tactic } from "@apex/sim"

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
