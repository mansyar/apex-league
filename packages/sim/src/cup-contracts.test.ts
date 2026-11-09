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
  CONDITION_START,
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

/**
 * A state standing on cup day 7 with a fresh creature (trained 0 days).
 *
 * The nightly tick never feeds, so a creature left to `advanceDay` alone
 * arrives starving, sick (health 60), and — once form exists — sluggish.
 * These contracts pin the day-7 baby cup (draws, ramp, pairings, placement),
 * not neglect, so the fixture is restored to the condition it is named for:
 * `CONDITION_START` scores exactly 40, the steady tier, which keeps
 * `battleStats` identical to `effectiveStats` (AC-1). Neglect is exercised
 * deliberately in cup/form-seam.test.ts and in the form balance probe.
 */
function cupDayCreature(seed = 42, targetDay = 7): Creature {
  let s = advanceDay(chooseStarter(createInitialState(), "fire_drake", seed))
  while (s.day < targetDay) s = advanceDay(s)
  const creature = s.creature
  if (!creature) throw new Error("state has no creature")
  return { ...creature, conditions: { ...CONDITION_START } }
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
      hp: 172,
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
        // Continuous-engine ripple (phase 7): the SF2 pairing now resolves
        // to Ash-ledger instead of a second Mossbottom Brute win.
        // Hit-reaction ripple (phase 9): knockback moved SF2 back to
        // Mossbottom Brute.
        // Pacing ripple (phase 10): longer fights moved QF1 to Tidecaller
        // Nibbles; SF2 stayed on Mossbottom Brute.
        // Recovery-band ripple (spacing/cadence phase 5): the wider tail flips
        // QF2 from Tidecaller Nibbles to Reedle Mirefin; the rest hold.
        // Blow-weight ripple (phase 6): the triple-length cycle flips QF2 back
        // to Tidecaller Nibbles; SF2 and the final stay on Mossbottom Brute.
        // Blow-weight ripple (phase 8, weight 2): QF2 flips back to Reedle
        // Mirefin; SF2 and the final hold.
        seed: 101,
        // Doctrine ripple (battle-balance phase 1): QF1 moves to Tidecaller
        // Nibbles; the other three rows hold.
        // Controller ripple (battle-balance phase 3): QF1 moves to Reedle
        // Mirefin; the other three rows hold.
        rivalWinners: [
          "Reedle Mirefin",
          "Ash-ledger",
          "Mossbottom Brute",
          "Mossbottom Brute",
        ],
      },
      {
        seed: 1,
        // Pacing ripple (battle-balance phase 8, FR-20): QF2 moves to
        // Ash-ledger and SF2 to Cindersnout.
        rivalWinners: [
          "Reedle Mirefin",
          "Ash-ledger",
          "Cindersnout",
          "Cindersnout",
        ],
      },
      // FR6 rebalance ripple: the double-KO that used to sit at QF4 moved
      // off this seed entirely (QF3 winner changed with it).
      // Continuous-engine ripple (phase 7): QF4 and SF2 both moved again.
      // Contact-geometry ripple (phase 8): lock-on facing and body volumes
      // moved QF2 and SF2 once more.
      // Pacing ripple (phase 10): QF2 and SF2 moved again — Gilded Horn takes
      // QF2 and Tidecaller Nibbles takes SF2.
      // Blow-weight ripple (phase 6): QF4 and SF2 go back to Reedle Mirefin,
      // as they were before the widening.
      // Blow-weight ripple (phase 8, weight 2): QF4 and SF2 move to Tidecaller
      // Nibbles.
      // Variance ripple (phase 10, FR-21): the accuracy roll and damage spread
      // are live, so QF3 moved from Gilded Horn to Thistledown Ash. Rework 1
      // narrowed the spread floor and it moved back; the roll is what decides it.
      {
        seed: 19,
        rivalWinners: [
          "Driftbelle",
          "Gilded Horn",
          "Tidecaller Nibbles",
          "Tidecaller Nibbles",
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
  test("champion path: seed 17, balanced — placement 1", () => {
    // The continuous engine makes the tactic a real coaching choice: the
    // same seed that sweeps the bracket under `balanced` falls in the
    // quarterfinal under `specials` (pinned at the end of this test).
    const creature = cupDayCreature()
    const done = playToCompletion(creature, 7, 17, "balanced")
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
    // Tactic sensitivity, re-pinned for the pacing pass (battle-balance phase 8,
    // FR-20): the shorter fights let both picks sweep seed 1 now. The band
    // phase had pinned both losing the final; the pacing pass flipped the seed.
    const balancedOne = playToCompletion(creature, 7, 1, "balanced")
    expect(balancedOne.status).toBe("champion")
    expect(cupPlacement(balancedOne)).toBe(1)
    const specialsOne = playToCompletion(creature, 7, 1, "specials")
    expect(specialsOne.status).toBe("champion")
    expect(cupPlacement(specialsOne)).toBe(1)
  })

  test("final loss: seed 9, specials — placement 2, champion via completeCup", () => {
    const creature = cupDayCreature()
    const elim = playToCompletion(creature, 7, 9, "specials")
    expect(elim.status).toBe("eliminated")
    expect(elim.playerVerdicts).toHaveLength(3)
    expect(elim.playerVerdicts[2]?.winner).toBe("Mossbottom Brute")
    expect(cupPlacement(elim)).toBe(2)
    // The final loss leaves the SF2 winner as champion: no more fights.
    const done = completeCup(elim)
    expect(done.championName).toBe("Mossbottom Brute")
    expect(done.completionVerdicts).toHaveLength(0)
  })

  test("semifinal exit: seed 3, specials — placement 3", () => {
    const creature = cupDayCreature()
    // Re-pinned for the damage band (battle-balance phase 4): the compressed
    // band hands the semifinal to Thistledown Ash, so the champion path this
    // test used to pin is now a semifinal exit.
    const done = playToCompletion(creature, 7, 3, "specials")
    expect(done.status).toBe("eliminated")
    expect(done.playerVerdicts).toHaveLength(2)
    expect(cupPlacement(done)).toBe(3)
    expect(done.completionVerdicts).toHaveLength(0)
  })

  test("semifinal exit: seed 11, specials — placement 3", () => {
    // Pacing ripple (battle-balance phase 8, FR-20): the shorter fights hand the
    // semifinal to Gilded Horn, so the final-loss pin moved off this seed. The
    // doctrine ripple (phase 1) had sent the `specials` pick to the final.
    const creature = cupDayCreature()
    const elim = playToCompletion(creature, 7, 11, "specials")
    expect(elim.status).toBe("eliminated")
    expect(elim.playerVerdicts).toHaveLength(2)
    expect(elim.playerVerdicts[1]?.winner).toBe("Gilded Horn")
    expect(cupPlacement(elim)).toBe(3)
    const done = completeCup(elim)
    expect(done.championName).toBe("Emberhold Flicker")
    expect(
      done.completionVerdicts.map((v) => [v.round, v.slotA, v.slotB, v.winner]),
    ).toEqual([[3, "Gilded Horn", "Emberhold Flicker", "Emberhold Flicker"]])
  })

  test("forfeit at the QF: seed 101 — as-if-lost placement 4, conqueror plays SF1", () => {
    const creature = cupDayCreature()
    const done = forfeitCup(startCupSession(creature, 7, 101))
    expect(done.status).toBe("eliminated")
    expect(cupPlacement(done)).toBe(4)
    // Pacing ripple (phase 10): Tidecaller Nibbles takes SF2 and the final.
    // Recovery-band ripple (spacing/cadence phase 5): QF2 flips to Reedle
    // Mirefin, who then takes SF1 and the final.
    // Blow-weight ripple (phase 6): QF2 flips back to Tidecaller Nibbles, and
    // Mossbottom Brute takes SF1 and the final.
    // Doctrine ripple (battle-balance phase 1): QF2 moves to Tidecaller
    // Nibbles, who then loses SF1 to Bonfire Brook; Mossbottom Brute takes the
    // final.
    // Controller ripple (battle-balance phase 3): Reedle Mirefin takes SF1 and
    // the final.
    // Variance ripple (battle-balance phase 10, FR-21): the accuracy roll and
    // damage spread are live. Rework 1 narrowed the spread floor and the final
    // returns to Reedle Mirefin, as it stood before the variance pass.
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
    // Pacing ripple (battle-balance phase 8, FR-20): Cindersnout takes SF1 and
    // the final now; the controller pass (phase 3) had Thistledown Ash winning.
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
    // Re-pinned for the HP re-tune (spacing/cadence phase 4): QF1 is now a
    // double knockout (winner null). The bracket still advances via the cup's
    // double-KO tiebreak; only the verdict's winner is null.
    // Recovery-band ripple (spacing/cadence phase 5): QF2 is a clean win again.
    // Doctrine ripple (battle-balance phase 1): QF2 moves to Tidecaller
    // Nibbles; the other rows hold.
    // Controller ripple (battle-balance phase 3): SF2 moves to Ash-ledger.
    // Damage-band ripple (battle-balance phase 4): SF2 moves to Mossbottom
    // Brute.
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
