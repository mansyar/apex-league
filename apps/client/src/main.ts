import { createInitialState } from "@apex/sim"
import { createScene } from "./scene"

const app = document.querySelector<HTMLElement>("#app")
if (!app) throw new Error("#app container missing")

createScene(app)
void createInitialState()
