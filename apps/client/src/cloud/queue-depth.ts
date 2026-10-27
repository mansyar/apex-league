import type { SaveAdapter } from "@apex/sim"
import { GHOST_PENDING_KEY } from "./ghosts"

/**
 * Unsent cloud work, counted for the queue sentence (FR-14).
 *
 * Two things can wait: the debounced save inside the push queue (0 or 1)
 * and the parked ghost bundle beside the save in storage (0 or 1). A
 * refused storage read means nothing provable is waiting, so it counts
 * zero — the sentence understates rather than invents.
 */
export function queueDepth(
  queue: { pending(): number },
  storage: SaveAdapter,
): number {
  let ghost = 0
  try {
    ghost = storage.getItem(GHOST_PENDING_KEY) === null ? 0 : 1
  } catch {
    ghost = 0
  }
  return queue.pending() + ghost
}
