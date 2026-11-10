/**
 * Execution-only noise (variance track Phase 2, FR-3/FR-4/FR-7).
 *
 * The same matchup must fight differently per seed and identically per
 * replay, without changing any doctrine band or strategy. The tests prove
 * three things:
 *
 * 1. **The noise is additive only.** With a stub RNG that never skips, a full
 *    driven run is identical to deciding without noise: bands, intents,
 *    dodge policy, and move choice are untouched.
 * 2. **Each gate varies what it may and nothing else.** Cadence jitter holds
 *    without advancing the cycle; the commit gate only delays; the dodge
 *    mirror only flips an already-ordered shot-across dodge, never a
 *    swing-away one.
 * 3. **Determinism holds both ways.** The same seed replays identically
 *    through `resolveContinuous`; different seeds fight different fights.
 */

import { describe, expect, test } from "bun:test"
import type { Rng } from "../../rng"
import type { BattleSide } from "../resolver"
import { createController, decide, profileFor } from "./controller"
import { awayFrom } from "./controller-aim"
import {
  CADENCE_SKIP_DENOM,
  COMMIT_SKIP_DENOM,
  cadenceHold,
  flankDodge,
  PUNISH_SKIP_DENOM,
  takeCommit,
} from "./controller-noise"
import type { ControllerVerb } from "./controller-state"
import { resolveContinuous } from "./resolve"
import { createFight, type FightConfig, type FighterInit } from "./step"
import type { ArenaBounds, Dir2, MoveIntent } from "./types"

/** A stub that never skips, never flips: noise that always says "go ahead". */
const ALWAYS: Rng = { next: () => 0.999999, int: () => 1, cursor: () => 0 }

/** A stub that always skips and always flips. */
const NEVER: Rng = { next: () => 0, int: () => 0, cursor: () => 0 }

const BOUNDS: ArenaBounds = {
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
}

const KIT = ["spark", "cinder_shot", "blaze_bolt", "flare_dart"] as const

function side(key: string, spd: number, x: number): FighterInit {
  return { key, spd, at: { x, z: 0 } }
}

function config(seed: number): FightConfig {
  return {
    seed,
    bounds: BOUNDS,
    fighters: [side("home", 12, -2000), side("away", 10, 2000)],
  }
}

interface Drive {
  readonly hashes: number[]
  readonly verbs: ControllerVerb[][]
  readonly intents: MoveIntent[][]
  readonly commits: (string | null)[][]
  readonly decisions: [number, number]
}

/** Drive a real fight, threading `rng` the way `resolveContinuous` does. */
function drive(seed: number, steps: number, rng?: Rng): Drive {
  const fight = createFight(config(seed))
  const profiles = [profileFor("rush"), profileFor("slow")] as const
  let home = createController()
  let away = createController()
  const hashes: number[] = []
  const verbs: ControllerVerb[][] = []
  const intents: MoveIntent[][] = []
  const commits: (string | null)[][] = []
  for (let i = 0; i < steps; i++) {
    const first = decide(
      {
        state: fight.state,
        side: 0,
        controller: home,
        profile: profiles[0],
        kit: KIT,
      },
      rng,
    )
    const second = decide(
      {
        state: fight.state,
        side: 1,
        controller: away,
        profile: profiles[1],
        kit: KIT,
      },
      rng,
    )
    home = first.state
    away = second.state
    if (first.commit) fight.commit(0, first.commit)
    if (second.commit) fight.commit(1, second.commit)
    hashes.push(fight.advance([first.intent, second.intent]).hash)
    verbs.push([first.verb, second.verb])
    intents.push([first.intent, second.intent])
    commits.push([first.commit, second.commit])
  }
  return {
    hashes,
    verbs,
    intents,
    commits,
    decisions: [home.decisions, away.decisions],
  }
}

/** Decisions taken in a resolve-shaped loop over `steps` steps. */
function resolveDecisions(seed: number, steps: number): number {
  const fight = createFight(config(seed))
  const profiles = [profileFor("rush"), profileFor("slow")] as const
  let home = createController()
  let away = createController()
  for (let i = 0; i < steps; i++) {
    const before = fight.state
    for (const which of [0, 1] as const) {
      const order = decide(
        {
          state: before,
          side: which,
          controller: which === 0 ? home : away,
          profile: profiles[which],
          kit: KIT,
        },
        fight.rng,
      )
      if (which === 0) home = order.state
      else away = order.state
      if (order.commit) fight.commit(which, order.commit)
    }
    fight.advance([home.intent, away.intent])
  }
  return home.decisions + away.decisions * 1000
}

function battleSide(id: string, kit: readonly string[]): BattleSide {
  return {
    name: id,
    id,
    element: "fire",
    stats: { hp: 189, atk: 10, def: 10, spd: 10 },
    kit,
    tactic: "balanced",
    doctrine: "press",
    temperament: "obedient",
  }
}

