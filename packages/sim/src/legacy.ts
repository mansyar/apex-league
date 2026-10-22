/**
 * Legacy & Breeding (legacy_breeding_20261013): the retirement → next-egg
 * loop. A champion that has lived a full career can be **graduated** by the
 * player; its career is archived to a Hall of Fame, its effective stats seed a
 * **stat floor** for the next egg, and the bloodline (generations + lifetime
 * cups) accrues **prestige** that grants milestone perks to later generations.
 *
 * The fantasy is a dynasty, not a single champion — the game state holds one
 * active pet: graduation *replaces* the active creature. The pets the player
 * owns but keeps in reserve wait in the stable (save v24); a graduation may
 * hand the ranch to one of them.
 *
 * Barrel module (sim-voxel-size-guard, phase 2): the implementation lives in
 * the ./legacy submodules —
 *
 * - `./legacy/lineage` — the Hall of Fame, the prestige rating, the perks
 * - `./legacy/graduation` — the graduation gate and the two successions
 * - `./legacy/inheritance` — the inherited stat floor and the seeded egg
 *
 * This module re-exports the same public surface the monolith exported, so
 * every consumer import (`./legacy`, `../legacy`) stays untouched.
 *
 * Pure data and pure functions only — no DOM, no rendering, no I/O.
 */

export {
  canGraduate,
  GRADUATION_DAY,
  GRADUATION_HINT_DAY,
  type GraduateFromStableResult,
  type GraduateResult,
  type GraduationReason,
  type GraduationVerdict,
  graduate,
  graduateFromStable,
} from "./legacy/graduation"
export {
  createInheritedCreature,
  INHERITANCE_FRACTION,
  type InheritanceSource,
  inheritedFloor,
  REFINED_INHERITANCE_FRACTION,
  WARM_BOND_START,
} from "./legacy/inheritance"
export {
  hatchDayOf,
  initialLineage,
  type LineagePerks,
  type LineageState,
  lineagePerks,
  lineagePrestige,
  PRESTIGE_CHAMPION_STABLE,
  PRESTIGE_ESTABLISHED_LINE,
  PRESTIGE_FOUNDED,
  PRESTIGE_REFINED_BLOOD,
  PRESTIGE_WARM_BLOODLINE,
  type RetiredRecord,
  retireeRecord,
} from "./legacy/lineage"
