/**
 * Proportion budgets: every archetype declares hard limits on derived
 * dimensional ratios, measured from the voxelized build (not from DNA), so
 * wild variation stays inside what still reads as the intended creature.
 *
 * Budgets live here so future archetypes inherit the gate: the proportion
 * test iterates the archetype registry and fails if an archetype lacks a
 * budget entry.
 */

/** A closed [min, max] range a measured ratio must stay within. */
export interface BudgetRange {
  min: number
  max: number
}

/**
 * Declared ratio budgets for one archetype. Ratios are dimensionless
 * (voxel-unit extents measured from part bounding boxes).
 */
export interface ProportionBudget {
  ratios: Record<string, BudgetRange>
}

/** The shared budget table, keyed by archetype id. */
export const PROPORTION_BUDGETS: Record<string, ProportionBudget> = {
  // Calibrated from the audit-lattice sweep (200 seeds per archetype) and
  // the silhouettes approved through the vision loop. Ranges are declared
  // per archetype — drakes run leggier and longer-bodied than oxen by
  // design; the gate exists to catch degenerate outliers, not to force
  // every creature into the same mold.
  draconic: {
    ratios: {
      // Exposed leg vs torso height — the "leggy" failure mode.
      "legLength/bodyHeight": { min: 0.25, max: 0.9 },
      // Neck length vs body length.
      "neckLength/bodyLength": { min: 0.0, max: 0.65 },
      // Head height vs torso height. Brows + skull give drakes a heavier
      // brow line than the ox; still far below "giraffe" territory.
      "headHeight/bodyHeight": { min: 0.15, max: 0.55 },
      // Torso chunkiness: body length vs body height. Drakes run long and
      // low-slung by design (user-preferred silhouette from the vision
      // loop); the haunches keep the measured height honest.
      "bodyLength/bodyHeight": { min: 0.7, max: 1.8 },
    },
  },
  bovine: {
    ratios: {
      "legLength/bodyHeight": { min: 0.25, max: 0.85 },
      "neckLength/bodyLength": { min: 0.0, max: 0.65 },
      "headHeight/bodyHeight": { min: 0.15, max: 0.5 },
      "bodyLength/bodyHeight": { min: 0.7, max: 1.5 },
    },
  },
}

/** Inclusive check: a measured ratio inside its budget range. */
export function ratioInBudget(value: number, range: BudgetRange): boolean {
  return value >= range.min && value <= range.max
}
