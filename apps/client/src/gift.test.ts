/**
 * The league gift card (species roster FR-5/FR-7): the copy the card shows and
 * the reward row the cup results screen gains when a gift lands. One card
 * serves every tier, so nothing here may name a fixed species.
 *
 * The card's DOM is verified in the browser (the visual pass); these are the
 * decisions behind the words.
 */
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createInitialState, type GameState } from "@apex/sim"
import { resultRows } from "./bracket-model"
import { giftHatchNote, syncGiftChip } from "./gift"

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

/**
 * The slice of a button the chip sync touches. The seat rules in ranch.css ask
 * whether the chip is showing, so the sync must express that as a class: an
 * inline `display` can only be substring-matched, and any other declaration
 * containing "none" would move the HUD with it.
 */
function fakeChip(): {
  classList: {
    toggle: (name: string, force?: boolean) => void
    has: (n: string) => boolean
  }
  style: { display: string }
} {
  const classes = new Set<string>(["gift-chip"])
  return {
    classList: {
      toggle(name, force) {
        const on = force ?? !classes.has(name)
        if (on) classes.add(name)
        else classes.delete(name)
      },
      has: (name) => classes.has(name),
    },
    style: { display: "" },
  }
}

function stateWithEggs(eggs: number): GameState {
  const base = createInitialState()
  return {
    ...base,
    pendingRewards: Array.from({ length: eggs }, (_, i) => ({
      speciesId: "fernstag",
      seed: i + 1,
    })),
  }
}

describe("the gift chip's visibility", () => {
  test("folds through the is-hidden class while no egg waits", () => {
    const button = fakeChip()
    syncGiftChip(button as unknown as HTMLButtonElement, stateWithEggs(0))
    expect(button.classList.has("is-hidden")).toBe(true)
    // Never an inline display: that is the signal the seat rules cannot read.
    expect(button.style.display).toBe("")
  })

  test("shows the chip, still without an inline display, once an egg waits", () => {
    const button = fakeChip()
    syncGiftChip(button as unknown as HTMLButtonElement, stateWithEggs(1))
    expect(button.classList.has("is-hidden")).toBe(false)
    expect(button.style.display).toBe("")
  })

  test("ranch.css keeps no stale gift-chip seat rules", () => {
    const css = readFileSync(join(import.meta.dir, "ranch.css"), "utf8")
    // No substring match on an inline style anywhere: the fold is a class.
    expect(css).not.toContain("[style*=")
    // The P3 overflow moved the chip behind More, so the legacy :has() seat
    // rules are gone; the chip is positioned by the panel, not the ranch.
    const seats = css.match(/:has\(\.gift-chip[^)]*\)/g) ?? []
    expect(seats.length).toBe(0)
  })
})
