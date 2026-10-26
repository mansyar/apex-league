/**
 * The debounced push queue (FR-5, AC-5).
 *
 * An autosave burst — the commits around a care action, a day advance, a
 * ceremony — must leave the client as one request, but a player who keeps
 * playing must still ship their ranch. So: flush after a quiet period, or at
 * the cap measured from the *first* write of the burst, whichever comes first.
 *
 * `schedule` and `cancel` are injected: the tests drive the clock by hand
 * instead of sleeping, and no real timer is ever created there.
 */
export interface PushQueueOptions {
  /** Send one payload. May throw; the queue does not care. */
  send: (payload: string) => void
  schedule: (fn: () => void, ms: number) => unknown
  cancel: (handle: unknown) => void
  debounceMs?: number
  capMs?: number
}

export interface PushQueue {
  /** Record a write; the latest payload is the one that ships. */
  note(payload: string): void
  /** Ship the pending payload now (a first sign-in cannot wait). */
  flush(): void
}

const DEFAULT_DEBOUNCE_MS = 2000
const DEFAULT_CAP_MS = 10_000

export function createPushQueue(opts: PushQueueOptions): PushQueue {
  const { send, schedule, cancel } = opts
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const capMs = opts.capMs ?? DEFAULT_CAP_MS
  let latest: string | null = null
  let debounce: unknown = null
  let cap: unknown = null

  function clearTimers(): void {
    if (debounce !== null) cancel(debounce)
    if (cap !== null) cancel(cap)
    debounce = null
    cap = null
  }

  function flush(): void {
    clearTimers()
    const payload = latest
    latest = null
    if (payload === null) return
    try {
      send(payload)
    } catch {
      // A failed push is a status, never an error state (FR-8): the local
      // save is already on disk and the next write will try again.
    }
  }

  return {
    note(payload) {
      latest = payload
      if (debounce !== null) cancel(debounce)
      debounce = schedule(flush, debounceMs)
      // The cap starts at the burst's first write and is not reset by later
      // ones, so a continuous player still ships on a fixed cadence.
      cap ??= schedule(flush, capMs)
    },
    flush,
  }
}
