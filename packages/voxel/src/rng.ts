/**
 * Deterministic seeded RNG (mulberry32), mirrored from @apex/sim. Kept local
 * so the voxel pipeline stays self-contained and browser-portable.
 */
export interface Rng {
  /** Next float in [0, 1). */
  next(): number
  /** Next integer in [0, maxExclusive). */
  int(maxExclusive: number): number
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
  }
}
