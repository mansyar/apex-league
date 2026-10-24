import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import { type BodyProfile, DEFAULT_PROFILE } from "../choreo"
import type { DriveFighter } from "../fighter-driver"
import {
  applyPosture,
  approachTarget,
  dodgeShift,
  heavyHit,
  judgeHop,
  koFall,
  meleeContact,
  reelWobble,
  softFall,
  spotOf,
  strikePose,
  strikeReach,
  weave,
} from "./pure"

describe("spotOf", () => {
  const o = { name: "Drake", key: "left" }
  const r = { name: "Ox", key: "right" }

  test("maps an empty actor key to the rival as actor", () => {
    const s = spotOf("", o, r)
    expect(s.actor).toBe(r)
    expect(s.target).toBe(o)
  })

  test("matches by stable key when present", () => {
    const s = spotOf("right", o, r)
    expect(s.actor).toBe(r)
    expect(s.target).toBe(o)
  })

  test("matches by name when keys are absent", () => {
    const noKeys = { name: "Drake" }
    const noKeysR = { name: "Ox" }
    const s = spotOf("Ox", noKeys, noKeysR)
    expect(s.actor).toBe(noKeysR)
    expect(s.target).toBe(noKeys)
  })

  test("a mirror match never maps both fighters to the same side", () => {
    const a = { name: "Drake", key: "left" }
    const b = { name: "Drake", key: "right" }
    const s = spotOf("right", a, b)
    expect(s.actor).toBe(b)
    expect(s.target).toBe(a)
  })
})

describe("strikeReach", () => {
  test("scales with damage", () => {
    expect(strikeReach(4)).toBeCloseTo(0.5)
  })

  test("clamps into [0.25, 0.9]", () => {
    expect(strikeReach(0)).toBeCloseTo(0.25)
    expect(strikeReach(undefined)).toBeCloseTo(0.25)
    expect(strikeReach(40)).toBeCloseTo(0.9)
  })
})

describe("heavyHit", () => {
  test("stagger and knockback are heavy; the rest are not", () => {
    expect(heavyHit({ reaction: "stagger" })).toBe(true)
    expect(heavyHit({ reaction: "knockback" })).toBe(true)
    expect(heavyHit({ reaction: "glance" })).toBe(false)
    expect(heavyHit({})).toBe(false)
  })
})

describe("weave", () => {
  test("alternates lanes by tick parity at 0.55", () => {
    expect(weave({ tick: 0 })).toBeCloseTo(0.55)
    expect(weave({ tick: 3 })).toBeCloseTo(-0.55)
  })
})

describe("approachTarget", () => {
  test("parks the actor a stance gap short of the target plus weave", () => {
    const t = approachTarget({ x: 1, z: 0.5 }, -1, 0.55)
    expect(t.x).toBeCloseTo(1 - 2.1)
    expect(t.z).toBeCloseTo(0.5 + 0.55)
  })
})

describe("meleeContact", () => {
  test("stops just short of a body overlap on the approach line", () => {
    // Straight shot along +x, 4 units apart, gap 1.8 -> contact at 2.2.
    const c = meleeContact({ x: 0, z: 0 }, { x: 4, z: 0 }, 0)
    expect(c.x).toBeCloseTo(2.2)
    expect(c.z).toBeCloseTo(0)
    expect(c.dirX).toBeCloseTo(1)
    expect(c.dirZ).toBeCloseTo(0)
  })

  test("tilts the line by the weave so no two hits share a lane", () => {
    // A diagonal approach: the weave tilts the unit direction toward
    // its lane (a purely axial line is unchanged - the tilt is a no-op
    // there, exactly like the original vector math).
    const flat = meleeContact({ x: 0, z: 0 }, { x: 4, z: 3 }, 0)
    const tilted = meleeContact({ x: 0, z: 0 }, { x: 4, z: 3 }, 0.55)
    expect(tilted.dirX).toBeGreaterThan(flat.dirX)
    expect(tilted.dirZ).toBeLessThan(flat.dirZ)
    expect(tilted.dirZ).toBeGreaterThan(0)
  })

  test("never closes closer than the 0.45 minimum", () => {
    const c = meleeContact({ x: 0, z: 0 }, { x: 1, z: 0 }, 0)
    expect(c.x).toBeCloseTo(0.45)
  })
})

describe("dodgeShift", () => {
  test("dashes off the lane on the fighter's away side", () => {
    const s = dodgeShift(1, 0.6, "left")
    expect(s.dx).toBeCloseTo(0.6)
    expect(s.dz).toBeCloseTo(0.45)
  })

  test("right weaves the other way", () => {
    const s = dodgeShift(-1, 0.6, "right")
    expect(s.dx).toBeCloseTo(-0.6)
    expect(s.dz).toBeCloseTo(-0.45)
  })
})

