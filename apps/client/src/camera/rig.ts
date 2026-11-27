import * as THREE from "three"
import type { CameraIntent } from "../director"
import {
  type ActionFramingPose,
  establishingFraming,
  type TrackedFraming,
  trackedActionFraming,
} from "../scene-logic"
import { createOrbitInput } from "./input"
import { ACTION_FRAMING, ARENA_FRAMING, BASE_FOV } from "./presets"
import { createCameraShake } from "./shake"
import type { ArenaStyle, CameraMode, OrbitCameraRig } from "./types"

/**
 * The camera rig: the ranch orbit pose, the arena handover, the soft creature
 * track and the cinematic director ease. Input lives in `./input`, the punch
 * shake in `./shake`, the framing math in `scene-logic/framing` and the pose
 * constants in `./presets`.
 *
 * Two arena compositions exist: a tracked ACTION shot (the default; every
 * legal fighter position stays in frame) and a wide ESTABLISHING shot (all
 * arena corners, pinned for reduced motion). Only the two saved styles
 * `broadcast` and `cinematic` are exposed to the player.
 */

/** Fallback when a caller supplies no rendered heights: the tallest
 * authored body (1250 mm * MM_TO_WORLD). A live cast always feeds the real
 * Box3 heights of both rigs through the director intent. */
const FALLBACK_BODY_HEIGHT = 1

/** Authored rest lane: OPENING_GAP_MM (2000) * MM_TO_WORLD (0.0008). Used
 * until the director feeds live fighter positions. */
const REST_X = 1.6

