import { describe, expect, test } from "bun:test"
import type { CreatureStats, Element } from "../creature"

// Phase E: the pure tactic/temperament policy. No clock, no seed, no rng:
// the choice is a total function of the snapshots, the tactic, the kit, and
// the fighter's action count.

import type { ClockFighter, PlannedAction } from "./clock"
import { BASIC, CLOSE, HOLD } from "./clock"
import { chooseAction, type Tactic } from "./policy"

function special(moveId: string): PlannedAction {
  return { kind: "special", moveId }
}

function fight(
  name: string,
  element: Element,
  s: Partial<CreatureStats> = {},
): ClockFighter {
  const stats: CreatureStats = {
    hp: s.hp ?? 40,
    atk: s.atk ?? 10,
    def: s.def ?? 10,
    spd: s.spd ?? 12,
  }
  return {
    name,
    element,
    stats,
    hp: stats.hp,
    range: "far",
    gauge: 0,
    cooldowns: {},
    staggered: false,
  }
}

function cooled(f: ClockFighter, moveId: string, n: number): ClockFighter {
  return { ...f, cooldowns: { ...f.cooldowns, [moveId]: n } }
}

function near(f: ClockFighter): ClockFighter {
  return { ...f, range: "near" }
}

const DRAKE_KIT = [
  "spark",
  "flame_charge",
  "cinder_shot",
  "blaze_bolt",
] as const
const OX_KIT = [
  "seed_shot",
  "thorn_volley",
  "spore_burst",
  "bramble_dart",
] as const

const drake = fight("Bolt", "fire", { hp: 45 })
const ox = fight("Reed", "plant", { hp: 50 })
const neutral = fight("Ash", "fire", { hp: 40 })

describe("temperament overrides", () => {
  test("rush closes while far under both tactics", () => {
    for (const tactic of ["balanced", "specials"] as const) {
      const a = chooseAction({
        fighter: drake,
        opponent: ox,
        kit: DRAKE_KIT,
        tactic,
        temperament: "rush",
        actionCount: 1,
      })
      expect(a).toEqual(CLOSE)
    }
  })

  test("rush obeys the tactic once near", () => {
    // Neutral matchup, full HP: Balanced goes to a basic; Favor Specials
    // fires the best ready special (Blaze Bolt, 9.0 expected).
    const bolt = near(drake)
    expect(
      chooseAction({
        fighter: bolt,
        opponent: neutral,
        kit: DRAKE_KIT,
        tactic: "balanced",
        temperament: "rush",
        actionCount: 3,
      }),
    ).toEqual(BASIC)
    expect(
      chooseAction({
        fighter: bolt,
        opponent: neutral,
        kit: DRAKE_KIT,
        tactic: "specials",
        temperament: "rush",
        actionCount: 3,
      }),
    ).toEqual(special("blaze_bolt"))
  })

  test("slow holds on its first action only", () => {
    for (const tactic of ["balanced", "specials"] as const) {
      expect(
        chooseAction({
          fighter: ox,
          opponent: neutral,
          kit: OX_KIT,
          tactic,
          temperament: "slow",
          actionCount: 0,
        }),
      ).toEqual(HOLD)
    }
    // The second action follows the tactic: Balanced closes (no
    // super-effective or killing special vs the neutral opponent), Favor
    // Specials fires the best ready special (Bramble Dart, 9.0 expected
    // against fire).
    expect(
      chooseAction({
        fighter: ox,
        opponent: neutral,
        kit: OX_KIT,
        tactic: "balanced",
        temperament: "slow",
        actionCount: 1,
      }),
    ).toEqual(CLOSE)
    expect(
      chooseAction({
        fighter: ox,
        opponent: neutral,
        kit: OX_KIT,
        tactic: "specials",
        temperament: "slow",
        actionCount: 1,
      }),
    ).toEqual(special("bramble_dart"))
  })

  test("obedient never holds or closes against its tactic", () => {
    const check = (
      fighter: ClockFighter,
      opponent: ClockFighter,
      kit: readonly string[],
      tactic: Tactic,
      expected: ReturnType<typeof chooseAction>,
    ) => {
      expect(
        chooseAction({
          fighter,
          opponent,
          kit,
          tactic,
          temperament: "obedient",
          actionCount: 0,
        }),
      ).toEqual(expected)
    }
    // From far: Balanced closes when nothing qualifies; Favor Specials
    // fires a ready special; with every special cooling it closes.
    check(drake, neutral, DRAKE_KIT, "balanced", CLOSE)
    check(drake, neutral, DRAKE_KIT, "specials", special("blaze_bolt"))
    const allCool = DRAKE_KIT.reduce((f, id) => cooled(f, id, 2), drake)
    check(allCool, neutral, DRAKE_KIT, "specials", CLOSE)
    // From near: Balanced basics when nothing qualifies; Favor Specials
    // fires point-blank.
    check(near(drake), neutral, DRAKE_KIT, "balanced", BASIC)
    check(near(drake), neutral, DRAKE_KIT, "specials", special("blaze_bolt"))
  })
})

