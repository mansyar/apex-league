/**
 * Ladder page: current truth, four tiers with the Legend plateau as capstone.
 */

import { ruleRow } from "./common"

/** Ladder rules copy — current truth (four tiers, Legend is the plateau). */
const LADDER_RULES: ReadonlyArray<readonly [string, string]> = [
  ["Cup points", "Champion 3 · Runner-up 2 · Semifinal 1."],
  [
    "Bronze",
    "III → II at 6 points, → I at 12. Bank past 12 and your next cup is the Promotion Cup — win it to jump to Silver.",
  ],
  [
    "Silver",
    "III → II at 18 points, → I at 24. Bank past 24 and your next cup is the Promotion Cup — win it to jump to Gold.",
  ],
  [
    "Gold",
    "III → II at 30 points, → I at 36. Bank past 36 and the Legend gate opens.",
  ],
  [
    "The plateau",
    "Legend has no ceiling. A Legend cup win stacks extra action points and collects a title for the rank plate.",
  ],
]

export function buildLadderRules(panel: HTMLElement): void {
  for (const [term, copy] of LADDER_RULES) panel.append(ruleRow(term, copy))
}
