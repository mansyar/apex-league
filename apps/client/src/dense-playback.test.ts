/**
 * Dense playback's contract (FR-13, AC-13): the sim's millimetres land on
 * the show floor without clamping or skew, the stream sets stage targets
 * rather than positions, and a startup window is on screen before a blow.
 *
 * The stage is driven headless: a real THREE group, a stub effect layer, and
 * stream records built by hand — no renderer, no clocks.
 */

import { describe, expect, test } from "bun:test"
import {
  type FightStream,
  STREAM_FIELD,
  STREAM_FIELDS,
  STREAM_PHASE,
} from "@apex/sim"
import * as THREE from "three"
import { DEFAULT_PROFILE } from "./choreo"
import {
  createDenseStage,
  type DenseStage,
  MM_TO_WORLD,
  simX,
  simZ,
} from "./dense-playback"
import { clampStage, type DriveFighter } from "./fighter-driver"
import type { BattleEffects } from "./staging-fx"

/** A drive fighter with everything the pose loop reads, nothing else. */
function fighter(name: string, x: number): DriveFighter {
  return {
    name,
    group: new THREE.Group(),
    stage: new THREE.Vector3(x, 0, 0),
    smooth: new THREE.Vector3(x, 0, 0),
    velocity: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    squash: { s: 0, v: 0 },
    walkPhase: 0,
    phase: 0,
    baseScale: 1,
    profile: DEFAULT_PROFILE,
    down: false,
    away: 1,
    fall: 0,
    lean: { pitch: 0, roll: 0 },
    baseColors: new Map(),
  }
}

interface Rec {
  x: number
  z: number
  facingX: number
  facingZ: number
  phase: number
  phaseT: number
  hp: number
}

/** Build a stream from one record per side per step. */
function stream(records: Array<[Rec, Rec]>): FightStream {
  const data = new Int16Array(records.length * 2 * STREAM_FIELDS)
  records.forEach(([left, right], step) => {
    for (const [side, rec] of [left, right].entries()) {
      const base = (step * 2 + side) * STREAM_FIELDS
      data[base + STREAM_FIELD.x] = rec.x
      data[base + STREAM_FIELD.z] = rec.z
      data[base + STREAM_FIELD.facingX] = rec.facingX
      data[base + STREAM_FIELD.facingZ] = rec.facingZ
      data[base + STREAM_FIELD.phase] = rec.phase
      data[base + STREAM_FIELD.phaseT] = rec.phaseT
      data[base + STREAM_FIELD.hp] = rec.hp
      data[base + STREAM_FIELD.hitstunMs] = 0
      data[base + STREAM_FIELD.pinned] = 0
    }
  })
  return {
    steps: records.length,
    stepMs: 20,
    bounds: { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 },
    keys: ["left", "right"],
    data,
  }
}

const rest = (x: number, hp = 100): Rec => ({
  x,
  z: 0,
  facingX: 1,
  facingZ: 0,
  phase: STREAM_PHASE.none,
  phaseT: 0,
  hp,
})

/** The effect calls the stage makes, counted instead of drawn. */
function effects(): {
  effects: BattleEffects
  flashes: number
  bursts: number
} {
  const state = { flashes: 0, bursts: 0 }
  const stub = {
    startFlash: () => {
      state.flashes++
    },
    spawnBurst: () => {
      state.bursts++
    },
  }
  return {
    effects: stub as unknown as BattleEffects,
    get flashes() {
      return state.flashes
    },
    get bursts() {
      return state.bursts
    },
  }
}

function stageFor(): {
  stage: DenseStage
  arena: THREE.Group
  fx: ReturnType<typeof effects>
  shakes: number[]
} {
  const arena = new THREE.Group()
  const fx = effects()
  const shakes: number[] = []
  const stage = createDenseStage({
    arenaGroup: arena,
    effects: fx.effects,
    shake: (strength) => shakes.push(strength),
  })
  return { stage, arena, fx, shakes }
}

describe("the millimetre mapping", () => {
  test("puts the sim arena exactly on the show floor", () => {
    expect(MM_TO_WORLD).toBe(0.0008)
    expect(simX(4000)).toBeCloseTo(3.2)
    expect(simZ(3000)).toBeCloseTo(2.4)
    // The fence the stream respects is inside the stage clamp: nothing the
    // sim allows is ever bent to fit.
    const corner = clampStage(simX(4000), simZ(3000))
    expect(corner.x).toBeCloseTo(simX(4000))
    expect(corner.z).toBeCloseTo(simZ(3000))
  })

  test("is uniform, so a diagonal keeps its angle", () => {
    const run = simX(1000)
    const rise = simZ(1000)
    expect(run).toBeCloseTo(rise)
  })
})

