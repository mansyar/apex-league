/**
 * Save payload validators: the shape checks a persisted save must pass
 * before the game trusts it.
 *
 * Split out of `save/storage.ts` (sim-voxel-size-guard, phase 2): the
 * adapter's I/O and the payload's shape rules are two concerns, and only
 * the adapter is imported by the client's boot path.
 *
 * Barrel module (sim-voxel-size-guard, phase 2): the implementation lives in
 * the ./validators submodules —
 *
 * - `./validators/creature` — the creature and Hall of Fame record rules
 * - `./validators/session` — the save and the live cup session rules
 *
 * The rules themselves are unchanged — each `isValid*` helper keeps the
 * exact check it had while it lived beside the adapter.
 */

export { isValidSaveState, isValidSession } from "./validators/session"
