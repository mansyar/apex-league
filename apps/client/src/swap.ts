import type { ArenaHandle } from "./arena"
import type { SceneHandle } from "./scene"

/**
 * Scene-swap orchestration (spec FR1): a single cross-fade between the
 * ranch and the arena driven through one blend value. The ranch set dims
 * while the arena set brightens over the same frames, so the horizon
 * tone, lighting, and set all change as one dissolve instead of a cut.
 */

/** Duration of the automatic dissolve, in ms. */
const FADE_MS = 700

/** Shared reduced-motion read (live; deferred widgets may flip it). */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  !window.matchMedia("(prefers-reduced-motion: no-preference)").matches

export interface Swap {
  /** Move to the arena: camera hand-off + cross-fade (instant cut when
   * reduced motion is on). Safe to call repeatedly; idempotent. */
  enterArena(): Promise<void>
  /** Move back to the ranch, restoring the orbit camera. Idempotent. */
  exitArena(): Promise<void>
  /** True while the arena set is on screen. */
  isArena(): boolean
}

export function createSwap(scene: SceneHandle, arena: ArenaHandle): Swap {
  let inArena = false
  let raf: number | null = null

  const stopFade = (): void => {
    if (raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
  }

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
      const step = (t: number): void => {
        const k = Math.min(1, (t - start) / FADE_MS)
        scene.setRanchBlend(towardArena ? 1 - k : k)
        arena.setBlend(towardArena ? k : 1 - k)
        if (k < 1) {
          raf = requestAnimationFrame(step)
        } else {
          finish()
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
      if (prefersReducedMotion()) {
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
      if (prefersReducedMotion()) {
        scene.setCameraMode("ranch")
        scene.setRanchBlend(1)
        arena.setBlend(0)
        return Promise.resolve()
      }
      return fade(false)
    },
    isArena: () => inArena,
  }
}
