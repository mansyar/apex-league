/**
 * Coach's Handbook (coach_knowledge_20261016): one ranch-only modal with
 * five tabs — the type chart, the ladder rules, the move pool, raising, and
 * the champion paths. Every page is derived from the sim (type factors,
 * starter kits, tier gates, the training catalog, the form model, and the
 * branch catalog), so the handbook can never drift from the math the game
 * actually uses. Guidance stays direction-only — evolution is discovered in
 * play, not spoiled on a page (product guideline). Page builders live under
 * `handbook/`; this file owns tab order and shell.
 */

import { focusTrap } from "./battleUI"
import { buildTypeChart } from "./handbook/chart"
import { buildLadderRules } from "./handbook/ladder"
import { buildMoves } from "./handbook/moves"
import { buildPaths } from "./handbook/paths"
import { buildRaising } from "./handbook/raising"
import { createTabs, type TabSpec } from "./ui/tabs"

const TABS: TabSpec[] = [
  { label: "Type chart", build: buildTypeChart },
  { label: "Ladder rules", build: buildLadderRules },
  { label: "Moves", build: buildMoves },
  { label: "Raising", build: buildRaising },
  { label: "Paths", build: buildPaths },
]

export interface HandbookRefs {
  root: HTMLElement
  /** Show the handbook (focus lands on the open tab). */
  open: () => void
}

/**
 * Build the handbook modal. Hidden until open(); Escape, the backdrop,
 * and the footer button all close it, restoring focus to the opener.
 * The tab strip is the client's shared tab controller.
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

  const { tablist, panels, select } = createTabs({
    ariaLabel: "Handbook sections",
    idPrefix: "handbook",
    tabs: TABS,
  })
  // The controller owns the semantics; the handbook names its own skin.
  tablist.classList.add("handbook-tabs")
  for (const button of tablist.children) {
    button.classList.add("kit-tab", "handbook-tab")
  }
  for (const panel of panels) panel.classList.add("handbook-panel")

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
