/**
 * Coach's Handbook (coach_knowledge_20261016): one ranch-only modal with
 * three tabs — the type chart, the ladder rules, and raising guidance.
 * The chart is derived from the sim's own `typeFactor`, so the handbook
 * can never drift from the matchup math the battles actually use. Ladder
 * copy states current truth (four tiers — Bronze, Silver, Gold, and the
 * Legend plateau — with the Legend gate as the capstone). Guidance stays
 * direction-only — evolution is discovered in play, not spoiled on a page
 * (product guideline).
 */

import { type Element, typeFactor } from "@apex/sim"
import { focusTrap } from "./battleUI"
import { crestGlyph, elementHue } from "./element"

const ELEMENT_LABELS: Record<string, string> = {
  fire: "Fire",
  plant: "Plant",
  water: "Water",
  electric: "Electric",
  earth: "Earth",
  wind: "Wind",
}

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

/** Ladder rules copy — current truth (four tiers, Legend is the plateau). */
const LADDER_RULES: ReadonlyArray<readonly [string, string]> = [
  ["Cup points", "Champion 3 · Runner-up 2 · Semifinal 1."],
  [
    "Bronze",
    "III → II at 6 points, → I at 12. Bank past 12 and your next cup is the Promotion Cup — win it to jump to Silver.",
  ],
  [
    "Silver",
    "III → II at 18 points, → I at 24. Bank past 24 and your next cup is the Promotion Cup — win it to jump to Gold.",
  ],
  [
    "Gold",
    "III → II at 30 points, → I at 36. Bank past 36 and the Legend gate opens.",
  ],
  [
    "The plateau",
    "Legend has no ceiling. A Legend cup win stacks extra action points and collects a title for the rank plate.",
  ],
]

/** Raising guidance: direction-only coach voice, nothing spoiled. */
const RAISING_GUIDANCE: ReadonlyArray<string> = [
  "A healthy partner trains better — watch Energy and Health before a session.",
  "Training adds up: every session leaves a mark your partner keeps for life.",
  "Strong bonds carry on — a graduated partner leaves an inheritance floor for the next egg.",
  "Evolution comes with time and cups. Watch for the coach's hints.",
]

/** Tab descriptors: label + panel builder. */
type HandbookTab = {
  label: string
  build: (panel: HTMLElement) => void
}

/**
 * Append a trusted, static glyph SVG without assigning innerHTML on a
 * live element — template parsing keeps the same trusted-source contract
 * with a narrower blast radius.
 */
function appendGlyph(target: HTMLElement, svg: string): void {
  const template = document.createElement("template")
  template.innerHTML = svg
  target.append(template.content)
}

