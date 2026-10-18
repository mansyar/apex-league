/**
 * Scene logic - shared math: angle wrapping, the shortest-arc yaw blend,
 * the deterministic prop phase hash, and the ceremony easing curve. Split
 * out of scene-logic.ts (ranch_decomposition); behavior unchanged.
 */
/**
 * Deterministic phase hash of a prop's world position: each prop sways on
 * its own clock so the meadow ripples rather than pulsing in lockstep.
 * Quantized to 1/32 of a unit so infinitesimal float drift in the scatter
 * can never shift the phase. Salt separates props placed at identical
 * positions. No `Math.random` anywhere — same position, same phase, forever.
 */
export function phaseHash(x: number, z: number, salt: number): number {
  const xi = Math.round(x * 32) | 0
  const zi = Math.round(z * 32) | 0
  let h =
    (Math.imul(xi, 0x9e3779b1) ^
      Math.imul(zi, 0x85ebca6b) ^
      Math.imul(salt | 0, 0xc2b2ae35)) >>>
    0
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d) >>> 0
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39) >>> 0
  h = (h ^ (h >>> 15)) >>> 0
  return (h / 4294967296) * Math.PI * 2
}

/**
 * Blend two yaw angles along the SHORTEST arc (shortest-arc turn for the
 * ceremony's facing phase — never a 5-radian spin to look at the food).
 */
export function lerpAngle(a: number, b: number, k: number): number {
  if (k <= 0) return a
  if (k >= 1) return b
  return a + wrapPi(b - a) * k
}

/** Wrap an angle delta into (-π, π]. */
export function wrapPi(delta: number): number {
  let d = delta
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

/** Shared easing for the care-ceremony machines (rest, treat). */
export function smoothstep(k: number): number {
  return k * k * (3 - 2 * k)
}
