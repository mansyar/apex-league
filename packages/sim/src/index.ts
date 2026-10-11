/**
 * @apex/sim — headless, deterministic simulation core for Apex League.
 *
 * Pure TypeScript only: no DOM, no Three.js, no I/O may be imported here.
 * Everything the client and (later) the server need to agree on lives in
 * this package.
 */

export { spendActionPoints } from "./ap"
export {
  BASIC,
  type BattleEvent,
  type BattleEventKind,
  type BattleFighter,
  type BattleReason,
  type BattleResult,
  type BattleSide,
  buildPlaybackScript,
  CLOSE,
  type Clock,
  type ClockFighter,
  chooseAction,
  createClock,
  createClockFighter,
  createTieOrder,
  getMove,
  HOLD,
  type MoveDef,
  makeExhibition,
  PLAYBACK_BEATS,
  type PlannedAction,
  type PlaybackStep,
  type PlaybackStepKind,
  type Range,
  resolveBattle,
  type SparSetup,
  strikeDamage,
  type Tactic,
  typeFactor,
} from "./battle"
export { CUP_INTERVAL_DAYS, isCupDay } from "./calendar"
export {
  assignTraining,
  CARE_AP_COST,
  type CareAction,
  type CareRejection,
  type CareResult,
  careAction,
  type TrainingAttempt,
  type TrainingRejection,
} from "./care"
export {
  CONDITION_MAX,
  CONDITION_START,
  type Creature,
  type CreatureConditions,
  type CreatureStats,
  createCreature,
  type Element,
  effectiveStats,
  type LifeStage,
  type StatKey,
  TRAINED_START,
  TRAINING_CAP,
  type TrainingResult,
} from "./creature"
export type {
  CupBracket,
  CupResult,
  CupRoundResult,
  CupSlot,
  RoundVerdict,
} from "./cup"
export {
  BRACKET_SLOTS,
  CUP_ROUNDS,
  makeBracket,
  resolveCup,
  runRound,
} from "./cup"
export { applyCupRewards, CUP_REWARDS, type CupOutcome } from "./cupRewards"
export {
  EVOLUTION_DAY,
  EVOLUTION_MOOD,
  EVOLUTION_STAT_BOOST,
  type EvolutionReason,
  type EvolutionVerdict,
  evaluateEvolution,
  evolveCreature,
  SICK_COOLDOWN_NIGHTS,
} from "./evolution"
export {
  clearLoadout,
  defaultLoadout,
  MOVE_TIER3_DAYS,
  MOVE_TIER4_DAYS,
  requiredTierDays,
  setLoadout,
  unlockedKit,
} from "./loadout"
export { beginCup, endCup, enterCup } from "./machine"
export { makeRng, type Rng } from "./rng"
export { migrate } from "./save/migrate"
export { SAVE_VERSION, type SaveData, serializeSave } from "./save/schema"
export {
  createMemoryAdapter,
  loadGame,
  SAVE_KEY,
  type SaveAdapter,
  saveGame,
} from "./save/storage"
export {
  EXHAUSTED_ENERGY,
  NIGHT_RECOVERY,
  previewTraining,
  SICK_HEALTH,
  SICKNESS_ONSET_HEALTH,
  settleCreature,
} from "./settlement"
export { getSpecies, type SpeciesDef, STARTER_SPECIES } from "./species"
export {
  ACTION_POINTS_PER_DAY,
  chooseStarter,
  createInitialState,
  type GameState,
  type Phase,
  setReducedMotion,
} from "./state"
export { advanceDay, CUP_WIN_AP_BONUS } from "./ticker"
