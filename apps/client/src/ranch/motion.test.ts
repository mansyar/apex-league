import { describe, expect, test } from "bun:test"
import type { CreatureConditions } from "@apex/sim"
import { EXHAUSTED_ENERGY, SICK_HEALTH } from "@apex/sim"
import * as THREE from "three"
import type { FaceEyes } from "../face-motion"
import {
  gaitIntensity,
  type PlayDrive,
  type RestDrive,
  smoothstep,
  standPointOnLineTo,
  type TreatDrive,
} from "../scene-logic"
import { createApi } from "./api"
import { updateRanch } from "./frame"
import { updateIdle } from "./idle"
import { MOOD_PROFILES, moodModeFrom } from "./mood"
import {
  applyBreath,
  applyPetPose,
  applyRestPose,
  applyTreatPose,
} from "./poses"
import { NEUTRAL_MOTION_FACTORS, type RanchMotionFactors } from "./profile"
import { createRanchState } from "./state"
import type { RanchMotionDeps } from "./types"

const conditions = (over: Partial<CreatureConditions>): CreatureConditions => ({
  hunger: 50,
  energy: 100,
  health: 100,
  mood: 50,
  bond: 0,
  ...over,
})

describe("smoothstep", () => {
  test("returns 0 at k=0 and 1 at k=1", () => {
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
  })

  test("is symmetric around 0.5", () => {
    expect(smoothstep(0.5)).toBe(0.5)
    expect(smoothstep(0.25)).toBeCloseTo(1 - smoothstep(0.75))
  })

  test("rises monotonically", () => {
    expect(smoothstep(0.2)).toBeLessThan(smoothstep(0.6))
    expect(smoothstep(0.6)).toBeLessThan(smoothstep(0.9))
  })
})

describe("standPointOnLineTo", () => {
  test("stands on the creature→pile line, setback short of the pile", () => {
    // Creature at origin, pile 5 units east: stand 1.15 west of the pile.
    const spot = standPointOnLineTo(0, 0, 5, 0, 1.15)
    expect(spot.x).toBeCloseTo(3.85)
    expect(spot.z).toBeCloseTo(0)
  })

  test("keeps the setback along a diagonal approach", () => {
    const spot = standPointOnLineTo(0, 0, 3, 4, 1) // 5-unit diagonal
    expect(spot.x).toBeCloseTo(3 - (3 / 5) * 1)
    expect(spot.z).toBeCloseTo(4 - (4 / 5) * 1)
  })

  test("degenerate zero-distance approach falls back cleanly", () => {
    // Creature already at the pile: direction is undefined, the guard
    // substitutes a unit length so the spot lands on the pile itself.
    const spot = standPointOnLineTo(2, 2, 2, 2, 1.15)
    expect(spot.x).toBeCloseTo(2)
    expect(spot.z).toBeCloseTo(2)
  })
})

describe("moodModeFrom", () => {
  test("droopy wins when health is below the sickness line", () => {
    expect(
      moodModeFrom(conditions({ health: SICK_HEALTH - 1, energy: 100 })),
    ).toBe("droopy")
  })

  test("exactly-at-threshold health is not droopy", () => {
    expect(
      moodModeFrom(conditions({ health: SICK_HEALTH, energy: 100 })),
    ).not.toBe("droopy")
  })

  test("sluggish when energy is exhausted (and health is fine)", () => {
    expect(moodModeFrom(conditions({ energy: EXHAUSTED_ENERGY }))).toBe(
      "sluggish",
    )
    expect(moodModeFrom(conditions({ energy: EXHAUSTED_ENERGY - 1 }))).toBe(
      "sluggish",
    )
  })

  test("happy at mood 80 and above", () => {
    expect(moodModeFrom(conditions({ mood: 80 }))).toBe("happy")
    expect(moodModeFrom(conditions({ mood: 79 }))).toBe("normal")
  })

  test("normal when nothing bites", () => {
    expect(moodModeFrom(conditions({}))).toBe("normal")
  })
})

