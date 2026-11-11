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
  DODGE_PHASET_BIT,
  type FightStream,
  MOVE_INDEX_SHIFT,
  STREAM_FIELD,
  STREAM_FIELDS,
  STREAM_MOVE_IDS,
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
  /** A paid dodge burst rides the spare phaseT bit (R1/F1). */
  dodge?: boolean
  /** The committed move's stream index rides above the phase bits (R1/F2). */
  move?: number
}

/** The stream index for a move id (1-based; 0 means no attack). */
const moveIdx = (id: string): number => STREAM_MOVE_IDS.indexOf(id) + 1

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
      data[base + STREAM_FIELD.phase] =
        rec.phase | ((rec.move ?? 0) << MOVE_INDEX_SHIFT)
      data[base + STREAM_FIELD.phaseT] =
        rec.phaseT | (rec.dodge === true ? DODGE_PHASET_BIT : 0)
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
    const mid: [Rec, Rec] = [
      { ...rest(-1200), phase: STREAM_PHASE.startup, phaseT: 120 },
      rest(1200),
    ]
    const late: [Rec, Rec] = [
      { ...rest(-1200), phase: STREAM_PHASE.startup, phaseT: 220 },
      rest(1200),
    ]
    const trace = stream([opening, early, mid, late])

    stage.apply(trace, 0, left, right)
    const tell = arena.children[0] as THREE.Group
    const mesh = tell.children[0] as THREE.Mesh
    expect(mesh.visible).toBe(false)

    // The first startup sample stays hidden (R1/F5): one sample cannot
    // name the row yet.
    stage.apply(trace, 1, left, right)
    expect(mesh.visible).toBe(false)

    stage.apply(trace, 2, left, right)
    const material = mesh.material as THREE.MeshBasicMaterial
    const first = material.opacity
    expect(mesh.visible).toBe(true)
    expect(first).toBeGreaterThan(0.15)
    // The wedge aims down the attacker's facing (facing +x → +π/2 yaw).
    expect(tell.rotation.y).toBeCloseTo(Math.PI / 2)

    stage.apply(trace, 3, left, right)
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
    // The first sample stays hidden (R1/F5); the run firms up after it.
    stage.apply(trace, 0, left, right)
    expect(mesh.visible).toBe(false)
    let last = 0
    for (let step = 1; step < 12; step++) {
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
      [{ ...rest(-1200), phase: STREAM_PHASE.startup, phaseT: 20 }, rest(1200)],
      [
        { ...rest(-1200), phase: STREAM_PHASE.startup, phaseT: 120 },
        rest(1200),
      ],
    ])
    // The first sample stays hidden (R1/F5); the second firms the run.
    stage.apply(trace, 0, left, right)
    const tell = arena.children[0] as THREE.Group
    expect((tell.children[0] as THREE.Mesh).visible).toBe(false)
    stage.apply(trace, 1, left, right)
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

