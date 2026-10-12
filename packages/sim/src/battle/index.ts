/**
 * Battle barrel: the resolver, clock, policy, and exhibition helper for
 * one 1v1 exhibition. All of it is pure and deterministic — none of this
 * reads GameState, the save, or the DOM.
 */

export { ELEMENT_HUE, type TypeFactor, typeFactor } from "./chart"
export {
  BASIC,
  type BattleEvent,
  type BattleEventKind,
  type BattleFighter,
  CLOSE,
  type Clock,
  type ClockFighter,
  createClock,
  createClockFighter,
  createTieOrder,
  HOLD,
  type PlanFn,
  type PlannedAction,
  type Range,
  type TickOutcome,
} from "./clock"
export { strikeDamage } from "./damage"
export { makeExhibition, type SparSetup } from "./exhibition"
export { BASIC_MOVE, getMove, type MoveDef } from "./moves"
export {
  buildPlaybackScript,
  PLAYBACK_BEATS,
  type PlaybackStep,
  type PlaybackStepKind,
} from "./playback"
export { chooseAction, type Tactic } from "./policy"
export {
  type BattleReason,
  type BattleResult,
  type BattleSide,
  resolveBattle,
} from "./resolver"
