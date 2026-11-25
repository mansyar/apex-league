/**
 * Terminal-KO weighted impact (FR-3, FR-4, AC-3/4/6, NFR-5): the KO branch
 * of `downStep` resolves an authored heavier reaction, while the ordinary
 * down, the dense stream, and the calm path stay untouched. Each action's
 * thud latch is local to its own step, so a mid-beat pause/seek or a double
 * KO can never carry a reaction into the next beat.
 */
import { describe, expect, test } from "bun:test"
import { PLAYBACK_PHASES, type PlaybackStep } from "@apex/sim"
import * as THREE from "three"
import { cueForStep } from "../audio/cues"
import { DEFAULT_PROFILE, profileFor, reactionFor } from "../choreo"
import type { DriveFighter } from "../fighter-driver"
import { HitStop } from "../fx/loop"
import type { BattleEffects } from "../staging-fx"
import type { StepIO } from "./context"
import { downStep } from "./down"
import { koFall } from "./pure"

/** A fighter slice the step runner can drive without a scene or driver. */
function fighter(
  name: string,
  away: 1 | -1,
  profile = DEFAULT_PROFILE,
): DriveFighter {
  return {
    name,
    group: new THREE.Group(),
    stage: new THREE.Vector3(),
    smooth: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    squash: { s: 0, v: 0 },
    walkPhase: 0,
    phase: 0,
    baseScale: 1,
    profile,
    down: false,
    away,
    fall: 0,
    lean: { pitch: 0, roll: 0 },
    baseColors: new Map(),
  }
}

function pair(profile = DEFAULT_PROFILE) {
  return { actor: fighter("a", 1, profile), target: fighter("b", -1, profile) }
}

/** One `down` playback step; only `ko` varies across the cases. */
function stepOf(ko: boolean): PlaybackStep {
  return {
    kind: "down",
    tick: 7,
    actor: "a",
    target: "b",
    hit: true,
    damage: 6,
    hpAfter: {},
    line: "probe",
    beats: 1,
    phases: PLAYBACK_PHASES.down,
    ko,
  }
}

/**
 * Fake port with one staged-action slot (as staging owns) and a burst
 * counter. `cancel` empties the slot, so a paused/seeked action cannot
 * fire later.
 */
function harness(reduced = false, streamOwnsBodies = false) {
  let staged: ((t: number, ao: DriveFighter, at: DriveFighter) => void) | null =
    null
  let bursts = 0
  const effects: BattleEffects = {
    hitStop: new HitStop(),
    setPaused: () => {},
    startFlash: () => {},
    spawnProjectile: () => {},
    spawnBurst: () => {
      bursts += 1
    },
    spawnDecal: () => {},
    setCharge: () => {},
    clearCharge: () => {},
    firstProjectilePosition: () => null,
    disposeAllDecals: () => {},
    disposeAll: () => {},
  }
  const io: StepIO = {
    effects,
    bigHit: () => {},
    startAction: (fn) => {
      staged = fn
    },
    cancelAction: () => {
      staged = null
    },
    animMs: () => 1000,
    paceRatio: () => 1,
    reduced: () => reduced,
    prevKind: () => null,
    streamOwnsBodies: () => streamOwnsBodies,
  }
  return {
    io,
    get bursts() {
      return bursts
    },
    run(t: number, ao: DriveFighter, at: DriveFighter) {
      if (staged === null) throw new Error("no action staged")
      staged(t, ao, at)
    },
    cancel() {
      staged = null
    },
  }
}

/** Past both thud gates: KO's staged fall and the ordinary `softFall`. */
const KO_THUD = 0.65
const SOFT_THUD = 0.6

