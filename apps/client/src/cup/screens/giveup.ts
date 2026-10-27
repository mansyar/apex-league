/**
 * The give-up modal (cup_modules_per_screen split): a deliberate two-step
 * for a forfeit. Moved verbatim from cup-screens.ts — dialog semantics
 * included; open/close and focus management are the shared modal helper's
 * (ui/modal), wired by the cup flow.
 */

/** The give-up modal's interactive surfaces. */
export interface GiveupModalRefs {
  root: HTMLElement
  giveupStay: HTMLButtonElement
  giveupQuit: HTMLButtonElement
}

/**
 * Give-up modal (over the bracket): a deliberate two-step for a forfeit.
 * Dialog semantics live on the card; open/close, focus trap, and Escape are
 * the shared modal helper's (ui/modal), wired by the cup flow — there is no
 * scrim-out, and Stay is the explicit way back.
 */
export function buildGiveupModal(): GiveupModalRefs {
  const root = document.createElement("div")
  root.className = "cup-giveup"
  root.classList.add("is-hidden")
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
  giveupStay.className = "cup-cta-ghost kit-line"
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
  return { root, giveupStay, giveupQuit }
}
