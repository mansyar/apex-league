/**
 * Phase 3 checkpoint fixture: two sim-driven v9 saves for browser
 * verification.
 *
 *  - `hint`     — juvenile, day 22 (inside the day-20 champion hint window)
 *  - `ceremony` — juvenile, day 25, cupsWon 1, bond/mood high: the next
 *                 lights-out must evolve (champion ceremony on load+advance)
 *
 * Run: bun artifacts/champion-save-fixture.ts  → prints two JSON blobs.
 */
import {
  advanceDay,
  careAction,
  chooseStarter,
  createInitialState,
  saveGame,
  type GameState,
} from "../packages/sim/src/index"

const calmRng = { next: () => 0.99, int: () => 0 }

function caredDay(state: GameState): GameState {
  const fed = careAction(state, "feed")
  const afterFeed = fed.ok ? fed.state : state
  const played = careAction(afterFeed, "play")
  return played.ok ? played.state : afterFeed
}

function raisedJuvenile(): GameState {
  let state = chooseStarter(createInitialState(), "fire_drake", 42)
  // Days 1-10: care every day → the baby evolves on the night ending day 10.
  for (let day = 1; day <= 10; day++) {
    state = caredDay(state)
    state = advanceDay(state, calmRng)
  }
  return state
}

function toDay(state: GameState, targetDay: number, cupsWon: number): GameState {
  let s: GameState = { ...state, cupsWon }
  while (s.day < targetDay) {
    s = caredDay(s)
    s = advanceDay(s, calmRng)
  }
  return s
}

const juvenile = raisedJuvenile()
const hint = toDay(juvenile, 22, 1)
const ceremony = toDay(juvenile, 25, 1)

const adapter = {
  getItem: () => null,
  setItem: () => true,
  removeItem: () => {},
}
const wrap = (label: string, state: GameState): void => {
  saveGame(adapter, state, 1000)
  // saveGame writes through the adapter only; grab the same payload by
  // serializing the exact shape it would store.
  console.log(
    `=== ${label} ===\n${JSON.stringify({
      version: 9,
      state,
      savedAt: 1000,
      session: null,
    })}`,
  )
}
wrap("hint", hint)
wrap("ceremony", ceremony)
