/**
 * Motion preference helpers.
 *
 * Two seams live here:
 * - `prefersReducedMotion(query)` — the injected seam: surfaces receive a
 *   media-query matcher so the reduced-motion decision stays testable and
 *   the caller never touches `matchMedia` directly.
 * - `prefersReducedMotionOs()` — the hardened OS read: environments that
 *   report BOTH `reduce` and `no-preference` (seen in an embedded
 *   Chromium) must not collapse playback into an instant dump. Both
 *   comparisons run on every call — calling matchMedia inside the function
 *   keeps a live read (deferred widget, standards mode). The window guard
 *   keeps headless test runs (bun test, no DOM) on the callback-only path.
 */

/** Minimal shape of a media query matcher (a subset of MediaQueryList). */
export interface MotionQuery {
  /** Whether the query currently matches. */
  matches: boolean
}

/**
 * True when the user asked for reduced motion. Call sites inject
 * `matchMedia("(prefers-reduced-motion: reduce)")` (or a stub in tests).
 */
export const prefersReducedMotion = (query: MotionQuery): boolean =>
  query.matches

export function prefersReducedMotionOs(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(prefers-reduced-motion: no-preference)").matches
  )
}
