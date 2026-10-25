/**
 * Golden contracts for the morning-after copy table (track
 * 20261024-postcup-morning-after FR-10): every ritual line lives in one
 * table — the four class debriefs and the four amplifier lines — tokens
 * appear exactly where the contract says, pickDebriefCopy applies the
 * priority order (first_title > first_legend_title > first_scalp >
 * new_tier) so a multi-first finalize still yields exactly one debrief
 * (FR-6), and nothing braces-shaped ever reaches the player.
 *
 * Tone rule pinned with the strings: warm coach voice, at most two
 * sentences per line. Changing a line's feel is a review-time edit — the
 * table location and keys are the contract.
 */
import { describe, expect, test } from "bun:test"
import { interpolate, MORNING_AFTER_COPY, pickDebriefCopy } from "./copy"
import type { MorningAfterDerivation } from "./derive"
import type { Amplifier } from "./milestones"

/** A derivation hand-built for copy tests (the classifier's own suite
 * derives real ones from finalized sessions). */
function derivationOf(
  things: Pick<MorningAfterDerivation, "class"> &
    Partial<MorningAfterDerivation>,
): MorningAfterDerivation {
  const { class: outcome, ...rest } = things
  return {
    bossId: null,
    amplifiers: [],
    ...rest,
    class: outcome,
  }
}

const amp = (a: Amplifier) => a

describe("MORNING_AFTER_COPY — the one ritual table (FR-10)", () => {
  test("the class lines are golden", () => {
    expect(MORNING_AFTER_COPY.classes.title).toBe(
      "League champion. {name} took us all the way — let her enjoy it today.",
    )
    expect(MORNING_AFTER_COPY.classes.gatekeep).toBe(
      "{boss} had our number today. We'll bring a better answer next time.",
    )
    expect(MORNING_AFTER_COPY.classes.exit).toBe(
      "Not the result we wanted, but the work is never wasted. Bowls and patience, as always.",
    )
    expect(MORNING_AFTER_COPY.classes.withdrawn).toBe(
      "We packed it in early today. Rest is part of the sport too.",
    )
  })

  test("the amplifier lines are golden", () => {
    expect(MORNING_AFTER_COPY.amplifiers.first_title).toBe(
      "The first crown in the family. Pin this morning to the wall.",
    )
    expect(MORNING_AFTER_COPY.amplifiers.first_legend_title).toBe(
      "A plateau title. They'll be writing about this one.",
    )
    expect(MORNING_AFTER_COPY.amplifiers.first_scalp).toBe(
      "First wall down — {boss}. That one's going on the wall.",
    )
    expect(MORNING_AFTER_COPY.amplifiers.new_tier).toBe(
      "League post just came through: a new egg is waiting in the nursery.",
    )
  })

  test("tokens live only where the contract says", () => {
    expect(MORNING_AFTER_COPY.classes.title.includes("{name}")).toBe(true)
    expect(MORNING_AFTER_COPY.classes.gatekeep.includes("{boss}")).toBe(true)
    expect(MORNING_AFTER_COPY.amplifiers.first_scalp.includes("{boss}")).toBe(
      true,
    )
    for (const line of [
      MORNING_AFTER_COPY.classes.exit,
      MORNING_AFTER_COPY.classes.withdrawn,
      MORNING_AFTER_COPY.amplifiers.first_title,
      MORNING_AFTER_COPY.amplifiers.first_legend_title,
      MORNING_AFTER_COPY.amplifiers.new_tier,
    ]) {
      expect(line.includes("{")).toBe(false)
    }
  })

  test("every line keeps the coach voice to two sentences", () => {
    for (const line of [
      ...Object.values(MORNING_AFTER_COPY.classes),
      ...Object.values(MORNING_AFTER_COPY.amplifiers),
    ]) {
      expect((line.match(/\./g) ?? []).length <= 2).toBe(true)
    }
  })
})

describe("interpolate — a plain replace-all helper", () => {
  test("replaces every occurrence of a set token", () => {
    expect(interpolate("{name} bows. {name} naps.", { name: "Ember" })).toBe(
      "Ember bows. Ember naps.",
    )
  })

  test("passes through text with no tokens or unknown tokens", () => {
    expect(interpolate("No tokens here.", { name: "Ember" })).toBe(
      "No tokens here.",
    )
    expect(interpolate("{rival} watches.", { name: "Ember" })).toBe(
      "{rival} watches.",
    )
  })
})

