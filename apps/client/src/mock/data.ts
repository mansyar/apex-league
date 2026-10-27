/**
 * Mock data and node helpers (mock_modules split): the canned creature values,
 * the element/starter/tier/motion tables, and the two el/figure builders the
 * sections share. Moved verbatim out of mock.ts.
 */

import type { CreatureConditions } from "@apex/sim"

export const el = (
  tag: string,
  className?: string,
  text?: string,
): HTMLElement => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export const figure = (caption: string, ...nodes: Node[]): HTMLElement => {
  const item = el("figure", "show-item kit-line")
  const row = el("div", "show-row")
  row.append(...nodes)
  item.append(row, el("figcaption", undefined, caption))
  return item
}

/** Canned trained stats for the lower-third. */
export const cannedStats: Array<[string, number, number]> = [
  ["hp", 84, 4],
  ["atk", 18, 2],
  ["def", 15, 3],
  ["spd", 12, 6],
]

/** Canned condition values for the lower-third bars. */
export const cannedConditions: Array<[keyof CreatureConditions, number]> = [
  ["hunger", 72],
  ["energy", 58],
  ["health", 100],
  ["mood", 80],
  ["bond", 64],
]

/** Every element the crest row shows. */
export const CREST_ELEMENTS = [
  "fire",
  "water",
  "plant",
  "electric",
  "earth",
  "wind",
] as const

/** The starter overlay's three demo cards. */
export const STARTER_CARDS = [
  ["fire", "Fire Drake", "Runs hot on the gauge."],
  ["plant", "Plant Ox", "Grows on the routine."],
  ["water", "Water Axolotl", "Keeps it cool."],
] as const

/** The responsive tier ladder. */
export const TIER_ROWS = [
  ["base", "phone portrait — HUD plates stack, dock collapsed by default"],
  ["≥480px", "large phone / small tablet — plates may expand"],
  ["≥768px", "tablet portrait — two-column arrangements"],
  ["≥1024px", "tablet landscape — near-full layouts"],
  ["≥1200px", "desktop — the pre-responsive corner-pinned layout"],
] as const

/** The motion notes list. */
export const MOTION_NOTES = [
  [
    "Entrance settle",
    " — clusters slide in from their anchor edge with a slight overshoot, staggered ~60ms (score bug → lower-third → dock), on load and screen returns.",
  ],
  [
    "AP spend",
    " — the spent pip flashes out (scale + fade), the remainder re-seat. Bonus pips (cup win) cut in with a chevron notch and glow once.",
  ],
  [
    "Bar change feedback",
    " — a delta ≥ 2 flashes the fill and pins a small +N/−N chip on the value for ~1.2s; low bars (≤ 25) pulse their label.",
  ],
  [
    "Ticker",
    " — status lines swap in with a short slide-settle; priority chain unchanged (training → condition → unlock → growth hint → flavor).",
  ],
  [
    "Hover / press",
    " — buttons lift 1px with a warm keyline brighten on hover; press squashes 0.98. CTA idles with a soft glow when AP is unspent late in the day.",
  ],
  [
    "Reduced motion",
    " — every animation collapses to an opacity crossfade or nothing, honoring the saved setting and prefers-reduced-motion.",
  ],
] as const
