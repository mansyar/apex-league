/**
 * The two-seat room state machine (FR-2): a pure registry that creates rooms by
 * code, seats two identity-authenticated trainers, starts one match when both
 * are ready, and tears down on disconnect (forfeiting a live match). Identity
 * verification is injected so nothing here touches a clock, port or database.
 */

import { isValidRoomCode, type SeatIndex } from "@apex/sim"

/** What the authenticator hands back once a claim checks out. */
export interface TrainerIdentity {
  readonly trainerId: string
  readonly name: string
}

/** An identity claim from the wire — the passphrase never leaves the server. */
export interface Claim {
  readonly trainerId: string
  readonly passphrase: string
}

export type Authenticate = (
  claim: Claim,
) => TrainerIdentity | undefined | Promise<TrainerIdentity | undefined>

export interface RoomSeat extends TrainerIdentity {
  readonly seat: SeatIndex
  readonly ready: boolean
}

export type RoomPhase = "waiting" | "fighting"

export interface Room {
  readonly code: string
  readonly phase: RoomPhase
  readonly seats: readonly RoomSeat[]
}

/** The descriptor an authoritative loop is built from. */
export interface MatchStart {
  readonly code: string
  readonly seed: number
  readonly identities: readonly [TrainerIdentity, TrainerIdentity]
}

export type CreateOutcome =
  | { readonly ok: true; readonly room: Room }
  | {
      readonly ok: false
      readonly reason: "duplicate_code" | "bad_code" | "bad_passphrase"
    }

export type JoinOutcome =
  | { readonly ok: true; readonly room: Room; readonly seat: SeatIndex }
  | {
      readonly ok: false
      readonly reason:
        | "room_not_found"
        | "room_full"
        | "duplicate_join"
        | "bad_passphrase"
    }

export type ReadyOutcome =
  | {
      readonly ok: true
      readonly room: Room
      readonly start: MatchStart | null
    }
  | {
      readonly ok: false
      readonly reason:
        | "room_not_found"
        | "not_seated"
        | "already_ready"
        | "not_waiting"
    }

export type DisconnectOutcome =
  | {
      readonly ok: true
      readonly room: Room | null
      readonly forfeitWinner: SeatIndex | null
    }
  | { readonly ok: false; readonly reason: "room_not_found" | "not_seated" }

export interface RoomRegistry {
  create(code: string, claim: Claim): Promise<CreateOutcome>
  join(code: string, claim: Claim): Promise<JoinOutcome>
  ready(code: string, trainerId: string): ReadyOutcome
  disconnect(code: string, trainerId: string): DisconnectOutcome
  get(code: string): Room | undefined
  codes(): readonly string[]
}

export interface RoomRegistryOptions {
  readonly authenticate: Authenticate
}

interface MutableSeat {
  trainerId: string
  name: string
  seat: SeatIndex
  ready: boolean
}

interface MutableRoom {
  readonly code: string
  phase: RoomPhase
  seats: MutableSeat[]
}

/** FNV-1a over the code: small, stable, and reproducible on every client. */
export function seedForCode(code: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function snapshot(room: MutableRoom): Room {
  return {
    code: room.code,
    phase: room.phase,
    seats: room.seats.map((seat) => ({ ...seat })),
  }
}

/** Build an isolated registry. Each call owns its rooms; no global state. */
export function createRoomRegistry(options: RoomRegistryOptions): RoomRegistry {
  const rooms = new Map<string, MutableRoom>()

  async function identity(claim: Claim): Promise<TrainerIdentity | undefined> {
    return await options.authenticate(claim)
  }

  return {
    async create(code: string, claim: Claim): Promise<CreateOutcome> {
      if (!isValidRoomCode(code)) return { ok: false, reason: "bad_code" }
      if (rooms.has(code)) return { ok: false, reason: "duplicate_code" }
      const trainer = await identity(claim)
      if (!trainer) return { ok: false, reason: "bad_passphrase" }
      const room: MutableRoom = {
        code,
        phase: "waiting",
        seats: [{ ...trainer, seat: 0, ready: false }],
      }
      rooms.set(code, room)
      return { ok: true, room: snapshot(room) }
    },

    async join(code: string, claim: Claim): Promise<JoinOutcome> {
      const room = rooms.get(code)
      if (!room) return { ok: false, reason: "room_not_found" }
      if (room.seats.some((seat) => seat.trainerId === claim.trainerId)) {
        return { ok: false, reason: "duplicate_join" }
      }
      if (room.phase !== "waiting" || room.seats.length >= 2) {
        return { ok: false, reason: "room_full" }
      }
      const trainer = await identity(claim)
      if (!trainer) return { ok: false, reason: "bad_passphrase" }
      const seat: SeatIndex = room.seats.length === 0 ? 0 : 1
      room.seats.push({ ...trainer, seat, ready: false })
      return { ok: true, room: snapshot(room), seat }
    },

    ready(code: string, trainerId: string): ReadyOutcome {
      const room = rooms.get(code)
      if (!room) return { ok: false, reason: "room_not_found" }
      if (room.phase !== "waiting") return { ok: false, reason: "not_waiting" }
      const seat = room.seats.find((entry) => entry.trainerId === trainerId)
      if (!seat) return { ok: false, reason: "not_seated" }
      if (seat.ready) return { ok: false, reason: "already_ready" }
      seat.ready = true

      if (room.seats.length === 2 && room.seats.every((entry) => entry.ready)) {
        room.phase = "fighting"
        const identities = room.seats.map(
          ({ trainerId: id, name }): TrainerIdentity => ({
            trainerId: id,
            name,
          }),
        ) as [TrainerIdentity, TrainerIdentity]
        return {
          ok: true,
          room: snapshot(room),
          start: { code, seed: seedForCode(code), identities },
        }
      }
      return { ok: true, room: snapshot(room), start: null }
    },

    disconnect(code: string, trainerId: string): DisconnectOutcome {
      const room = rooms.get(code)
      if (!room) return { ok: false, reason: "room_not_found" }
      const seatIndex = room.seats.findIndex(
        (seat) => seat.trainerId === trainerId,
      )
      if (seatIndex < 0) return { ok: false, reason: "not_seated" }

      const fighting = room.phase === "fighting"
      const other = room.seats[seatIndex === 0 ? 1 : 0]
      room.seats.splice(seatIndex, 1)

      if (fighting) {
        rooms.delete(code)
        const forfeitWinner: SeatIndex = other?.seat === 0 ? 0 : 1
        return { ok: true, room: null, forfeitWinner }
      }
      if (room.seats.length === 0) {
        rooms.delete(code)
        return { ok: true, room: null, forfeitWinner: null }
      }
      return { ok: true, room: snapshot(room), forfeitWinner: null }
    },

    get(code: string): Room | undefined {
      const room = rooms.get(code)
      return room ? snapshot(room) : undefined
    },

    codes(): readonly string[] {
      return [...rooms.keys()]
    },
  }
}
