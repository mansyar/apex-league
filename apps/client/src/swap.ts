import type { ArenaHandle } from "./arena"
import { resolveMotionPref } from "./motion"
import type { SceneHandle } from "./scene"

/**
 * Scene-swap orchestration (spec FR1): a single cross-fade between the
 * ranch and the arena driven through one blend value. The ranch set dims
 * while the arena set brightens over the same frames, so the horizon
 * tone, lighting, and set all change as one dissolve instead of a cut.
 */

/** Duration of the automatic dissolve, in ms. */
const FADE_MS = 700

export interface Swap {
  /** Move to the arena: camera hand-off + cross-fade (instant cut when
   * reduced motion is on). Safe to call repeatedly; idempotent. */
  enterArena(): Promise<void>
  /** Move back to the ranch, restoring the orbit camera. Idempotent. */
  exitArena(): Promise<void>
  /** True while the arena set is on screen. */
  isArena(): boolean
  /**
   * Wire the save's reduced-motion setting in: an in-app "reduced" must
   * produce instant cuts even when the OS is motion-ok.
   */
  setMotionReduced(reduced: boolean): void
}

export function createSwap(scene: SceneHandle, arena: ArenaHandle): Swap {
  let inArena = false
  let raf: number | null = null
  /** Saved in-app preference; OR'd with the OS query at swap time. */
  let motionReduced = false
  /** Resolve for the fade in flight, so an interrupt settles it. */
  let pendingResolve: (() => void) | null = null

  const stopFade = (): void => {
    if (raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
    // An interrupted fade still settles its promise; future awaiters
    // must not hang on a swap that was superseded.
    pendingResolve?.()
    pendingResolve = null
  }

  /** The saved setting or the OS query — either one forces instant cuts. */
  const reduced = (): boolean => resolveMotionPref(motionReduced)

  /** Drive k 0→1 (toward) or 0→1 reversed over FADE_MS frames. */
  const fade = (towardArena: boolean): Promise<void> => {
    const start = performance.now()
    const finish = (): void => {
      scene.setRanchBlend(towardArena ? 0 : 1)
      arena.setBlend(towardArena ? 1 : 0)
      scene.setCameraMode(towardArena ? "arena" : "ranch")
      raf = null
    }
    return new Promise((resolve) => {
      pendingResolve = resolve
      const step = (t: number): void => {
        const k = Math.min(1, (t - start) / FADE_MS)
        scene.setRanchBlend(towardArena ? 1 - k : k)
        arena.setBlend(towardArena ? k : 1 - k)
        if (k < 1) {
          raf = requestAnimationFrame(step)
        } else {
          finish()
          pendingResolve = null
          resolve()
        }
      }
      raf = requestAnimationFrame(step)
    })
  }

  return {
    enterArena() {
      if (inArena) return Promise.resolve()
      inArena = true
      stopFade()
      if (reduced()) {
        // Reduced motion: the swaps are cuts, no dissolve (FR envelope).
        scene.setCameraMode("arena")
        scene.setRanchBlend(0)
        arena.setBlend(1)
        return Promise.resolve()
      }
      return fade(true)
    },
    exitArena() {
      if (!inArena) return Promise.resolve()
      inArena = false
      stopFade()
      if (reduced()) {
        scene.setCameraMode("ranch")
        scene.setRanchBlend(1)
        arena.setBlend(0)
        return Promise.resolve()
      }
      return fade(false)
    },
    isArena: () => inArena,
    setMotionReduced(value) {
      motionReduced = value
    },
  }
}
