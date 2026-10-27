import { chip, plate } from "../ui/kit"
import type { HudViewState } from "./types"

/** The ranch overflow: one toggle plus the panel the secondary chips fold
 * behind. Settings stays primary beside the toggle; Handbook, Gift, Stable,
 * and the composition root's extra chips (Cloud, Boards) live in the panel.
 */
export interface OverflowRefs {
  toggle: HTMLButtonElement
  panel: HTMLElement
}

/** Build the toggle and its (initially shut) panel; the caller seats the
 * secondary chips inside the panel. State lives on the HUD view next to
 * the other collapse states. */
export function buildOverflow(): OverflowRefs {
  const toggle = chip({ label: "More", variant: "dim" })
  toggle.classList.add("overflow-toggle")
  toggle.title = "More ranch options"
  toggle.setAttribute("aria-expanded", "false")
  toggle.setAttribute("aria-controls", "hud-overflow-panel")
  const panel = plate({ className: "hud-overflow" })
  panel.id = "hud-overflow-panel"
  panel.classList.add("is-hidden")
  return { toggle, panel }
}

/**
 * Seat the open panel below an anchor plate (the lineage plate), measured
 * at open time so the panel floats over the scene and never covers a
 * primary plate. Pure geometry: no tier constants, so the phone, desktop,
 * and landscape seats all follow the anchor for free.
 */
export function seatOverflowBelow(
  overflow: OverflowRefs,
  mount: HTMLElement,
  anchor: HTMLElement,
): void {
  // Pre-starter the anchor hides (no bloodline yet) — clear the measured
  // seat so the panel falls back to its below-toggle seat instead of
  // seating off a zero rect.
  if (anchor.getClientRects().length === 0) {
    overflow.panel.style.top = ""
    return
  }
  const mountBox = mount.getBoundingClientRect()
  const anchorBox = anchor.getBoundingClientRect()
  overflow.panel.style.top = `${anchorBox.bottom - mountBox.top + 6}px`
}

/**
 * Seat the ranch flow column's lineage row with a measured clearance:
 * below the top-right chip column on phones, below the motion cluster
 * and the visible teaching callout in short landscape windows. Pure
 * geometry, no tier constants — the same pattern as the panel seat
 * above, so gift-chip appearances (folded inside the panel) move
 * nothing. On phones the plate rides in the ranch grid, so the seat is a
 * margin that lets an expanding lineage push its flow siblings itself; in
 * short landscape windows the wrapper is transparent (display: contents),
 * so the seat is an absolute top below the measured anchors instead —
 * body flow is not a seat. Clears both inline seats wherever neither tier
 * matches (desktop keeps its absolute plates), and skips hidden lineages
 * the way the panel seat skips hidden anchors.
 */
export function seatRanchFlow(
  lineage: HTMLElement,
  score: Element | null,
): void {
  if (typeof window === "undefined") return
  const phone = window.matchMedia("(max-width: 767.98px)").matches
  const squat = window.matchMedia(
    "(orientation: landscape) and (max-height: 500px)",
  ).matches
  if (!phone && !squat) {
    lineage.style.marginTop = ""
    lineage.style.top = ""
    return
  }
  if (lineage.getClientRects().length === 0) return
  const frame =
    lineage.ownerDocument.getElementById("app") ?? lineage.ownerDocument
  const bottomOf = (el: Element | null): number => {
    if (!el) return Number.NEGATIVE_INFINITY
    const box = el.getBoundingClientRect()
    return box.width === 0 && box.height === 0
      ? Number.NEGATIVE_INFINITY
      : box.bottom
  }
  if (squat) {
    // The transparent wrapper leaves no flow to push with, so the lineage
    // pins below the lowest visible anchor directly: the corner insets the
    // stylesheet seats it at are the only constants involved.
    lineage.style.marginTop = ""
    const anchors = [
      frame.querySelector(".hud-motion"),
      frame.querySelector(".hud-callout"),
    ]
    const lowest = Math.max(...anchors.map(bottomOf))
    lineage.style.top =
      lowest === Number.NEGATIVE_INFINITY ? "" : `${Math.max(0, lowest + 8)}px`
    return
  }
  const anchors = [
    score,
    frame.querySelector(".spar-button"),
    frame.querySelector(".cup-button"),
  ]
  const current = Number.parseFloat(lineage.style.marginTop || "0") || 0
  const natural = lineage.getBoundingClientRect().top - current
  const lowest = Math.max(...anchors.map(bottomOf))
  // The 8px step matches the column's own row gap, so the plate keeps the
  // same rhythm it would have in pure flow.
  lineage.style.top = ""
  lineage.style.marginTop =
    lowest === Number.NEGATIVE_INFINITY
      ? ""
      : `${Math.max(0, lowest - natural + 8)}px`
}

/** The seats the caller folds into the panel: the built chips plus the
 * composition root's extras, the cluster they mount beside, and the anchor
 * plate the open panel seats below. */
export interface OverflowSeats {
  handbookChip: Element | null
  giftChip: HTMLButtonElement
  stableChip: HTMLButtonElement
  extraChips: HTMLElement[]
  mount: HTMLElement
  anchor: HTMLElement
}

/**
 * Seat the secondary chips in the panel, mount the pair, and wire the
 * toggle + Escape discipline. The panel floats over the scene when open
 * instead of pushing the plates' seats around; the gift chip keeps its own
 * pending-only signal inside the panel. State lives on the HUD view next
 * to the other collapse states.
 */
export function assembleOverflow(
  overflow: OverflowRefs,
  view: HudViewState,
  seats: OverflowSeats,
): void {
  const apply = (focusPanel: boolean): void => {
    overflow.toggle.setAttribute("aria-expanded", String(view.overflowOpen))
    overflow.panel.classList.toggle("is-hidden", !view.overflowOpen)
    // Measured at open time: the panel seats below the anchor plate and
    // floats over the scene, so every primary stays visible behind it.
    if (view.overflowOpen) {
      seatOverflowBelow(overflow, seats.mount, seats.anchor)
    }
    if (focusPanel && view.overflowOpen) {
      overflow.panel.querySelector("button")?.focus()
    }
  }
  if (seats.handbookChip) overflow.panel.append(seats.handbookChip)
  // The gift chip is the only way back to a pending egg once the results
  // screen is gone.
  overflow.panel.append(seats.giftChip, seats.stableChip)
  // Chips the composition root owns (the cloud chip, when this build has an
  // api origin): appended after the built ones so the cluster order is fixed.
  for (const extra of seats.extraChips) overflow.panel.append(extra)
  seats.mount.append(overflow.toggle, overflow.panel)
  // Seats measured during boot race hidden anchors and unloaded webfonts
  // (the lineage grows when its display face arrives), so re-derive on
  // first paint, on font arrival, and on resizes — always while open.
  const reseat = (): void => {
    if (view.overflowOpen) {
      seatOverflowBelow(overflow, seats.mount, seats.anchor)
    }
    // The lineage clearance follows the same triggers: resizes and font
    // arrivals move the chip geometry it measures below.
    seatRanchFlow(
      seats.anchor,
      seats.mount.ownerDocument.querySelector(".score-bug"),
    )
  }
  requestAnimationFrame(reseat)
  if (typeof document !== "undefined" && "fonts" in document) {
    document.fonts.ready.then(reseat).catch(() => {})
  }
  window.addEventListener("resize", reseat)
  overflow.toggle.addEventListener("click", () => {
    view.overflowOpen = !view.overflowOpen
    apply(true)
  })
  overflow.panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      view.overflowOpen = false
      apply(false)
      overflow.toggle.focus()
    }
  })
  apply(false)
}