describe("koFall", () => {
  test("windup phase only pitches the body back", () => {
    const w = koFall(0.2)
    expect(w.fall).toBe(0)
    expect(w.pitch).toBeLessThan(0)
    expect(w.thud).toBe(false)
  })

  test("collapse phase eases the fall and thuds once past 30%", () => {
    const early = koFall(0.5) // u ~ 0.23 -> not yet
    expect(early.thud).toBe(false)
    const late = koFall(0.8) // u ~ 0.69 -> thudded
    expect(late.thud).toBe(true)
    expect(late.fall).toBeGreaterThan(early.fall)
  })

  test("t=1 is fully fallen with residual pitch", () => {
    const end = koFall(1)
    expect(end.fall).toBe(1)
    expect(end.pitch).toBeCloseTo(-0.32 * 0.6)
  })
})

describe("softFall", () => {
  test("eases over the reel and thuds past 0.55", () => {
    expect(softFall(0.3, 1).thud).toBe(false)
    expect(softFall(0.6, 1).thud).toBe(true)
    expect(softFall(1, 1).fall).toBe(1)
  })
})

describe("reelWobble", () => {
  test("pitches back along the sine ramp and wobbles the roll", () => {
    const mid = reelWobble(0.5, 1, 0.2)
    expect(mid.pitch).toBeCloseTo(-0.2 * Math.sin(Math.PI / 4))
    expect(Math.abs(mid.roll)).toBeLessThanOrEqual(0.2 * 0.4 + 1e-9)
  })

  test("settles level at the reel end", () => {
    const end = reelWobble(1, 1, 0.2)
    expect(end.pitch).toBeCloseTo(-0.2)
  })
})

describe("judgeHop", () => {
  test("lifts the winner on a double hop arc", () => {
    const quarter = judgeHop(0.25)
    expect(quarter.lift).toBeCloseTo(0.35)
    expect(quarter.rising).toBe(true)
  })

  test("tracks the rising edge and the per-hop local time", () => {
    expect(judgeHop(0.1).rising).toBe(true)
    expect(judgeHop(0.6).rising).toBe(false)
    expect(judgeHop(0.75).localT).toBeCloseTo(0.5)
  })
})

/**
 * A stand-in fighter for the posture math: the driver slice the step
 * handlers actually touch (the pose channels plus the profile).
 */
function fakeFighter(profile: BodyProfile): DriveFighter {
  return {
    name: "Test",
    group: new THREE.Group(),
    stage: new THREE.Vector3(),
    smooth: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    squash: { s: 0, v: 0 },
    walkPhase: 0,
    phase: 0,
    baseScale: 1,
    profile,
    down: false,
    away: 1,
    fall: 0,
    lean: { pitch: 0, roll: 0 },
    baseColors: new Map(),
  }
}

/** The neutral profile with one knob overridden. */
function withKnob<K extends keyof BodyProfile>(
  knob: K,
  value: BodyProfile[K],
): BodyProfile {
  return { ...DEFAULT_PROFILE, [knob]: value }
}

