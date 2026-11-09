/**
 * The fold's drift (FR-9): the same seeded fight resolved on the pre-fold and
 * the post-fold stat lines, through the real resolver, with the pool drift
 * stated per trained HP point and asserted under 1%.
 *
 * Pre-fold a side's pool was `floor((base + 2 * trained) * 210 / 100)`. After
 * the fold the HP stat *is* the pool: `round(base * 21 / 10)`, and a trained
 * point is worth 2 against a cap of 13 (26 at the cap, against 25.2 before).
 * The HP training cap moved with the fold so training is worth the same, and
 * `effectiveStats` is still the one place base and trained values compose.
 */

import { describe, expect, test } from "bun:test"
import { createCreature, effectiveStats } from "../../creature"
import type { BattleSide } from "../resolver"
import { resolveContinuous } from "./resolve"
import { STEP_MS } from "./types"

const BASE_HP = 90
const OLD_TRAINED_CAP = 6
const FOLDED_TRAINED_CAP = 13
const SEED = 20261109

/** The pool a side of this base HP opened with before the fold. */
function oldPool(trained: number): number {
  return Math.floor(((BASE_HP + 2 * trained) * 210) / 100)
}

/** The pool the same creature opens with after the fold. */
function newPool(trained: number): number {
  const foldedBase = Math.round((BASE_HP * 21) / 10)
  const foldedTrained = Math.min(
    FOLDED_TRAINED_CAP,
    Math.round((trained * 21) / 10),
  )
  return foldedBase + 2 * foldedTrained
}

function side(
  name: string,
  id: string,
  element: "fire" | "water",
  pool: number,
  kit: readonly string[],
  tactic: "balanced" | "specials",
): BattleSide {
  return {
    name,
    id,
    element,
    stats: { hp: pool, atk: 10, def: 10, spd: 10 },
    kit,
    tactic,
    temperament: "rush",
  }
}

interface Fought {
  readonly ms: number
  readonly winner: string | null
  readonly blows: number
}

/** One fight at a pool, measured off the event log the game replays. */
function fightAt(pool: number): Fought {
  const result = resolveContinuous(
    side("Ember", "ember", "fire", pool, ["spark", "flame_charge"], "specials"),
    side("Reed", "reed", "water", pool, ["bubble", "tide_shot"], "balanced"),
    SEED,
  )
  let blows = 0
  for (const event of result.events) {
    if (
      event.hit === true &&
      (event.kind === "basic" || event.kind === "impact")
    )
      blows += 1
  }
  const last = result.events[result.events.length - 1]
  return {
    ms: last ? last.tick * STEP_MS : 0,
    winner: result.winner,
    blows,
  }
}

describe("the stat fold's drift (FR-9)", () => {
  test("every trained HP point stays inside one percent of its old pool", () => {
    const rows: string[] = []
    for (let trained = 0; trained <= OLD_TRAINED_CAP; trained++) {
      const before = oldPool(trained)
      const after = newPool(trained)
      const drift = (Math.abs(after - before) * 100) / before
      rows.push(
        `trained ${trained}: ${before} -> ${after} (${drift.toFixed(2)}%)`,
      )
      expect(drift).toBeLessThan(1)
    }
    console.log(`fold drift: ${rows.join("; ")}`)
  })

  test("a fully trained creature is worth the same pool as before", () => {
    // Old ceiling: 2 * 6 * 2.1 = 25.2 HP of training. New: 2 * 13 = 26.
    expect(oldPool(OLD_TRAINED_CAP)).toBe(214)
    expect(newPool(OLD_TRAINED_CAP)).toBe(215)
  })

  test("effectiveStats keeps the trained coefficient and the HP cap", () => {
    const creature = createCreature("fire_drake", 7)
    const capped = {
      ...creature,
      trained: { ...creature.trained, hp: FOLDED_TRAINED_CAP },
    }
    expect(effectiveStats(capped).hp).toBe(creature.stats.hp + 2 * 13)
  })

  test("the same seeded fight keeps its winner and its pace", () => {
    const rows: string[] = []
    for (const trained of [0, 2, 4, OLD_TRAINED_CAP]) {
      const before = fightAt(oldPool(trained))
      const after = fightAt(newPool(trained))
      const drift = (Math.abs(after.ms - before.ms) * 100) / before.ms
      rows.push(
        `trained ${trained}: ${before.ms}ms/${before.winner} -> ${after.ms}ms/${after.winner} (${drift.toFixed(2)}%)`,
      )
      expect(after.winner).toBe(before.winner)
      expect(after.blows).toBeGreaterThan(0)
      expect(drift).toBeLessThan(1)
    }
    console.log(`fold fight drift: ${rows.join("; ")}`)
  })
})
