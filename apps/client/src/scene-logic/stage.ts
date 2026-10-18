/**
 * Scene logic - the life-stage holder scale ladder. Split out of
 * scene-logic.ts (ranch_decomposition); behavior unchanged.
 */
export const BABY_SCALE = 0.6
/** World-units holder scale from the juvenile stage on. */
export const JUVENILE_SCALE = 1
/** World-units holder scale for the champion stage: the grander silhouette
 * comes from the holder only (learnings.md — the rig children keep their
 * rig-unit contract; the proportion maturation happens in the voxel build). */
export const CHAMPION_SCALE = 1.15

/** Holder scale for a life stage — single-sources the ranch stage ladder. */
export function stageScale(stage: "baby" | "juvenile" | "champion"): number {
  return stage === "baby"
    ? BABY_SCALE
    : stage === "champion"
      ? CHAMPION_SCALE
      : JUVENILE_SCALE
}
