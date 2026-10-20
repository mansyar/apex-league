/**
 * Paths page (branching_evolution_champion_forms FR-11): teaches the two
 * champion leans, the pre-gate read in the Growth panel, the signature move,
 * and the legacy exception. Every label and every move name comes from the
 * sim's own branch catalog, so the page never drifts from the math the ranch
 * uses. Direction-only by design: no gate days, no thresholds, nothing the
 * player is meant to discover in play.
 */

import { BRANCHES, type BranchDef, getMove } from "@apex/sim"
import { statLabel } from "../hud/copy-care"
import { ruleRow, subhead, tip } from "./common"

/** The catalog's offense lean (atk + spd) and defense lean (hp + def). */
const OFFENSE = BRANCHES.find((branch) => branch.favors.includes("atk"))
const DEFENSE = BRANCHES.find((branch) => branch.favors.includes("hp"))

/** "ATK + SPD", read from whichever form carries that lean. */
function leanLabel(branch: BranchDef | undefined): string {
  if (!branch) return ""
  return branch.favors.map(statLabel).join(" + ")
}

/** The signature's display name, or the honest legacy answer. */
function signatureLabel(branch: BranchDef): string {
  if (!branch.signatureMove) return "No signature move"
  return getMove(branch.signatureMove)?.displayName ?? branch.signatureMove
}

export function buildPaths(panel: HTMLElement): void {
  panel.append(
    tip("Every partner leans one of two ways, and training decides which."),
  )
  panel.append(
    ruleRow(
      leanLabel(OFFENSE),
      "Strike first and keep the pace; the fight ends before it settles.",
    ),
  )
  panel.append(
    ruleRow(
      leanLabel(DEFENSE),
      "Plant your feet and stand firm; the other side tires first.",
    ),
  )
  panel.append(
    tip(
      "Training marks decide the lean; when they are level, the stats your partner rolled at birth pick it.",
    ),
  )

  panel.append(subhead("The early read"))
  panel.append(
    tip(
      "The Growth panel shows the lean as a direction only — the form itself arrives on its own morning.",
    ),
  )

  panel.append(subhead("Signature moves"))
  panel.append(
    tip(
      "Each form teaches one signature move, and the default four never include it.",
    ),
  )
  for (const branch of BRANCHES) {
    panel.append(
      ruleRow(
        branch.label,
        `${signatureLabel(branch)} — the special this form teaches.`,
      ),
    )
  }

  panel.append(subhead("Old lines"))
  panel.append(
    tip(
      "A partner carried from an older save keeps its old numbers and gains no signature move.",
    ),
  )
}