describe("dense staging", () => {
  test("sets a stage target instead of teleporting the body", () => {
    const { stage } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    const trace = stream([[rest(-2000), rest(2000)]])
    stage.apply(trace, 0, left, right)
    expect(left.stage.x).toBeCloseTo(simX(-2000))
    expect(right.stage.x).toBeCloseTo(simX(2000))
    // The pose itself is the driver's: smooth is untouched here.
    expect(left.smooth.x).toBe(0)
  })

  test("shows a startup telegraph that grows before the blow", () => {
    const { stage, arena } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    const opening: [Rec, Rec] = [rest(-1200), rest(1200)]
    const early: [Rec, Rec] = [
      { ...rest(-1200), phase: STREAM_PHASE.startup, phaseT: 20 },
      rest(1200),
    ]
    const late: [Rec, Rec] = [
      { ...rest(-1200), phase: STREAM_PHASE.startup, phaseT: 220 },
      rest(1200),
    ]
    const trace = stream([opening, early, late])

    stage.apply(trace, 0, left, right)
    const tell = arena.children[0] as THREE.Group
    const mesh = tell.children[0] as THREE.Mesh
    expect(mesh.visible).toBe(false)

    stage.apply(trace, 1, left, right)
    const material = mesh.material as THREE.MeshBasicMaterial
    const first = material.opacity
    expect(mesh.visible).toBe(true)
    expect(first).toBeGreaterThan(0.15)
    // The wedge aims down the attacker's facing (facing +x → +π/2 yaw).
    expect(tell.rotation.y).toBeCloseTo(Math.PI / 2)

    stage.apply(trace, 2, left, right)
    expect(material.opacity).toBeGreaterThan(first)

    // Active/recovery frames take the tell away: the blow has committed.
    const active = stream([
      [{ ...rest(-1200), phase: STREAM_PHASE.active, phaseT: 120 }, rest(1200)],
    ])
    stage.apply(active, 0, left, right)
    expect(mesh.visible).toBe(false)
  })

  test("a long startup keeps the telegraph up until the phase turns active", () => {
    // The blow weight tripled every startup (basic 80 -> 240 ms, twelve stream
    // steps), so the tell has to survive a window that now spans many steps and
    // still vanish on the step the phase turns active.
    const { stage, arena } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    const records: Array<[Rec, Rec]> = []
    for (let step = 0; step < 12; step++) {
      const phaseT = Math.round((step * 255) / 11)
      records.push([
        { ...rest(-1200), phase: STREAM_PHASE.startup, phaseT },
        rest(1200),
      ])
    }
    records.push([
      { ...rest(-1200), phase: STREAM_PHASE.active, phaseT: 0 },
      rest(1200),
    ])
    const trace = stream(records)
    const tell = arena.children[0] as THREE.Group
    const mesh = tell.children[0] as THREE.Mesh
    let last = 0
    for (let step = 0; step < 12; step++) {
      stage.apply(trace, step, left, right)
      expect(mesh.visible).toBe(true)
      last = (mesh.material as THREE.MeshBasicMaterial).opacity
    }
    // The tell was still growing as the window closed.
    expect(last).toBeGreaterThan(0.7)
    stage.apply(trace, 12, left, right)
    expect(mesh.visible).toBe(false)
  })

  test("reacts to a hit once, on the step that took the points", () => {
    const { stage, fx, shakes } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    const trace = stream([
      [rest(-900), rest(900)],
      [rest(-900), rest(900, 88)],
      [rest(-900), rest(900, 88)],
      [rest(-900), rest(900, 80)],
    ])
    stage.apply(trace, 0, left, right)
    expect(fx.flashes).toBe(0)

    stage.apply(trace, 1, left, right)
    expect(fx.flashes).toBe(1)
    expect(fx.bursts).toBe(1)
    expect(shakes.length).toBe(1)
    expect(right.squash.v).toBeGreaterThan(0)

    // The same step drawn again (a slow frame) must not hit twice.
    stage.apply(trace, 1, left, right)
    expect(fx.flashes).toBe(1)

    stage.apply(trace, 3, left, right)
    expect(fx.flashes).toBe(2)
  })

  test("topples a body whose points are gone and lets it land", () => {
    const { stage } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    const alive: [Rec, Rec] = [rest(-800), rest(800)]
    const dead: [Rec, Rec] = [rest(-800), rest(800, 0)]
    const records: Array<[Rec, Rec]> = [alive, dead]
    for (let step = 2; step < 20; step++) records.push(dead)
    const trace = stream(records)

    stage.apply(trace, 0, left, right)
    expect(right.down).toBe(false)

    stage.apply(trace, 1, left, right)
    expect(right.down).toBe(true)
    expect(right.fall).toBe(0)

    // The reel plays over the following steps: the body ends on the floor.
    for (let step = 2; step < trace.steps; step++) {
      stage.apply(trace, step, left, right)
    }
    expect(right.fall).toBeGreaterThan(0.5)
    expect(right.lean.pitch).toBeLessThan(0)
  })

  test("reset hides the telegraphs and forgets the last hit points", () => {
    const { stage, arena } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    const trace = stream([
      [
        { ...rest(-1200), phase: STREAM_PHASE.startup, phaseT: 200 },
        rest(1200),
      ],
    ])
    stage.apply(trace, 0, left, right)
    const tell = arena.children[0] as THREE.Group
    expect((tell.children[0] as THREE.Mesh).visible).toBe(true)
    stage.reset()
    expect((tell.children[0] as THREE.Mesh).visible).toBe(false)
  })

  test("dispose takes its meshes off the arena", () => {
    const { stage, arena } = stageFor()
    expect(arena.children.length).toBe(2)
    stage.dispose()
    expect(arena.children.length).toBe(0)
  })
})
