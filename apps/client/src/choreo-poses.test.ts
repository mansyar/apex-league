import { describe, expect, test } from "bun:test"
import { STREAM_PHASE, type StreamFrame } from "@apex/sim"
import { createPoseTracker, poseAdjust, poseForFrame } from "./choreo-poses"

/** A readable frame with everything unset; each test names what it needs. */
function frame(over: Partial<StreamFrame> = {}): StreamFrame {
  return {
    x: 0,
    z: 0,
    facingX: 0,
    facingZ: 1000,
    phase: STREAM_PHASE.none,
    phaseT: 0,
    hp: 100,
    hitstunMs: 0,
    pinned: false,
    ...over,
  }
}

describe("poseForFrame — one event kind, one pose (FR-10)", () => {
  test("an idle frame maps to none", () => {
    const state = poseForFrame(frame())
    expect(state.pose).toBe("none")
    expect(state.intensity).toBe(0)
  })

  test("a startup frame maps to a crouch that deepens with progress", () => {
    const early = poseForFrame(
      frame({ phase: STREAM_PHASE.startup, phaseT: 20 }),
    )
    const late = poseForFrame(
      frame({ phase: STREAM_PHASE.startup, phaseT: 220 }),
    )
    expect(early.pose).toBe("crouch")
    expect(late.pose).toBe("crouch")
    expect(late.intensity).toBeGreaterThan(early.intensity)
    expect(early.intensity).toBeCloseTo(20 / 255)
  })

  test("an active frame releases the crouch", () => {
    const state = poseForFrame(
      frame({ phase: STREAM_PHASE.active, phaseT: 120 }),
    )
    expect(state.pose).toBe("none")
  })

  test("a recovery frame maps to none", () => {
    const state = poseForFrame(
      frame({ phase: STREAM_PHASE.recovery, phaseT: 200 }),
    )
    expect(state.pose).toBe("none")
  })

  test("a landed hit maps to a flinch at full intensity", () => {
    const state = poseForFrame(frame({ hp: 88, hitstunMs: 100 }))
    expect(state.pose).toBe("flinch")
    expect(state.intensity).toBeCloseTo(1)
  })

  test("a flinch fades as the hitstun window is served", () => {
    const fresh = poseForFrame(frame({ hp: 88, hitstunMs: 100 }))
    const spent = poseForFrame(frame({ hp: 88, hitstunMs: 40 }))
    expect(spent.pose).toBe("flinch")
    expect(spent.intensity).toBeCloseTo(0.4)
    expect(spent.intensity).toBeLessThan(fresh.intensity)
  })

  test("a stun with no damage still flinches (hitstun is the signal)", () => {
    const state = poseForFrame(frame({ hp: 100, hitstunMs: 60 }))
    expect(state.pose).toBe("flinch")
    expect(state.intensity).toBeCloseTo(0.6)
  })

  test("a break-length hitstun maps to a crumple, not a flinch", () => {
    const state = poseForFrame(frame({ hp: 80, hitstunMs: 400 }))
    expect(state.pose).toBe("crumple")
    expect(state.intensity).toBe(1)
  })

  test("a downed body maps to ko even with hitstun and startup set", () => {
    const state = poseForFrame(
      frame({
        hp: 0,
        hitstunMs: 100,
        phase: STREAM_PHASE.startup,
        phaseT: 200,
      }),
    )
    expect(state.pose).toBe("ko")
  })

  test("a pinned-but-free frame maps to none (Phase 2 owns the pin)", () => {
    const state = poseForFrame(frame({ pinned: true }))
    expect(state.pose).toBe("none")
  })

  test("a hit during startup flinches instead of crouching", () => {
    const state = poseForFrame(
      frame({ phase: STREAM_PHASE.startup, phaseT: 200, hitstunMs: 80 }),
    )
    expect(state.pose).toBe("flinch")
  })

  test("a break during startup crumples instead of crouching", () => {
    const state = poseForFrame(
      frame({ phase: STREAM_PHASE.startup, phaseT: 200, hitstunMs: 400 }),
    )
    expect(state.pose).toBe("crumple")
  })
})

