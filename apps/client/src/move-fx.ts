/**
 * Battle move data (pure, testable): the barrel.
 *
 * Split at its seam (battle_choreography_20261024 FR-4): the implementation
 * lives in the ./move-fx submodules —
 *
 * - `./move-fx/looks` — per-element shot looks, the element tint, and the
 *   shared flight constants: what a shot looks like in flight
 * - `./move-fx/moves` — the per-move fire/land grammar: postures, release
 *   beats, arrival treatments, and the shared default body
 *
 * This module re-exports the same public surface the monolith exported, so
 * every consumer import (`./move-fx`, `../move-fx`) stays untouched. Data
 * only - no staging/scene/driver imports, so tests can exercise the tables
 * without a renderer; the staging driver interprets these declarations.
 */

export {
  ELEMENT_COLOR_FALLBACK,
  elementColor,
  lookFor,
  PROJECTILE_ARC,
  PROJECTILE_LIFE_MS,
  SHOT_LOOKS,
  type ShotLook,
} from "./move-fx/looks"
export {
  type BurstStyle,
  CONTACT_T,
  DEFAULT_FX,
  fxFor,
  MOVE_FX,
  type MoveFx,
  type Posture,
  type ShotSpec,
} from "./move-fx/moves"
