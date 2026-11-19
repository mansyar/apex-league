/**
 * The Elysia WebSocket route (FR-4, AC-4). Connection logic lives in a
 * transport-agnostic core so fake sockets can drive it with no port, timer or
 * network; `.ws()` is a thin adapter over that same core.
 */

import type { Database } from "bun:sqlite"
import {
  type BattleSide,
  LIVE_ERROR_CODES,
  LIVE_PROTOCOL_VERSION,
  type LiveErrorCode,
  type LiveServerMessage,
  parseMessage,
  type SeatIndex,
} from "@apex/sim"
import { Elysia } from "elysia"
import { claimTrainer, findTrainer } from "../identity/trainer"
import {
  createMatchLoop,
  type LiveClock,
  type MatchLoop,
  type MatchTransport,
} from "./loop"
import {
  type Authenticate,
  type Claim,
  createRoomRegistry,
  type TrainerIdentity,
} from "./room"

/** Socket surface the core needs; `ElysiaWS` satisfies it through a bridge. */
export interface LiveSocket {
  send(message: LiveServerMessage): void
  close(): void
}

/** Builds the two sim sides from seated trainers — pure and deterministic. */
export type SidesForMatch = (
  identities: readonly [TrainerIdentity, TrainerIdentity],
) => readonly [BattleSide, BattleSide]

export interface LiveServerOptions {
  readonly authenticate: Authenticate
  readonly clock?: LiveClock
  readonly sides?: SidesForMatch
}

export interface LiveServer {
  receive(socket: LiveSocket, raw: string): Promise<void>
  disconnect(socket: LiveSocket): void
}

/** Trainer identity from the passphrase store; the claim never leaves. */
export function dbAuthenticate(db: Database): Authenticate {
  return async (claim: Claim) => {
    if (!(await claimTrainer(db, claim.trainerId, claim.passphrase))) {
      return undefined
    }
    const trainer = findTrainer(db, claim.trainerId)
    return trainer ? { trainerId: trainer.id, name: trainer.name } : undefined
  }
}

/** Fixed, deterministic sides so two identities can drive the sim. */
export function sidesForMatch(
  identities: readonly [TrainerIdentity, TrainerIdentity],
): readonly [BattleSide, BattleSide] {
  function side(seat: SeatIndex): BattleSide {
    const trainer = identities[seat]
    return {
      name: trainer?.name || trainer?.trainerId || "Trainer",
      id: trainer?.trainerId,
      element: seat === 0 ? "fire" : "water",
      stats: { hp: 80, atk: 10, def: 8, spd: 10 },
      kit: ["basic", "spark", "flare_dart"],
      tactic: "balanced",
      temperament: "rush",
    }
  }
  return [side(0), side(1)]
}

interface Binding {
  readonly code: string
  readonly trainerId: string
  readonly seat: SeatIndex
}

function errorCodeFor(reason: string): LiveErrorCode {
  switch (reason) {
    case "bad_code":
      return LIVE_ERROR_CODES.badCode
    case "bad_passphrase":
      return LIVE_ERROR_CODES.badPassphrase
    case "room_not_found":
      return LIVE_ERROR_CODES.roomNotFound
    case "room_full":
      return LIVE_ERROR_CODES.roomFull
    case "duplicate_join":
      return LIVE_ERROR_CODES.duplicateJoin
    default:
      return LIVE_ERROR_CODES.malformed
  }
}

