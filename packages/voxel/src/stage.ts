/**
 * Life-stage variants for creature builds. One generator, three stages:
 * the baby build is the committed artifact players know (byte-stable — the
 * determinism gate keeps hashing it), the juvenile build derives from the
 * SAME seed with a maturing silhouette and one new signature part, and the
 * champion build matures further and adds the champion's earned crown.
 *
 * Design frame (spec R4): the identity layer — body plan, snout, horn
 * shapes, palette family — never changes between stages. The stage layer
 * only adds: signature parts the earlier stages do not have yet, subtle
 * proportion maturation, and a modest shade lift. A juvenile is not a
 * different breed and not merely an upscale baby; a champion is not a
 * different creature — it is the same individual wearing its record.
 */

export type Stage = "baby" | "juvenile" | "champion"

export const STAGES: readonly Stage[] = ["baby", "juvenile", "champion"]

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
 * Champion maturation, applied ON TOP of the juvenile multipliers so
 * maturity is cumulative (baby → juvenile → champion is one continuous
 * growth curve). Champions FILL OUT rather than slim further: the mature
 * frame carries more mass, while the crown parts and shade lift carry the
 * rest of the presentation. Same contract as juvenile: keys skip absent
 * proportions and the budget audit must pass for every seed.
 */
export const CHAMPION_MATURITY: Record<string, number> = {
  bodyGirth: 1.04,
}

function applyMaturity(
  proportions: Record<string, number>,
  maturity: Record<string, number>,
): Record<string, number> {
  const out = { ...proportions }
  for (const [key, multiplier] of Object.entries(maturity)) {
    const value = out[key]
    if (value !== undefined) out[key] = value * multiplier
  }
  return out
}

/**
 * Returns a copy of the proportions with stage maturation applied. The
 * baby stage returns the values unchanged (byte-stable builds).
 */
export function matureProportions(
  proportions: Record<string, number>,
  stage: Stage,
): Record<string, number> {
  if (stage === "baby") return { ...proportions }
  let out = applyMaturity(proportions, JUVENILE_MATURITY)
  if (stage === "champion") out = applyMaturity(out, CHAMPION_MATURITY)
  return out
}

/**
 * Parse an untyped stage value (save files, CLI args, debug tools) into a
 * Stage. Throws on anything that is not a known stage.
 */
export function parseStage(value: unknown): Stage {
  if (value === "baby" || value === "juvenile" || value === "champion") {
    return value
  }
  throw new Error(
    `unknown stage "${String(value)}" - known: ${STAGES.join(", ")}`,
  )
}
