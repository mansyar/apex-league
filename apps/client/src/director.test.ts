import { describe, expect, test } from "bun:test"
import {
  BIG_PUNCH_DAMAGE,
  type CameraIntent,
  type DirectorContext,
  nextShot,
} from "./director"

const point = (
  x: number,
  y = 0,
  z = 0,
): { x: number; y: number; z: number } => ({
  x,
  y,
  z,
})

/** A fighting pair standing on the arena lane. */
const pair = (tick = 0): DirectorContext => ({
  step: { kind: "idle", t: 0.5, tick },
  actor: point(-2.1, 0, 0),
  target: point(2.1, 0, 0),
  projectile: null,
})

const step = (
  kind: DirectorContext["step"] extends null
    ? never
    : NonNullable<DirectorContext["step"]>["kind"],
  over: Partial<NonNullable<DirectorContext["step"]>> = {},
): DirectorContext["step"] => ({ t: 0.5, tick: 2, ...over, kind })

describe("camera director core (FR6)", () => {
  test("between beats it holds the establishing wide shot", () => {
    const ctx: DirectorContext = {
      step: null,
      actor: point(-2.1, 0, 0),
      target: point(2.1, 0, 0),
      projectile: null,
    }
    const shot = nextShot(ctx)
    expect(shot.radiusMult).toBeGreaterThan(0.9)
    // The look sits between the fighters, lifted off the ground.
    expect(shot.look.x).toBeCloseTo(0)
    expect(shot.look.y).toBeGreaterThan(0)
    expect(shot.cut).toBe(false)
  })

  test("each step kind carries its shot grammar", () => {
    // Approach establishes; melee leans in; the victim close-ups are tight.
    const approach = nextShot({ ...pair(), step: step("approach") })
    const melee = nextShot({ ...pair(), step: step("melee") })
    const impact = nextShot({
      ...pair(),
      step: step("impact", { reaction: "glance", damage: 8 }),
    })
    expect(approach.radiusMult).toBeGreaterThan(melee.radiusMult)
    expect(melee.radiusMult).toBeGreaterThan(impact.radiusMult)
    // The impact close-up favors the victim's side of the lane.
    expect(impact.look.x).toBeGreaterThan(0)
  })

  test("heavy melee contact punches in; light strikes hold the dolly", () => {
    const heavy = nextShot({
      ...pair(),
      step: step("melee", { t: 0.3, reaction: "stagger", damage: 14 }),
    })
    const light = nextShot({
      ...pair(),
      step: step("melee", { t: 0.3, reaction: undefined, damage: 4 }),
    })
    expect(heavy.radiusMult).toBeLessThan(light.radiusMult)
    // Outside the contact window the punch releases again.
    const windup = nextShot({
      ...pair(),
      step: step("melee", { t: 0.1, reaction: "stagger", damage: 14 }),
    })
    expect(windup.radiusMult).toBeGreaterThan(heavy.radiusMult)
  })

  test("the punch threshold respects big damage only", () => {
    expect(BIG_PUNCH_DAMAGE).toBeGreaterThan(4)
    const small = nextShot({
      ...pair(),
      step: step("melee", { t: 0.3, reaction: "glance", damage: 4 }),
    })
    const big = nextShot({
      ...pair(),
      step: step("melee", { t: 0.3, reaction: "glance", damage: 20 }),
    })
    expect(big.radiusMult).toBeLessThan(small.radiusMult)
  })

  test("projectile shots track the shot in flight, else the thrower", () => {
    const flight = nextShot({
      ...pair(),
      step: step("projectile", { t: 0.7 }),
      projectile: point(0.4, 1.2, 0.1),
    })
    expect(flight.look.x).toBeCloseTo(0.4)
    expect(flight.look.y).toBeCloseTo(1.2)
    const windup = nextShot({
      ...pair(),
      step: step("projectile", { t: 0.1 }),
      projectile: null,
    })
    // Pre-release the camera eyes the thrower.
    expect(windup.look.x).toBeLessThan(0)
  })

  test("coverage cuts land on judge beats only", () => {
    expect(nextShot({ ...pair(), step: step("judge") }).cut).toBe(true)
    const eased = [
      "approach",
      "idle",
      "melee",
      "projectile",
      "impact",
      "stagger",
      "knockback",
      "down",
    ] as const
    for (const kind of eased) {
      expect(nextShot({ ...pair(), step: step(kind) }).cut).toBe(false)
    }
  })

  test("the KO down beat orbits deterministically within its window", () => {
    const ko = (tick: number): CameraIntent =>
      nextShot({ ...pair(), step: step("down", { t: 0.6, tick, ko: true }) })
    const first = ko(2)
    const odd = ko(5)
    // Same inputs, same orbit position.
    expect(ko(2).azimuthDelta).toBe(first.azimuthDelta)
    // The two windows sweep opposite ways.
    expect(first.azimuthDelta).toBeGreaterThan(0)
    expect(odd.azimuthDelta).toBeLessThan(0)
    // The orbit has swept by mid-beat.
    expect(Math.abs(first.azimuthDelta)).toBeGreaterThan(0.1)
    // A non-KO down holds a steadier angle.
    const plain = nextShot({
      ...pair(),
      step: step("down", { t: 0.6, tick: 2 }),
    })
    expect(Math.abs(plain.azimuthDelta)).toBeLessThan(
      Math.abs(first.azimuthDelta),
    )
  })

  test("subtle angle variety holds its side across a 4-tick window", () => {
    // Within the same window the side is stable (no flip-flop panning).
    const a = nextShot({ ...pair(0), step: step("idle", { tick: 0 }) })
    const a2 = nextShot({ ...pair(1), step: step("idle", { tick: 1 }) })
    expect(a.azimuthDelta).toBeCloseTo(a2.azimuthDelta)
    // The next window swings the other way.
    const b = nextShot({ ...pair(4), step: step("idle", { tick: 4 }) })
    expect(a.azimuthDelta).toBeGreaterThan(b.azimuthDelta)
  })
})
