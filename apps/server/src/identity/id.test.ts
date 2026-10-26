import { describe, expect, test } from "bun:test"
import { newTrainerId } from "./id"

/**
 * A trainer id is the credential a player carries between devices, so the only
 * properties that matter are the ones a guesser would need to break: it must be
 * unguessable, and it must reveal nothing about the player or about other ids.
 */
const SHAPE = /^trn_[0-9a-hjkmnp-tv-z]{20}$/

describe("trainer ids", () => {
  test("are opaque tokens with a recognisable prefix", () => {
    const id = newTrainerId()

    expect(id).toMatch(SHAPE)
    // 20 characters of base32 is 100 bits: not a counter and not a timestamp.
    expect(id).not.toContain("undefined")
  })

  test("never repeat", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newTrainerId()))

    expect(ids.size).toBe(500)
  })

  test("are not sequential, so one id says nothing about the next", () => {
    // A counter would keep its generation order once sorted. Random ids almost
    // never do; 32 samples make an accidental match impossible in practice.
    const generated = Array.from({ length: 32 }, () => newTrainerId())
    const sorted = [...generated].sort()

    expect(sorted).not.toEqual(generated)
  })

  test("carry no personal data and no timestamp", () => {
    const id = newTrainerId()

    expect(id.slice(4)).not.toMatch(/^\d+$/)
    expect(id).not.toMatch(/@/)
    expect(id.toLowerCase()).toBe(id)
  })
})
