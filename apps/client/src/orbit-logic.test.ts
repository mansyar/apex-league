import { describe, expect, test } from "bun:test"
import {
  acceptsOrbit,
  DRAG_SENSITIVITY,
  dragOrbit,
  ELEVATION_BOUNDS,
  ORBIT_BOUNDS,
  type Orbit,
  orbitPosition,
  pinchOrbit,
  pointerMode,
  zoomOrbit,
} from "./orbit-logic"

/** The ranch camera's opening pose (orbit-camera.ts). */
const HOME: Orbit = { azimuth: 0.567, elevation: 0.326, radius: 6.9 }

const HOME_TARGET = { x: 0, y: 0.8, z: 0 }

/** Every radius/zoom rule is expressed against these two bounds. */
const { MIN_RADIUS, MAX_RADIUS } = ORBIT_BOUNDS

describe("bounds constants", () => {
  test("orbit bounds match the wheel's long-standing sweep", () => {
    expect(ORBIT_BOUNDS).toEqual({ MIN_RADIUS: 2.5, MAX_RADIUS: 14 })
  })

  test("elevation bounds match the drag clamp", () => {
    expect(ELEVATION_BOUNDS).toEqual({ MIN: 0.05, MAX: 1.45 })
  })

  test("drag sensitivity matches the per-pixel rate", () => {
    expect(DRAG_SENSITIVITY).toBe(0.005)
  })
})

describe("dragOrbit", () => {
  test("horizontal drag subtracts dx * DRAG_SENSITIVITY from azimuth", () => {
    // Drag right by 20px => azimuth decreases by 0.1.
    expect(dragOrbit(HOME, 20, 0).azimuth).toBeCloseTo(0.567 - 0.1, 10)
  })

  test("vertical drag adds dy * DRAG_SENSITIVITY to elevation", () => {
    expect(dragOrbit(HOME, 0, 10).elevation).toBeCloseTo(0.376, 10)
  })

  test("leaves radius untouched", () => {
    expect(dragOrbit(HOME, 137, -42).radius).toBe(HOME.radius)
  })

  test("clamps elevation at the upper bound for a large delta", () => {
    expect(dragOrbit(HOME, 0, 10_000).elevation).toBe(ELEVATION_BOUNDS.MAX)
  })

  test("clamps elevation at the lower bound for a large delta", () => {
    expect(dragOrbit(HOME, 0, -10_000).elevation).toBe(ELEVATION_BOUNDS.MIN)
  })

  test("the upper bound is inclusive — an elevation already at it holds", () => {
    expect(
      dragOrbit({ ...HOME, elevation: ELEVATION_BOUNDS.MAX }, 0, 1).elevation,
    ).toBe(ELEVATION_BOUNDS.MAX)
  })

  test("the lower bound is inclusive — an elevation already at it holds", () => {
    expect(
      dragOrbit({ ...HOME, elevation: ELEVATION_BOUNDS.MIN }, 0, -1).elevation,
    ).toBe(ELEVATION_BOUNDS.MIN)
  })

  test("azimuth is unbounded — the creature can be circled forever", () => {
    expect(dragOrbit(HOME, -100_000, 0).azimuth).toBeCloseTo(500.567, 10)
  })

  test("does not mutate its input", () => {
    const orbit: Orbit = { ...HOME }
    dragOrbit(orbit, 33, 77)
    expect(orbit).toEqual(HOME)
  })
})

describe("zoomOrbit", () => {
  test("scrolling away (deltaY > 0) backs the camera off", () => {
    expect(zoomOrbit(HOME, 1).radius).toBeCloseTo(HOME.radius * 1.1, 10)
  })

  test("scrolling toward (deltaY < 0) brings the camera in", () => {
    expect(zoomOrbit(HOME, -1).radius).toBeCloseTo(HOME.radius * 0.9, 10)
  })

  test("a zero delta is a no-op (Math.sign(0) = 0)", () => {
    expect(zoomOrbit(HOME, 0).radius).toBe(HOME.radius)
  })

  test("clamps at MAX_RADIUS for a notch that overshoots the bound", () => {
    expect(zoomOrbit({ ...HOME, radius: 13.5 }, 1).radius).toBe(MAX_RADIUS)
  })

  test("clamps at MIN_RADIUS for a notch that undershoots the bound", () => {
    expect(zoomOrbit({ ...HOME, radius: MIN_RADIUS }, -1).radius).toBe(
      MIN_RADIUS,
    )
  })

  test("a wheel notch is one step whatever the delta magnitude (sign only)", () => {
    // Unlike pinch, the wheel is discrete: only the *direction* counts, so a
    // flung wheel and a nudge both move exactly one ZOOM_STEP.
    expect(zoomOrbit(HOME, 1_000).radius).toBeCloseTo(HOME.radius * 1.1, 10)
    expect(zoomOrbit(HOME, -1_000).radius).toBeCloseTo(HOME.radius * 0.9, 10)
  })

  test("only radius changes", () => {
    const next = zoomOrbit(HOME, -1)
    expect(next.azimuth).toBe(HOME.azimuth)
    expect(next.elevation).toBe(HOME.elevation)
  })

  test("does not mutate its input", () => {
    const orbit: Orbit = { ...HOME }
    zoomOrbit(orbit, 1)
    expect(orbit).toEqual(HOME)
  })
})

