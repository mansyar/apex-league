import type * as THREE from "three"
import type { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import type { OrbitCameraRig } from "../orbit-camera"
import type { RanchMotion } from "../ranch/motion"
import type { SceneHooks } from "./types"

/**
 * The ranch frame loop, moved verbatim out of `scene.ts`: the clamped frame
 * clock, the hidden-tab pause, the arena composer branch, resize handling and
 * the graphics-failure listeners.
 */
export interface SceneFrameHost {
  container: HTMLElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** Mutable: the tick's context-loss fallback can drop the composer. */
  composer: { current: EffectComposer | null }
  motion: RanchMotion
  cameraRig: OrbitCameraRig
  /** Live effective motion flag (re-derived on every pref flip). */
  reducedMotion: () => boolean
  onGraphics?: SceneHooks["onGraphics"]
}

/** Suspend/resume and teardown of the shared render loop. */
export interface SceneFrame {
  setPaused(paused: boolean): void
  /** Stop the loop, free the composer and detach the resize listener. */
  dispose(): void
}

export function createSceneFrame(host: SceneFrameHost): SceneFrame {
  const {
    container,
    renderer,
    scene,
    camera,
    composer,
    motion,
    cameraRig,
    reducedMotion,
    onGraphics,
  } = host

  const clockStart = performance.now()
  let raf = 0
  let lastFrameT = 0
  /** Previous tick's time, for the clamped walk step. */
  let lastT = 0
  /** Suspended by `setPaused` (hidden tab). */
  let paused = false
  /** The next frame is the first after a resume: its delta is zero. */
  let resumedFrame = false

  const tick = (): void => {
    const t = (performance.now() - clockStart) / 1000
    // Clamped frame delta for the walk machine — a long gap advances at
    // most one clamped step, so phases can never be skipped.
    // A resume reports dt = 0 (F5): the hidden span is not game time, and
    // letting the clamp through would advance the walk by its maximum step
    // the instant the player looked back.
    const dt = resumedFrame ? 0 : Math.min(0.1, Math.max(0, t - lastT))
    resumedFrame = false
    lastT = t
    // The creature's performing life (mood idles, feed ceremony, wander,
    // evolution) plus the wind sway — all in the ranch-motion module. The
    // ranch creature block is gated on camera mode inside the module: in
    // the arena the hidden creature's machines must not run, and the
    // camera track must not drag the broadcast framing off the arena
    // toward the invisible wanderer (the "camera thrown away mid-fight"
    // bug).
    motion.update(t, dt, cameraRig.mode() === "ranch")
    // Arena camera updates (shake decay + cinematic director ease) live
    // in the orbit-camera module; the tick just feeds the clock.
    {
      const prev = t - lastFrameT
      const frameDt = prev > 0 && prev < 0.5 ? prev : 1 / 60
      cameraRig.updateArena(t, frameDt, reducedMotion())
    }
    // Bloom rides arena fights only - the ranch keeps its clean look. A
    // runtime composer failure (context loss) degrades to the plain
    // renderer instead of killing the frame loop.
    try {
      if (cameraRig.mode() === "arena" && composer.current) {
        try {
          composer.current.render()
        } catch {
          composer.current = null
          renderer.render(scene, camera)
        }
      } else renderer.render(scene, camera)
    } catch {
      // A resumed context can still be unusable: report it and stop spinning
      // rather than erroring every frame (F7).
      onGraphics?.("frame_error")
      return
    }
    lastFrameT = t
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  const onResize = (): void => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    cameraRig.resize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    // Browser zoom and monitor moves change devicePixelRatio without
    // recreating the renderer; refresh it here (F6).
    renderer.setPixelRatio(window.devicePixelRatio)
    composer.current?.setSize(w, h)
  }
  window.addEventListener("resize", onResize)

  // Graphics failure is a runtime event, not a crash (F7): a lost context
  // parks the loop (the runtime reducer decides how), a restore attempts a
  // resume, and a frame that still throws reports frame_error.
  // preventDefault keeps the canvas alive so the restore event can fire.
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault()
    onGraphics?.("lost")
  })
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    onGraphics?.("restored")
  })

  return {
    setPaused(next) {
      // Idempotent: the visibility listener can fire the same state twice
      // (and dispose() must not leave a paused scene unable to ever stop).
      if (next === paused) return
      paused = next
      if (next) {
        cancelAnimationFrame(raf)
        raf = 0
      } else {
        resumedFrame = true
        raf = requestAnimationFrame(tick)
      }
    },
    dispose() {
      cancelAnimationFrame(raf)
      paused = true
      composer.current?.dispose()
      window.removeEventListener("resize", onResize)
    },
  }
}
