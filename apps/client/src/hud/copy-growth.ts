import {
  CHAMPION_EVOLUTION_DAY,
  CHAMPION_HINT_DAY,
  type Creature,
  EVOLUTION_DAY,
  EVOLUTION_HINT_DAY,
  type GameState,
  GRADUATION_HINT_DAY,
  getBranch,
  getMove,
  getSpecies,
  hatchDayOf,
  LEGACY_BRANCH,
  MOVE_TIER3_DAYS,
  MOVE_TIER4_DAYS,
  requiredTierDays,
} from "@apex/sim"
import { ELEMENT_LABELS } from "../handbook/common"

/**
 * The growth half of the HUD's copy engine: the fresh-unlock line, the
 * growth and graduation hints, the evolution/graduation moments, the stage
 * labels and the bloodline's family name. Pure (state → string) functions —
 * no DOM, no wiring.
 */

/**
 * The fresh-unlock coach line: while the trained-days counter sits exactly
 * on a tier threshold, the coach names the move that just became legal.
 * Under training and condition copy in precedence — a quiet morning only.
 * The day-6 gate opens the whole wider pool at once, so the line lists each
 * move rather than pretending there is one.
 */
export function unlockCallout(creature: Creature): string {
  const days = creature.trainingDays
  if (days !== MOVE_TIER3_DAYS && days !== MOVE_TIER4_DAYS) {
    return ""
  }
  const species = getSpecies(creature.speciesId)
  if (!species) return ""
  const names = species.kit.flatMap((id, index) =>
    requiredTierDays(index, creature.stage) === days
      ? [getMove(id)?.displayName ?? id]
      : [],
  )
  if (names.length === 0) return ""
  const tail =
    days === MOVE_TIER3_DAYS
      ? ` Train ${MOVE_TIER4_DAYS - days} more days for the next tier.`
      : ""
  const lead = names.length === 1 ? "New move available" : "New moves available"
  return `${lead}: ${names.join(", ")}.${tail}`
}

import { romanNumeral, stageLabel } from "../ui/labels"
import { branchRevealLine } from "./copy-branch"

/**
 * Shared HUD display labels: stageLabel and romanNumeral are single-sourced
 * in ui/labels (coach_knowledge_20261016) — re-exported here so the copy
 * surface keeps one import path.
 */
export { romanNumeral, stageLabel } from "../ui/labels"

/**
 * The bloodline's display name: the founder is unnumbered, every successor
 * carries its Roman numeral (generation 1 → "<Name> II"), so a dynasty reads
 * as one family rather than a list of strangers.
 */
export function familyName(name: string, generation: number): string {
  return generation > 0 ? `${name} ${romanNumeral(generation + 1)}` : name
}

/**
 * The growth hint (care track): from the hinted day on, the coach
 * occasionally teases that the baby is maturing — without disclosing the
 * threshold. Priority sits below unlock news and condition coach lines,
 * above flavor: raising is the game, but urgent care still leads.
 *
 * The thresholds read the pet's OWN age (save v23): a pet hatched late grows
 * at its own pace, so the hint follows `creature.ageDays` and never the
 * world day.
 */
export function growthHint(creature: Creature): string {
  const age = creature.ageDays
  if (creature.stage === "champion") return ""
  if (creature.stage === "juvenile") {
    // The champion tease (champion track): same direction-only contract —
    // it points at the bond and the cups without naming the thresholds.
    if (age < CHAMPION_HINT_DAY) return ""
    if (age < CHAMPION_EVOLUTION_DAY) {
      return `${creature.name} is growing into something grand — keep the bond strong and win another cup together.`
    }
    // Past the gate age and still juvenile: the climb is still open, so
    // the hint keeps pointing (discovered-not-hidden — never a dead end).
    return `${creature.name} is ready to become a champion — keep the bond strong and win another cup.`
  }
  if (age < EVOLUTION_HINT_DAY || age >= EVOLUTION_DAY) return ""
  return `${creature.name} is filling out — keep the routine steady and one morning soon it will surprise you.`
}

/**
 * The graduation hint (legacy track): from the hinted day on, a champion
 * gets one direction-only coach line about the send-off — what graduating
 * does, never a threshold or a demand. The threshold reads the pet's own age.
 */
export function graduationHint(creature: Creature): string {
  if (creature.stage !== "champion") return ""
  if (creature.ageDays < GRADUATION_HINT_DAY) return ""
  return `${creature.name} has had a full career — graduating passes a stat floor to the next egg.`
}

/**
 * The evolution-moment coach line: what changed, in stat numbers, and the
 * form that came in with it. Shown once by the HUD right after the ceremony,
 * ahead of the routine status (FR-5: the morning names the form; nobody is
 * asked to choose). The numbers are the boost the earned branch actually
 * applied at this gate, so a real form announces its own leap and a legacy or
 * unbranched creature keeps the old pinned numbers. Two sentences, always.
 */
export function evolveCallout(creature: Creature): string {
  const branch = getBranch(creature.branch ?? LEGACY_BRANCH.id) ?? LEGACY_BRANCH
  const b =
    creature.stage === "champion" ? branch.championBoost : branch.juvenileBoost
  return `Evolution! ${creature.name} grew into a ${stageLabel(creature.stage)} — +${b.hp} HP · +${b.atk} ATK · +${b.def} DEF · +${b.spd} SPD. ${branchRevealLine(creature)}`
}

/**
 * The graduation send-off coach line (legacy track): names the retiree, the
 * generation the bloodline just started, and the successor. Warm, proud —
 * a hand-off, never a loss.
 */
export function graduationCallout(
  retireeName: string,
  successorName: string,
  generation: number,
): string {
  return `${retireeName} graduated to the Hall of Fame — generation ${generation} begins with ${successorName}.`
}

/**
 * The graduation moment's ticker line: the send-off always leads, and on a
 * drifted hatch the drift beat rides along in the same breath, so the
 * legacy moment keeps both lines. `driftedLine` is the hatch-day
 * `driftCallout` output ("" when the hatch didn't drift).
 */
export function graduationTickerLine(
  retireeName: string,
  successorName: string,
  generation: number,
  driftedLine: string,
): string {
  const sendOff = graduationCallout(retireeName, successorName, generation)
  return driftedLine ? `${sendOff} ${driftedLine}` : sendOff
}

/** The element's display name ("Fire") — the handbook's single label table. */
function elementLabel(element: string): string {
  return ELEMENT_LABELS[element] ?? element
}

/**
 * Coach voice for a drifted hatch (FR-6): a plain statement of what
 * happened, on the hatch day only. The hatch day comes from the sim's own
 * `hatchDayOf` — a successor hatches on the day its predecessor graduated,
 * and a founder was chosen on day 1 — so the announcement can never linger
 * into a later day.
 */
export function driftCallout(
  creature: Creature,
  lineage: GameState["lineage"],
  day: number,
): string {
  if (!creature.affinity) return ""
  if (day !== hatchDayOf(lineage)) return ""
  const secondary = elementLabel(creature.affinity)
  return `${creature.name} hatched with a ${secondary} streak beneath its ${elementLabel(creature.element)} nature — strong hits the ${secondary} resists land even instead.`
}
