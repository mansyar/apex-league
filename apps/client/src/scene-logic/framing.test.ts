import { describe, expect, test } from "bun:test"
import { PerspectiveCamera, Vector3 } from "three"

import { arenaFramingAdjust } from "../scene-logic"

/**
 * F6 (responsive_foundation_20261013): the broadcast framing was tuned on
 * a wide desktop viewport. On narrow/portrait viewports the fixed radius
 * + vertical FOV crop the stage corners out of frame. The adjustment
 * backs the camera off and widens the lens as the aspect narrows, with
 * caps so a phone never ends up with an absurd telescope shot.
 */

/** Stage bounds the framing must keep in frame (scene.ts stage layout). */
const STAGE_CORNERS = [
  [3.4, 0, 2],
  [-3.4, 0, 2],
  [3.4, 0, -2],
  [-3.4, 0, -2],
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
    for (const corner of STAGE_CORNERS) {
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
      for (const corner of STAGE_CORNERS) {
        const ndc = project(aspect, fov, radius, corner)
        expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1 + 1e-6)
        expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1 + 1e-6)
      }
    }
  })
})
