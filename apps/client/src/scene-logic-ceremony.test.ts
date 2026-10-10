import { describe, expect, test } from "bun:test"

import { type CeremonyState, createCeremony } from "./scene-logic"

/** Advance a machine in fixed steps, collecting every tick state. */
function run(
  machine: ReturnType<typeof createCeremony>,
  from: number,
  seconds: number,
  step = 0.1,
): CeremonyState[] {
  const states: CeremonyState[] = []
  for (let t = from; t <= from + seconds + 1e-9; t += step) {
    states.push(machine.tick(t))
  }
  return states
}

describe("ceremony — phase sequence (normal motion)", () => {
  test("walks turn → walk-out → nibble → walk-home in order", () => {
    const m = createCeremony(false)
    m.start(10)
    const states = run(m, 10.05, 6)
    const phases = states.map((s) => s.phase)
    expect(phases).toContain("turn")
    expect(phases).toContain("walk-out")
    expect(phases).toContain("nibble")
    expect(phases).toContain("walk-home")
    // Order: first index of each must be increasing.
    const first = (p: string) => phases.indexOf(p as never)
    expect(first("turn")).toBeLessThan(first("walk-out"))
    expect(first("walk-out")).toBeLessThan(first("nibble"))
    expect(first("nibble")).toBeLessThan(first("walk-home"))
  })

  test("starts in the turn phase", () => {
    const m = createCeremony(false)
    m.start(5)
    expect(m.tick(5.01).phase).toBe("turn")
  })

  test("ends back at home-idle within ~4–6 s total", () => {
    const m = createCeremony(false)
    m.start(0)
    let total = 0
    for (let t = 0; t <= 10; t += 0.05) {
      const s = m.tick(t)
      if (s.done) {
        total = t
        expect(s.phase).toBe("idle")
        break
      }
    }
    expect(total).toBeGreaterThan(3.99)
    expect(total).toBeLessThanOrEqual(6)
  })

  test("after completion the machine stays idle (no re-trigger)", () => {
    const m = createCeremony(false)
    m.start(0)
    run(m, 0, 7)
    const s = m.tick(20)
    expect(s.phase).toBe("idle")
    expect(s.done).toBe(false)
  })
})

describe("ceremony — nibble dips", () => {
  test("delivers 2–3 head-dip cycles inside the nibble phase", () => {
    const m = createCeremony(false)
    m.start(0)
    let dips = 0
    let maxDips = 0
    for (let t = 0; t <= 10; t += 0.05) {
      const s = m.tick(t)
      dips = Math.max(dips, s.dips)
      maxDips = Math.max(maxDips, s.dips)
      if (s.done) break
    }
    expect(maxDips).toBeGreaterThanOrEqual(2)
    expect(maxDips).toBeLessThanOrEqual(3)
    expect(dips).toBe(maxDips)
  })

  test("dipOffset rises and falls (gentle oscillation, not monotonic)", () => {
    const m = createCeremony(false)
    m.start(0)
    const offsets: number[] = []
    for (let t = 0; t <= 10; t += 0.05) {
      const s = m.tick(t)
      if (s.phase === "nibble") offsets.push(s.dipOffset)
      if (s.done) break
    }
    expect(offsets.length).toBeGreaterThan(8)
    let prev = offsets[0] ?? 0
    let rises = 0
    let falls = 0
    for (let i = 1; i < offsets.length; i++) {
      const cur = offsets[i] ?? 0
      if (cur > prev) rises++
      else if (cur < prev) falls++
      prev = cur
    }
    expect(rises).toBeGreaterThan(0)
    expect(falls).toBeGreaterThan(0)
  })
})

describe("ceremony — instant cancel", () => {
  test("cancel from mid-nibble returns to home-idle on the same tick", () => {
    const m = createCeremony(false)
    m.start(0)
    m.tick(1.5)
    m.cancel()
    const s = m.tick(1.51)
    expect(s.phase).toBe("idle")
    expect(s.phaseElapsed).toBe(0)
    expect(s.done).toBe(false)
  })

  test("cancel from every phase (sampled across the whole run) works", () => {
    for (const cancelAt of [0.1, 0.7, 1.9, 3.5, 4.9]) {
      const m = createCeremony(false)
      m.start(0)
      m.tick(cancelAt)
      m.cancel()
      const s = m.tick(cancelAt + 0.01)
      expect(s.phase).toBe("idle")
    }
  })

  test("double cancel and cancel-while-idle are safe no-ops", () => {
    const m = createCeremony(false)
    m.cancel()
    m.cancel()
    expect(m.tick(0).phase).toBe("idle")
    m.start(0)
    m.cancel()
    m.cancel()
    expect(m.tick(0.5).phase).toBe("idle")
  })

  test("a cancelled machine never reports done", () => {
    const m = createCeremony(false)
    m.start(0)
    m.tick(1)
    m.cancel()
    run(m, 1, 6)
    expect(m.tick(10).done).toBe(false)
  })
})

describe("ceremony — successive feeds", () => {
  test("re-starting mid-ceremony resets cleanly to the first phase", () => {
    const m = createCeremony(false)
    m.start(0)
    m.tick(2.5) // deep into nibble
    m.start(3)
    const s = m.tick(3.01)
    expect(s.phase).toBe("turn")
    // Old start time must not leak: a tick at the old clock's far future
    // only advances from the new start.
    const later = m.tick(3.5)
    expect(later.phase).not.toBe("idle")
  })

  test("restart then run to completion reports done once", () => {
    const m = createCeremony(false)
    m.start(0)
    m.tick(2)
    m.start(5)
    let doneCount = 0
    for (let t = 5; t <= 12; t += 0.05) {
      if (m.tick(t).done) doneCount++
    }
    expect(doneCount).toBe(1)
  })
})

describe("ceremony — reduced motion variant", () => {
  test("skips turn and travel entirely: in-place nibble at anchor", () => {
    const m = createCeremony(true)
    m.start(0)
    const s = m.tick(0.01)
    expect(s.phase).toBe("nibble")
    for (let t = 0.05; t <= 10; t += 0.05) {
      const st = m.tick(t)
      expect(st.phase === "nibble" || st.phase === "idle").toBe(true)
    }
  })

  test("still completes (reports done) and stays shorter than the walk", () => {
    const m = createCeremony(true)
    m.start(0)
    let total = Number.POSITIVE_INFINITY
    for (let t = 0; t <= 10; t += 0.05) {
      if (m.tick(t).done) {
        total = t
        break
      }
    }
    expect(total).toBeLessThan(4)
  })

  test("is still instantly cancellable mid-nibble", () => {
    const m = createCeremony(true)
    m.start(0)
    m.tick(0.5)
    m.cancel()
    expect(m.tick(0.51).phase).toBe("idle")
  })
})
