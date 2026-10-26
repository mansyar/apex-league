/**
 * The adapter seam (FR-5, AC-11).
 *
 * `SaveAdapter` is synchronous and `store.ts` calls it inline on every
 * commit, so the cloud can never be on that path: a write lands in local
 * storage first, and only then is the payload handed to the push queue. The
 * read path is local storage, full stop — a slow or dead api cannot delay a
 * day, and a failed local write queues nothing.
 */
import { SAVE_KEY, type SaveAdapter } from "@apex/sim"

/**
 * A `SaveAdapter` that writes through to `local` and reports each successful
 * save write to `note`. Only the save key is a push candidate: credentials
 * and anything else stored through the same object stay on the device.
 */
export function createCloudSaveAdapter(
  local: SaveAdapter,
  note: (payload: string) => void,
): SaveAdapter {
  return {
    getItem: (key) => local.getItem(key),
    setItem(key, value) {
      // Deliberately not caught: a quota failure must stay visible to the
      // store's `onPersistError`, exactly as it is today.
      local.setItem(key, value)
      if (key === SAVE_KEY) note(value)
    },
    removeItem: (key) => local.removeItem(key),
  }
}
