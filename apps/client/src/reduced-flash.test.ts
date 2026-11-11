/**
 * The reduced-motion flash language (FR-9, AC-9): every pose, telegraph
 * and mark collapses to one static flash — same events, same verdict,
 * nothing lost. Pure mapping, a capped static layer, and the dense
 * stage's reduced path: flashes only, full effects silent, wedge hidden,
 * trackers and stage targets untouched.
 */

import { describe, expect, test } from "bun:test"
import {
  DODGE_PHASET_BIT,
  type FightStream,
  STREAM_FIELD,
  STREAM_FIELDS,
  STREAM_PHASE,
} from "@apex/sim"
import * as THREE from "three"
import { DEFAULT_PROFILE } from "./choreo"
import { createDenseStage } from "./dense-playback"
import type { DriveFighter } from "./fighter-driver"
import {
  createReducedFlashLayer,
  flashForPose,
  REDUCED_FLASH_MAX,
} from "./reduced-flash"
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
  hp: number
  hitstunMs?: number
  pinned?: boolean
  phase?: number
  phaseT?: number
  /** A paid dodge burst rides the spare phaseT bit (R1/F1). */
  dodge?: boolean
}

/** Build a stream from one record per side per step. */
function stream(records: Array<[Rec, Rec]>): FightStream {
  const data = new Int16Array(records.length * 2 * STREAM_FIELDS)
  const put = (step: number, side: number, rec: Rec): void => {
    const base = (step * 2 + side) * STREAM_FIELDS
    data[base + STREAM_FIELD.x] = rec.x
    data[base + STREAM_FIELD.z] = 0
    data[base + STREAM_FIELD.facingX] = side === 0 ? 1 : -1
    data[base + STREAM_FIELD.facingZ] = 0
    data[base + STREAM_FIELD.phase] = rec.phase ?? STREAM_PHASE.none
    data[base + STREAM_FIELD.phaseT] =
      (rec.phaseT ?? 0) | (rec.dodge === true ? DODGE_PHASET_BIT : 0)
    data[base + STREAM_FIELD.hp] = rec.hp
    data[base + STREAM_FIELD.hitstunMs] = rec.hitstunMs ?? 0
    data[base + STREAM_FIELD.pinned] = rec.pinned ? 1 : 0
  }
  records.forEach(([left, right], step) => {
    put(step, 0, left)
    put(step, 1, right)
  })
  return {
    steps: records.length,
    stepMs: 20,
    bounds: { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 },
    keys: ["left", "right"],
    data,
  }
}

const rest = (x: number, hp = 100): Rec => ({ x, hp })

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

function stage(pref: () => "full" | "reduced"): {
  arena: THREE.Group
  owned: DriveFighter
  rival: DriveFighter
  fx: ReturnType<typeof effects>
  dense: ReturnType<typeof createDenseStage>
  baseline: number
} {
  const arena = new THREE.Group()
  const fx = effects()
  const dense = createDenseStage({
    arenaGroup: arena,
    effects: fx.effects,
    shake: () => {},
    pref,
  })
  const owned = fighter("owned", 0)
  const rival = fighter("rival", 3)
  arena.add(owned.group, rival.group)
  const baseline = arena.children.length
  return { arena, owned, rival, fx, dense, baseline }
}

describe("flashForPose", () => {
  test("every pose collapses to exactly one flash, idle to none", () => {
    expect(flashForPose("none", false)).toBeNull()
    expect(flashForPose("crouch", false)).toBe("tell")
    expect(flashForPose("flinch", false)).toBe("hit")
    expect(flashForPose("crumple", false)).toBe("break")
    expect(flashForPose("roll", false)).toBe("dodge")
    expect(flashForPose("recoil", false)).toBe("recoil")
    expect(flashForPose("press", false)).toBe("hit")
    expect(flashForPose("ko", false)).toBe("ko")
  })

  test("a pinned recoil reads as the pin, never the recoil", () => {
    expect(flashForPose("recoil", true)).toBe("pin")
  })
})

