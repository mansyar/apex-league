import { describe, expect, test } from "bun:test"
import {
  chooseStarter,
  createInitialState,
  makeBracket,
  resolveCup,
  type GameState,
} from "./index"
import { advanceDay } from "./ticker"
import { prepareCup } from "./machine"

/** A state standing on cup day 7 with a live creature (phase "cup"). */
function cupDayState(seed = 42): GameState {
  let s = advanceDay(chooseStarter(createInitialState(), "fire_drake", seed))
  while (s.day < 7) s = advanceDay(s)
  return s
}

describe("prepareCup — the live cup session (design locked, pre-resolution)", () => {
  test("returns a session whose bracket is the seeded 8-slot field", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    expect(session.bracket.slots.length).toBe(8)
    expect(session.bracket.slots[0]?.isPlayer).toBe(true)
    expect(session.bracket.day).toBe(7)
  })

  test("pre-resolves exactly the player-independent subtree: QF2, QF3, QF4, SF2", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    expect(session.rivalVerdicts.length).toBe(4)
    const slots = session.bracket.slots
    const slotName = (i: number): string => {
      const slot = slots[i]
      if (!slot) throw new Error(`missing slot ${i}`)
      return slot.name
    }
    // Round-1 rival pairings in bracket order.
    const [qf2, qf3, qf4, sf2] = session.rivalVerdicts
    if (!qf2 || !qf3 || !qf4 || !sf2) throw new Error("missing rival verdicts")
    expect(qf2.slotA).toBe(slotName(2))
    expect(qf2.slotB).toBe(slotName(3))
    expect(qf2.round).toBe(1)
    expect(qf3.slotA).toBe(slotName(4))
    expect(qf3.slotB).toBe(slotName(5))
    expect(qf4.slotA).toBe(slotName(6))
    expect(qf4.slotB).toBe(slotName(7))
    // SF2 joins the QF3/QF4 winners.
    expect(sf2.round).toBe(2)
    expect([qf3.winner, qf4.winner]).toContain(sf2.slotA)
    expect([qf3.winner, qf4.winner]).toContain(sf2.slotB)
    // None of the pre-resolved pairings involve the player.
    for (const v of session.rivalVerdicts) {
      expect(v.slotA).not.toBe(s.creature?.name)
      expect(v.slotB).not.toBe(s.creature?.name)
    }
  })

  test("every pre-resolved verdict carries replayable battle events", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    for (const v of session.rivalVerdicts) {
      expect(v.battle.events.length).toBeGreaterThan(0)
      expect(v.battle.winner).toBe(v.winner)
    }
  })

  test("is pure: the state is untouched and the phase stays cup", () => {
    const s = cupDayState()
    const before = JSON.stringify(s)
    prepareCup(s)
    expect(JSON.stringify(s)).toBe(before)
    expect(s.phase).toBe("cup")
  })

  test("is deterministic from (day, identity): same state → same session", () => {
    const s = cupDayState()
    const a = prepareCup(s)
    const b = prepareCup(s)
    expect(a).toEqual(b)
  })

  test("different creatures on the same day draw different fields", () => {
    const a = prepareCup(cupDayState(42))
    const b = prepareCup(cupDayState(77))
    expect(a?.bracket.slots.map((x) => x.name)).not.toEqual(
      b?.bracket.slots.map((x) => x.name),
    )
  })

  test("rival battles are byte-identical with the legacy one-sitting resolver", () => {
    // The per-pairing seed formula and side assembly are unchanged, so the
    // pre-resolved verdicts must equal the legacy resolveCup verdicts at
    // the same bracket positions — the live flow is a reorganization of
    // the same tournament, not a re-roll of it.
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session || !s.creature) throw new Error("session did not resolve")
    const legacy = resolveCup(session.bracket, s.creature)
    const legacyRound1 = legacy.rounds[0]?.verdicts ?? []
    expect(session.rivalVerdicts[0]).toEqual(legacyRound1[1])
    expect(session.rivalVerdicts[1]).toEqual(legacyRound1[2])
    expect(session.rivalVerdicts[2]).toEqual(legacyRound1[3])
    expect(session.rivalVerdicts[3]).toEqual(legacy.rounds[1]?.verdicts[1])
  })

  test("returns null without a creature (illegal entry)", () => {
    expect(prepareCup(createInitialState())).toBeNull()
  })
})
