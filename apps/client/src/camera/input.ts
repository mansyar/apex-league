import {
  acceptsOrbit,
  dragOrbit,
  type Orbit,
  pinchOrbit,
  pointerMode,
  zoomOrbit,
} from "../orbit-logic"
import type { CameraMode } from "./types"

/**
 * The ranch's orbit input, moved verbatim out of `orbit-camera.ts`: drag to
 * orbit, wheel and two-finger pinch to zoom, all fed through `orbit-logic`.
 */
export interface OrbitInputHost {
  canvas: HTMLElement
  /** Current mode — the arena owns the camera, so orbit input is declined. */
  mode: () => CameraMode
  /** Live orbit pose, mutated in place by each gesture. */
  orbit: Orbit
  /** Write the orbit's implied pose to the camera. */
  applyOrbit: () => void
}

/** The gesture listeners, plus the mode-change reset. */
export interface OrbitInput {
  /** Drop the gesture. Called on release, on cancel, and on a mode change. */
  clearGesture(): void
  /** Detach the pointer/wheel listeners. */
  dispose(): void
}

export function createOrbitInput(host: OrbitInputHost): OrbitInput {
  const { canvas, mode, orbit, applyOrbit } = host

  // Drag-to-orbit camera around the creature, so the idles can be
  // inspected from any angle. Wheel zooms, a two-finger pinch zooms,
  // clamped to sane distances. While a fight plays the camera is a
  // broadcast pit member: fixed framing, no orbit input.
  //
  // Every handler asks the same predicate (`acceptsOrbit`) and only claims
  // gestures it will act on. An unclaimed gesture is left entirely to the
  // browser, so nothing native is ever swallowed. The gesture math itself
  // lives in orbit-logic.ts.
  //
  // Live pointers are tracked in a map, which is what makes a pinch
  // expressible and what keeps a pinch that degrades to a drag from jumping:
  // the surviving pointer's last position is already the drag's previous
  // sample.
  const pointers = new Map<number, { x: number; y: number }>()
  /** Distance between the first two pointers at the previous move. */
  let pinchSpan = 0

  /** Span between the first two live pointers (0 with fewer than two). */
  const spanOf = (): number => {
    let first: { x: number; y: number } | null = null
    for (const p of pointers.values()) {
      if (!first) {
        first = p
        continue
      }
      return Math.hypot(p.x - first.x, p.y - first.y)
    }
    return 0
  }

  /** Drop the gesture. Called on release, on cancel, and on a mode change. */
  const clearGesture = (): void => {
    pointers.clear()
    pinchSpan = 0
  }
  const onPointerDown = (e: PointerEvent): void => {
    if (!acceptsOrbit(mode())) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // The second pointer escalates a drag into a pinch; measure from here.
    if (pointers.size === 2) pinchSpan = spanOf()
  }
  const onPointerMove = (e: PointerEvent): void => {
    if (!acceptsOrbit(mode())) return
    const prev = pointers.get(e.pointerId)
    if (!prev) return
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    prev.x = e.clientX
    prev.y = e.clientY
    e.preventDefault()
    if (pointerMode(pointers.size) === "pinch") {
      const span = spanOf()
      // A pinch changes distance only: the angles are carried through.
      if (pinchSpan > 0 && span > 0 && span !== pinchSpan) {
        Object.assign(orbit, pinchOrbit(orbit, span / pinchSpan))
      }
      pinchSpan = span
      applyOrbit()
      return
    }
    Object.assign(orbit, dragOrbit(orbit, dx, dy))
    applyOrbit()
  }
  const onPointerUp = (e: PointerEvent): void => {
    pointers.delete(e.pointerId)
    // Back to a single pointer (or none): the next move is a drag, not a
    // pinch, so drop the pinch baseline.
    if (pointers.size < 2) pinchSpan = 0
    // Still a pinch, but a different pair: reseed from the survivors so the
    // ratio stays anchored and the radius cannot jump.
    else pinchSpan = spanOf()
  }
  // A cancelled pointer (the browser reclaimed the gesture, the pointer left
  // the device) must not leave the gesture armed, or the next bare mouse move
  // would orbit the camera with no button held.
  const onPointerCancel = (e: PointerEvent): void => {
    onPointerUp(e)
  }
  const onWheel = (e: WheelEvent): void => {
    if (!acceptsOrbit(mode())) return
    e.preventDefault()
    Object.assign(orbit, zoomOrbit(orbit, e.deltaY))
    applyOrbit()
  }
  canvas.addEventListener("pointerdown", onPointerDown)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerCancel)
  canvas.addEventListener("wheel", onWheel, { passive: false })

  return {
    clearGesture,
    dispose() {
      canvas.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerCancel)
      canvas.removeEventListener("wheel", onWheel)
    },
  }
}
