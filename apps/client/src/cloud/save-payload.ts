/**
 * Save-payload readers for the sync coordinator (FR-4, FR-5).
 *
 * The content without its clock is what "the same ranch" means for the
 * adopted-echo suppression; the stamp is the push's own clock. Pure and
 * total: an unreadable payload reads as null, never a throw.
 */

/** The save's content without its clock: what "the same ranch" means. */
export function fingerprint(payload: string): string | null {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (typeof parsed !== "object" || parsed === null) return null
    const { state, session } = parsed as Record<string, unknown>
    return JSON.stringify({ state, session })
  } catch {
    return null
  }
}

/** The `savedAt` a payload carries, or null when it is not a save at all. */
export function savedAtOf(payload: string): number | null {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (typeof parsed !== "object" || parsed === null) return null
    const at = (parsed as Record<string, unknown>).savedAt
    return typeof at === "number" && Number.isFinite(at) ? at : null
  } catch {
    return null
  }
}
