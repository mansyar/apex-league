import { describe, expect, test } from "bun:test"
import { STREAM_PHASE, type StreamFrame } from "@apex/sim"
import { CONTACT_MARGIN_MM, poseAdjust, poseForFrame } from "./choreo-poses"
import { contactOffset, createPoseTracker } from "./pose-track"

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

  test("a pinned frame reports a full recoil (Phase 2 owns the pin)", () => {
    const state = poseForFrame(frame({ pinned: true }))
    expect(state.pose).toBe("recoil")
    expect(state.intensity).toBe(1)
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

describe("poseForFrame — dodge roll (FR-3)", () => {
  test("a fast free step rolls along its own travel", () => {
    const state = poseForFrame(frame(), { travelMm: 70 })
    expect(state.pose).toBe("roll")
    expect(state.intensity).toBeCloseTo(70 / 120)
  })

  test("a walk never trips the roll", () => {
    expect(poseForFrame(frame(), { travelMm: 36 }).pose).toBe("none")
    expect(poseForFrame(frame(), { travelMm: 49 }).pose).toBe("none")
  })

  test("a roll beats the startup crouch (travel is the louder signal)", () => {
    const state = poseForFrame(
      frame({ phase: STREAM_PHASE.startup, phaseT: 200 }),
      { travelMm: 70 },
    )
    expect(state.pose).toBe("roll")
  })
})

describe("poseForFrame — knockback recoil (FR-4)", () => {
  test("a sliding hitstun recoils instead of flinching", () => {
    const state = poseForFrame(frame({ hp: 88, hitstunMs: 100 }), {
      travelMm: 40,
    })
    expect(state.pose).toBe("recoil")
  })

  test("a still hitstun still flinches (no slide, no recoil)", () => {
    const state = poseForFrame(frame({ hp: 88, hitstunMs: 100 }), {
      travelMm: 3,
    })
    expect(state.pose).toBe("flinch")
  })

  test("a heavy body's short slide still recoils at the floor", () => {
    const state = poseForFrame(frame({ hp: 88, hitstunMs: 100 }), {
      travelMm: 16,
    })
    expect(state.pose).toBe("recoil")
    expect(state.intensity).toBeGreaterThanOrEqual(0.35)
  })

  test("a crumple outranks a pinned slide (the break owns the body)", () => {
    const state = poseForFrame(frame({ hp: 80, hitstunMs: 400, pinned: true }))
    expect(state.pose).toBe("crumple")
  })
})

describe("poseForFrame — contact press (FR-7)", () => {
  // Default pair: 220 + 220 + margin.
  const contact = 440 + CONTACT_MARGIN_MM

  test("bodies at touch press with full intensity", () => {
    const state = poseForFrame(frame(), {
      travelMm: 0,
      gapMm: 440,
      contactMm: contact,
    })
    expect(state.pose).toBe("press")
    expect(state.intensity).toBe(1)
  })

  test("the press fades to half at the contact edge and releases beyond", () => {
    const edge = poseForFrame(frame(), {
      travelMm: 0,
      gapMm: contact - 1,
      contactMm: contact,
    })
    expect(edge.pose).toBe("press")
    expect(edge.intensity).toBeGreaterThan(0.5)
    expect(edge.intensity).toBeLessThan(1)
    expect(
      poseForFrame(frame(), {
        travelMm: 0,
        gapMm: contact + 10,
        contactMm: contact,
      }).pose,
    ).toBe("none")
  })

  test("a roll beats the press (fast travel through the clinch)", () => {
    const state = poseForFrame(frame(), {
      travelMm: 70,
      gapMm: 400,
      contactMm: contact,
    })
    expect(state.pose).toBe("roll")
  })

  test("a hit beats the press (the blow owns the clinch)", () => {
    const state = poseForFrame(frame({ hp: 88, hitstunMs: 60 }), {
      travelMm: 0,
      gapMm: 400,
      contactMm: contact,
    })
    expect(state.pose).toBe("flinch")
  })

  test("the press beats the startup crouch (contact is louder)", () => {
    const state = poseForFrame(
      frame({ phase: STREAM_PHASE.startup, phaseT: 200 }),
      { travelMm: 0, gapMm: 400, contactMm: contact },
    )
    expect(state.pose).toBe("press")
  })
})

describe("createPoseTracker — roll, recoil and press across steps", () => {
  const contact = 440 + CONTACT_MARGIN_MM

  test("a dodge burst rolls for its travel and releases at rest", () => {
    const tracker = createPoseTracker()
    expect(tracker.update(10, frame({ x: 0 })).pose).toBe("none")
    expect(tracker.update(11, frame({ x: 70 })).pose).toBe("roll")
    expect(tracker.update(12, frame({ x: 140 })).pose).toBe("roll")
    expect(tracker.update(13, frame({ x: 140 })).pose).toBe("none")
  })

  test("a same-step repeat never flickers a roll", () => {
    const tracker = createPoseTracker()
    tracker.update(10, frame({ x: 0 }))
    expect(tracker.update(11, frame({ x: 70 })).pose).toBe("roll")
    expect(tracker.update(11, frame({ x: 70 })).pose).toBe("roll")
  })

  test("a knockback slide latches the recoil through the hitstun tail", () => {
    const tracker = createPoseTracker()
    expect(
      tracker.update(10, frame({ hp: 88, hitstunMs: 100, x: 0 })).pose,
    ).toBe("flinch")
    expect(
      tracker.update(11, frame({ hp: 88, hitstunMs: 80, x: 40 })).pose,
    ).toBe("recoil")
    // The slide halves below the trip wire; the tail stays a recoil.
    expect(
      tracker.update(12, frame({ hp: 88, hitstunMs: 60, x: 50 })).pose,
    ).toBe("recoil")
    expect(
      tracker.update(13, frame({ hp: 88, hitstunMs: 40, x: 55 })).pose,
    ).toBe("recoil")
    // Served: the pose releases instead of decaying into a flinch.
    expect(
      tracker.update(14, frame({ hp: 88, hitstunMs: 0, x: 56 })).pose,
    ).toBe("none")
  })

  test("a pinned step recoils at full intensity with no travel", () => {
    const tracker = createPoseTracker()
    const state = tracker.update(
      10,
      frame({ hp: 88, hitstunMs: 80, pinned: true }),
    )
    expect(state.pose).toBe("recoil")
    expect(state.intensity).toBe(1)
  })

  test("a clinch presses both sides symmetrically", () => {
    const home = createPoseTracker()
    const away = createPoseTracker()
    const homeFrame = frame({ x: -200 })
    const awayFrame = frame({ x: 200 })
    expect(home.update(10, homeFrame, awayFrame, contact).pose).toBe("press")
    expect(away.update(10, awayFrame, homeFrame, contact).pose).toBe("press")
  })

  test("a KO inside a roll wins and clears every latch", () => {
    const tracker = createPoseTracker()
    tracker.update(11, frame({ x: 70 }))
    expect(tracker.update(12, frame({ hp: 0, x: 140 })).pose).toBe("ko")
    expect(tracker.update(13, frame({ hp: 0, x: 140 })).pose).toBe("ko")
  })

  test("reset forgets travel, latches and the same-step cache", () => {
    const tracker = createPoseTracker()
    tracker.update(11, frame({ x: 70 }))
    tracker.reset()
    expect(tracker.update(12, frame({ x: 140 })).pose).toBe("none")
  })
})

describe("contactOffset — the clinch nudge", () => {
  test("clear bodies hold still", () => {
    expect(contactOffset(0, 0, 500, 0, 480)).toEqual({
      x0: 0,
      z0: 0,
      x1: 0,
      z1: 0,
    })
  })

  test("touching bodies split the overlap half each", () => {
    const nudge = contactOffset(-200, 0, 200, 0, 480)
    expect(nudge.x0).toBeCloseTo(-40)
    expect(nudge.x1).toBeCloseTo(40)
    expect(nudge.z0).toBeCloseTo(0)
    expect(nudge.z1).toBeCloseTo(0)
  })

  test("the push caps instead of shoving", () => {
    const nudge = contactOffset(-10, 0, 10, 0, 480)
    expect(Math.abs(nudge.x0)).toBeLessThanOrEqual(60)
    expect(nudge.x0).toBe(-nudge.x1)
  })

  test("coincident centres still get an axis", () => {
    const nudge = contactOffset(100, 50, 100, 50, 480)
    expect(nudge.x0).toBeLessThan(0)
    expect(nudge.x1).toBeGreaterThan(0)
  })

  test("the nudge is symmetric and deterministic", () => {
    const a = contactOffset(-150, 30, 250, -40, 480)
    const b = contactOffset(-150, 30, 250, -40, 480)
    expect(a).toEqual(b)
    expect(a.x0).toBeCloseTo(-a.x1)
    expect(a.z0).toBeCloseTo(-a.z1)
  })
})

describe("poseAdjust — roll, recoil and press signatures", () => {
  test("a roll tucks forward deeper than any crouch, without recoiling", () => {
    const roll = poseAdjust("roll", 1, 1, 1)
    const crouch = poseAdjust("crouch", 1, 1, 1)
    expect(roll.dx).toBe(0)
    expect(roll.dy).toBeLessThan(0)
    expect(roll.pitch).toBeGreaterThan(crouch.pitch)
    expect(roll.squash).toBeGreaterThan(crouch.squash)
  })

  test("a recoil shoves back harder than any flinch, feet planted", () => {
    const recoil = poseAdjust("recoil", 1, 1, 1)
    const flinch = poseAdjust("flinch", 1, 1, 1)
    expect(recoil.dx).toBeGreaterThan(flinch.dx)
    expect(recoil.pitch).toBeLessThan(flinch.pitch)
    expect(recoil.squash).toBeGreaterThan(flinch.squash)
    expect(poseAdjust("recoil", 1, -1, 1).dx).toBeCloseTo(-recoil.dx)
  })

  test("a press leans into the foe with squash and no recoil", () => {
    const press = poseAdjust("press", 1, 1, 1)
    expect(press.dx).toBe(0)
    expect(press.dy).toBeLessThan(0)
    expect(press.pitch).toBeGreaterThan(0)
    expect(press.squash).toBeGreaterThan(0)
  })

  test("the new poses scale with intensity and die under reduced motion", () => {
    for (const pose of ["roll", "recoil", "press"] as const) {
      const full = poseAdjust(pose, 1, 1, 1)
      const half = poseAdjust(pose, 0.5, 1, 1)
      expect(half.pitch).toBeCloseTo(full.pitch / 2)
      expect(half.squash).toBeCloseTo(full.squash / 2)
      expect(poseAdjust(pose, 1, 1, 0)).toEqual(poseAdjust("none", 1, 1, 1))
    }
  })
})

describe("poseForFrame — the dodge flag outranks travel (R1/F1)", () => {
  test("a flagged dodge rolls even when its travel reads like a walk", () => {
    const state = poseForFrame(frame(), { travelMm: 20, dodgeBurst: true })
    expect(state.pose).toBe("roll")
  })

  test("a flagged dodge rolls from rest (the burst is the signal)", () => {
    const state = poseForFrame(frame(), { travelMm: 0, dodgeBurst: true })
    expect(state.pose).toBe("roll")
    expect(state.intensity).toBe(0)
  })

  test("an unflagged step in the roll band reads as footwork, not a roll", () => {
    expect(
      poseForFrame(frame(), { travelMm: 70, dodgeBurst: false }).pose,
    ).toBe("none")
  })

  test("a legacy frame without the flag keeps the travel threshold", () => {
    expect(poseForFrame(frame(), { travelMm: 70 }).pose).toBe("roll")
    expect(poseForFrame(frame(), { travelMm: 20 }).pose).toBe("none")
  })
})

describe("createPoseTracker — the dodge flag and lateral (R1/F1, R1/F3)", () => {
  test("a flagged sidestep rolls below the travel threshold", () => {
    const tracker = createPoseTracker()
    expect(tracker.update(10, frame({ x: 0 })).pose).toBe("none")
    expect(tracker.update(11, frame({ x: 30, dodgeBurst: true })).pose).toBe(
      "roll",
    )
    expect(tracker.update(12, frame({ x: 30 })).pose).toBe("none")
  })

  test("an unflagged slip in the roll band never rolls", () => {
    const tracker = createPoseTracker()
    tracker.update(10, frame({ x: 0 }))
    expect(tracker.update(11, frame({ x: 70, dodgeBurst: false })).pose).toBe(
      "none",
    )
  })

  test("a sideways dodge carries its lateral, a forward one carries none", () => {
    const tracker = createPoseTracker()
    tracker.update(10, frame({ x: 0, z: 0 }))
    const sideways = tracker.update(
      11,
      frame({ x: 70, z: 0, dodgeBurst: true }),
    )
    expect(sideways.pose).toBe("roll")
    expect(sideways.lateral).toBeCloseTo(1)
    const forward = tracker.update(
      12,
      frame({ x: 70, z: 70, dodgeBurst: true }),
    )
    expect(forward.pose).toBe("roll")
    expect(forward.lateral ?? 0).toBeCloseTo(0)
  })
})

describe("poseAdjust — the roll tucks along its travel (R1/F3)", () => {
  test("a sideways dodge tips the tuck into a roll", () => {
    const right = poseAdjust("roll", 1, 1, 1, 1)
    expect(right.pitch).toBeCloseTo(0)
    expect(right.roll).toBeCloseTo(0.3)
    const left = poseAdjust("roll", 1, 1, 1, -1)
    expect(left.pitch).toBeCloseTo(0)
    expect(left.roll).toBeCloseTo(-right.roll)
  })

  test("a forward dodge keeps the straight-ahead tuck", () => {
    expect(poseAdjust("roll", 1, 1, 1)).toEqual(poseAdjust("roll", 1, 1, 1, 0))
    const half = poseAdjust("roll", 1, 1, 1, 0.5)
    expect(half.pitch).toBeCloseTo(0.15)
    expect(half.roll).toBeCloseTo(0.15)
  })

  test("other poses ignore the lateral", () => {
    expect(poseAdjust("flinch", 1, 1, 1, 1)).toEqual(
      poseAdjust("flinch", 1, 1, 1),
    )
  })
})
