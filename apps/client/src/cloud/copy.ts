/**
 * The cloud surface's copy (FR-8, FR-11, AC-8).
 *
 * Two hard requirements live here, as pure functions so they can be tested
 * without a DOM:
 *
 * - The passphrase promise is stated *before* a passphrase is set: there is
 *   no reset, and the trainer id is the credential. Both are stated plainly,
 *   in the coach's voice, in at most two sentences.
 * - Sync trouble is information, never an alarm. "Cloud copy behind" is a
 *   quiet fact about which copy is newer, not a warning that something broke
 *   (product guidelines: never block on the clock, respect the watch).
 */
import type { CloudStatus } from "./sync"

/**
 * Said once, above the passphrase fields, before anything is created.
 * Deliberately two sentences: the first names the recovery path, the second
 * names the thing that cannot be recovered.
 */
export const PASSPHRASE_NOTICE =
  "Pick a passphrase you'll remember — there's no reset, so your local save and an export file are the way back. Your trainer id is the credential, so keep it somewhere safe: without it and without the passphrase, the cloud copy can't be reached."

/** The title of the trainer surface. */
export const CLOUD_TITLE = "Trainer cloud"

/** The status line under the fields. Never an error, always a state. */
export function cloudStatusLine(status: CloudStatus): string {
  switch (status.kind) {
    case "signed-out":
      return "Cloud sync is off — this ranch lives on this device."
    case "syncing":
      return "Checking the cloud copy…"
    case "synced":
      return "Cloud copy is up to date."
    case "pending":
      return "Cloud copy is behind this device — it catches up after the next quiet moment."
    case "ahead":
      return "The cloud copy is behind this device — it catches up on the next boot."
    case "offline":
      return "Can't reach the cloud — playing on the local save, and the cloud copy is behind."
    case "locked":
      return "The cloud didn't accept these credentials — sign in again to resume syncing."
    case "unreadable":
      return "The cloud copy can't be read by this build — this ranch keeps playing."
  }
}

/** Why signing in did not happen, in the coach's voice. */
export function signInFailureLine(reason: string): string {
  switch (reason) {
    case "wrong-passphrase":
      return "That passphrase didn't match this trainer id."
    case "unknown-trainer":
      return "No trainer with that id — check it, or create a new trainer."
    case "no-passphrase":
      return "That trainer has no passphrase yet — create a new trainer here instead."
    case "offline":
      return "Can't reach the cloud right now — you can sign in again later."
    case "invalid":
      return "Fill in the trainer id and a passphrase first."
    default:
      return "The cloud turned that down — nothing changed on this device."
  }
}
