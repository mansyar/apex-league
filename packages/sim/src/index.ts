/**
 * @apex/sim — headless, deterministic simulation core for Apex League.
 *
 * Pure TypeScript only: no DOM, no Three.js, no I/O may be imported here.
 * Everything the client and (later) the server need to agree on lives in
 * this package.
 */

export { CUP_INTERVAL_DAYS, isCupDay } from "./calendar"
export {
  ACTION_POINTS_PER_DAY,
  createInitialState,
  type GameState,
  type Phase,
} from "./state"
export { advanceDay } from "./ticker"
export { SIM_VERSION } from "./version"
