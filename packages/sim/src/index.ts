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
  ELEMENT_HUE,
  getMove,
  HOLD,
  type MoveDef,
  makeExhibition,
  PLAYBACK_BEATS,
  PLAYBACK_PHASES,
  type PlannedAction,
  type PlaybackPhases,
  type PlaybackStep,
  type PlaybackStepKind,
  type Range,
  type ReactionKind,
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
  NAME_MAX_LENGTH,
  type RenameResult,
  renameCreature,
  type StatKey,
  TRAINED_START,
  TRAINING_CAP,
  type TrainingResult,
} from "./creature"
export type {
  CupBracket,
  CupSession,
  CupSlot,
  RoundVerdict,
} from "./cup"
export {
  BRACKET_SLOTS,
  CUP_ROUNDS,
  completeCup,
  cupMatchSeed,
  cupPlacement,
  doubleKoAdvancingName,
  forfeitCup,
  makeBracket,
  resolvePlayerMatch,
  startCupSession,
} from "./cup"
export { applyCupRewards, CUP_REWARDS, type CupOutcome } from "./cupRewards"
export {
  CHAMPION_BOND,
  CHAMPION_CUPS,
  CHAMPION_EVOLUTION_DAY,
  CHAMPION_HINT_DAY,
  CHAMPION_STAT_BOOST,
  EVOLUTION_DAY,
  EVOLUTION_HINT_DAY,
  EVOLUTION_MOOD,
  EVOLUTION_STAT_BOOST,
  type EvolutionReason,
  type EvolutionVerdict,
  evaluateEvolution,
  evolveCreature,
  SICK_COOLDOWN_NIGHTS,
} from "./evolution"
export {
  applyCupPlacement,
  type CupKind,
  initialLadder,
  LADDER_POINTS,
  LADDER_THRESHOLDS,
  type LadderState,
  type LadderSubTier,
  type LadderTier,
  type LadderUpdate,
  promotionEligible,
  SILVER_THRESHOLDS,
  subTierFor,
} from "./ladder"
export {
  canGraduate,
  createInheritedCreature,
  GRADUATION_DAY,
  GRADUATION_HINT_DAY,
  type GraduateResult,
  type GraduationReason,
  type GraduationVerdict,
  graduate,
  INHERITANCE_FRACTION,
  inheritedFloor,
  initialLineage,
  type LineagePerks,
  type LineageState,
  lineagePerks,
  lineagePrestige,
  PRESTIGE_ESTABLISHED_LINE,
  PRESTIGE_FOUNDED,
  PRESTIGE_WARM_BLOODLINE,
  type RetiredRecord,
  WARM_BOND_START,
} from "./legacy"
export {
  clearLoadout,
  defaultLoadout,
  MOVE_TIER3_DAYS,
  MOVE_TIER4_DAYS,
  requiredTierDays,
  setLoadout,
  unlockedKit,
} from "./loadout"
export {
  beginCup,
  endCup,
  finalizeCup,
  prepareCup,
} from "./machine"
export { makeRng, type Rng } from "./rng"
export { migrate } from "./save/migrate"
export { SAVE_VERSION, type SaveData, serializeSave } from "./save/schema"
export {
  clearSave,
  createMemoryAdapter,
  loadBoot,
  loadGame,
  loadSave,
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
  markHintSeen,
  type Phase,
  setArenaCamera,
  setReducedMotion,
} from "./state"
export { advanceDay, CUP_WIN_AP_BONUS } from "./ticker"
