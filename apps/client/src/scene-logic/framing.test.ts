import { describe, expect, test } from "bun:test"
import { Group, PerspectiveCamera, Vector3 } from "three"

import { ARENA_HALF_X, ARENA_HALF_Z } from "../arena-scale"
import { ACTION_FRAMING } from "../camera/presets"
import { createOrbitCamera } from "../camera/rig"
import { buildSpot } from "../roster"
import {
  arenaFramingAdjust,
  establishingFraming,
  type TrackedFraming,
  trackedActionFraming,
} from "../scene-logic"

// The orbit input binds its gesture handlers to `window`. Bun's test
// runtime has no DOM, so give it a no-op host before constructing a rig.
Object.defineProperty(globalThis, "window", {
  value: { addEventListener() {}, removeEventListener() {} },
  configurable: true,
})

/**
 * F6 (responsive_foundation_20261013): the broadcast framing was tuned on
 * a wide desktop viewport. On narrow/portrait viewports the fixed radius
 * + vertical FOV crop the stage corners out of frame. The adjustment
 * backs the camera off and widens the lens as the aspect narrows, with
 * caps so a phone never ends up with an absurd telescope shot.
 *
 * The corners are the painted arena itself (`ARENA_BOUNDS` at the
 * presentation scale), so this pins the promise that no fighter can stand
 * outside the paint *and* outside the shot.
 */

/** The arena corners at the presentation scale, plus head height. */
const ARENA_CORNERS = [
  [ARENA_HALF_X, 0, ARENA_HALF_Z],
  [-ARENA_HALF_X, 0, ARENA_HALF_Z],
  [ARENA_HALF_X, 0, -ARENA_HALF_Z],
  [-ARENA_HALF_X, 0, -ARENA_HALF_Z],
  [0, 1.4, 0], // fighter head height at center
] as const

const BASE = { azimuth: 0.12, elevation: 0.55, radius: 12.5, targetY: 0.9 }
const BASE_FOV = 45

/** Project a world point through an orbit camera; returns NDC xy. */
function project(
  aspect: number,
  fov: number,
  radius: number,
  point: readonly number[],
): { x: number; y: number } {
  const cam = new PerspectiveCamera(fov, aspect, 0.1, 100)
  cam.position.set(
    radius * Math.cos(BASE.elevation) * Math.sin(BASE.azimuth),
    BASE.targetY + radius * Math.sin(BASE.elevation),
    radius * Math.cos(BASE.elevation) * Math.cos(BASE.azimuth),
  )
  cam.lookAt(0, BASE.targetY, 0)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  const vec = new Vector3(point[0], point[1], point[2])
  vec.project(cam)
  return { x: vec.x, y: vec.y }
}

