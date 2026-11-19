import { describe, expect, test } from "bun:test"
import { matchups } from "../../../scripts/battle-telemetry"
import { ALL_SPECIES } from "../../species/catalog"

// Structural proof for the 21-species telemetry sample. The measure-level
// invariants (bounds, cap share, coverage) live in `telemetry.test.ts`; this
// test pins only the written walk rule so a future roster change cannot
// silently reintroduce mirrors or lose away-side coverage.
describe("telemetry walk structure", () => {
  const pairs = matchups()

  test("42 distinct, mirror-free pairings", () => {
    expect(pairs).toHaveLength(42)
    const keys = pairs.map((pair) => `${pair.home.id}/${pair.away.id}`)
    expect(new Set(keys).size).toBe(42)
    for (const pair of pairs) {
      expect(pair.home.id).not.toBe(pair.away.id)
    }
  })

  test("every species appears at least twice on each side", () => {
    const home = new Map<string, number>()
    const away = new Map<string, number>()
    for (const pair of pairs) {
      home.set(pair.home.id, (home.get(pair.home.id) ?? 0) + 1)
      away.set(pair.away.id, (away.get(pair.away.id) ?? 0) + 1)
    }
    for (const species of ALL_SPECIES) {
      expect(home.get(species.id) ?? 0).toBeGreaterThanOrEqual(2)
      expect(away.get(species.id) ?? 0).toBeGreaterThanOrEqual(2)
    }
  })
})
