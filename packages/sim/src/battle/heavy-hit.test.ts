/**
 * The shared heavy-hit rule, exercised through BOTH paths that implement it
 * (battle-sim-consolidation spec FR1): the projectile `impact` path and the
 * melee `basic` path. Before FR1 each path carried its own copy of the same
 * rule, so this file is the parity net that proves the two copies agreed and
 * that the single shared rule still does.
 *
 * Why parity matters more than either path alone: a heavy blow has to stagger
 * a standing victim, knock both fighters apart when the victim was in melee
 * range, and never do either to a fighter it just downed. Those rules are
 * easy to satisfy on the path you happen to be reading and easy to let drift
 * on the other one.
 */

import { describe, expect, test } from "bun:test"
import type { CreatureStats, Element } from "../creature"
import type { BattleEvent, BattleFighter, PlanFn, PlannedAction } from "./clock"
import {
  BASIC,
  CLOSE,
  createClock,
  createClockFighter,
  createTieOrder,
  HOLD,
} from "./clock"

function stats(
  spd: number,
  atk: number,
  def: number,
  hp: number,
): CreatureStats {
  return { hp, atk, def, spd }
}

function snap(name: string, element: Element, s: CreatureStats): BattleFighter {
  return { name, element, stats: s }
}

function clockOf(snaps: readonly BattleFighter[], seed: number) {
  return createClock(
    snaps.map((s) => createClockFighter(s)),
    createTieOrder(seed, snaps),
    seed,
  )
}

/** A plan driven by per-fighter action queues, HOLD as the fallback. */
function scripted(queues: Readonly<Record<string, PlannedAction[]>>): PlanFn {
  return (fighter) => queues[fighter.name]?.shift() ?? HOLD
}

function drive(
  clock: ReturnType<typeof createClock>,
  plan: PlanFn,
  ticks = 4,
): BattleEvent[] {
  const all: BattleEvent[] = []
  for (let i = 0; i < ticks; i += 1) all.push(...clock.advance(plan).events)
  return all
}

/**
 * The two attack paths, tuned so each one deals the SAME damage to the same
 * victim: the rule under test is the shared heavy-hit rule, not the damage
 * formula. Bolt is `fire`, Reed is `plant`, so the type chart is live in
 * every case and the "innate Strike is typeless" guard has teeth.
 */
/** One attack path: the attacker's stats and the scripted action queue that
 * reaches the hit. Declared up front so the literal queues need no casts. */
interface AttackPath {
  name: string
  bolt: CreatureStats
  queue: PlannedAction[]
}

const PATHS: readonly AttackPath[] = [
  {
    // R1: the ladder scaled to Strike 9 — floor(9 * 54 / 10) = 48.
    name: "melee",
    bolt: stats(13, 54, 10, 84),
    queue: [CLOSE, BASIC],
  },
  {
    // R2: Spark is power 10 — floor(10 * 48 / 10) = 48, point-blank and
    // type-neutral on its own, matching the melee path.
    name: "projectile",
    bolt: stats(13, 48, 10, 84),
    queue: [CLOSE, { kind: "special", moveId: "spark" }],
  },
]

/** Neutral pairing for the equal-damage paths above: two fire fighters make
 * `spark` type-neutral, isolating the damage-fraction branch. */
const ELEMENT_BY_PATH: Readonly<Record<string, [Element, Element]>> = {
  melee: ["fire", "plant"],
  projectile: ["fire", "fire"],
}

function outcome(events: readonly BattleEvent[]): {
  hit: {
    kind: string
    reaction: string | undefined
    damage: number | undefined
  }
  knockbacks: number
  staggers: number
  downs: number
} {
  const hit = events.find((e) => e.kind === "basic" || e.kind === "impact")
  if (!hit) throw new Error("the path produced no hit event")
  return {
    hit: {
      kind: hit.kind,
      reaction: hit.reaction,
      damage: hit.damage,
    },
    knockbacks: events.filter((e) => e.kind === "knockback").length,
    staggers: events.filter((e) => e.kind === "stagger").length,
    downs: events.filter((e) => e.kind === "down").length,
  }
}

