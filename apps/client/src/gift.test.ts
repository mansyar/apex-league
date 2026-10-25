/**
 * The league gift card (species roster FR-5/FR-7): the copy the card shows and
 * the reward row the cup results screen gains when a gift lands. One card
 * serves every tier, so nothing here may name a fixed species.
 *
 * The card's DOM is verified in the browser (the visual pass); these are the
 * decisions behind the words.
 */
import { describe, expect, test } from "bun:test"
import { resultRows } from "./bracket-model"
import { giftHatchNote } from "./gift"

describe("giftHatchNote", () => {
  test("says the hatched pet waits in the stable and the ranch pet stays", () => {
    const note = giftHatchNote("Ember")
    expect(note).toContain("Ember")
    expect(note).toContain("stable")
    expect(note).toContain("keeps the ranch")
    // The gift never replaces the partner, and the partner is never retired.
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

describe("the results screen's league gift row", () => {
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
    const withGift = resultRows(session, ladder, null, 0, "Whistlefern")
    expect(withGift.some((row) => row.includes("Whistlefern"))).toBe(true)
    const without = resultRows(session, ladder, null, 0, null)
    expect(without.some((row) => row.includes("League Gift"))).toBe(false)
  })

  test("the row names the pending species, not a fixed line", () => {
    for (const name of ["Whistlefern", "Coral Claw", "Moor Cinder"]) {
      const rows = resultRows(session, ladder, null, 0, name)
      const giftRow = rows.find((row) => row.includes("League Gift"))
      expect(giftRow).toContain(name)
      expect(giftRow).toContain("nursery")
    }
  })
})
