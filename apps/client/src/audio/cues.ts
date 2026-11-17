/**
 * The pure event→cue mapping for battle-arena sound (audio_foundation_20261017
 * FR1) and presentation sound (20261117-polish-showcase FR-1). The table is
 * DOM-free and sim-agnostic: it reads only the handful of playback-step /
 * presentation-event fields a cue needs, so bun tests never touch audio
 * hardware and the sim can evolve its step shape without breaking this file.
 *
 * Mute, the calm-mix selection and silent instant dumps are decided here, not
 * in the player, so the whole audible-behavior contract stays a testable pure
 * function. The player layer (player.ts) only executes what this table allows.
 */

/**
 * One bundled sound, keyed by the filename stem under `public/audio/sfx`
 * (or `jingles` for verdicts — the player resolves the folder).
 */
export type CueId =
  | "melee-hit"
  | "melee-hit-calm"
  | "hit-plate"
  | "hit-plate-calm"
  | "fire"
  | "fire-calm"
  | "ko"
  | "ko-bell"
  | "verdict-0"
  | "verdict-1"

/** The gating flags the mapping reads (single source: the audio settings). */
export interface CueOptions {
  /** The persisted mute toggle — silenced means no cue at all. */
  readonly muted: boolean
  /** Reduced motion → the calmer variant set (quieter/softer cues). */
  readonly reducedMotion: boolean
}

/**
 * The slice of a playback step the mapping reads. Structural on purpose:
 * `PlaybackStep` from `@apex/sim` satisfies it without an import.
 */
export interface CueStep {
  /** The step kind (`melee`, `projectile`, `impact`, `down`, `judge`, ...). */
  readonly kind: string
  /** Whether the blow landed (where relevant). */
  readonly hit?: boolean
  /** True on a down step that ends the fight. */
  readonly ko?: boolean
}

/**
 * The cue for one playback step, or `null` when the beat stays silent.
 *
 * Rules (see cues.test.ts for the contract):
 * - muted beats everything: no cue at all
 * - whiffs are silent (no whoosh asset in the bundle yet)
 * - projectile launches fire regardless of the eventual hit — the launch
 *   itself is the audible moment; the landing is the `impact` step's cue
 * - only a terminal `ko` down step gets the KO thud
 * - reduced motion swaps in the calm variant where one exists; KOs and
 *   verdicts keep their full cues (rare punctuation, not repeated impacts)
 */
export function cueForStep(step: CueStep, options: CueOptions): CueId | null {
  if (options.muted) return null
  const calm = options.reducedMotion
  switch (step.kind) {
    case "melee":
      if (!step.hit) return null
      return calm ? "melee-hit-calm" : "melee-hit"
    case "projectile":
      return calm ? "fire-calm" : "fire"
    case "impact":
      if (!step.hit) return null
      return calm ? "hit-plate-calm" : "hit-plate"
    case "down":
      return step.ko === true ? "ko" : null
    case "judge":
      return "verdict-0"
    default:
      return null
  }
}

/**
 * Presentation cues (20261117-polish-showcase FR-1): UI navigation and
 * confirmation, cup stage transitions, and evolution/graduation milestones.
 * Each has a `-calm` reduced-motion variant.
 *
 * This stays a separate union from `CueId` until Phase 2 bundles and wires
 * the matching URLs: `cueUrls.ts` holds an exhaustive `Record<AnyCueId, string>`
 * over `CueId`, so widening that union here would fail the typecheck before
 * the assets exist. Phase 2 folds these ids into `AnyCueId` and `cueUrl`.
 */
export type PresentationCueId =
  | "ui-navigate"
  | "ui-navigate-calm"
  | "ui-confirm"
  | "ui-confirm-calm"
  | "cup-transition"
  | "cup-transition-calm"
  | "evolution"
  | "evolution-calm"
  | "graduation"
  | "graduation-calm"

/** A presentation sound event: a UI action, a cup beat or a milestone. */
export type PresentationCueEvent =
  | { readonly kind: "navigate" }
  | { readonly kind: "confirm" }
  | { readonly kind: "cup-transition" }
  | { readonly kind: "evolution" }
  | { readonly kind: "graduation" }

/**
 * Presentation cue gates. Extends the shared `CueOptions` (still satisfied by
 * the persisted settings) with `instant`: reduced-motion dumps fire every
 * beat at once, so they stay silent rather than stacking cues.
 */
export interface PresentationCueOptions extends CueOptions {
  /** A reduced-motion instant dump — no cue at all. */
  readonly instant?: boolean
}

/**
 * The cue for one presentation event, or `null` when the beat stays silent.
 *
 * Rules (see cues.test.ts for the contract):
 * - mute and instant dumps beat everything: no cue at all
 * - reduced motion swaps in the calm variant of the event's cue
 * - an unknown kind (from persisted/replayed data) goes silent, never throws
 */
export function cueForPresentationEvent(
  event: PresentationCueEvent,
  options: PresentationCueOptions,
): PresentationCueId | null {
  if (options.muted || options.instant) return null
  const calm = options.reducedMotion
  switch (event.kind) {
    case "navigate":
      return calm ? "ui-navigate-calm" : "ui-navigate"
    case "confirm":
      return calm ? "ui-confirm-calm" : "ui-confirm"
    case "cup-transition":
      return calm ? "cup-transition-calm" : "cup-transition"
    case "evolution":
      return calm ? "evolution-calm" : "evolution"
    case "graduation":
      return calm ? "graduation-calm" : "graduation"
    default:
      // Runtime events can come from persisted/replayed data, so an unknown
      // kind must go silent rather than throw.
      return null
  }
}
