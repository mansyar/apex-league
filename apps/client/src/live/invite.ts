/**
 * The arena hand-off and clean return for live bouts (FR-7, FR-8, AC-6).
 * This is the only place that knows both the invite surface and the arena;
 * the transport stays ignorant of rendering, and the arena stays ignorant of
 * sockets. A verdict or an unexpected close always runs the same exit path.
 */
import type { Arena } from "../app/arena"
import { castFighter } from "../battleUI"
import { readCredentials, type TrainerCredentials } from "../cloud/credentials"
import type { FightCasting, Staging } from "../staging"
import { createLivePanel, type LivePanel } from "./panel"
import {
  type LiveVerdict,
  newRoomCode,
  normalizeRoomCode,
  type ServerEvent,
  socketUrl,
} from "./protocol"
import { createLiveTransport, type LiveTransport } from "./transport"
import "./live.css"

const INTENT_INTERVAL_MS = 50

export interface LiveInviteDeps {
  app: HTMLElement
  arena: Arena
  staging: Staging
  storage: Storage
  apiOrigin: string | null
}

/** FNV-1a over the room code: both clients derive the same visual seed. */
function seedOf(code: string): number {
  let hash = 2166136261
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * The dense stream is positional: side 0 is always the host (`owned`) and
 * side 1 the guest (`rival`). Both clients must cast the same sides or the
 * frames land on the wrong fighters. Only the visual seed varies by seat.
 */
export function castingFor(
  seat: 0 | 1,
  code: string,
  keys: readonly [string, string],
): FightCasting {
  const seed = seedOf(code) + seat
  return {
    owned: castFighter({
      speciesId: "fire_drake",
      name: keys[0] || "Fire trainer",
      seed,
      key: keys[0],
      context: "the live arena",
    }),
    rival: castFighter({
      speciesId: "water_axolotl",
      name: keys[1] || "Water trainer",
      seed: seed + 1,
      key: keys[1],
      context: "the live arena",
    }),
  }
}

export function createLiveInvite(
  deps: LiveInviteDeps,
): HTMLButtonElement | null {
  // Without a configured API there is no socket to open; the ranch stays
  // untouched rather than offering a button that can only fail.
  if (!deps.apiOrigin) return null

  const url = socketUrl(deps.apiOrigin)
  let transport: LiveTransport | null = null
  let code = ""
  let claimedId = ""
  let selfSeat: 0 | 1 | null = null
  let names: readonly [string, string] = ["Fire trainer", "Water trainer"]
  let inArena = false
  let finished = false
  let intentTimer: number | null = null
  let seq = 0

  function stopIntents(): void {
    if (intentTimer !== null) {
      window.clearInterval(intentTimer)
      intentTimer = null
    }
  }

  function exitArena(): void {
    if (!inArena) return
    deps.arena.exitArena()
    inArena = false
  }

  function leave(): void {
    stopIntents()
    exitArena()
    transport?.close()
    transport = null
    finished = false
    selfSeat = null
    panel.status("idle")
    panel.close()
    panel.reset()
  }

  function finish(verdict: LiveVerdict): void {
    if (finished) return
    finished = true
    stopIntents()
    exitArena()
    panel.verdict(verdict, selfSeat, names)
    panel.status("verdict")
    transport?.close()
    transport = null
  }

  function onEvent(event: ServerEvent): void {
    if (event.kind === "error") {
      panel.error(event.code)
      return
    }
    if (event.kind === "verdict") {
      finish(event.verdict)
      return
    }

    if (!inArena) {
      const found = event.stream.keys.indexOf(claimedId)
      selfSeat = found === 1 ? 1 : 0
      names = [
        event.stream.keys[0] || names[0],
        event.stream.keys[1] || names[1],
      ]
      deps.arena.enterArena(castingFor(selfSeat, code, names))
      inArena = true
      panel.status("fighting")
      stopIntents()
      intentTimer = window.setInterval(() => {
        seq += 1
        transport?.intent(seq)
      }, INTENT_INTERVAL_MS)
    }
    deps.staging.applyFrame(event.stream, event.step)
  }

  function start(action: "create" | "join", roomCode: string): void {
    const credentials: TrainerCredentials | null = readCredentials(deps.storage)
    if (!credentials?.passphrase) {
      panel.error("bad_passphrase")
      return
    }
    code = roomCode
    claimedId = credentials.id
    selfSeat = null
    finished = false
    seq = 0
    panel.room(code)
    panel.status("connecting")
    transport = createLiveTransport({
      url,
      handlers: {
        status(next) {
          panel.status(next)
          if (next === "closed") {
            stopIntents()
            exitArena()
            transport = null
          }
        },
        event: onEvent,
      },
    })
    transport.connect(action, code, credentials)
  }

  const panel: LivePanel = createLivePanel({
    create() {
      start("create", newRoomCode(Math.random))
    },
    join(raw) {
      const next = normalizeRoomCode(raw)
      if (!next) {
        panel.error("bad_code")
        return
      }
      start("join", next)
    },
    ready() {
      transport?.ready()
    },
    leave,
  })
  deps.app.append(panel.root)
  panel.chip.addEventListener("click", () => panel.open())

  return panel.chip
}
