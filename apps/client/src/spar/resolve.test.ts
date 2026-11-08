/**
 * The spar's verdict (continuous-arena-battle FR-13, FR-15): a spar is a new
 * fight, so it resolves on the continuous engine and carries the dense trace
 * the arena plays. Replaying the same seed yields the same events — nothing
 * here reaches the frozen gauge clock.
 */
import { describe, expect, test } from "bun:test"
import { createCreature, makeExhibition, streamOf } from "@apex/sim"
import { resolveSpar } from "./resolve"

const drake = createCreature("fire_drake", 7)
const SEED = 4242

describe("resolveSpar", () => {
  test("a spar resolves on the continuous engine with its dense trace", () => {
    const setup = makeExhibition(drake, "balanced", SEED)
    const verdict = resolveSpar(setup, SEED)
    // A trace is the signature of the live path: the gauge clock cannot
    // file one (clock.freeze.test.ts).
    expect(streamOf(verdict)).toBeDefined()
    expect(verdict.events.length).toBeGreaterThan(0)
  })

  test("the same seed replays the same events", () => {
    const first = resolveSpar(makeExhibition(drake, "specials", SEED), SEED)
    const second = resolveSpar(makeExhibition(drake, "specials", SEED), SEED)
    expect(second.events).toEqual(first.events)
    expect(second.winner).toBe(first.winner)
    expect(second.finalHp).toEqual(first.finalHp)
  })
})
