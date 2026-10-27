/**
 * Shared modal helper (ui_cleanliness_20261027 Phase 1): one owner for
 * open/close across every overlay — display class, focus trap, scrim-click,
 * Escape, and return-focus with an unmounted-target fallback.
 *
 * Roots start hidden via the `is-hidden` class (kit.css hides every overlay
 * root that wears it); the helper only toggles that class. No overlay writes
 * `style.display` on its modal path anymore.
 */

import { focusablesIn, focusTrap } from "./focus"

export interface OpenModalOptions {
  /** The focus-trap scope. Defaults to the root itself. */
  box?: HTMLElement | null
  /** Where focus lands on open. Defaults to the first focusable in box. */
  initialFocus?: HTMLElement | null
  /** Cleanup that runs on every close (generation bump, host hide, ...). */
  onClose?: () => void
  /** Clicking the scrim (target === root) closes. Defaults true. */
  dismissOnScrim?: boolean
  /** Escape closes. Defaults true; blocking dialogs pass false. */
  dismissOnEscape?: boolean
}

export interface CloseModalOptions {
  /** Hand focus back to the opener. Defaults true; commits pass false. */
  returnFocus?: boolean
  /** Run the stored onClose cleanup. Defaults true. */
  notify?: boolean
}

interface ModalRecord {
  box: HTMLElement
  opener: HTMLElement | null
  onClose: (() => void) | null
  dismissOnScrim: boolean
  dismissOnEscape: boolean
  keydown: (event: KeyboardEvent) => void
  click: (event: MouseEvent) => void
}

const records = new WeakMap<HTMLElement, ModalRecord>()

/** instanceof without throwing when the DOM is stubbed or absent. */
function isElement(node: unknown): node is HTMLElement {
  const ctor = (globalThis as { HTMLElement?: unknown }).HTMLElement
  return typeof ctor === "function" && node instanceof (ctor as never)
}

/** True while the overlay is showing (no `is-hidden` class). */
export function isModalOpen(root: HTMLElement): boolean {
  return !root.classList.contains("is-hidden")
}

/** Focus the opener when it is still mounted, else a sane fallback. */
function returnFocusTo(opener: HTMLElement | null): void {
  if (opener?.isConnected) {
    opener.focus()
    return
  }
  const body = globalThis.document?.body
  if (isElement(body)) {
    if (!body.hasAttribute("tabindex")) body.setAttribute("tabindex", "-1")
    body.focus({ preventScroll: true })
  }
}

/** First keyboard target inside the trap scope, if any. */
function firstFocusable(box: HTMLElement): HTMLElement | null {
  return focusablesIn(box)[0] ?? null
}

function ensureWired(root: HTMLElement, box: HTMLElement): ModalRecord {
  const existing = records.get(root)
  if (existing && existing.box === box) return existing
  if (existing) {
    root.removeEventListener("keydown", existing.keydown)
    root.removeEventListener("click", existing.click)
  }
  const record: ModalRecord = {
    box,
    opener: null,
    onClose: null,
    dismissOnScrim: true,
    dismissOnEscape: true,
    keydown: (event) => {
      focusTrap(record.box)(event)
      if (event.key === "Escape" && record.dismissOnEscape) {
        event.stopPropagation()
        closeModal(root)
      }
    },
    click: (event) => {
      if (record.dismissOnScrim && event.target === root) closeModal(root)
    },
  }
  root.addEventListener("keydown", record.keydown)
  root.addEventListener("click", record.click)
  records.set(root, record)
  return record
}

/**
 * Show an overlay: remember the opener, wire trap + scrim + Escape once,
 * reveal via the `is-hidden` class, and land focus on `initialFocus`
 * (else the first focusable in box).
 */
export function openModal(
  root: HTMLElement,
  opts: OpenModalOptions = {},
): void {
  const box = opts.box ?? root
  const record = ensureWired(root, box)
  record.box = box
  record.onClose = opts.onClose ?? null
  record.dismissOnScrim = opts.dismissOnScrim ?? true
  record.dismissOnEscape = opts.dismissOnEscape ?? true
  const active = globalThis.document?.activeElement
  record.opener = isElement(active) ? active : null
  root.classList.remove("is-hidden")
  const target = opts.initialFocus ?? firstFocusable(box)
  target?.focus()
}

/**
 * Hide an overlay: idempotent (a close for an already-hidden root is a
 * no-op with no notify and no focus move), then cleanup, then return-focus.
 */
export function closeModal(
  root: HTMLElement,
  opts: CloseModalOptions = {},
): void {
  const record = records.get(root)
  if (!isModalOpen(root)) return
  root.classList.add("is-hidden")
  const notify = opts.notify ?? true
  if (notify) {
    try {
      record?.onClose?.()
    } finally {
      if (record) record.onClose = null
    }
  } else if (record) {
    record.onClose = null
  }
  if (opts.returnFocus ?? true) {
    returnFocusTo(record?.opener ?? null)
    if (record) record.opener = null
  } else if (record) {
    record.opener = null
  }
}
