/**
 * The cue → bundled-asset table (audio_foundation_20261017 FR2). Every
 * entry points at a CC0 file under `public/audio`, bundled with the client
 * so playback never touches the network. Filenames match CREDITS.md; the
 * `-calm` suffixed rows are the reduced-motion variants of their base cue.
 */
import type { CueId } from "./cues"

/** Every cue id, listed so the URL table can be checked for completeness. */
export const CUE_IDS: readonly CueId[] = [
  "melee-hit",
  "melee-hit-calm",
  "hit-plate",
  "hit-plate-calm",
  "fire",
  "fire-calm",
  "ko",
  "ko-bell",
  "verdict-0",
  "verdict-1",
] as const

/** Cue id → the Vite-served path of its bundled .ogg asset. */
export const cueUrl: Record<CueId, string> = {
  "melee-hit": "/audio/sfx/melee-hit-0.ogg",
  "melee-hit-calm": "/audio/sfx/melee-hit-calm.ogg",
  "hit-plate": "/audio/sfx/hit-plate-0.ogg",
  "hit-plate-calm": "/audio/sfx/hit-plate-calm.ogg",
  fire: "/audio/sfx/fire-0.ogg",
  "fire-calm": "/audio/sfx/fire-calm.ogg",
  ko: "/audio/sfx/ko-0.ogg",
  "ko-bell": "/audio/sfx/ko-bell.ogg",
  "verdict-0": "/audio/jingles/verdict-0.ogg",
  "verdict-1": "/audio/jingles/verdict-1.ogg",
}
