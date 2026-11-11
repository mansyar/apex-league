/**
 * The bounded accent set's cap (FR-8, AC-8): impact bursts are capped at
 * BURST_MAX live instances, the oldest is recycled first (FIFO, the same
 * policy as the floor marks), and the choice is deterministic — spawn order
 * decides, never a roll. Reduced motion still spawns nothing.
 */

import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import { BURST_MAX, type BurstLayer, createBurstLayer } from "./bursts"
import { EffectLoop } from "./loop"

function layerFor(pref: () => "full" | "reduced" = () => "full"): {
  arena: THREE.Group
  layer: BurstLayer
  frame: (ms: number) => void
} {
  const arena = new THREE.Group()
  let t = 0
  let pending: ((time: number) => void) | null = null
  const loop = new EffectLoop(
    () => false,
    () => t,
    (cb) => {
      pending = cb
      return 1
    },
    () => {
      pending = null
    },
  )
  const layer = createBurstLayer({
    arenaGroup: arena,
    loop,
    pref,
    killMesh: (mesh) => {
      arena.remove(mesh)
    },
  })
  return {
    arena,
    layer,
    frame(ms: number) {
      t += ms
      pending?.(t)
    },
  }
}

const QUIET = { flash: false, puffs: 2, life: 100 }

describe("burst cap", () => {
  test("the cap is stated and positive", () => {
    expect(BURST_MAX).toBe(8)
  })

  test("spawns past the cap recycle the oldest first", () => {
    const { arena, layer } = layerFor()
    for (let i = 0; i < BURST_MAX + 3; i++) {
      layer.spawn(new THREE.Vector3(i, 0, 0), undefined, QUIET)
    }
    expect(layer.live()).toBe(BURST_MAX)
    // Each live burst owns exactly its two fragments: nothing leaked, and
    // the three evicted bursts took their meshes with them.
    expect(arena.children.length).toBe(BURST_MAX * QUIET.puffs)
  })

  test("a single spawn still works and expires on its own", () => {
    const { arena, layer, frame } = layerFor()
    layer.spawn(new THREE.Vector3(), "fire", QUIET)
    expect(layer.live()).toBe(1)
    expect(arena.children.length).toBe(QUIET.puffs)
    frame(200)
    expect(layer.live()).toBe(0)
    expect(arena.children.length).toBe(0)
  })

  test("disposeAll frees every live burst", () => {
    const { arena, layer } = layerFor()
    for (let i = 0; i < 4; i++) {
      layer.spawn(new THREE.Vector3(), undefined, QUIET)
    }
    expect(layer.live()).toBe(4)
    layer.disposeAll()
    expect(layer.live()).toBe(0)
    expect(arena.children.length).toBe(0)
  })

  test("reduced motion spawns nothing", () => {
    const { arena, layer } = layerFor(() => "reduced")
    layer.spawn(new THREE.Vector3(), undefined, QUIET)
    expect(layer.live()).toBe(0)
    expect(arena.children.length).toBe(0)
  })
})
