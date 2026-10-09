/**
 * Injectable RNG seam. Consumers depend on the interface only, so tests can
 * pass fixed stubs and the server can replay runs from a seed.
 */
export interface Rng {
  /** Next float in [0, 1). */
  next(): number
  /** Next integer in [0, maxExclusive). */
  int(maxExclusive: number): number
}

/**
 * Deterministic seeded RNG (mulberry32). Same seed -> same sequence,
 * which keeps the whole simulation replayable.
 */
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
