import type { Cup } from "../cup"
import { hideFailurePlate, showFailurePlate } from "../failure-plate"
import {
  type GraphicsHealth,
  initialRuntimeState,
  type RuntimeEvent,
  runtimeState,
} from "../lifecycle"
import type { SceneHandle } from "../scene"
import type { Spar } from "../spar"
import type { Staging } from "../staging"

/**
 * Runtime graphics + visibility wiring (composition-root split): folds the
 * pure `lifecycle` reducer into the failure plate and the pause flags, and
 * parks the loop for a hidden tab. Moved out of `main.ts` unchanged.
 */

/** The sentence the plate shows when the 3D ranch never started. */
export const BOOT_FAILURE_CAUSE =
  "3D graphics didn't start, so the ranch can't load. Reload to try again."

export interface RuntimeDeps {
  app: HTMLElement
  scene: SceneHandle
  staging: Staging
  spar: Spar
  cup: Cup
}

export interface Runtime {
  /** Fold one lifecycle event (graphics health or tab visibility). */
  apply(event: RuntimeEvent): void
}

export function createRuntime(deps: RuntimeDeps): Runtime {
  const { app, scene, staging, spar, cup } = deps
  let runtime = initialRuntimeState()
  /** The sentence the plate shows; a held restore keeps the last failure's. */
  let plateCause = BOOT_FAILURE_CAUSE
  const GRAPHICS_CAUSE: Record<GraphicsHealth, string> = {
    ok: plateCause,
    unavailable: plateCause,
    lost: "The 3D graphics context was lost mid-game. Reload to restart the ranch.",
    frame_error:
      "The ranch hit a graphics error it couldn't recover from. Reload to restart.",
  }
  const applyRuntime = (event: RuntimeEvent): void => {
    const next = runtimeState(runtime, event)
    if (next.graphics !== "ok") plateCause = GRAPHICS_CAUSE[next.graphics]
    // The failure surface is the plate: up while unhealthy, down the moment a
    // restore puts the game back on its feet.
    if (next.surface !== runtime.surface) {
      if (next.surface === "plate") showFailurePlate(app, plateCause)
      else hideFailurePlate(app)
    }
    if (next.renderLoop !== runtime.renderLoop) {
      const paused = next.renderLoop === "paused"
      scene.setPaused(paused)
      staging.setPaused(paused)
      spar.setPaused(paused)
      cup.setPaused(paused)
    }
    runtime = next
  }
  const onVisibility = (): void => {
    applyRuntime({
      kind: "visibility",
      status: document.hidden ? "hidden" : "visible",
    })
  }
  document.addEventListener("visibilitychange", onVisibility)
  // A tab can be opened in the background: start parked rather than drawing a
  // frame nobody sees.
  if (document.hidden) onVisibility()

  return { apply: applyRuntime }
}
