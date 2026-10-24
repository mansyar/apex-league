import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import { pulseScale } from "./fx-math"
import { EffectLoop } from "./loop"
import { createProjectileLayer, type ProjectileLayer } from "./projectiles"

/** Deterministic clock + manual RAF pump so no real timers are involved. */
function makeClock() {
  let t = 0
  let pending: ((time: number) => void) | null = null
  return {
    now: () => t,
    advance(ms: number) {
      t += ms
    },
    schedule(cb: (time: number) => void): number {
      pending = cb
      return 7
    },
    cancel(id: number) {
      if (id === 7) pending = null
    },
    /** Run the pending frame (if any) exactly once. */
    frame() {
      const cb = pending
      pending = null
      cb?.(t)
    },
  }
}

/** A layer on a fake clock whose frames advance 100ms per pump. */
function makeLayer() {
  const clock = makeClock()
  const arenaGroup = new THREE.Group()
  const loop = new EffectLoop(
    () => false,
    clock.now,
    clock.schedule,
    clock.cancel,
  )
  const layer = createProjectileLayer({
    arenaGroup,
    loop,
    killMesh: (mesh) => arenaGroup.remove(mesh),
  })
  const fighter = (x: number, z: number) => {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    return { group }
  }
  return {
    layer,
    fighter,
    frame: () => {
      clock.advance(100)
      clock.frame()
    },
  }
}

/** Spawn a shot across the lane and return its core mesh. */
function spawnShot(
  layer: ProjectileLayer,
  from: { group: THREE.Group },
  to: { group: THREE.Group },
  element: string,
): THREE.Object3D {
  layer.spawn(from, to, element)
  const mesh = layer.firstMesh()
  if (mesh === null) throw new Error("the shot spawned without a core mesh")
  return mesh
}

describe("projectile interpreter", () => {
  test("golden: wind's streak faces downrange from its first frame", () => {
    const { layer, fighter } = makeLayer()
    const mesh = spawnShot(layer, fighter(0, 0), fighter(4, 0), "wind")
    // The spawn orientation aims the stretched +Z down the lane (here +x)
    // with y held constant, so the very first frame is streak-aligned.
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion)
    expect(forward.x).toBeCloseTo(1)
    expect(forward.y).toBeCloseTo(0)
    expect(forward.z).toBeCloseTo(0)
  })

  test("golden: wind's authored spin renders - the streak corkscrews (F1)", () => {
    const { layer, fighter, frame } = makeLayer()
    const mesh = spawnShot(layer, fighter(0, 0), fighter(4, 0), "wind")
    const before = mesh.quaternion.clone()
    frame()
    frame()
    // The interpreter-level gap: the orientation must actually change
    // across ticks, not merely carry a spin value in the look table.
    expect(mesh.quaternion.angleTo(before)).toBeGreaterThan(0)
  })

  test("golden: water's teardrop still never faces downrange (pulse path)", () => {
    const { layer, fighter, frame } = makeLayer()
    const mesh = spawnShot(layer, fighter(0, 0), fighter(4, 0), "water")
    const identity = new THREE.Quaternion()
    expect(mesh.quaternion.angleTo(identity)).toBe(0)
    frame()
    frame()
    expect(mesh.quaternion.angleTo(identity)).toBe(0)
    // The pulse branch is still the one driving water's core each frame.
    expect(mesh.scale.x).toBeCloseTo(pulseScale(200, 0.05))
  })

  test("golden: earth's boulder still tumbles but never faces downrange", () => {
    const { layer, fighter, frame } = makeLayer()
    const mesh = spawnShot(layer, fighter(0, 0), fighter(4, 0), "earth")
    const identity = new THREE.Quaternion()
    // No stretch, so no spawn orientation - the boulder starts axis-aligned.
    expect(mesh.quaternion.angleTo(identity)).toBe(0)
    const before = mesh.quaternion.clone()
    frame()
    frame()
    // Its slow authored spin still accumulates every frame.
    expect(mesh.quaternion.angleTo(before)).toBeGreaterThan(0)
  })
})
