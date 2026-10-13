import * as THREE from "three"
import type { CameraIntent } from "./director"

/**
 * The ranch orbit camera and its arena alter-ego. One module owns every
 * camera state transition so the framing rules live in exactly one place:
 *
 * - Ranch mode: user-driven drag-to-orbit + wheel zoom around the creature,
 *   with a soft track that eases the aim toward a wandering creature and
 *   back home when it settles (frame-rate independent, learnings 7).
 * - Arena mode: a fixed "broadcast pit" framing with no orbit input. The
 *   cinematic style layers a director ease on top, and punches decay as a
 *   camera shake written back to a saved anchor (never additive).
 */
export type CameraMode = "ranch" | "arena"

/** Arena camera presentation, chosen by the cup/spar shell (FR6). */
export type ArenaStyle = "broadcast" | "cinematic"

export type {
  /** Director shot request, produced by the playback director. */
  CameraIntent,
} from "./director"

/**
 * Broadcast camera framing the ranch orbit hands over to during a fight:
 * a fixed side-elevated wide shot that keeps both ends of the show floor
 * (STAGE bounds ±3.4 on X, ±2 on Z) in frame with margin. 2026-10-11:
 * widened after live feedback — no fighter leaves the camera's view.
 */
const ARENA_FRAMING = {
  azimuth: 0.12,
  elevation: 0.55,
  radius: 12.5,
  targetY: 0.9,
} as const

export interface OrbitCameraRig {
  /** Current mode — the tick branches on ranch vs arena behavior. */
  mode(): CameraMode
  /** Hand the camera over to the broadcast pit (and back). */
  setMode(mode: CameraMode): void
  /** Choose the arena camera style (FR6). */
  setArenaStyle(style: ArenaStyle): void
  /** Feed the director's latest shot; stale intents settle to broadcast. */
  applyDirectorIntent(intent: CameraIntent): void
  /** Broadcast punch: kick a decaying camera shake of the given strength. */
  shake(strength: number): void
  /** Kill any live shake without re-anchoring (motion-pref flips). */
  resetShake(): void
  /**
   * Soft ranch track: while the creature is in the ceremony or on a wander
   * trip the aim eases toward its position; otherwise it drifts back to the
   * home anchor. Frame-rate independent smoothing — drag and wheel still
   * own the final say over azimuth/elevation/radius.
   */
  track(away: boolean, x: number, z: number, dt: number): void
  /**
   * Per-frame arena updates: shake decay + cinematic director ease.
   * `t` is seconds since clock start, `dt` the clamped frame delta.
   */
  updateArena(t: number, dt: number, reducedMotion: boolean): void
  /** Detach the pointer/wheel listeners. */
  dispose(): void
}

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
  // Reusable scratch vectors (no per-frame allocations).
  const focusPoint = new THREE.Vector3()
  const directorDesired = new THREE.Vector3()
  const directorLook = new THREE.Vector3()

  const clamp = (v: number, lo: number, hi: number): number =>
    Math.min(Math.max(v, lo), hi)
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

  const setMode = (mode: CameraMode): void => {
    if (cameraMode === mode) return
    cameraMode = mode
    // A mode change re-frames the camera outright; drop any live shake
    // so a stale anchor can't fight the new framing.
    shakeAmp = 0
    shakeBase = null
    if (mode === "arena") {
      savedOrbit = { ...orbit }
      orbit.azimuth = ARENA_FRAMING.azimuth
      orbit.elevation = ARENA_FRAMING.elevation
      orbit.radius = ARENA_FRAMING.radius
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

  // Drag-to-orbit camera around the creature, so the idles can be
  // inspected from any angle. Wheel zooms, clamped to sane distances.
  // While a fight plays the camera is a broadcast pit member: fixed
  // framing, no orbit input.
  let dragging = false
  let lastX = 0
  let lastY = 0
  const onPointerDown = (e: PointerEvent): void => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }
  const onPointerMove = (e: PointerEvent): void => {
    if (!dragging || cameraMode !== "ranch") return
    orbit.azimuth -= (e.clientX - lastX) * 0.005
    orbit.elevation = clamp(
      orbit.elevation + (e.clientY - lastY) * 0.005,
      0.05,
      1.45,
    )
    lastX = e.clientX
    lastY = e.clientY
    applyOrbit()
  }
  const onPointerUp = (): void => {
    dragging = false
  }
  const onWheel = (e: WheelEvent): void => {
    if (cameraMode !== "ranch") return
    orbit.radius = clamp(
      orbit.radius * (1 + Math.sign(e.deltaY) * 0.1),
      2.5,
      14,
    )
    applyOrbit()
  }
  canvas.addEventListener("pointerdown", onPointerDown)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  canvas.addEventListener("wheel", onWheel)

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
  const shake = (strength: number): void => {
    if (shakeAmp <= 0.001) shakeBase = camera.position.clone()
    if (strength > shakeAmp) shakeAmp = strength
    if (shakeAmp > 0) shakePhase = Math.PI * 2 * Math.random()
  }
  const resetShake = (): void => {
    shakeAmp = 0
  }
  const shakeActive = (): boolean => shakeAmp > 0.001 && shakeBase !== null

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
    // Broadcast punch: the camera is written back to its pre-shake anchor
    // plus a decaying offset — never accumulated additively — so the
    // broadcast framing survives the shake exactly. Arena-only so the
    // orbit camera stays untouched; freeze-safe (time-based, no dt
    // assumption).
    if (cameraMode === "arena" && shakeActive() && shakeBase) {
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
    // Cinematic director (FR6): ease (or cut) toward the latest intent.
    // Intents offset the broadcast framing, so a stale or absent intent
    // settles the shot back to the fixed framing. Reduced motion pins
    // the broadcast camera; an active shake owns the frame until it
    // decays so the punch-in can't fight the shake offsets.
    if (
      cameraMode === "arena" &&
      arenaStyle === "cinematic" &&
      !reducedMotion &&
      !shakeActive()
    ) {
      const fresh =
        directorIntent !== null && performance.now() - intentAt < 400
      if (fresh && directorIntent) {
        const intent = directorIntent
        const radius = ARENA_FRAMING.radius * intent.radiusMult
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
            ARENA_FRAMING.radius *
              Math.cos(ARENA_FRAMING.elevation) *
              Math.sin(ARENA_FRAMING.azimuth),
          target.y + ARENA_FRAMING.radius * Math.sin(ARENA_FRAMING.elevation),
          target.z +
            ARENA_FRAMING.radius *
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
    shake,
    resetShake,
    track,
    updateArena,
    dispose() {
      canvas.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("wheel", onWheel)
    },
  }
}
