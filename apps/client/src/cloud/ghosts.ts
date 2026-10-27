/**
 * Ghost sync alongside the save push (FR-2, FR-6, AC-2, AC-6, NFR-5).
 *
 * A cup-winning bundle is derived from the cup session (never the save, so
 * no save-schema bump) and queues beside the save. It rides the next push —
 * debounced or first-submit — fire-and-forget and quiet. The board loader
 * serves the last good fetch when the cloud is out of reach.
 */
import type { SaveAdapter } from "@apex/sim"
import type { CloudApi, GhostBoardEntry, GhostBoardPayload } from "./api"
import type { TrainerCredentials } from "./credentials"

/** The queued cup-winning bundle, beside the save and never inside it. */
export const GHOST_PENDING_KEY = "apex.ghost.pending"

/** The last good ghost board, beside the save and never inside it. */
export const GHOST_SNAPSHOT_KEY = "apex.ghosts"

/** The last good board: its rows and when they were seen. */
export interface GhostSnapshot {
  entries: GhostBoardEntry[]
  fetchedAt: number
}

/** What opening the ghost board paints: live, snapshot, or empty. */
export type GhostBoardLoad =
  | { kind: "live"; entries: GhostBoardEntry[] }
  | { kind: "snapshot"; entries: GhostBoardEntry[] }
  | { kind: "unavailable" }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * A served row: rank, trainer and stamp are shaped like the wire, and the
 * bundle stays opaque — a future sim version still lists, the spar reader
 * skips what it cannot replay.
 */
export function isGhostBoardEntry(value: unknown): value is GhostBoardEntry {
  if (!isRecord(value)) return false
  return (
    typeof value.rank === "number" &&
    Number.isInteger(value.rank) &&
    value.rank > 0 &&
    typeof value.trainerId === "string" &&
    value.trainerId.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt) &&
    isRecord(value.ghost)
  )
}

function entriesOf(value: unknown): GhostBoardEntry[] | null {
  if (!Array.isArray(value)) return null
  // A malformed row drops; the board it rode in on still shows.
  return value.filter(isGhostBoardEntry)
}

/** The last good fetch, or null when none was ever written or kept. */
export function readGhostSnapshot(storage: SaveAdapter): GhostSnapshot | null {
  try {
    const raw = storage.getItem(GHOST_SNAPSHOT_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    const entries = entriesOf(parsed.entries)
    if (entries === null) return null
    if (
      typeof parsed.fetchedAt !== "number" ||
      !Number.isFinite(parsed.fetchedAt)
    ) {
      return null
    }
    return { entries, fetchedAt: parsed.fetchedAt }
  } catch {
    return null
  }
}

/** Remember a good fetch. A refused write stays quiet — next fetch retries. */
export function writeGhostSnapshot(
  storage: SaveAdapter,
  snapshot: GhostSnapshot,
): void {
  try {
    storage.setItem(GHOST_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // A full quota just means the next fetch retries — stay quiet.
  }
}

export interface GhostSubmitter {
  /** Queue a cup-winning bundle beside the save; overwrites the last. */
  queueGhost(bundle: unknown): void
  /** Fire-and-forget: send the pending bundle, clear only on ok. */
  submitPending(): void
}

/**
 * The pending bundle, queued at cup finalization and flushed by the save
 * push. Only an `ok` clears the queue, so a rename can recover a rejected
 * submit; everything else retries on the next push. Nothing here throws and
 * nothing touches the sync status — the save moves on regardless.
 */
export function createGhostSubmitter(opts: {
  api: Pick<CloudApi, "submitGhost">
  storage: SaveAdapter
  credentials: () => TrainerCredentials | null
}): GhostSubmitter {
  const { api, storage, credentials } = opts

  return {
    queueGhost(bundle: unknown): void {
      try {
        const raw = JSON.stringify(bundle)
        if (typeof raw !== "string") return
        storage.setItem(GHOST_PENDING_KEY, raw)
      } catch {
        // A refused write just means no ghost rides the next push.
      }
    },

    submitPending(): void {
      try {
        const creds = credentials()
        if (creds === null) return
        const raw = storage.getItem(GHOST_PENDING_KEY)
        if (raw === null) return
        let ghost: unknown
        try {
          ghost = JSON.parse(raw)
        } catch {
          storage.removeItem(GHOST_PENDING_KEY)
          return
        }
        if (!isRecord(ghost)) {
          storage.removeItem(GHOST_PENDING_KEY)
          return
        }
        const submit = api.submitGhost
        if (typeof submit !== "function") return
        void submit
          .call(api, creds.id, creds.passphrase, ghost, creds.name)
          .then((result) => {
            if (result.ok) {
              try {
                storage.removeItem(GHOST_PENDING_KEY)
              } catch {
                // The next flush finds nothing new — stay quiet.
              }
            }
          })
          .catch(() => {
            // Offline or hung: the bundle waits for the next push.
          })
      } catch {
        // The save push must never depend on its passenger.
      }
    },
  }
}

/**
 * The ghost board on open: live rows refresh the snapshot, anything else
 * falls back to the whole snapshot with its stamp, and a missing snapshot
 * is an empty board rather than an error. Never throws.
 */
export function createGhostBoardLoader(opts: {
  api: Pick<CloudApi, "readGhosts">
  storage: SaveAdapter
  now: () => number
}): { load(): Promise<GhostBoardLoad> } {
  const { api, storage, now } = opts

  function fallback(): GhostBoardLoad {
    const snapshot = readGhostSnapshot(storage)
    if (snapshot === null) return { kind: "unavailable" }
    return { kind: "snapshot", entries: snapshot.entries }
  }

  return {
    async load(): Promise<GhostBoardLoad> {
      try {
        const answer = await api.readGhosts()
        if (!answer.ok) return fallback()
        const payload = answer.value as GhostBoardPayload | null
        const entries = entriesOf(isRecord(payload) ? payload.entries : null)
        // A malformed body is not a board: fall back whole, never paint it.
        if (entries === null) return fallback()
        writeGhostSnapshot(storage, { entries, fetchedAt: now() })
        return { kind: "live", entries }
      } catch {
        return fallback()
      }
    },
  }
}
