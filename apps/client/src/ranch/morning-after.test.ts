import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import type { FaceEyes } from "../face-motion"
import {
  createMorningAfterCeremony,
  type MorningAfterDrive,
  type MorningAfterTintState,
  morningAfterPoseOf,
  setMorningAfterTint,
} from "../scene-logic"

/**
 * Ranch poses — the morning-after leg (postcup_morning_after FR-3): the
 * ceremony drive's class stance lands on the rig through the existing
 * pose vocabulary (head lift, chest bearing, tail carriage, prance bob,
 * swagger roll, the applied glow), and the day tint writes the same move
 * set softly without shadowing the idle leg's gait. Object3D transforms
 * are pure JS, so the writers are driven against real Three objects.
 */
import { applyMorningAfterIdle, applyMorningAfterPose } from "./poses"

const HEAD_BASE_Y = 1.5

function rig() {
  const root = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
  )
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial(),
  )
  head.position.set(0, HEAD_BASE_Y, 0.4)
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.5),
    new THREE.MeshLambertMaterial(),
  )
  tail.position.set(0, 0.8, -0.6)
  root.add(body, head, tail)
  const eyes: FaceEyes = {}
  return { root, body, head, tail, parts: { body, head, tail, eyes } }
}

const drive = (strut: number, droop: number, glow = 0): MorningAfterDrive => ({
  phase: "pose",
  strut,
  droop,
  glow,
  amplified: false,
  active: true,
  done: false,
  outcome: "none",
})

describe("ranch poses — the morning-after leg (FR-3)", () => {
  test("a full-strut drive lifts the draconic rig into its swagger", () => {
    const { root, body, head, tail, parts } = rig()
    applyMorningAfterPose(root, parts, "draconic", drive(1, 0), HEAD_BASE_Y)
    expect(head.rotation.x).toBeLessThan(0)
    expect(head.position.y).toBeGreaterThan(HEAD_BASE_Y)
    expect(tail.rotation.x).toBeLessThan(0)
    expect(root.position.y).toBeGreaterThan(0)
    expect(body.rotation.z).toBeGreaterThan(0)
    const emissive = (body.material as THREE.MeshLambertMaterial).emissive
    expect(emissive.r).toBe(0)
  })

  test("the pulse passthrough rides the drive into the emissive glow", () => {
    const { body, parts, root } = rig()
    applyMorningAfterPose(
      root,
      parts,
      "draconic",
      drive(1, 0, 0.8),
      HEAD_BASE_Y,
    )
    const emissive = (body.material as THREE.MeshLambertMaterial).emissive
    expect(emissive.r).toBeGreaterThan(0)
  })

  test("the loss sag sinks every move the strut lifted", () => {
    const { root, body, head, tail, parts } = rig()
    applyMorningAfterPose(root, parts, "draconic", drive(0, 1), HEAD_BASE_Y)
    expect(head.rotation.x).toBeGreaterThan(0)
    expect(tail.rotation.x).toBeGreaterThan(0)
    expect(root.position.y).toBe(0)
    const pose = morningAfterPoseOf("draconic", drive(0, 1))
    expect(body.rotation.z).toBeCloseTo(pose.roll, 10)
  })

  test("a settled drive parks every move it would otherwise write", () => {
    const { root, head, tail, parts } = rig()
    applyMorningAfterPose(root, parts, "draconic", drive(0, 0), HEAD_BASE_Y)
    expect(Math.abs(head.rotation.x)).toBe(0)
    expect(head.position.y).toBe(HEAD_BASE_Y)
    expect(Math.abs(tail.rotation.x)).toBe(0)
    expect(root.position.y).toBe(0)
    expect(root.rotation.z).toBe(0)
  })

  test("the live machine's pose beat composes through the writer", () => {
    const { root, head, parts } = rig()
    const machine = createMorningAfterCeremony()
    machine.begin({ class: "title", amplifiers: [], bossId: null }, false)
    let last: MorningAfterDrive | null = null
    for (let i = 0; i < 24; i++) last = machine.advance(0.0625)
    if (!last) throw new Error("unreachable")
    expect(last.active).toBe(true)
    expect(last.strut).toBeGreaterThan(0)
    applyMorningAfterPose(root, parts, "draconic", last, HEAD_BASE_Y)
    expect(head.rotation.x).toBeLessThan(0)
  })

  test("the tint's weighted idle writes the stance but not the gait", () => {
    const { head, tail, parts } = rig()
    const tint: MorningAfterTintState = {
      active: false,
      day: null,
      strut: 0,
      droop: 0,
    }
    setMorningAfterTint(tint, "title", 12)
    applyMorningAfterIdle(
      parts,
      "draconic",
      tint.strut,
      tint.droop,
      HEAD_BASE_Y,
    )
    expect(head.rotation.x).toBeLessThan(0)
    expect(tail.rotation.x).toBeLessThan(0)
  })
})
