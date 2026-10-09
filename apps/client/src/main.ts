import {
  advanceDay,
  createInitialState,
  type GameState,
  loadGame,
  saveGame,
} from "@apex/sim"
import { createHud } from "./hud"
import { createScene } from "./scene"
import "./style.css"

const app = document.querySelector<HTMLElement>("#app")
if (!app) throw new Error("#app container missing")

createScene(app)

const storage: Storage = window.localStorage
const saved = loadGame(storage)
let state: GameState = saved ?? createInitialState()

const hud = createHud(app, {
  onAdvanceDay: () => {
    state = advanceDay(state)
    saveGame(storage, state, Date.now())
    hud.update(state)
  },
})
hud.update(state)
