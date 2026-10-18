/**
 * The real cue player seam (audio_foundation_20261017 FR1/FR3): plays a
 * bundled .ogg through an HTMLAudioElement. Imperative by design — the
 * pure gating logic lives in cues.ts/player.ts and is test covered; this
 * file only wires the browser audio primitives, so it is verified
 * manually (workflow: rendering/asset wiring tier).
 *
 * Playback strategy: one preloaded base element per cue, cloned per play
 * so overlapping steps (fast-forward chains of hits) each get their own
 * voice. Every play failure is swallowed — audio must never break the
 * battle (silent no-op fallback, matching the player contract).
 */

import type { AnyCueId } from "./cueUrls"
import { cueUrl } from "./cueUrls"

/** One preloaded source per cue, created lazily on first play. */
const sources = new Map<AnyCueId, HTMLAudioElement>()

/** Playback loudness for all cues (jingles included — one calm mix). */
const CUE_VOLUME = 0.6

export function playCue(cue: AnyCueId): void {
  let source = sources.get(cue)
  if (!source) {
    source = new Audio(cueUrl[cue])
    source.preload = "auto"
    sources.set(cue, source)
  }
  const voice = source.cloneNode(true) as HTMLAudioElement
  voice.volume = CUE_VOLUME
  // Autoplay policy or a gone-away tab can reject play(); both mean
  // silence, never an error on the battle path.
  void voice.play().catch(() => {})
}
