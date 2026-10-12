import {
  type CupSession,
  type GameState,
  type SaveAdapter,
  saveGame,
} from "@apex/sim"

/**
 * The typed game-state store — the single mutation path for the client.
 *
 * Handlers adopt a new state with `commit(state)`: the store persists the
 * save, then notifies every subscriber (hud, spar, cup, scene — in
 * registration order) with the committed state. This replaces the
 * per-handler `persist() + hud.update() + spar.update() + ...` fanout that
 * each call site had to remember by hand.
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
      currentSession = session
      persist()
    },
    commit(state) {
      current = state
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
  }
}
