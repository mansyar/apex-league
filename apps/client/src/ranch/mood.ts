import type { CreatureConditions } from "@apex/sim"
import { EXHAUSTED_ENERGY, SICK_HEALTH } from "@apex/sim"

/**
 * Condition-driven mood idles: the mode picks the breathing rhythm, the head
 * droop, and the happy bounce. Pure derivation - no rendering, no state.
 */
export type MoodMode = "normal" | "sluggish" | "droopy" | "happy"

export interface MoodProfile {
  breathRate: number
  breathAmp: number
  headDroop: number
  bounce: number
}

export const MOOD_PROFILES: Record<MoodMode, MoodProfile> = {
  normal: { breathRate: 2, breathAmp: 0.035, headDroop: 0, bounce: 0 },
  // Low energy: slow, shallow breathing — the creature is dragging through the day.
  sluggish: { breathRate: 0.9, breathAmp: 0.015, headDroop: 0.02, bounce: 0 },
  // Sick: head hangs, breath weak.
  droopy: { breathRate: 1.2, breathAmp: 0.02, headDroop: 0.06, bounce: 0 },
  // High mood: lively breath and a periodic happy bounce.
  happy: { breathRate: 2.6, breathAmp: 0.035, headDroop: 0, bounce: 0.08 },
}

export function moodModeFrom(conditions: CreatureConditions): MoodMode {
  if (conditions.health < SICK_HEALTH) return "droopy"
  if (conditions.energy <= EXHAUSTED_ENERGY) return "sluggish"
  if (conditions.mood >= 80) return "happy"
  return "normal"
}