describe("createPoseTracker — the crumple holds until the break ends", () => {
  test("a plain hit flinches for its window and then releases", () => {
    const tracker = createPoseTracker()
    expect(tracker.update(10, frame({ hp: 88, hitstunMs: 100 })).pose).toBe(
      "flinch",
    )
    expect(tracker.update(11, frame({ hp: 88, hitstunMs: 80 })).pose).toBe(
      "flinch",
    )
    expect(tracker.update(15, frame({ hp: 88, hitstunMs: 0 })).pose).toBe(
      "none",
    )
  })

  test("a break holds the crumple past the hitstun tail", () => {
    const tracker = createPoseTracker()
    // The blow lands: a 400 ms hitstun opens the 600 ms break window.
    expect(tracker.update(50, frame({ hp: 80, hitstunMs: 400 })).pose).toBe(
      "crumple",
    )
    // Twenty steps later the hitstun is down to plain-hit length — still a
    // crumple, never a flinch.
    expect(tracker.update(70, frame({ hp: 80, hitstunMs: 80 })).pose).toBe(
      "crumple",
    )
    // The hitstun is gone but the break window is still open.
    expect(tracker.update(75, frame({ hp: 80, hitstunMs: 0 })).pose).toBe(
      "crumple",
    )
    // Thirty steps after the blow the window ends and the pose releases.
    expect(tracker.update(80, frame({ hp: 80, hitstunMs: 0 })).pose).toBe(
      "none",
    )
  })

  test("a second break-length hit inside the hold extends it", () => {
    const tracker = createPoseTracker()
    tracker.update(50, frame({ hp: 80, hitstunMs: 400 }))
    tracker.update(60, frame({ hp: 70, hitstunMs: 400 }))
    expect(tracker.update(85, frame({ hp: 70, hitstunMs: 0 })).pose).toBe(
      "crumple",
    )
    expect(tracker.update(90, frame({ hp: 70, hitstunMs: 0 })).pose).toBe(
      "none",
    )
  })

  test("a KO inside the hold wins and clears the latch", () => {
    const tracker = createPoseTracker()
    tracker.update(50, frame({ hp: 80, hitstunMs: 400 }))
    expect(tracker.update(55, frame({ hp: 0, hitstunMs: 100 })).pose).toBe("ko")
    expect(tracker.update(90, frame({ hp: 0, hitstunMs: 0 })).pose).toBe("ko")
  })

  test("reset forgets a latched break", () => {
    const tracker = createPoseTracker()
    tracker.update(50, frame({ hp: 80, hitstunMs: 400 }))
    tracker.reset()
    expect(tracker.update(55, frame({ hp: 80, hitstunMs: 0 })).pose).toBe(
      "none",
    )
  })

  test("a same-step repeat latches identically (slow frames never stack)", () => {
    const tracker = createPoseTracker()
    const hit = frame({ hp: 80, hitstunMs: 400 })
    expect(tracker.update(50, hit).pose).toBe("crumple")
    expect(tracker.update(50, hit).pose).toBe("crumple")
    expect(tracker.update(80, frame({ hp: 80, hitstunMs: 0 })).pose).toBe(
      "none",
    )
  })
})

describe("poseAdjust — one pose, one channel signature", () => {
  test("none and ko leave the composed pose alone", () => {
    expect(poseAdjust("none", 1, 1, 1)).toEqual({
      dx: 0,
      dy: 0,
      pitch: 0,
      roll: 0,
      squash: 0,
    })
    expect(poseAdjust("ko", 1, 1, 1)).toEqual(poseAdjust("none", 1, 1, 1))
  })

  test("zero intensity or zero life contributes nothing", () => {
    expect(poseAdjust("flinch", 0, 1, 1)).toEqual(poseAdjust("none", 1, 1, 1))
    expect(poseAdjust("crumple", 1, 1, 0)).toEqual(poseAdjust("none", 1, 1, 1))
  })

  test("a flinch recoils back and leans away from the blow", () => {
    const flinch = poseAdjust("flinch", 1, 1, 1)
    expect(flinch.dx).toBeGreaterThan(0)
    expect(flinch.pitch).toBeLessThan(0)
    // The recoil follows the fighter's away axis, both ways.
    expect(poseAdjust("flinch", 1, -1, 1).dx).toBeCloseTo(-flinch.dx)
  })

  test("a crumple folds deep and forward — the flinch's opposite", () => {
    const flinch = poseAdjust("flinch", 1, 1, 1)
    const crumple = poseAdjust("crumple", 1, 1, 1)
    expect(crumple.dy).toBeLessThan(flinch.dy)
    expect(crumple.pitch).toBeGreaterThan(0)
    expect(crumple.roll).toBeGreaterThan(0)
    expect(crumple.squash).toBeGreaterThan(flinch.squash)
  })

  test("a crouch dips and coils without recoiling", () => {
    const crouch = poseAdjust("crouch", 1, 1, 1)
    expect(crouch.dx).toBe(0)
    expect(crouch.dy).toBeLessThan(0)
    expect(crouch.pitch).toBeGreaterThan(0)
  })

  test("every contribution scales with intensity", () => {
    const full = poseAdjust("crumple", 1, 1, 1)
    const half = poseAdjust("crumple", 0.5, 1, 1)
    expect(half.dy).toBeCloseTo(full.dy / 2)
    expect(half.pitch).toBeCloseTo(full.pitch / 2)
    expect(half.roll).toBeCloseTo(full.roll / 2)
    expect(half.squash).toBeCloseTo(full.squash / 2)
  })
})
