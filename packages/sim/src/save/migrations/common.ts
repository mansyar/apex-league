/**
 * The primitives every migration step leans on: the seed a migrated save is
 * granted its starter with, the shared state-shape validator, and the
 * optional persisted-creature reader.
 *
 * They live beside the step modules rather than in `save/migrate.ts` so a
 * step can reach them without importing the driver back: the driver owns the
 * chain, the steps own the chain's parts, and neither imports the other.
 */

/** Seed used when a migrated save is granted its default starter. */
export const STARTER_GRANT_SEED = 42

/**
 * Validate the persisted GameState's core scalar fields (day/phase/AP) that
 * every migration step leans on. Throws a version-tagged error on a broken
 * shape; returns the validated scalars plus the state record so each
 * migration entry stays a pure field-shaper.
 */
export function validateStateShape(
  raw: Record<string, unknown>,
  version: number,
): {
  day: number
  phase: "day" | "cup"
  actionPoints: number
  state: Record<string, unknown>
} {
  const state = raw.state
  if (typeof state !== "object" || state === null) {
    throw new Error(`invalid v${version} save: missing state`)
  }
  const s = state as Record<string, unknown>
  const day = s.day
  const phase = s.phase
  const actionPoints = s.actionPoints
  if (
    typeof day !== "number" ||
    !Number.isInteger(day) ||
    day < 1 ||
    (phase !== "day" && phase !== "cup") ||
    typeof actionPoints !== "number" ||
    !Number.isInteger(actionPoints) ||
    actionPoints < 0
  ) {
    throw new Error(`invalid v${version} save: broken state`)
  }
  return { day, phase, actionPoints, state: s }
}

/**
 * The optional persisted creature object from a validated state, or null.
 * Throws on a non-object creature (a corrupt hand-edited save). Steps that
 * predate object validation keep their lenient inline cast instead.
 */
export function persistedCreature(
  state: Record<string, unknown>,
  version: number,
): Record<string, unknown> | null {
  const c = state.creature
  if (c === null || c === undefined) return null
  if (typeof c !== "object") {
    throw new Error(`invalid v${version} save: broken creature`)
  }
  return c as Record<string, unknown>
}
