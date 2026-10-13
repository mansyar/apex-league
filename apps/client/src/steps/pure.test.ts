import { describe, expect, test } from "bun:test"
import {
  approachTarget,
  dodgeShift,
  heavyHit,
  judgeHop,
  koFall,
  meleeContact,
  reelWobble,
  softFall,
  spotOf,
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
