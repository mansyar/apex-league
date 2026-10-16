/**
 * Shared effect data (pure registry): the scale constants, the
 * element-flavored burst physics (FR7), and the small param derivations
 * every visual subsystem reads. Kept data-only so the golden pins in
 * `fx-data.test.ts` travel with any future rebalance.
 */

/** Shared radius for shot cores, trail puffs, bursts, and the charge orb. */
export const PROJECTILE_RADIUS = 0.22

/** How long a victim's cells flash white, in ms. */
export const FLASH_MS = 180

/** Launch height: the thrower's mouth line. */
export const SHOT_ORIGIN_Y = 0.8

/** Landing height: the victim's chest line (also the burst base). */
export const SHOT_TARGET_Y = 0.6

/**
 * Element-flavored fragment physics (FR7): fire embers are buoyant and
 * rise while flickering, water droplets fall heavy and fast, plant motes
 * float on a sideways drift. Anything else keeps the neutral scatter.
 */
const ELEMENT_BURST: Record<string, { gravity: number; sway: number }> = {
  fire: { gravity: -2.2, sway: 0.5 },
  water: { gravity: 10, sway: 0 },
  plant: { gravity: 1.8, sway: 1.0 },
}

/** Neutral scatter for elements with no flavor entry. */
const NEUTRAL_BURST = { gravity: 7, sway: 0 }

/** Burst physics for an element, falling back to the neutral scatter. */
export function burstPhysics(element: string | undefined): {
  gravity: number
  sway: number
} {
  return ELEMENT_BURST[element ?? ""] ?? NEUTRAL_BURST
}

/** Floor-mark radius: grows with the blow's strength, hard-capped. */
export function decalRadius(strength: number): number {
  return Math.min(0.55, 0.22 + strength * 0.02)
}

/** Trail segment radius: tapers toward the tail with a visibility floor. */
export function trailRadius(size: number, index: number): number {
  return Math.max(0.05, PROJECTILE_RADIUS * size - (index + 1) * 0.033)
}

/** Trail segment opacity: fades along the tail. */
export function trailOpacity(index: number): number {
  return 0.55 - index * 0.1
}

/** Most floor marks kept alive at once (FIFO). */
export const DECAL_MAX = 6

/** How long a floor mark lingers, in ms. */
export const DECAL_LIFE_MS = 1800
