import { describe, expect, test } from "bun:test"
import type { CreatureConditions } from "@apex/sim"
import { SICK_HEALTH } from "@apex/sim"
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
import { createApi } from "./api"
import { updateRanch } from "./frame"
import { applyMorningAfterIdle, applyMorningAfterPose } from "./poses"
import { createRanchState, type RanchState } from "./state"
import type { RanchMotion, RanchMotionDeps } from "./types"

const HEAD_BASE_Y = 1.5
const DT = 0.0625

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

// ---------------------------------------------------------------------------
// The pet handler's morning-after leg (postcup_morning_after FR-5): the
// ritual day's FIRST accepted pet takes the class's reaction variant, the
// pet that dismisses a running ceremony counts as that first pet, and every
// cooldown / condition gate is untouched. Driven through the real frame loop
// so the machine, the adapter, and the api all see the same timing.
// ---------------------------------------------------------------------------

const petDeps: RanchMotionDeps = {
  scene: new THREE.Scene(),
  disposeGroup: () => {},
  onCreatureMoved: () => {},
  pileX: 0,
  pileZ: 0,
}

const petConditions = (
  over: Partial<CreatureConditions>,
): CreatureConditions => ({
  hunger: 50,
  energy: 100,
  health: 100,
  mood: 90, // the mood's own pick would be the perky hop
  bond: 0,
  ...over,
})

function petRig(conditions: CreatureConditions | null = null): {
  api: RanchMotion
  s: RanchState
} {
  const s = createRanchState(petDeps)
  s.creatureGroup = new THREE.Group()
  s.lastConditions = conditions
  return { api: createApi(s), s }
}

/** Frame steps from t=0 at the binary-exact dt the ceremonies use. */
function run(s: RanchState, n: number): void {
  for (let i = 1; i <= n; i++) updateRanch(s, i * DT, DT, true)
}

describe("the pet handler's morning-after leg (FR-5)", () => {
  test("the ritual day's first pet takes the class's variant, not the mood's", () => {
    const { api, s } = petRig(petConditions({}))
    s.morningAfter.begin(
      { class: "gatekeep", amplifiers: [], bossId: null },
      false,
    )
    run(s, 96) // 6 s — the gatekeep ceremony (5.5 s) has settled into its tint
    expect(s.morningAfterTint.active).toBe(true)
    expect(api.startPet()).toBe("lean")
  })

  test("exactly the first pet is class-conditioned; cooldowns stay untouched", () => {
    const { api, s } = petRig(petConditions({}))
    s.morningAfter.begin(
      { class: "gatekeep", amplifiers: [], bossId: null },
      false,
    )
    run(s, 96) // 6 s — the gatekeep ceremony (5.5 s) has settled into its tint
    expect(api.startPet()).toBe("lean")
    // The spam cooldown still rejects the immediate second pet…
    expect(api.startPet()).toBe(null)
    // …and once it elapses (react 1.0 s + cooldown 1.6 s), the mood's own
    // pick resumes — the class variant was a one-pet window.
    run(s, 42) // 2.625 s
    expect(api.startPet()).toBe("hop")
  })

  test("the pet that dismisses a running ceremony counts as the first pet", () => {
    // A calm mood would wiggle; the title morning hops instead.
    const { api, s } = petRig(petConditions({ mood: 60 }))
    s.morningAfter.begin(
      { class: "title", amplifiers: [], bossId: null },
      false,
    )
    run(s, 1) // the ceremony owns the creature from its first frame
    expect(s.morningAfterActive).toBe(true)
    expect(api.startPet()).toBe("hop")
    expect(s.morningAfterPetPending).toBe(false)
    // The dismissal latched: the drive settles into release and the day
    // tint takes over from the title stance (strut 1).
    run(s, 32) // 2 s — the release eases out
    expect(s.morningAfterActive).toBe(false)
    expect(s.morningAfterTint.active).toBe(true)
    expect(s.morningAfterTint.strut).toBe(1)
  })

  test("a non-ritual day pets exactly as before (conditions and cooldowns)", () => {
    const { api } = petRig(petConditions({}))
    expect(api.startPet()).toBe("hop")
    const sick = petRig(petConditions({ health: SICK_HEALTH - 1 }))
    expect(sick.api.startPet()).toBe("stir")
  })

  test("a sick creature's ritual-day first pet stays the weak stir (F1)", () => {
    // The class variant must not bypass the sick gate: the same health
    // gate the idle uses wins on the ritual day too (review F1).
    const { api, s } = petRig(petConditions({ health: SICK_HEALTH - 1 }))
    s.morningAfter.begin(
      { class: "gatekeep", amplifiers: [], bossId: null },
      false,
    )
    run(s, 96) // 6 s — the gatekeep ceremony (5.5 s) has settled into its tint
    expect(s.morningAfterTint.active).toBe(true)
    // The sick gate picks the reaction — the class table does not.
    expect(api.startPet()).toBe("stir")
    // …and the one-pet window still closes on the accepted pet.
    expect(s.morningAfterPetPending).toBe(false)
  })

  test("a second begin while the ceremony runs leaves the latches alone (F5)", () => {
    const { api, s } = petRig(petConditions({ mood: 60 }))
    s.morningAfter.begin(
      { class: "title", amplifiers: [], bossId: null },
      false,
    )
    run(s, 2) // the ceremony is live
    api.startPet() // whatever the class variant is — the window closes
    expect(s.morningAfterPetPending).toBe(false)
    // A second derivation arrives while the ceremony still runs (the
    // ledger mints once, but the machine is the guard): the live
    // ceremony keeps its class and the closed pet window stays closed.
    s.morningAfter.begin(
      { class: "exit", amplifiers: [], bossId: null },
      false,
    )
    expect(s.morningAfterClass).toBe("title")
    expect(s.morningAfterPetPending).toBe(false)
  })

  test("a mid-ceremony day advance ends the ritual before the tint latches (F2)", () => {
    const { api, s } = petRig(petConditions({ mood: 60 }))
    s.day = 4
    s.morningAfter.begin(
      { class: "title", amplifiers: [], bossId: null },
      false,
    )
    run(s, 16) // 1 s — mid-ceremony (arrival just handed over to the pose)
    expect(s.morningAfterActive).toBe(true)
    expect(s.morningAfterPetPending).toBe(true)
    // The sim day advances while the ceremony still runs — the straddle.
    s.day = 5
    run(s, 160) // 10 s — well past the settle edge, into day 5
    // FR-9: nothing from day 4's ritual survives into day 5 — the tint
    // never latches with a day it does not belong to and the pet window
    // closes with the day.
    expect(s.morningAfterActive).toBe(false)
    expect(s.morningAfterTint.active).toBe(false)
    expect(s.morningAfterPetPending).toBe(false)
    // Day 5's first pet is the mood's own pick again.
    expect(api.startPet()).toBe("wiggle")
  })

  test("the night settle releases the class variant back to the mood", () => {
    const { api, s } = petRig(petConditions({ mood: 60 }))
    // Production order: scene-sync pushes the sim day down BEFORE the
    // ceremony begins (the begin latches the ritual's own day).
    s.day = 4
    s.morningAfter.begin(
      { class: "title", amplifiers: [], bossId: null },
      false,
    )
    run(s, 160) // the title ceremony fully settled; the tint latched on day 4
    expect(s.morningAfterTint.active).toBe(true)
    // The player never pets that day; the next morning retires the tint…
    s.day = 5
    run(s, 1)
    expect(s.morningAfterTint.active).toBe(false)
    // …and the first pet of the new day is the mood's own pick again.
    expect(api.startPet()).toBe("wiggle")
  })
})