describe("reduced flash layer", () => {
  test("the cap is stated and positive", () => {
    expect(REDUCED_FLASH_MAX).toBe(4)
  })

  test("spawns past the cap recycle the oldest first", () => {
    const arena = new THREE.Group()
    const layer = createReducedFlashLayer({ arenaGroup: arena })
    for (let i = 0; i < REDUCED_FLASH_MAX + 2; i++) {
      layer.spawn(new THREE.Vector3(i, 0, 0), "hit")
    }
    expect(layer.live()).toBe(REDUCED_FLASH_MAX)
    expect(arena.children.length).toBe(REDUCED_FLASH_MAX)
  })

  test("an evicted flash leaves the arena consistent (R1/F4)", () => {
    // The marker's material type is authored, not cast — so eviction runs
    // the typed dispose path. The survivor is the newest: the oldest was
    // dropped and freed.
    const arena = new THREE.Group()
    const layer = createReducedFlashLayer({ arenaGroup: arena })
    for (let i = 0; i < REDUCED_FLASH_MAX + 1; i++) {
      layer.spawn(new THREE.Vector3(i, 0, 0), "hit")
    }
    expect(layer.live()).toBe(REDUCED_FLASH_MAX)
    expect(arena.children.length).toBe(REDUCED_FLASH_MAX)
    expect((arena.children[0] as THREE.Mesh).position.x).toBe(1)
  })

  test("markers are static: fixed heights, no travel", () => {
    const arena = new THREE.Group()
    const layer = createReducedFlashLayer({ arenaGroup: arena })
    const at = new THREE.Vector3(1.5, 0, -2)
    layer.spawn(at, "hit")
    layer.spawn(at, "tell")
    const [hit, tell] = arena.children as Array<THREE.Mesh>
    expect(hit?.position.y).toBe(0.6)
    expect(tell?.position.y).toBe(0.15)
    expect(hit?.position.x).toBe(at.x)
    expect(tell?.position.z).toBe(at.z)
  })

  test("reset clears every flash", () => {
    const arena = new THREE.Group()
    const layer = createReducedFlashLayer({ arenaGroup: arena })
    layer.spawn(new THREE.Vector3(), "hit")
    layer.spawn(new THREE.Vector3(), "ko")
    expect(layer.live()).toBe(2)
    layer.reset()
    expect(layer.live()).toBe(0)
    expect(arena.children.length).toBe(0)
  })
})

