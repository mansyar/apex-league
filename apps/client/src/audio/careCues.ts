import type { MorningAfterClass } from "../morning-after/derive"

/**
 * The pure event-cue mapping for ranch care sound (ranch_rituals_20261018
 * FR5). Mirrors the battle-side cues.ts contract: DOM-free, sim-agnostic,
 * muted beats everything, and the whole audible-behavior table is a tested
 * pure function. The player layer executes only what this table allows.
 */

/**
 * One bundled sound, keyed by the filename stem under `public/audio/sfx`.
 * Care cues are one-shot punctuation (a few per day at most), so unlike
 * the repeated battle impacts they ship no `-calm` reduced-motion
 * variants - reduced motion keeps the full cues, matching the KO/verdict
 * precedent in cues.ts.
 */
export type CareCueId =
  | "care-feed"
  | "care-rest"
  | "care-treat"
  | "care-play"
  | "care-pet"
  | "dawn-chime"

/** The gating flags the mapping reads (single source: the audio settings). */
export interface CueOptions {
  /** The persisted mute toggle - silenced means no cue at all. */
  readonly muted: boolean
  /** Reduced motion - care cues keep their full variants (see above). */
  readonly reducedMotion: boolean
}

/** A ranch sound event: a care action, a pet reaction (optionally stamped
 * with the morning-after's class on the ritual day), or day advance. */
export type CareCueEvent =
  | { kind: "care"; action: "feed" | "rest" | "treat" | "play" }
  | { kind: "pet"; morningAfter?: MorningAfterClass }
  | { kind: "dawn" }

/** The four care actions, each bound to its bundled cue. A record rather
 * than a template literal so a new action cannot compile without a cue. */
const CARE_CUE: Record<"feed" | "rest" | "treat" | "play", CareCueId> = {
  feed: "care-feed",
  rest: "care-rest",
  treat: "care-treat",
  play: "care-play",
}

/**
 * The morning-after's pet chirp (postcup_morning_after FR-8): the ritual
 * day re-voices the pet with a cue whose intensity follows the day's
 * outcome — the champion's morning romps, the gatekeep morning gets the
 * soothing balm, the ordinary exit settles, the forfeit keeps a low,
 * grounded sound. Every entry is an already-bundled care asset: the
 * remap adds no new files (NFR-4) and the record keeps a class from
 * compiling without a cue.
 */
const MORNING_AFTER_PET_CUE: Record<MorningAfterClass, CareCueId> = {
  title: "care-play",
  gatekeep: "care-treat",
  exit: "care-rest",
  withdrawn: "care-feed",
}

/** The cue for one ranch event, or `null` when the beat stays silent. */
export function careCueForEvent(
  event: CareCueEvent,
  options: CueOptions,
): CareCueId | null {
  if (options.muted) return null
  switch (event.kind) {
    case "care":
      return CARE_CUE[event.action]
    case "pet":
      return event.morningAfter
        ? MORNING_AFTER_PET_CUE[event.morningAfter]
        : "care-pet"
    case "dawn":
      return "dawn-chime"
    default:
      // Runtime events come from persisted/replayed data, so an unknown
      // kind must go silent rather than throw.
      return null
  }
}
