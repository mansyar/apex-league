/**
 * The reduced-motion path (FR11, NFR-4): the whole log at once, no timers,
 * with the arena landing on its final posture. Kept beside the pacing math
 * so the driver module stays under the client's size cap.
 */

import type { BattleEvent, PlaybackStep } from "@apex/sim"

/** Speak every line and show every step instantly, in order. */
export function dumpInstant(
  events: readonly BattleEvent[],
  steps: readonly PlaybackStep[],
  onLine: (line: string) => void,
  onStep: (step: PlaybackStep, instant: boolean) => void,
): void {
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    // The last step stands in for any event the script could not map, so
    // the arena still ends on a settled pose.
    const step = steps[i] ?? steps[steps.length - 1]
    if (event) onLine(event.line)
    if (step) onStep(step, true)
  }
}