describe("dense reduced path", () => {
  test("a hit flashes once, full effects stay silent, pose intact", () => {
    const s = stage(() => "reduced")
    const fight = stream([
      [rest(0), rest(3000)],
      [{ x: 0, hp: 90, hitstunMs: 50 }, rest(3000)],
    ])
    s.dense.apply(fight, 0, s.owned, s.rival)
    s.dense.apply(fight, 1, s.owned, s.rival)
    expect(s.fx.flashes).toBe(0)
    expect(s.fx.bursts).toBe(0)
    expect(s.arena.children.length).toBe(s.baseline + 1)
    expect(s.owned.pose).toBe("flinch")
  })

  test("a break-length hitstun flashes the break, not the hit", () => {
    const s = stage(() => "reduced")
    const fight = stream([
      [rest(0), rest(3000)],
      [{ x: 0, hp: 80, hitstunMs: 700 }, rest(3000)],
    ])
    s.dense.apply(fight, 0, s.owned, s.rival)
    s.dense.apply(fight, 1, s.owned, s.rival)
    expect(s.owned.pose).toBe("crumple")
    expect(s.arena.children.length).toBe(s.baseline + 1)
  })

  test("startup flashes the tell and never shows the wedge", () => {
    const s = stage(() => "reduced")
    const fight = stream([
      [{ x: 0, hp: 100, phase: STREAM_PHASE.startup, phaseT: 100 }, rest(3000)],
    ])
    s.dense.apply(fight, 0, s.owned, s.rival)
    expect(s.arena.children.length).toBe(s.baseline + 1)
    expect(s.owned.pose).toBe("crouch")
  })

  test("a dodge roll flashes once on entry, not per frame", () => {
    const s = stage(() => "reduced")
    const fight = stream([
      [rest(0), rest(3000)],
      [{ ...rest(300), dodge: true }, rest(3000)],
      [rest(300), rest(3000)],
    ])
    s.dense.apply(fight, 0, s.owned, s.rival)
    s.dense.apply(fight, 1, s.owned, s.rival)
    expect(s.owned.pose).toBe("roll")
    const afterEntry = s.arena.children.length
    expect(afterEntry).toBe(s.baseline + 1)
    s.dense.apply(fight, 2, s.owned, s.rival)
    expect(s.arena.children.length).toBe(afterEntry)
  })

  test("a pin flashes the pin on its rising edge only", () => {
    const s = stage(() => "reduced")
    const fight = stream([
      [rest(0), rest(3000)],
      [{ x: 0, hp: 100, hitstunMs: 50, pinned: true }, rest(3000)],
      [{ x: 0, hp: 100, hitstunMs: 50, pinned: true }, rest(3000)],
    ])
    s.dense.apply(fight, 0, s.owned, s.rival)
    s.dense.apply(fight, 1, s.owned, s.rival)
    expect(s.owned.pose).toBe("recoil")
    const afterEdge = s.arena.children.length
    expect(afterEdge).toBe(s.baseline + 1)
    s.dense.apply(fight, 2, s.owned, s.rival)
    expect(s.arena.children.length).toBe(afterEdge)
    expect(s.fx.bursts).toBe(0)
  })

  test("a clinch flashes contact once, poses still track", () => {
    const s = stage(() => "reduced")
    const fight = stream([
      [rest(0), rest(100)],
      [rest(0), rest(100)],
    ])
    s.dense.apply(fight, 0, s.owned, s.rival)
    expect(s.owned.pose).toBe("press")
    // Both bodies press the same clinch: one flash per side, then silence.
    const afterEntry = s.arena.children.length
    expect(afterEntry).toBe(s.baseline + 2)
    s.dense.apply(fight, 1, s.owned, s.rival)
    expect(s.arena.children.length).toBe(afterEntry)
  })

  test("a KO snaps down with one ko flash and the same verdict", () => {
    const s = stage(() => "reduced")
    const fight = stream([
      [rest(0), rest(3000)],
      [{ x: 0, hp: 0 }, rest(3000, 100)],
    ])
    s.dense.apply(fight, 0, s.owned, s.rival)
    s.dense.apply(fight, 1, s.owned, s.rival)
    expect(s.owned.down).toBe(true)
    expect(s.owned.fall).toBe(1)
    expect(s.arena.children.length).toBe(s.baseline + 1)
    expect(s.fx.bursts).toBe(0)
    expect(s.fx.flashes).toBe(0)
  })

  test("full motion is untouched: hits burst and flash, wedge draws", () => {
    const s = stage(() => "full")
    const fight = stream([
      [{ x: 0, hp: 100, phase: STREAM_PHASE.startup, phaseT: 100 }, rest(3000)],
      [{ x: 0, hp: 90, hitstunMs: 50 }, rest(3000)],
    ])
    s.dense.apply(fight, 0, s.owned, s.rival)
    s.dense.apply(fight, 1, s.owned, s.rival)
    expect(s.fx.flashes).toBe(1)
    expect(s.fx.bursts).toBe(1)
    expect(s.arena.children.length).toBe(s.baseline)
  })

  test("reduced and full agree on poses, targets and verdict", () => {
    const a = stage(() => "reduced")
    const b = stage(() => "full")
    const fight = stream([
      [{ x: 0, hp: 100, phase: STREAM_PHASE.startup, phaseT: 100 }, rest(3000)],
      [{ x: 0, hp: 90, hitstunMs: 50 }, rest(3000)],
      [{ x: 0, hp: 0 }, rest(3000, 100)],
    ])
    for (const step of [0, 1] as const) {
      a.dense.apply(fight, step, a.owned, a.rival)
      b.dense.apply(fight, step, b.owned, b.rival)
      expect(a.owned.pose).toBe(b.owned.pose)
      expect(a.owned.stage.x).toBe(b.owned.stage.x)
      expect(a.owned.stage.z).toBe(b.owned.stage.z)
    }
    a.dense.apply(fight, 2, a.owned, a.rival)
    b.dense.apply(fight, 2, b.owned, b.rival)
    expect(a.owned.pose).toBe("ko")
    expect(b.owned.pose).toBe("ko")
    expect(a.owned.down).toBe(true)
    expect(b.owned.down).toBe(true)
  })

  test("reset clears flashes and re-arms every edge", () => {
    const s = stage(() => "reduced")
    const fight = stream([
      [rest(0), rest(3000)],
      [{ x: 0, hp: 90, hitstunMs: 50 }, rest(3000)],
    ])
    s.dense.apply(fight, 0, s.owned, s.rival)
    s.dense.apply(fight, 1, s.owned, s.rival)
    expect(s.arena.children.length).toBe(s.baseline + 1)
    s.dense.reset()
    expect(s.arena.children.length).toBe(s.baseline)
    s.dense.apply(fight, 0, s.owned, s.rival)
    s.dense.apply(fight, 1, s.owned, s.rival)
    expect(s.arena.children.length).toBe(s.baseline + 1)
  })
})
