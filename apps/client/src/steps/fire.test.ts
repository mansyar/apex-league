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
import { CONTACT_JITTER, contactJitter } from "./fire"

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
