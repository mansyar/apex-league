/**
 * Per-vertex ambient occlusion for the voxel mesher.
 *
 * Pure functions only: the mesher owns the neighbourhood lookups and feeds
 * this module three booleans per face corner (the two edge neighbours and the
 * diagonal one). Keeping the rule here makes it testable without a grid and
 * guarantees the exporter and the client shade identically — both read the
 * same baked factors.
 */

/** Four states: 0 = most occluded, 3 = fully exposed. */
export const AO_LEVELS = 4

/**
 * Brightness of the darkest corner. Deliberately shallow: AO is a depth cue
 * here, not dirt — the palette must still read at a glance in the arena.
 */
export const AO_FLOOR = 0.72

/** Occlusion level for one face corner given its three neighbours. */
export function aoLevel(side1: number, corner: number, side2: number): number {
  // Two edges meeting at the corner means the corner is buried in a crease;
  // the diagonal contributes nothing once both sides are solid.
  if (side1 && side2) return 0
  return 3 - (side1 + corner + side2)
}

/** Linear ramp from the floor to full brightness across the four levels. */
export function aoFactor(level: number): number {
  return AO_FLOOR + (1 - AO_FLOOR) * (level / (AO_LEVELS - 1))
}

/**
 * Pack the four corner levels of one face cell into a single integer so the
 * greedy merge can compare signatures cheaply. Two bits per corner.
 */
export function packAo(
  corners: readonly [number, number, number, number],
): number {
  return corners[0] | (corners[1] << 2) | (corners[2] << 4) | (corners[3] << 6)
}

export function unpackAo(signature: number): [number, number, number, number] {
  return [
    signature & 3,
    (signature >> 2) & 3,
    (signature >> 4) & 3,
    (signature >> 6) & 3,
  ]
}
