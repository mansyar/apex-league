import { advanceDay, createInitialState, type GameState } from "@apex/sim"
import { createHud } from "./hud"
import { createScene } from "./scene"
import "./style.css"

const app = document.querySelector<HTMLElement>("#app")
if (!app) throw new Error("#app container missing")

createScene(app)

let state: GameState = createInitialState()

const hud = createHud(app, {
  onAdvanceDay: () => {
    state = advanceDay(state)
    hud.update(state)
  },
})
hud.update(state)
