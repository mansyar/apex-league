/**
 * Move pool page: six moves per starter element, gated by the sim's
 * `requiredTierDays`. Rows come from `species.kit`, so the table and the
 * picker cannot disagree.
 */

import { getMove, requiredTierDays, STARTER_SPECIES } from "@apex/sim"
import { ELEMENT_LABELS, tip } from "./common"

/** What opens a move: the gate is the sim's, phrased for a coach. */
function gateCopy(index: number): string {
  const days = requiredTierDays(index, "baby")
  if (days === 0) return "From birth"
  if (index === 2) return `${days} trained days, or evolution`
  return `${days} trained days`
}

export function buildMoves(panel: HTMLElement): void {
  panel.append(
    tip(
      "Each partner knows six moves and can equip four of them. Swapping is free and legal any time outside a cup match.",
    ),
  )
  for (const species of STARTER_SPECIES) {
    const head = document.createElement("h3")
    head.className = "handbook-moves-head"
    head.textContent = `${ELEMENT_LABELS[species.element] ?? species.element} · ${species.displayName}`
    panel.append(head)
    const table = document.createElement("div")
    table.className = "handbook-moves"
    table.setAttribute("role", "table")
    table.setAttribute("aria-label", `${species.displayName} move pool`)
    for (const [index, id] of species.kit.entries()) {
      const move = getMove(id)
      if (!move) continue
      const row = document.createElement("div")
      row.className = "handbook-move"
      row.setAttribute("role", "row")
      const name = document.createElement("span")
      name.setAttribute("role", "cell")
      name.className = "handbook-move-name"
      name.textContent = move.displayName
      const stats = document.createElement("span")
      stats.setAttribute("role", "cell")
      stats.className = "handbook-move-stats"
      stats.textContent = `PWR ${move.power} · ACC ${move.accuracy}% · CD ${move.cooldown}`
      const gate = document.createElement("span")
      gate.setAttribute("role", "cell")
      gate.className = "handbook-move-gate"
      gate.textContent = gateCopy(index)
      row.append(name, stats, gate)
      table.append(row)
    }
    panel.append(table)
  }
}