describe("arena framing — aspect compensation", () => {
  test("landscape keeps the broadcast framing untouched", () => {
    for (const aspect of [16 / 9, 1.6, 1.3]) {
      const adj = arenaFramingAdjust(aspect)
      expect(adj.radiusMult).toBe(1)
      expect(adj.fovAdd).toBe(0)
    }
  })

  test("portrait and tablet aspects get compensation", () => {
    for (const aspect of [768 / 1024, 390 / 844]) {
      const adj = arenaFramingAdjust(aspect)
      expect(adj.radiusMult).toBeGreaterThan(1)
      expect(adj.fovAdd).toBeGreaterThan(0)
    }
  })

  test("compensation grows monotonically as the aspect narrows", () => {
    let prevMult = 0
    let prevFov = -1
    for (let aspect = 1.19; aspect > 0.4; aspect -= 0.05) {
      const adj = arenaFramingAdjust(aspect)
      expect(adj.radiusMult).toBeGreaterThanOrEqual(prevMult)
      expect(adj.fovAdd).toBeGreaterThanOrEqual(prevFov)
      prevMult = adj.radiusMult
      prevFov = adj.fovAdd
    }
  })

  test("compensation is capped so phones get a usable shot", () => {
    for (const aspect of [0.5, 0.46, 0.2, 0]) {
      const adj = arenaFramingAdjust(aspect)
      expect(adj.radiusMult).toBeLessThanOrEqual(1.5)
      expect(adj.fovAdd).toBeLessThanOrEqual(12)
      expect(Number.isFinite(adj.radiusMult)).toBe(true)
      expect(Number.isFinite(adj.fovAdd)).toBe(true)
    }
  })

  test("uncompensated framing crops the stage at phone portrait", () => {
    // The bug this track fixes: base framing at 390x844 pushes a stage
    // corner out of frame.
    const aspect = 390 / 844
    let maxAbsX = 0
    for (const corner of ARENA_CORNERS) {
      const ndc = project(aspect, BASE_FOV, BASE.radius, corner)
      maxAbsX = Math.max(maxAbsX, Math.abs(ndc.x))
    }
    expect(maxAbsX).toBeGreaterThan(1)
  })

  test("compensated framing keeps every stage corner in frame", () => {
    for (const aspect of [16 / 9, 768 / 1024, 390 / 844, 0.5]) {
      const adj = arenaFramingAdjust(aspect)
      const fov = BASE_FOV + adj.fovAdd
      const radius = BASE.radius * adj.radiusMult
      for (const corner of ARENA_CORNERS) {
        const ndc = project(aspect, fov, radius, corner)
        expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1 + 1e-6)
        expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1 + 1e-6)
      }
    }
  })
})

/** The three viewports the readability promise is measured on. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "portrait", width: 393, height: 852 },
  { name: "landscape", width: 852, height: 393 },
] as const

/** Measured rendered baby-rig heights after `bodyScaleFor` normalization,
 * not the larger authored simulation cylinders. */
const BODIES = [
  { name: "ray", height: 0.082 },
  { name: "crab", height: 0.299 },
  { name: "draconic", height: 0.382 },
  { name: "tortoise", height: 0.391 },
  { name: "golem", height: 0.522 },
] as const

const actionPose = {
  azimuth: ACTION_FRAMING.azimuth,
  elevation: ACTION_FRAMING.elevation,
  targetY: ACTION_FRAMING.targetY,
  fov: BASE_FOV,
  margin: ACTION_FRAMING.margin,
  minRadius: ACTION_FRAMING.minRadius,
  maxRadius: ACTION_FRAMING.maxRadius,
} as const

const actionFrame = (
  aspect: number,
  a: { x: number; z: number },
  b: { x: number; z: number },
  overrides: Partial<typeof actionPose> = {},
  heightA = 1,
  heightB = 1,
): TrackedFraming =>
  trackedActionFraming(
    aspect,
    a,
    b,
    { ...actionPose, ...overrides },
    heightA,
    heightB,
  )

/** Project through a resolved tracked orbit pose. */
function projectTracked(
  aspect: number,
  frame: TrackedFraming,
  point: readonly [number, number, number],
): { x: number; y: number } {
  const cam = new PerspectiveCamera(frame.fov, aspect, 0.1, 200)
  cam.position.set(
    frame.targetX +
      frame.radius * Math.cos(frame.elevation) * Math.sin(frame.azimuth),
    frame.targetY + frame.radius * Math.sin(frame.elevation),
    frame.targetZ +
      frame.radius * Math.cos(frame.elevation) * Math.cos(frame.azimuth),
  )
  cam.lookAt(frame.targetX, frame.targetY, frame.targetZ)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  const vec = new Vector3(point[0], point[1], point[2])
  vec.project(cam)
  return { x: vec.x, y: vec.y }
}

/** Fraction of viewport height a fighter occupies at the given position. */
function bodyFraction(
  aspect: number,
  frame: TrackedFraming,
  x: number,
  z: number,
  height: number,
): number {
  const feet = projectTracked(aspect, frame, [x, 0, z])
  const head = projectTracked(aspect, frame, [x, height, z])
  return Math.abs(head.y - feet.y) / 2
}

