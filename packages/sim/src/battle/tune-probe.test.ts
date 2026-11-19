import { describe, expect, test } from "bun:test"
import { getSpecies } from "../species/catalog"

// Roster Wave 2 pins the authored stat envelopes chosen by the balance search,
// including the two owner-approved existing-bound retunes. The envelopes are
// deliberately narrow: the matrix measures each species at its midpoint, so
// drifting a bound can push a record outside its statistical band.
const ENVELOPES = {
  thornvolt: { hp: [145, 155], atk: [14, 16], def: [8, 10], spd: [14, 16] },
  siltback: { hp: [160, 190], atk: [12, 15], def: [12, 15], spd: [6, 9] },
  emberwing: { hp: [135, 165], atk: [15, 18], def: [6, 9], spd: [13, 16] },
  voltfox: { hp: [144, 174], atk: [9, 12], def: [6, 9], spd: [10, 14] },
  embercub: { hp: [152, 181], atk: [9, 13], def: [8, 11], spd: [8, 11] },
} as const

describe("Roster Wave 2 authored stat envelopes", () => {
  for (const [id, bounds] of Object.entries(ENVELOPES)) {
    test(`${id} keeps its authored bounds`, () => {
      expect(getSpecies(id)?.statBounds).toEqual(bounds)
    })
  }
})
