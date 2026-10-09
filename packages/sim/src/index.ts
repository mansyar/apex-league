/**
 * @apex/sim — headless, deterministic simulation core for Apex League.
 *
 * Pure TypeScript only: no DOM, no Three.js, no I/O may be imported here.
 * Everything the client and (later) the server need to agree on lives in
 * this package.
 */

export { spendActionPoints } from "./ap"
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
  createInitialState,
  type GameState,
  type Phase,
} from "./state"
export { advanceDay } from "./ticker"
export { SIM_VERSION } from "./version"
