/**
 * Visual DNA seed shared with the ranch view: same creature, same look,
 * in the arena and on the ranch.
 *
 * Stage-aware: evolution adds the earned branch's pinned boost to the rolled
 * base stats, which would otherwise re-roll the individual's DNA mid-life.
 * That boost is subtracted back out (`evolutionBoost` owns the tables) so the
 * visual seed - and therefore the individual - stays the one rolled at
 * creation, whichever form it grows into.
 */
import { evolutionBoost } from "@apex/sim"

export const visualSeedOf = (
  s: {
    hp: number
    atk: number
    def: number
    spd: number
  },
  stage: "baby" | "juvenile" | "champion" = "baby",
  branch: string | null = null,
): number => {
  const off = evolutionBoost(stage, branch)
  return (
    ((s.hp - off.hp) * 7 +
      (s.atk - off.atk) * 13 +
      (s.def - off.def) * 17 +
      (s.spd - off.spd) * 23) %
    2 ** 31
  )
}
