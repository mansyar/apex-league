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
  // Falcon: the SPD-specialist of the wind line — a perched raptor with
  // long exposed legs under a compact teardrop torso. Calibrated on the
  // audit-lattice sweep (200 seeds, all three stages):
  // legs 0.43-1.0, neck 0.05-0.56, head 0.09-0.71, body 1.18-2.43.
  falcon: {
    ratios: {
      "legLength/bodyHeight": { min: 0.25, max: 1.15 },
      "neckLength/bodyLength": { min: 0.03, max: 0.65 },
      "headHeight/bodyHeight": { min: 0.05, max: 0.85 },
      "bodyLength/bodyHeight": { min: 1.0, max: 2.6 },
    },
  },
  // Tortoise: the DEF-specialist — the shortest legs and the longest,
  // lowest body of the line; the shell dome keeps measured height honest.
  // Calibrated on the audit-lattice sweep (200 seeds, all three stages):
  // legs 0.33-0.78, neck 0.03-0.41, head 0.09-0.71, body 1.62-3.57.
  tortoise: {
    ratios: {
      "legLength/bodyHeight": { min: 0.3, max: 0.9 },
      "neckLength/bodyLength": { min: 0.0, max: 0.5 },
      "headHeight/bodyHeight": { min: 0.05, max: 0.85 },
      "bodyLength/bodyHeight": { min: 1.4, max: 3.8 },
    },
  },
  // Frond: the sapling stag — the leggiest grazer line, a slim deer barrel
  // set high over long legs. Calibrated on the audit-lattice sweep (200
  // seeds, all three stages): legs 1.0-1.86, neck 0.05-0.38, head 0.09-0.71,
  // body 1.44-2.43. The barrel is thin enough that the coarse lattice reads
  // it as 7-9 rows, so the body and head ranges carry a lattice row of slack.
  frond: {
    ratios: {
      "legLength/bodyHeight": { min: 0.75, max: 2.1 },
      "neckLength/bodyLength": { min: 0.0, max: 0.5 },
      "headHeight/bodyHeight": { min: 0.05, max: 0.85 },
      "bodyLength/bodyHeight": { min: 1.2, max: 2.7 },
    },
  },
  // Crab: the widest, lowest land archetype — a squashed carapace dome on
  // short splayed legs. Calibrated on the audit-lattice sweep (200 seeds, all
  // three stages): legs 0.64-1.57, neck 0.05-0.38, head 0.27-1.0, body
  // 1.18-3.0. A flat dome is only 5-11 lattice rows tall, so every ratio
  // built on body height runs wide here; the budget still rejects a crab that
  // grows legs or loses its shell.
  crab: {
    ratios: {
      "legLength/bodyHeight": { min: 0.45, max: 1.75 },
      "neckLength/bodyLength": { min: 0.0, max: 0.5 },
      "headHeight/bodyHeight": { min: 0.2, max: 1.1 },
      "bodyLength/bodyHeight": { min: 1.0, max: 3.3 },
    },
  },
  // Smolder: the heaviest grazer — a drooping barrel on thick short legs
  // and a thick rising neck. Calibrated on the audit-lattice sweep (200
  // seeds, all three stages): legs 0.73-1.18, neck 0.12-0.53, head
  // 0.09-0.45, body 1.4-2.09.
  smolder: {
    ratios: {
      "legLength/bodyHeight": { min: 0.55, max: 1.35 },
      "neckLength/bodyLength": { min: 0.05, max: 0.65 },
      "headHeight/bodyHeight": { min: 0.05, max: 0.6 },
      "bodyLength/bodyHeight": { min: 1.15, max: 2.35 },
    },
  },
}

/** Inclusive check: a measured ratio inside its budget range. */
export function ratioInBudget(value: number, range: BudgetRange): boolean {
  return value >= range.min && value <= range.max
}
