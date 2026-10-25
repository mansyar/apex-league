/**
 * The league-reward hatch line (species roster FR-7/FR-8): the coach says the
 * partner that just arrived and the numbers it came with. One function serves
 * every tier, so these pins read the sim's catalog instead of naming a
 * species — a new reward line needs no edit here.
 */
import { describe, expect, test } from "bun:test"
import { createGiftEgg, getSpecies, REWARD_SPECIES } from "@apex/sim"
import { hatchCallout, hatchStatLine } from "./copy-hatch"

/** Sentence count without depending on an NLP splitter: the copy rule is two. */
const sentences = (text: string): number =>
  text.split(/(?<=[.!?])\s+/).filter((part) => part.trim() !== "").length

describe("hatchStatLine", () => {
  test("names all four stats in the plate's order", () => {
    const egg = createGiftEgg("fernstag", 42)
    expect(hatchStatLine(egg)).toBe(
      `HP ${egg.stats.hp} · ATK ${egg.stats.atk} · DEF ${egg.stats.def} · SPD ${egg.stats.spd}`,
    )
  })
})

describe("hatchCallout", () => {
  test("every reward line says its own name and its own stats", () => {
    for (const species of REWARD_SPECIES) {
      const egg = createGiftEgg(species.id, 4242)
      const line = hatchCallout(egg)
      expect(line).toContain(species.displayName)
      expect(line).toContain("stable")
      expect(line).toContain(`HP ${egg.stats.hp}`)
      expect(line).toContain(`ATK ${egg.stats.atk}`)
      expect(line).toContain(`DEF ${egg.stats.def}`)
      expect(line).toContain(`SPD ${egg.stats.spd}`)
    }
  })

  test("the new lines read their own catalog names, not a fixed one", () => {
    const names = ["fernstag", "reefclaw", "cindermoor"].map(
      (id) => getSpecies(id)?.displayName,
    )
    expect(names).toEqual(["Whistlefern", "Coral Claw", "Moor Cinder"])
    for (const id of ["fernstag", "reefclaw", "cindermoor"]) {
      const line = hatchCallout(createGiftEgg(id, 7))
      expect(line).toContain(getSpecies(id)?.displayName ?? "missing")
    }
  })

  test("stays within the two-sentence copy rule", () => {
    for (const species of REWARD_SPECIES) {
      expect(sentences(hatchCallout(createGiftEgg(species.id, 11)))).toBe(2)
    }
  })
})
