/**
 * Shared inline-SVG icons for the broadcast kit's surfaces (care glyphs,
 * condition glyphs, chrome icons). All icons inherit `currentColor` and
 * carry `aria-hidden` so the accessible name comes from the label text.
 */

const svg = (body: string, fill = "currentColor"): string =>
  `<svg viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">${body}</svg>`

const stroked = (body: string, width = 2): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

/** Care-action glyphs (command dock buttons). */
export const icons = {
  feed: svg(
    '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M8 8c0-1.2.8-1.6.8-2.6M12 8c0-1.2.8-1.6.8-2.6M16 8c0-1.2.8-1.6.8-2.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  ),
  rest: svg('<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>'),
  treat: svg('<path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z"/>'),
  play: svg(
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 9.5c4 2 9 2 13 0M5.5 14.5c4-2 9-2 13 0" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  ),
  train: svg('<path d="M2 9h3v6H2zM19 9h3v6h-3zM5 10h14v4H5z"/>'),

  /** Chrome icons. */
  trophy: stroked(
    '<path d="M8 21h8M12 17v4M17 4H7v4a5 5 0 0 0 10 0V4zM7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5"/>',
  ),
  spar: svg(
    '<path d="M6 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16.5" cy="12" r="2.5" fill="currentColor"/>',
  ),
  /** The CTA's forward arrow (gold plate, dark ink). */
  arrow: stroked('<path d="M5 12h13M12 6l6 6-6 6"/>', 2.4),
  /** Collapse toggle chevron (points down while expanded; CSS rotates it). */
  chevron: stroked('<path d="M6 9l6 6 6-6"/>', 2.4),

  /** Condition glyphs (creature lower-third bars). */
  hunger: svg(
    '<path d="M12 7c-3.5-1-7 1.5-7 6 0 4 2.5 8 5 8 1 0 1.4-.5 2-.5s1 .5 2 .5c2.5 0 5-4 5-8 0-4.5-3.5-7-7-6z"/><path d="M12 6c0-2 1-3 3-3.5.3 2-.8 3.5-3 3.5z"/>',
  ),
  energy: svg('<path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2z"/>'),
  health: svg(
    '<path d="M12 21S4.5 16.4 2.9 11.9A5.2 5.2 0 0 1 12 7a5.2 5.2 0 0 1 9.1 4.9C19.5 16.4 12 21 12 21z"/>',
  ),
  mood: svg(
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 13.5a4.5 4.5 0 0 0 7 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="9.5" r="1.3"/><circle cx="15" cy="9.5" r="1.3"/>',
  ),
  bond: svg(
    '<path d="M12 21S4.5 16.4 2.9 11.9A5.2 5.2 0 0 1 12 7a5.2 5.2 0 0 1 9.1 4.9C19.5 16.4 12 21 12 21z"/><path d="M17.5 3.5c1.8 0 3 1.4 3 3 0 2.4-3 4.5-3 4.5s-3-2.1-3-4.5c0-1.6 1.2-3 3-3z" opacity="0.55"/>',
  ),
} as const
