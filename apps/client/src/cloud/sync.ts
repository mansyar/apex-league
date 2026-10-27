/**
 * The sync coordinator (FR-4, FR-5, FR-7, FR-8, AC-4, AC-5, AC-7, AC-8).
 *
 * It owns the one cloud conversation the client has: a single pull at boot,
 * a guarded adoption, the first-sign-in upload, and the debounced push that
 * rides behind the local autosave. It never blocks a day — entries return
 * immediately or resolve a status, never throw — and the read path stays
 * local (`getItem` is still local storage).
 *
 * Adoption is one-way and guarded (FR-7, AC-7): a cloud copy is only
 * adopted when strictly newer, and a local ranch uploads only when the
 * trainer has no cloud save. Signing in beside an existing cloud save
 * changes nothing on either side.
 */
import {
  inspectSaveImport,
  loadSave,
  SAVE_KEY,
  type SaveAdapter,
  type SaveData,
} from "@apex/sim"
import type { ApiFailure, CloudApi, SaveRecord } from "./api"
import { MIN_PASSPHRASE_LENGTH } from "./config"
import {
  clearCredentials,
  readCredentials,
  type TrainerCredentials,
  writeCredentials,
} from "./credentials"
import { createGhostSubmitter } from "./ghosts"
import { createPushQueue, type PushQueue } from "./push-queue"
import { queueDepth } from "./queue-depth"
import { fingerprint, savedAtOf } from "./save-payload"
import { createScoreSubmitter } from "./scores"

/** What the quiet status line says. Information, never an alarm (FR-8). */
export type CloudStatus =
  | { kind: "signed-out" }
  | { kind: "syncing" }
  | { kind: "synced"; at: number }
  /** Local changes waiting for their debounce window. */
  | { kind: "pending" }
  /** The cloud copy is newer than this device's. */
  | { kind: "ahead" }
  | { kind: "offline" }
  /** The cloud refused these credentials; sign in again. */
  | { kind: "locked" }
  /** The cloud copy cannot be read by this build (corrupt or from the future). */
  | { kind: "unreadable" }

/** Why signing in did not happen, in the terms the surface coaches with. */
export type SignInFailure =
  | "offline"
  | "wrong-passphrase"
  | "unknown-trainer"
  | "no-passphrase"
  | "invalid"
  | "rejected"

export type SignInResult = { ok: true } | { ok: false; reason: SignInFailure }

export interface CloudSync {
  /** The boot pull. Resolves when the conversation ends; never awaited by boot. */
  start(): Promise<void>
  signIn(id: string, passphrase: string): Promise<SignInResult>
  createTrainer(name: string, passphrase: string): Promise<SignInResult>
  signOut(): void
  /** A local save write, from the adapter seam. */
  noteLocalWrite(payload: string): void
  /** Queue a cup-winning ghost; the next push flushes it after the save. */
  queueGhost(bundle: unknown): void
  /** Unsent work: the debounced save (0/1) plus the parked ghost (0/1). */
  queuedPushes(): number
  /** Where a newer cloud save goes. Set once, by the composition root. */
  adoptWith(adopt: (data: SaveData) => void): void
  subscribe(listener: (status: CloudStatus) => void): () => void
  status(): CloudStatus
}

