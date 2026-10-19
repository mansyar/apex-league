import {
  type Creature,
  defaultLoadout,
  getMove,
  knownMoves,
  MOVE_TIER3_DAYS,
  requiredTierDays,
  type SpeciesDef,
} from "@apex/sim"

/** Bigger stat label for readability on the card line. */
const STAT_KEYS = ["hp", "atk", "def", "spd"] as const

/**
 * The combat-prep card line: "HP 80 · ATK 13 · DEF 8 · SPD 9", with
 * trained bonuses as "(+N)" chips when a training map is given.
 */
export function statLine(
  stats: Readonly<{ hp: number; atk: number; def: number; spd: number }>,
  trained?: Readonly<{ hp: number; atk: number; def: number; spd: number }>,
): string {
  const parts = STAT_KEYS.map((key) => {
    const bonus = trained?.[key] ?? 0
    const chip = bonus > 0 ? ` (+${bonus})` : ""
    return `${key.toUpperCase()} ${stats[key]}${chip}`
  })
  return parts.join(" · ")
}

/**
 * Kit-gate progress (FR5): the next locked tier and its remaining days.
 * A freshly evolved juvenile woke up with the third move unlocked — say
 * so instead of the generic count (spec R3 presentation). Empty once the
 * whole pool is unlocked.
 */
export function kitProgress(creature: Creature, species: SpeciesDef): string {
  const unlocked = knownMoves(creature, species)
  const nextIndex = unlocked.length
  const nextId = species.kit[nextIndex]
  if (nextId === undefined) return ""
  const required = requiredTierDays(nextIndex, creature.stage)
  const remaining = required - creature.trainingDays
  const displayName = getMove(nextId)?.displayName ?? nextId
  const plural = remaining === 1 ? "day" : "days"
  const evolvedUnlock =
    creature.stage !== "baby" && creature.trainingDays < MOVE_TIER3_DAYS
  return evolvedUnlock
    ? `Evolution unlocked move 3 — train ${remaining} more ${plural} for ${displayName}.`
    : `Unlocked ${nextIndex} of ${species.kit.length} moves — train ${remaining} more ${plural} for ${displayName}.`
}

/** The chosen kit: the saved loadout, else the default slicing (FR5). */
export function loadoutOf(
  creature: Creature,
  species: SpeciesDef,
): readonly string[] {
  return creature.loadout ?? defaultLoadout(creature, species)
}

/** Toggle one move in a chosen kit (picker click, FR5). */
export function toggleKit(
  chosen: readonly string[],
  id: string,
): readonly string[] {
  return chosen.includes(id) ? chosen.filter((m) => m !== id) : [...chosen, id]
}

/** The picker's failure line: the sim's message, or the coach fallback. */
export function kitHintMessage(error: unknown): string {
  return error instanceof Error ? error.message : "That kit is not allowed"
}
