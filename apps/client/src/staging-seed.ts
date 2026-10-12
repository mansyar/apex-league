/**
 * Visual DNA seed shared with the ranch view: same creature, same look,
 * in the arena and on the ranch.
 *
 * Stage-aware: evolution boosts the rolled base stats (+3/+2/+2/+1), which
 * would otherwise re-roll the individual's DNA mid-life. The juvenile's
 * boosted contributions are subtracted back out so the visual seed - and
 * therefore the individual - stays the one rolled at creation. If a later
 * stage adds another boost, extend the offset here.
 */
import { CHAMPION_STAT_BOOST, EVOLUTION_STAT_BOOST } from "@apex/sim"

export const visualSeedOf = (
  s: {
    hp: number
    atk: number
    def: number
    spd: number
  },
  stage: "baby" | "juvenile" | "champion" = "baby",
): number => {
  const off =
    stage === "juvenile"
      ? EVOLUTION_STAT_BOOST
      : stage === "champion"
        ? CHAMPION_STAT_BOOST // cumulative: juvenile + champion boost
        : { hp: 0, atk: 0, def: 0, spd: 0 }
  return (
    ((s.hp - off.hp) * 7 +
      (s.atk - off.atk) * 13 +
      (s.def - off.def) * 17 +
      (s.spd - off.spd) * 23) %
    2 ** 31
  )
}