describe("tactic rules when obeyed", () => {
  test("Favor Specials spends the best ready special before closing", () => {
    expect(
      chooseAction({
        fighter: drake,
        opponent: neutral,
        kit: DRAKE_KIT,
        tactic: "specials",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).toEqual(special("blaze_bolt"))
    // The whole kit fresh at far favors the launch over a close.
    expect(
      chooseAction({
        fighter: ox,
        opponent: ox,
        kit: OX_KIT,
        tactic: "specials",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).toEqual(special("bramble_dart"))
  })

  test("Favor Specials skips cooling moves and falls back by range", () => {
    // Blaze Bolt cooling: the best ready special is Cinder Shot (8.5
    // expected, ahead of Spark 6.0 and Flame Charge 7.2).
    expect(
      chooseAction({
        fighter: cooled(drake, "blaze_bolt", 1),
        opponent: neutral,
        kit: DRAKE_KIT,
        tactic: "specials",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).toEqual(special("cinder_shot"))
    // Everything cooling: close when far, basic when near.
    const allCool = DRAKE_KIT.reduce((f, id) => cooled(f, id, 2), drake)
    expect(
      chooseAction({
        fighter: allCool,
        opponent: neutral,
        kit: DRAKE_KIT,
        tactic: "specials",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).toEqual(CLOSE)
    expect(
      chooseAction({
        fighter: near(allCool),
        opponent: neutral,
        kit: DRAKE_KIT,
        tactic: "specials",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).toEqual(BASIC)
  })

  test("Favor Specials goes point-blank at near before a basic", () => {
    expect(
      chooseAction({
        fighter: near(ox),
        opponent: neutral,
        kit: OX_KIT,
        tactic: "specials",
        temperament: "obedient",
        actionCount: 2,
      }),
    ).toEqual(special("bramble_dart"))
  })

  test("Balanced closes from far unless a super-effective special is ready", () => {
    // Fire into plant beats it: a super-effective special exists, so
    // Balanced fires the best one instead of closing.
    expect(
      chooseAction({
        fighter: drake,
        opponent: ox,
        kit: DRAKE_KIT,
        tactic: "balanced",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).toEqual(special("blaze_bolt"))
    // Neutral matchup, full HP: nothing beats, nothing KOs, so close.
    expect(
      chooseAction({
        fighter: drake,
        opponent: neutral,
        kit: DRAKE_KIT,
        tactic: "balanced",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).toEqual(CLOSE)
  })

  test("Balanced fires when a ready special would KO on the integer damage", () => {
    // Would-KO counts the integer damage assuming a hit, not the expected
    // value: Blaze Bolt's neutral integer 12 KOs the 10-HP Ash even though
    // its expected 9 does not. Cinder Shot (integer 10) qualifies too, and
    // the best of the qualifiers is Blaze Bolt.
    expect(
      chooseAction({
        fighter: drake,
        opponent: fight("Ash", "fire", { hp: 10 }),
        kit: DRAKE_KIT,
        tactic: "balanced",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).toEqual(special("blaze_bolt"))
    // A close would ignore the finisher, so Balance must not close here.
    expect(
      chooseAction({
        fighter: drake,
        opponent: fight("Ash", "fire", { hp: 10 }),
        kit: DRAKE_KIT,
        tactic: "balanced",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).not.toEqual(CLOSE)
  })

  test("Balanced takes the same kind of special point-blank at near", () => {
    expect(
      chooseAction({
        fighter: near(drake),
        opponent: ox,
        kit: DRAKE_KIT,
        tactic: "balanced",
        temperament: "obedient",
        actionCount: 2,
      }),
    ).toEqual(special("blaze_bolt"))
    // Neutral near matchup, full HP: basic filler.
    expect(
      chooseAction({
        fighter: near(drake),
        opponent: neutral,
        kit: DRAKE_KIT,
        tactic: "balanced",
        temperament: "obedient",
        actionCount: 2,
      }),
    ).toEqual(BASIC)
  })
})

describe("best-special ranking", () => {
  test("expected damage desc, then power desc, then move id ascending", () => {
    // Spark and Seed Shot share expected 6.0 and power 6: the seed never
    // being consulted, the tie falls to move id (seed_shot < spark). The
    // mixed-element kit is a legal fixture for policy even though the
    // loadout validator would never allow it in a fight.
    expect(
      chooseAction({
        fighter: drake,
        opponent: fight("Ash", "fire", { def: 10 }),
        kit: ["spark", "seed_shot"],
        tactic: "specials",
        temperament: "obedient",
        actionCount: 0,
      }),
    ).toEqual(special("seed_shot"))
  })

  test("the choice is the same on repeated calls with identical inputs", () => {
    const input = {
      fighter: drake,
      opponent: ox,
      kit: DRAKE_KIT,
      tactic: "specials",
      temperament: "obedient",
      actionCount: 0,
    } as const
    const first = chooseAction(input)
    expect(chooseAction(input)).toEqual(first)
  })
})

/**
 * Finishing-move preference (battle-animation-overhaul spec FR2): when
 * any ready special would KO the opponent, the policy fires the most
 * cinematic one — highest power, then move id ascending — under either
 * tactic. With the current catalog this coincides with the
 * expected-damage ranking (power * accuracy is monotonic in power:
 * 600/720/850/900 across the four tiers), so these tests pin the
 * CONTRACT for future kits whose accuracy curve could invert it.
 */
describe("finishing-move preference", () => {
  test("an all-lethal matchup fires the biggest special under Balanced", () => {
    // Every drake special deals 12+ into the plant ox at atk 10; ox at
    // 12 HP is inside kill range of the whole kit. Blaze Bolt (power 12)
    // is the finisher.
    expect(
      chooseAction({
        fighter: drake,
        opponent: { ...ox, hp: 12 },
        kit: DRAKE_KIT,
        tactic: "balanced",
        temperament: "obedient",
        actionCount: 3,
      }),
    ).toEqual(special("blaze_bolt"))
  })

  test("a cooled-down finisher falls through to the next lethal", () => {
    // Blaze Bolt on cooldown: Cinder Shot (power 10, 20 damage) still
    // kills at 12 HP and is the next-most-cinematic finisher.
    expect(
      chooseAction({
        fighter: cooled(drake, "blaze_bolt", 1),
        opponent: { ...ox, hp: 12 },
        kit: DRAKE_KIT,
        tactic: "balanced",
        temperament: "obedient",
        actionCount: 3,
      }),
    ).toEqual(special("cinder_shot"))
  })

  test("equal-power lethal specials break the tie by move id", () => {
    // Spark and Bubble both deal 12 fire-into-plant at atk 10 — both
    // lethal at 12 HP, same power, same accuracy: bubble < spark.
    expect(
      chooseAction({
        fighter: drake,
        opponent: { ...ox, hp: 12 },
        kit: ["spark", "bubble"],
        tactic: "balanced",
        temperament: "obedient",
        actionCount: 3,
      }),
    ).toEqual(special("bubble"))
  })

  test("Favor Specials also prefers the cinematic finisher", () => {
    expect(
      chooseAction({
        fighter: drake,
        opponent: { ...ox, hp: 12 },
        kit: DRAKE_KIT,
        tactic: "specials",
        temperament: "obedient",
        actionCount: 3,
      }),
    ).toEqual(special("blaze_bolt"))
  })
})
