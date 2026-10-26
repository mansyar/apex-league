/**
 * The cloud seam as the composition root sees it (FR-11, AC-11, NFR-6).
 *
 * `createCloudSave` is a construction-time branch: with no origin this build
 * has no cloud object at all, so no request can be made, no status can appear
 * and the client behaves exactly as it did before this track. That is
 * deliberately not a runtime catch — a build without an api address must not
 * even try to reach one.
 *
 * With an origin, it returns the adapter the store should use (write-through
 * to local storage plus the debounced push) and the sync that owns the
 * conversation. Nothing here awaits the network: `sync.start()` is kicked off
 * by the composition root and its promise is dropped.
 */
import type { SaveAdapter } from "@apex/sim"
import { createCloudSaveAdapter } from "./adapter"
import { type CloudApi, createCloudApi, type FetchLike } from "./api"
import { cloudOrigin } from "./config"
import { type CloudSync, createCloudSync } from "./sync"

export interface CloudSave {
  /** The store's adapter: local storage, with the push riding behind it. */
  adapter: SaveAdapter
  sync: CloudSync
  api: CloudApi
}

export function createCloudSave(opts: {
  origin: string | undefined
  local: SaveAdapter
  now: () => number
  schedule: (fn: () => void, ms: number) => unknown
  cancel: (handle: unknown) => void
  fetch: FetchLike
  signal: () => AbortSignal | undefined
  debounceMs?: number
  capMs?: number
}): CloudSave | null {
  const origin = cloudOrigin(opts.origin)
  if (origin === null) return null
  const api = createCloudApi({
    origin,
    fetch: opts.fetch,
    signal: opts.signal,
  })
  const sync = createCloudSync({
    api,
    storage: opts.local,
    now: opts.now,
    schedule: opts.schedule,
    cancel: opts.cancel,
    debounceMs: opts.debounceMs,
    capMs: opts.capMs,
  })
  return {
    api,
    sync,
    adapter: createCloudSaveAdapter(opts.local, (payload) => {
      sync.noteLocalWrite(payload)
    }),
  }
}
