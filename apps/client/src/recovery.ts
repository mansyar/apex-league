import { focusTrap } from "./battleUI"
import { chip } from "./ui/kit"

/**
 * Corrupt-save recovery (release_polish_20261018 Phase 3).
 *
 * The broken payload is never overwritten before the player chooses. The
 * dialog offers a byte-for-byte download first; starting fresh is a
 * deliberate two-step. There is no silent dismissal: the starter picker
 * underneath must not overwrite the file by accident.
 */

/** Which step of the recovery conversation is on screen. */
export type RecoveryStep = "offer" | "confirm"

/** Copy for each recovery step (one calm paragraph per step). */
export function recoveryCopy(step: RecoveryStep): {
  title: string
  text: string
  confirm: string
} {
  if (step === "confirm") {
    return {
      title: "Start a fresh ranch?",
      text: "The broken file will be cleared. Download it first if you might want it back.",
      confirm: "Clear and start over",
    }
  }
  return {
    title: "That save wouldn't open",
    text: "The file is still here. Download a copy if you might want it back, then start fresh when you're ready.",
    confirm: "Start over",
  }
}

/** Dated filename for the retained raw payload. */
export function recoveryFileName(now: Date): string {
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `apex-league-broken-save-${yyyy}-${mm}-${dd}.json`
}

export interface RecoveryModalRefs {
  root: HTMLElement
  /** Show the dialog on the offer step (used only on a corrupt boot). */
  open: () => void
}

/**
 * Blocking recovery dialog: download the retained bytes, or confirm a wipe.
 * `onDownload` returns false when there is nothing retained to save.
 */
export function buildRecoveryModal(handlers: {
  onDownload: () => boolean
  onReset: () => void
}): RecoveryModalRefs {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Save recovery")

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box"
  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  const text = document.createElement("p")
  text.className = "kit-modal-text"
  const status = document.createElement("p")
  status.className = "settings-notice"
  status.setAttribute("role", "status")
  status.hidden = true

  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const download = chip({
    label: "Download broken save",
    variant: "dim",
    onClick: () => {
      const saved = handlers.onDownload()
      status.hidden = false
      status.textContent = saved
        ? "Saved — check your downloads."
        : "There are no bytes left to save."
    },
  })
  const keep = chip({
    label: "Keep trying",
    variant: "dim",
    onClick: () => render("offer"),
  })
  const primary = document.createElement("button")
  primary.className = "kit-button"
  primary.type = "button"
  actions.append(download, keep, primary)
  box.append(title, text, status, actions)
  root.append(box)

  let step: RecoveryStep = "offer"

  function render(next: RecoveryStep): void {
    step = next
    const copy = recoveryCopy(step)
    title.textContent = copy.title
    text.textContent = copy.text
    primary.textContent = copy.confirm
    keep.hidden = step === "offer"
    primary.focus()
  }

  primary.addEventListener("click", () => {
    if (step === "offer") {
      render("confirm")
      return
    }
    root.style.display = "none"
    handlers.onReset()
  })

  const trapFocus = focusTrap(box)
  root.addEventListener("keydown", (event) => {
    trapFocus(event)
    // No Escape close: dismissing would let the picker overwrite the file.
    if (event.key === "Escape") event.stopPropagation()
  })

  return {
    root,
    open: () => {
      root.style.display = ""
      render("offer")
    },
  }
}
