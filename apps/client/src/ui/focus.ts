/**
 * Focus-order helpers shared by every modal overlay.
 *
 * The scrim hides the page, so focus wandering outside a dialog is invisible
 * to the player (and a keyboard-only player loses their place entirely).
 * `focusTrap` keeps Tab/Shift+Tab inside the dialog and `focusablesIn`
 * ignores disabled controls and anything the layout has hidden.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ")

/** True when the element takes up space (hidden overlays and `display:none` rows do not). */
function isFocusVisible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0
}

/** Everything inside `container` that can currently receive keyboard focus, in DOM order. */
export function focusablesIn(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ].filter(isFocusVisible)
}

/**
 * Where Tab should land, or null when the browser's default move is already
 * correct. Pure so the wrap rules stay testable without a DOM.
 */
export function trapTarget(
  list: readonly HTMLElement[],
  active: Element | null,
  backwards: boolean,
): HTMLElement | null {
  const first = list[0]
  const last = list[list.length - 1]
  if (!first || !last) return null
  const index = active === null ? -1 : list.indexOf(active as HTMLElement)
  // Focus escaped (backdrop click, removed control): pull it back in.
  if (index < 0) return backwards ? last : first
  if (backwards) return index === 0 ? last : null
  return index === list.length - 1 ? first : null
}

/**
 * Keep Tab cycling inside a dialog's focusable elements. Attach the returned
 * handler as a keydown listener on the dialog root.
 */
export function focusTrap(
  container: HTMLElement,
): (event: KeyboardEvent) => void {
  return (event) => {
    if (event.key !== "Tab") return
    const target = trapTarget(
      focusablesIn(container),
      document.activeElement,
      event.shiftKey,
    )
    if (!target) return
    event.preventDefault()
    target.focus()
  }
}