export function createOrbitCamera(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLElement,
): OrbitCameraRig {
  let cameraMode: CameraMode = "ranch"
  let arenaStyle: ArenaStyle = "broadcast"
  let directorIntent: CameraIntent | null = null
  let reducedMotionPinned = false
  let intentAt = 0
  let savedOrbit = { azimuth: 0, elevation: 0, radius: 0 }
  const target = new THREE.Vector3(0, 0.8, 0)
  const orbit = { azimuth: 0.567, elevation: 0.326, radius: 6.9 }
  const focusA = { x: -REST_X, z: 0 }
  const focusB = { x: REST_X, z: 0 }
  let heightA = FALLBACK_BODY_HEIGHT
  let heightB = FALLBACK_BODY_HEIGHT
  // Measured ground-plane half-widths of the live rigs. Zero until the
  // director feeds them, so hand-built intents keep the legacy framing.
  let bodyRadiusA = 0
  let bodyRadiusB = 0
  // Reusable scratch vectors (no per-frame allocations).
  const focusPoint = new THREE.Vector3()
  const directorDesired = new THREE.Vector3()
  const directorLook = new THREE.Vector3()

  let viewportAspect = canvas.clientWidth / (canvas.clientHeight || 1)
  const viewAspect = (): number =>
    canvas.clientWidth > 0
      ? canvas.clientWidth / (canvas.clientHeight || 1)
      : viewportAspect

  const setFov = (fov: number): void => {
    if (camera.fov === fov) return
    camera.fov = fov
    camera.updateProjectionMatrix()
  }

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

  /** Tracked action pose. Director offsets only change the angles and the
   * look target; the dolly distance is always derived from the live pair. */
  const actionFrame = (
    azimuthDelta = 0,
    elevationDelta = 0,
    look?: { x: number; y: number; z: number },
  ): TrackedFraming => {
    const pose: ActionFramingPose = {
      azimuth: ACTION_FRAMING.azimuth + azimuthDelta,
      elevation: ACTION_FRAMING.elevation + elevationDelta,
      // Director looks may aim high for drama; the dolly still aims at the
      // middle of the rendered bodies (framing.ts clamps to that midpoint).
      targetY: look
        ? Math.min(look.y, ACTION_FRAMING.targetY)
        : ACTION_FRAMING.targetY,
      fov: BASE_FOV,
      margin: ACTION_FRAMING.margin,
      minRadius: ACTION_FRAMING.minRadius,
      maxRadius: ACTION_FRAMING.maxRadius,
    }
    const aim = look ? { x: look.x, z: look.z } : undefined
    return trackedActionFraming(
      viewAspect(),
      focusA,
      focusB,
      pose,
      heightA,
      heightB,
      aim,
      bodyRadiusA,
      bodyRadiusB,
    )
  }

  const desiredPosition = (frame: TrackedFraming, out: THREE.Vector3): void => {
    out.set(
      frame.targetX +
        frame.radius * Math.cos(frame.elevation) * Math.sin(frame.azimuth),
      frame.targetY + frame.radius * Math.sin(frame.elevation),
      frame.targetZ +
        frame.radius * Math.cos(frame.elevation) * Math.cos(frame.azimuth),
    )
  }

  /** Move toward a resolved orbit pose with an optional hard cut. */
  const glide = (frame: TrackedFraming, k: number, cut: boolean): void => {
    directorLook.set(frame.targetX, frame.targetY, frame.targetZ)
    desiredPosition(frame, directorDesired)
    if (cut) {
      camera.position.copy(directorDesired)
      target.copy(directorLook)
    } else {
      // Frame-rate-independent ease (learnings 7): a film camera glides.
      camera.position.lerp(directorDesired, k)
      target.lerp(directorLook, k)
    }
    setFov(frame.fov)
    camera.lookAt(target)
  }

  /** The wide venue shot: every painted corner, stable and shake-free. */
  const applyEstablishing = (): void => {
    const wide = establishingFraming(viewAspect())
    orbit.azimuth = ARENA_FRAMING.azimuth
    orbit.elevation = ARENA_FRAMING.elevation
    orbit.radius = wide.radius
    target.set(0, ARENA_FRAMING.targetY, 0)
    setFov(wide.fov)
    applyOrbit()
  }

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
      // Open on the wide establishing composition; the next arena update
      // takes over with the tracked action shot (pinned wide for reduced
      // motion). The ranch camera's soft track must not carry its aim
      // offset into either composition.
      applyEstablishing()
    } else {
      Object.assign(orbit, savedOrbit)
      // Reset the full aim, not just the height - a cinematic director
      // may have left the target tracking a fighter.
      target.set(0, 0.8, 0)
      setFov(BASE_FOV)
      applyOrbit()
    }
  }

  const setArenaStyle = (style: ArenaStyle): void => {
    if (style === arenaStyle) return
    arenaStyle = style
    if (style === "broadcast") {
      // Leaving cinematic: nothing else writes the camera in broadcast
      // arena mode, so re-frame NOW or the shot freezes at the last
      // director pose until the fight ends.
      glide(actionFrame(), 1, true)
      directorIntent = null
    }
  }

  const applyDirectorIntent = (intent: CameraIntent): void => {
    directorIntent = intent
    intentAt = performance.now()
    // The reused intent object is also the live pair feed. Callers that
    // build a five-field literal keep the authored rest lane as fallback.
    if (intent.focusA && intent.focusB) {
      focusA.x = intent.focusA.x
      focusA.z = intent.focusA.z
      focusB.x = intent.focusB.x
      focusB.z = intent.focusB.z
    }
    // Heights are live too: the tracked dolly must frame the rigs people
    // see. Omitted values keep the conservative authored-height fallback.
    const ha = intent.heightA
    const hb = intent.heightB
    if (ha !== undefined && Number.isFinite(ha) && ha > 0) heightA = ha
    if (hb !== undefined && Number.isFinite(hb) && hb > 0) heightB = hb
    const ra = intent.bodyRadiusA
    const rb = intent.bodyRadiusB
    if (ra !== undefined && Number.isFinite(ra) && ra > 0) bodyRadiusA = ra
    if (rb !== undefined && Number.isFinite(rb) && rb > 0) bodyRadiusB = rb
  }

  const track = (away: boolean, x: number, z: number, dt: number): void => {
    focusPoint.set(away ? x : 0, 0.8, away ? z : 0)
    target.lerp(focusPoint, 1 - Math.exp(-2.5 * dt))
    applyOrbit()
  }

  const updateArena = (t: number, dt: number, reducedMotion: boolean): void => {
    // Reduced motion pins the stable wide shot: shake is dropped before
    // it can move the camera, and no director intent is read.
    reducedMotionPinned = reducedMotion
    if (reducedMotion && cameraMode === "arena") shake.reset()
    shake.update(t, dt, cameraMode)
    if (cameraMode !== "arena") return
    if (reducedMotion) {
      applyEstablishing()
      return
    }
    if (arenaStyle === "broadcast") {
      // An active shake owns the frame until it decays so the punch-in
      // offset cannot fight the tracked dolly.
      if (!shake.active()) glide(actionFrame(), 1 - Math.exp(-6 * dt), false)
      return
    }
    // Cinematic director (FR6): ease (or cut) toward the latest intent,
    // with the tracked dolly as a hard lower bound on distance.
    const fresh = directorIntent !== null && performance.now() - intentAt < 400
    if (fresh && directorIntent) {
      const intent = directorIntent
      const frame = actionFrame(
        intent.azimuthDelta,
        intent.elevationDelta,
        intent.look,
      )
      // Shot multipliers widen the tracked shot; they can never crop a
      // fighter. MAX keeps pre-existing five-field literals safe.
      const widened: TrackedFraming = {
        ...frame,
        radius: Math.min(
          ACTION_FRAMING.maxRadius,
          frame.radius * Math.max(1, intent.radiusMult),
        ),
      }
      glide(widened, 1 - Math.exp(-2 * dt), intent.cut)
    } else {
      // No live coverage: glide home to the broadcast tracked shot.
      glide(actionFrame(), 1 - Math.exp(-2 * dt), false)
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
    /** Recompute the viewport-driven framing. The wide shot's radius/FOV
     * compensation is recomputed; the tracked shot re-derives its dolly
     * from the live pair on the next arena update. */
    resize(width: number, height: number): void {
      viewportAspect = width / (height || 1)
      if (cameraMode === "arena") {
        if (reducedMotionPinned) applyEstablishing()
        else if (arenaStyle === "broadcast") glide(actionFrame(), 1, true)
        else setFov(BASE_FOV)
      } else {
        setFov(BASE_FOV)
      }
    },
    dispose() {
      input.dispose()
    },
  }
}
