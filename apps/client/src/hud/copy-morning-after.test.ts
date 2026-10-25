import { describe, expect, test } from "bun:test"
import { MORNING_AFTER_COPY } from "../morning-after/copy"
import type {
  MorningAfterClass,
  MorningAfterDerivation,
} from "../morning-after/derive"
import type { Amplifier } from "../morning-after/milestones"
import {
  morningAfterDebriefGate,
  morningAfterDebriefLine,
} from "./copy-morning-after"

/**
 * The debrief render seam (postcup_morning_after FR-6, AC-4): the ticker's
 * line for the ritual day is composed here and nowhere else — every class
 * renders its own table line, an amplifier's line overrides the class line
 * (pickDebriefCopy's precedence, proven at the seam), and the one-say-per-day
 * gate keeps the ticker from repeating the morning.
 */

const derivation = (
  cls: MorningAfterClass,
  amplifiers: readonly Amplifier[] = [],
  bossId: string | null = null,
): MorningAfterDerivation => ({ class: cls, amplifiers, bossId })

describe("the morning-after debrief render seam (FR-6)", () => {
  test("each class renders its own table line, name interpolated", () => {
    expect(morningAfterDebriefLine(derivation("title"), "Momo")).toBe(
      "League champion. Momo took us all the way — let her enjoy it today.",
    )
    expect(morningAfterDebriefLine(derivation("exit"), "Momo")).toBe(
      "Not the result we wanted, but the work is never wasted. Bowls and patience, as always.",
    )
    expect(morningAfterDebriefLine(derivation("withdrawn"), "Momo")).toBe(
      "We packed it in early today. Rest is part of the sport too.",
    )
  })

  test("the gatekeep class names the boss the classifier surfaced", () => {
    expect(
      morningAfterDebriefLine(derivation("gatekeep", [], "koda"), "Momo"),
    ).toBe("koda had our number today. We'll bring a better answer next time.")
  })

  test("an amplifier's line overrides the class line at the seam", () => {
    expect(
      morningAfterDebriefLine(
        derivation("title", [{ kind: "first_title" }]),
        "Momo",
      ),
    ).toBe("The first crown in the family. Pin this morning to the wall.")
    expect(
      morningAfterDebriefLine(
        derivation("gatekeep", [{ kind: "first_scalp", bossId: "koda" }]),
        "Momo",
      ),
    ).toBe("First wall down — koda. That one's going on the wall.")
  })

  test("the seam single-sources: it renders exactly pickDebriefCopy's pick", () => {
    const d = derivation("exit", [
      { kind: "first_title" },
      { kind: "first_scalp", bossId: "koda" },
    ])
    const direct = MORNING_AFTER_COPY.amplifiers.first_title
    expect(morningAfterDebriefLine(d, "Momo")).toBe(
      direct.split("{name}").join("Momo"),
    )
  })
})

describe("the debrief's one-say-per-day gate (FR-6)", () => {
  test("nothing banked keeps the ticker's own chain", () => {
    expect(morningAfterDebriefGate(null, 12, null, "Momo")).toEqual({
      line: null,
      nextDay: null,
    })
  })

  test("the banked derivation takes the line on the first update of its day", () => {
    const d = derivation("title")
    const say = morningAfterDebriefGate(null, 12, d, "Momo")
    expect(say.line).not.toBe(null)
    expect(say.nextDay).toBe(12)
  })

  test("exactly one say: the same day never repeats the line", () => {
    const d = derivation("title")
    expect(morningAfterDebriefGate(12, 12, d, "Momo")).toEqual({
      line: null,
      nextDay: 12,
    })
  })

  test("a later ritual day earns its own say", () => {
    const d = derivation("exit")
    const say = morningAfterDebriefGate(12, 13, d, "Momo")
    expect(say.line).not.toBe(null)
    expect(say.nextDay).toBe(13)
  })
})