describe("arena framing — tracked action readability (FR1/FR2/AC1)", () => {
  test("every body extreme clears 8% and 32px at both mirrored rest positions", () => {
    for (const vp of VIEWPORTS) {
      const aspect = vp.width / vp.height
      for (const body of BODIES) {
        for (const [left, right] of [
          [-1.6, 1.6],
          [1.6, -1.6],
        ] as const) {
          const frame = actionFrame(
            aspect,
            { x: left, z: 0 },
            { x: right, z: 0 },
            {},
            body.height,
            body.height,
          )
          for (const x of [left, right]) {
            const fraction = bodyFraction(aspect, frame, x, 0, body.height)
            expect(fraction).toBeGreaterThanOrEqual(0.08)
            expect(fraction * vp.height).toBeGreaterThanOrEqual(32)
          }
        }
      }
    }
  })

  test("a mixed cast keeps the smaller rendered rig readable in both mirrors", () => {
    const pairs = [
      { a: 0.082, b: 0.522 },
      { a: 0.299, b: 0.382 },
    ] as const
    for (const vp of VIEWPORTS) {
      const aspect = vp.width / vp.height
      for (const mirror of [1, -1]) {
        for (const pair of pairs) {
          const left = { x: -1.6 * mirror, z: 0 }
          const right = { x: 1.6 * mirror, z: 0 }
          const frame = actionFrame(aspect, left, right, {}, pair.a, pair.b)
          const spots = [
            { p: left, h: pair.a },
            { p: right, h: pair.b },
          ]
          for (const { p, h } of spots) {
            const fraction = bodyFraction(aspect, frame, p.x, p.z, h)
            expect(fraction).toBeGreaterThanOrEqual(0.08)
            expect(fraction * vp.height).toBeGreaterThanOrEqual(32)
            for (const y of [0, h]) {
              const ndc = projectTracked(aspect, frame, [p.x, y, p.z])
              expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1 + 1e-6)
              expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1 + 1e-6)
            }
          }
        }
      }
    }
  })

  test("every legal fighter pair stays in frame in tracked action", () => {
    const xs = [-ARENA_HALF_X, -1.6, 0, 1.6, ARENA_HALF_X]
    const zs = [-ARENA_HALF_Z, 0, ARENA_HALF_Z]
    const spots = xs.flatMap((x) => zs.map((z) => ({ x, z })))
    for (const vp of VIEWPORTS) {
      const aspect = vp.width / vp.height
      for (const a of spots) {
        for (const b of spots) {
          const frame = actionFrame(aspect, a, b)
          for (const p of [a, b]) {
            for (const y of [0, 1]) {
              const ndc = projectTracked(aspect, frame, [p.x, y, p.z])
              expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1 + 1e-6)
              expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1 + 1e-6)
            }
          }
        }
      }
    }
  })

  test("cinematic angles and victim-biased looks still contain both fighters", () => {
    const variants = [
      { azimuthDelta: 0.1, elevationDelta: 0.08, lookY: 0.7 },
      { azimuthDelta: -0.4, elevationDelta: 0.08, lookY: 0.7 },
      { azimuthDelta: 0.4, elevationDelta: 0.08, lookY: 0.7 },
    ]
    for (const vp of VIEWPORTS) {
      const aspect = vp.width / vp.height
      for (const variant of variants) {
        for (const [a, b] of [
          [
            { x: -3.2, z: -2.4 },
            { x: 3.2, z: 2.4 },
          ],
          [
            { x: -1.6, z: 0 },
            { x: 1.6, z: 0 },
          ],
          [
            { x: 3.2, z: -2.4 },
            { x: -3.2, z: 2.4 },
          ],
        ] as const) {
          const frame = trackedActionFraming(
            aspect,
            a,
            b,
            {
              ...actionPose,
              azimuth: actionPose.azimuth + variant.azimuthDelta,
              elevation: actionPose.elevation + variant.elevationDelta,
              targetY: variant.lookY,
            },
            1,
            1,
            { x: b.x, z: b.z },
          )
          for (const p of [a, b]) {
            for (const y of [0, 1]) {
              const ndc = projectTracked(aspect, frame, [p.x, y, p.z])
              expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1 + 1e-6)
              expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1 + 1e-6)
            }
          }
        }
      }
    }
  })

  test("the separate establishing composition contains every arena corner", () => {
    for (const vp of VIEWPORTS) {
      const aspect = vp.width / vp.height
      const wide = establishingFraming(aspect)
      expect(wide.fov).toBeGreaterThanOrEqual(BASE_FOV)
      for (const corner of ARENA_CORNERS) {
        const ndc = project(aspect, wide.fov, wide.radius, corner)
        expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1 + 1e-6)
        expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1 + 1e-6)
      }
    }
  })
})

