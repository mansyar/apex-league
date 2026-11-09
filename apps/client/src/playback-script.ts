/**
 * The playback script for one verdict, validated (live-cup Phase C).
 * `buildPlaybackScript` is a 1:1 event→step map; fail loud if the sim ever
 * grows an unmapped event kind instead of silently desyncing the HUD from
 * the log.
 */

import {
  type BattleResult,
  buildPlaybackScript,
  type PlaybackStep,
} from "@apex/sim"

export function scriptFor(
  verdict: Readonly<BattleResult>,
): readonly PlaybackStep[] {
  const steps = buildPlaybackScript(verdict.events)
  if (steps.length !== verdict.events.length) {
    throw new Error(
      `Playback script out of sync: ${steps.length} steps for ${verdict.events.length} events`,
    )
  }
  return steps
}
