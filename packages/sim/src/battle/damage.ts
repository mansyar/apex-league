/**
 * Integer strike damage. A miss is 0. A hit is at least 1.
 */

/**
 * `max(1, floor(power * atk * typeNum / (def * typeDen)))` on a hit.
 * A miss deals 0 and does not apply the minimum.
 */
export function strikeDamage(
  power: number,
  atk: number,
  def: number,
  typeNum: number,
  typeDen: number,
  hit: boolean,
): number {
  if (!hit) return 0
  return Math.max(1, Math.floor((power * atk * typeNum) / (def * typeDen)))
}
