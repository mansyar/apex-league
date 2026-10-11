import { describe, expect, test } from "bun:test"
import {
  BABY_SCALE,
  createEvolutionCeremony,
  type EvolutionDrive,
  JUVENILE_SCALE,
} from "./scene-logic"

/** Drive the evolution machine at a fixed 60fps cadence from a starting
 * pose (begin is called for you), collecting frames until it goes idle
 * (or the step budget runs out). Returns the frame log and final pose. */
function run(
  machine: ReturnType<typeof createEvolutionCeremony>,
  from: { x: number; z: number; yaw: number },
  opts: { dt?: number; reduced?: boolean; maxSeconds?: number } = {},
) {
  const dt = opts.dt ?? 1 / 60
  machine.begin(from.x, from.z, from.yaw, opts.reduced ?? false)
  let x = from.x
  let z = from.z
  let yaw = from.yaw
  const frames: EvolutionDrive[] = []
  const max = Math.ceil((opts.maxSeconds ?? 30) / Math.min(dt, 0.1))
  for (let i = 0; i < max; i++) {
    const d = machine.advance(x, z, dt)
    x = d.x
    z = d.z
    yaw = d.yaw
    frames.push(d)
    if (!d.active) break
  }
  return { frames, x, z, yaw }
}

describe("evolution ceremony machine", () => {
  test("walks to the center, glows and swells, swaps once, settles at the juvenile scale", () => {
    const m = createEvolutionCeremony()
    const { frames, x, z } = run(m, { x: 3, z: -4, yaw: 0.7 })
    const phases = frames.map((f) => f.phase)
    expect(phases[0]).toBe("walk")
    expect(phases).toContain("glow")
    expect(phases).toContain("settle")
    expect(phases[phases.length - 1]).toBe("idle")
    // Converges on the ranch center (position-driven, no overshoot).
    expect(x).toBe(0)
    expect(z).toBe(0)
    // Scale journey: baby → swell peak → juvenile settle.
    const walkFrames = frames.filter((f) => f.phase === "walk")
    for (const f of walkFrames) {
      expect(f.scale).toBeCloseTo(BABY_SCALE, 5)
      expect(f.glow).toBe(0)
    }
    const glowFrames = frames.filter((f) => f.phase === "glow")
    expect(glowFrames.length).toBeGreaterThan(0)
    const peak = Math.max(...glowFrames.map((f) => f.scale))
    expect(peak).toBeGreaterThan(BABY_SCALE)
    // Exactly one swap frame, and it happens in the settle phase.
    const swaps = frames.filter((f) => f.swap)
    expect(swaps.length).toBe(1)
    expect(swaps[0]?.phase).toBe("settle")
    // Settle decays onto the juvenile scale and the glow fades out.
    const settleFrames = frames.filter((f) => f.phase === "settle")
    const lastSettle = settleFrames[settleFrames.length - 1]
    expect(lastSettle?.scale).toBeCloseTo(JUVENILE_SCALE, 5)
    expect(lastSettle?.glow).toBeCloseTo(0, 5)
    // Idle is inert: the scene takes the static stage scale back.
    const idle = m.advance(0, 0, 1 / 60)
    expect(idle.active).toBe(false)
    expect(idle.swap).toBe(false)
  })

  test("reduced motion swaps in place on the first frame, no travel or glow", () => {
    const m = createEvolutionCeremony()
    const { frames, x, z } = run(
      m,
      { x: 2.5, z: -1.5, yaw: 1.2 },
      { reduced: true },
    )
    for (const f of frames) {
      expect(f.glow).toBe(0)
    }
    // No travel: the machine starts from the given pose and stays there.
    expect(x).toBe(2.5)
    expect(z).toBe(-1.5)
    const swaps = frames.filter((f) => f.swap)
    expect(swaps.length).toBe(1)
    const last = frames[frames.length - 1]
    expect(last?.phase).toBe("idle")
    expect(last?.scale).toBeCloseTo(JUVENILE_SCALE, 5)
  })

  test("a paused tab or a huge frame step still converges (dt clamped)", () => {
    const m = createEvolutionCeremony()
    const { frames } = run(m, { x: 4, z: 4, yaw: 0 }, { dt: 5 })
    const swaps = frames.filter((f) => f.swap)
    expect(swaps.length).toBe(1)
    const last = frames[frames.length - 1]
    expect(last?.phase).toBe("idle")
    // Every scale stayed finite and ordered.
    for (const f of frames) {
      expect(Number.isFinite(f.scale)).toBe(true)
      expect(Number.isFinite(f.glow)).toBe(true)
    }
  })

  test("glow pulses rise monotonically in envelope while swelling", () => {
    const m = createEvolutionCeremony()
    const { frames } = run(m, { x: 1, z: 1, yaw: 0 })
    const glowFrames = frames.filter((f) => f.phase === "glow")
    // The scale envelope climbs frame over frame even as the glow pulses.
    for (let i = 1; i < glowFrames.length; i++) {
      const prev = glowFrames[i - 1]
      const cur = glowFrames[i]
      if (!prev || !cur) continue
      expect(cur.scale).toBeGreaterThanOrEqual(prev.scale)
    }
    expect(Math.max(...glowFrames.map((f) => f.glow))).toBeGreaterThan(0.3)
  })
})
