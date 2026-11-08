/**
 * The contact jitter (battle_choreography_20261024 FR-7): the stage's one
 * unseeded visual input used to come from `Math.random()`. It is now a pure
 * function of the step's stable fields - victim identity, damage, and the
 * playback tick where the caller knows it - so a replay lands identically.
 *
 * The suite also guards two repository rules: nothing under `steps/` may
 * reach for unseeded randomness again (goal 4), and every `contactReaction`
 * caller must seed the playback tick - a victim-and-damage-only key makes
 * repeated hits land in the same spot.
 */
import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { PLAYBACK_PHASES, type PlaybackStep } from "@apex/sim"
import * as THREE from "three"
import { DEFAULT_PROFILE, reactionFor } from "../choreo"
import type { DriveFighter } from "../fighter-driver"
import { HitStop } from "../fx/loop"
import type { BattleEffects } from "../staging-fx"
import type { StepIO } from "./context"
import { CONTACT_JITTER, contactJitter } from "./fire"
import { impactStep } from "./impact"
import { meleeStep } from "./melee"
import { reelStep } from "./reel"

describe("contactJitter — the seeded contact offset", () => {
  test("identical step fields always yield the identical offset", () => {
    for (const tick of [0, 1, 2, 7, 128, 4096]) {
      expect(contactJitter(tick, "left", 4)).toBe(
        contactJitter(tick, "left", 4),
      )
    }
  })

  test("different ticks spread across distinct offsets", () => {
    const offsets = new Set(
      Array.from({ length: 8 }, (_, i) => contactJitter(i + 1, "left", 4)),
    )
    expect(offsets.size).toBeGreaterThanOrEqual(2)
  })

  test("a repeated hit on one victim lands somewhere new each tick", () => {
    // The defect this guards (rework round 1): keying the offset on victim
    // and damage alone made ten identical basic strikes land at exactly the
    // same lateral spot. Same victim, same damage, different ticks - the
    // offsets must differ.
    const offsets = new Set(
      Array.from({ length: 6 }, (_, i) => contactJitter(i + 1, "left", 4)),
    )
    expect(offsets.size).toBeGreaterThanOrEqual(3)
  })

  test("every offset stays inside ±CONTACT_JITTER", () => {
    for (let tick = 0; tick < 2000; tick++) {
      const offset = contactJitter(tick, "left", tick % 40)
      expect(Math.abs(offset)).toBeLessThanOrEqual(CONTACT_JITTER)
    }
  })

  test("the bound is today's ±0.15 range", () => {
    expect(CONTACT_JITTER).toBe(0.15)
  })

  test("a different victim at the same tick lands differently", () => {
    expect(contactJitter(3, "left", 4)).not.toBe(contactJitter(3, "right", 4))
  })

  test("a different damage at the same tick lands differently", () => {
    expect(contactJitter(3, "left", 4)).not.toBe(contactJitter(3, "left", 9))
  })

  test("an unseeded call is still deterministic and bounded", () => {
    // The parameter stays optional: a future caller may omit the tick, and
    // the victim identity and damage alone must still pin a bounded offset.
    const offset = contactJitter(undefined, "right", 6)
    expect(offset).toBe(contactJitter(undefined, "right", 6))
    expect(Math.abs(offset)).toBeLessThanOrEqual(CONTACT_JITTER)
  })
})

/** Every module under `steps/` that calls `contactReaction`, test files aside. */
function stepModules(): string[] {
  const dir = import.meta.dir
  return readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.includes(".test."))
    .map((name) => join(dir, name))
}

/** The argument text of every `contactReaction(...)` call in `source`. */
function callSiteArgs(source: string): string[] {
  const args: string[] = []
  const marker = "contactReaction("
  for (let at = source.indexOf(marker); at !== -1; ) {
    // The module's own declaration is not a call site.
    const isDeclaration = source.slice(0, at).endsWith("function ")
    let depth = 1
    let end = at + marker.length
    while (end < source.length && depth > 0) {
      const ch = source[end]
      if (ch === "(") depth += 1
      else if (ch === ")") depth -= 1
      end += 1
    }
    if (!isDeclaration) args.push(source.slice(at + marker.length, end - 1))
    at = source.indexOf(marker, end)
  }
  return args
}

describe("every contact call site seeds the tick", () => {
  test("no production caller falls back to the victim-and-damage key", () => {
    const callers = stepModules().map((path) => ({
      path,
      calls: callSiteArgs(readFileSync(path, "utf8")),
    }))
    const withCalls = callers.filter((file) => file.calls.length > 0)
    // A scan that found no call sites would pass vacuously.
    expect(withCalls.length).toBe(3)
    const unseeded = withCalls.flatMap((file) =>
      file.calls
        .filter((args) => !args.includes("step.tick"))
        .map((args) => `${file.path}: (${args})`),
    )
    expect(unseeded).toEqual([])
    expect(withCalls.reduce((n, file) => n + file.calls.length, 0)).toBe(5)
  })
})

