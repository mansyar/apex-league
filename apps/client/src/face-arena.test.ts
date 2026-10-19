/**
 * The arena path owns the face idle: a cast caches its eye parts and its
 * creature seed, and the fighter driver writes a lid and a glance every
 * frame — both eyes together, glance parked on hit-stop, and no throw when
 * a rig carries no face parts at all.
 *
 * Building a rig runs the whole generator, so the cast is built once for the
 * file and the tests drive it; each driver call is a pure write over that rig.
 */
import { beforeEach, describe, expect, test } from "bun:test"
import * as THREE from "three"
import { blinkAt, glanceAt } from "./face-motion"
import { createFighterDriver } from "./fighter-driver"
import { buildSpot } from "./roster"

const cast = (seed: number, away: 1 | -1) =>
  buildSpot(
    { archetypeId: "draconic", seed, name: "fig", key: "q" },
    away,
    new THREE.Group(),
  )

const hero = cast(42, 1)
const rival = cast(7, -1)

/** First instant in [0, span) where the glance is off-centre. */
function glanceSecond(seed: number, span = 20): number {
  for (let t = 0; t < span; t += 0.002) {
    if (Math.abs(glanceAt(seed, t)) > 1e-6) return t
  }
  throw new Error("no glance found")
}

describe("arena face idle", () => {
  beforeEach(() => {
    rival.down = false
  })

  test("both eyes hang under the head and share one blink", () => {
    // The rig exposes the eye parts as named children of the head.
    expect(hero.group.getObjectByName("eyeLeft")).toBeDefined()
    expect(hero.group.getObjectByName("eyeRight")).toBeDefined()

    const shut = 1.32 // inside seed 42's first blink
    expect(blinkAt(42, shut)).toBeLessThan(0.5)
    createFighterDriver({
      pair: () => [[hero, rival]],
      pref: () => "full",
    }).step(shut * 1000)
    const left = hero.eyes?.left
    const right = hero.eyes?.right
    expect(left?.scale.y).toBeCloseTo(blinkAt(42, shut), 6)
    expect(left?.scale.y).toBe(right?.scale.y)
  }, 20_000)

  test("the glance parks during hit-stop but the lid still blinks", () => {
    const t = glanceSecond(42)
    const free = createFighterDriver({
      pair: () => [[hero, rival]],
      pref: () => "full",
    })
    free.step(t * 1000)
    expect(Math.abs(hero.eyes?.left?.rotation.y ?? 0)).toBeGreaterThan(1e-6)

    let held = false
    const stopped = createFighterDriver({
      pair: () => [[hero, rival]],
      pref: () => "full",
      glanceSuppressed: () => held,
    })
    const shut = 1.32
    held = true
    stopped.step(shut * 1000)
    expect(hero.eyes?.left?.rotation.y).toBe(0)
    expect(hero.eyes?.right?.rotation.y).toBe(0)
    expect(hero.eyes?.left?.scale.y).toBeCloseTo(blinkAt(42, shut), 6)
  }, 20_000)

  test("a downed fighter still blinks", () => {
    rival.down = true
    const shut = 1.32
    createFighterDriver({
      pair: () => [[hero, rival]],
      pref: () => "full",
    }).step(shut * 1000)
    expect(rival.eyes?.left?.scale.y).toBeCloseTo(blinkAt(7, shut), 6)
  }, 20_000)
})
