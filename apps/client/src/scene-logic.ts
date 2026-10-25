/**
 * Scene-logic: pure, DOM-free motion math for the ranch scene. Unit-tested
 * here so `scene.ts` stays thin visual glue. Presentational only - nothing
 * in this module touches `@apex/sim` state, the save, or voxel geometry.
 *
 * This file is the barrel: the machines live in `./scene-logic/`, one per
 * file, and every public symbol is re-exported here so importers keep a
 * single, stable entry point (ranch_decomposition_20261018).
 */

export * from "./scene-logic/evolution"
export * from "./scene-logic/feed"
export * from "./scene-logic/framing"
export * from "./scene-logic/gait"
export * from "./scene-logic/math"
export * from "./scene-logic/morning-after"
export * from "./scene-logic/morning-after-ledger"
export * from "./scene-logic/morning-after-poses"
export * from "./scene-logic/pet"
export * from "./scene-logic/play"
export * from "./scene-logic/rest"
export * from "./scene-logic/stage"
export * from "./scene-logic/treat"
export * from "./scene-logic/walk"
export * from "./scene-logic/wander"
export * from "./scene-logic/wind"