describe("heavy-hit rule parity across both paths", () => {
  test("a heavy blow staggers and knocks both apart, through either path", () => {
    const seen: Record<string, ReturnType<typeof outcome>> = {}
    for (const path of PATHS) {
      const elements = ELEMENT_BY_PATH[path.name] ?? ["fire", "plant"]
      const clock = clockOf(
        [
          snap("Bolt", elements[0], path.bolt),
          snap("Reed", elements[1], stats(5, 11, 10, 84)),
        ],
        7,
      )
      seen[path.name] = outcome(
        drive(clock, scripted({ Bolt: [...path.queue] })),
      )
    }

    // Same damage either way; the rule bites identically: knockback wins the
    // reaction hint (the victim was in melee range), and the victim's next
    // window is consumed reeling.
    expect(seen).toEqual({
      melee: {
        hit: { kind: "basic", reaction: "knockback", damage: 48 },
        knockbacks: 1,
        staggers: 1,
        downs: 0,
      },
      projectile: {
        hit: { kind: "impact", reaction: "knockback", damage: 48 },
        knockbacks: 1,
        staggers: 1,
        downs: 0,
      },
    })
  })

  test("a downing blow never staggers or knocks back, through either path", () => {
    const seen: Record<string, ReturnType<typeof outcome>> = {}
    for (const path of PATHS) {
      const elements = ELEMENT_BY_PATH[path.name] ?? ["fire", "plant"]
      // Same shape, lethal numbers: each path floors past Reed's 84 HP.
      const killer =
        path.name === "melee" ? stats(13, 160, 10, 84) : stats(13, 85, 10, 84)
      const clock = clockOf(
        [
          snap("Bolt", elements[0], killer),
          snap("Reed", elements[1], stats(5, 11, 10, 84)),
        ],
        7,
      )
      seen[path.name] = outcome(
        drive(clock, scripted({ Bolt: [...path.queue] }), 3),
      )
    }

    expect(seen).toEqual({
      melee: {
        // R1: Strike 9 at atk 160 — floor(9 * 160 / 10) = 144.
        hit: { kind: "basic", reaction: undefined, damage: 144 },
        knockbacks: 0,
        staggers: 0,
        downs: 1,
      },
      projectile: {
        // Neutral pairing: floor(10 * 85 / 10) = 85, past Reed's 84 HP.
        hit: { kind: "impact", reaction: undefined, damage: 85 },
        knockbacks: 0,
        staggers: 0,
        downs: 1,
      },
    })
  })

  test("the innate Strike ignores the type chart while a special does not", () => {
    // The guard that makes FR1's "the melee path passes 1/1" load-bearing:
    // an identical 21 damage (25% of 84 HP) staggers Reed through super-
    // effective Spark (1.5x under the 3/2·2/3 chart) but NOT through the
    // typeless innate Strike, which only staggers by sheer size. A shared
    // rule that recomputed the type factor from the fighters' elements
    // would fail the melee half of this.
    const victim = stats(5, 11, 10, 84)
    const seed = 7

    const viaSpecial = outcome(
      drive(
        clockOf(
          [
            snap("Bolt", "fire", stats(13, 12, 10, 84)),
            snap("Reed", "plant", victim),
          ],
          seed,
        ),
        scripted({ Bolt: [CLOSE, { kind: "special", moveId: "spark" }] }),
      ),
    )
    const viaStrike = outcome(
      drive(
        clockOf(
          [
            snap("Bolt", "fire", stats(13, 20, 10, 84)),
            snap("Reed", "plant", victim),
          ],
          seed,
        ),
        scripted({ Bolt: [CLOSE, BASIC] }),
      ),
    )

    // R2: the ladder compressed — Spark 10 at atk 12 is floor(10 * 12 / 10)
    // = 12, 18 after the 3/2 chart; Strike 9 at atk 20 is floor(9 * 20 / 10)
    // = 18.
    expect(viaSpecial.hit.damage).toBe(18)
    expect(viaStrike.hit.damage).toBe(18)
    // Super-effective: 21% clears the lighter 15% floor -> staggers.
    expect(viaSpecial.hit.reaction).toBe("knockback")
    expect(viaSpecial.staggers).toBe(1)
    // Typeless: 21% is under the 35% fraction floor -> nothing.
    expect(viaStrike.hit.reaction).toBeUndefined()
    expect(viaStrike.staggers).toBe(0)
  })
})