describe("steps/ holds no unseeded randomness", () => {
  test("no Math.random in any non-test step module", () => {
    const offenders = stepModules().filter((path) =>
      readFileSync(path, "utf8").includes("Math.random"),
    )
    expect(offenders).toEqual([])
  })
})

/**
 * Position ownership (Phase 11 rework 1). In dense playback the stream owns
 * every body position: `dense-playback.apply` writes `stage` from the trace
 * on every frame. The step choreography therefore must not write `stage` at
 * all, or the body is shoved out by the step and pulled back by the next
 * frame — the out-and-back pop the owner reported. The legacy path keeps its
 * authored shoves untouched.
 *
 * These drive the real step runners through a fake `StepIO`, the same port
 * shape the move-fx suites stage `fireSpecial` with.
 */

/** A fighter slice the step runners can drive without a scene or a driver. */
function probeFighter(name: string, away: 1 | -1): DriveFighter {
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
    profile: DEFAULT_PROFILE,
    down: false,
    away,
    fall: 0,
    lean: { pitch: 0, roll: 0 },
    baseColors: new Map(),
  }
}

/** What the fake effects layer saw, so "keep every effect" is pinnable. */
interface EffectLog {
  flashes: number
  decals: number
  bursts: number
  projectiles: number
  punches: number
}

/**
 * The fake port: `streamOwnsBodies` is the flag under test, every effect is
 * counted, and the staged action is captured so the test can run its beats.
 */
function fakeIO(
  streamOwnsBodies: boolean,
  prev: PlaybackStep["kind"] | null = null,
): {
  io: StepIO
  log: EffectLog
  run(t: number, ao: DriveFighter, at: DriveFighter): void
} {
  const log: EffectLog = {
    flashes: 0,
    decals: 0,
    bursts: 0,
    projectiles: 0,
    punches: 0,
  }
  const effects: BattleEffects = {
    hitStop: new HitStop(),
    setPaused: () => {},
    startFlash: () => {
      log.flashes += 1
    },
    spawnProjectile: () => {
      log.projectiles += 1
    },
    spawnBurst: () => {
      log.bursts += 1
    },
    spawnDecal: () => {
      log.decals += 1
    },
    setCharge: () => {},
    clearCharge: () => {},
    firstProjectilePosition: () => null,
    disposeAllDecals: () => {},
    disposeAll: () => {},
  }
  let staged: ((t: number, ao: DriveFighter, at: DriveFighter) => void) | null =
    null
  const io: StepIO = {
    effects,
    bigHit: () => {
      log.punches += 1
    },
    startAction: (fn) => {
      staged = fn
    },
    cancelAction: () => {},
    animMs: () => 1000,
    paceRatio: () => 1,
    reduced: () => false,
    prevKind: () => prev,
    streamOwnsBodies: () => streamOwnsBodies,
  }
  return {
    io,
    log,
    run(t, ao, at) {
      if (staged === null) throw new Error("no action staged")
      staged(t, ao, at)
    },
  }
}

/** One playback step with the shared fields filled in. */
function stepOf(
  over: Partial<PlaybackStep> & Pick<PlaybackStep, "kind">,
): PlaybackStep {
  return {
    tick: 7,
    actor: "a",
    target: "b",
    hit: true,
    damage: 6,
    hpAfter: {},
    line: "probe",
    beats: 1,
    phases: PLAYBACK_PHASES[over.kind],
    ...over,
  }
}

/** Both fighters facing each other, off-axis so a z nudge is visible. */
function pair(): { actor: DriveFighter; target: DriveFighter } {
  const actor = probeFighter("a", 1)
  actor.stage.set(-2.5, 0, 0.4)
  actor.smooth.copy(actor.stage)
  const target = probeFighter("b", -1)
  target.stage.set(2.5, 0, -0.4)
  target.smooth.copy(target.stage)
  return { actor, target }
}

