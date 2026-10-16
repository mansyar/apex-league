/**
 * Element matchups for battle resolution.
 * Pure data and pure functions — no DOM, no rendering, no I/O.
 */

import type { Element } from "../creature"

/** Integer type multiplier: damage uses `num / den`, never a float factor. */
export interface TypeFactor {
  readonly num: number
  readonly den: number
}

/**
 * Attacker beats defender. The reverse pair is a resist (see `typeFactor`).
 * Two triangles: Fire→Plant→Water→Fire, and Electric→Water, Earth→Electric,
 * Wind→Earth. No immunities.
 */
const BEATS: ReadonlyArray<readonly [Element, Element]> = [
  ["fire", "plant"],
  ["plant", "water"],
  ["water", "fire"],
  ["electric", "water"],
  ["earth", "electric"],
  ["wind", "earth"],
]

function beats(attack: Element, defense: Element): boolean {
  return BEATS.some(([a, d]) => a === attack && d === defense)
}

/**
 * Type multiplier for one ordered pair.
 * 2× when the attacker beats the defender, 0.5× when the defender beats the
 * attacker, 1× otherwise. Never 0×.
 */
export function typeFactor(attack: Element, defense: Element): TypeFactor {
  if (beats(attack, defense)) return { num: 3, den: 2 }
  if (beats(defense, attack)) return { num: 2, den: 3 }
  return { num: 1, den: 1 }
}

/**
 * Element hues from the shared type-color contract (product guidelines:
 * Fire 18°, Plant 110°, Water 205°, Electric 50°, Earth 28°, Wind 165°).
 * A projectile reads as its type at a glance, and the color survives
 * color-blindness checks when paired with the move icon in the HUD.
 * Presentation-facing, but it is part of the element contract — one
 * canonical table next to the matchup math.
 */
export const ELEMENT_HUE: Record<string, number> = {
  fire: 18,
  water: 205,
  plant: 110,
  electric: 50,
  earth: 28,
  wind: 165,
}
