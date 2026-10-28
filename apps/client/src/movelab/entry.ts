import type { SceneHandle } from "../scene"
import type { Staging } from "../staging"
import type { Swap } from "../swap"

/**
 * Move Lab boot entry (elemental-identity FR-8, NFR-6): the only module
 * outside `movelab/` the lab may touch is `main.ts`, and only through
 * these two functions. The lab chunk itself loads via dynamic `import()`
 * behind `import.meta.env.DEV`, so production builds never contain it.
 */

export interface MoveLabMount {
  readonly app: HTMLElement
  readonly scene: SceneHandle
  readonly staging: Staging
  readonly swap: Swap
}

/** True for dev-server `?movelab` visits; always false in production. */
export function isMoveLabMode(): boolean {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("movelab")
  )
}

/**
 * Mount the lab when requested. Returns the mode flag so `main.ts`
 * can suppress the starter overlay in lab mode.
 */
export function mountMoveLabIfRequested(deps: MoveLabMount): boolean {
  if (!isMoveLabMode()) return false
  document.body.classList.add("app-in-movelab")
  void import("./lab").then(({ mountMoveLab }) => {
    mountMoveLab(deps)
  })
  return true
}
