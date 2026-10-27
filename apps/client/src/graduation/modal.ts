/**
 * The shared modal shell (graduation_modules split): confirm and Hall of Fame
 * are the same plate with different contents. Open/close, focus trap,
 * scrim-click, Escape, and return-focus are the shared modal helper's
 * (ui/modal) — the shell only stamps the hidden root.
 */

export function modalShell(): {
  root: HTMLDivElement
  box: HTMLDivElement
  title: HTMLHeadingElement
  text: HTMLParagraphElement
  actions: HTMLDivElement
} {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.classList.add("is-hidden")
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
