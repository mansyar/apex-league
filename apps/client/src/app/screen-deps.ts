import type { SceneHandle } from "../scene"
import type { Staging } from "../staging"
import type { GameStore } from "../store"
import type { Arena } from "./arena"
import type { AudioWiring } from "./audio"
import type { SceneSync } from "./scene-sync"

/**
 * What every screen factory needs from the composition root. Shared by
 * `screens.ts` and `hud-screen.ts` so the two screen modules never import each
 * other (client_module_decomposition FR1).
 */
export interface ScreenDeps {
  app: HTMLElement
  store: GameStore
  audio: AudioWiring
  arena: Arena
  scene: SceneHandle
  sceneSync: SceneSync
  staging: Staging
}
