/**
 * The spar-invite surface (FR-5, AC-5): a small modal on the ranch HUD, one
 * polite announcer, and keyboard-reachable controls. No second `aria-live`
 * region — `announcer()` owns the only one, and this panel's status line is
 * purely visual so screen readers never hear a line twice.
 */
import { announcer } from "../ui/announcer"
import { button, chip } from "../ui/kit"
import type { LiveVerdict } from "./protocol"
import { errorCopy, type LiveStatus, statusCopy, verdictCopy } from "./state"

export interface LivePanelActions {
  create(): void
  join(code: string): void
  ready(): void
  leave(): void
}

export interface LivePanel {
  chip: HTMLButtonElement
  root: HTMLElement
  open(): void
  close(): void
  focusCode(): void
  status(status: LiveStatus): void
  room(code: string): void
  verdict(
    verdict: LiveVerdict,
    selfSeat: 0 | 1 | null,
    names: readonly [string, string],
  ): void
  error(code: string): void
}

function line(className: string, text = ""): HTMLParagraphElement {
  const node = document.createElement("p")
  node.className = className
  node.textContent = text
  return node
}

/** The modal is built once and reused for every invite. */
export function createLivePanel(actions: LivePanelActions): LivePanel {
  const chipButton = chip({
    label: "Live PvP",
    variant: "dim",
  })

  const root = document.createElement("div")
  root.className = "kit-modal is-hidden live-modal"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Live spar invite")

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box live-box"

  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  title.textContent = "Live spar invite"

  const notice = line(
    "kit-modal-text live-notice",
    "Share a room code with one friend. Your passphrase travels in the channel — never in the link.",
  )

  const field = document.createElement("label")
  field.className = "live-field"
  const fieldLabel = document.createElement("span")
  fieldLabel.className = "live-label"
  fieldLabel.textContent = "Room code"
  const codeInput = document.createElement("input")
  codeInput.className = "live-code-input"
  codeInput.type = "text"
  codeInput.maxLength = 12
  codeInput.placeholder = "e.g. A1B2C3"
  codeInput.autocomplete = "off"
  codeInput.spellcheck = false
  field.append(fieldLabel, codeInput)

  const startControls = document.createElement("div")
  startControls.className = "live-controls"
  const createButton = button({ label: "Create room", onClick: actions.create })
  const joinButton = button({
    label: "Join room",
    onClick: () => actions.join(codeInput.value),
  })
  startControls.append(createButton, joinButton)

  const roomRow = document.createElement("div")
  roomRow.className = "live-room is-hidden"
  const roomLabel = document.createElement("span")
  roomLabel.className = "live-label"
  roomLabel.textContent = "Your code"
  const roomCode = document.createElement("strong")
  roomCode.className = "live-room-code"
  roomRow.append(roomLabel, roomCode)

  const matchControls = document.createElement("div")
  matchControls.className = "live-controls is-hidden"
  const readyButton = button({ label: "Ready", onClick: actions.ready })
  const leaveButton = button({ label: "Back to ranch", onClick: actions.leave })
  matchControls.append(readyButton, leaveButton)

  const status = line("live-status", statusCopy("idle"))
  const result = line("live-result is-hidden")

  box.append(
    title,
    notice,
    field,
    startControls,
    roomRow,
    matchControls,
    status,
    result,
  )
  root.append(box)

  function open(): void {
    root.classList.remove("is-hidden")
    codeInput.focus()
  }

  function close(): void {
    root.classList.add("is-hidden")
    chipButton.focus()
  }

  return {
    chip: chipButton,
    root,

    open,
    close,

    focusCode() {
      codeInput.focus()
      codeInput.select()
    },

    status(next) {
      status.textContent = statusCopy(next)
      readyButton.disabled = next === "fighting" || next === "connecting"
      if (
        next === "waiting" ||
        next === "ready" ||
        next === "fighting" ||
        next === "verdict" ||
        next === "error" ||
        next === "closed"
      ) {
        announcer().say(statusCopy(next))
      }
    },

    room(code) {
      roomCode.textContent = code
      roomRow.classList.remove("is-hidden")
      matchControls.classList.remove("is-hidden")
      codeInput.value = code
      codeInput.disabled = true
      createButton.disabled = true
      joinButton.disabled = true
    },

    verdict(verdict, selfSeat, names) {
      const copy = verdictCopy(verdict, selfSeat, names)
      result.textContent = `${copy.title} — ${copy.sub}`
      result.classList.remove("is-hidden")
      readyButton.disabled = true
      announcer().say(`${copy.title}. ${copy.sub}`)
    },

    error(code) {
      const text = errorCopy(code)
      result.textContent = text
      result.classList.remove("is-hidden")
      status.textContent = statusCopy("error")
      announcer().say(text)
    },
  }
}
