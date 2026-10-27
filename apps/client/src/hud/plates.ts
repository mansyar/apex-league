/**
 * The HUD's plates: the score bug, the lineage plate, the creature
 * lower-third and the onboarding callout — plus the pure view-models that
 * compute what the daily update writes into them (state → data, unit-tested
 * DOM-free). The mock page (mock.ts) renders these same factories fed canned
 * values, so the mock can never drift from the live HUD's structure or class
 * ownership.
 *
 * One builder per plate (`plates-score`, `plates-lineage`, `plates-creature`,
 * `plates-callout`) and the read-models in `ladder-read`; this file is the
 * re-export surface the HUD, the dock and the mock page already import.
 */
export {
  type ApPipPlan,
  apPipPlan,
  type ConditionDelta,
  climbAnnouncement,
  conditionDelta,
  type LadderRead,
  ladderRead,
  lineageMeta,
  promotionLine,
  statCell,
} from "./ladder-read"
export { buildCallout, type CalloutRefs } from "./plates-callout"
export { buildCreaturePlate, type CreaturePlateRefs } from "./plates-creature"
export {
  buildLineagePlate,
  type LineagePlateRefs,
  paintLineage,
  wireLineage,
} from "./plates-lineage"
export { buildScoreBug, type ScoreBugRefs } from "./plates-score"
