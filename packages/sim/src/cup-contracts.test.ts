/**
 * Cup engine contracts — pinned for `cup_engine_consolidation_20261012`.
 *
 * The consolidation retired the legacy one-sitting cup engine
 * (`enterCup`/`resolveCup`/`runRound`); the live session path
 * (`startCupSession`/`resolvePlayerMatch`/`completeCup`/`forfeitCup`) is now
 * the sole resolver. These tests re-express what the old golden parity tests
 * guaranteed, as direct contracts on the surviving engine:
 *
 *   1. The full draw stream (species picks, names, stat jitters) and the
 *      per-pairing seed formula `(day*97 + round*13 + i*7) >>> 0` are pinned
 *      by golden outcomes for fixed (day, seed) inputs — any touch to the
 *      seed formula, the draw sequence, or battle resolution fails here.
 *   2. The placement mapping (champion 1 / final loss 2 / SF exit 3 / QF
 *      exit 4) and the double-KO tiebreak (`doubleKoWinner`) are pinned
 *      table-driven, including boundaries the golden runs cannot reach.
 *
 * The rival-seed formula is a reproducibility contract: existing saves and
 * future ghost/PvP replays depend on the same (day, seed) always drawing and
 * resolving the same tournament. Do not soften these expectations.
 */

import { describe, expect, test } from "bun:test"
import { doubleKoWinner, RIVAL_NAME_POOL, RIVAL_RAMP } from "./cup"
import type { Creature } from "./index"
import {
  advanceDay,
  BRACKET_SLOTS,
  CUP_ROUNDS,
  type CupSession,
  chooseStarter,
  completeCup,
  createInitialState,
  cupPlacement,
  defaultLoadout,
  forfeitCup,
  getSpecies,
  resolvePlayerMatch,
  startCupSession,
  type Tactic,
} from "./index"

/** A state standing on cup day 7 with a fresh creature (trained 0 days). */
function cupDayCreature(seed = 42, targetDay = 7): Creature {
  let s = advanceDay(chooseStarter(createInitialState(), "fire_drake", seed))
  while (s.day < targetDay) s = advanceDay(s)
  const creature = s.creature
  if (!creature) throw new Error("state has no creature")
  return creature
}

/** Default coach picks for a creature (equipped kit, given tactic). */
function picks(
  creature: Creature,
  tactic: Tactic,
): { loadout: readonly string[]; tactic: Tactic } {
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error("unknown species")
  return { loadout: defaultLoadout(creature, species), tactic }
}

/** Play the player's matches with the given picks to a conclusion. */
function playToCompletion(
  creature: Creature,
  day: number,
  seed: number,
  tactic: Tactic,
): CupSession {
  const { loadout, tactic: t } = picks(creature, tactic)
  let cur = startCupSession(creature, day, seed)
  while (cur.status === "player-turn") {
    cur = resolvePlayerMatch(cur, loadout, t).session
  }
  return cur
}

/** A minimal finished session for the placement table (placement only reads
 * status + playerVerdicts.length; other fields are inert filler). */
function finishedSession(
  status: "eliminated" | "champion",
  played: number,
): CupSession {
  return {
    bracket: {
      day: 7,
      slots: [],
      finalRival: {
        isPlayer: false,
        name: "filler",
        speciesId: "fire_drake",
        stats: { hp: 1, atk: 1, def: 1, spd: 1 },
      },
      rounds: CUP_ROUNDS,
      roundLabels: ["Quarterfinal", "Semifinal", "Final"],
      kind: "championship",
    },
    seed: 0,
    rivalResolutions: [],
    rivalVerdicts: [],
    playerVerdicts: Array.from({ length: played }, (_, i) => ({
      round: (i % CUP_ROUNDS) + 1,
      slotA: "player",
      slotB: "rival",
      winner: null,
      line: "",
      battle: null,
    })),
    completionVerdicts: [],
    nextPlayerRound: 0,
    nextOpponent: null,
    status,
    championName: null,
  }
}

