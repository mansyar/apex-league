import type * as THREE from "three"
import type { CameraMode } from "./types"

/**
 * The arena punch shake, moved verbatim out of `orbit-camera.ts`: a decaying
 * offset written back to the pre-shake anchor every frame (never `+=`), so
 * the broadcast framing survives the punch exactly.
 */
export interface CameraShakeHost {
  camera: THREE.PerspectiveCamera
}

export interface CameraShake {
  /** Broadcast punch: kick a decaying camera shake of the given strength. */
  shake(strength: number): void
  /** Kill any live shake without re-anchoring (motion-pref flips). */
  reset(): void
  /** Drop the anchor as well — a mode change re-frames the camera outright. */
  clear(): void
  /** True while a punch still owns the frame (it gates the director). */
  active(): boolean
  /** Decay the punch and write the offset (arena mode only). */
  update(t: number, dt: number, mode: CameraMode): void
}

export function createCameraShake(host: CameraShakeHost): CameraShake {
  const { camera } = host

  let shakeAmp = 0
  let shakePhase = Math.PI * 2 * Math.random()
  /**
   * The camera's resting position when the shake began. The shake writes
   * position = base + offset every frame (never `+=`), so the residual
   * can't random-walk the broadcast framing off its mark.
   */
  let shakeBase: THREE.Vector3 | null = null
  const SHAKE_DECAY_PER_S = 4.2
  const SHAKE_FREQ = 26

  const active = (): boolean => shakeAmp > 0.001 && shakeBase !== null

  return {
    shake(strength) {
      if (shakeAmp <= 0.001) shakeBase = camera.position.clone()
      if (strength > shakeAmp) shakeAmp = strength
      if (shakeAmp > 0) shakePhase = Math.PI * 2 * Math.random()
    },
    reset() {
      shakeAmp = 0
    },
    clear() {
      shakeAmp = 0
      shakeBase = null
    },
    active,
    update(t, dt, mode) {
      // Broadcast punch: the camera is written back to its pre-shake
      // anchor plus a decaying offset — never accumulated additively — so
      // the broadcast framing survives the shake exactly. Arena-only so
      // the orbit camera stays untouched; freeze-safe (time-based, no dt
      // assumption).
      if (mode === "arena" && active() && shakeBase) {
        shakeAmp = Math.max(0, shakeAmp - SHAKE_DECAY_PER_S * dt)
        camera.position.set(
          shakeBase.x + Math.sin(t * SHAKE_FREQ + shakePhase) * shakeAmp,
          shakeBase.y +
            Math.cos(t * SHAKE_FREQ * 1.3 + shakePhase) * shakeAmp * 0.6,
          shakeBase.z,
        )
        if (shakeAmp <= 0.001) {
          camera.position.copy(shakeBase)
          shakeBase = null
        }
      }
    },
  }
}
