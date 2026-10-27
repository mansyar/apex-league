import type { GameState } from "@apex/sim"
import { chip } from "../ui/kit"
import { closeModal, openModal } from "../ui/modal"

/** How the preference chips read for a given settings snapshot. */
export interface PrefChipView {
  motionLabel: string
  motionPressed: boolean
  cameraLabel: string
  cameraPressed: boolean
  /** The audio mute toggle (save v13): "Sound: on" until the player mutes. */
  soundLabel: string
  soundPressed: boolean
}

/** Pure read of the motion/camera/sound preference chips. */
export function prefChipView(
  settings: Pick<
    GameState["settings"],
    "reducedMotion" | "arenaCamera" | "muted"
  >,
): PrefChipView {
  const cinematic = settings.arenaCamera === "cinematic"
  return {
    motionLabel: settings.reducedMotion ? "Motion: reduced" : "Motion: full",
    motionPressed: settings.reducedMotion,
    cameraLabel: cinematic ? "Camera: cinematic" : "Camera: broadcast",
    cameraPressed: cinematic,
    soundLabel: settings.muted ? "Sound: muted" : "Sound: on",
    soundPressed: settings.muted,
  }
}

/** Mirror the motion, camera, and sound preferences onto the settings chips. */
export function capturePrefChips(
  chips: {
    motionChip: HTMLButtonElement
    cameraChip: HTMLButtonElement
    soundChip: HTMLButtonElement
  },
  settings: Pick<
    GameState["settings"],
    "reducedMotion" | "arenaCamera" | "muted"
  >,
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
  chips.soundChip.setAttribute(
    "aria-pressed",
    view.soundPressed ? "true" : "false",
  )
  const soundLabel =
    chips.soundChip.querySelector<HTMLElement>(".kit-chip-label")
  if (soundLabel) soundLabel.textContent = view.soundLabel
}

/**
 * Whole-percent read of a 0..1 bus level for the volume sliders. Clamped,
 * and non-finite input reads as silence.
 */
export function volumePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.min(1, Math.max(0, value)) * 100)
}

/** The reset-confirm modal elements. */
export interface ResetModalRefs {
  resetModal: HTMLElement
  resetConfirm: HTMLButtonElement
  /** Show the confirm; trap/scrim/Escape/return-focus are the helper's. */
  open: () => void
}

/**
 * New game confirm modal: a deliberate two-step for a destructive action.
 * Escape backs out; a backdrop click means "not today". The focus trap
 * keeps Tab inside the dialog — the scrim hides the page, so focus
 * wandering into it would be invisible.
 */
export function buildResetModal(
  onReset: () => void,
  onClose?: () => void,
): ResetModalRefs {
  const resetModal = document.createElement("div")
  resetModal.className = "kit-modal"
  resetModal.classList.add("is-hidden")
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
  /** Dismissal (not the destructive confirm) hands focus back to Settings. */
  const closeNow = (): void => {
    closeModal(resetModal)
    onClose?.()
  }
  const resetCancel = chip({
    label: "Keep playing",
    variant: "dim",
    onClick: closeNow,
  })
  const resetConfirm = document.createElement("button")
  resetConfirm.className = "kit-button kit-button-danger"
  resetConfirm.type = "button"
  resetConfirm.textContent = "Start over"
  resetActions.append(resetCancel, resetConfirm)
  resetBox.append(resetTitle, resetText, resetActions)
  resetModal.append(resetBox)
  resetConfirm.addEventListener("click", () => {
    closeModal(resetModal, { returnFocus: false })
    onReset()
  })

  return {
    resetModal,
    resetConfirm,
    /** Show the confirm; trap/scrim/Escape/return-focus are the helper's. */
    open: () => {
      openModal(resetModal, { box: resetBox, initialFocus: resetCancel })
    },
  }
}
