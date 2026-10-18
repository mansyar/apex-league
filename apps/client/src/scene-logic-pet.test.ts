import { describe, expect, test } from "bun:test"
import { createPetMachine, pickPetReaction } from "./scene-logic"

// Binary-exact step (2^-4) under the machine's 0.1s dt clamp — sums land on
// exact float boundaries, mirroring the rest/treat ceremony tests.
const DT = 0.0625

/** Advance the machine `steps` times, collecting each drive. */
function run(
  m: ReturnType<typeof createPetMachine>,
  steps: number,
): ReturnType<typeof createPetMachine>["advance"] extends (
  dt: number,
) => infer D
  ? D[]
  : never {
  const drives: ReturnType<ReturnType<typeof createPetMachine>["advance"]>[] =
    []
  for (let i = 0; i < steps; i++) drives.push(m.advance(DT))
  return drives as never
}

function last<T>(xs: T[]): T {
  const v = xs[xs.length - 1]
  if (v === undefined) throw new Error("empty drive list")
  return v
}

describe("pet reaction picker", () => {
  test("mood bands map to variants (happy hop / content wiggle / low lean)", () => {
    expect(pickPetReaction(100, false)).toBe("hop")
    expect(pickPetReaction(80, false)).toBe("hop")
    expect(pickPetReaction(79, false)).toBe("wiggle")
    expect(pickPetReaction(50, false)).toBe("wiggle")
    expect(pickPetReaction(49, false)).toBe("lean")
    expect(pickPetReaction(0, false)).toBe("lean")
  })

  test("droopy override: a sick creature always stirs, regardless of mood", () => {
    expect(pickPetReaction(100, true)).toBe("stir")
    expect(pickPetReaction(0, true)).toBe("stir")
  })
})

describe("pet machine — cooldown gate", () => {
  test("fresh machine is idle with no active drive", () => {
    const m = createPetMachine()
    const d = m.advance(DT)
    expect(d.phase).toBe("idle")
    expect(d.active).toBe(false)
    expect(d.react).toBe(0)
  })

  test("begin starts a reaction; it plays out and settles back to idle", () => {
    const m = createPetMachine()
    const ok = m.begin("hop", false)
    expect(ok).toBe(true)
    const drives = run(m, 24) // hop runs 0.9s = 15 steps; pad to settle
    const end = last(drives)
    expect(end.phase).toBe("idle")
    expect(end.react).toBe(0)
  })

  test("re-begin during a reaction is rejected, and until the cooldown elapses", () => {
    const m = createPetMachine()
    m.begin("wiggle", false)
    // mid-reaction re-pet is ignored
    run(m, 8)
    expect(m.begin("wiggle", false)).toBe(false)
    // finish the reaction (wiggle ends at 1.25s: 12 more steps)
    const drives = run(m, 12)
    const end = last(drives)
    expect(end.phase).toBe("idle")
    // still cooling down: immediate re-pet is ignored
    expect(m.begin("wiggle", false)).toBe(false)
    // wait out the cooldown (1.6s = 26 steps)
    run(m, 26)
    expect(m.begin("wiggle", false)).toBe(true)
  })

  test("reduced motion: short subtle reaction, then the same cooldown", () => {
    const m = createPetMachine()
    m.begin("hop", true)
    const drives = run(m, 16) // reduced hold 0.6s = 10 steps
    const end = last(drives)
    expect(end.phase).toBe("idle")
    expect(end.subtle).toBe(true)
    // subtle reactions do not skip the cooldown
    expect(m.begin("hop", true)).toBe(false)
    run(m, 26)
    expect(m.begin("hop", true)).toBe(true)
  })

  test("successive pets re-trigger cleanly after the cooldown", () => {
    const m = createPetMachine()
    m.begin("lean", false)
    run(m, 40) // lean 1.0s + settle
    run(m, 26) // cooldown
    expect(m.begin("hop", false)).toBe(true)
    const drives = run(m, 24)
    const end = last(drives)
    expect(end.phase).toBe("idle")
    expect(end.react).toBe(0)
  })
})