describe("cup engine contracts: draw-stream golden (day 7, creature seed 42)", () => {
  // Captured from the live engine at consolidation time. The bracket draw is
  // a function of (day, seed) through the creature-identity rng stream —
  // species picks, name shuffle, and stat jitters are all positions in one
  // stream (see the STREAM-NEUTRAL notes in cup.ts).
  test("seed 101 draws the exact 8-slot field", () => {
    const session = startCupSession(cupDayCreature(), 7, 101)
    expect(
      session.bracket.slots.map((s) => `${s.name}(${s.speciesId})`),
    ).toEqual([
      "Ember Drake(fire_drake)",
      "Bonfire Brook(water_axolotl)",
      "Tidecaller Nibbles(plant_ox)",
      "Reedle Mirefin(plant_ox)",
      "Bramble Knoll Ox(plant_ox)",
      "Ash-ledger(fire_drake)",
      "Pondskipper Grub(fire_drake)",
      "Mossbottom Brute(water_axolotl)",
    ])
    expect(session.bracket.slots[1]?.stats).toEqual({
      hp: 83,
      atk: 10,
      def: 9,
      spd: 9,
    })
  })

  test("seed 202 draws a different field from the same creature", () => {
    const session = startCupSession(cupDayCreature(), 7, 202)
    expect(session.bracket.slots.map((s) => s.name)).toEqual([
      "Ember Drake",
      "Emberhold Flicker",
      "Driftbelle",
      "Bramble Knoll Ox",
      "Gilded Horn",
      "Bonfire Brook",
      "Ash-ledger",
      "Pondskipper Grub",
    ])
  })

  test("rival-subtree verdicts are golden per cup seed", () => {
    const creature = cupDayCreature()
    const cases: ReadonlyArray<{
      seed: number
      rivalWinners: readonly (string | null)[]
    }> = [
      {
        // HP-doubling ripple (element_chart_20261016): the QF1 double-KO
        // that used to sit on this seed resolved into a clean win — the
        // doubled HP pool let the higher-HP fighter survive the exchange.
        seed: 101,
        rivalWinners: [
          "Reedle Mirefin",
          "Ash-ledger",
          "Mossbottom Brute",
          "Mossbottom Brute",
        ],
      },
      {
        seed: 1,
        rivalWinners: [
          "Reedle Mirefin",
          "Ash-ledger",
          "Cindersnout",
          "Cindersnout",
        ],
      },
      // FR6 rebalance ripple: the double-KO that used to sit at QF4 moved
      // off this seed entirely (QF3 winner changed with it).
      {
        seed: 19,
        rivalWinners: [
          "Driftbelle",
          "Gilded Horn",
          "Reedle Mirefin",
          "Reedle Mirefin",
        ],
      },
    ]
    for (const { seed, rivalWinners } of cases) {
      const session = startCupSession(creature, 7, seed)
      expect(session.rivalVerdicts.map((v) => v.winner)).toEqual([
        ...rivalWinners,
      ])
      // Reveal order is strictly QF2, QF3, QF4, then SF2.
      expect(session.rivalVerdicts.map((v) => v.round)).toEqual([1, 1, 1, 2])
    }
  })
})

