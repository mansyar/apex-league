/**
 * The breeding-discovery lines across the client's data surfaces (roster
 * wave 3 FR-7): every surface reads the sim's catalog, so nothing here
 * names a species — these pins assert the three new lines land in the
 * existing tables with their own element-true identity instead of a
 * hardcoded colour or copy.
 *
 * The rendered DOM for the same surfaces is checked in the browser pass; these
 * are the decisions the paint reads.
 */
import { describe, expect, test } from "bun:test"
import {
  createGiftEgg,
  createInitialState,
  getBranch,
  getSpecies,
  grantLeagueRewards,
  type LadderTier,
  REWARD_SPECIES,
  STARTER_SPECIES,
} from "@apex/sim"
import { crestGlyph, elementHue } from "./element"
import { populationNote } from "./handbook/chart"
import { branchRevealLine } from "./hud/copy-branch"
import { evolveCallout } from "./hud/copy-growth"
import { stableMeta, stableRow } from "./stable"
import { TIER_NAME } from "./tier-name"

/** The three tiers the league pays a reward species at, lowest first. */
const REWARD_TIERS = ["silver", "gold", "legend"] as const

/**
 * The eggs `grantLeagueRewards` queues for a save standing at `tier`, narrowed
 * to that tier's own species (a higher ladder also re-pays the lower tiers).
 */
function grantedEggIds(tier: LadderTier): string[] {
  const state = {
    ...createInitialState(),
    ladder: { points: 0, tier, subTier: "I" as const },
  }
  const tierSpecies = new Set(
    REWARD_SPECIES.filter((species) => species.rewardFromTier === tier).map(
      (species) => species.id,
    ),
  )
  return grantLeagueRewards(state, false)
    .pendingRewards.filter((egg) => tierSpecies.has(egg.speciesId))
    .map((egg) => egg.speciesId)
}

/** The population note's clause for one tier, without the trailing punctuation. */
function tierSentence(note: string, tier: LadderTier): string {
  const start = note.indexOf(`${TIER_NAME[tier]} pays`)
  if (start === -1) throw new Error(`no reward line for ${tier}`)
  const end = note.indexOf("; ", start)
  return note.slice(start, end === -1 ? undefined : end).replace(/\.$/, "")
}

/** The three new lines, with the element hue the guideline fixes for each. */
const NEW_LINES = [
  { id: "fernstag", name: "Whistlefern", hue: 110 },
  { id: "reefclaw", name: "Coral Claw", hue: 205 },
  { id: "cindermoor", name: "Moor Cinder", hue: 18 },
  { id: "voltfox", name: "Voltfox", hue: 50 },
  { id: "galeheron", name: "Galeheron", hue: 165 },
  { id: "shalemole", name: "Shalemole", hue: 28 },
  { id: "embercub", name: "Embercub", hue: 18 },
  { id: "mossboar", name: "Mossboar", hue: 110 },
  { id: "mistkit", name: "Mistkit", hue: 205 },
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

  test("each element keeps its own glyph, shared by its lines", () => {
    // With nine lines over six elements, sibling lines share a crest glyph
    // by design — the pin is that the glyph is the element's own, never a
    // fallback, and distinct across elements.
    const byElement = new Map<string, string>()
    for (const line of NEW_LINES) {
      const species = getSpecies(line.id)
      if (!species) throw new Error(`missing species ${line.id}`)
      const glyph = crestGlyph(species.element)
      const seen = byElement.get(species.element)
      if (seen === undefined) byElement.set(species.element, glyph)
      else expect(glyph).toBe(seen)
    }
    expect(new Set(byElement.values()).size).toBe(byElement.size)
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
      ["arc_courser", 55, "voltfox"],
      ["galvanic_warden", 45, "voltfox"],
      ["reed_diver", 170, "galeheron"],
      ["marsh_warden", 160, "galeheron"],
      ["slate_ram", 33, "shalemole"],
      ["shale_keeper", 23, "shalemole"],
      ["ember_rusher", 26, "embercub"],
      ["soot_warden", 8, "embercub"],
      ["briar_charger", 115, "mossboar"],
      ["moss_warden", 100, "mossboar"],
      ["mist_courser", 210, "mistkit"],
      ["foam_warden", 222, "mistkit"],
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
      ["voltfox", "arc_courser"],
      ["galeheron", "reed_diver"],
      ["shalemole", "slate_ram"],
      ["embercub", "ember_rusher"],
      ["mossboar", "briar_charger"],
      ["mistkit", "mist_courser"],
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
    const offense: Record<string, string> = {
      fernstag: "frond_lasher",
      reefclaw: "whirlpool_claw",
      cindermoor: "pyre_colossus",
      voltfox: "arc_courser",
      galeheron: "reed_diver",
      shalemole: "slate_ram",
      embercub: "ember_rusher",
      mossboar: "briar_charger",
      mistkit: "mist_courser",
    }
    for (const line of NEW_LINES) {
      const branchId = offense[line.id]
      if (!branchId) throw new Error(`missing branch for ${line.id}`)
      const branch = getBranch(branchId)
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
    expect(note).toContain("Silver pays a Storm Hound and a Whistlefern")
    expect(note).toContain("Gold pays a Zephyr Falcon and a Coral Claw")
    expect(note).toContain("Legend pays a Basalt Tortoise and a Moor Cinder")
  })

  test("the tier connective matches the eggs the league actually grants", () => {
    const note = populationNote()
    for (const tier of REWARD_TIERS) {
      // Read the count from the grant seam itself, so the copy cannot promise
      // a choice the league does not offer: `grantLeagueRewards` queues one
      // egg per species of the tier, never one egg picked from them.
      const granted = grantedEggIds(tier)
      const sentence = tierSentence(note, tier)
      // Every granted species is listed, so the sentence counts the eggs.
      for (const id of granted) {
        const species = getSpecies(id)
        if (!species) throw new Error(`missing species ${id}`)
        expect(sentence).toContain(species.displayName)
      }
      // A tier that pays more than one egg must read as additive ("and"),
      // never as a choice between them ("or").
      if (granted.length > 1) {
        expect(sentence).toContain(" and ")
        expect(sentence).not.toContain(" or ")
      }
    }
  })

  test("makes only the guarantee the catalog structurally provides", () => {
    const note = populationNote()
    // The note's claim about the tiers must be one the data cannot falsify.
    // The only such claim is that a reward is a partner the player could not
    // have picked at the start: the two catalogs are disjoint by construction,
    // because a tier grants what the starter choice did not offer.
    const starterIds = new Set(STARTER_SPECIES.map((species) => species.id))
    expect(REWARD_SPECIES.length).toBeGreaterThan(0)
    for (const species of REWARD_SPECIES) {
      expect(starterIds.has(species.id)).toBe(false)
    }
    // Regression pin on the exact falsehood: the old copy promised "a partner
    // of another element" from every tier, which a mixed-element tier breaks —
    // Silver's plant Whistlefern sits beside the plant starter. Never again.
    expect(note).not.toContain("another element")
  })
})