/** The rig only needs a canvas for gesture listeners and viewport size. */
interface FakeCanvas {
  clientWidth: number
  clientHeight: number
  addEventListener(): void
  removeEventListener(): void
}

function fakeCanvas(width: number, height: number): FakeCanvas {
  return {
    clientWidth: width,
    clientHeight: height,
    addEventListener() {},
    removeEventListener() {},
  }
}

/** Project through a live rig camera and return both fighters' NDC bounds. */
function rigBounds(
  camera: PerspectiveCamera,
  _aspect: number,
  a: { x: number; z: number },
  b: { x: number; z: number },
): { inside: boolean; fraction: number } {
  camera.updateMatrixWorld()
  let inside = true
  for (const p of [a, b]) {
    for (const y of [0, 1]) {
      const vec = new Vector3(p.x, y, p.z).project(camera)
      inside &&= Math.abs(vec.x) <= 1 + 1e-6 && Math.abs(vec.y) <= 1 + 1e-6
    }
  }
  const head = new Vector3(a.x, 1, a.z).project(camera)
  const feet = new Vector3(a.x, 0, a.z).project(camera)
  return { inside, fraction: Math.abs(head.y - feet.y) / 2 }
}

describe("arena camera rig — composition lifecycle (AC3/AC6)", () => {
  test("reduced motion pins the wide shot with no shake or director", () => {
    const width = 393
    const height = 852
    const aspect = width / height
    const camera = new PerspectiveCamera(BASE_FOV, aspect, 0.1, 200)
    const rig = createOrbitCamera(
      camera,
      fakeCanvas(width, height) as unknown as HTMLElement,
    )
    rig.setMode("arena")
    rig.updateArena(0, 1 / 60, true)
    const pinned = camera.position.clone()
    rig.shake(20)
    rig.updateArena(0.5, 1 / 60, true)
    expect(camera.position.distanceTo(pinned)).toBe(0)
    expect(camera.fov).toBeCloseTo(establishingFraming(aspect).fov, 6)
    rig.dispose()
  })

  test("resize and style switches keep both fighters framed", () => {
    let width = 1440
    let height = 900
    const canvas = fakeCanvas(width, height)
    const camera = new PerspectiveCamera(BASE_FOV, width / height, 0.1, 200)
    const rig = createOrbitCamera(camera, canvas as unknown as HTMLElement)
    rig.setMode("arena")
    rig.updateArena(1, 1 / 60, false)
    rig.updateArena(1.1, 1 / 60, false)
    const broadcast = camera.position.clone()

    rig.setArenaStyle("cinematic")
    rig.applyDirectorIntent({
      look: { x: 1.6, y: 0.7, z: 0 },
      radiusMult: 1.02,
      azimuthDelta: 0.1,
      elevationDelta: 0.08,
      cut: false,
      focusA: { x: -1.6, y: 0, z: 0 },
      focusB: { x: 1.6, y: 0, z: 0 },
    })
    rig.updateArena(2, 1 / 60, false)
    const cinematic = camera.position.clone()
    expect(cinematic.distanceTo(broadcast)).toBeGreaterThan(0)
    expect(
      rigBounds(camera, width / height, { x: -1.6, z: 0 }, { x: 1.6, z: 0 })
        .inside,
    ).toBe(true)

    canvas.clientWidth = 393
    canvas.clientHeight = 852
    width = 393
    height = 852
    rig.resize(width, height)
    rig.updateArena(3, 1 / 60, false)
    const bounds = rigBounds(
      camera,
      width / height,
      { x: -1.6, z: 0 },
      { x: 1.6, z: 0 },
    )
    expect(bounds.inside).toBe(true)
    expect(bounds.fraction).toBeGreaterThanOrEqual(0.08)
    expect(bounds.fraction * height).toBeGreaterThanOrEqual(32)

    rig.setArenaStyle("broadcast")
    rig.updateArena(4, 1 / 60, false)
    const backToBroadcast = camera.position.clone()
    expect(backToBroadcast.distanceTo(cinematic)).toBeGreaterThan(0)
    rig.updateArena(4.1, 1 / 60, false)
    // Settled broadcast framing is stable between frames.
    expect(camera.position.distanceTo(backToBroadcast)).toBeLessThan(1e-6)
    expect(camera.fov).toBe(BASE_FOV)

    rig.setMode("ranch")
    expect(camera.fov).toBe(BASE_FOV)
    rig.dispose()
  })
})

