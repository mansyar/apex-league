/**
 * The Storm Gift card (electric species line FR-5/FR-6): the league's
 * one-time Silver reward, waiting in the nursery as a pending egg.
 *
 * The card shows the granted egg exactly as it will hatch — the preview
 * comes from the sim's own preview seam (`stormGiftPreview`), which rolls
 * the egg from the pending gift's stored seed, so the numbers on the card
 * are the numbers the hatch produces. The hatch itself is the sim's
 * succession seam: the hound takes the ranch and the outgoing partner is
 * archived in the Hall of Fame.
 *
 * Presentation only: the sim decides whether a gift is pending and whether
 * the hatch is allowed; the app owns the store commit.
 */
import { type GameState, stormGiftPending, stormGiftPreview } from "@apex/sim"
import { focusTrap } from "./battleUI"
import { paintCrest } from "./hud/plates-creature"
import { chip, crest, tab } from "./ui/kit"

const STAT_ROWS: ReadonlyArray<{
  key: "hp" | "atk" | "def" | "spd"
  label: string
}> = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
]

/** One previewed stat: the label and the rolled number. */
function statRow(label: string, value: number): HTMLElement {
  const row = document.createElement("div")
  row.className = "gift-stat"
  const name = document.createElement("span")
  name.className = "gift-stat-label"
  name.textContent = label
  const number = document.createElement("span")
  number.className = "gift-stat-value"
  number.textContent = String(value)
  row.append(name, number)
  return row
}

/**
 * The note under the preview: hatching hands the ranch to the hound, so the
 * card says what happens to the partner it replaces.
 */
export function giftHatchNote(currentName: string | undefined): string {
  return currentName
    ? `Hatching retires ${currentName} to the Hall of Fame and brings the hound to the ranch.`
    : "Hatching brings the hound to the ranch."
}

/**
 * The gift chip: the way back to a granted egg once the cup results screen
 * is gone. Hidden until one is waiting, so the ranch chips stay quiet for a
 * player who has not reached Silver.
 */
export function buildGiftChip(onOpen: () => void): HTMLButtonElement {
  const button = chip({ label: "Gift", variant: "dim", onClick: onOpen })
  button.classList.add("gift-chip")
  // The chip's own `display` rule outranks the `hidden` attribute, so the
  // chip is folded the way the rest of the HUD folds its rows.
  button.style.display = "none"
  button.title = "Storm Gift"
  return button
}

/**
 * Show the chip only while a granted egg waits in the nursery (FR-5). The
 * HUD's paint pass calls this on every commit.
 */
export function syncGiftChip(
  button: HTMLButtonElement,
  state: GameState,
): void {
  button.style.display = stormGiftPending(state) ? "" : "none"
}

export interface GiftModal {
  /** The modal root — append it to the HUD root once. Starts hidden. */
  root: HTMLElement
  /** Render from current state and show the card. */
  open: (state: GameState) => void
  /** Hide the card and hand focus back to whoever opened it. */
  close: () => void
}

/**
 * Build the Storm Gift card. `onHatch` fires when the player commits to the
 * hatch; the app commits the succession to the store.
 */
export function buildGiftModal(onHatch: () => void): GiftModal {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Storm Gift")

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box gift-box"

  const head = document.createElement("div")
  head.className = "gift-head"
  const crestEl = crest("electric")
  paintCrest(crestEl, "electric", null)
  const name = document.createElement("span")
  name.className = "gift-name"
  const giftTab = tab("Gift", "accent")
  head.append(crestEl, name, giftTab)

  const flavor = document.createElement("p")
  flavor.className = "gift-flavor"

  const stats = document.createElement("div")
  stats.className = "gift-stats"

  const note = document.createElement("p")
  note.className = "gift-note"

  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const hatch = document.createElement("button")
  hatch.className = "kit-button"
  hatch.type = "button"
  hatch.textContent = "Hatch the egg"
  const later = chip({
    label: "Later",
    variant: "dim",
    onClick: () => closeNow(),
  })
  actions.append(hatch, later)

  box.append(head, flavor, stats, note, actions)
  root.append(box)

  /** Where focus goes when the card closes (the chip that opened it). */
  let opener: HTMLElement | null = null
  const closeNow = (): void => {
    root.style.display = "none"
    if (opener?.isConnected) opener.focus()
    opener = null
  }
  const trap = focusTrap(box)
  root.addEventListener("keydown", (event) => {
    trap(event)
    if (event.key === "Escape") closeNow()
  })
  root.addEventListener("click", (event) => {
    if (event.target === root) closeNow()
  })
  hatch.addEventListener("click", () => {
    // The app commits the succession; the card closes either way, and the
    // sim refuses a second hatch, so a stale click cannot double-grant.
    onHatch()
    closeNow()
  })

  return {
    root,
    open: (state) => {
      const preview = stormGiftPreview(state)
      if (!preview) return
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      name.textContent = preview.displayName
      flavor.textContent = preview.flavor
      stats.replaceChildren(
        ...STAT_ROWS.map(({ key, label }) =>
          statRow(label, preview.stats[key]),
        ),
      )
      const current = state.creature?.name
      note.textContent = giftHatchNote(current)
      root.style.display = ""
      hatch.focus()
    },
    close: closeNow,
  }
}
