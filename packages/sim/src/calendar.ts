/** In-game calendar rules. */

/** Cups are held every 7th in-game day. */
export const CUP_INTERVAL_DAYS = 7

/** Whether the given 1-based day is a cup day. */
export function isCupDay(day: number): boolean {
  return day % CUP_INTERVAL_DAYS === 0
}
