import { isCupDay } from "./calendar"
import type { GameState } from "./state"

/**
 * Placeholder cup-phase transitions. The real cup (brackets, battles)
 * replaces these bodies later; the Day ↔ Cup contract stays.
 */

/** Enter the cup phase. Only allowed the day before a cup day. */
export function beginCup(state: GameState): { state: GameState; ok: boolean } {
  if (state.phase !== "day" || !isCupDay(state.day + 1)) {
    return { state, ok: false }
  }
  return { state: { ...state, phase: "cup" }, ok: true }
}

/** Leave the cup phase and return to the day phase. */
export function endCup(state: GameState): { state: GameState; ok: boolean } {
  if (state.phase !== "cup") {
    return { state, ok: false }
  }
  return { state: { ...state, phase: "day" }, ok: true }
}