/**
 * Phase 4 (FR-2 / AC-3 / AC-4): a fighter is a rendered volume, not a point.
 * These extents come from `buildSpot`'s normalized Box3 — the same measurement
 * the production camera feed consumes — and the boxes below are projected
 * through a real THREE.PerspectiveCamera, never a centre-point approximation.
 */
const measuredRig = (archetypeId: string) => {
  const spot = buildSpot(
    { archetypeId, seed: 7, name: archetypeId, key: "q" },
    1,
    new Group(),
  )
  return { height: spot.bodyHeight, radius: spot.bodyRadius }
}

interface Body {
  readonly height: number
  readonly radius: number
}

const CASTS = [
  { name: "ray/ray", a: measuredRig("ray"), b: measuredRig("ray") },
  {
    name: "draconic/draconic",
    a: measuredRig("draconic"),
    b: measuredRig("draconic"),
  },
  {
    name: "draconic/axolotl",
    a: measuredRig("draconic"),
    b: measuredRig("axolotl"),
  },
  {
    name: "axolotl/draconic",
    a: measuredRig("axolotl"),
    b: measuredRig("draconic"),
  },
  { name: "ray/golem", a: measuredRig("ray"), b: measuredRig("golem") },
  { name: "golem/ray", a: measuredRig("golem"), b: measuredRig("ray") },
] as const

interface ScreenBox {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
  readonly centerX: number
}

/** Project the rendered footprint square (feet and head, +/- measured
 * radius on both ground axes) through a real perspective camera. */
function bodyScreenBox(
  aspect: number,
  frame: TrackedFraming,
  x: number,
  z: number,
  height: number,
  radius: number,
): ScreenBox {
  const cam = new PerspectiveCamera(frame.fov, aspect, 0.1, 200)
  cam.position.set(
    frame.targetX +
      frame.radius * Math.cos(frame.elevation) * Math.sin(frame.azimuth),
    frame.targetY + frame.radius * Math.sin(frame.elevation),
    frame.targetZ +
      frame.radius * Math.cos(frame.elevation) * Math.cos(frame.azimuth),
  )
  cam.lookAt(frame.targetX, frame.targetY, frame.targetZ)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const dx of [-radius, radius]) {
    for (const dz of [-radius, radius]) {
      for (const y of [0, height]) {
        const ndc = new Vector3(x + dx, y, z + dz).project(cam)
        minX = Math.min(minX, ndc.x)
        maxX = Math.max(maxX, ndc.x)
        minY = Math.min(minY, ndc.y)
        maxY = Math.max(maxY, ndc.y)
      }
    }
  }
  const center = new Vector3(x, height / 2, z).project(cam)
  return { minX, maxX, minY, maxY, centerX: center.x }
}

const screenWidth = (box: ScreenBox): number => box.maxX - box.minX

