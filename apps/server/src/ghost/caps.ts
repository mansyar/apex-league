/**
 * Plausibility caps for ghost bundles (ghost_data_async_rivals, Phase 2).
 *
 * Two rails, same philosophy as the saves byte cap and the leaderboard
 * plausibility predicates: far above any legitimate bundle, far below
 * absurdity. Shape first (`isPlausibleGhost`), size second
 * (`isWithinGhostLimit`) — both reject quietly, leaving any stored best
 * untouched.
 *
 * The version pin is deliberately tolerant: any non-negative integer
 * `simVersion` passes. A bundle from a newer sim than this server still
 * stores and lists; the reader, not the store, decides whether the version
 * is replayable (a mismatch skips the replay and keeps the listing entry).
 * Only the shape is foreign-or-not.
 */

/** How large an uploaded bundle may be, serialized. A ghost is one battle —
 * two kits plus one event log — where a save is a whole career, so matching
 * the save cap (256 KiB) is generous with wide headroom. An oversized body
 * is refused, never truncated.
 */
export const MAX_GHOST_BYTES = 256 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

/** One battle side: a named fighter with an element, a non-empty kit and
 * frozen stats. The element is required so the client's spar reader and the
 * store agree on fightability: an element-less bundle would store and list
 * yet never grow a Fight button. */
function isGhostSide(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (typeof value.name !== "string" || value.name.length === 0) return false
  if (typeof value.element !== "string" || value.element.length === 0) {
    return false
  }
  if (!Array.isArray(value.kit) || value.kit.length === 0) return false
  if (!value.kit.every((move) => typeof move === "string")) return false
  return isRecord(value.stats)
}

/** One announcer-visible beat. Kinds are not enumerated on purpose: a newer
 * sim may add kinds, and those bundles must still store and list. */
function isGhostEvent(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (!isNonNegativeInteger(value.tick)) return false
  if (typeof value.kind !== "string" || typeof value.actor !== "string") {
    return false
  }
  return isRecord(value.hpAfter)
}

/**
 * Whether `value` has the shape of a ghost bundle: a version pin, the
 * deciding battle's seed and position, both sides, a winner or a drawn
 * final, and a non-empty event log. Never throws, never logs the payload —
 * error bodies name the field, never the value.
 */
export function isPlausibleGhost(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (!isNonNegativeInteger(value.simVersion)) return false
  if (!isNonNegativeInteger(value.seed)) return false
  if (!isNonNegativeInteger(value.day)) return false
  if (!isNonNegativeInteger(value.round)) return false
  if (!isGhostSide(value.player) || !isGhostSide(value.rival)) return false
  if (
    value.winner !== null &&
    (typeof value.winner !== "string" || value.winner.length === 0)
  ) {
    return false
  }
  if (!Array.isArray(value.events) || value.events.length === 0) return false
  return value.events.every(isGhostEvent)
}

/** The bundle's size on the wire. Bytes, not characters: a bundle full of
 * multi-byte creature names is larger than `JSON.stringify` length suggests.
 */
export function ghostBytes(ghost: unknown): number {
  return Buffer.byteLength(JSON.stringify(ghost) ?? "", "utf8")
}

export function isWithinGhostLimit(ghost: unknown): boolean {
  return ghostBytes(ghost) <= MAX_GHOST_BYTES
}
