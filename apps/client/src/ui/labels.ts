/**
 * Shared HUD display labels (coach_knowledge_20261016 review): the
 * life-stage name and the generation numeral alphabet live here so the
 * HUD nameplate and the creature-detail modal read from one source of
 * truth. Pure copy helpers — no DOM.
 */

import type { Creature } from "@apex/sim"

/** Life-stage display name for the nameplate badge. */
export function stageLabel(stage: Creature["stage"]): string {
  if (stage === "juvenile") return "Juvenile"
  if (stage === "champion") return "Champion"
  return "Baby"
}

/** Roman tally symbols, descending — the generation numeral alphabet. */
const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
]

/**
 * A generation as a Roman numeral (1 → "I", 2 → "II"). Out-of-range or
 * non-integer input falls back to "#n" so the plate never renders "NaN".
 */
export function romanNumeral(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return `#${n}`
  let rest = n
  let out = ""
  for (const [value, symbol] of ROMAN) {
    while (rest >= value) {
      out += symbol
      rest -= value
    }
  }
  return out
}
