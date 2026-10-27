/**
 * The league reward card (species roster FR-5/FR-7): a tier reward from the
 * league, waiting in the nursery as a pending egg — one line per tier, from
 * the Silver line through the Legend line.
 *
 * The card shows the granted egg exactly as it will hatch — the preview
 * comes from the sim's own preview seam (`leagueRewardPreview`), which
 * rolls the egg from the pending reward's stored seed, so the numbers on
 * the card are the numbers the hatch produces. The hatch itself is the
 * sim's claim seam: the pet joins the **stable** and the ranch pet stays
 * exactly where it is (stable & partner reserve FR-7). The reward is a pet
 * the player owns from that moment, not a replacement for the one they
 * already have, so the card never promises a succession.
 *
 * Presentation only: the sim decides whether a reward is pending and
 * whether the hatch is allowed; the app owns the store commit.
 */
import {
  type GameState,
  leagueRewardPending,
  leagueRewardPreview,
} from "@apex/sim"
import { paintCrest } from "./hud/plates-creature"
import { chip, crest, tab } from "./ui/kit"
import { closeModal, openModal } from "./ui/modal"

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
 * The note under the preview: the reward joins the stable and the ranch
 * pet stays where it is. The card never says the reward replaces anything.
 */
export function giftHatchNote(currentName: string | undefined): string {
  return currentName
    ? `Hatching sends it to the stable — ${currentName} keeps the ranch, and its career starts when you bring it forward.`
    : "Hatching sends it to the stable — its career starts when you bring it forward."
}

/** The caption over the preview: the numbers are the egg's own. */
export const GIFT_STATS_CAPTION = "The stats it hatches with"

/**
 * The gift chip: the way back to a granted egg once the cup results screen
 * is gone. Hidden until one is waiting, so the ranch chips stay quiet for a
 * player who has not reached Silver.
 */
export function buildGiftChip(onOpen: () => void): HTMLButtonElement {
  const button = chip({ label: "Gift", variant: "dim", onClick: onOpen })
  button.classList.add("gift-chip")
  // Folded through a class, not an inline `display`: the seat rules in
  // ranch.css read the chip's visibility, and a class is the only signal a
  // selector can key on without guessing at an inline string.
  button.classList.add("is-hidden")
  button.title = "League Reward"
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
  button.classList.toggle("is-hidden", !leagueRewardPending(state))
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
 * Build the league reward card. `onHatch` fires when the player commits to
 * the hatch; the app commits the claim to the store.
 */
export function buildGiftModal(onHatch: () => void): GiftModal {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.classList.add("is-hidden")
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "League Reward")

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box gift-box"

  const head = document.createElement("div")
  head.className = "gift-head"
  // The crest is repainted on every open: the queue can hold any tier's
  // egg, so the element follows the pending reward, not a fixed species.
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

  const statsCaption = document.createElement("p")
  statsCaption.className = "gift-stats-caption"
  statsCaption.textContent = GIFT_STATS_CAPTION

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

  box.append(head, flavor, statsCaption, stats, note, actions)
  root.append(box)

  // Open/close, focus trap, scrim-click, Escape, and return-focus are the
  // shared modal helper's (ui/modal).
  const closeNow = (): void => {
    closeModal(root)
  }
  hatch.addEventListener("click", () => {
    // The app commits the succession; the card closes either way, and the
    // sim refuses a second hatch, so a stale click cannot double-grant.
    onHatch()
    closeNow()
  })

  return {
    root,
    open: (state) => {
      const preview = leagueRewardPreview(state)
      if (!preview) return
      paintCrest(crestEl, preview.element, null)
      name.textContent = preview.displayName
      flavor.textContent = preview.flavor
      stats.replaceChildren(
        ...STAT_ROWS.map(({ key, label }) =>
          statRow(label, preview.stats[key]),
        ),
      )
      const current = state.creature?.name
      note.textContent = giftHatchNote(current)
      openModal(root, { box, initialFocus: hatch })
    },
    close: closeNow,
  }
}
