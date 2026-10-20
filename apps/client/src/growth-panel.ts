/**
 * Growth panel DOM (evolution_discovery_20261020). The view-model owns the
 * gate rules and the copy; this module stamps that into nodes and owns the one
 * seam that repaints in place, so a gate unlocked while the panel is open
 * refreshes without a reopen (FR-7) and a closed panel costs nothing (AC-7).
 *
 * Split out of `creature-detail.ts` so both modules stay under the 12 KB cap
 * (NFR-2), and shaped so the repaint contract is testable without a DOM: the
 * host only ever touches the node it is handed.
 */
import type { GameState } from "@apex/sim"
import { type GrowthRow, type GrowthView, growthView } from "./growth"
import type { BranchPathRead } from "./hud/copy-branch"

/**
 * Met/unmet glyphs. The shapes differ on their own, so colour is only ever
 * reinforcement (evolution_discovery_20261020 AC-9).
 */
const GROWTH_GLYPH = { met: "✓", unmet: "○" } as const

export interface GrowthRowParts {
  label: string
  glyph: string
  /** Spoken status word — the text half of the glyph/word pair. */
  status: string
  detail: string
}

/**
 * One Growth row split into its four readings, for the DOM builder and for
 * tests that have no DOM: "Mood", a met/unmet glyph, "Met"/"Not yet", and
 * the view-model's detail ("35 / 40" once revealed).
 */
export function growthRowParts(row: GrowthRow): GrowthRowParts {
  return {
    label: row.label,
    glyph: GROWTH_GLYPH[row.met ? "met" : "unmet"],
    status: row.met ? "Met" : "Not yet",
    detail: row.detail,
  }
}

/** One Growth row: label, glyph, hidden status word, then the detail. */
function growthRowNode(row: GrowthRow): HTMLElement {
  const parts = growthRowParts(row)
  const node = document.createElement("div")
  node.className = "detail-growth-row"
  node.dataset.met = row.met ? "true" : "false"
  const label = document.createElement("span")
  label.className = "detail-growth-label"
  label.textContent = parts.label
  const glyph = document.createElement("span")
  glyph.className = "detail-growth-glyph"
  glyph.textContent = parts.glyph
  glyph.setAttribute("aria-hidden", "true")
  const status = document.createElement("span")
  status.className = "detail-growth-status kit-sr-only"
  status.textContent = parts.status
  const detail = document.createElement("span")
  detail.className = "detail-growth-detail"
  detail.textContent = parts.detail
  node.append(label, glyph, status, detail)
  return node
}

/**
 * The day-5 lean preview, or the earned form once a gate has resolved
 * (FR-6): a title, the form label, and one qualifier line, tinted with the
 * branch accent. Text carries everything; the hue is reinforcement only.
 */
function pathRow(path: BranchPathRead): HTMLElement {
  const row = document.createElement("div")
  row.className = "detail-growth-path"
  row.dataset.preview = path.preview ? "true" : "false"
  row.setAttribute("style", `--hue: ${path.hue}`)
  const title = document.createElement("span")
  title.className = "detail-growth-path-title"
  title.textContent = path.title
  const label = document.createElement("span")
  label.className = "detail-growth-path-label"
  label.textContent = path.label
  const line = document.createElement("span")
  line.className = "detail-growth-path-line"
  line.textContent = path.line
  row.append(title, label, line)
  return row
}

/**
 * The Growth section for the current gate: heading, one coach note, the path
 * reading when there is one, and the condition rows. The view-model already
 * carries the gate rules and the accessible summary, so this only stamps
 * structure.
 */
function growthSection(view: GrowthView): HTMLElement {
  const section = document.createElement("div")
  section.className = "detail-growth"
  section.setAttribute("role", "group")
  section.setAttribute("aria-label", view.summary)
  const title = document.createElement("h2")
  title.className = "detail-growth-title"
  title.textContent = view.title
  section.append(title)
  if (view.note !== null) {
    const note = document.createElement("p")
    note.className = "detail-growth-note"
    note.textContent = view.note
    section.append(note)
  }
  if (view.path !== null) section.append(pathRow(view.path))
  if (view.rows.length > 0) {
    const rows = document.createElement("div")
    rows.className = "detail-growth-rows"
    rows.append(...view.rows.map(growthRowNode))
    section.append(rows)
  }
  return section
}

/**
 * The little slice of DOM the Growth host needs — lets tests run without one.
 * Picked from `HTMLElement` so the `hidden` union the DOM lib declares stays
 * intact and a real element drops straight in.
 */
export type GrowthHostNode = Pick<HTMLElement, "hidden" | "replaceChildren">

export interface GrowthHost {
  /** Show or hide the section; when shown, repaints from the last state `paint` was given. */
  setVisible: (visible: boolean) => void
  /** Repaint from state, but only while visible. No-op while hidden. */
  paint: (state: GameState) => void
}

/**
 * The Growth slot inside the detail modal. The host remembers the last state
 * it was handed, so a `sync` that lands while the modal is closed still paints
 * on the next open instead of leaving stale copy behind. Repaint swaps this
 * node's children only — siblings, scroll and focus stay put.
 */
export function createGrowthHost(node: GrowthHostNode): GrowthHost {
  let visible = false
  let last: GameState | null = null

  const render = (state: GameState): void => {
    const view = growthView(state)
    if (!view) {
      node.replaceChildren()
      node.hidden = true
      return
    }
    node.replaceChildren(growthSection(view))
    node.hidden = false
  }

  return {
    setVisible: (next) => {
      visible = next
      node.hidden = !next
      if (next && last !== null) render(last)
    },
    paint: (state) => {
      last = state
      if (visible) render(state)
    },
  }
}
