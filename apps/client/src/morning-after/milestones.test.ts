/**
 * Persistence-first milestone contracts for the morning-after (track
 * 20261024-postcup-morning-after FR-4, AC-3): each persisted first fires
 * exactly when its persisted field actually crossed between the
 * pre-finalize and post-finalize snapshots — cupsWon 0→n (first title),
 * legendTitles 0→n (first Legend title), bossDefeats []→non-empty (first
 * boss scalp), claimedTiers gaining an entry (new reward tier) — and stays
 * silent on non-firsts. No new persistence: the snapshot pair is the whole
 * truth (NFR-1).
 *
 * Pure: snapshots are built from the sim's initial state and shaped with
 * feature-style spreads, mirroring the save-schema tests' feature states.
 */
import { describe, expect, test } from "bun:test"
import { createInitialState, type GameState } from "@apex/sim"
import { milestoneAmplifiers } from "./milestones"

/** A post-finalize snapshot shaped by spreads over a fresh state. */
function after(patch: Partial<GameState>): GameState {
  return { ...createInitialState(), ...patch }
}

describe("milestoneAmplifiers — persisted firsts only (FR-4)", () => {
  test("first title fires when cupsWon crossed 0 → n", () => {
    expect(
      milestoneAmplifiers(createInitialState(), after({ cupsWon: 1 })),
    ).toEqual([{ kind: "first_title" }])
    expect(
      milestoneAmplifiers(createInitialState(), after({ cupsWon: 3 })),
    ).toEqual([{ kind: "first_title" }])
  })

  test("a later title is not a first — silent", () => {
    expect(
      milestoneAmplifiers(after({ cupsWon: 1 }), after({ cupsWon: 2 })),
    ).toEqual([])
    expect(
      milestoneAmplifiers(after({ cupsWon: 4 }), after({ cupsWon: 5 })),
    ).toEqual([])
  })

  test("first Legend title fires when legendTitles crossed 0 → n", () => {
    expect(
      milestoneAmplifiers(createInitialState(), after({ legendTitles: 1 })),
    ).toEqual([{ kind: "first_legend_title" }])
  })

  test("a later Legend title is silent — even alongside another title", () => {
    expect(
      milestoneAmplifiers(
        after({ cupsWon: 2, legendTitles: 1 }),
        after({ cupsWon: 3, legendTitles: 2 }),
      ),
    ).toEqual([])
  })

  test("first boss scalp fires when bossDefeats crossed from empty", () => {
    expect(
      milestoneAmplifiers(
        createInitialState(),
        after({ bossDefeats: ["koda"] }),
      ),
    ).toEqual([{ kind: "first_scalp", bossId: "koda" }])
  })

  test("a later scalp is not a first — silent", () => {
    expect(
      milestoneAmplifiers(
        after({ bossDefeats: ["koda"] }),
        after({ bossDefeats: ["koda", "thessa"] }),
      ),
    ).toEqual([])
  })

  test("a new claimedTiers entry fires once per gained tier", () => {
    expect(
      milestoneAmplifiers(
        createInitialState(),
        after({ claimedTiers: ["silver"] }),
      ),
    ).toEqual([{ kind: "new_tier", tier: "silver" }])
    expect(
      milestoneAmplifiers(
        after({ claimedTiers: ["silver"] }),
        after({ claimedTiers: ["silver", "gold"] }),
      ),
    ).toEqual([{ kind: "new_tier", tier: "gold" }])
  })

  test("tiers already claimed stay silent", () => {
    expect(
      milestoneAmplifiers(
        after({ claimedTiers: ["silver", "gold"] }),
        after({ claimedTiers: ["silver", "gold"] }),
      ),
    ).toEqual([])
  })

  test("a finalize crossing nothing is silent", () => {
    const pre = after({
      cupsWon: 2,
      claimedTiers: ["silver"],
      bossDefeats: ["koda"],
    })
    expect(milestoneAmplifiers(pre, { ...pre })).toEqual([])
  })

  test("multiple firsts cross together and return in priority order", () => {
    // The Bronze→Silver gate cup scalped in the final: the first-ever title
    // AND the first boss scalp land on one finalize. Priority:
    // first_title > first_legend_title > first_scalp > new_tier.
    const post = after({
      cupsWon: 1,
      bossDefeats: ["koda"],
      claimedTiers: ["silver"],
    })
    expect(milestoneAmplifiers(createInitialState(), post)).toEqual([
      { kind: "first_title" },
      { kind: "first_scalp", bossId: "koda" },
      { kind: "new_tier", tier: "silver" },
    ])
  })

  test("a legend crown's firsts order title > legend > tier claims", () => {
    // A fresh save crowning the Legend gate cup in one shot: the ladder
    // grant claims every reward tier the standing reached, ascending.
    const post = after({
      cupsWon: 1,
      legendTitles: 1,
      ladder: { points: 40, tier: "legend", subTier: "I" },
      claimedTiers: ["silver", "gold", "legend"],
    })
    expect(milestoneAmplifiers(createInitialState(), post)).toEqual([
      { kind: "first_title" },
      { kind: "first_legend_title" },
      { kind: "new_tier", tier: "silver" },
      { kind: "new_tier", tier: "gold" },
      { kind: "new_tier", tier: "legend" },
    ])
  })
})