/** The 6×6 matchup grid: attacker rows, defender columns, sim-sourced. */
function buildTypeChart(panel: HTMLElement): void {
  const grid = document.createElement("div")
  grid.className = "handbook-chart"
  grid.setAttribute("role", "table")
  grid.setAttribute("aria-label", "Type matchups")
  // Header row: attack-direction legend + defender crests.
  const headRow = document.createElement("div")
  headRow.className = "handbook-chart-row"
  headRow.setAttribute("role", "row")
  // Corner cell: attack direction legend.
  const corner = document.createElement("span")
  corner.className = "handbook-chart-corner"
  corner.setAttribute("role", "columnheader")
  corner.textContent = "↓ into"
  headRow.append(corner)
  for (const def of CHART_ELEMENTS) {
    const head = document.createElement("span")
    head.className = "handbook-chart-head"
    head.setAttribute("role", "columnheader")
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
    const rowHead = document.createElement("span")
    rowHead.className = "handbook-chart-head"
    rowHead.setAttribute("role", "rowheader")
    rowHead.title = ELEMENT_LABELS[atk] ?? atk
    appendGlyph(rowHead, crestGlyph(atk))
    rowHead.style.color = `hsl(${elementHue(atk)} 70% 62%)`
    row.append(rowHead)
    for (const def of CHART_ELEMENTS) {
      const cell = document.createElement("span")
      cell.className = "handbook-chart-cell"
      const factor = typeFactor(atk, def)
      if (factor.num > factor.den) {
        cell.classList.add("is-strong")
        cell.textContent = "3/2"
        cell.setAttribute(
          "aria-label",
          `${ELEMENT_LABELS[atk] ?? atk} into ${ELEMENT_LABELS[def] ?? def}: strong, 3 over 2`,
        )
      } else if (factor.num < factor.den) {
        cell.classList.add("is-weak")
        cell.textContent = "2/3"
        cell.setAttribute(
          "aria-label",
          `${ELEMENT_LABELS[atk] ?? atk} into ${ELEMENT_LABELS[def] ?? def}: resisted, 2 over 3`,
        )
      } else {
        cell.textContent = "·"
        cell.setAttribute(
          "aria-label",
          `${ELEMENT_LABELS[atk] ?? atk} into ${ELEMENT_LABELS[def] ?? def}: even`,
        )
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
}

function buildLadderRules(panel: HTMLElement): void {
  for (const [term, copy] of LADDER_RULES) {
    const row = document.createElement("div")
    row.className = "handbook-rule"
    const head = document.createElement("span")
    head.className = "handbook-rule-term"
    head.textContent = term
    const text = document.createElement("span")
    text.className = "handbook-rule-copy"
    text.textContent = copy
    row.append(head, text)
    panel.append(row)
  }
}

function buildRaising(panel: HTMLElement): void {
  for (const line of RAISING_GUIDANCE) {
    const row = document.createElement("p")
    row.className = "handbook-tip"
    row.textContent = line
    panel.append(row)
  }
}

const TABS: ReadonlyArray<HandbookTab> = [
  { label: "Type chart", build: buildTypeChart },
  { label: "Ladder rules", build: buildLadderRules },
  { label: "Raising", build: buildRaising },
]

export interface HandbookRefs {
  root: HTMLElement
  /** Show the handbook (focus lands on the open tab). */
  open: () => void
}

/**
 * Build the handbook modal. Hidden until open(); Escape, the backdrop,
 * and the footer button all close it, restoring focus to the opener.
 * Tabs use role=tablist/tab/tabpanel with arrow-key movement.
 */
export function buildHandbook(): HandbookRefs {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Coach's Handbook")
  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box handbook-box"
  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  title.textContent = "Coach's Handbook"

  const tablist = document.createElement("div")
  tablist.className = "handbook-tabs"
  tablist.setAttribute("role", "tablist")
  tablist.setAttribute("aria-label", "Handbook sections")
  const panels: Array<HTMLElement> = []
  const tabButtons: Array<HTMLButtonElement> = []
  TABS.forEach((tab, index) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "kit-tab handbook-tab"
    if (index !== 0) button.classList.add("is-outline")
    button.setAttribute("role", "tab")
    button.textContent = tab.label
    button.id = `handbook-tab-${index}`
    button.addEventListener("click", () => select(index))
    tablist.append(button)
    tabButtons.push(button)

    const panel = document.createElement("div")
    panel.className = "handbook-panel"
    panel.setAttribute("role", "tabpanel")
    panel.setAttribute("aria-labelledby", button.id)
    panel.hidden = index !== 0
    tab.build(panel)
    panels.push(panel)
  })

  function select(index: number): void {
    tabButtons.forEach((button, i) => {
      const active = i === index
      button.setAttribute("aria-selected", active ? "true" : "false")
      button.classList.toggle("is-outline", !active)
      button.tabIndex = active ? 0 : -1
      const panel = panels[i]
      if (panel) panel.hidden = !active
    })
    tabButtons[index]?.focus()
  }

  // Arrow keys move between tabs, matching the tablist contract.
  tablist.addEventListener("keydown", (event) => {
    const current = tabButtons.findIndex(
      (button) => button.getAttribute("aria-selected") === "true",
    )
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const step = event.key === "ArrowRight" ? 1 : -1
      select((current + step + TABS.length) % TABS.length)
      event.preventDefault()
    }
  })

  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const close = document.createElement("button")
  close.className = "kit-button"
  close.type = "button"
  close.textContent = "Back to the ranch"
  actions.append(close)

  let opener: HTMLElement | null = null
  const closeNow = (): void => {
    root.style.display = "none"
    if (opener?.isConnected) opener.focus()
    opener = null
  }
  close.addEventListener("click", closeNow)
  const trapFocus = focusTrap(box)
  root.addEventListener("keydown", (event) => {
    trapFocus(event)
    if (event.key === "Escape") {
      event.stopPropagation()
      closeNow()
    }
  })
  root.addEventListener("click", (event) => {
    if (event.target === root) closeNow()
  })

  box.append(title, tablist, ...panels, actions)
  root.append(box)
  return {
    root,
    open: () => {
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      select(0)
      root.style.display = ""
      close.focus()
    },
  }
}
