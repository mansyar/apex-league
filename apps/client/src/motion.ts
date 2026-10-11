/**
 * Motion preference seam. Surfaces receive an injected media-query matcher
 * so the reduced-motion decision stays testable and this module never
 * touches `matchMedia` directly.
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