describe("gaitIntensity", () => {
  test("zero when not traveling", () => {
    expect(gaitIntensity(false, 3)).toBe(0)
  })

  test("eases out over the last 0.6 units", () => {
    expect(gaitIntensity(true, 0.6)).toBe(1)
    // Closer to the target = deeper into the ease-out, never above 1.
    expect(gaitIntensity(true, 0.2)).toBe(smoothstep(0.2 / 0.6))
    expect(gaitIntensity(true, 0.2)).toBeLessThan(gaitIntensity(true, 0.45))
    expect(gaitIntensity(true, 0.45)).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// Ranch pose factors (FR-2/FR-3/FR-4, AC-2/AC-3/AC-4). The writers multiply
// authored curves by the adapter's factors: tempo shifts pose clocks only,
// amplitude scales pose deltas. Machine dt, travel positions, phase order and
// callbacks are owned elsewhere and must not move with the factors.
// ---------------------------------------------------------------------------

const MOTION_DT = 0.0625
const HEAD_BASE_Y = 2

const motionDeps: RanchMotionDeps = {
  scene: new THREE.Scene(),
  disposeGroup: () => {},
  onCreatureMoved: () => {},
  pileX: 0,
  pileZ: 5,
}

const idlePlay: PlayDrive = {
  phase: "idle",
  ballVisible: false,
  ballX: 0,
  ballY: 0,
  ballZ: 0,
  bounce: 0,
  active: false,
  done: false,
}

/** A named rig the pose writers can address, with real pivots to inspect. */
function motionRig() {
  const root = new THREE.Group()
  const part = (name: string): THREE.Object3D => {
    const obj = new THREE.Object3D()
    obj.name = name
    root.add(obj)
    return obj
  }
  const body = part("body")
  const head = part("head")
  head.position.y = HEAD_BASE_Y
  const tail = part("tail")
  const tailTip = part("tailTip")
  const legFL = part("legFL")
  part("legFR")
  part("legBL")
  part("legBR")
  const eyes: FaceEyes = {}
  return {
    root,
    body,
    head,
    tail,
    tailTip,
    legFL,
    parts: { body, head, tail, tailTip, eyes },
  }
}

const BIG: RanchMotionFactors = { amplitude: 1.15, tempo: 1.5 }

describe("ranch pose factors — shared breath and feed gait (FR-3, AC-3)", () => {
  test("breath depth and phase both scale; the authored sine is not replaced", () => {
    const neutral = motionRig()
    const scaled = motionRig()
    // t = π/2: the normal rate (2 rad/s) lands exactly on sin(π)=0, so a
    // tempo shift alone is observable as a non-resting scale.
    const t = Math.PI / 2
    applyBreath(neutral.parts, t, MOOD_PROFILES.normal, false, HEAD_BASE_Y)
    applyBreath(scaled.parts, t, MOOD_PROFILES.normal, false, HEAD_BASE_Y, BIG)
    // Neutral is at the authored rest point, the scaled pose is not.
    expect(neutral.body.scale.y).toBeCloseTo(1, 12)
    expect(scaled.body.scale.y).not.toBeCloseTo(1, 6)
    expect(scaled.body.scale.y).toBeCloseTo(
      1 - MOOD_PROFILES.normal.breathAmp * BIG.amplitude,
      12,
    )
    // The tail sway clock reads the same tempo.
    expect(neutral.tail.rotation.y).toBeCloseTo(Math.sin(t * 1.3) * 0.06, 12)
    expect(scaled.tail.rotation.y).toBeCloseTo(
      Math.sin(t * 1.3 * BIG.tempo) * 0.06 * BIG.amplitude,
      12,
    )
  })

  test("feed's walk scales leg swing, roll and bob but never travel position", () => {
    const snapshot = (factors: RanchMotionFactors) => {
      const s = createRanchState(motionDeps)
      const rig = motionRig()
      s.creatureGroup = rig.root
      s.rigParts = rig.parts
      s.walk.begin(0, 0, 0, 5, 0)
      // t = 0.25: gait phase π under neutral, 1.5π at tempo 1.5.
      updateIdle(s, 0.25, MOTION_DT, idlePlay, MOOD_PROFILES.normal, factors)
      return {
        leg: rig.legFL.rotation.x,
        roll: rig.body.rotation.z,
        bob: rig.root.position.y,
        z: rig.root.position.z,
      }
    }
    const neutral = snapshot(NEUTRAL_MOTION_FACTORS)
    const scaled = snapshot(BIG)
    expect(neutral.leg).toBeCloseTo(0, 12)
    expect(neutral.bob).toBeCloseTo(0, 12)
    // Tempo moves the phase off its neutral zero; amplitude scales the
    // resulting authored swing/roll/bob.
    expect(scaled.leg).toBeCloseTo(-0.35 * BIG.amplitude, 12)
    expect(scaled.roll).toBeCloseTo(-0.03 * BIG.amplitude, 12)
    // The idle leg parks the ground height after the gait writer, so
    // `bob` is not a stable readout here — leg swing and roll are.
    // Position-driven travel is untouched by presentation factors.
    expect(scaled.z).toBeCloseTo(neutral.z, 12)
    expect(scaled.z).toBeCloseTo(2.2 * MOTION_DT, 12)
  })

  test("feed's nibble head dips scale their depth, not the walk machine", () => {
    const snapshot = (factors: RanchMotionFactors) => {
      const s = createRanchState(motionDeps)
      const rig = motionRig()
      s.creatureGroup = rig.root
      s.rigParts = rig.parts
      s.walk.begin(0, 0, 0, 0, 0) // zero-distance walk enters nibble at once
      updateIdle(
        s,
        MOTION_DT,
        MOTION_DT,
        idlePlay,
        MOOD_PROFILES.normal,
        factors,
      )
      updateIdle(
        s,
        2 * MOTION_DT,
        MOTION_DT,
        idlePlay,
        MOOD_PROFILES.normal,
        factors,
      )
      return rig.head.position.y
    }
    const neutral = snapshot(NEUTRAL_MOTION_FACTORS)
    const scaled = snapshot(BIG)
    const dip = HEAD_BASE_Y - neutral
    expect(dip).toBeGreaterThan(0)
    expect(HEAD_BASE_Y - scaled).toBeCloseTo(dip * BIG.amplitude, 12)
  })
})

describe("ranch pose factors — rest, treat, play and pet (FR-3, AC-3)", () => {
  test("rest curl and wake stretch scale their pose deltas", () => {
    const drive: RestDrive = {
      phase: "sleep",
      curl: 1,
      stretch: 0,
      active: true,
      done: false,
    }
    const neutral = motionRig()
    const scaled = motionRig()
    applyRestPose(neutral.root, neutral.parts, drive, 0, HEAD_BASE_Y)
    applyRestPose(scaled.root, scaled.parts, drive, 0, HEAD_BASE_Y, BIG)
    expect(scaled.legFL.rotation.x).toBeCloseTo(
      neutral.legFL.rotation.x * BIG.amplitude,
      12,
    )
    expect(scaled.root.position.y).toBeCloseTo(
      neutral.root.position.y * BIG.amplitude,
      12,
    )
    expect(HEAD_BASE_Y - scaled.head.position.y).toBeCloseTo(
      (HEAD_BASE_Y - neutral.head.position.y) * BIG.amplitude,
      12,
    )
    const stretch: RestDrive = { ...drive, phase: "wake", curl: 0, stretch: 1 }
    applyRestPose(scaled.root, scaled.parts, stretch, 0, HEAD_BASE_Y, BIG)
    expect(scaled.body.scale.y).toBeCloseTo(1 + 0.14 * BIG.amplitude, 12)
  })

  test("treat's slump scales its head, pitch and ground settle", () => {
    const drive: TreatDrive = {
      phase: "balm",
      subdued: 1,
      relief: 0,
      active: true,
      done: false,
    }
    const neutral = motionRig()
    const scaled = motionRig()
    applyTreatPose(neutral.root, neutral.parts, drive, HEAD_BASE_Y)
    applyTreatPose(scaled.root, scaled.parts, drive, HEAD_BASE_Y, BIG)
    expect(HEAD_BASE_Y - scaled.head.position.y).toBeCloseTo(
      (HEAD_BASE_Y - neutral.head.position.y) * BIG.amplitude,
      12,
    )
    expect(scaled.body.rotation.x).toBeCloseTo(
      neutral.body.rotation.x * BIG.amplitude,
      12,
    )
    expect(scaled.root.position.y).toBeCloseTo(
      neutral.root.position.y * BIG.amplitude,
      12,
    )
  })

  test("play's celebrate hop scales its height; the machine envelope is unchanged", () => {
    const snapshot = (factors: RanchMotionFactors) => {
      const s = createRanchState(motionDeps)
      const rig = motionRig()
      s.creatureGroup = rig.root
      s.rigParts = rig.parts
      s.playActive = true
      const play: PlayDrive = { ...idlePlay, phase: "celebrate", bounce: 0.5 }
      updateIdle(s, MOTION_DT, MOTION_DT, play, MOOD_PROFILES.normal, factors)
      return rig.root.position.y
    }
    expect(snapshot(BIG)).toBeCloseTo(0.5 * 0.18 * BIG.amplitude, 12)
    expect(snapshot(NEUTRAL_MOTION_FACTORS)).toBeCloseTo(0.5 * 0.18, 12)
  })

  test("pet's wiggle rhythm scales tempo and its arcs scale amplitude", () => {
    const drive = {
      phase: "react",
      variant: "wiggle",
      react: 1,
      subtle: false,
      active: true,
    } as const
    const neutral = motionRig()
    const scaled = motionRig()
    // t = π/16: the authored 16 Hz wobble is exactly zero, the scaled one
    // is at its extreme (tempo 1.5).
    const t = Math.PI / 16
    applyPetPose(neutral.root, neutral.parts, drive, t)
    applyPetPose(scaled.root, scaled.parts, drive, t, BIG)
    expect(neutral.body.rotation.z).toBeCloseTo(0, 12)
    expect(scaled.body.rotation.z).toBeCloseTo(-0.09 * BIG.amplitude, 12)
    expect(scaled.tail.rotation.y).not.toBeCloseTo(0, 6)
  })

  test("a pet hop's bounce scales amplitude without changing the reaction arc", () => {
    const drive = {
      phase: "react",
      variant: "hop",
      react: 0.5,
      subtle: false,
      active: true,
    } as const
    const neutral = motionRig()
    const scaled = motionRig()
    applyPetPose(neutral.root, neutral.parts, drive, 0)
    applyPetPose(scaled.root, scaled.parts, drive, 0, BIG)
    expect(scaled.root.position.y).toBeCloseTo(
      neutral.root.position.y * BIG.amplitude,
      12,
    )
    expect(scaled.body.scale.y).toBeGreaterThan(1)
  })
})

describe("ranch pose factors — ceremony laws stay byte-for-byte (FR-3, AC-3)", () => {
  test("evolution's scale journey and callback fire identically under any factor", () => {
    const run = (archetypeId: string) => {
      const s = createRanchState(motionDeps)
      const rig = motionRig()
      s.creatureGroup = rig.root
      s.rigParts = rig.parts
      s.archetypeId = archetypeId
      s.currentStage = "baby"
      let done = 0
      createApi(s).startEvolution(archetypeId, 12, "juvenile", () => done++)
      const scales: number[] = []
      const xs: number[] = []
      for (let i = 1; i <= 220; i++) {
        updateRanch(s, i * MOTION_DT, MOTION_DT, true)
        scales.push(s.creatureGroup?.scale.x ?? 0)
        xs.push(s.creatureGroup?.position.x ?? 0)
      }
      return { done, scales, xs, s }
    }
    const heavy = run("bovine")
    const light = run("falcon")
    expect(heavy.done).toBe(1)
    expect(light.done).toBe(1)
    expect(heavy.scales).toEqual(light.scales)
    expect(heavy.xs).toEqual(light.xs)
    // The authored ladder is still exactly the baby→juvenile journey.
    expect(Math.min(...heavy.scales)).toBeCloseTo(0.6, 12)
    expect(heavy.scales[heavy.scales.length - 1]).toBeCloseTo(1, 12)
    // The swap latched the target archetype; factors followed it.
    expect(heavy.s.archetypeId).toBe("bovine")
    expect(light.s.archetypeId).toBe("falcon")
  })
})