describe("applyPosture — the profile-weighted posture curves", () => {
  const windup = { pitch: 0.2, roll: 0.1, rise: 0.15, coilX: 0.3 }
  const recoil = {
    pitchOut: 0.25,
    sweepX: [0.1, 0.2] as [number, number],
    riseOut: 0.12,
  }

  test("the neutral profile reproduces the unweighted curve", () => {
    const ao = fakeFighter(DEFAULT_PROFILE)
    applyPosture(windup, 0.5, ao, 1)
    // No `hold` on the posture: the pitch rides the full sine.
    const full = Math.sin(0.5 * Math.PI)
    expect(ao.lean.pitch).toBeCloseTo(0.2 * full)
    expect(ao.lean.roll).toBeCloseTo(0.1 * full)
    expect(ao.offset.y).toBeCloseTo(0.15 * full)
    expect(ao.offset.x).toBeCloseTo(-0.3 * 0.25)
  })

  test("windupMult scales the windup amplitudes by exactly its factor", () => {
    const plain = fakeFighter(DEFAULT_PROFILE)
    const heavy = fakeFighter(withKnob("windupMult", 1.5))
    applyPosture(windup, 0.4, plain, 1)
    applyPosture(windup, 0.4, heavy, 1)
    expect(heavy.lean.pitch).toBeCloseTo(plain.lean.pitch * 1.5)
    expect(heavy.lean.roll).toBeCloseTo(plain.lean.roll * 1.5)
    expect(heavy.offset.y).toBeCloseTo(plain.offset.y * 1.5)
    expect(heavy.offset.x).toBeCloseTo(plain.offset.x * 1.5)
  })

  test("the windup's phase fractions are identical under any multiplier", () => {
    const plain = fakeFighter(DEFAULT_PROFILE)
    const heavy = fakeFighter(withKnob("windupMult", 1.5))
    for (const w of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      applyPosture(windup, w, plain, 1)
      applyPosture(windup, w, heavy, 1)
      // The ratio stays the factor at every point of the curve: the
      // multiplier scales the amplitude, never the timing.
      expect(heavy.lean.pitch / plain.lean.pitch).toBeCloseTo(1.5)
    }
  })

  test("recoilMult scales the recoil amplitudes by exactly its factor", () => {
    const plain = fakeFighter(DEFAULT_PROFILE)
    const heavy = fakeFighter(withKnob("recoilMult", 1.25))
    applyPosture(recoil, 0.6, plain, 1)
    applyPosture(recoil, 0.6, heavy, 1)
    const full = Math.sin(0.6 * Math.PI)
    expect(heavy.lean.pitch).toBeCloseTo(plain.lean.pitch * 1.25)
    expect(heavy.offset.x).toBeCloseTo(plain.offset.x * 1.25)
    expect(heavy.offset.y).toBeCloseTo(plain.offset.y * 1.25)
    // The underlying curve is untouched: base * full * multiplier.
    expect(heavy.lean.pitch).toBeCloseTo(0.25 * full * 1.25)
  })

  test("the recoil's phase fractions are identical under any multiplier", () => {
    const plain = fakeFighter(DEFAULT_PROFILE)
    const heavy = fakeFighter(withKnob("recoilMult", 0.6))
    for (const w of [0.2, 0.4, 0.6, 0.8]) {
      applyPosture(recoil, w, plain, 1)
      applyPosture(recoil, w, heavy, 1)
      expect(heavy.offset.y / plain.offset.y).toBeCloseTo(0.6)
    }
  })

  test("the windup and recoil weights do not cross over", () => {
    const ao = fakeFighter(withKnob("windupMult", 1.5))
    // A windup-only posture never reads the recoil weight.
    applyPosture(windup, 0.5, ao, 1)
    expect(ao.lean.pitch).toBeCloseTo(0.2 * Math.sin(0.5 * Math.PI) * 1.5)
  })
})

describe("strikePose — the profile-weighted strike body", () => {
  test("the neutral profile reproduces the unweighted strike", () => {
    const pose = strikePose("windup", 0.5, 2, 1)
    expect(pose.along).toBeCloseTo(-0.22 * Math.sin(0.5 * Math.PI))
    expect(pose.y).toBeCloseTo(-0.05 * Math.sin(0.5 * Math.PI))
    expect(pose.roll).toBeCloseTo(0.05 * Math.sin(0.5 * Math.PI))
  })

  test("strikeMult scales the strike amplitudes proportionally", () => {
    const plain = strikePose("windup", 0.5, 2, 1)
    const heavy = strikePose("windup", 0.5, 2, 1.5)
    expect(heavy.along).toBeCloseTo(plain.along * 1.5)
    expect(heavy.y).toBeCloseTo((plain.y ?? 0) * 1.5)
    expect(heavy.roll).toBeCloseTo((plain.roll ?? 0) * 1.5)
  })

  test("the contact beat's lean and roll scale with the strike weight", () => {
    const plain = strikePose("contact", 0.5, 2, 1)
    const heavy = strikePose("contact", 0.5, 2, 1.4)
    expect(heavy.pitch).toBeCloseTo((plain.pitch ?? 0) * 1.4)
    expect(heavy.roll).toBeCloseTo((plain.roll ?? 0) * 1.4)
  })

  test("the arrival point never moves with the strike weight", () => {
    // The travel to the contact point is a distance, not an amplitude:
    // a heavy body coils deeper but still lands on the same spot.
    const plain = strikePose("contact", 1, 2, 1)
    const heavy = strikePose("contact", 1, 2, 1.6)
    expect(plain.along).toBeCloseTo(2)
    expect(heavy.along).toBeCloseTo(2)
  })

  test("the recovery settles back to the stance over the same curve", () => {
    const plain = strikePose("recovery", 0.5, 2, 1)
    const heavy = strikePose("recovery", 0.5, 2, 1.3)
    expect(heavy.along).toBeCloseTo(plain.along)
    expect(heavy.pitch).toBeCloseTo((plain.pitch ?? 0) * 1.3)
  })

  test("the commit impulse only fires past the windup", () => {
    expect(strikePose("contact", 0.2, 2, 1).impulse).toBeUndefined()
    expect(strikePose("contact", 0.5, 2, 1).impulse).toBeCloseTo(-0.28)
  })

  test("the settle impulse is weighted and only lands on a hit", () => {
    expect(strikePose("recovery", 0.8, 2, 1, true).impulse).toBeCloseTo(0.12)
    expect(strikePose("recovery", 0.8, 2, 1.5, true).impulse).toBeCloseTo(0.18)
    expect(strikePose("recovery", 0.8, 2, 1, false).impulse).toBeUndefined()
  })
})
