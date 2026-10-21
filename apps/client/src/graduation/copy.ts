/**
 * Graduation copy and derivations (graduation_modules split): the coach-voice
 * strings and the stat/lineage/Hall labels the surfaces print. Moved verbatim
 * out of graduation.ts, which still re-exports every name here.
 */

import {
  type CreatureStats,
  effectiveTraits,
  type GameState,
  type GraduatePairReason,
  HEAD_START_AP_BONUS,
  HEAD_START_DAYS,
  lineagePerks,
  lineagePrestige,
  REFINED_INHERITANCE_FRACTION,
  type RetiredRecord,
} from "@apex/sim"
import { parentageLabel, traitCopy } from "./nursery-vm"

/** Coach-voice confirm copy (≤ 2 sentences, warm, never grimdark). */
export function confirmCopy(name: string): string {
  return `${name} has had a full career. Retire ${name} to the Hall of Fame and pass a stat floor to the next egg?`
}

/** The send-off confirmation button label. */
export function confirmLabel(name: string): string {
  return `Graduate ${name}`
}

/** The bloodline summary line for the egg screen. */
export function lineageSummary(state: GameState): string {
  const g = state.lineage.generation
  const prestige = lineagePrestige(state)
  return `Generation ${g} · Prestige ${prestige} · ${state.cupsWon} cup${state.cupsWon === 1 ? "" : "s"}`
}

/** One stat-floor summary, e.g. "HP 44 · ATK 8 · DEF 10 · SPD 6". */
export function floorSummary(floor: CreatureStats): string {
  return `HP ${floor.hp} · ATK ${floor.atk} · DEF ${floor.def} · SPD ${floor.spd}`
}

/** The perk badges active at a prestige rating (for the egg screen). */
export function perkLabels(state: GameState): string[] {
  const perks = lineagePerks(lineagePrestige(state))
  const out: string[] = []
  if (perks.warmBloodline) out.push("Warm bloodline: +10 starting bond")
  if (perks.establishedLine)
    out.push("Established line: +1 to every inherited stat")
  if (perks.refinedBlood) {
    out.push(
      `Refined blood: stronger parent passes ${REFINED_INHERITANCE_FRACTION}`,
    )
  }
  if (perks.championStable) {
    out.push(
      `Champion stable: +${HEAD_START_AP_BONUS} max AP for the first ${HEAD_START_DAYS} days`,
    )
  }
  return out
}

/** A Hall of Fame entry label, e.g. "Ember Drake · Champion · gen 0 · day 60". */
export function hallEntryLabel(record: RetiredRecord): string {
  return `${record.name} · Champion · gen ${record.generation} · day ${record.retiredOnDay}`
}

/**
 * The second Hall line: parentage plus carried traits. Founder records show
 * "Founder"; a bred line reads like "Child of Gen 0 × Gen 1 — Sturdy +2 HP".
 */
export function hallEntryMeta(record: RetiredRecord): string {
  const parentage = parentageLabel(record.parents)
  // Pre-v15 records migrate with `traits: []`; derive one for display so an
  // old Hall still reads meaningfully.
  const traits = effectiveTraits(record).map((id) => traitCopy(id).label)
  return traits.length > 0 ? `${parentage} — ${traits.join(" · ")}` : parentage
}

/** Coach-voice copy for a hatch the sim refused (the Nursery stays open). */
export function hatchFailureCopy(reason: GraduatePairReason): string {
  switch (reason) {
    case "invalid-species":
      return "Pick one of the parents' species."
    case "invalid-pair":
      return "That pairing is no longer in the Hall — pick again."
    case "no-creature":
      return "No champion is ready to retire."
    default:
      return "This champion can't retire yet — finish the career first."
  }
}