interface PairCheck {
  readonly a: { x: number; z: number }
  readonly b: { x: number; z: number }
  readonly castA: Body
  readonly castB: Body
  readonly azimuthDelta?: number
  readonly elevationDelta?: number
  readonly targetY?: number
  readonly look?: { x: number; z: number }
}

/** One whole-body readability assertion: both silhouettes separated by more
 * than a fraction of their own widths, both fully in frame, both readable. */
function expectSeparatedPair(
  vp: (typeof VIEWPORTS)[number],
  pair: PairCheck,
  checkFloor = true,
  separationThreshold = 0.36,
): void {
  const aspect = vp.width / vp.height
  const frame = trackedActionFraming(
    aspect,
    pair.a,
    pair.b,
    {
      ...actionPose,
      azimuth: actionPose.azimuth + (pair.azimuthDelta ?? 0),
      elevation: actionPose.elevation + (pair.elevationDelta ?? 0),
      targetY: pair.targetY ?? actionPose.targetY,
    },
    pair.castA.height,
    pair.castB.height,
    pair.look,
    pair.castA.radius,
    pair.castB.radius,
  )
  const boxA = bodyScreenBox(
    aspect,
    frame,
    pair.a.x,
    pair.a.z,
    pair.castA.height,
    pair.castA.radius,
  )
  const boxB = bodyScreenBox(
    aspect,
    frame,
    pair.b.x,
    pair.b.z,
    pair.castB.height,
    pair.castB.radius,
  )
  for (const box of [boxA, boxB]) {
    expect(box.minX).toBeGreaterThanOrEqual(-1 - 1e-6)
    expect(box.maxX).toBeLessThanOrEqual(1 + 1e-6)
    expect(box.minY).toBeGreaterThanOrEqual(-1 - 1e-6)
    expect(box.maxY).toBeLessThanOrEqual(1 + 1e-6)
  }
  // A measured-extent threshold: a small gap between ground-position
  // centres cannot satisfy this when the bodies fully overlap. The centre
  // offset must be a meaningful fraction of the rendered silhouettes'
  // own widths (wide wing spans included).
  const centerGap = Math.abs(boxA.centerX - boxB.centerX)
  expect(centerGap).toBeGreaterThan(
    (separationThreshold * (screenWidth(boxA) + screenWidth(boxB))) / 2,
  )
  if (checkFloor) {
    // The 8% / 32px floor is pinned at authored rest positions. Legal
    // extremes and cinematic radius widening only promise containment.
    for (const [p, body] of [
      [pair.a, pair.castA],
      [pair.b, pair.castB],
    ] as const) {
      const fraction = bodyFraction(aspect, frame, p.x, p.z, body.height)
      expect(fraction).toBeGreaterThanOrEqual(0.08)
      expect(fraction * vp.height).toBeGreaterThanOrEqual(32)
    }
  }
}

const restPair = (mirror: 1 | -1, castA: Body, castB: Body): PairCheck => ({
  a: { x: -1.6 * mirror, z: 0 },
  b: { x: 1.6 * mirror, z: 0 },
  castA,
  castB,
})

