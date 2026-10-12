/**
 * TEMPORARY bridge parity test — `cup_engine_consolidation_20261012` Phase 1.
 *
 * Proves the live session engine (`startCupSession`/`resolvePlayerMatch`/
 * `completeCup`) reproduces the legacy one-sitting engine (`resolveCup`)
 * byte-identically for the same (day, seed) and default coach picks
 * (equipped loadout, balanced tactic — the legacy resolver's fixed picks).
 *
 * This file exists ONLY as the safety net for deleting the legacy path in
 * Phase 2: it is removed together with `enterCup`/`resolveCup`/`runRound`
 * (the lasting contracts live in cup-contracts.test.ts).
 */

import { describe, expect, test } from "bun:test"
import type { Creature, CupSession, RoundVerdict } from "./index"
import {
  advanceDay,
  chooseStarter,
  completeCup,
  createInitialState,
  cupPlacement,
  defaultLoadout,
  getSpecies,
  makeBracket,
  resolveCup,
  resolvePlayerMatch,
  startCupSession,
} from "./index"

function cupDayCreature(seed = 42, targetDay = 7): Creature {
  let s = advanceDay(chooseStarter(createInitialState(), "fire_drake", seed))
  while (s.day < targetDay) s = advanceDay(s)
  const creature = s.creature
  if (!creature) throw new Error("state has no creature")
  return creature
}

/** All verdicts of the legacy one-sitting engine, flattened in resolve order. */
function legacyVerdicts(
  creature: Creature,
  day: number,
  seed: number,
): RoundVerdict[] {
  const bracket = makeBracket(creature, day, seed)
  const result = resolveCup(bracket, creature)
  return result.rounds.flatMap((r) => [...r.verdicts])
}

/** All verdicts of the live engine for the same (day, seed), default picks. */
function playLive(creature: Creature, day: number, seed: number): CupSession {
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error("unknown species")
  const loadout = defaultLoadout(creature, species)
  let cur = startCupSession(creature, day, seed)
  while (cur.status === "player-turn") {
    cur = resolvePlayerMatch(cur, loadout, "balanced").session
  }
  // An eliminated player leaves the bracket unfinished; the legacy engine
  // always plays to a champion, so close it the same way the client does.
  if (cur.status === "eliminated") cur = completeCup(cur)
  return cur
}

/** All verdicts of the live engine for the same (day, seed). */
function liveVerdicts(
  creature: Creature,
  day: number,
  seed: number,
): RoundVerdict[] {
  const cur = playLive(creature, day, seed)
  const all = [
    ...cur.rivalVerdicts,
    ...cur.playerVerdicts,
    ...cur.completionVerdicts,
  ]
  // The live engine resolves the player's branch on demand, so its reveal
  // order differs from the legacy pairing order; byPairing normalizes both.
  return all
}

/** Sort verdicts by pairing identity (round + fighters) for comparison. */
function byPairing(verdicts: readonly RoundVerdict[]): RoundVerdict[] {
  return [...verdicts].sort((x, y) =>
    `${x.round}|${x.slotA}|${x.slotB}`.localeCompare(
      `${y.round}|${y.slotA}|${y.slotB}`,
    ),
  )
}

describe("bridge: legacy one-sitting engine ≡ live session engine (byte parity)", () => {
  const DAY = 7
  const cases: ReadonlyArray<{
    seed: number
    expectedPlacement: 1 | 2 | 3 | 4
    label: string
  }> = [
    { seed: 21, expectedPlacement: 1, label: "champion run" },
    { seed: 6, expectedPlacement: 2, label: "final loss" },
    { seed: 1, expectedPlacement: 3, label: "SF exit" },
    { seed: 101, expectedPlacement: 4, label: "QF exit" },
  ]

  for (const { seed, expectedPlacement, label } of cases) {
    test(`${label} (seed ${seed}): identical verdicts, champion, placement`, () => {
      const creature = cupDayCreature()
      const bracket = makeBracket(creature, DAY, seed)
      const legacy = resolveCup(bracket, creature)
      const live = playLive(creature, DAY, seed)

      expect(legacy.playerPlacement).toBe(expectedPlacement)
      expect(cupPlacement(live)).toBe(expectedPlacement)

      // Same champion (null on both sides only if the final double-KOs —
      // neither golden case does; keep the assertion strict).
      expect(live.championName).not.toBeNull()
      expect(legacy.championName).toBe(live.championName)

      // Every pairing resolved identically — including the full battle
      // replay (deep equality over the BattleResult: events, finalHp, …).
      const legacySorted = byPairing(legacyVerdicts(creature, DAY, seed))
      const liveSorted = byPairing(liveVerdicts(creature, DAY, seed))
      expect(liveSorted).toHaveLength(legacySorted.length)
      for (let i = 0; i < legacySorted.length; i++) {
        const a = legacySorted[i]
        const b = liveSorted[i]
        if (!a || !b) throw new Error(`verdict ${i} missing`)
        expect(`${b.round}|${b.slotA}|${b.slotB}`).toBe(
          `${a.round}|${a.slotA}|${a.slotB}`,
        )
        expect(b.winner).toBe(a.winner)
        expect(b.line).toBe(a.line)
        expect(b.battle).toEqual(a.battle)
      }
    })
  }
})
