/**
 * Roster Wave 4 integrated sweep (Phase 4, P4.T2 — AC-1..AC-8, sim half):
 * one file re-checking every wave-4 acceptance criterion from the sim side
 * after the rival/boss work lands. Each section points at the suite that
 * pins the criterion in depth; this file only asserts the integrated
 * shape — fifteen species in play, six recipes resolving, six new forms
 * registered, pools widened per tier — so a later track cannot silently
 * drop a wave-4 row.
 *
 * The client half of the sweep (render + handbook copy) stays where
 * Phase 3 pinned it and is only referenced here, never duplicated:
 * `apps/client/src/handbook.test.ts` (recipe rows), `species-roster`
 * lineage pins, the move-fx kit pins.
 */

import { describe, expect, test } from "bun:test"
import { getMove } from "./battle/moves"
import { BRANCHES } from "./branches"
import { discoverySpeciesForElements } from "./breeding/discovery"
import type { Element } from "./creature"
import type { LadderTier } from "./ladder"
import {
  ALL_SPECIES,
  DISCOVERY_SPECIES,
  getSpecies,
  obtainableSpecies,
  STARTER_SPECIES,
} from "./species"

/** The wave-4 discovery lines, in recipe-table order. */
const WAVE4_IDS: readonly string[] = ["embercub", "mossboar", "mistkit"]

const TIERS: readonly LadderTier[] = ["bronze", "silver", "gold", "legend"]

describe("roster wave 4 integrated sweep", () => {
  test("all fifteen species enter play through exactly one seam (AC-1)", () => {
    expect(ALL_SPECIES).toHaveLength(15)
    // The discovery seam is breeding-only at every gate...
    for (const tier of TIERS) {
      const obtainable = new Set(
        obtainableSpecies(tier).map((species) => species.id),
      )
      for (const line of DISCOVERY_SPECIES) {
        expect(obtainable.has(line.id), `${line.id} at ${tier}`).toBe(false)
      }
    }
    // ...and together with the Legend reward gate it covers the roster.
    const legend = new Set(
      obtainableSpecies("legend").map((species) => species.id),
    )
    expect(legend.size).toBe(9)
    expect(DISCOVERY_SPECIES.map((species) => species.id)).toHaveLength(6)
    const covered = new Set([
      ...legend,
      ...DISCOVERY_SPECIES.map((species) => species.id),
    ])
    expect(covered.size).toBe(15)
    for (const species of ALL_SPECIES) {
      expect(covered.has(species.id), species.id).toBe(true)
    }
  })

  test("every discovery recipe resolves through the production lookup (AC-4)", () => {
    // The handbook sentences (`apps/client/src/handbook.test.ts`) derive
    // from the same lookup via `recipeLine`, so pinning the lookup pins
    // the copy: parent pairs in handbook order, both nursery orders.
    const expected: Readonly<Record<string, readonly [Element, Element]>> = {
      voltfox: ["electric", "wind"],
      galeheron: ["wind", "water"],
      shalemole: ["earth", "fire"],
      embercub: ["fire", "plant"],
      mossboar: ["plant", "water"],
      mistkit: ["fire", "water"],
    }
    expect(DISCOVERY_SPECIES.map((species) => species.id).sort()).toEqual(
      Object.keys(expected).sort(),
    )
    for (const [speciesId, parents] of Object.entries(expected)) {
      expect(
        discoverySpeciesForElements(parents[0], parents[1]),
        speciesId,
      ).toBe(speciesId)
      expect(
        discoverySpeciesForElements(parents[1], parents[0]),
        `${speciesId} reversed`,
      ).toBe(speciesId)
    }
  })

  test("the six wave-4 branch forms register with distinct element-true signatures (AC-5)", () => {
    const forms = BRANCHES.filter(
      (branch) =>
        branch.speciesId !== null && WAVE4_IDS.includes(branch.speciesId),
    )
    expect(forms).toHaveLength(6)
    const expected: Readonly<Record<string, readonly string[]>> = {
      embercub: ["ember_rusher", "soot_warden"],
      mossboar: ["briar_charger", "moss_warden"],
      mistkit: ["mist_courser", "foam_warden"],
    }
    for (const [speciesId, ids] of Object.entries(expected)) {
      const found = forms
        .filter((branch) => branch.speciesId === speciesId)
        .map((branch) => branch.id)
        .sort()
      expect(found, speciesId).toEqual([...ids].sort())
    }
    const signatures = new Set<string>()
    for (const branch of forms) {
      if (branch.speciesId === null || branch.signatureMove === null) {
        throw new Error(`wave-4 branch ${branch.id} is not registered`)
      }
      const line = getSpecies(branch.speciesId)
      if (!line) throw new Error(`unknown species ${branch.speciesId}`)
      expect(getMove(branch.signatureMove)?.element, branch.id).toBe(
        line.element,
      )
      signatures.add(branch.signatureMove)
    }
    expect(signatures.size).toBe(6)
  })

  test("rival pools widen per tier to the fifteen-species roster (AC-6 sim half)", () => {
    // Pool construction mirrors production `prepareCup`: Bronze draws the
    // default three-starter pool, every higher tier the reward-gated pool
    // plus all six discovery lines. Draw coverage lives in
    // `cup/rival-roster.test.ts`; this pins the composition.
    expect(STARTER_SPECIES.map((species) => species.id)).toHaveLength(3)
    const sizes: Readonly<Record<LadderTier, number>> = {
      bronze: 3,
      silver: 11,
      gold: 13,
      legend: 15,
    }
    for (const tier of TIERS) {
      const pool =
        tier === "bronze"
          ? STARTER_SPECIES
          : [...obtainableSpecies(tier), ...DISCOVERY_SPECIES]
      const ids = pool.map((species) => species.id)
      expect(ids, `${tier} pool`).toHaveLength(sizes[tier])
      for (const id of WAVE4_IDS) {
        expect(ids.includes(id), `${id} at ${tier}`).toBe(tier !== "bronze")
      }
    }
  })
})
