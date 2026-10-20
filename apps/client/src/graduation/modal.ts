/**
 * The shared modal shell (graduation_modules split): confirm and Hall of Fame
 * are the same plate with different contents, plus the escape/backdrop/focus
 * wiring both use. Moved verbatim out of graduation.ts.
 */

import { focusTrap } from "../battleUI"

export function modalShell(): {
  root: HTMLDivElement
  box: HTMLDivElement
  title: HTMLHeadingElement
  text: HTMLParagraphElement
  actions: HTMLDivElement
} {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box"
  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  const text = document.createElement("p")
  text.className = "kit-modal-text"
  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  box.append(title, text)
  root.append(box)
  return { root, box, title, text, actions }
}

/** Wire a modal's escape/backdrop/trap behavior around an actions row. */
export function wireModal(
  root: HTMLElement,
  box: HTMLElement,
  close: () => void,
): {
  handleKeydown: (event: KeyboardEvent) => void
} {
  const trap = focusTrap(box)
  const handleKeydown = (event: KeyboardEvent): void => {
    trap(event)
    if (event.key === "Escape") {
      event.stopPropagation()
      close()
    }
  }
  root.addEventListener("keydown", handleKeydown)
  root.addEventListener("click", (event) => {
    if (event.target === root) close()
  })
  return { handleKeydown }
}

/**
 * The element that opened a surface, remembered so focus can return to it
 * when the surface closes — the same courtesy the spar overlay pays its chip.
 * Null when nothing focusable was active (a programmatic open).
 */
export function openerElement(): HTMLElement | null {
  const active = document.activeElement
  return active instanceof HTMLElement ? active : null
}
