/**
 * Save payload validators: the shape checks a persisted save must pass
 * before the game trusts it.
 *
 * Split out of `save/storage.ts` (sim-voxel-size-guard, phase 2): the
 * adapter's I/O and the payload's shape rules are two concerns, and only
 * the adapter is imported by the client's boot path.
 *
 * This barrel is the one owner of the `validators` name
 * (sim-voxel-size-guard, phase R1) — the implementation lives in the
 * sibling modules:
 *
 * - `./creature` — the creature and Hall of Fame record rules
 * - `./session` — the save and the live cup session rules
 *
 * The rules themselves are unchanged — each `isValid*` helper keeps the
 * exact check it had while it lived beside the adapter.
 */

export { isValidCreature, isValidRetiredRecord } from "./creature"
export { isValidSaveState, isValidSession } from "./session"
