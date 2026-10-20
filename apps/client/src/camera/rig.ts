import * as THREE from "three"
import type { CameraIntent } from "../director"
import { arenaFramingAdjust } from "../scene-logic"
import { createOrbitInput } from "./input"
import { ARENA_FRAMING, BASE_FOV } from "./presets"
import { createCameraShake } from "./shake"
import type { ArenaStyle, CameraMode, OrbitCameraRig } from "./types"

/**
 * The camera rig, moved verbatim out of `orbit-camera.ts`: the ranch orbit
 * pose, the broadcast handover, the soft creature track and the cinematic
 * director ease. Input lives in `./input`, the punch shake in `./shake` and
 * the framing constants in `./presets`.
 */
export function createOrbitCamera(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLElement,
): OrbitCameraRig {
  let cameraMode: CameraMode = "ranch"
  let arenaStyle: ArenaStyle = "broadcast"
  let directorIntent: CameraIntent | null = null
  let intentAt = 0
  let savedOrbit = { azimuth: 0, elevation: 0, radius: 0 }
  const target = new THREE.Vector3(0, 0.8, 0)
  const orbit = { azimuth: 0.567, elevation: 0.326, radius: 6.9 }
  // F6 (responsive_foundation_20261013): the broadcast framing was tuned
  // for wide desktop viewports; narrow/portrait ones crop the stage
  // corners out of frame. Back the arena shot off and widen the lens,
  // recomputed on resize (resize()).
  let arenaAdjust = arenaFramingAdjust(
    canvas.clientWidth / (canvas.clientHeight || 1),
  )
  let arenaRadius = ARENA_FRAMING.radius * arenaAdjust.radiusMult
  // Reusable scratch vectors (no per-frame allocations).
  const focusPoint = new THREE.Vector3()
  const directorDesired = new THREE.Vector3()
  const directorLook = new THREE.Vector3()

  const applyOrbit = (): void => {
    camera.position.set(
      target.x +
        orbit.radius * Math.cos(orbit.elevation) * Math.sin(orbit.azimuth),
      target.y + orbit.radius * Math.sin(orbit.elevation),
      target.z +
        orbit.radius * Math.cos(orbit.elevation) * Math.cos(orbit.azimuth),
    )
    camera.lookAt(target)
  }
  applyOrbit()

  const input = createOrbitInput({
    canvas,
    mode: () => cameraMode,
    orbit,
    applyOrbit,
  })
  const shake = createCameraShake({ camera })

  const setMode = (mode: CameraMode): void => {
    if (cameraMode === mode) return
    cameraMode = mode
    // A mode change re-frames the camera outright; drop any live shake
    // so a stale anchor can't fight the new framing, and drop an armed
    // drag so returning to the ranch never resumes a stale gesture.
    shake.clear()
    input.clearGesture()
    if (mode === "arena") {
      savedOrbit = { ...orbit }
      orbit.azimuth = ARENA_FRAMING.azimuth
      orbit.elevation = ARENA_FRAMING.elevation
      orbit.radius = arenaRadius
      // The arena is centered at the world origin — a ranch camera that
      // was soft-tracking a wandering creature must not carry that aim
      // offset into the broadcast framing.
      target.set(0, ARENA_FRAMING.targetY, 0)
    } else {
      Object.assign(orbit, savedOrbit)
      // Reset the full aim, not just the height - a cinematic director
      // may have left the target tracking a fighter.
      target.set(0, 0.8, 0)
    }
    applyOrbit()
  }

  const setArenaStyle = (style: ArenaStyle): void => {
    if (style === arenaStyle) return
    arenaStyle = style
    if (style === "broadcast") {
      // Leaving cinematic: nothing else writes the camera in broadcast
      // arena mode, so re-frame NOW or the shot freezes at the last
      // director pose until the fight ends.
      target.set(0, ARENA_FRAMING.targetY, 0)
      applyOrbit()
      directorIntent = null
    }
  }

  const applyDirectorIntent = (intent: CameraIntent): void => {
    directorIntent = intent
    intentAt = performance.now()
  }

  const track = (away: boolean, x: number, z: number, dt: number): void => {
    focusPoint.set(away ? x : 0, 0.8, away ? z : 0)
    target.lerp(focusPoint, 1 - Math.exp(-2.5 * dt))
    applyOrbit()
  }

  const updateArena = (t: number, dt: number, reducedMotion: boolean): void => {
    shake.update(t, dt, cameraMode)
    // Cinematic director (FR6): ease (or cut) toward the latest intent.
    // Intents offset the broadcast framing, so a stale or absent intent
    // settles the shot back to the fixed framing. Reduced motion pins
    // the broadcast camera; an active shake owns the frame until it
    // decays so the punch-in can't fight the shake offsets.
    if (
      cameraMode === "arena" &&
      arenaStyle === "cinematic" &&
      !reducedMotion &&
      !shake.active()
    ) {
      const fresh =
        directorIntent !== null && performance.now() - intentAt < 400
      if (fresh && directorIntent) {
        const intent = directorIntent
        const radius = arenaRadius * intent.radiusMult
        const azimuth = ARENA_FRAMING.azimuth + intent.azimuthDelta
        const elevation = ARENA_FRAMING.elevation + intent.elevationDelta
        directorDesired.set(
          intent.look.x + radius * Math.cos(elevation) * Math.sin(azimuth),
          intent.look.y + radius * Math.sin(elevation),
          intent.look.z + radius * Math.cos(elevation) * Math.cos(azimuth),
        )
        directorLook.set(intent.look.x, intent.look.y, intent.look.z)
        if (intent.cut) {
          camera.position.copy(directorDesired)
          target.copy(directorLook)
        } else {
          // Frame-rate-independent ease (learnings 7). Deliberately slow:
          // a film camera glides between framings; fast panning dizzy.
          const k = 1 - Math.exp(-2 * dt)
          camera.position.lerp(directorDesired, k)
          target.lerp(directorLook, k)
        }
      } else {
        // No live coverage: glide home to the broadcast framing.
        directorLook.set(0, ARENA_FRAMING.targetY, 0)
        const k = 1 - Math.exp(-2 * dt)
        target.lerp(directorLook, k)
        directorDesired.set(
          target.x +
            arenaRadius *
              Math.cos(ARENA_FRAMING.elevation) *
              Math.sin(ARENA_FRAMING.azimuth),
          target.y + arenaRadius * Math.sin(ARENA_FRAMING.elevation),
          target.z +
            arenaRadius *
              Math.cos(ARENA_FRAMING.elevation) *
              Math.cos(ARENA_FRAMING.azimuth),
        )
        camera.position.lerp(directorDesired, k)
      }
      camera.lookAt(target)
    }
  }

  return {
    mode: () => cameraMode,
    setMode,
    setArenaStyle,
    applyDirectorIntent,
    shake: shake.shake,
    resetShake: shake.reset,
    track,
    updateArena,
    /** Recompute the viewport-driven framing (F6). Call before the
     * camera's updateProjectionMatrix; also refreshes the arena orbit
     * radius so mid-battle resizes reach the broadcast shot. */
    resize(width: number, height: number): void {
      arenaAdjust = arenaFramingAdjust(width / (height || 1))
      arenaRadius = ARENA_FRAMING.radius * arenaAdjust.radiusMult
      camera.fov = BASE_FOV + arenaAdjust.fovAdd
      if (cameraMode === "arena") orbit.radius = arenaRadius
    },
    dispose() {
      input.dispose()
    },
  }
}
