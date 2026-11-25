import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import type { FaceEyes } from "../face-motion"
import { retireMorningAfterTint } from "../scene-logic"
import { createApi } from "./api"
import { updateRanch } from "./frame"
/**
 * Ranch frame — the morning-after leg (postcup_morning_after FR-2/FR-3):
 * the ceremony owns the pose while active, settles into the day-long idle
 * tint, and hands the legs back to the idle leg when it's done. Real
 * Three groups drive the writers; only the machine's own dt moves
 * anything, so every expectation is deterministic.
 */
import { applyMorningAfterIdle, applyMorningAfterPose } from "./poses"
import { ranchMotionFactors } from "./profile"
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

// ---------------------------------------------------------------------------
// The frame is the single place factors are derived: every frame, from the
// live rig's archetype, stage and calm flag. Nothing is latched in a module,
// so a dense field, a mid-ceremony swap or a paused tab cannot strand a
// stale factor (FR-2/FR-5, AC-2/AC-5).
// ---------------------------------------------------------------------------

/** Sample the breath at its own peak for a factor set: sin(t * 2 * tempo)
 * is 1 there, so the readout isolates amplitude from the tempo retiming. */
function peakT(
  archetypeId: string,
  stage: "baby" | "juvenile" | "champion",
  calm = false,
): number {
  return Math.PI / (4 * ranchMotionFactors(archetypeId, stage, calm).tempo)
}

function factorBoot(
  archetypeId: string,
  stage: "baby" | "juvenile" | "champion",
) {
  const rig = boot()
  rig.s.archetypeId = archetypeId
  rig.s.currentStage = stage
  return rig
}

describe("ranch frame — per-frame factor derivation (FR-2/FR-5, AC-2/AC-5)", () => {
  test("two creatures in one dense field keep independent factors", () => {
    const heavy = factorBoot("bovine", "champion")
    const light = factorBoot("falcon", "baby")
    const heavyT = peakT("bovine", "champion")
    const lightT = peakT("falcon", "baby")
    updateRanch(heavy.s, heavyT, DT, true)
    // Breath squash/stretch writes Y = 1 + profile.breathAmp * amplitude.
    const first = heavy.body.scale.y
    updateRanch(light.s, lightT, DT, true)
    const other = light.body.scale.y
    expect(other).not.toBeCloseTo(first, 6)
    // Running the other creature in between does not alter the first one.
    updateRanch(heavy.s, heavyT, DT, true)
    expect(heavy.body.scale.y).toBeCloseTo(first, 12)
    // Each matches its own freshly derived factor exactly.
    expect(first).toBeCloseTo(
      1 + 0.035 * ranchMotionFactors("bovine", "champion", false).amplitude,
      12,
    )
    expect(other).toBeCloseTo(
      1 + 0.035 * ranchMotionFactors("falcon", "baby", false).amplitude,
      12,
    )
  })

  test("an unknown archetype keeps its stage factor and stays finite", () => {
    const rig = factorBoot("mystery_beast", "champion")
    updateRanch(rig.s, peakT("mystery_beast", "champion"), DT, true)
    const f = ranchMotionFactors("mystery_beast", "champion", false)
    expect(f.amplitude).toBeCloseTo(1.15, 12)
    expect(rig.body.scale.y).toBeCloseTo(1 + 0.035 * f.amplitude, 12)
    expect(Number.isFinite(rig.head.position.y)).toBe(true)
  })

  test("reduced motion damps the frame's factor toward neutral", () => {
    const full = factorBoot("bovine", "champion")
    const calm = factorBoot("bovine", "champion")
    calm.s.reducedMotion = true
    updateRanch(full.s, peakT("bovine", "champion"), DT, true)
    updateRanch(calm.s, peakT("bovine", "champion", true), DT, true)
    expect(Math.abs(calm.body.scale.y - 1)).toBeLessThan(
      Math.abs(full.body.scale.y - 1),
    )
    expect(calm.body.scale.y).toBeCloseTo(
      1 + 0.035 * ranchMotionFactors("bovine", "champion", true).amplitude,
      12,
    )
  })

  test("a mid-ceremony evolution swap retargets the factor with no latch", () => {
    const rig = factorBoot("bovine", "baby")
    let done = 0
    createApi(rig.s).startEvolution("draconic", 7, "juvenile", () => done++)
    for (let i = 1; i <= 200; i++) updateRanch(rig.s, i * DT, DT, true)
    expect(done).toBe(1)
    expect(rig.s.currentStage).toBe("juvenile")
    // The swap rebuilt the rig and the frame must read its new archetype,
    // not the identity it started the ceremony with.
    expect(rig.s.archetypeId).toBe("draconic")
    expect(Number.isFinite(rig.s.creatureGroup?.scale.x ?? Number.NaN)).toBe(
      true,
    )
  })

  test("paused and overlong frames never produce NaN or skip a phase", () => {
    const rig = factorBoot("draconic", "champion")
    createApi(rig.s).startRest()
    for (let i = 1; i <= 200; i++) {
      // A hidden tab reports dt=0; a long stall reports an oversized dt the
      // machines clamp internally. Neither may move phase order or NaN a pose.
      updateRanch(rig.s, i * DT, i % 3 === 0 ? 4 : 0, true)
      expect(Number.isFinite(rig.body.scale.y)).toBe(true)
      expect(Number.isFinite(rig.head.position.y)).toBe(true)
      expect(Number.isFinite(rig.s.creatureGroup?.position.y ?? 0)).toBe(true)
    }
    expect(rig.s.restActive).toBe(false)
  })
})
