import * as THREE from "three"
import type { PlayDrive } from "../scene-logic"

// -- Relief sparkle (treat ceremony FR4) -------------------------------------
// A small burst of drifting motes above the creature, visible only while
// the balm's relief window is open. Cosmetic only (no sim meaning), so it
// is verified by eye rather than by unit tests.

const SPARKLE_COUNT = 14
const SPARKLE_RISE = 0.9

export interface SparkleBurst {
  points: THREE.Points
  baseY: Float32Array
  phase: Float32Array
}

/** Build the sparkle points as a child of the creature group (so they
 * follow it and scale with the stage). Deterministic layout — cosmetic
 * decor, no gameplay meaning. */
export function buildSparkle(creature: THREE.Group): SparkleBurst {
  const positions = new Float32Array(SPARKLE_COUNT * 3)
  const baseY = new Float32Array(SPARKLE_COUNT)
  const phase = new Float32Array(SPARKLE_COUNT)
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const angle = (i / SPARKLE_COUNT) * Math.PI * 2
    const radius = 0.5 + (((i * 37) % 10) / 10) * 0.6
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 2] = Math.sin(angle) * radius
    const y = 1.6 + (((i * 53) % 10) / 10) * 0.8
    positions[i * 3 + 1] = y
    baseY[i] = y
    phase[i] = ((i * 29) % 10) / 10
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xffe9a8,
    size: 0.26,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geom, mat)
  points.visible = false
  creature.add(points)
  return { points, baseY, phase }
}

/** Drive the sparkle burst: motes drift upward on individual cycles while
 * the relief window is open, fading with it. A no-op (invisible) at
 * relief 0. */
export function updateSparkle(
  burst: SparkleBurst | null,
  t: number,
  relief: number,
): void {
  if (!burst) return
  const mat = burst.points.material as THREE.PointsMaterial
  if (relief <= 0.01) {
    burst.points.visible = false
    return
  }
  burst.points.visible = true
  mat.opacity = Math.min(1, relief)
  const attr = burst.points.geometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const cycle = (t * 1.2 + (burst.phase[i] ?? 0)) % 1
    attr.setY(i, (burst.baseY[i] ?? 0) + cycle * SPARKLE_RISE)
  }
  attr.needsUpdate = true
}

export function disposeSparkle(burst: SparkleBurst | null): void {
  if (!burst) return
  burst.points.geometry.dispose()
  ;(burst.points.material as THREE.PointsMaterial).dispose()
}

// -- Play ball (ceremony FR5) ------------------------------------------------

const BALL_RADIUS = 0.3

export function buildBall(scene: THREE.Scene): THREE.Mesh {
  const geom = new THREE.IcosahedronGeometry(BALL_RADIUS, 0)
  const mat = new THREE.MeshLambertMaterial({ color: 0xe8a13c })
  const ball = new THREE.Mesh(geom, mat)
  ball.castShadow = true
  ball.visible = false
  scene.add(ball)
  return ball
}

/** Place the ball prop from the machine's world-space drive. */
export function updateBall(ball: THREE.Mesh | null, pd: PlayDrive): void {
  if (!ball) return
  ball.visible = pd.ballVisible
  if (pd.ballVisible) {
    ball.position.set(pd.ballX, pd.ballY + BALL_RADIUS, pd.ballZ)
  }
}

export function disposeBall(ball: THREE.Mesh | null, scene: THREE.Scene): void {
  if (!ball) return
  ball.geometry.dispose()
  ;(ball.material as THREE.MeshLambertMaterial).dispose()
  scene.remove(ball)
}
