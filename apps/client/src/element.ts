import type { Element } from "@apex/sim"

/**
 * Single source of truth for element identity in the broadcast kit:
 * one crest glyph and one hue per element, one shared fallback.
 * Previously these tables lived three times (battleHud crests, staging
 * projectile palette, cup bracket hues) with mismatched fallbacks.
 */

/** Crest glyphs as inline SVG (currentColor inherits the crest block). */
export const ELEMENT_GLYPHS: Record<Element, string> = {
  fire: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4-.2 6.8-1.6 8.4C9 9.6 8.4 8.6 8.3 7 6.2 9 5 11.6 5 14a7 7 0 0 0 14 0c0-4.6-4-8.4-7-12zm0 18a4 4 0 0 1-4-4c0-1.6.8-3 2-4.3.3 1 .9 1.9 1.9 2.5.2-1.4.7-2.6 1.4-3.7C14.6 12 16 13.8 16 16a4 4 0 0 1-4 4z"/></svg>',
  water:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2s6.5 7.8 6.5 12.2A6.5 6.5 0 0 1 12 21a6.5 6.5 0 0 1-6.5-6.8C5.5 9.8 12 2 12 2zm0 15.5a3 3 0 0 0 3-3c0-1.4-1.2-3.4-3-5.6-1.8 2.2-3 4.2-3 5.6a3 3 0 0 0 3 3z"/></svg>',
  plant:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22v-8m0 0C12 8.5 8.6 5 4 5c0 5.5 3.5 9 8 9zm0 0c0-4 3.2-6.8 8-6.8 0 4.6-3.2 6.8-8 6.8z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  electric:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  earth:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 20 8.5 8.5l3.8 6.2L15 10l7 10H2z"/></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 8h10.5a2.5 2.5 0 1 0-2.4-3.2M3 12h15.5a3 3 0 1 1-2.9 3.8M3 16h8.5a2.2 2.2 0 1 1-2.1 2.8"/></svg>',
}

/** Hue per element — matches the arena projectile palette (staging). */
export const ELEMENT_HUES: Record<Element, number> = {
  fire: 18,
  water: 205,
  plant: 110,
  electric: 50,
  earth: 28,
  wind: 165,
}

/** Shared fallback hue for unknown elements (was 40 in cup.ts, 200 elsewhere). */
export const ELEMENT_FALLBACK_HUE = 200

/** Crest glyph for an element, falling back to the fire crest. */
export const crestGlyph = (element: string): string =>
  ELEMENT_GLYPHS[element as Element] ?? ELEMENT_GLYPHS.fire

/** Hue for an element, falling back to the shared fallback hue. */
export const elementHue = (element: string): number =>
  ELEMENT_HUES[element as Element] ?? ELEMENT_FALLBACK_HUE
