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
const PATHS = [
  {
    // Strike: floor(4 * 60 / 10) = 24.
    name: "melee",
    bolt: stats(13, 60, 10, 40),
    queue: [CLOSE, BASIC] as PlannedAction[],
  },
  {
    // Spark, point-blank and type-neutral on its own: floor(6 * 40 / 10) = 24.
    name: "projectile",
    bolt: stats(13, 40, 10, 40),
    queue: [CLOSE, { kind: "special", moveId: "spark" }] as PlannedAction[],
  },
] as const

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
          snap("Reed", elements[1], stats(5, 11, 10, 40)),
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
        hit: { kind: "basic", reaction: "knockback", damage: 24 },
        knockbacks: 1,
        staggers: 1,
        downs: 0,
      },
      projectile: {
        hit: { kind: "impact", reaction: "knockback", damage: 24 },
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
      // Same shape, lethal numbers: each path floors past Reed's 40 HP.
      const killer =
        path.name === "melee" ? stats(13, 200, 10, 40) : stats(13, 70, 10, 40)
      const clock = clockOf(
        [
          snap("Bolt", elements[0], killer),
          snap("Reed", elements[1], stats(5, 11, 10, 40)),
        ],
        7,
      )
      seen[path.name] = outcome(
        drive(clock, scripted({ Bolt: [...path.queue] }), 3),
      )
    }

    expect(seen).toEqual({
      melee: {
        hit: { kind: "basic", reaction: undefined, damage: 80 },
        knockbacks: 0,
        staggers: 0,
        downs: 1,
      },
      projectile: {
        // Neutral pairing: floor(6 * 70 / 10) = 42, past Reed's 40 HP.
        hit: { kind: "impact", reaction: undefined, damage: 42 },
        knockbacks: 0,
        staggers: 0,
        downs: 1,
      },
    })
  })

  test("the innate Strike ignores the type chart while a special does not", () => {
    // The guard that makes FR1's "the melee path passes 1/1" load-bearing:
    // an identical 10 damage (25% of 40 HP) staggers Reed through super-
    // effective Spark but NOT through the typeless innate Strike, which only
    // staggers by sheer size. A shared rule that recomputed the type factor
    // from the fighters' elements would fail the melee half of this.
    const victim = stats(5, 11, 10, 40)
    const seed = 7

    const viaSpecial = outcome(
      drive(
        clockOf(
          [
            snap("Bolt", "fire", stats(13, 9, 10, 40)),
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
            snap("Bolt", "fire", stats(13, 25, 10, 40)),
            snap("Reed", "plant", victim),
          ],
          seed,
        ),
        scripted({ Bolt: [CLOSE, BASIC] }),
      ),
    )

    expect(viaSpecial.hit.damage).toBe(10)
    expect(viaStrike.hit.damage).toBe(10)
    // Super-effective: 25% clears the lighter 15% floor -> staggers.
    expect(viaSpecial.hit.reaction).toBe("knockback")
    expect(viaSpecial.staggers).toBe(1)
    // Typeless: 25% is under the 35% fraction floor -> nothing.
    expect(viaStrike.hit.reaction).toBeUndefined()
    expect(viaStrike.staggers).toBe(0)
  })
})
