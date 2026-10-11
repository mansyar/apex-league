/**
 * Hardened OS reduced-motion read (2026-10-10 spec revision): environments
 * that report BOTH `reduce` and `no-preference` (seen in an embedded
 * Chromium) must not collapse playback into an instant dump. Both
 * comparisons run on every call — calling matchMedia inside the function
 * keeps a live read (deferred widget, standards mode). The window guard
 * keeps headless test runs (bun test, no DOM) on the callback-only path.
 */
export function prefersReducedMotionOs(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(prefers-reduced-motion: no-preference)").matches
  )
}
