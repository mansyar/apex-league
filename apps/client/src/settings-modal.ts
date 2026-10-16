/**
 * Settings modal (coach_knowledge_20261016 Phase 5): the three floating
 * settings chips (motion / camera style / new game) consolidated into one
 * modal behind a single Settings chip. 1:1 relocation — same chips, same
 * labels, same handlers, zero new behavior. The chips keep their surface
 * classes, so the cross-surface rules stay honest: the camera row only
 * exists inside the arena (it is a battle-presentation control) and the
 * new game row only in the ranch, exactly as the floating chips did.
 */

import { focusTrap } from "./battleUI"
import { chip } from "./ui/kit"

/** The settings chip trio plus the cluster wrapper they float in. */
export interface SettingsChipRefs {
  motionWrap: HTMLElement
  motionChip: HTMLButtonElement
  cameraChip: HTMLButtonElement
  resetChip: HTMLButtonElement
}

/**
 * Build the three settings chips. Handlers are optional: the design mock
 * wires its own live toggle, while the settings modal attaches listeners
 * itself (the modal owns close-then-open for the reset flow).
 */
function buildSettingsChips(
  opts: {
    onToggleReducedMotion?: () => void
    onToggleArenaCamera?: () => void
    /** Opens the reset-confirm modal (built by buildResetModal). */
    onNewGame?: () => void
  } = {},
): SettingsChipRefs {
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

export interface SettingsModalRefs {
  root: HTMLElement
  /** Show the settings modal (focus lands on the motion chip). */
  open: () => void
  /** Live chip refs — update() mirrors preference labels onto them. */
  motionChip: HTMLButtonElement
  cameraChip: HTMLButtonElement
  resetChip: HTMLButtonElement
}

/**
 * Build the settings modal around the chip trio. Hidden until open();
 * Escape, the backdrop, and the footer button all close it, restoring
 * focus to the opener. New game closes this modal first, then hands off
 * to the reset-confirm modal — the same deliberate two-step as before.
 */
export function buildSettingsModal(
  opts: {
    onToggleReducedMotion?: () => void
    onToggleArenaCamera?: () => void
    /** Opens the reset-confirm modal (built by buildResetModal). */
    onNewGame?: () => void
  } = {},
): SettingsModalRefs {
  const { motionChip, cameraChip, resetChip } = buildSettingsChips()

  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Settings")
  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box settings-box"
  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  title.textContent = "Settings"

  const rows = document.createElement("div")
  rows.className = "settings-rows"
  for (const row of [motionChip, cameraChip, resetChip]) rows.append(row)

  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const close = document.createElement("button")
  close.className = "kit-button"
  close.type = "button"
  close.textContent = "Done"
  actions.append(close)

  motionChip.addEventListener("click", () => opts.onToggleReducedMotion?.())
  cameraChip.addEventListener("click", () => opts.onToggleArenaCamera?.())
  resetChip.addEventListener("click", () => {
    closeNow()
    opts.onNewGame?.()
  })

  let opener: HTMLElement | null = null
  function closeNow(): void {
    root.style.display = "none"
    opener?.focus()
    opener = null
  }
  close.addEventListener("click", closeNow)
  const trapFocus = focusTrap(box)
  root.addEventListener("keydown", (event) => {
    trapFocus(event)
    if (event.key === "Escape") {
      event.stopPropagation()
      closeNow()
    }
  })
  root.addEventListener("click", (event) => {
    if (event.target === root) closeNow()
  })

  box.append(title, rows, actions)
  root.append(box)
  return {
    root,
    open: () => {
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      root.style.display = ""
      motionChip.focus()
    },
    motionChip,
    cameraChip,
    resetChip,
  }
}