describe("cup engine contracts: player lifecycle golden (default picks)", () => {
  test("champion path: seed 17, placement 1 — and the tactic cannot change it", () => {
    // On cup day the default kit is two moves of cooldown 1, so both
    // tactics rank identically (the objectives only diverge when a
    // cooldown-2 move joins the kit). The champion path is therefore
    // pinned under BOTH tactics as a tactic-invariance guard for the
    // day-7 baby cup specifically.
    const creature = cupDayCreature()
    for (const tactic of ["specials", "balanced"] as const) {
      const done = playToCompletion(creature, 7, 17, tactic)
      expect(done.status).toBe("champion")
      expect(done.championName).toBe("Ember Drake")
      expect(cupPlacement(done)).toBe(1)
      expect(done.playerVerdicts.map((v) => v.line)).toEqual([
        "Ember Drake takes the Quarterfinal!",
        "Ember Drake takes the Semifinal!",
        "Ember Drake takes the Final!",
      ])
      expect(done.playerVerdicts.map((v) => v.winner)).toEqual([
        "Ember Drake",
        "Ember Drake",
        "Ember Drake",
      ])
    }
  })

  test("final loss: seed 6, balanced — placement 2, champion via completeCup", () => {
    const creature = cupDayCreature()
    const elim = playToCompletion(creature, 7, 6, "balanced")
    expect(elim.status).toBe("eliminated")
    expect(elim.playerVerdicts).toHaveLength(3)
    expect(elim.playerVerdicts[2]?.winner).toBe("Pondskipper Grub")
    expect(cupPlacement(elim)).toBe(2)
    // The final loss leaves the SF2 winner as champion: no more fights.
    const done = completeCup(elim)
    expect(done.championName).toBe("Pondskipper Grub")
    expect(done.completionVerdicts).toHaveLength(0)
  })

  test("SF exit: seed 2, balanced — placement 3, conqueror runs the final", () => {
    const creature = cupDayCreature()
    const elim = playToCompletion(creature, 7, 2, "balanced")
    expect(elim.status).toBe("eliminated")
    expect(elim.playerVerdicts).toHaveLength(2)
    expect(cupPlacement(elim)).toBe(3)
    const done = completeCup(elim)
    expect(done.championName).toBe("Bonfire Brook")
    expect(
      done.completionVerdicts.map((v) => [v.round, v.slotA, v.slotB, v.winner]),
    ).toEqual([[3, "Bramble Knoll Ox", "Bonfire Brook", "Bonfire Brook"]])
  })

  test("QF exit: seed 101, balanced — placement 4, bracket completes in order", () => {
    const creature = cupDayCreature()
    const elim = playToCompletion(creature, 7, 101, "balanced")
    expect(elim.status).toBe("eliminated")
    expect(elim.playerVerdicts).toHaveLength(1)
    expect(cupPlacement(elim)).toBe(4)
    const done = completeCup(elim)
    expect(done.championName).toBe("Reedle Mirefin")
    expect(
      done.completionVerdicts.map((v) => [v.round, v.slotA, v.slotB, v.winner]),
    ).toEqual([
      [2, "Bonfire Brook", "Reedle Mirefin", "Reedle Mirefin"],
      [3, "Reedle Mirefin", "Mossbottom Brute", "Reedle Mirefin"],
    ])
  })

  test("forfeit at the QF: seed 101 — as-if-lost placement 4, conqueror plays SF1", () => {
    const creature = cupDayCreature()
    const done = forfeitCup(startCupSession(creature, 7, 101))
    expect(done.status).toBe("eliminated")
    expect(cupPlacement(done)).toBe(4)
    expect(done.championName).toBe("Reedle Mirefin")
    // The forfeit verdict names the opponent, no battle attached.
    const ff = done.playerVerdicts[0]
    expect(ff?.winner).toBe("Bonfire Brook")
    expect(ff?.battle).toBeNull()
    expect(ff?.line).toBe(
      "Bonfire Brook advances — Ember Drake forfeits the Quarterfinal.",
    )
    // Completion includes the conqueror's SF1 (round 2, pairing 0).
    expect(
      done.completionVerdicts.map((v) => [v.round, v.slotA, v.slotB, v.winner]),
    ).toEqual([
      [2, "Bonfire Brook", "Reedle Mirefin", "Reedle Mirefin"],
      [3, "Reedle Mirefin", "Mossbottom Brute", "Reedle Mirefin"],
    ])
  })

  test("forfeit at the QF: seed 1 — SF1 pairs the conqueror with the QF2 winner", () => {
    const creature = cupDayCreature()
    const done = forfeitCup(startCupSession(creature, 7, 1))
    expect(done.championName).toBe("Cindersnout")
    expect(
      done.completionVerdicts.map((v) => [v.round, v.slotA, v.slotB, v.winner]),
    ).toEqual([
      [2, "Mossbottom Brute", "Reedle Mirefin", "Reedle Mirefin"],
      [3, "Reedle Mirefin", "Cindersnout", "Cindersnout"],
    ])
  })

  test("cup seed 101 at day 14 keeps the same draw for the same seed", () => {
    // The bracket rng is seeded by the cup seed alone; the day enters the
    // per-pairing battle seeds (day*97 + …). Both rows are pinned so a
    // change to either channel is caught.
    const session = startCupSession(cupDayCreature(), 14, 101)
    expect(session.bracket.slots.map((s) => s.name)).toEqual([
      "Ember Drake",
      "Bonfire Brook",
      "Tidecaller Nibbles",
      "Reedle Mirefin",
      "Bramble Knoll Ox",
      "Ash-ledger",
      "Pondskipper Grub",
      "Mossbottom Brute",
    ])
    expect(session.rivalVerdicts.map((v) => v.winner)).toEqual([
      "Tidecaller Nibbles",
      "Ash-ledger",
      "Mossbottom Brute",
      "Mossbottom Brute",
    ])
  })
})

