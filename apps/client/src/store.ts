import {
  type CupSession,
  evaluateEvolution,
  type GameState,
  type SaveAdapter,
  saveGame,
} from "@apex/sim"
import {
  deriveMorningAfter,
  type MorningAfterDerivation,
} from "./morning-after/derive"
import {
  createMorningAfterLedger,
  type MorningAfterLedger,
  mintMorningAfter,
  settleMorningAfterNight,
  takeMorningAfter,
} from "./scene-logic/morning-after-ledger"

/**
 * The typed game-state store — the single mutation path for the client.
 *
 * Handlers adopt a new state with `commit(state)`: the store persists the
 * save, then notifies every subscriber (hud, spar, cup, scene — in
 * registration order) with the committed state. This replaces the
 * per-handler `persist() + hud.update() + spar.update() + ...` fanout that
 * each call site had to remember by hand.
 *
 * The store also keeps the morning-after ritual ledger (postcup_morning_
 * after FR-2): a cup finalize hands off its derivation here — client-held
 * memory only, never the persisted save (the schema stays v25, NFR-1) —
 * and the first day-phase ranch arrival consumes it.
 */
export interface GameStore {
  /** The current state. Never mutated in place — `commit` swaps it. */
  get(): GameState
  /**
   * The live cup session riding the save (save v7), or null. Sessions are
   * presentation bookkeeping: they must survive a refresh so a cup walk —
   * committed or not — can always resume where it stopped.
   */
  getSession(): CupSession | null
  /**
   * Register a subscriber; it fires on every later `commit`, in
   * registration order. Returns an unsubscribe function.
   */
  subscribe(listener: (state: GameState) => void): () => void
  /**
   * Adopt `state`, persist it (with the current session attached), then
   * notify subscribers in registration order. Persistence failure never
   * blocks notification — the game loop must keep running when the adapter
   * fails; the failure is reported through `onPersistError` instead. A
   * subscriber that throws does not starve the subscribers after it; the
   * first error is rethrown after the full pass so the failure stays loud.
   */
  commit(state: GameState): void
  /**
   * Store a new cup session (or null on finalize) and persist it with the
   * unchanged state. This is the only way the session rides the save before
   * the first cup commit — `prepareCup` deliberately does not commit, so a
   * pre-fight refresh must still find the session here. Never notifies:
   * subscribers react to game states, not to bookkeeping.
   */
  setSession(session: CupSession | null): void
  /**
   * The derivation the morning-after ritual is waiting to play, or null.
   * Client-held only — a reload loses it gracefully (FR-9) because it is
   * never written into the save.
   */
  pendingMorningAfter(): MorningAfterDerivation | null
  /**
   * The controller's arrival decision (FR-2): when a derivation is pending
   * for today and the day is not yet consumed, return it and mark the
   * ritual consumed for today — exactly one play per ritual day. A day
   * whose night settle will reveal an evolution yields (the FR-9 seedling):
   * the day is consumed silently and the derivation stays banked so the
   * debrief path can still read it until the night settle drops it.
   */
  takeMorningAfterArrival(): MorningAfterDerivation | null
}

/** Create a store over an initial state and a save adapter. */
export function createGameStore(
  initial: GameState,
  adapter: SaveAdapter,
  options?: {
    /** Wall-clock source for the save stamp; injectable for tests. */
    now?: () => number
    /** Called when persistence fails; the default swallows. */
    onPersistError?: (error: unknown) => void
    /** A session restored from the save payload at boot (save v7). */
    initialSession?: CupSession | null
  },
): GameStore {
  const now = options?.now ?? (() => Date.now())
  const onPersistError = options?.onPersistError
  let current = initial
  let currentSession = options?.initialSession ?? null
  const listeners: Array<(state: GameState) => void> = []
  /** The ritual ledger — client-held, never persisted (FR-9, NFR-1). */
  const morningAfter: MorningAfterLedger = createMorningAfterLedger()
  /**
   * The session a `setSession(null)` just cleared. The finalize handler
   * clears the session immediately before its finalize commit, so the
   * very next commit is the finalize: that adjacency mints the
   * morning-after derivation. Any other path that clears a session (a
   * stale-session drop) derives null — the classifier gates on the
   * session's finalized facts.
   */
  let finalizeHandoff: CupSession | null = null
  /** Persist current+session; reports failure through onPersistError. */
  const persist = () => {
    if (!saveGame(adapter, current, now(), currentSession)) {
      onPersistError?.(new Error("saveGame reported a failed write"))
    }
  }
  return {
    get: () => current,
    getSession: () => currentSession,
    subscribe(listener) {
      listeners.push(listener)
      return () => {
        const at = listeners.indexOf(listener)
        if (at !== -1) listeners.splice(at, 1)
      }
    },
    setSession(session) {
      if (session === null && currentSession !== null) {
        finalizeHandoff = currentSession
      }
      currentSession = session
      persist()
    },
    commit(state) {
      const previous = current
      current = state
      if (finalizeHandoff !== null) {
        const derivation = deriveMorningAfter(finalizeHandoff, previous, state)
        if (derivation) mintMorningAfter(morningAfter, derivation, state.day)
        finalizeHandoff = null
      }
      // A day change is the night settle (FR-9, NFR-7): drop any leftover
      // morning-after bookkeeping from an earlier day.
      if (state.day !== previous.day) {
        settleMorningAfterNight(morningAfter, state.day)
      }
      persist()
      // Snapshot so (un)subscribing mid-notification cannot skip or repeat
      // a listener; a throwing subscriber never starves the later ones.
      let firstError: unknown
      let failed = false
      for (const listener of [...listeners]) {
        try {
          listener(state)
        } catch (error) {
          if (!failed) {
            firstError = error
            failed = true
          }
        }
      }
      if (failed) throw firstError
    },
    pendingMorningAfter: () => morningAfter.pending,
    takeMorningAfterArrival() {
      const creature = current.creature
      if (!creature) return null
      // The FR-9 seedling: a night settle that would reveal an evolution
      // claims the morning — the ritual yields to the send-off.
      const yields = evaluateEvolution(creature, current.cupsWon).evolved
      return takeMorningAfter(morningAfter, current.day, yields)
    },
  }
}