export function createCloudSync(opts: {
  api: CloudApi
  storage: SaveAdapter
  now: () => number
  schedule: (fn: () => void, ms: number) => unknown
  cancel: (handle: unknown) => void
  debounceMs?: number
  capMs?: number
}): CloudSync {
  const { api, storage, now, schedule, cancel } = opts
  let credentials: TrainerCredentials | null = readCredentials(storage)
  let adopt: ((data: SaveData) => void) | null = null
  let started = false
  /** The content of the save the cloud just gave us: never echo it back. */
  let adoptedEcho: string | null = null
  let status: CloudStatus = credentials
    ? { kind: "syncing" }
    : { kind: "signed-out" }
  const listeners: Array<(status: CloudStatus) => void> = []

  function setStatus(next: CloudStatus): void {
    status = next
    for (const listener of [...listeners]) listener(next)
  }

  function failureStatus(failure: { reason: ApiFailure }): void {
    if (failure.reason === "offline") setStatus({ kind: "offline" })
    else if (failure.reason === "unauthorized") setStatus({ kind: "locked" })
    else setStatus({ kind: "ahead" })
  }

  /** Adopt `record` when it is strictly newer than what is on this device. */
  function reconcile(record: SaveRecord): void {
    const inspected = inspectSaveImport(record.payload)
    if (!inspected.ok) {
      // A future build's save is stored opaquely by the server (NFR-1): this
      // client refuses it and keeps its own ranch, never downgrading it.
      setStatus({
        kind: inspected.reason === "future-version" ? "ahead" : "unreadable",
      })
      return
    }
    const local = loadSave(storage)
    if (local !== null && local.savedAt >= record.savedAt) {
      // This device is level or ahead: nothing to adopt, and nothing to push
      // yet — the next autosave is what carries the newer copy up.
      setStatus(
        local.savedAt === record.savedAt
          ? { kind: "synced", at: record.savedAt }
          : { kind: "pending" },
      )
      return
    }
    adoptedEcho = fingerprint(record.payload)
    adopt?.(inspected.data)
    setStatus({ kind: "synced", at: record.savedAt })
  }

  async function pushNow(payload: string): Promise<void> {
    // The leaderboard submit rides next to the save push: same trigger,
    // fire-and-forget, and quiet by construction — it never throws and never
    // touches the status below, so a failed submit cannot move the save.
    scores.submitIfChanged(payload)
    const savedAt = savedAtOf(payload)
    if (credentials === null || savedAt === null) return
    const result = await api.push(
      credentials.id,
      credentials.passphrase,
      payload,
      savedAt,
    )
    if (!result.ok) {
      failureStatus(result)
      // The ghost rides after the save request; offline stays queued.
      ghosts.submitPending()
      return
    }
    // `stored: false` with a 200 is normal: our copy was older, so the server
    // kept its own. Keep playing here; the next boot pulls theirs. The
    // receipt's `winner` is "incoming" | "stored", never a clock, so the
    // synced stamp is the pushed payload's own `savedAt`.
    setStatus(
      result.value.stored ? { kind: "synced", at: savedAt } : { kind: "ahead" },
    )
    ghosts.submitPending()
  }

  const queue: PushQueue = createPushQueue({
    send: (payload) => {
      void pushNow(payload)
    },
    schedule,
    cancel,
    debounceMs: opts.debounceMs,
    capMs: opts.capMs,
  })

  const scores = createScoreSubmitter({
    api,
    storage,
    credentials: () => credentials,
  })

  const ghosts = createGhostSubmitter({
    api,
    storage,
    credentials: () => credentials,
  })

  /** Upload this device's ranch as the trainer's first cloud save (FR-7).
   * Returns whether the caller must settle the status itself: false only when
   * there was nothing to push (no local save). A failed push settles its own
   * status via failureStatus, so it returns true — the caller must not
   * overwrite that with "synced". */
  async function uploadLocal(): Promise<boolean> {
    const payload = storage.getItem(SAVE_KEY)
    if (payload === null || credentials === null) return false
    const savedAt = savedAtOf(payload)
    if (savedAt === null) return false
    const result = await api.push(
      credentials.id,
      credentials.passphrase,
      payload,
      savedAt,
    )
    if (!result.ok) {
      failureStatus(result)
      return true
    }
    // The receipt's `winner` is "incoming" | "stored", never a clock: the
    // synced stamp is the uploaded payload's own `savedAt`.
    setStatus(
      result.value.stored ? { kind: "synced", at: savedAt } : { kind: "ahead" },
    )
    // First-submit flush in order with the save.
    ghosts.submitPending()
    return true
  }

  function remember(next: TrainerCredentials): void {
    credentials = next
    writeCredentials(storage, next)
  }

  return {
    adoptWith(next) {
      adopt = next
    },

    subscribe(listener) {
      listeners.push(listener)
      return () => {
        const at = listeners.indexOf(listener)
        if (at !== -1) listeners.splice(at, 1)
      }
    },

    status: () => status,

    async start() {
      if (started) return
      started = true
      if (credentials === null) {
        setStatus({ kind: "signed-out" })
        return
      }
      setStatus({ kind: "syncing" })
      const result = await api.pull(credentials.id, credentials.passphrase)
      if (result.ok) {
        reconcile(result.value)
        return
      }
      // No cloud save yet is not a failure: this device simply has the only
      // copy, and its next autosave will upload it.
      if (result.reason === "not-found") {
        setStatus({ kind: "synced", at: now() })
        return
      }
      failureStatus(result)
    },

    async signIn(id, passphrase) {
      const trainerId = id.trim()
      if (trainerId.length === 0 || passphrase.length === 0) {
        return { ok: false, reason: "invalid" }
      }
      setStatus({ kind: "syncing" })
      const trainer = await api.getTrainer(trainerId)
      if (!trainer.ok) {
        failureStatus(trainer)
        return {
          ok: false,
          reason:
            trainer.reason === "not-found" ? "unknown-trainer" : "offline",
        }
      }
      if (!trainer.value.hasPassphrase) {
        setStatus({ kind: "locked" })
        return { ok: false, reason: "no-passphrase" }
      }
      const pull = await api.pull(trainerId, passphrase)
      if (pull.ok) {
        // An existing cloud save: adopt only if it is newer, and never push
        // this device's copy over it (AC-7).
        remember({
          id: trainerId,
          name: trainer.value.name,
          passphrase,
        })
        reconcile(pull.value)
        return { ok: true }
      }
      if (pull.reason === "not-found") {
        // First sign-in for this trainer: the ranch here becomes theirs.
        // With no local save yet there is nothing to upload — settle out of
        // "syncing" so the panel never reads stuck (AC-5's quiet note needs a
        // settled status underneath it).
        remember({ id: trainerId, name: trainer.value.name, passphrase })
        if (!(await uploadLocal())) setStatus({ kind: "synced", at: now() })
        return { ok: true }
      }
      if (pull.reason === "unauthorized") {
        setStatus({ kind: "locked" })
        return { ok: false, reason: "wrong-passphrase" }
      }
      if (pull.reason === "conflict") {
        setStatus({ kind: "locked" })
        return { ok: false, reason: "no-passphrase" }
      }
      failureStatus(pull)
      return { ok: false, reason: "offline" }
    },

    async createTrainer(name, passphrase) {
      if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
        return { ok: false, reason: "invalid" }
      }
      const trainerName = name.trim()
      setStatus({ kind: "syncing" })
      const created = await api.createTrainer()
      if (!created.ok) {
        failureStatus(created)
        return { ok: false, reason: "offline" }
      }
      const id = created.value.id
      const named = await api.updateTrainer(id, {
        name: trainerName,
        passphrase,
      })
      if (!named.ok) {
        failureStatus(named)
        return { ok: false, reason: "rejected" }
      }
      remember({ id, name: trainerName, passphrase })
      if (!(await uploadLocal())) setStatus({ kind: "synced", at: now() })
      return { ok: true }
    },

    signOut() {
      credentials = null
      clearCredentials(storage)
      setStatus({ kind: "signed-out" })
    },

    noteLocalWrite(payload) {
      if (credentials === null) return
      // The store re-persists an adopted save with a fresh stamp: that is the
      // same ranch we just received, so sending it back would bump the cloud
      // clock for no reason and could displace another device's copy.
      const content = fingerprint(payload)
      if (content !== null && content === adoptedEcho) return
      if (content !== null) adoptedEcho = null
      queue.note(payload)
    },

    queueGhost(bundle: unknown) {
      ghosts.queueGhost(bundle)
    },

    queuedPushes() {
      // The queue sentence reads in words beside the status (FR-14).
      return queueDepth(queue, storage)
    },
  }
}