describe("reach-derived telegraph", () => {
  /**
   * A startup run with authentic stream phaseT: elapsed advances 20 ms per
   * step and phaseT is the rounded progress, exactly as the sim records it.
   */
  const startupRun = (durationMs: number): Array<[Rec, Rec]> => {
    const records: Array<[Rec, Rec]> = []
    for (let elapsed = 20; elapsed < durationMs; elapsed += 20) {
      records.push([
        {
          ...rest(-1200),
          phase: STREAM_PHASE.startup,
          phaseT: Math.round((elapsed / durationMs) * 255),
        },
        rest(1200),
      ])
    }
    return records
  }

  const wedgeOf = (
    arena: THREE.Group,
    side = 0,
  ): {
    group: THREE.Group
    mesh: THREE.Mesh
    ring: THREE.Mesh
    outer: number
    arc: number
  } => {
    const group = arena.children[side] as THREE.Group
    const mesh = group.children[0] as THREE.Mesh
    const ring = group.children[1] as THREE.Mesh
    const params = (mesh.geometry as THREE.RingGeometry).parameters
    return {
      group,
      mesh,
      ring,
      outer: params.outerRadius,
      arc: params.thetaLength,
    }
  }

  const drive = (steps: number, trace: FightStream) => {
    const { stage, arena } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    for (let step = 0; step < steps; step++) {
      stage.apply(trace, step, left, right)
    }
    return { stage, arena }
  }

  test("a basic startup reads short and wide", () => {
    const records = startupRun(160)
    const trace = stream(records)
    const { arena } = drive(trace.steps, trace)
    const { outer, arc } = wedgeOf(arena)
    // reach 420 mm plus the default 220 mm body, mapped to the floor.
    expect(outer).toBeCloseTo((420 + 220) * 0.0008)
    expect(arc).toBeGreaterThan(1.0)
  })

  test("a lance startup reads long and narrow", () => {
    const records = startupRun(720)
    const trace = stream(records)
    const { arena } = drive(trace.steps, trace)
    const basic = startupRun(160)
    const basicTrace = stream(basic)
    const short = drive(basicTrace.steps, basicTrace)
    const lance = wedgeOf(arena)
    const jab = wedgeOf(short.arena)
    // reach 6,500 mm overflows the show floor, so the lance clamps to the
    // arena's half-diagonal — still many times the basic's wedge.
    expect(lance.outer).toBe(4.0)
    expect(lance.outer).toBeGreaterThan(jab.outer * 4)
    expect(lance.arc).toBeLessThan(jab.arc)
  })

  test("the attacker's body radius widens the wedge", () => {
    const records = startupRun(160)
    const trace = stream(records)
    const { stage, arena } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    for (let step = 0; step < trace.steps; step++) {
      stage.apply(trace, step, left, right, [300, 220])
    }
    expect(wedgeOf(arena).outer).toBeCloseTo((420 + 300) * 0.0008)
  })

  test("geometry rebuilds only when the reach bucket changes", () => {
    const records = startupRun(720)
    const trace = stream(records)
    const { stage, arena } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    stage.apply(trace, 0, left, right)
    const first = wedgeOf(arena).mesh.geometry as THREE.RingGeometry
    stage.apply(trace, 1, left, right)
    // The second sample firms the estimate (basic default -> lance reach).
    const firmed = wedgeOf(arena).mesh.geometry as THREE.RingGeometry
    expect(firmed).not.toBe(first)
    for (let step = 2; step < trace.steps; step++) {
      stage.apply(trace, step, left, right)
    }
    // No further rebuilds across the rest of the run.
    expect(wedgeOf(arena).mesh.geometry as THREE.RingGeometry).toBe(firmed)
  })

  test("a repeated step never counts the startup run twice", () => {
    const records = startupRun(160)
    const trace = stream(records)
    const { stage, arena } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    stage.apply(trace, 0, left, right)
    stage.apply(trace, 1, left, right)
    stage.apply(trace, 1, left, right)
    for (let step = 2; step < trace.steps; step++) {
      stage.apply(trace, step, left, right)
    }
    expect(wedgeOf(arena).outer).toBeCloseTo((420 + 220) * 0.0008)
  })

  test("the pulse ring rides the wedge and hides with it", () => {
    const records = startupRun(160)
    const trace = stream(records)
    const { stage, arena } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    stage.apply(trace, 0, left, right)
    const { mesh, ring } = wedgeOf(arena)
    // The first sample stays hidden (R1/F5); the ring rides the wedge.
    expect(mesh.visible).toBe(false)
    stage.apply(trace, 1, left, right)
    expect(mesh.visible).toBe(true)
    expect(ring.visible).toBe(true)
    expect(ring.scale.x).toBeGreaterThan(0)
    const active = stream([
      [{ ...rest(-1200), phase: STREAM_PHASE.active, phaseT: 120 }, rest(1200)],
    ])
    stage.apply(active, 0, left, right)
    expect(mesh.visible).toBe(false)
    expect(ring.visible).toBe(false)
    stage.apply(trace, 0, left, right)
    stage.reset()
    expect(ring.visible).toBe(false)
  })

  test("the first startup sample stays hidden until the run firms up (R1/F5)", () => {
    const { stage, arena } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    const trace = stream([
      [{ ...rest(-1200), phase: STREAM_PHASE.startup, phaseT: 32 }, rest(1200)],
      [{ ...rest(-1200), phase: STREAM_PHASE.startup, phaseT: 96 }, rest(1200)],
    ])
    stage.apply(trace, 0, left, right)
    const { mesh, ring } = wedgeOf(arena)
    expect(mesh.visible).toBe(false)
    expect(ring.visible).toBe(false)
    // The second sample firms the run: geometry exists and both show.
    stage.apply(trace, 1, left, right)
    expect(mesh.visible).toBe(true)
    expect(ring.visible).toBe(true)
  })

  test("a wall startup reads its own reach, not the bucket's longest (R1/F2)", () => {
    const wallRun: Array<[Rec, Rec]> = []
    const boltRun: Array<[Rec, Rec]> = []
    // Both share the 500 ms startup; the bucket read would be 6,200 for
    // both. The committed index keeps the wall's own 4,400.
    for (let step = 0; step < 25; step++) {
      const phaseT = Math.round(((step + 1) * 255) / 25)
      wallRun.push([
        {
          ...rest(-1200),
          phase: STREAM_PHASE.startup,
          phaseT,
          move: moveIdx("ion_wall"),
        },
        rest(1200),
      ])
      boltRun.push([
        {
          ...rest(-1200),
          phase: STREAM_PHASE.startup,
          phaseT,
          move: moveIdx("sky_bolt"),
        },
        rest(1200),
      ])
    }
    const wallStage = drive(wallRun.length, stream(wallRun))
    expect(wedgeOf(wallStage.arena).outer).toBeCloseTo((4400 + 220) * 0.0008)
    const boltStage = drive(boltRun.length, stream(boltRun))
    expect(wedgeOf(boltStage.arena).outer).toBe(4.0)
  })

  test("a flagged dodge rolls below the travel threshold (R1/F1)", () => {
    const { stage } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    const trace = stream([
      [rest(-1200), rest(1200)],
      [{ ...rest(-1170), dodge: true }, rest(1200)],
    ])
    stage.apply(trace, 0, left, right)
    stage.apply(trace, 1, left, right)
    // Thirty millimetres never trips the roll on travel alone.
    expect(left.pose).toBe("roll")
  })

  test("an unflagged slip in the dodge band does not roll (R1/F1)", () => {
    const { stage } = stageFor()
    const left = fighter("left", 0)
    const right = fighter("right", 0)
    const trace = stream([
      [rest(-1200), rest(1200)],
      [rest(-1140), rest(1200)],
    ])
    stage.apply(trace, 0, left, right)
    stage.apply(trace, 1, left, right)
    // Sixty millimetres without the burst flag reads as footwork.
    expect(left.pose).toBe("none")
  })
})
