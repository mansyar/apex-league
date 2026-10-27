/**
 * The leaderboard submitter (FR-1, NFR-2).
 *
 * Derives the four board entries from the save payload the push queue is
 * already flushing — the submit rides next to the save push, never ahead of
 * it — and sends only what changed since the last submit. A cup win lands
 * here through the same commit → adapter → push path as every other result,
 * so no cup flow needs its own hook.
 *
 * The four entries, each counted from the save rather than restated:
 * - cups: the `cupsWon` tally (placements pay ladder points, below).
 * - ladder: accumulated `ladder.points`, which never decrease.
 * - ap: lifetime AP invested in training — every program night spends one AP
 *   and stamps `trainingDays`, so the active pet plus the waiting stable is
 *   the trainer's total. A graduation banks the retiree's days in the Hall
 *   (the server keeps the peak), so the board never slides backwards.
 * - collection: breadth of the collection — distinct species + stage + form
 *   across the active pet, the stable, and the Hall of Fame (a retired
 *   career is always a champion of its archived branch).
 *
 * Everything here is fire-and-forget and quiet: a failed submit (offline, a
 * 4xx/5xx, a full quota on the snapshot) never throws, never touches the
 * sync status, and never blocks play or the save push it rode in on. Only
 * an `ok` answer moves the snapshot, so a failed entry retries on the next
 * push. The snapshot lives beside the save and the credentials, never inside
 * the save (NFR-1: the save is exported and shared).
 */
import type { GameState, SaveAdapter } from "@apex/sim"
import type { CloudApi, ScoreCategory, ScoreSubmission } from "./api"
import type { TrainerCredentials } from "./credentials"

/** The snapshot entry, beside the save and never inside it. */
export const SCORE_SNAPSHOT_KEY = "apex.scores"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** A board count: a non-negative integer, or 0 for anything else. */
function countOf(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0
}

/** One collection identity: species + stage + form. */
function collectionKey(
  speciesId: unknown,
  stage: unknown,
  branch: unknown,
): string | null {
  if (typeof speciesId !== "string" || speciesId.length === 0) return null
  const stagePart = typeof stage === "string" ? stage : ""
  const branchPart = typeof branch === "string" ? branch : ""
  return `${speciesId}|${stagePart}|${branchPart}`
}

/** Lifetime AP invested in training: active pet plus the waiting stable. */
function trainingAp(state: GameState): number {
  const pets = [
    state.creature,
    ...(Array.isArray(state.stable) ? state.stable : []),
  ]
  let total = 0
  for (const pet of pets) {
    if (!isRecord(pet)) continue
    total += countOf(pet.trainingDays)
  }
  return total
}

/**
 * Breadth of the collection: distinct species + stage + form across the
 * active pet, the stable, and the Hall of Fame. A retired career is always a
 * champion of its archived branch.
 */
function collectionBreadth(state: GameState): number {
  const keys = new Set<string>()
  const consider = (
    speciesId: unknown,
    stage: unknown,
    branch: unknown,
  ): void => {
    const key = collectionKey(speciesId, stage, branch)
    if (key !== null) keys.add(key)
  }
  if (isRecord(state.creature)) {
    consider(
      state.creature.speciesId,
      state.creature.stage,
      state.creature.branch,
    )
  }
  if (Array.isArray(state.stable)) {
    for (const pet of state.stable) {
      if (!isRecord(pet)) continue
      consider(pet.speciesId, pet.stage, pet.branch)
    }
  }
  const hallOfFame = isRecord(state.lineage) ? state.lineage.hallOfFame : null
  if (Array.isArray(hallOfFame)) {
    for (const record of hallOfFame) {
      if (!isRecord(record)) continue
      consider(record.speciesId, "champion", record.branch)
    }
  }
  return keys.size
}

/** The four board entries for a save state, each carrying the trainer name. */
export function deriveScoreEntries(
  state: GameState,
  name: string,
): ScoreSubmission[] {
  const ladderPoints = isRecord(state.ladder) ? countOf(state.ladder.points) : 0
  return [
    { category: "cups", value: countOf(state.cupsWon), name },
    { category: "ladder", value: ladderPoints, name },
    { category: "ap", value: trainingAp(state), name },
    { category: "collection", value: collectionBreadth(state), name },
  ]
}

/** The four board entries for a flushed save payload, or [] when unreadable. */
export function deriveScoreEntriesFromPayload(
  payload: string,
  name: string,
): ScoreSubmission[] {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (!isRecord(parsed) || !isRecord(parsed.state)) return []
    return deriveScoreEntries(parsed.state as unknown as GameState, name)
  } catch {
    return []
  }
}

interface ScoreSnapshot {
  trainerId: string
  name: string
  values: Partial<Record<ScoreCategory, number>>
}

function readSnapshot(
  storage: SaveAdapter,
  trainerId: string,
): ScoreSnapshot | null {
  try {
    const raw = storage.getItem(SCORE_SNAPSHOT_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if (parsed.trainerId !== trainerId) return null
    if (typeof parsed.name !== "string") return null
    if (!isRecord(parsed.values)) return null
    return {
      trainerId,
      name: parsed.name,
      values: parsed.values as Partial<Record<ScoreCategory, number>>,
    }
  } catch {
    return null
  }
}

export interface ScoreSubmitter {
  /**
   * Derive entries from a flushed save payload and submit what changed
   * (values or trainer name). Fire-and-forget: never throws, never awaits.
   */
  submitIfChanged(payload: string): void
}

export function createScoreSubmitter(opts: {
  api: Pick<CloudApi, "submitScore">
  storage: SaveAdapter
  credentials: () => TrainerCredentials | null
}): ScoreSubmitter {
  const { api, storage, credentials } = opts

  function markSubmitted(trainerId: string, entry: ScoreSubmission): void {
    try {
      const current = credentials()
      if (!current || current.id !== trainerId) return
      const snapshot = readSnapshot(storage, trainerId)
      const values = { ...(snapshot?.values ?? {}) }
      values[entry.category] = entry.value
      storage.setItem(
        SCORE_SNAPSHOT_KEY,
        JSON.stringify({ trainerId, name: entry.name, values }),
      )
    } catch {
      // A quota refusal just means the next push retries — stay quiet.
    }
  }

  return {
    submitIfChanged(payload) {
      try {
        const creds = credentials()
        if (!creds) return
        const entries = deriveScoreEntriesFromPayload(payload, creds.name)
        if (entries.length === 0) return
        const snapshot = readSnapshot(storage, creds.id)
        const previous = snapshot?.values ?? {}
        // A rename refreshes every board's label, so every entry resubmits.
        const renamed = snapshot !== null && snapshot.name !== creds.name
        const due = entries.filter(
          (entry) => renamed || previous[entry.category] !== entry.value,
        )
        if (due.length === 0) return
        for (const entry of due) {
          void api.submitScore(creds.id, creds.passphrase, entry).then(
            (result) => {
              if (result.ok) markSubmitted(creds.id, entry)
            },
            () => {},
          )
        }
      } catch {
        // Scores never interrupt play or the save push they rode in on.
      }
    },
  }
}
