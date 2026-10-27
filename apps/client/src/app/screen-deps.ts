import type { CloudSync } from "../cloud/sync"
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
  /**
   * The cloud sync, or null when this build has no cloud
   * (ghost_data_async_rivals R1/F1): the cup queues a championship ghost
   * through it; every other screen ignores it.
   */
  cloudSync: Pick<CloudSync, "queueGhost"> | null
}
