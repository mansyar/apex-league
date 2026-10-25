import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import type { FaceEyes } from "../face-motion"
import { retireMorningAfterTint } from "../scene-logic"
import { updateRanch } from "./frame"
/**
 * Ranch frame — the morning-after leg (postcup_morning_after FR-2/FR-3):
 * the ceremony owns the pose while active, settles into the day-long idle
 * tint, and hands the legs back to the idle leg when it's done. Real
 * Three groups drive the writers; only the machine's own dt moves
 * anything, so every expectation is deterministic.
 */
import { applyMorningAfterIdle, applyMorningAfterPose } from "./poses"
import { createRanchState, type RanchState } from "./state"
import type { RanchMotionDeps } from "./types"

const HEAD_BASE_Y = 1.5
const DT = 0.0625

const deps: RanchMotionDeps = {
  scene: new THREE.Scene(),
  disposeGroup: () => {},
  onCreatureMoved: () => {},
  pileX: 0,
  pileZ: 0,
}

/** Boot a minimal ranch state with a named rig the pose writers can read. */
function boot(): { s: RanchState; head: THREE.Mesh; body: THREE.Mesh } {
  const s = createRanchState(deps)
  const root = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
  )
  body.name = "body"
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial(),
  )
  head.name = "head"
  head.position.set(0, HEAD_BASE_Y, 0.4)
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.5),
    new THREE.MeshLambertMaterial(),
  )
  tail.name = "tail"
  tail.position.set(0, 0.8, -0.6)
  root.add(body, head, tail)
  const eyes: FaceEyes = {}
  s.creatureGroup = root
  s.rigParts = { body, head, tail, eyes }
  s.headBaseY = HEAD_BASE_Y
  return { s, head, body }
}

/** Frame steps; every step advances the sim clock by dt. */
function steps(s: RanchState, n: number): void {
  for (let i = 1; i <= n; i++) {
    updateRanch(s, i * DT, DT, true)
  }
}

describe("ranch frame — the morning-after leg (FR-2/FR-3)", () => {
  test("the ceremony drives the creature's pose through the frame loop", () => {
    const { s, head } = boot()
    s.morningAfter.begin(
      { class: "title", amplifiers: [], bossId: null },
      false,
    )
    steps(s, 24)
    expect(s.morningAfterActive).toBe(true)
    expect(head.rotation.x).toBeLessThan(0)
    expect(head.position.y).toBeGreaterThan(HEAD_BASE_Y)
  })

  test("a long run settles the ceremony and holds the soft day tint", () => {
    const { s, head, body } = boot()
    s.morningAfter.begin(
      { class: "title", amplifiers: [], bossId: null },
      false,
    )
    steps(s, 400)
    expect(s.morningAfterActive).toBe(false)
    const emissive = (body.material as THREE.MeshLambertMaterial).emissive
    expect(emissive.r).toBe(0)
    // The day tint keeps the proud bearing, softly, all day (FR-3).
    expect(head.rotation.x).toBeLessThan(0)
    expect(head.rotation.x).toBeGreaterThan(-0.12)
  })

  test("the night settle clears the tint — the idle pose returns to rest", () => {
    const { s, head } = boot()
    s.morningAfter.begin(
      { class: "title", amplifiers: [], bossId: null },
      false,
    )
    steps(s, 400)
    retireMorningAfterTint(s.morningAfterTint, 13)
    expect(s.morningAfterTint.active).toBe(false)
    steps(s, 4)
    expect(Math.abs(head.rotation.x)).toBe(0)
    expect(head.position.y).toBe(HEAD_BASE_Y)
  })

  test("a player intent during the ceremony hands the creature back", () => {
    const { s } = boot()
    s.morningAfter.begin(
      { class: "title", amplifiers: [], bossId: null },
      false,
    )
    steps(s, 4)
    expect(s.morningAfterActive).toBe(true)
    s.morningAfter.dismiss()
    updateRanch(s, 5 * DT, DT, true)
    expect(s.morningAfterActive).toBe(true)
    steps(s, 20)
    expect(s.morningAfterActive).toBe(false)
  })

  test("reduced motion holds the outcome pose from the very first frame", () => {
    const { s, head, body } = boot()
    s.morningAfter.begin({ class: "title", amplifiers: [], bossId: null }, true)
    updateRanch(s, DT, DT, true)
    expect(head.rotation.x).toBeLessThan(0)
    const emissive = (body.material as THREE.MeshLambertMaterial).emissive
    expect(emissive.r).toBeGreaterThan(0)
  })
})

// The writer imports keep the twin contract visible in one file: the
// ceremony may use the strongest form, the tint only the soft one — the
// apply* helpers are exercised directly in ranch/morning-after.test.ts.
void applyMorningAfterPose
void applyMorningAfterIdle