describe("position ownership — the dense stream owns the bodies", () => {
  test("a landed impact nudges the victim only when the step owns positions", () => {
    // Dense: the stream wrote stage this frame; the step must not touch it.
    const dense = pair()
    const denseBefore = {
      actor: dense.actor.stage.clone(),
      target: dense.target.stage.clone(),
    }
    const denseIO = fakeIO(true, "projectile")
    impactStep(
      stepOf({ kind: "impact" }),
      false,
      dense,
      dense.actor,
      dense.target,
      denseIO.io,
    )
    expect(dense.target.stage.toArray()).toEqual(denseBefore.target.toArray())
    expect(dense.actor.stage.toArray()).toEqual(denseBefore.actor.toArray())
    // Every effect survives: squash, flash, camera punch, decal.
    expect(denseIO.log).toEqual({
      flashes: 1,
      decals: 1,
      bursts: 0,
      projectiles: 0,
      punches: 1,
    })
    expect(dense.target.squash.v).not.toBe(0)

    // Legacy: the authored shove, exactly as it is today.
    const legacy = pair()
    const legacyIO = fakeIO(false, "projectile")
    impactStep(
      stepOf({ kind: "impact" }),
      false,
      legacy,
      legacy.actor,
      legacy.target,
      legacyIO.io,
    )
    // strikeReach(6) = 0.75, outward on the victim's own away side.
    expect(legacy.target.stage.x).toBe(2.5 - 0.75)
    expect(legacy.target.stage.z).toBe(-0.4 + contactJitter(7, "b", 6))
    expect(legacy.actor.stage.toArray()).toEqual([-2.5, 0, 0.4])
    expect(legacyIO.log.flashes).toBe(1)
  })

  test("a point-blank special keeps its burst and decal in both modes", () => {
    const dense = pair()
    const denseBefore = dense.target.stage.clone()
    const denseIO = fakeIO(true)
    impactStep(
      stepOf({ kind: "impact", element: "fire", moveId: "pyre_wall" }),
      false,
      dense,
      dense.actor,
      dense.target,
      denseIO.io,
    )
    // Run the compressed flight to its landing beat.
    denseIO.run(1, dense.actor, dense.target)
    expect(dense.target.stage.toArray()).toEqual(denseBefore.toArray())
    expect(denseIO.log.bursts).toBeGreaterThanOrEqual(1)
    expect(denseIO.log.flashes).toBe(1)
    expect(denseIO.log.decals).toBe(1)

    // The legacy replay still lands the same treatment and the same shove.
    const legacy = pair()
    const legacyIO = fakeIO(false)
    impactStep(
      stepOf({ kind: "impact", element: "fire", moveId: "pyre_wall" }),
      false,
      legacy,
      legacy.actor,
      legacy.target,
      legacyIO.io,
    )
    legacyIO.run(1, legacy.actor, legacy.target)
    expect(legacy.target.stage.x).toBe(2.5 - 0.75)
    expect(legacyIO.log.bursts).toBeGreaterThanOrEqual(1)
  })

  test("a dodged impact dashes only on the legacy path", () => {
    const dodge = stepOf({
      kind: "impact",
      hit: false,
      missReason: "dodge",
      dodgeDirection: "left",
    })
    const dash = reactionFor("dodge", DEFAULT_PROFILE).dash

    const dense = pair()
    const denseBefore = {
      actor: dense.actor.stage.clone(),
      target: dense.target.stage.clone(),
    }
    impactStep(dodge, true, dense, dense.actor, dense.target, fakeIO(true).io)
    expect(dense.target.stage.toArray()).toEqual(denseBefore.target.toArray())
    expect(dense.target.smooth.toArray()).toEqual(denseBefore.target.toArray())

    const legacy = pair()
    impactStep(
      dodge,
      true,
      legacy,
      legacy.actor,
      legacy.target,
      fakeIO(false).io,
    )
    expect(legacy.target.stage.x).toBe(2.5 - dash)
    expect(legacy.target.stage.z).toBe(-0.4 + 0.45)
    // Instant resolves the dash on the spot (the legacy snapTo).
    expect(legacy.target.smooth.toArray()).toEqual(
      legacy.target.stage.toArray(),
    )
  })

  test("an instant melee sets stance spacing only on the legacy path", () => {
    const whiff = stepOf({ kind: "melee", hit: false, missReason: "dodge" })

    const dense = pair()
    const denseBefore = {
      actor: dense.actor.stage.clone(),
      target: dense.target.stage.clone(),
    }
    meleeStep(whiff, true, dense, dense.actor, dense.target, fakeIO(true).io)
    expect(dense.target.stage.toArray()).toEqual(denseBefore.target.toArray())
    expect(dense.actor.stage.toArray()).toEqual(denseBefore.actor.toArray())

    const legacy = pair()
    meleeStep(
      whiff,
      true,
      legacy,
      legacy.actor,
      legacy.target,
      fakeIO(false).io,
    )
    // The slipped target dashes 0.85 out; the attacker then sets stance gap.
    expect(legacy.target.stage.x).toBe(2.5 - 0.85)
    expect(legacy.actor.stage.x).toBe(2.5 - 0.85 + 2.1)
    expect(legacy.actor.stage.z).toBe(legacy.target.stage.z)
    expect(legacy.actor.smooth.toArray()).toEqual(legacy.actor.stage.toArray())
  })

  test("a knockback reel slides only on the legacy path", () => {
    const reel = stepOf({ kind: "knockback", reaction: "knockback" })
    const slide = reactionFor("knockback", DEFAULT_PROFILE).slide

    const dense = pair()
    const denseBefore = dense.actor.stage.clone()
    reelStep(reel, true, dense, dense.actor, dense.target, fakeIO(true).io)
    expect(dense.actor.stage.toArray()).toEqual(denseBefore.toArray())

    const legacy = pair()
    reelStep(reel, true, legacy, legacy.actor, legacy.target, fakeIO(false).io)
    expect(legacy.actor.stage.x).toBe(-2.5 + slide)
    expect(legacy.actor.smooth.toArray()).toEqual(legacy.actor.stage.toArray())
  })
})
