import { describe, expect, test } from "bun:test"
import { EffectLoop, HitStop } from "./staging-fx"

/** Deterministic clock + manual RAF pump so no real timers are involved. */
function makeClock() {
  let t = 0
  let pending: ((time: number) => void) | null = null
  return {
    now: () => t,
    advance(ms: number) {
      t += ms
    },
    schedule(cb: (time: number) => void): number {
      pending = cb
      return 7
    },
    cancel(id: number) {
      if (id === 7) pending = null
    },
    /** Run the pending frame (if any) exactly once. */
    frame() {
      const cb = pending
      pending = null
      cb?.(t)
    },
    hasPending: () => pending !== null,
  }
}

describe("HitStop", () => {
  test("below the threshold nothing freezes", () => {
    const clock = makeClock()
    const hs = new HitStop(clock.now)
    let hits = 0
    expect(hs.trigger(3, () => hits++)).toBe(false)
    expect(hs.active()).toBe(false)
    expect(hits).toBe(0)
  })

  test("undefined damage counts as zero (no freeze)", () => {
    const clock = makeClock()
    const hs = new HitStop(clock.now)
    expect(hs.trigger(undefined)).toBe(false)
  })

  test("at the threshold the frame freezes for HIT_STOP_MS and the punch fires", () => {
    const clock = makeClock()
    const hs = new HitStop(clock.now)
    let strength = 0
    expect(hs.trigger(4, (s) => (strength = s))).toBe(true)
    clock.advance(1)
    expect(hs.active()).toBe(true)
    expect(strength).toBeCloseTo(0.07) // 0.02 + 4/80
    clock.advance(88)
    expect(hs.active()).toBe(true)
    clock.advance(1)
    expect(hs.active()).toBe(false)
  })

  test("the camera punch strength caps at 0.09", () => {
    const clock = makeClock()
    const hs = new HitStop(clock.now)
    let strength = 0
    hs.trigger(100, (s) => (strength = s))
    expect(strength).toBe(0.09)
  })

  test("reset clears the freeze window", () => {
    const clock = makeClock()
    const hs = new HitStop(clock.now)
    hs.trigger(9)
    expect(hs.active()).toBe(true)
    hs.reset()
    expect(hs.active()).toBe(false)
  })
})

describe("EffectLoop", () => {
  test("the first add schedules the loop; late joiners do not re-kick it", () => {
    const clock = makeClock()
    const loop = new EffectLoop(
      () => false,
      clock.now,
      clock.schedule,
      clock.cancel,
    )
    loop.add(() => true)
    expect(clock.hasPending()).toBe(true)
    loop.add(() => true)
    // Only one pending frame despite two steps.
    clock.frame()
    expect(clock.hasPending()).toBe(true)
  })

  test("steps receive the frame delta; the loop keeps running while any step is alive", () => {
    const clock = makeClock()
    const loop = new EffectLoop(
      () => false,
      clock.now,
      clock.schedule,
      clock.cancel,
    )
    const dts: number[] = []
    loop.add((dt) => {
      dts.push(dt)
      return true
    })
    clock.advance(50)
    clock.frame()
    clock.advance(20)
    clock.frame()
    expect(dts).toEqual([50, 20])
    expect(clock.hasPending()).toBe(true)
  })

  test("an all-idle frame cancels the loop and no further frames run", () => {
    const clock = makeClock()
    const loop = new EffectLoop(
      () => false,
      clock.now,
      clock.schedule,
      clock.cancel,
    )
    const alive = false
    loop.add(() => alive)
    clock.frame()
    expect(clock.hasPending()).toBe(false)
    clock.advance(100)
    clock.frame()
    expect(clock.hasPending()).toBe(false)
  })

  test("dt is zero during a freeze and last still advances (no post-freeze spike)", () => {
    const clock = makeClock()
    const frozen = { on: false }
    const loop = new EffectLoop(
      () => frozen.on,
      clock.now,
      clock.schedule,
      clock.cancel,
    )
    const dts: number[] = []
    loop.add((dt) => {
      dts.push(dt)
      return true
    })
    clock.advance(16)
    frozen.on = true
    clock.frame()
    clock.advance(30) // freeze span passes (30 < the 100ms clamp)
    frozen.on = false
    clock.frame()
    // First frame: frozen -> 0. Second frame: only the one-frame delta
    // (if `last` had not advanced during the freeze this would clamp to 100).
    expect(dts[0]).toBe(0)
    expect(dts[1]).toBe(30)
  })

  test("dt clamps at 100ms", () => {
    const clock = makeClock()
    const loop = new EffectLoop(
      () => false,
      clock.now,
      clock.schedule,
      clock.cancel,
    )
    let seen = 0
    loop.add((dt) => {
      seen = dt
      return true
    })
    clock.advance(500)
    clock.frame()
    expect(seen).toBe(100)
  })

  test("a zero delta falls back to ~one frame (16.7ms)", () => {
    const clock = makeClock()
    const loop = new EffectLoop(
      () => false,
      clock.now,
      clock.schedule,
      clock.cancel,
    )
    let seen = 0
    loop.add((dt) => {
      seen = dt
      return true
    })
    clock.frame() // no time passed
    expect(seen).toBe(16.7)
  })

  test("stop() cancels the pending frame", () => {
    const clock = makeClock()
    const loop = new EffectLoop(
      () => false,
      clock.now,
      clock.schedule,
      clock.cancel,
    )
    loop.add(() => true)
    loop.stop()
    expect(clock.hasPending()).toBe(false)
    clock.advance(50)
    clock.frame() // must be a no-op
  })

  // Regression: the production defaults must stay callable. Passing
  // `requestAnimationFrame` by reference made the loop call it with the
  // loop as receiver, which throws "Illegal invocation" in a browser -
  // invisible to every other test here because they inject a fake.
  test("defaults to the global frame scheduler without losing its receiver", () => {
    const g = globalThis as unknown as {
      requestAnimationFrame: (cb: (t: number) => void) => number
      cancelAnimationFrame: (id: number) => void
    }
    const realRaf = g.requestAnimationFrame
    const realCancel = g.cancelAnimationFrame
    const queued: Array<(t: number) => void> = []
    const cancelled: number[] = []
    // A real `window.requestAnimationFrame` throws "Illegal invocation"
    // when reached through a foreign object (`loop.schedule(...)` passing
    // the loop as receiver), while a plain unqualified call is fine. The
    // stub mirrors that split. An arrow stub cannot: it ignores the
    // receiver entirely, which is how the by-reference default slipped
    // through every other test here.
    g.requestAnimationFrame = function rafStub(
      this: unknown,
      cb: (t: number) => void,
    ) {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError("Illegal invocation")
      }
      queued.push(cb)
      return queued.length
    } as unknown as typeof g.requestAnimationFrame
    g.cancelAnimationFrame = function cancelStub(this: unknown, id: number) {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError("Illegal invocation")
      }
      cancelled.push(id)
    } as unknown as typeof g.cancelAnimationFrame
    try {
      const loop = new EffectLoop()
      loop.add(() => true)
      expect(queued.length).toBe(1)
      loop.stop()
      expect(cancelled.length).toBe(1)
    } finally {
      g.requestAnimationFrame = realRaf
      g.cancelAnimationFrame = realCancel
    }
  })
})