describe("broadcast action separates rendered bodies (FR-2, AC-3/AC-4)", () => {
  test("same-height casts separate at rest in all viewports and mirrors", () => {
    for (const vp of VIEWPORTS) {
      for (const mirror of [1, -1] as const) {
        for (const cast of [CASTS[0], CASTS[1]]) {
          expectSeparatedPair(vp, restPair(mirror, cast.a, cast.b))
        }
      }
    }
  })

  test("mixed-height casts separate at rest in all viewports and mirrors", () => {
    for (const vp of VIEWPORTS) {
      for (const mirror of [1, -1] as const) {
        for (const cast of [CASTS[2], CASTS[3], CASTS[4], CASTS[5]]) {
          expectSeparatedPair(vp, restPair(mirror, cast.a, cast.b))
        }
      }
    }
  })

  test("representative legal positions keep both bodies apart and framed", () => {
    const legal: PairCheck[] = [
      {
        a: { x: -3.2, z: -2.4 },
        b: { x: 3.2, z: 2.4 },
        castA: CASTS[1].a,
        castB: CASTS[1].b,
      },
      {
        a: { x: 3.2, z: -2.4 },
        b: { x: -3.2, z: 2.4 },
        castA: CASTS[2].a,
        castB: CASTS[2].b,
      },
      {
        a: { x: -2.6, z: 0 },
        b: { x: 2.6, z: 0 },
        castA: CASTS[4].a,
        castB: CASTS[4].b,
      },
      {
        a: { x: -3.2, z: 2.4 },
        b: { x: -2.4, z: -2.4 },
        castA: CASTS[0].a,
        castB: CASTS[5].b,
      },
    ]
    for (const vp of VIEWPORTS) {
      for (const pair of legal) {
        expectSeparatedPair(vp, pair, false)
        expectSeparatedPair(
          vp,
          {
            ...pair,
            a: { x: -pair.a.x, z: -pair.a.z },
            b: { x: -pair.b.x, z: -pair.b.z },
          },
          false,
        )
      }
    }
  })

  test("cinematic offsets never reintroduce full occlusion or crop", () => {
    for (const vp of VIEWPORTS) {
      for (const azimuthDelta of [-0.4, -0.1, 0.1, 0.4]) {
        for (const cast of [CASTS[0], CASTS[1], CASTS[2], CASTS[4]]) {
          expectSeparatedPair(
            vp,
            {
              ...restPair(1, cast.a, cast.b),
              azimuthDelta,
              elevationDelta: 0.08,
              targetY: 0.7,
              look: { x: 1.6, z: 0 },
            },
            false,
            // Director look can favour one fighter; the promise here is no
            // full occlusion and no crop, not the broadcast composition.
            0.15,
          )
        }
      }
    }
  })

  test("the live rig carries measured radii from the director intent", () => {
    const width = 393
    const height = 852
    const canvas = fakeCanvas(width, height)
    const camera = new PerspectiveCamera(BASE_FOV, width / height, 0.1, 200)
    const rig = createOrbitCamera(camera, canvas as unknown as HTMLElement)
    const a = { x: -1.6, z: 0 }
    const b = { x: 1.6, z: 0 }
    rig.setMode("arena")
    rig.applyDirectorIntent({
      look: { x: 0, y: 0.7, z: 0 },
      radiusMult: 1,
      azimuthDelta: 0,
      elevationDelta: 0,
      cut: false,
      focusA: { x: a.x, y: 0, z: a.z },
      focusB: { x: b.x, y: 0, z: b.z },
      heightA: CASTS[2].a.height,
      heightB: CASTS[2].b.height,
      bodyRadiusA: CASTS[2].a.radius,
      bodyRadiusB: CASTS[2].b.radius,
    })
    for (let i = 0; i < 8; i++) rig.updateArena(i, 0.5, false)
    // Project through the LIVE camera, not a re-derived frame.
    camera.updateMatrixWorld()
    const projectBox = (body: Body, p: { x: number; z: number }): ScreenBox => {
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (const dx of [-body.radius, body.radius]) {
        for (const dz of [-body.radius, body.radius]) {
          for (const y of [0, body.height]) {
            const ndc = new Vector3(p.x + dx, y, p.z + dz).project(camera)
            minX = Math.min(minX, ndc.x)
            maxX = Math.max(maxX, ndc.x)
            minY = Math.min(minY, ndc.y)
            maxY = Math.max(maxY, ndc.y)
          }
        }
      }
      const center = new Vector3(p.x, body.height / 2, p.z).project(camera)
      return { minX, maxX, minY, maxY, centerX: center.x }
    }
    const liveA = projectBox(CASTS[2].a, a)
    const liveB = projectBox(CASTS[2].b, b)
    const centerGap = Math.abs(liveA.centerX - liveB.centerX)
    expect(centerGap).toBeGreaterThan(
      (0.36 * (screenWidth(liveA) + screenWidth(liveB))) / 2,
    )
    rig.dispose()
  })
})
