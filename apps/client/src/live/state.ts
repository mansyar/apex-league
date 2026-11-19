/**
 * The invite surface's pure language (FR-5, AC-5): connection states, typed
 * errors and verdict copy all live here so the panel stays a thin DOM shell
 * and every line can be tested without a browser.
 */
import type { LiveVerdict } from "./protocol"

export type LiveStatus =
  | "idle"
  | "connecting"
  | "waiting"
  | "ready"
  | "fighting"
  | "verdict"
  | "error"
  | "closed"

/** One quiet sentence per connection state, safe to announce politely. */
export function statusCopy(status: LiveStatus): string {
  switch (status) {
    case "idle":
      return "Not connected."
    case "connecting":
      return "Opening the channel."
    case "waiting":
      return "Room open. Waiting for a second trainer."
    case "ready":
      return "Ready. Waiting for both trainers."
    case "fighting":
      return "Fight live."
    case "verdict":
      return "Bout complete."
    case "error":
      return "Connection problem. Try again."
    case "closed":
      return "Channel closed. Back to the ranch."
  }
}

/** A typed server code becomes coach language, never a raw error string. */
export function errorCopy(code: string): string {
  switch (code) {
    case "bad_code":
      return "That room code is not valid."
    case "bad_passphrase":
      return "Trainer passphrase was refused. Sign in again."
    case "room_not_found":
      return "No room has that code."
    case "room_full":
      return "That room is full."
    case "duplicate_join":
      return "You are already seated in that room."
    case "not_ready":
      return "Your seat is not ready yet."
    case "match_over":
      return "That bout has already finished."
    case "stale_intent":
      return "An order arrived too late and was ignored."
    case "transport":
      return "The channel could not open. Check the server."
    default:
      return "The channel could not complete that request."
  }
}

export interface VerdictCopy {
  readonly title: string
  readonly sub: string
}

/**
 * A verdict reads from the local seat's point of view. A forfeit is still a
 * verdict on the wire, so it gets an explicit line instead of a generic loss.
 */
export function verdictCopy(
  verdict: LiveVerdict,
  selfSeat: 0 | 1 | null,
  names: readonly [string, string],
): VerdictCopy {
  const winner = verdict.winnerSeat
  if (verdict.reason === "forfeit") {
    if (winner === null) {
      return { title: "Bout cancelled", sub: "Both trainers left the ring." }
    }
    const youWon = winner === selfSeat
    const forfeitingSeat: 0 | 1 = winner === 0 ? 1 : 0
    const winnerName = names[forfeitingSeat] || "The other trainer"
    return youWon
      ? {
          title: "Opponent forfeited",
          sub: `${winnerName} left the ring. You keep the win.`,
        }
      : {
          title: "You forfeited",
          sub: "Leaving mid-bout hands the win to your opponent.",
        }
  }

  if (winner === null) {
    return { title: "Draw", sub: "Neither trainer stood." }
  }
  const youWon = winner === selfSeat
  return youWon
    ? { title: "Victory", sub: "Your creature takes the bout." }
    : { title: "Defeat", sub: "Your opponent takes the bout." }
}