/** One registry, one loop per room, one binding and audience per socket. */
export function createLiveServer(options: LiveServerOptions): LiveServer {
  const clock = options.clock ?? { now: () => Date.now() }
  const sides = options.sides ?? sidesForMatch
  const rooms = createRoomRegistry({ authenticate: options.authenticate })
  const loops = new Map<string, MatchLoop>()
  const bindings = new WeakMap<LiveSocket, Binding>()
  const audience = new Map<string, Set<LiveSocket>>()

  function fail(socket: LiveSocket, code: LiveErrorCode, detail: string): void {
    socket.send({ v: LIVE_PROTOCOL_VERSION, kind: "error", code, detail })
  }

  function transportFor(code: string): MatchTransport {
    return {
      send(message) {
        for (const peer of audience.get(code) ?? []) peer.send(message)
      },
    }
  }

  function subscribe(code: string, socket: LiveSocket): void {
    let peers = audience.get(code)
    if (!peers) {
      peers = new Set()
      audience.set(code, peers)
    }
    peers.add(socket)
  }

  function pump(code: string): void {
    const loop = loops.get(code)
    if (!loop) return
    loop.pump()
    if (loop.finished) loops.delete(code)
  }

  return {
    async receive(socket, raw) {
      const parsed = parseMessage(raw)
      if (!parsed.ok) {
        fail(socket, parsed.error, "message rejected")
        return
      }
      const message = parsed.message
      switch (message.kind) {
        case "create": {
          const claim: Claim = {
            trainerId: message.trainerId,
            passphrase: message.passphrase,
          }
          const outcome = await rooms.create(message.code, claim)
          if (!outcome.ok) {
            fail(socket, errorCodeFor(outcome.reason), "room not opened")
            return
          }
          bindings.set(socket, {
            code: message.code,
            trainerId: message.trainerId,
            seat: 0,
          })
          subscribe(message.code, socket)
          return
        }
        case "join": {
          const claim: Claim = {
            trainerId: message.trainerId,
            passphrase: message.passphrase,
          }
          const outcome = await rooms.join(message.code, claim)
          if (!outcome.ok) {
            fail(socket, errorCodeFor(outcome.reason), "seat not assigned")
            return
          }
          bindings.set(socket, {
            code: message.code,
            trainerId: message.trainerId,
            seat: outcome.seat,
          })
          subscribe(message.code, socket)
          return
        }
        case "ready": {
          const binding = bindings.get(socket)
          if (
            !binding ||
            binding.code !== message.code ||
            binding.trainerId !== message.trainerId
          ) {
            fail(socket, LIVE_ERROR_CODES.notReady, "not seated")
            return
          }
          const outcome = rooms.ready(message.code, message.trainerId)
          if (!outcome.ok) {
            fail(socket, LIVE_ERROR_CODES.notReady, "not ready")
            return
          }
          if (outcome.start) {
            loops.set(
              message.code,
              createMatchLoop({
                code: outcome.start.code,
                seed: outcome.start.seed,
                sides: sides(outcome.start.identities),
                identities: outcome.start.identities,
                clock,
                transport: transportFor(message.code),
              }),
            )
          }
          pump(message.code)
          return
        }
        case "intent": {
          const binding = bindings.get(socket)
          if (!binding) {
            fail(socket, LIVE_ERROR_CODES.notReady, "not seated")
            return
          }
          const loop = loops.get(binding.code)
          if (!loop) {
            fail(socket, LIVE_ERROR_CODES.matchOver, "no live match")
            return
          }
          if (!loop.intent(binding.seat, message.seq, message.intent)) {
            if (!loop.finished) {
              fail(socket, LIVE_ERROR_CODES.staleIntent, "order ignored")
            }
          }
          pump(binding.code)
          return
        }
        default:
          fail(socket, LIVE_ERROR_CODES.malformed, "unexpected message")
      }
    },

    disconnect(socket) {
      const binding = bindings.get(socket)
      if (!binding) return
      bindings.delete(socket)
      audience.get(binding.code)?.delete(socket)
      const loop = loops.get(binding.code)
      const outcome = rooms.disconnect(binding.code, binding.trainerId)
      if (!outcome.ok) return
      if (outcome.room === null) {
        if (outcome.forfeitWinner !== null) loop?.forfeit(binding.seat)
        loops.delete(binding.code)
        audience.delete(binding.code)
      }
    },
  }
}

/** Minimal ElysiaWS surface the adapter bridges onto the core. */
export interface LiveSocketHost {
  readonly raw: object
  send(message: LiveServerMessage): void
  close(): void
}

export interface LiveAdapter {
  message(ws: LiveSocketHost, raw: unknown): Promise<void>
  close(ws: LiveSocketHost): void
}

/**
 * The Elysia-facing handler functions. One stable socket bridge per connection,
 * so per-client state survives across the wrapper Elysia builds for each event.
 * Tests drive these exact functions with fake hosts — no port or network.
 */
export function createLiveAdapter(options: LiveServerOptions): LiveAdapter {
  const server = createLiveServer(options)
  const bridges = new WeakMap<object, LiveSocket>()

  function bridgeOf(ws: LiveSocketHost): LiveSocket {
    let socket = bridges.get(ws.raw)
    if (!socket) {
      socket = { send: (message) => ws.send(message), close: () => ws.close() }
      bridges.set(ws.raw, socket)
    }
    return socket
  }

  return {
    message(ws, raw) {
      return server.receive(
        bridgeOf(ws),
        typeof raw === "string" ? raw : JSON.stringify(raw),
      )
    },
    close(ws) {
      server.disconnect(bridgeOf(ws))
    },
  }
}

/** The Elysia transport: `.ws()` is a thin delegate over the tested adapter. */
export function liveRoutes(options: {
  readonly db: Database
  readonly clock?: LiveClock
  readonly sides?: SidesForMatch
}) {
  const adapter = createLiveAdapter({
    authenticate: dbAuthenticate(options.db),
    clock: options.clock,
    sides: options.sides,
  })
  return new Elysia().ws("/live", {
    message(ws, raw) {
      return adapter.message(ws, raw)
    },
    close(ws) {
      adapter.close(ws)
    },
  })
}
