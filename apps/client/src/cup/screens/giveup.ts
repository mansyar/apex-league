/**
 * The give-up modal (cup_modules_per_screen split): a deliberate two-step
 * for a forfeit. Moved verbatim from cup-screens.ts — dialog semantics and
 * the focus trap included.
 */

import { focusTrap } from "../../battleUI"

/** The give-up modal's interactive surfaces. */
export interface GiveupModalRefs {
  root: HTMLElement
  giveupStay: HTMLButtonElement
  giveupQuit: HTMLButtonElement
}

/**
 * Give-up modal (over the bracket): a deliberate two-step for a forfeit.
 * Dialog semantics + focus management: the scrim hides the bracket, so
 * Tab must cycle inside the card, and Escape bails out to Stay, handing
 * focus back to the bracket's close button (which owns the reopen).
 */
export function buildGiveupModal(close: HTMLElement): GiveupModalRefs {
  const root = document.createElement("div")
  root.className = "cup-giveup"
  root.style.display = "none"
  const giveupCard = document.createElement("div")
  giveupCard.className = "cup-giveup-card"
  const giveupTab = document.createElement("span")
  giveupTab.className = "cup-giveup-tab"
  giveupTab.textContent = "Forfeit"
  const giveupTitle = document.createElement("div")
  giveupTitle.className = "cup-giveup-title"
  giveupTitle.textContent = "Walk away?"
  const giveupCopy = document.createElement("div")
  giveupCopy.className = "cup-giveup-copy"
  giveupCopy.textContent =
    "Giving up counts as a loss in this round — your placement stands as if you lost it, and the consolation (+2 mood) still applies. No cup is won."
  const giveupRow = document.createElement("div")
  giveupRow.className = "cup-giveup-row"
  const giveupStay = document.createElement("button")
  giveupStay.type = "button"
  giveupStay.className = "cup-cta-ghost"
  giveupStay.textContent = "Stay in the bracket"
  const giveupQuit = document.createElement("button")
  giveupQuit.type = "button"
  giveupQuit.className = "cup-cta-go cup-cta-danger"
  giveupQuit.textContent = "Give up"
  giveupRow.append(giveupStay, giveupQuit)
  giveupCard.append(giveupTab, giveupTitle, giveupCopy, giveupRow)
  root.append(giveupCard)
  giveupCard.setAttribute("role", "dialog")
  giveupCard.setAttribute("aria-modal", "true")
  giveupTitle.id = "cup-giveup-title"
  giveupCard.setAttribute("aria-labelledby", "cup-giveup-title")
  const giveupTrap = focusTrap(giveupCard)
  root.addEventListener("keydown", (event) => {
    giveupTrap(event)
    if (event.key === "Escape") {
      event.stopPropagation()
      root.style.display = "none"
      close.focus()
    }
  })
  return { root, giveupStay, giveupQuit }
}