describe("execution-only noise (FR-3/FR-4)", () => {
  test("the skip rates are pinned: cadence 1/16, press 1/32, punish 1/16", () => {
    expect(CADENCE_SKIP_DENOM).toBe(16)
    expect(COMMIT_SKIP_DENOM).toBe(32)
    expect(PUNISH_SKIP_DENOM).toBe(16)
  })

  test("cadence jitter holds without advancing the doctrine cycle", () => {
    const fight = createFight(config(7))
    const controller = createController()
    const input = {
      state: fight.state,
      side: 0 as const,
      controller,
      profile: profileFor("obedient"),
      kit: KIT,
    }
    expect(cadenceHold(controller, NEVER)).toEqual({
      state: controller,
      verb: controller.verb,
      intent: controller.intent,
      commit: null,
      dodgeCost: 0,
    })
    expect(cadenceHold(controller, ALWAYS)).toBeNull()

    const skipped = decide(input, NEVER)
    expect(skipped.verb).toBe("hold")
    expect(skipped.state.decisions).toBe(0)
    expect(skipped.commit).toBeNull()

    const kept = decide(input, ALWAYS)
    const plain = decide(input)
    expect(kept).toEqual(plain)
    expect(kept.state.decisions).toBe(1)
  })

  test("the commit gate only ever delays an ordered commit", () => {
    expect(takeCommit(undefined, false)).toBe(true)
    expect(takeCommit(undefined, true)).toBe(true)
    expect(takeCommit(ALWAYS, false)).toBe(true)
    expect(takeCommit(ALWAYS, true)).toBe(true)
    expect(takeCommit(NEVER, false)).toBe(false)
    expect(takeCommit(NEVER, true)).toBe(false)
  })

  test("the dodge mirror flips a shot-across dodge, never a swing-away one", () => {
    const fight = createFight(config(7))
    const [me, foe] = fight.state.fighters
    const away = awayFrom(me, foe)
    const swingAway: MoveIntent = { dodge: { x: away.x, z: away.z } }
    expect(flankDodge(swingAway, me, foe, undefined)).toBe(swingAway)
    expect(flankDodge(swingAway, me, foe, NEVER)).toEqual(swingAway)
    expect(flankDodge(swingAway, me, foe, ALWAYS)).toEqual(swingAway)

    const across: Dir2 = { x: -away.z, z: away.x }
    const shot: MoveIntent = { dodge: across }
    expect(flankDodge(shot, me, foe, undefined)).toBe(shot)
    expect(flankDodge(shot, me, foe, ALWAYS)).toEqual(shot)
    expect(flankDodge(shot, me, foe, NEVER)).toEqual({
      dodge: { x: -across.x, z: -across.z },
    })
  })

  test("noise that never skips decides exactly as no noise at all", () => {
    const plain = drive(20261110, 240)
    const permitted = drive(20261110, 240, ALWAYS)
    expect(permitted.verbs).toEqual(plain.verbs)
    expect(permitted.intents).toEqual(plain.intents)
    expect(permitted.commits).toEqual(plain.commits)
    expect(permitted.hashes).toEqual(plain.hashes)
  })

  test("cadence jitter moves the decision counts per seed", () => {
    const totals = [1, 2, 3, 4].map((seed) => resolveDecisions(seed, 600))
    expect(new Set(totals).size).toBeGreaterThan(1)
  })
})

describe("determinism both ways (FR-7/AC-7)", () => {
  const ash = ["spark", "blaze_bolt", "cinder_shot", "flare_dart"]
  const reed = ["bubble", "splash_bolt", "foam_volley", "mist_spray"]

  test("the same seed replays the same fight byte for byte", () => {
    const one = resolveContinuous(
      battleSide("Ash", ash),
      battleSide("Reed", reed),
      1,
    )
    const again = resolveContinuous(
      battleSide("Ash", ash),
      battleSide("Reed", reed),
      1,
    )
    expect(JSON.stringify(one.events)).toBe(JSON.stringify(again.events))
    expect(one).toEqual(again)
  })

  test("different seeds fight different fights", () => {
    const one = resolveContinuous(
      battleSide("Ash", ash),
      battleSide("Reed", reed),
      1,
    )
    const other = resolveContinuous(
      battleSide("Ash", ash),
      battleSide("Reed", reed),
      2,
    )
    expect(JSON.stringify(other.events)).not.toBe(JSON.stringify(one.events))
  })

  test("accuracy misses are still events with reasons under noise", () => {
    const result = resolveContinuous(
      battleSide("Ash", [
        "blaze_bolt",
        "blaze_bolt",
        "blaze_bolt",
        "blaze_bolt",
      ]),
      battleSide("Reed", [
        "blaze_bolt",
        "blaze_bolt",
        "blaze_bolt",
        "blaze_bolt",
      ]),
      7,
    )
    const misses = result.events.filter(
      (event) => event.missReason === "accuracy",
    )
    for (const miss of misses) {
      expect(miss.hit).toBe(false)
      expect(miss.line).toContain("goes wide")
    }
    expect(result.events.some((event) => event.kind === "impact")).toBe(true)
  })
})
