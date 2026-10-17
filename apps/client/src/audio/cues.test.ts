import { describe, expect, test } from "bun:test"
import { type CueOptions, type CueStep, cueForStep } from "./cues"

/** A minimal step stub: only the fields the mapping reads. */
const step = (kind: string, hit?: boolean, ko?: boolean): CueStep => ({
  kind,
  hit,
  ko,
})

const opts = (overrides: Partial<CueOptions> = {}): CueOptions => ({
  muted: false,
  reducedMotion: false,
  ...overrides,
})

describe("cueForStep", () => {
  test("muted silences every kind", () => {
    for (const kind of ["melee", "projectile", "impact", "down", "judge"]) {
      expect(cueForStep(step(kind, true, true), opts({ muted: true }))).toBe(
        null,
      )
    }
  })

  test("a landed melee blow maps to the melee hit cue", () => {
    expect(cueForStep(step("melee", true), opts())).toBe("melee-hit")
  })

  test("a whiffed melee blow stays silent", () => {
    expect(cueForStep(step("melee", false), opts())).toBe(null)
  })

  test("a projectile launch maps to the fire cue (hit or miss)", () => {
    expect(cueForStep(step("projectile", true), opts())).toBe("fire")
    expect(cueForStep(step("projectile", false), opts())).toBe("fire")
  })

  test("a landed impact maps to the plate hit cue; a dodge stays silent", () => {
    expect(cueForStep(step("impact", true), opts())).toBe("hit-plate")
    expect(cueForStep(step("impact", false), opts())).toBe(null)
  })

  test("a terminal KO down step maps to the KO thud", () => {
    expect(cueForStep(step("down", true, true), opts())).toBe("ko")
  })

  test("a non-terminal down step stays silent", () => {
    expect(cueForStep(step("down", true, false), opts())).toBe(null)
  })

  test("the judge beat maps to the verdict jingle", () => {
    expect(cueForStep(step("judge"), opts())).toBe("verdict-0")
  })

  test("idle/stagger/knockback beats carry no cue", () => {
    for (const kind of ["idle", "stagger", "knockback", "hold"]) {
      expect(cueForStep(step(kind), opts())).toBe(null)
    }
  })

  test("reduced motion selects the calm variant where one exists", () => {
    const calm = opts({ reducedMotion: true })
    expect(cueForStep(step("melee", true), calm)).toBe("melee-hit-calm")
    expect(cueForStep(step("impact", true), calm)).toBe("hit-plate-calm")
    expect(cueForStep(step("projectile"), calm)).toBe("fire-calm")
    // KOs and verdicts keep their full cues: they are rare punctuation,
    // not repeated impacts.
    expect(cueForStep(step("down", true, true), calm)).toBe("ko")
    expect(cueForStep(step("judge"), calm)).toBe("verdict-0")
  })
})
