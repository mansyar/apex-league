import { describe, expect, test } from "bun:test"
import {
  burstParticleScale,
  burstVelocity,
  decalPop,
  fadeOver,
  flashMix,
  pulseScale,
  shotArc,
  swayDrift,
  trailLag,
  wobbleZ,
} from "./fx-math"

describe("fx math", () => {
  test("golden: flash mix is full white at spawn, plain at the end", () => {
    expect(flashMix(0, 180)).toBe(1)
    expect(flashMix(180, 180)).toBe(0)
    expect(flashMix(45, 180)).toBeCloseTo(0.5625)
    expect(flashMix(400, 180)).toBe(0)
  })

  test("golden: shot arc lifts mid-flight by the element's arc factor", () => {
    expect(shotArc(0, undefined)).toBeCloseTo(0)
    expect(shotArc(0.5, undefined)).toBeCloseTo(0.55)
    expect(shotArc(0.5, 2)).toBeCloseTo(1.1)
    expect(shotArc(1, undefined)).toBeCloseTo(0)
  })

  test("golden: trail lags along the flight line, clamped to the start", () => {
    expect(trailLag(1, 0)).toBeCloseTo(0.91)
    expect(trailLag(0.5, 0)).toBeCloseTo(0.41)
    expect(trailLag(0.09, 0)).toBe(0)
    expect(trailLag(0.2, 3)).toBe(0)
  })

  test("golden: water wobble ripples sideways over time", () => {
    expect(wobbleZ(0, 0.3)).toBeCloseTo(0)
    expect(wobbleZ(50, 0.3)).toBeCloseTo(Math.sin(1) * 0.3)
    expect(wobbleZ(50, 0)).toBe(0)
  })

  test("golden: pulse breathes around unit scale", () => {
    expect(pulseScale(0, 0.2)).toBeCloseTo(1)
    expect(pulseScale(Math.PI / 2 / 0.045, 0.2)).toBeCloseTo(1.2, 3)
  })

  test("golden: burst velocity shape for the neutral scatter", () => {
    const v = burstVelocity({
      index: 0,
      puffs: 6,
      ring: false,
      j1: 0,
      j2: 0,
      j3: 0,
      j4: 0,
    })
    expect(v.vx).toBeCloseTo(1.4)
    expect(v.vy).toBeCloseTo(0.9)
    expect(v.vz).toBeCloseTo(0)
    expect(v.spin).toBeCloseTo(-0.01)
  })

  test("golden: ring bursts fly flat and wide; non-ring lob upward", () => {
    const v = burstVelocity({
      index: 3,
      puffs: 6,
      ring: true,
      j1: 0.5,
      j2: 0.5,
      j3: 0.5,
      j4: 1,
    })
    expect(v.vx).toBeCloseTo(Math.cos(Math.PI + 0.4) * 1.7)
    expect(v.vy).toBeCloseTo(0.275)
    expect(v.vz).toBeCloseTo(Math.sin(Math.PI + 0.4) * 1.7)
    expect(v.spin).toBeCloseTo(0.01)
  })

  test("golden: sway drifts laterally on a slow sine", () => {
    expect(swayDrift(0, 0, 1, 0.016)).toBeCloseTo(0)
    expect(swayDrift(250, Math.PI / 2, 1, 0.016)).toBeCloseTo(
      Math.sin(1 + Math.PI / 2) * 1 * 0.016,
    )
  })

  test("golden: decals pop in over the first fifth of their life", () => {
    expect(decalPop(0)).toBe(0)
    expect(decalPop(0.2)).toBe(1)
    expect(decalPop(0.1)).toBeCloseTo(0.75)
  })

  test("golden: additive materials fade linearly to transparent", () => {
    expect(fadeOver(0.55, 0)).toBeCloseTo(0.55)
    expect(fadeOver(0.55, 0.4)).toBeCloseTo(0.33)
    expect(fadeOver(0.55, 1)).toBe(0)
  })

  test("golden: burst fragments shrink away but never vanish fully", () => {
    expect(burstParticleScale(0)).toBeCloseTo(1)
    expect(burstParticleScale(0.6)).toBeCloseTo(0.4)
    expect(burstParticleScale(1)).toBeCloseTo(0.05)
    expect(burstParticleScale(1.2)).toBeCloseTo(0.05)
  })
})
