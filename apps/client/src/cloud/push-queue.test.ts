/**
 * The debounced push queue (FR-5, AC-5): an autosave burst is one request.
 * The clock and the scheduler are injected, so these tests never sleep and
 * never touch a real timer.
 */
import { describe, expect, test } from "bun:test"
import { createPushQueue } from "./push-queue"

/** A hand-cranked clock plus the timers scheduled against it. */
function manualClock() {
  let at = 0
  let nextId = 1
  const timers = new Map<number, { due: number; fn: () => void }>()
  return {
    now: () => at,
    schedule: (fn: () => void, ms: number): number => {
      const id = nextId++
      timers.set(id, { due: at + ms, fn })
      return id
    },
    cancel: (handle: unknown): void => {
      timers.delete(handle as number)
    },
    /** Move time forward and run every timer that came due, in order. */
    advance(ms: number): void {
      at += ms
      for (const [id, timer] of [...timers]) {
        if (timer.due > at) continue
        timers.delete(id)
        timer.fn()
      }
    },
    pending: () => timers.size,
  }
}

describe("the cloud push queue", () => {
  test("a burst of autosave writes is exactly one push (AC-5)", () => {
    const clock = manualClock()
    const sent: string[] = []
    const queue = createPushQueue({
      send: (payload) => {
        sent.push(payload)
      },
      schedule: clock.schedule,
      cancel: clock.cancel,
      debounceMs: 2000,
      capMs: 10_000,
    })
    for (let write = 0; write < 5; write++) {
      queue.note(`payload-${write}`)
      clock.advance(300)
    }
    // Still inside the burst: nothing has left the client.
    expect(sent).toHaveLength(0)
    clock.advance(2000)
    expect(sent).toEqual(["payload-4"])
  })

  test("a write that never stops still ships at the cap", () => {
    const clock = manualClock()
    const sent: string[] = []
    const queue = createPushQueue({
      send: (payload) => {
        sent.push(payload)
      },
      schedule: clock.schedule,
      cancel: clock.cancel,
      debounceMs: 2000,
      capMs: 4000,
    })
    queue.note("a")
    clock.advance(1500)
    queue.note("b")
    clock.advance(1500)
    queue.note("c")
    expect(sent).toHaveLength(0)
    clock.advance(1500) // 4500 since the first write: past the cap
    queue.note("d")
    expect(sent).toEqual(["c"])
    clock.advance(2000)
    expect(sent).toEqual(["c", "d"])
  })

  test("a failed send does not wedge the queue", () => {
    const clock = manualClock()
    let attempts = 0
    const queue = createPushQueue({
      send: () => {
        attempts++
        throw new Error("offline")
      },
      schedule: clock.schedule,
      cancel: clock.cancel,
    })
    queue.note("first")
    clock.advance(2000)
    expect(attempts).toBe(1)
    queue.note("second")
    clock.advance(2000)
    expect(attempts).toBe(2)
  })

  test("nothing is scheduled until a write arrives", () => {
    const clock = manualClock()
    const queue = createPushQueue({
      send: () => {},
      schedule: clock.schedule,
      cancel: clock.cancel,
    })
    expect(clock.pending()).toBe(0)
    queue.note("payload")
    // A debounce timer and a cap timer: whichever fires first flushes.
    expect(clock.pending()).toBe(2)
  })
})
