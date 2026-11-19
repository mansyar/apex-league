/**
 * A thin WebSocket adapter for the live slice (FR-6, NFR-4). It owns exactly
 * one socket, stamps messages through `protocol.ts`, and reports decoded
 * frames to the caller. It knows nothing about the arena, the ranch or the
 * store, which keeps the hand-off testable and the passphrase in one place.
 */
import type { LiveIntent } from "@apex/sim"
import type { TrainerCredentials } from "../cloud/credentials"
import {
  basicIntent,
  decodeServerEvent,
  intentMessage,
  openMessage,
  type RoomAction,
  readyMessage,
  type ServerEvent,
} from "./protocol"
import type { LiveStatus } from "./state"

export interface LiveTransportHandlers {
  /** Connection transitions the surface should show and announce. */
  status(status: LiveStatus): void
  /** A decoded server frame (snapshot, verdict or typed error). */
  event(event: ServerEvent): void
}

export interface LiveTransport {
  connect(
    action: RoomAction,
    code: string,
    credentials: TrainerCredentials,
  ): void
  ready(): void
  intent(seq: number, intent?: LiveIntent): void
  close(): void
}

/**
 * A failed handshake fires `error` then `close`. Remembering which one won
 * keeps the "could not open" message from being overwritten by the generic
 * "closed" one; an intentional close never announces either.
 */
export function createLiveTransport(options: {
  url: string
  handlers: LiveTransportHandlers
  makeSocket?: (url: string) => WebSocket
}): LiveTransport {
  let socket: WebSocket | null = null
  let action: RoomAction = "create"
  let code = ""
  let trainerId = ""
  let passphrase = ""
  let closing = false
  let failed = false

  function send(message: string): void {
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(message)
  }

  return {
    connect(nextAction, nextCode, credentials) {
      if (socket) return
      action = nextAction
      code = nextCode
      trainerId = credentials.id
      passphrase = credentials.passphrase
      closing = false
      failed = false
      options.handlers.status("connecting")
      const open = options.makeSocket ?? ((url: string) => new WebSocket(url))
      const ws = open(options.url)
      socket = ws
      ws.onopen = () => {
        send(openMessage(action, code, { id: trainerId, passphrase }))
        // No ack exists on create/join: opening plus the absence of a typed
        // error is the success signal; the first snapshot confirms the room.
        options.handlers.status("waiting")
      }
      ws.onmessage = (message) => {
        const event = decodeServerEvent(message.data)
        if (event) options.handlers.event(event)
      }
      ws.onerror = () => {
        failed = true
        options.handlers.event({
          kind: "error",
          code: "transport",
          detail: "The channel could not open.",
        })
      }
      ws.onclose = () => {
        socket = null
        if (!closing && !failed) options.handlers.status("closed")
      }
    },

    ready() {
      send(readyMessage(code, trainerId))
    },

    intent(seq, intent = basicIntent()) {
      send(intentMessage(seq, intent))
    },

    close() {
      closing = true
      const live = socket
      socket = null
      if (live) live.close()
    },
  }
}
