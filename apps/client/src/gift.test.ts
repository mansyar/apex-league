/**
 * The Storm Gift card (electric species line FR-5/FR-6): the copy the card
 * shows and the reward row the cup results screen gains when a gift lands.
 *
 * The card's DOM is verified in the browser (the Phase R1 visual pass);
 * these are the decisions behind the words.
 */
import { describe, expect, test } from "bun:test"
import { resultRows } from "./bracket-model"
import { giftHatchNote } from "./gift"

describe("giftHatchNote", () => {
  test("says the hound waits in the stable and the ranch pet stays", () => {
    const note = giftHatchNote("Ember")
    expect(note).toContain("Ember")
    expect(note).toContain("stable")
    expect(note).toContain("keeps the ranch")
    // The hound never replaces the partner, and the partner is never retired.
    expect(note).not.toContain("Hall of Fame")
    expect(note).not.toContain("retires")
  })

  test("says so plainly when there is no partner in the ranch", () => {
    const note = giftHatchNote(undefined)
    expect(note).toContain("Hatching")
    expect(note).toContain("stable")
    expect(note).not.toContain("Hall of Fame")
  })
})

describe("the results screen's Storm Gift row", () => {
  const session = {
    status: "champion",
    bracket: { kind: "championship", slots: [{ name: "Ember" }] },
    championName: "Ember",
    playerVerdicts: [],
  } as unknown as Parameters<typeof resultRows>[0]
  const ladder = { tier: "silver", subTier: "III", points: 18 } as Parameters<
    typeof resultRows
  >[1]

  test("the row appears only while a gift is waiting", () => {
    const withGift = resultRows(session, ladder, null, 0, true)
    expect(withGift.some((row) => row.includes("Storm Gift"))).toBe(true)
    const without = resultRows(session, ladder, null, 0, false)
    expect(without.some((row) => row.includes("Storm Gift"))).toBe(false)
  })
})
