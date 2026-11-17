/**
 * The cue → bundled-asset table (audio_foundation_20261017 FR2). Every
 * entry points at a CC0 file under `public/audio`, bundled with the client
 * so playback never touches the network. Filenames match CREDITS.md; the
 * `-calm` suffixed rows are the reduced-motion variants of their base cue.
 */
import type { CareCueId } from "./careCues"
import type { CueId, PresentationCueId } from "./cues"

/**
 * The union of every bundled cue: battle steps, ranch care events and
 * presentation events (20261117-polish-showcase FR-2).
 */
export type AnyCueId = CueId | CareCueId | PresentationCueId

/** Every cue id, listed so the URL table can be checked for completeness. */
export const CUE_IDS: readonly AnyCueId[] = [
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
  "care-feed",
  "care-rest",
  "care-treat",
  "care-play",
  "care-pet",
  "dawn-chime",
  "ui-navigate",
  "ui-navigate-calm",
  "ui-confirm",
  "ui-confirm-calm",
  "cup-transition",
  "cup-transition-calm",
  "evolution",
  "evolution-calm",
  "graduation",
  "graduation-calm",
] as const

/** Cue id → the Vite-served path of its bundled .ogg asset. */
export const cueUrl: Record<AnyCueId, string> = {
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
  "care-feed": "/audio/sfx/care-feed.ogg",
  "care-rest": "/audio/sfx/care-rest.ogg",
  "care-treat": "/audio/sfx/care-treat.ogg",
  "care-play": "/audio/sfx/care-play.ogg",
  "care-pet": "/audio/sfx/care-pet.ogg",
  "dawn-chime": "/audio/sfx/dawn-chime.ogg",
  "ui-navigate": "/audio/sfx/ui-navigate.ogg",
  "ui-navigate-calm": "/audio/sfx/ui-navigate-calm.ogg",
  "ui-confirm": "/audio/sfx/ui-confirm.ogg",
  "ui-confirm-calm": "/audio/sfx/ui-confirm-calm.ogg",
  "cup-transition": "/audio/sfx/cup-transition.ogg",
  "cup-transition-calm": "/audio/sfx/cup-transition-calm.ogg",
  evolution: "/audio/sfx/evolution.ogg",
  "evolution-calm": "/audio/sfx/evolution-calm.ogg",
  graduation: "/audio/sfx/graduation.ogg",
  "graduation-calm": "/audio/sfx/graduation-calm.ogg",
}
