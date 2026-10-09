/**
 * @apex/sim — headless, deterministic simulation core for Apex League.
 *
 * Pure TypeScript only: no DOM, no Three.js, no I/O may be imported here.
 * Everything the client and (later) the server need to agree on lives in
 * this package.
 */

export { spendActionPoints } from "./ap"
export { CUP_INTERVAL_DAYS, isCupDay } from "./calendar"
export {
  CARE_AP_COST,
  type CareAction,
  type CareRejection,
  type CareResult,
  careAction,
} from "./care"
export {
  CONDITION_MAX,
  CONDITION_START,
  type Creature,
  type CreatureConditions,
  type CreatureStats,
  createCreature,
  type Element,
  type LifeStage,
} from "./creature"
export { beginCup, endCup } from "./machine"
export { makeRng, type Rng } from "./rng"
export { migrate } from "./save/migrate"
export { SAVE_VERSION, type SaveDataV1, serializeSave } from "./save/schema"
export {
  createMemoryAdapter,
  loadGame,
  SAVE_KEY,
  type SaveAdapter,
  saveGame,
} from "./save/storage"
export { getSpecies, type SpeciesDef, STARTER_SPECIES } from "./species"
export {
  ACTION_POINTS_PER_DAY,
  chooseStarter,
  createInitialState,
  type GameState,
  type Phase,
} from "./state"
export { advanceDay } from "./ticker"
