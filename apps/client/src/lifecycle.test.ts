import { describe, expect, test } from "bun:test"
import {
  initialRuntimeState,
  type RuntimeEvent,
  type RuntimeState,
  runtimeState,
} from "./lifecycle"

/** Fold a sequence of events from boot, the way the client will. */
const apply = (...events: RuntimeEvent[]): RuntimeState =>
  events.reduce(runtimeState, initialRuntimeState())

const hidden: RuntimeEvent = { kind: "visibility", status: "hidden" }
const visible: RuntimeEvent = { kind: "visibility", status: "visible" }
const unavailable: RuntimeEvent = { kind: "graphics", status: "unavailable" }
const lost: RuntimeEvent = { kind: "graphics", status: "lost" }
const restored: RuntimeEvent = { kind: "graphics", status: "restored" }
const frameError: RuntimeEvent = { kind: "graphics", status: "frame_error" }

const ALL_EVENTS: RuntimeEvent[] = [
  hidden,
  visible,
  unavailable,
  lost,
  restored,
  frameError,
]

describe("initialRuntimeState", () => {
  test("boots running with the game surface — the app expects to work", () => {
    expect(initialRuntimeState().renderLoop).toBe("running")
    expect(initialRuntimeState().surface).toBe("game")
  })

  test("starts visible with a healthy context and nothing pending", () => {
    const state = initialRuntimeState()
    expect(state.hidden).toBe(false)
    expect(state.graphics).toBe("ok")
    expect(state.pendingRestore).toBe(false)
  })
})

describe("visibility", () => {
  test("a hidden tab pauses the loop but keeps the game surface", () => {
    const state = apply(hidden)
    expect(state.renderLoop).toBe("paused")
    expect(state.surface).toBe("game")
    expect(state.hidden).toBe(true)
  })

  test("returning to a visible tab resumes the loop", () => {
    const state = apply(hidden, visible)
    expect(state.renderLoop).toBe("running")
    expect(state.surface).toBe("game")
    expect(state.hidden).toBe(false)
  })

  test("a visible event while already running changes nothing", () => {
    expect(apply(visible)).toEqual(initialRuntimeState())
  })

  test("repeated hidden events stay paused", () => {
    expect(apply(hidden, hidden)).toEqual(apply(hidden))
  })
})

describe("graphics failure", () => {
  test("unavailable at boot raises the plate and stops the loop", () => {
    const state = apply(unavailable)
    expect(state.surface).toBe("plate")
    expect(state.renderLoop).toBe("paused")
  })

  test("a lost context raises the plate even though the tab is visible", () => {
    const state = apply(lost)
    expect(state.surface).toBe("plate")
    expect(state.hidden).toBe(false)
  })

  test("the plate outranks visibility — hidden plus lost is still a plate", () => {
    expect(apply(hidden, lost).surface).toBe("plate")
    expect(apply(lost, hidden).surface).toBe("plate")
  })

  test("a failed frame raises the plate", () => {
    expect(apply(frameError).surface).toBe("plate")
  })

  test("the reason is kept for the plate's copy", () => {
    expect(apply(unavailable).graphics).toBe("unavailable")
    expect(apply(lost).graphics).toBe("lost")
    expect(apply(lost, frameError).graphics).toBe("frame_error")
  })

  test("a failed frame after a loss still resolves to the plate", () => {
    const state = apply(lost, frameError)
    expect(state.surface).toBe("plate")
    expect(state.renderLoop).toBe("paused")
  })

  test("the loop never spins behind a plate", () => {
    for (const event of [unavailable, lost, frameError]) {
      expect(apply(event).renderLoop).toBe("paused")
    }
  })
})

describe("restore", () => {
  test("a restore on a visible tab clears the plate and resumes", () => {
    const state = apply(lost, restored)
    expect(state.surface).toBe("game")
    expect(state.renderLoop).toBe("running")
    expect(state.graphics).toBe("ok")
  })

  test("a restore while hidden holds the plate until the tab is seen", () => {
    const state = apply(hidden, lost, restored)
    expect(state.surface).toBe("plate")
    expect(state.renderLoop).toBe("paused")
    expect(state.pendingRestore).toBe(true)
  })

  test("...and the held restore clears on the next visible event", () => {
    const state = apply(hidden, lost, restored, visible)
    expect(state.surface).toBe("game")
    expect(state.renderLoop).toBe("running")
    expect(state.pendingRestore).toBe(false)
  })

  test("a fresh failure after a pending restore wins over it", () => {
    const state = apply(hidden, lost, restored, frameError, visible)
    expect(state.surface).toBe("plate")
    expect(state.pendingRestore).toBe(false)
  })
})

describe("idempotence", () => {
  test("applying any event twice matches applying it once", () => {
    const origins = [
      initialRuntimeState(),
      apply(hidden),
      apply(lost),
      apply(hidden, lost),
      apply(hidden, lost, restored),
    ]
    for (const origin of origins) {
      for (const event of ALL_EVENTS) {
        const once = runtimeState(origin, event)
        expect(runtimeState(once, event)).toEqual(once)
      }
    }
  })
})
