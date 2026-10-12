import type { BattleResult } from "@apex/sim"

/** Lower-third subline: what the fight ended on, in announcer voice.
 * Shared verbatim by the spar results screen and the cup results screen. */
export function reasonLine(verdict: Readonly<BattleResult>): string {
  if (verdict.reason === "time") return "The clock ran out on this one."
  if (verdict.reason === "double_ko")
    return "A double down - both went out together."
  return "A knockout finish."
}

/**
 * The side key with the most remaining hp, resolved by the same strict-
 * greater scan both flows used inline (an exact tie falls to the first
 * entry of `finalHp`). Returns null when the record is empty — every-hp-
 * zero still resolves, matching the tie rule.
 */
export function winningSideKey(verdict: Readonly<BattleResult>): string | null {
  let best = -Infinity
  let key: string | null = null
  for (const [side, hp] of Object.entries(verdict.finalHp)) {
    if (hp > best) {
      best = hp
      key = side
    }
  }
  return key
}