describe("pickDebriefCopy — one debrief per morning (FR-6)", () => {
  const NAME = "Ember Drake"
  const BOSS = "Sear Marshal Koda"
  const noBoss = { name: NAME }

  test("a title morning speaks the class line", () => {
    const d = derivationOf({ class: "title", amplifiers: [] })
    expect(pickDebriefCopy(d, noBoss)).toEqual({
      text: `League champion. ${NAME} took us all the way — let her enjoy it today.`,
      amplifier: false,
    })
  })

  test("a gatekeep morning names the boss and leaves no braces", () => {
    const d = derivationOf({ class: "gatekeep", bossId: "koda" })
    expect(pickDebriefCopy(d, { name: NAME, boss: BOSS })).toEqual({
      text: `${BOSS} had our number today. We'll bring a better answer next time.`,
      amplifier: false,
    })
  })

  test("a gatekeep morning without a boss name degrades to the id", () => {
    const d = derivationOf({ class: "gatekeep", bossId: "koda" })
    const choice = pickDebriefCopy(d, noBoss)
    expect(choice.text.includes("{")).toBe(false)
    expect(choice.text.startsWith("koda")).toBe(true)
  })

  test("an exit morning speaks the consolation line", () => {
    const d = derivationOf({ class: "exit" })
    expect(pickDebriefCopy(d, noBoss)).toEqual({
      text: "Not the result we wanted, but the work is never wasted. Bowls and patience, as always.",
      amplifier: false,
    })
  })

  test("a withdrawn morning speaks the rest line — not the consolation", () => {
    const d = derivationOf({ class: "withdrawn" })
    expect(pickDebriefCopy(d, noBoss)).toEqual({
      text: "We packed it in early today. Rest is part of the sport too.",
      amplifier: false,
    })
  })

  test("each amplifier overrides the class copy with its own line", () => {
    const cases: Array<{
      amplifier: Amplifier
      context: { name: string; boss?: string }
      expected: string
    }> = [
      {
        amplifier: amp({ kind: "first_title" }),
        context: noBoss,
        expected:
          "The first crown in the family. Pin this morning to the wall.",
      },
      {
        amplifier: amp({ kind: "first_legend_title" }),
        context: noBoss,
        expected: "A plateau title. They'll be writing about this one.",
      },
      {
        amplifier: amp({ kind: "first_scalp", bossId: "thessa" }),
        context: { name: NAME, boss: BOSS },
        expected: `First wall down — ${BOSS}. That one's going on the wall.`,
      },
      {
        amplifier: amp({ kind: "new_tier", tier: "gold" }),
        context: noBoss,
        expected:
          "League post just came through: a new egg is waiting in the nursery.",
      },
    ]
    for (const { amplifier, context, expected } of cases) {
      // exit is the plainest host class: the amplifier must outweigh it.
      const d = derivationOf({ class: "exit", amplifiers: [amplifier] })
      expect(pickDebriefCopy(d, context)).toEqual({
        text: expected,
        amplifier: true,
      })
    }
  })

  test("the priority order picks one line from several firsts", () => {
    const host = (amplifiers: Amplifier[]): MorningAfterDerivation =>
      derivationOf({ class: "exit", amplifiers })
    expect(
      pickDebriefCopy(
        host([
          amp({ kind: "first_scalp", bossId: "koda" }),
          amp({ kind: "first_title" }),
        ]),
        noBoss,
      ).text,
    ).toBe("The first crown in the family. Pin this morning to the wall.")
    expect(
      pickDebriefCopy(
        host([
          amp({ kind: "new_tier", tier: "legend" }),
          amp({ kind: "first_legend_title" }),
          amp({ kind: "first_scalp", bossId: "thessa" }),
        ]),
        noBoss,
      ).text,
    ).toBe("A plateau title. They'll be writing about this one.")
    expect(
      pickDebriefCopy(
        host([
          amp({ kind: "new_tier", tier: "legend" }),
          amp({ kind: "first_scalp", bossId: "koda" }),
        ]),
        { name: NAME, boss: BOSS },
      ).text,
    ).toBe(`First wall down — ${BOSS}. That one's going on the wall.`)
    expect(
      pickDebriefCopy(
        host([
          amp({ kind: "new_tier", tier: "silver" }),
          amp({ kind: "new_tier", tier: "gold" }),
        ]),
        noBoss,
      ).text,
    ).toBe(
      "League post just came through: a new egg is waiting in the nursery.",
    )
  })

  test("a first_scalp line never leaves braces even without a boss name", () => {
    const d = derivationOf({
      class: "exit",
      amplifiers: [amp({ kind: "first_scalp", bossId: "koda" })],
    })
    const choice = pickDebriefCopy(d, noBoss)
    expect(choice.text.includes("{")).toBe(false)
    expect(choice.amplifier).toBe(true)
  })
})
