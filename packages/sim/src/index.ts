/**
 * @apex/sim — headless, deterministic simulation core for Apex League.
 *
 * Pure TypeScript only: no DOM, no Three.js, no I/O may be imported here.
 * Everything the client and (later) the server need to agree on lives in
 * this package.
 */

export { spendActionPoints } from "./ap"
export { createCreature, CONDITION_MAX, CONDITION_START } from "./creature"
export {
  type Creature,
  type CreatureConditions,
  type CreatureStats,
  type Element,
  type LifeStage,
} from "./creature"
export { CUP_INTERVAL_DAYS, isCupDay } from "./calendar"
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
export {
  ACTION_POINTS_PER_DAY,
  chooseStarter,
  createInitialState,
  type GameState,
  type Phase,
} from "./state"
export { getSpecies, STARTER_SPECIES, type SpeciesDef } from "./species"
export { advanceDay } from "./ticker"