describe("the weighted KO landing (FR-3, AC-3)", () => {
  test("a KO down lands heavier than an ordinary down and kicks a dust ring", () => {
    const p = profileFor("bovine") // hurtMult 1.25 — proves the weighting
    const koImpulse = reactionFor("ko", p).impulse
    const downImpulse = reactionFor("down", p).impulse

    const softSide = pair(p)
    const softIO = harness()
    downStep(
      stepOf(false),
      false,
      softSide,
      softSide.actor,
      softSide.target,
      softIO.io,
    )
    softIO.run(SOFT_THUD, softSide.actor, softSide.target)
    expect(softSide.actor.down).toBe(true)
    expect(softSide.actor.squash.v).toBeCloseTo(downImpulse)
    expect(softSide.actor.fall).toBeGreaterThan(0)
    expect(softIO.bursts).toBe(0)

    const koSide = pair(p)
    const koIO = harness()
    downStep(stepOf(true), false, koSide, koSide.actor, koSide.target, koIO.io)
    koIO.run(KO_THUD, koSide.actor, koSide.target)
    expect(koSide.actor.down).toBe(true)
    expect(koSide.actor.squash.v).toBeCloseTo(koImpulse)
    expect(koSide.actor.squash.v).toBeGreaterThan(softSide.actor.squash.v)
    expect(koSide.actor.fall).toBeGreaterThan(0)
    expect(koIO.bursts).toBe(1)

    // The landing latches once: staying past the thud adds no second kick.
    koIO.run(0.9, koSide.actor, koSide.target)
    expect(koSide.actor.squash.v).toBeCloseTo(koImpulse)
    expect(koIO.bursts).toBe(1)
  })

  test("double KO weights both downed bodies", () => {
    const p = profileFor("boar")
    const left = pair(p)
    const right = { actor: left.target, target: left.actor }
    const leftIO = harness()
    const rightIO = harness()
    downStep(stepOf(true), false, left, left.actor, left.target, leftIO.io)
    downStep(
      { ...stepOf(true), actor: "b", target: "a" },
      false,
      right,
      right.actor,
      right.target,
      rightIO.io,
    )
    leftIO.run(KO_THUD, left.actor, left.target)
    rightIO.run(KO_THUD, right.actor, right.target)
    const expected = reactionFor("ko", p).impulse
    expect(left.actor.down).toBe(true)
    expect(right.actor.down).toBe(true)
    expect(left.actor.squash.v).toBeCloseTo(expected)
    expect(right.actor.squash.v).toBeCloseTo(expected)
    expect(leftIO.bursts).toBe(1)
    expect(rightIO.bursts).toBe(1)
  })

  test("a mid-beat pause/seek leaves no reaction state in the next beat", () => {
    const p = profileFor("bovine")
    const side = pair(p)
    const io = harness()
    downStep(stepOf(true), false, side, side.actor, side.target, io.io)
    // Before the thud gate: nothing landed yet.
    io.run(0.5, side.actor, side.target)
    expect(side.actor.squash.v).toBe(0)
    expect(io.bursts).toBe(0)

    // Pause/seek abandons the KO action; the next beat is an ordinary down.
    io.cancel()
    downStep(stepOf(false), false, side, side.actor, side.target, io.io)
    io.run(SOFT_THUD, side.actor, side.target)
    expect(side.actor.squash.v).toBeCloseTo(reactionFor("down", p).impulse)
    expect(io.bursts).toBe(0)

    // A later KO is heavy again — no latch from the ordinary beat either.
    const koSide = pair(p)
    const koIO = harness()
    downStep(stepOf(true), false, koSide, koSide.actor, koSide.target, koIO.io)
    koIO.run(KO_THUD, koSide.actor, koSide.target)
    expect(koSide.actor.squash.v).toBeCloseTo(reactionFor("ko", p).impulse)
  })

  test("authored KO reelPitch amplifies the KO lean", () => {
    const baseline = Math.abs(koFall(KO_THUD).pitch)
    const heavy = profileFor("bovine") // hurtMult 1.25
    const light = profileFor("tortoise") // hurtMult 0.6
    const leanOf = (p: ReturnType<typeof profileFor>): number => {
      const side = pair(p)
      const io = harness()
      downStep(stepOf(true), false, side, side.actor, side.target, io.io)
      io.run(KO_THUD, side.actor, side.target)
      return Math.abs(side.actor.lean.pitch)
    }
    const heavyLean = leanOf(heavy)
    const lightLean = leanOf(light)
    expect(heavyLean).toBeGreaterThan(baseline)
    expect(lightLean).toBeGreaterThan(baseline)
    expect(heavyLean).toBeCloseTo(
      baseline * (1 + reactionFor("ko", heavy).reelPitch),
    )
    expect(lightLean).toBeCloseTo(
      baseline * (1 + reactionFor("ko", light).reelPitch),
    )
    // hurtMult drives the amplification, so a heavy body leans further.
    expect(heavyLean).toBeGreaterThan(lightLean)

    // The ordinary down never touches the lean channel.
    const soft = pair(heavy)
    const softIO = harness()
    downStep(stepOf(false), false, soft, soft.actor, soft.target, softIO.io)
    softIO.run(SOFT_THUD, soft.actor, soft.target)
    expect(soft.actor.lean.pitch).toBe(0)
  })
})

