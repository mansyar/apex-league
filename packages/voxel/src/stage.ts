/**
 * Life-stage variants for creature builds. One generator, two stages: the
 * baby build is the committed artifact players know (byte-stable — the
 * determinism gate keeps hashing it), and the juvenile build derives from
 * the SAME seed with a maturing silhouette and one new signature part.
 *
 * Design frame (spec R4): the identity layer — body plan, snout, horn
 * shapes, palette family — never changes between stages. The stage layer
 * only adds: a signature part the baby does not have yet, subtle proportion
 * maturation, and a modest shade lift. A juvenile is not a different breed
 * and not merely an upscale baby.
 */

export type Stage = "baby" | "juvenile"

export const STAGES: readonly Stage[] = ["baby", "juvenile"]

/**
 * DNA-proportion multipliers applied at build time for juveniles. Keys are
 * template proportion names; archetypes that lack a key simply skip it.
 * Multipliers are deliberately subtle — the proportion-budget audit must
 * still pass for every seed.
 */
export const JUVENILE_MATURITY: Record<string, number> = {
  bodyGirth: 0.96,
}

/**
 * Returns a copy of the proportions with juvenile maturation applied.
 * The baby stage returns the values unchanged (byte-stable builds).
 */
export function matureProportions(
  proportions: Record<string, number>,
  stage: Stage,
): Record<string, number> {
  if (stage === "baby") return { ...proportions }
  const out = { ...proportions }
  for (const [key, multiplier] of Object.entries(JUVENILE_MATURITY)) {
    const value = out[key]
    if (value !== undefined) out[key] = value * multiplier
  }
  return out
}

/**
 * Parse an untyped stage value (save files, CLI args, debug tools) into a
 * Stage. Throws on anything that is not a known stage.
 */
export function parseStage(value: unknown): Stage {
  if (value === "baby" || value === "juvenile") return value
  throw new Error(
    `unknown stage "${String(value)}" - known: ${STAGES.join(", ")}`,
  )
}