describe("pinchOrbit", () => {
  test("a ratio of 1 (fingers held still) is a no-op", () => {
    expect(pinchOrbit(HOME, 1)).toEqual(HOME)
  })

  test("spreading the fingers moves the camera closer", () => {
    // Matches the wheel/trackpad sense: spread = zoom in.
    expect(pinchOrbit(HOME, 2).radius).toBeCloseTo(HOME.radius / 2, 10)
  })

  test("pinching the fingers together backs the camera off", () => {
    expect(pinchOrbit(HOME, 0.5).radius).toBeCloseTo(HOME.radius * 2, 10)
  })

  test("clamps at MIN_RADIUS on an extreme spread", () => {
    expect(pinchOrbit(HOME, 100).radius).toBe(MIN_RADIUS)
  })

  test("clamps at MAX_RADIUS on an extreme pinch", () => {
    expect(pinchOrbit(HOME, 0.01).radius).toBe(MAX_RADIUS)
  })

  test("pinch changes radius only — never the angles", () => {
    const next = pinchOrbit(HOME, 1.7)
    expect(next.azimuth).toBe(HOME.azimuth)
    expect(next.elevation).toBe(HOME.elevation)
  })

  test("does not mutate its input", () => {
    const orbit: Orbit = { ...HOME }
    pinchOrbit(orbit, 1.5)
    expect(orbit).toEqual(HOME)
  })
})

describe("orbitPosition", () => {
  test("matches the spherical formula applyOrbit writes inline", () => {
    const out = { x: 0, y: 0, z: 0 }
    orbitPosition(HOME_TARGET, HOME, out)
    const horizontal = HOME.radius * Math.cos(HOME.elevation)
    expect(out.x).toBeCloseTo(horizontal * Math.sin(HOME.azimuth), 10)
    expect(out.y).toBeCloseTo(
      HOME_TARGET.y + HOME.radius * Math.sin(HOME.elevation),
      10,
    )
    expect(out.z).toBeCloseTo(horizontal * Math.cos(HOME.azimuth), 10)
  })

  test("writes into `out` and returns that same object", () => {
    const out = { x: 0, y: 0, z: 0 }
    expect(orbitPosition(HOME_TARGET, HOME, out)).toBe(out)
  })

  test("the target offsets the resulting position", () => {
    const out = { x: 0, y: 0, z: 0 }
    const offCentre = { x: 1, y: HOME_TARGET.y, z: -2 }
    orbitPosition(offCentre, HOME, out)
    const base = { x: 0, y: 0, z: 0 }
    orbitPosition(HOME_TARGET, HOME, base)
    expect(out.x).toBeCloseTo(base.x + 1, 10)
    expect(out.y).toBeCloseTo(base.y, 10)
    expect(out.z).toBeCloseTo(base.z - 2, 10)
  })

  test("mutates neither the target nor the orbit", () => {
    const target = { ...HOME_TARGET }
    const orbit: Orbit = { ...HOME }
    orbitPosition(target, orbit, { x: 0, y: 0, z: 0 })
    expect(target).toEqual(HOME_TARGET)
    expect(orbit).toEqual(HOME)
  })
})

describe("pointerMode", () => {
  test("no pointers is idle", () => {
    expect(pointerMode(0)).toBe("idle")
  })

  test("one pointer is a drag", () => {
    expect(pointerMode(1)).toBe("drag")
  })

  test("two pointers is a pinch", () => {
    expect(pointerMode(2)).toBe("pinch")
  })

  test("a third pointer does not change the mode", () => {
    expect(pointerMode(3)).toBe("pinch")
    expect(pointerMode(9)).toBe("pinch")
  })

  test("the DOM lifecycle idle → drag → pinch → drag → idle", () => {
    expect([0, 1, 2, 1, 0].map(pointerMode)).toEqual([
      "idle",
      "drag",
      "pinch",
      "drag",
      "idle",
    ])
  })
})

describe("acceptsOrbit", () => {
  test("true on the ranch — the player owns the camera", () => {
    expect(acceptsOrbit("ranch")).toBe(true)
  })

  test("false in the arena — the director owns the camera", () => {
    expect(acceptsOrbit("arena")).toBe(false)
  })
})
