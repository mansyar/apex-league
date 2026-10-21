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
  // Axolotl: aquatic, near-neckless and much longer/lower than the land
  // archetypes by design — the body-length budget sits well above theirs
  // and the neck budget well below. Measured 200-seed spread:
  // legs 0.67-1.0, neck 0.12-0.33, head 0.08-0.33, body 1.6-3.0.
  axolotl: {
    ratios: {
      "legLength/bodyHeight": { min: 0.6, max: 1.05 },
      "neckLength/bodyLength": { min: 0.05, max: 0.4 },
      "headHeight/bodyHeight": { min: 0.05, max: 0.4 },
      "bodyLength/bodyHeight": { min: 1.5, max: 3.2 },
    },
  },
  // Storm hound: the SPD-specialist silhouette — the leggiest land
  // archetype (long exposed leg over a lean torso), a working-dog neck,
  // and a torso that runs long and low without the drake's arch.
  // Calibrated on the audit-lattice sweep (200 seeds, all three stages):
  // legs 0.85-1.33, neck 0.04-0.37, head 0.23-0.78, body 1.6-2.6. Head and
  // torso land within a lattice row of each other on the low-girth seeds, so
  // the head ceiling carries the extra step that quantization needs.
  storm_hound: {
    ratios: {
      "legLength/bodyHeight": { min: 0.8, max: 1.45 },
      "neckLength/bodyLength": { min: 0.03, max: 0.4 },
      "headHeight/bodyHeight": { min: 0.2, max: 0.85 },
      "bodyLength/bodyHeight": { min: 1.5, max: 2.7 },
    },
  },
}

/** Inclusive check: a measured ratio inside its budget range. */
export function ratioInBudget(value: number, range: BudgetRange): boolean {
  return value >= range.min && value <= range.max
}
