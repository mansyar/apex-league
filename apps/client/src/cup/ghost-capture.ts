/**
 * Cup-win ghost capture (ghost_data_async_rivals, review R1/F1): the one
 * production call site that turns a finished cup into a queued ghost.
 *
 * `conclude()` hands the finished session here through `onFinalize`: a
 * championship captures its deciding-final replay bundle and queues it
 * beside the save, and the next push flushes it after the save (flush
 * ordering lives in `cloud/sync.ts`). Anything else — a loss, a forfeit, a
 * live session — captures nothing and queues nothing: `buildGhostBundle`
 * returns null and this stays silent, like every other ghost no-op.
 */
import { buildGhostBundle, type CupSession } from "@apex/sim"

/**
 * Capture the finished session's ghost and queue it for the next push.
 * Returns true only when a bundle was actually queued.
 */
export function captureCupGhost(
  session: CupSession,
  queueGhost: (bundle: unknown) => void,
): boolean {
  const bundle = buildGhostBundle(session)
  if (bundle === null) return false
  queueGhost(bundle)
  return true
}
