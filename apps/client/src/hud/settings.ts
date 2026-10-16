import type { GameState } from "@apex/sim"
import { focusTrap } from "../battleUI"
import { chip } from "../ui/kit"

/** How the preference chips read for a given settings snapshot. */
export interface PrefChipView {
  motionLabel: string
  motionPressed: boolean
  cameraLabel: string
  cameraPressed: boolean
}

/** Pure read of the motion/camera preference chips. */
export function prefChipView(
  settings: Pick<GameState["settings"], "reducedMotion" | "arenaCamera">,
): PrefChipView {
  const cinematic = settings.arenaCamera === "cinematic"
  return {
    motionLabel: settings.reducedMotion ? "Motion: reduced" : "Motion: full",
    motionPressed: settings.reducedMotion,
    cameraLabel: cinematic ? "Camera: cinematic" : "Camera: broadcast",
    cameraPressed: cinematic,
  }
}

/** Mirror the motion and camera preferences onto the settings chips. */
export function capturePrefChips(
  chips: { motionChip: HTMLButtonElement; cameraChip: HTMLButtonElement },
  settings: Pick<GameState["settings"], "reducedMotion" | "arenaCamera">,
): void {
  const view = prefChipView(settings)
  chips.motionChip.setAttribute(
    "aria-pressed",
    view.motionPressed ? "true" : "false",
  )
  const label = chips.motionChip.querySelector<HTMLElement>(".kit-chip-label")
  if (label) label.textContent = view.motionLabel
  chips.cameraChip.setAttribute(
    "aria-pressed",
    view.cameraPressed ? "true" : "false",
  )
  const cameraLabel =
    chips.cameraChip.querySelector<HTMLElement>(".kit-chip-label")
  if (cameraLabel) cameraLabel.textContent = view.cameraLabel
}

/** The settings-pill elements the preference capture mirrors into. */
export interface SettingsChipRefs {
  motionWrap: HTMLElement
  motionChip: HTMLButtonElement
  cameraChip: HTMLButtonElement
  resetChip: HTMLButtonElement
}

/**
 * Settings cluster (top-left): the reduced-motion toggle (save v5), the
 * arena camera toggle (save v9), and the New game chip (save v7 QoL —
 * the confirm modal does the scary part, one deliberate click).
 */
export function buildSettingsChips(opts: {
  onToggleReducedMotion: () => void
  onToggleArenaCamera: () => void
  /** Opens the reset-confirm modal (built by buildResetModal). */
  onNewGame: () => void
}): SettingsChipRefs {
  const motionChip = chip({
    label: "Motion: full",
    variant: "dim",
    onClick: opts.onToggleReducedMotion,
  })
  const motionWrap = document.createElement("div")
  motionWrap.className = "hud-motion"
  motionWrap.append(motionChip)

  const cameraChip = chip({
    label: "Camera: cinematic",
    variant: "dim",
    onClick: opts.onToggleArenaCamera,
  })
  cameraChip.classList.add("camera-chip")
  motionWrap.append(cameraChip)
  const resetChip = chip({
    label: "New game",
    variant: "dim",
    onClick: opts.onNewGame,
  })
  // Ranch-only: the arena hide-list targets this class.
  resetChip.classList.add("new-game-chip")
  motionWrap.append(resetChip)
  return { motionWrap, motionChip, cameraChip, resetChip }
}

/** The reset-confirm modal elements. */
export interface ResetModalRefs {
  resetModal: HTMLElement
  resetConfirm: HTMLButtonElement
}

/**
 * New game confirm modal: a deliberate two-step for a destructive action.
 * Escape backs out; a backdrop click means "not today". The focus trap
 * keeps Tab inside the dialog — the scrim hides the page, so focus
 * wandering into it would be invisible.
 */
export function buildResetModal(onReset: () => void): ResetModalRefs {
  const resetModal = document.createElement("div")
  resetModal.className = "kit-modal"
  resetModal.style.display = "none"
  resetModal.setAttribute("role", "dialog")
  resetModal.setAttribute("aria-modal", "true")
  const resetBox = document.createElement("div")
  resetBox.className = "kit-plate kit-modal-box"
  const resetTitle = document.createElement("h2")
  resetTitle.className = "kit-modal-title"
  resetTitle.textContent = "Start a fresh ranch?"
  const resetText = document.createElement("p")
  resetText.className = "kit-modal-text"
  resetText.textContent =
    "This partner, their training, and every cup win will be gone for good."
  const resetActions = document.createElement("div")
  resetActions.className = "kit-modal-actions"
  const resetCancel = chip({
    label: "Keep playing",
    variant: "dim",
    onClick: () => {
      resetModal.style.display = "none"
    },
  })
  const resetConfirm = document.createElement("button")
  resetConfirm.className = "kit-button kit-button-danger"
  resetConfirm.type = "button"
  resetConfirm.textContent = "Start over"
  resetActions.append(resetCancel, resetConfirm)
  resetBox.append(resetTitle, resetText, resetActions)
  resetModal.append(resetBox)
  resetConfirm.addEventListener("click", () => {
    resetModal.style.display = "none"
    onReset()
  })
  const trapFocus = focusTrap(resetBox)
  resetModal.addEventListener("keydown", (event) => {
    trapFocus(event)
    if (event.key === "Escape") resetModal.style.display = "none"
  })
  resetModal.addEventListener("click", (event) => {
    if (event.target === resetModal) resetModal.style.display = "none"
  })
  return { resetModal, resetConfirm }
}