describe("cup engine contracts: placement mapping (table-driven)", () => {
  test("champion → 1; final loss → 2; SF exit → 3; QF exit and earlier → 4", () => {
    expect(cupPlacement(finishedSession("champion", 3))).toBe(1)
    expect(cupPlacement(finishedSession("eliminated", 3))).toBe(2)
    expect(cupPlacement(finishedSession("eliminated", 2))).toBe(3)
    expect(cupPlacement(finishedSession("eliminated", 1))).toBe(4)
    expect(cupPlacement(finishedSession("eliminated", 0))).toBe(4)
  })

  test("placement counts rounds played, not wins (draws still advance)", () => {
    // A drawn verdict that advanced the player must not under-place them:
    // three played verdicts (one a draw) still reads final loss → 2.
    const drawn = finishedSession("eliminated", 3)
    expect(drawn.playerVerdicts.every((v) => v.winner === null)).toBe(true)
    expect(cupPlacement(drawn)).toBe(2)
  })
})

describe("cup engine contracts: double-KO tiebreak (doubleKoWinner)", () => {
  const a = {
    isPlayer: true,
    name: "Player",
    speciesId: "fire_drake",
    stats: { hp: 10, atk: 1, def: 1, spd: 1 },
  }
  const b = {
    isPlayer: false,
    name: "Rival",
    speciesId: "plant_ox",
    stats: { hp: 10, atk: 1, def: 1, spd: 1 },
  }

  test("higher remaining HP advances", () => {
    expect(doubleKoWinner(a, b, { Player: 5, Rival: 3 }).name).toBe("Player")
    expect(doubleKoWinner(a, b, { Player: 2, Rival: 9 }).name).toBe("Rival")
  })

  test("exact tie falls to the earlier slot; missing entries read as 0", () => {
    expect(doubleKoWinner(a, b, { Player: 4, Rival: 4 }).name).toBe("Player")
    expect(doubleKoWinner(a, b, {}).name).toBe("Player")
    expect(doubleKoWinner(a, b, { Player: 1 }).name).toBe("Player")
    expect(doubleKoWinner(a, b, { Rival: 1 }).name).toBe("Rival")
  })
})

describe("cup engine contracts: shape constants", () => {
  test("Bronze cup topology and rival ramp stay as shipped", () => {
    expect(BRACKET_SLOTS).toBe(8)
    expect(CUP_ROUNDS).toBe(3)
    expect(RIVAL_RAMP).toEqual([-0.05, -0.05, -0.05, -0.05, 0, 0, 0.05])
    expect(RIVAL_NAME_POOL).toHaveLength(12)
  })
})
