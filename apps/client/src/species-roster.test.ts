/**
 * The roster-expansion lines across the client's data surfaces (species roster
 * FR-7): every surface reads the sim's catalog, so nothing here names a
 * species — these pins assert the three new lines land in the existing tables
 * with their own element-true identity instead of a hardcoded colour or copy.
 *
 * The rendered DOM for the same surfaces is checked in the browser pass; these
 * are the decisions the paint reads.
 */
import { describe, expect, test } from "bun:test"
import { createGiftEgg, getBranch, getSpecies } from "@apex/sim"
import { crestGlyph, elementHue } from "./element"
import { populationNote } from "./handbook/chart"
import { branchRevealLine } from "./hud/copy-branch"
import { evolveCallout } from "./hud/copy-growth"
import { stableMeta, stableRow } from "./stable"

/** The three new lines, with the element hue the guideline fixes for each. */
const NEW_LINES = [
  { id: "fernstag", name: "Whistlefern", hue: 110 },
  { id: "reefclaw", name: "Coral Claw", hue: 205 },
  { id: "cindermoor", name: "Moor Cinder", hue: 18 },
] as const

describe("the new lines' crest identity", () => {
  test("each crest takes its own element hue, never a fallback", () => {
    for (const line of NEW_LINES) {
      const species = getSpecies(line.id)
      if (!species) throw new Error(`missing species ${line.id}`)
      expect(elementHue(species.element)).toBe(line.hue)
      // The glyph is drawn per element; an empty one would leave the crest blank.
      expect(crestGlyph(species.element).length).toBeGreaterThan(0)
    }
  })

  test("no two new lines share a crest glyph", () => {
    const glyphs = NEW_LINES.map((line) => {
      const species = getSpecies(line.id)
      if (!species) throw new Error(`missing species ${line.id}`)
      return crestGlyph(species.element)
    })
    expect(new Set(glyphs).size).toBe(glyphs.length)
  })
})

describe("the new lines in the stable", () => {
  test("a waiting egg reads as its species name and stage", () => {
    for (const line of NEW_LINES) {
      const egg = createGiftEgg(line.id, 4242)
      const row = stableRow(egg, 0)
      // A gift egg arrives named for its species, so the name already says it
      // and the species chip stays quiet rather than repeating itself.
      expect(egg.name).toBe(line.name)
      expect(row.species).toBeNull()
      expect(stableMeta(row)).toBe("Baby · 1 day")
    }
  })

  test("a renamed pet still shows which species it is", () => {
    for (const line of NEW_LINES) {
      const egg = { ...createGiftEgg(line.id, 7), name: "Pip" }
      const row = stableRow(egg, 0)
      expect(row.species).toBe(line.name)
      expect(stableMeta(row)).toContain(line.name)
    }
  })
})

describe("the new lines' champion forms", () => {
  test("both branch forms exist and keep their own accent hue", () => {
    const expected: ReadonlyArray<[string, number, string]> = [
      ["frond_lasher", 140, "fernstag"],
      ["spore_warden", 105, "fernstag"],
      ["whirlpool_claw", 200, "reefclaw"],
      ["tide_sentinel", 230, "reefclaw"],
      ["pyre_colossus", 12, "cindermoor"],
      ["ember_bank", 2, "cindermoor"],
    ]
    for (const [id, hue, speciesId] of expected) {
      const branch = getBranch(id)
      expect(branch?.speciesId).toBe(speciesId)
      expect(branch?.accentHue).toBe(hue)
    }
  })

  test("the evolution reveal names the form that was just earned", () => {
    const expected: ReadonlyArray<[string, string]> = [
      ["fernstag", "frond_lasher"],
      ["reefclaw", "whirlpool_claw"],
      ["cindermoor", "pyre_colossus"],
    ]
    for (const [speciesId, branchId] of expected) {
      const creature = { ...createGiftEgg(speciesId, 5), branch: branchId }
      const line = branchRevealLine(creature)
      const branch = getBranch(branchId)
      if (!branch) throw new Error(`missing branch ${branchId}`)
      expect(line).toContain(branch.label)
      expect(line).toContain("signature included")
    }
  })

  test("the evolution callout keeps stat names and two sentences", () => {
    // The champion reveal is the one moment the branch copy ships to the
    // player, so it must name the stat gains the way the plate does.
    for (const line of NEW_LINES) {
      const branch = getBranch(
        line.id === "fernstag"
          ? "frond_lasher"
          : line.id === "reefclaw"
            ? "whirlpool_claw"
            : "pyre_colossus",
      )
      if (!branch) throw new Error(`missing branch for ${line.id}`)
      const creature = {
        ...createGiftEgg(line.id, 5),
        stage: "champion" as const,
        ageDays: 30,
        branch: branch.id,
      }
      const copy = evolveCallout(creature)
      expect(copy).toContain(line.name)
      expect(copy).toContain(branch.label)
      for (const stat of ["HP", "ATK", "DEF", "SPD"]) {
        expect(copy).toContain(stat)
      }
      // The "Evolution!" beat is the announcer's shout; after it the line is
      // two spoken sentences, as the existing species copy is.
      const spoken = copy.replace(/^Evolution!\s*/, "")
      expect(spoken.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2)
    }
  })
})

describe("the handbook's population note", () => {
  test("credits every reward line the catalog hands out", () => {
    const note = populationNote()
    for (const name of [
      "Storm Hound",
      "Whistlefern",
      "Zephyr Falcon",
      "Coral Claw",
      "Basalt Tortoise",
      "Moor Cinder",
    ]) {
      expect(note).toContain(name)
    }
    // One sentence per tier plus the starter line: never a wall of text.
    expect(note.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2)
  })

  test("names each new line on its own tier", () => {
    const note = populationNote()
    expect(note).toContain("Silver pays a Storm Hound or a Whistlefern")
    expect(note).toContain("Gold pays a Zephyr Falcon or a Coral Claw")
    expect(note).toContain("Legend pays a Basalt Tortoise or a Moor Cinder")
  })
})
