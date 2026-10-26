/**
 * The trainer surface (FR-8, FR-11, AC-8): one quiet chip beside Settings and
 * Handbook, and one small modal behind it — trainer id, name, passphrase,
 * sign-in, sign-out, and the sync status as a sentence.
 *
 * The chip only exists when the build has a cloud at all (`createCloudSave`
 * returns null otherwise), so a local-only build looks exactly as it did
 * before this track (AC-11).
 *
 * This module is deliberately thin: the words live in `./copy`, the
 * conversation lives in `./sync`, and nothing here decides whether the game
 * keeps playing. A failed request paints a sentence; it never blocks, and it
 * never touches the save.
 */
import { focusTrap } from "../battleUI"
import { button, chip } from "../ui/kit"
import { cloudStatusLine, PASSPHRASE_NOTICE, signInFailureLine } from "./copy"
import type { TrainerCredentials } from "./credentials"
import type { CloudStatus, CloudSync } from "./sync"

export interface CloudPanel {
  /** The modal root — append once. Starts hidden. */
  root: HTMLElement
  /** The chip that opens it — append into the HUD's chip cluster. */
  chip: HTMLButtonElement
  open: () => void
  close: () => void
  /** Paint the quiet status (the composition root's sync subscription). */
  paint: (status: CloudStatus) => void
}

function field(labelText: string, input: HTMLInputElement): HTMLElement {
  const row = document.createElement("label")
  row.className = "cloud-row"
  const name = document.createElement("span")
  name.className = "cloud-label"
  name.textContent = labelText
  row.append(name, input)
  return row
}

function textInput(placeholder: string): HTMLInputElement {
  const input = document.createElement("input")
  input.className = "cloud-input"
  input.type = "text"
  input.autocomplete = "off"
  input.placeholder = placeholder
  return input
}

export function buildCloudPanel(opts: {
  sync: CloudSync
  /** The credentials currently stored, or null when signed out. */
  credentials: () => TrainerCredentials | null
}): CloudPanel {
  const { sync, credentials } = opts

  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Trainer cloud")

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box cloud-box"

  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  title.textContent = "Trainer cloud"

  // Stated before any passphrase is chosen — no reset, and the id is the
  // credential (the spec's two hard statements, in the coach's voice).
  const notice = document.createElement("p")
  notice.className = "kit-modal-text cloud-notice"
  notice.textContent = PASSPHRASE_NOTICE

  const nameInput = textInput("Ranch name")
  const idInput = textInput("Trainer id")
  const passInput = document.createElement("input")
  passInput.className = "cloud-input"
  passInput.type = "password"
  passInput.autocomplete = "current-password"
  passInput.placeholder = "Passphrase"

  const status = document.createElement("p")
  status.className = "cloud-status"
  status.setAttribute("role", "status")

  // Two rows: the pair a player acts with, then the quieter sign-out beside
  // Done. Three chips in one row wrap their own labels at 393px.
  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const signIn = chip({ label: "Sign in" })
  const create = button({ label: "Create trainer" })
  actions.append(signIn, create)

  const signOut = chip({ label: "Sign out", variant: "dim" })
  const closeChip = chip({ label: "Done", variant: "dim" })
  const footer = document.createElement("div")
  footer.className = "kit-modal-actions"
  footer.append(signOut, closeChip)

  // A real form around the three fields: a password input outside one makes
  // the browser log a DOM notice, and Enter is the obvious way to sign in.
  const form = document.createElement("form")
  form.className = "cloud-form"
  form.append(
    field("Ranch name", nameInput),
    field("Trainer id", idInput),
    field("Passphrase", passInput),
  )

  box.append(title, notice, form, status, actions, footer)
  root.append(box)

  const chipEl = chip({ label: "Cloud", variant: "dim", onClick: () => open() })
  chipEl.classList.add("cloud-chip")
  chipEl.title = "Trainer cloud"

  let opener: HTMLElement | null = null

  function say(message: string): void {
    status.textContent = message
  }

  /** The signed-in fields only make sense for the trainer they belong to. */
  function paintFields(): void {
    const stored = credentials()
    signOut.style.display = stored === null ? "none" : ""
    idInput.value = stored?.id ?? idInput.value
    nameInput.value = stored?.name ?? nameInput.value
  }

  function paint(next: CloudStatus): void {
    say(cloudStatusLine(next))
    chipEl.dataset.sync = next.kind
    // Text carries the meaning; the dot only reinforces it (accessibility:
    // colour is never the only carrier).
    chipEl.title = cloudStatusLine(next)
  }

  function open(): void {
    opener = document.activeElement as HTMLElement | null
    paintFields()
    paint(sync.status())
    root.style.display = ""
    idInput.focus()
  }

  function close(): void {
    root.style.display = "none"
    opener?.focus()
    opener = null
  }

  async function run(action: () => Promise<{ ok: boolean; reason?: string }>) {
    signIn.setAttribute("aria-disabled", "true")
    create.setAttribute("aria-disabled", "true")
    const result = await action()
    signIn.removeAttribute("aria-disabled")
    create.removeAttribute("aria-disabled")
    if (!result.ok && result.reason) say(signInFailureLine(result.reason))
    else passInput.value = ""
    paintFields()
    paint(sync.status())
  }

  signIn.addEventListener("click", () => {
    void run(() => sync.signIn(idInput.value, passInput.value))
  })
  create.addEventListener("click", () => {
    void run(() => sync.createTrainer(nameInput.value, passInput.value))
  })
  signOut.addEventListener("click", () => {
    sync.signOut()
    passInput.value = ""
    paintFields()
    paint(sync.status())
  })
  closeChip.addEventListener("click", close)
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    void run(() => sync.signIn(idInput.value, passInput.value))
  })
  root.addEventListener("keydown", (event) => {
    focusTrap(box)(event)
    if (event.key === "Escape") {
      event.stopPropagation()
      close()
    }
  })
  root.addEventListener("click", (event) => {
    if (event.target === root) close()
  })

  return { root, chip: chipEl, open, close, paint }
}
