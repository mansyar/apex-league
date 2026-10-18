import type { CupSession, SaveData, SaveImportReason } from "@apex/sim"
import { focusTrap } from "./battleUI"
import { chip } from "./ui/kit"

/**
 * Save transfer helpers (release_polish_20261018 Phase 3).
 *
 * The parsing/validation core lives in the sim (`inspectSaveImport`); this
 * module owns the player-facing copy and the confirmation dialog so the UI can
 * stay calm and explicit about a destructive replace.
 */

/** Why a transfer is refused: the sim's import verdicts plus "mid-battle". */
export type TransferReason = SaveImportReason | "busy"

/** Import only while idle — a live cup session is presentation state. */
export function importBlocked(session: CupSession | null): boolean {
  return session !== null
}

/** Calm coach copy for every refusal path. */
export function transferNotice(reason: TransferReason): string {
  switch (reason) {
    case "busy":
      return "Finish or forfeit the cup first — saves can't swap mid-battle."
    case "future-version":
      return "That save is from a newer version of Apex League."
    case "malformed":
      return "That file isn't an Apex League save."
    case "invalid":
      return "That save is damaged — nothing was changed."
  }
}

/** One-line description of the file the player is about to adopt. */
export function importSummary(data: SaveData): string {
  const { state } = data
  const partner = state.creature?.name ?? "no partner yet"
  const cups = state.cupsWon
  return `Day ${state.day} · ${partner} · Gen ${state.lineage.generation} · ${cups} ${cups === 1 ? "cup" : "cups"}`
}

export interface ImportModalRefs {
  root: HTMLElement
  /** Show the confirm step for a validated save; nothing is written yet. */
  ask: (data: SaveData) => void
  close: () => void
}

/**
 * Replace-save confirmation: a deliberate two-step mirroring the reset modal.
 * The caller only sees `onConfirm` after the player explicitly accepts.
 */
export function buildImportModal(
  onConfirm: (data: SaveData) => void,
): ImportModalRefs {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Replace save")

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box"
  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  title.textContent = "Replace this save?"
  const text = document.createElement("p")
  text.className = "kit-modal-text"
  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const cancel = chip({
    label: "Keep this save",
    variant: "dim",
    onClick: () => close(),
  })
  const confirm = document.createElement("button")
  confirm.className = "kit-button"
  confirm.type = "button"
  confirm.textContent = "Replace save"
  actions.append(cancel, confirm)
  box.append(title, text, actions)
  root.append(box)

  let pending: SaveData | null = null

  function close(): void {
    root.style.display = "none"
    pending = null
  }

  function ask(data: SaveData): void {
    pending = data
    text.textContent = `${importSummary(data)} — this replaces your current ranch.`
    root.style.display = ""
    confirm.focus()
  }

  confirm.addEventListener("click", () => {
    const data = pending
    close()
    if (data) onConfirm(data)
  })

  const trapFocus = focusTrap(box)
  root.addEventListener("keydown", (event) => {
    trapFocus(event)
    if (event.key === "Escape") close()
  })
  root.addEventListener("click", (event) => {
    if (event.target === root) close()
  })

  return { root, ask, close }
}
