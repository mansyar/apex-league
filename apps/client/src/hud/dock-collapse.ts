/**
 * The command dock's collapse decision, as one pure seam. The dock condenses
 * on phone widths so the yard's action area stays visible; a width-class
 * default decides the start, an explicit head click overrides it, and the
 * override is session-held — nothing touches the save or storage, so a reload
 * re-derives the default.
 */

/** The kit's two width tiers (ui/kit.css), as one class per viewport width. */
export type ViewportWidthClass = "phone" | "tablet" | "desktop"

/** Same boundaries as the kit's responsive tiers: 767.98 and 1023.98. */
export function viewportWidthClass(viewportWidth: number): ViewportWidthClass {
  if (viewportWidth <= 767.98) return "phone"
  if (viewportWidth <= 1023.98) return "tablet"
  return "desktop"
}

/**
 * The collapsed default per width class: on phone widths the folded dock
 * leaves the yard to the scene; tablet and desktop keep the dock open, as
 * they always have.
 */
export function dockCollapsedByDefault(
  widthClass: ViewportWidthClass,
): boolean {
  return widthClass === "phone"
}

/** The session-held dock state the HUD shell reads and writes. */
export interface DockCollapseSession {
  /** Whether the dock is open right now. */
  dockOpen(): boolean
  /** An explicit head click: the resulting choice holds for the session. */
  toggle(): boolean
  /**
   * Re-derive the default when the viewport crosses a tier. A held user
   * choice wins over any default; with no choice yet, the new tier's
   * default applies.
   */
  onViewportChange(viewportWidth: number): void
}

export function createDockCollapseSession(
  viewportWidth: number,
): DockCollapseSession {
  let widthClass = viewportWidthClass(viewportWidth)
  /** Null until the player has clicked the dock head themselves. */
  let override: boolean | null = null
  const dockOpen = () => override ?? !dockCollapsedByDefault(widthClass)
  return {
    dockOpen,
    toggle() {
      override = !dockOpen()
      return dockOpen()
    },
    onViewportChange(next) {
      widthClass = viewportWidthClass(next)
    },
  }
}
