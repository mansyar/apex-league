import { pickDebriefCopy } from "../morning-after/copy"
import type { MorningAfterDerivation } from "../morning-after/derive"

/**
 * The morning-after debrief's render seam (postcup_morning_after FR-6):
 * the ticker's one line for the ritual day is composed HERE and nowhere
 * else — `pickDebriefCopy` is the only source (FR-10), so the amplifier's
 * copy overrides the class's copy exactly as the copy layer decides, and
 * this module adds only the creature's name token and the one-say-per-day
 * gate the ticker needs.
 */

/** The ritual day's debrief line for the ticker, with `{name}` resolved. */
export function morningAfterDebriefLine(
  derivation: MorningAfterDerivation,
  name: string,
): string {
  return pickDebriefCopy(derivation, { name }).text
}

/** What one update pass should do with the debrief: say the line (once per
 * ritual day) and remember the day, or leave the ticker's own chain alone. */
export interface DebriefSay {
  /** The line to say this update, or null when the ticker keeps its own. */
  readonly line: string | null
  /** The day latch to hold after this update. */
  readonly nextDay: number | null
}

/**
 * The one-say-per-day gate: the banked derivation leads the ticker on the
 * first update that sees it during a given sim day; every later update that
 * day (and every day without a banked derivation) stays silent — the ticker
 * holds the line until its next routine update, and the night settle drops
 * the banked derivation, so nothing persists (FR-6, FR-9).
 */
export function morningAfterDebriefGate(
  saidDay: number | null,
  day: number,
  derivation: MorningAfterDerivation | null,
  name: string,
): DebriefSay {
  if (derivation === null || saidDay === day) {
    return { line: null, nextDay: saidDay }
  }
  return { line: morningAfterDebriefLine(derivation, name), nextDay: day }
}
