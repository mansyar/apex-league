import * as THREE from "three"
import type { PetVariant } from "../scene-logic"
import { isTap } from "../scene-logic"

/**
 * Ambient pet gesture (ranch_rituals_20261018 FR6), moved verbatim out of
 * `scene.ts`: a tap — not a drag — on the creature pets it.
 */
export interface PetGestureHost {
  /** The render surface the press arms on. */
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  /** Current camera mode — the arena has no pet to pet. */
  mode: () => "ranch" | "arena"
  /** The creature's holder group, or null before the first rebuild. */
  group: () => THREE.Group | null
  /** The ranch-motion reaction pick; null means the pet was ignored. */
  startPet: () => PetVariant | null
  /** Holster for the chirp: the scene never touches audio itself. */
  onPet?: () => void
}

/** Detach the listeners the gesture owns. */
export interface PetGesture {
  dispose(): void
}

/** Arm the ambient pet gesture on the creature under the pointer. */
export function createPetGesture(host: PetGestureHost): PetGesture {
  const { canvas, camera, mode, group, startPet, onPet } = host

  // A tap — not a drag — on the creature pets it. This listener is a pure
  // observer of the same pointer stream the orbit rig consumes: it arms on a
  // canvas press, disarms on release, and never calls preventDefault, so
  // orbit-drag, pinch zoom, and the HUD's plate-head → detail-modal path are
  // all untouched. The tap rule itself is pure (scene-logic.isTap, tested);
  // the mood → reaction pick and its spam cooldown live in ranch-motion.
  const raycaster = new THREE.Raycaster()
  const petNdc = new THREE.Vector2()
  /** The press being tracked, or null when no pet gesture is armed. */
  let petPress: {
    pointerId: number
    x: number
    y: number
    t: number
    multi: boolean
  } | null = null

  /** True when the pointer is over the creature mesh. */
  const petHit = (e: PointerEvent): boolean => {
    const target = group()
    const rect = canvas.getBoundingClientRect()
    if (!target || rect.width === 0 || rect.height === 0) return false
    petNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    // The tap can land between frames, so refresh the camera's world matrix
    // first — otherwise the ray is aimed with the previous frame's pose.
    camera.updateMatrixWorld()
    raycaster.setFromCamera(petNdc, camera)
    return raycaster.intersectObject(target, true).length > 0
  }

  const onPetPointerDown = (e: PointerEvent): void => {
    // The arena has no pet to pet, and a second pointer is a pinch — the
    // gesture is disqualified rather than misread as a tap.
    if (mode() !== "ranch") return
    if (petPress) {
      petPress.multi = true
      return
    }
    petPress = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      multi: false,
    }
  }
  const onPetPointerUp = (e: PointerEvent): void => {
    const press = petPress
    if (!press || press.pointerId !== e.pointerId) return
    petPress = null
    if (press.multi) return
    if (
      !isTap(
        press.x,
        press.y,
        e.clientX,
        e.clientY,
        performance.now() - press.t,
      )
    )
      return
    if (mode() !== "ranch" || !petHit(e)) return
    // Null means the pet was ignored (still reacting, cooling down, or a
    // ceremony owns the creature): no reaction, so no chirp.
    if (startPet()) onPet?.()
  }
  const onPetPointerCancel = (e: PointerEvent): void => {
    if (petPress?.pointerId === e.pointerId) petPress = null
  }
  canvas.addEventListener("pointerdown", onPetPointerDown)
  window.addEventListener("pointerup", onPetPointerUp)
  window.addEventListener("pointercancel", onPetPointerCancel)

  return {
    dispose() {
      window.removeEventListener("pointerup", onPetPointerUp)
      window.removeEventListener("pointercancel", onPetPointerCancel)
      canvas.removeEventListener("pointerdown", onPetPointerDown)
    },
  }
}
