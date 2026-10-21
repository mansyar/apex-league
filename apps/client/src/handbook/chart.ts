/**
 * The 6×6 matchup page: attacker rows, defender columns, every cell read from
 * the sim's `typeFactor`, so the chart cannot drift from the battle math.
 */

import { type Element, typeFactor } from "@apex/sim"
import { crestGlyph, elementHue } from "../element"
import { appendGlyph, ELEMENT_LABELS, subhead, tip } from "./common"

/** Chart order: the guideline's fixed type hues, in broadcast order. */
const CHART_ELEMENTS: Element[] = [
  "fire",
  "plant",
  "water",
  "electric",
  "earth",
  "wind",
]

/** Population note copy — states today's roster without promising dates. */
const POPULATION_NOTE =
  "Fire, Plant, and Water partners roam the league today. Electric, " +
  "Earth, and Wind matchups are charted and waiting for their species."

function chartHead(tag: "rowheader" | "columnheader"): HTMLElement {
  const head = document.createElement("span")
  head.className = "handbook-chart-head"
  head.setAttribute("role", tag)
  return head
}

export function buildTypeChart(panel: HTMLElement): void {
  const grid = document.createElement("div")
  grid.className = "handbook-chart"
  grid.setAttribute("role", "table")
  grid.setAttribute("aria-label", "Type matchups")
  // Header row: attack-direction legend + defender crests.
  const headRow = document.createElement("div")
  headRow.className = "handbook-chart-row"
  headRow.setAttribute("role", "row")
  const corner = document.createElement("span")
  corner.className = "handbook-chart-corner"
  corner.setAttribute("role", "columnheader")
  corner.textContent = "↓ into"
  headRow.append(corner)
  for (const def of CHART_ELEMENTS) {
    const head = chartHead("columnheader")
    head.title = ELEMENT_LABELS[def] ?? def
    appendGlyph(head, crestGlyph(def))
    head.style.color = `hsl(${elementHue(def)} 70% 62%)`
    headRow.append(head)
  }
  grid.append(headRow)
  for (const atk of CHART_ELEMENTS) {
    const row = document.createElement("div")
    row.className = "handbook-chart-row"
    row.setAttribute("role", "row")
    const rowHead = chartHead("rowheader")
    rowHead.title = ELEMENT_LABELS[atk] ?? atk
    appendGlyph(rowHead, crestGlyph(atk))
    rowHead.style.color = `hsl(${elementHue(atk)} 70% 62%)`
    row.append(rowHead)
    const attack = ELEMENT_LABELS[atk] ?? atk
    for (const def of CHART_ELEMENTS) {
      const cell = document.createElement("span")
      cell.className = "handbook-chart-cell"
      const factor = typeFactor(atk, def)
      const defend = ELEMENT_LABELS[def] ?? def
      if (factor.num > factor.den) {
        cell.classList.add("is-strong")
        cell.textContent = "3/2"
        cell.setAttribute(
          "aria-label",
          `${attack} into ${defend}: strong, 3 over 2`,
        )
      } else if (factor.num < factor.den) {
        cell.classList.add("is-weak")
        cell.textContent = "2/3"
        cell.setAttribute(
          "aria-label",
          `${attack} into ${defend}: resisted, 2 over 3`,
        )
      } else {
        cell.textContent = "·"
        cell.setAttribute("aria-label", `${attack} into ${defend}: even`)
      }
      row.append(cell)
    }
    grid.append(row)
  }
  panel.append(grid)
  const note = document.createElement("p")
  note.className = "handbook-note"
  note.textContent = POPULATION_NOTE
  panel.append(note)

  // FR-6: the chart reads the primary type only — the secondary affinity's
  // cancel rule is spelled out here so this page stays the single place the
  // matchup math is explained.
  panel.append(subhead("Secondary affinities"))
  panel.append(
    tip(
      "Some partners hatch with a secondary type alongside their own — the chart above reads the primary only.",
    ),
  )
  panel.append(
    tip(
      "When an attack is strong into the primary but the secondary resists it, the two cancel and the hit lands even.",
    ),
  )
}
