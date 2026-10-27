import { describe, expect, test } from "bun:test"
import {
  ghostBytes,
  isPlausibleGhost,
  isWithinGhostLimit,
  MAX_GHOST_BYTES,
} from "./caps"
import { validGhostBundle } from "./fixtures"

describe("ghost plausibility caps", () => {
  test("accepts a well-formed bundle", () => {
    expect(isPlausibleGhost(validGhostBundle())).toBe(true)
  })

  test("a future sim version stays plausible: the client skips the replay, the listing keeps the entry", () => {
    expect(isPlausibleGhost({ ...validGhostBundle(), simVersion: 999 })).toBe(
      true,
    )
  })

  test("rejects non-bundles", () => {
    for (const value of [null, undefined, 42, "ghost", [], []]) {
      expect(isPlausibleGhost(value)).toBe(false)
    }
  })

  test("rejects a bad version pin", () => {
    for (const simVersion of [-1, 1.5, "1", Number.NaN, undefined]) {
      expect(isPlausibleGhost({ ...validGhostBundle(), simVersion })).toBe(
        false,
      )
    }
  })

  test("rejects bad seed, day, or round", () => {
    expect(isPlausibleGhost({ ...validGhostBundle(), seed: -1 })).toBe(false)
    expect(isPlausibleGhost({ ...validGhostBundle(), day: 1.5 })).toBe(false)
    const shapeless = validGhostBundle()
    delete shapeless.round
    expect(isPlausibleGhost(shapeless)).toBe(false)
  })

  test("rejects sides without a name, an element, a kit, or stats", () => {
    const bundle = validGhostBundle()
    expect(isPlausibleGhost({ ...bundle, player: undefined })).toBe(false)
    expect(
      isPlausibleGhost({
        ...bundle,
        player: { ...(bundle.player as Record<string, unknown>), name: "" },
      }),
    ).toBe(false)
    expect(
      isPlausibleGhost({
        ...bundle,
        rival: { ...(bundle.rival as Record<string, unknown>), kit: [] },
      }),
    ).toBe(false)
    expect(
      isPlausibleGhost({
        ...bundle,
        player: {
          ...(bundle.player as Record<string, unknown>),
          kit: ["pyre_strike", 42],
        },
      }),
    ).toBe(false)
    const statless = { ...(bundle.player as Record<string, unknown>) }
    delete statless.stats
    expect(isPlausibleGhost({ ...bundle, rival: statless })).toBe(false)
    // An element-less side would list but never bout: the store and the
    // spar reader agree on fightability (F3).
    const elementless = { ...(bundle.player as Record<string, unknown>) }
    delete elementless.element
    expect(isPlausibleGhost({ ...bundle, player: elementless })).toBe(false)
    expect(
      isPlausibleGhost({
        ...bundle,
        rival: {
          ...(bundle.rival as Record<string, unknown>),
          element: "",
        },
      }),
    ).toBe(false)
  })

  test("a null winner (drawn final) is plausible, a non-name is not", () => {
    expect(isPlausibleGhost({ ...validGhostBundle(), winner: null })).toBe(true)
    expect(isPlausibleGhost({ ...validGhostBundle(), winner: 42 })).toBe(false)
  })

  test("rejects a missing, empty, or malformed event log", () => {
    expect(isPlausibleGhost({ ...validGhostBundle(), events: [] })).toBe(false)
    expect(isPlausibleGhost({ ...validGhostBundle(), events: "impact" })).toBe(
      false,
    )
    const [first, ...rest] = validGhostBundle().events as Record<
      string,
      unknown
    >[]
    expect(isPlausibleGhost({ ...validGhostBundle(), events: rest })).toBe(true)
    expect(
      isPlausibleGhost({
        ...validGhostBundle(),
        events: [{ ...first, tick: -1 }, ...rest],
      }),
    ).toBe(false)
    expect(
      isPlausibleGhost({
        ...validGhostBundle(),
        events: [{ ...first, hpAfter: undefined }, ...rest],
      }),
    ).toBe(false)
  })

  test("shape and size are separate rails: a padded bundle is implausible nowhere, oversized somewhere", () => {
    const padded = {
      ...validGhostBundle(),
      events: [
        {
          tick: 1,
          kind: "impact",
          actor: "Ember Drake",
          hpAfter: { player: 120, rival: 76 },
          line: "x".repeat(MAX_GHOST_BYTES),
        },
      ],
    }
    expect(isPlausibleGhost(padded)).toBe(true)
    expect(isWithinGhostLimit(padded)).toBe(false)
    expect(isWithinGhostLimit(validGhostBundle())).toBe(true)
  })

  test("size counts bytes, not characters", () => {
    // Two UTF-16 units but four bytes in UTF-8: a character count would let
    // through a body the byte cap must refuse.
    const ember = "🔥".repeat(32 * 1024)
    expect(ember.length).toBe(64 * 1024)
    expect(ghostBytes({ line: ember })).toBeGreaterThan(128 * 1024)
  })
})
