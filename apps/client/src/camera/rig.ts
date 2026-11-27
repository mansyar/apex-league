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
 * Camera rig: ranch orbit, arena handover, creature track, cinematic cuts.
 * Input/shake/framing/presets live in their own modules. Arena has a tracked
 * ACTION shot (also used under reduced motion) and a 0.75 s wide ESTABLISHING
 * entry beat. Every arena action frame installs pose and lens together: the
 * tight FOV must never be paired with an eased wide pose, or a fighter at the
 * frame edge is cropped.
 */

/** Fallback height (tallest authored body); live casts feed Box3 heights. */
const FALLBACK_BODY_HEIGHT = 1

/** Authored rest lane (OPENING_GAP_MM * MM_TO_WORLD) until live feed. */
const REST_X = 1.6

export function createOrbitCamera(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLElement,
): OrbitCameraRig {
  let cameraMode: CameraMode = "ranch"
  let arenaStyle: ArenaStyle = "broadcast"
  let directorIntent: CameraIntent | null = null
  // Arena entry is a fixed-duration wide beat, then a cut to tracked action.
  let establishingStart: number | null = null
  let establishingDone = false
  let intentAt = 0
  let savedOrbit = { azimuth: 0, elevation: 0, radius: 0 }
  const target = new THREE.Vector3(0, 0.8, 0)
  const orbit = { azimuth: 0.567, elevation: 0.326, radius: 6.9 }
  const focusA = { x: -REST_X, z: 0 }
  const focusB = { x: REST_X, z: 0 }
  let heightA = FALLBACK_BODY_HEIGHT
  let heightB = FALLBACK_BODY_HEIGHT
  // Live ground-plane half-widths; zero keeps hand-built intents legacy.
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

  /** Tracked action pose; offsets change angles/look, never the dolly base. */
  const actionFrame = (
    azimuthDelta = 0,
    elevationDelta = 0,
    look?: { x: number; y: number; z: number },
  ): TrackedFraming => {
    const pose: ActionFramingPose = {
      azimuth: ACTION_FRAMING.azimuth + azimuthDelta,
      elevation: ACTION_FRAMING.elevation + elevationDelta,
      // High dramatic looks are clamped to the rendered bodies' midpoint.
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
      // Frame-rate-independent film glide.
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
    // Re-frame outright; drop stale shake and any armed drag gesture.
    shake.clear()
    input.clearGesture()
    if (mode === "arena") {
      savedOrbit = { ...orbit }
      // Wide establishing beat; the rig's clock is supplied by updateArena.
      applyEstablishing()
      establishingStart = null
      establishingDone = false
    } else {
      establishingDone = true
      Object.assign(orbit, savedOrbit)
      // Reset full aim; a director may have left it tracking a fighter.
      target.set(0, 0.8, 0)
      setFov(BASE_FOV)
      applyOrbit()
    }
  }

  const setArenaStyle = (style: ArenaStyle): void => {
    if (style === arenaStyle) return
    arenaStyle = style
    // Style switch after the entry beat is a composition change: cut to a
    // measured pose. During the beat the wide shot stays undisturbed.
    if (cameraMode === "arena" && establishingDone)
      glide(actionFrame(), 1, true)
    if (style === "broadcast") directorIntent = null
  }

  const applyDirectorIntent = (intent: CameraIntent): void => {
    directorIntent = intent
    intentAt = performance.now()
    // The intent is also the live pair feed; five-field literals keep rest.
    if (intent.focusA && intent.focusB) {
      focusA.x = intent.focusA.x
      focusA.z = intent.focusA.z
      focusB.x = intent.focusB.x
      focusB.z = intent.focusB.z
    }
    // Live heights; omitted values keep the authored-height fallback.
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
    if (cameraMode !== "arena") {
      shake.update(t, dt, cameraMode)
      return
    }
    // Arena shake would break the whole-body containment invariant: suppress
    // it instead of letting an offset move the camera off the safe pose.
    shake.reset()
    if (reducedMotion) {
      establishingStart = null
      establishingDone = true
      glide(actionFrame(), 1, true)
      return
    }
    if (!establishingDone) {
      if (establishingStart === null) establishingStart = t
      if (t - establishingStart < 0.75) {
        applyEstablishing()
        return
      }
      establishingDone = true
    }
    directorIntent =
      directorIntent !== null && performance.now() - intentAt < 400
        ? directorIntent
        : null
    if (arenaStyle === "cinematic" && directorIntent) {
      const intent = directorIntent
      // Only the victim look varies: no azimuth swing, elevation lift or
      // radius multiplier, so the tracked solve stays the hard bound and
      // heads never rise behind the HUD.
      glide(actionFrame(0, 0, intent.look), 1, true)
      return
    }
    glide(actionFrame(), 1, true)
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
    /** Resize cuts to a containment-safe action pose (pose + lens together);
     * the next update re-applies any fresh director intent. */
    resize(width: number, height: number): void {
      viewportAspect = width / (height || 1)
      if (cameraMode === "arena") {
        establishingDone = true
        glide(actionFrame(), 1, true)
      } else {
        setFov(BASE_FOV)
      }
    },
    dispose() {
      input.dispose()
    },
  }
}
