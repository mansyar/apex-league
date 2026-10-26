/**
 * A display name is a label, and the client renders it as text rather than as
 * markup, so this only trims and caps it. Sanitising characters out of a name
 * would silently rename the player's trainer, which is worse than storing a
 * label the renderer already treats as data.
 */
export const MAX_NAME_LENGTH = 64

/** The trimmed name, or `null` when the value cannot be a display name at all. */
export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > MAX_NAME_LENGTH) return null
  return trimmed
}