describe("calm, reduced motion and the dense stream (FR-4, AC-4/6, NFR-5)", () => {
  test("reduced motion dampens the weighted landing and adds no cue", () => {
    const p = profileFor("bovine")
    const side = pair(p)
    const io = harness(true)
    downStep(stepOf(true), false, side, side.actor, side.target, io.io)
    io.run(KO_THUD, side.actor, side.target)
    expect(side.actor.squash.v).toBeCloseTo(reactionFor("ko", p).impulse * 0.4)
    // The existing KO cue is reused; the down beat gains no new sound id.
    expect(
      cueForStep(
        { kind: "down", ko: true },
        { muted: false, reducedMotion: true },
      ),
    ).toBe("ko")
    expect(
      cueForStep(
        { kind: "down", ko: false },
        { muted: false, reducedMotion: true },
      ),
    ).toBeNull()
  })

  test("instant reduced-motion KO keeps the authored KO impulse", () => {
    const p = profileFor("bovine")
    const side = pair(p)
    const io = harness(true)
    const expected = reactionFor("ko", p).impulse * 0.4
    downStep(stepOf(true), true, side, side.actor, side.target, io.io)
    expect(side.actor.down).toBe(true)
    expect(side.actor.fall).toBe(1)
    expect(side.actor.squash.v).toBeCloseTo(expected)
    expect(side.actor.squash.v).toBeGreaterThan(
      reactionFor("down", p).impulse * 0.4,
    )
    expect(io.bursts).toBe(0)
  })

  test("instant reduced-motion ordinary down keeps the down impulse", () => {
    const p = profileFor("bovine")
    const side = pair(p)
    const io = harness(true)
    const expected = reactionFor("down", p).impulse * 0.4
    downStep(stepOf(false), true, side, side.actor, side.target, io.io)
    expect(side.actor.squash.v).toBeCloseTo(expected)
  })

  test("an instant double KO weights both bodies", () => {
    const p = profileFor("boar")
    const left = pair(p)
    const right = { actor: left.target, target: left.actor }
    const io = harness(true)
    const expected = reactionFor("ko", p).impulse * 0.4
    downStep(stepOf(true), true, left, left.actor, left.target, io.io)
    downStep(
      { ...stepOf(true), actor: "b", target: "a" },
      true,
      right,
      right.actor,
      right.target,
      io.io,
    )
    expect(left.actor.squash.v).toBeCloseTo(expected)
    expect(right.actor.squash.v).toBeCloseTo(expected)
    expect(io.bursts).toBe(0)
  })

  test("an instant KO down leaves the stream's bodies alone", () => {
    const side = pair(profileFor("bovine"))
    side.actor.stage.set(-2.2, 0, 0.6)
    side.actor.smooth.copy(side.actor.stage)
    side.actor.velocity.set(1, 0, 0)
    const io = harness(false, true)
    downStep(stepOf(true), true, side, side.actor, side.target, io.io)
    expect(side.actor.down).toBe(true)
    expect(side.actor.fall).toBe(1)
    expect(side.actor.smooth.toArray()).toEqual([-2.2, 0, 0.6])
    expect(side.actor.velocity.x).toBe(1)
    expect(io.bursts).toBe(0)
  })
})
