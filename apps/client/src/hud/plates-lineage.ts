import { type GameState, lineagePrestige } from "@apex/sim"
import { icons } from "../ui/icons"
import { chip, tab } from "../ui/kit"
import { familyName } from "./copy"
import { lineageMeta } from "./ladder-read"
import type { HudViewState } from "./types"

/** The lineage-plate elements the daily update writes into. */
export interface LineagePlateRefs {
  root: HTMLElement
  /** The always-visible summary row: toggles the detail, never navigates. */
  summary: HTMLButtonElement
  familyEl: HTMLElement
  /** The collapsible detail: counters plus the Hall of Fame opener. */
  detail: HTMLElement
  metaEl: HTMLElement
  hallButton: HTMLButtonElement
}

/**
 * Top-left lineage plate (legacy track): the family name with its
 * generation numeral stays visible, and the bloodline counters plus the
 * Hall of Fame opener fold behind the summary. One surface, two controls —
 * a nested button would be invalid, so the root is a section and the
 * summary and the Hall button are siblings.
 */
export function buildLineagePlate(): LineagePlateRefs {
  const root = document.createElement("section")
  root.className = "kit-plate hud-lineage"
  root.setAttribute("aria-label", "Lineage")
  const summary = document.createElement("button")
  summary.type = "button"
  summary.className = "lineage-summary"
  summary.setAttribute("aria-expanded", "false")
  summary.setAttribute("aria-controls", "lineage-detail")
  const tagEl = tab("Lineage", "outline")
  const familyEl = document.createElement("span")
  familyEl.className = "lineage-family"
  const chev = document.createElement("span")
  chev.className = "collapse-chev"
  chev.innerHTML = icons.chevron
  summary.append(tagEl, familyEl, chev)
  const detail = document.createElement("div")
  detail.className = "lineage-detail is-hidden"
  detail.id = "lineage-detail"
  const metaEl = document.createElement("span")
  metaEl.className = "lineage-meta"
  const hallButton = chip({ label: "Hall of Fame", variant: "dim" })
  hallButton.classList.add("lineage-hall")
  detail.append(metaEl, hallButton)
  root.append(summary, detail)
  return { root, summary, familyEl, detail, metaEl, hallButton }
}

/**
 * Wire the summary toggle, the detail Escape discipline, and the Hall of
 * Fame opener. State lives on the HUD view next to the other collapse
 * states; `onFoldChange` fires after every user-driven fold so an open
 * overflow panel can re-seat below the plate's new height.
 */
export function wireLineage(
  lineage: LineagePlateRefs,
  view: HudViewState,
  onOpenHallOfFame: () => void,
  onFoldChange?: () => void,
): void {
  const apply = (userDriven: boolean): void => {
    lineage.summary.setAttribute("aria-expanded", String(view.lineageOpen))
    lineage.detail.classList.toggle("is-hidden", !view.lineageOpen)
    if (userDriven) onFoldChange?.()
  }
  lineage.summary.addEventListener("click", () => {
    view.lineageOpen = !view.lineageOpen
    apply(true)
  })
  lineage.detail.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      view.lineageOpen = false
      apply(true)
      lineage.summary.focus()
    }
  })
  lineage.hallButton.addEventListener("click", onOpenHallOfFame)
  // Unhiding the plate (pre-starter → partner) restarts its settle
  // animation; the open panel re-seats when the plate lands, so the
  // measured seat never catches the mid-flight translated rect.
  lineage.root.addEventListener("animationend", () => onFoldChange?.())
  apply(false)
}

/**
 * Paint the family name plus the bloodline counters, and fold the detail to
 * the view's collapse state — so a re-render never pops the detail the
 * player just shut. Legacy (v10): the plate mirrors the bloodline.
 */
export function paintLineage(
  lineage: LineagePlateRefs,
  state: GameState,
  lineageOpen: boolean,
): void {
  const creature = state.creature
  if (!creature) return
  lineage.familyEl.textContent = familyName(
    creature.name,
    state.lineage.generation,
  )
  lineage.metaEl.textContent = lineageMeta(
    state.lineage.generation,
    lineagePrestige(state),
    state.cupsWon,
  )
  lineage.summary.setAttribute("aria-expanded", String(lineageOpen))
  lineage.detail.classList.toggle("is-hidden", !lineageOpen)
}
