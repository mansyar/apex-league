/**
 * The HUD's copy engine: every coach-voice line the HUD can say, as pure
 * (state → string) functions. No DOM, no wiring — the plates/dock/settings
 * modules and the hud root consume these, and the mock page reuses them so
 * its copy can never drift from the live HUD's.
 *
 * Split by domain: `copy-care` (care, condition, stat and training copy plus
 * the ticker precedence), `copy-growth` (growth, graduation and stage copy)
 * and `copy-cup` (the cup/ladder onboarding table). This file is the
 * re-export surface every existing importer already uses.
 */
export {
  breakthroughLine,
  cappedLine,
  coachVoice,
  corruptSaveNotice,
  dockHeadTraining,
  FORM_SICK_NOTE,
  flavorCallout,
  formDeltaLine,
  gainsLine,
  NO_GAIN_TONIGHT,
  NO_GAIN_TONIGHT_FALLBACK,
  previewNote,
  programTradeoff,
  REJECTION_COPY,
  STATS,
  saveFailureNotice,
  spendFlashIndex,
  statLabel,
  statusLine,
  TRAINING_EMPTY,
  TRAINING_EMPTY_POINTER,
  TRAINING_TAB_HEADINGS,
  tonightLine,
  trainButtonLabel,
  trainingStatus,
} from "./copy-care"
export { type HudHint, selectHint } from "./copy-cup"
export {
  evolveCallout,
  familyName,
  graduationCallout,
  graduationHint,
  growthHint,
  romanNumeral,
  stageLabel,
  unlockCallout,
} from "./copy-growth"
