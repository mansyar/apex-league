import { type GameState, type SaveAdapter, saveGame } from "@apex/sim"

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
   * Register a subscriber; it fires on every later `commit`, in
   * registration order. Returns an unsubscribe function.
   */
  subscribe(listener: (state: GameState) => void): () => void
  /**
   * Adopt `state`, persist it, then notify subscribers in registration
   * order. Persistence failure never blocks notification — the game loop
   * must keep running when the adapter fails; the failure is reported
   * through `onPersistError` instead. A subscriber that throws does not
   * starve the subscribers after it; the first error is rethrown after
   * the full pass so the failure stays loud.
   */
  commit(state: GameState): void
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
  },
): GameStore {
  const now = options?.now ?? (() => Date.now())
  const onPersistError = options?.onPersistError
  let current = initial
  const listeners: Array<(state: GameState) => void> = []
  return {
    get: () => current,
    subscribe(listener) {
      listeners.push(listener)
      return () => {
        const at = listeners.indexOf(listener)
        if (at !== -1) listeners.splice(at, 1)
      }
    },
    commit(state) {
      current = state
      try {
        saveGame(adapter, state, now())
      } catch (error) {
        onPersistError?.(error)
      }
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
