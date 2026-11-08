/**
 * The real-time controller (Continuous Arena Battle FR-11, AC-11): six verbs on
 * a fixed decision cadence, commitment locks that survive a whole swing, and
 * one archetype table shared by rivals and bosses.
 *
 * The verb tests hold a fight still so the cadence slot is exact; the fight
 * tests drive real `createFight` loops, where the controller decides every
 * 120 ms and the fight keeps moving underneath it.
 */

import { describe, expect, test } from "bun:test"
import type { Temperament } from "../../species"
import {
  CONTROLLER_PROFILES,
  type ControllerProfile,
  type ControllerState,
  type ControllerVerb,
  createController,
  DECISION_MS,
  DECISION_STEPS,
  decide,
  nextDecisionMs,
  preferredRangeFor,
  profileFor,
  RANGE_BAND_MM,
  reachEdgeMm,
  RETREAT_FRACTION_PERMILLE,
} from "./controller"
import { type ProjectileState, pointAt, shotDirection } from "./projectile"
import { DODGE_STAMINA_COST } from "./stamina"
import {
  createFight,
  type Fight,
  type FightConfig,
  type FighterInit,
} from "./step"
import {
  type ArenaBounds,
  type Dir2,
  type FightState,
  HOLD,
  type MoveIntent,
  STEP_MS,
} from "./types"

const BOUNDS: ArenaBounds = {
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
}

/** A plain kit: two chip shots, the heaviest row, and a fast dart. */
const KIT = ["spark", "cinder_shot", "blaze_bolt", "flare_dart"] as const

/** The whole verb vocabulary, so a run cannot report anything else. */
const VERBS: readonly ControllerVerb[] = [
  "advance",
  "retreat",
  "strafe",
  "hold",
  "commit",
  "dodge",
]

function side(key: string, spd: number, x: number, z = 0): FighterInit {
  return { key, spd, at: { x, z } }
}

/** The direction an order asks for, whether it is a move or a dodge. */
function dir(intent: MoveIntent): Dir2 {
  return "dodge" in intent ? intent.dodge : intent
}

function config(
  fighters: readonly [FighterInit, FighterInit] = [
    side("home", 12, -2000),
    side("away", 10, 2000),
  ],
): FightConfig {
  return { seed: 20261108, bounds: BOUNDS, fighters }
}

/** One driven fight: what both sides ordered, and where it ended. */
interface Run {
  readonly hashes: number[]
  readonly verbs: ControllerVerb[][]
  readonly intents: MoveIntent[][]
  readonly commits: (string | null)[][]
  readonly decisions: [number, number]
  readonly brains: readonly [ControllerState, ControllerState]
  readonly state: FightState
}

/** Drive a real fight: decide both sides, commit, advance, repeat. */
function run(
  cfg: FightConfig,
  steps: number,
  temperaments: readonly [Temperament, Temperament] = ["rush", "slow"],
): Run {
  const fight = createFight(cfg)
  const profiles: readonly [ControllerProfile, ControllerProfile] = [
    profileFor(temperaments[0]),
    profileFor(temperaments[1]),
  ]
  let brains: [ControllerState, ControllerState] = [
    createController(),
    createController(),
  ]
  const hashes: number[] = []
  const verbs: ControllerVerb[][] = []
  const intents: MoveIntent[][] = []
  const commits: (string | null)[][] = []
  for (let i = 0; i < steps; i++) {
    const home = decide({
      state: fight.state,
      side: 0,
      controller: brains[0],
      profile: profiles[0],
      kit: KIT,
    })
    const away = decide({
      state: fight.state,
      side: 1,
      controller: brains[1],
      profile: profiles[1],
      kit: KIT,
    })
    brains = [home.state, away.state]
    if (home.commit) fight.commit(0, home.commit)
    if (away.commit) fight.commit(1, away.commit)
    hashes.push(fight.advance([home.intent, away.intent]).hash)
    verbs.push([home.verb, away.verb])
    intents.push([home.intent, away.intent])
    commits.push([home.commit, away.commit])
  }
  return {
    hashes,
    verbs,
    intents,
    commits,
    decisions: [brains[0].decisions, brains[1].decisions],
    brains,
    state: fight.state,
  }
}

/** A fight held still for `steps` steps, so the next cadence slot is exact. */
function place(
  cfg: FightConfig,
  steps: number,
  temperament: Temperament = "obedient",
): { fight: Fight; controller: ControllerState } {
  const fight = createFight(cfg)
  let controller = createController()
  const profile = profileFor(temperament)
  for (let i = 0; i < steps; i++) {
    const ordered = decide({
      state: fight.state,
      side: 0,
      controller,
      profile,
      kit: KIT,
    })
    controller = ordered.state
    fight.advance([HOLD, HOLD])
  }
  return { fight, controller }
}

/** One order for side 0 of a held-still fight. */
function order(
  fight: Fight,
  controller: ControllerState,
  temperament: Temperament = "obedient",
) {
  return decide({
    state: fight.state,
    side: 0,
    controller,
    profile: profileFor(temperament),
    kit: KIT,
  })
}

/** A shot closing on the home side's line at x = -2000, 2,200 mm out. */
function incoming(): ProjectileState {
  const origin = { x: 500, y: 0, z: 0 }
  const dir = shotDirection(origin, { x: -2000, y: 0, z: 0 })
  return {
    id: 1,
    ownerKey: "away",
    moveId: "spark",
    origin,
    dir,
    speedMmPerMs: 12,
    travelledMm: 300,
    pos: pointAt(origin, dir, 300),
  }
}

describe("controller — the fixed cadence (AC-11)", () => {
  test("a decision lands on every twelfth 20 ms step", () => {
    expect(DECISION_MS % STEP_MS).toBe(0)
    expect(DECISION_MS).toBe(240)
    expect(DECISION_STEPS).toBe(12)
  })

  test("a 600-step fight takes exactly 50 decisions a side", () => {
    const result = run(config(), 600)
    expect(result.decisions).toEqual([50, 50])
    expect(nextDecisionMs(result.brains[0])).toBe(12000)
    expect(nextDecisionMs(result.brains[1])).toBe(12000)
  })

  test("between decisions the controller repeats the intent it holds", () => {
    const { fight, controller } = place(config(), DECISION_STEPS)
    // The next step is a cadence step, so it decides.
    const atCadence = order(fight, controller)
    expect(atCadence.state.decisions).toBe(2)
    // One step later is not: the order is the one already held, unchanged.
    fight.advance([HOLD, HOLD])
    const between = order(fight, atCadence.state)
    expect(between.state).toBe(atCadence.state)
    expect(between.intent).toBe(atCadence.intent)
    expect(between.verb).toBe(atCadence.verb)
    expect(between.commit).toBeNull()
  })
})

describe("controller — the six verbs (FR-11)", () => {
  test("out of range it advances on the foe", () => {
    const cfg = config([side("home", 10, -3500), side("away", 10, 3500)])
    const { fight, controller } = place(cfg, 0)
    const ordered = order(fight, controller)
    expect(ordered.verb).toBe("advance")
    expect(ordered.commit).toBeNull()
    expect(dir(ordered.intent).x).toBeGreaterThan(0)
    expect(dir(ordered.intent).z).toBe(0)
  })

  test("inside the band it holds the range and circles", () => {
    // Two default bodies give the obedient row a reach edge of 860 mm and a
    // preferred range of 967 mm, so its band is 567–1,367 mm. 900 mm sits
    // inside it, and the ninth decision lands on the first circle slot of the
    // ten-decision cycle.
    const cfg = config([side("home", 10, -450), side("away", 10, 450)])
    const { fight, controller } = place(cfg, 8 * DECISION_STEPS)
    const ordered = order(fight, controller)
    expect(ordered.verb).toBe("strafe")
    // A circle is perpendicular to the approach, never along it.
    const approach = shotDirection(
      fight.state.fighters[0].pos,
      fight.state.fighters[1].pos,
    )
    const circle = dir(ordered.intent)
    const dot = circle.x * approach.x + circle.z * approach.z
    expect(dot).toBe(0)
  })

  test("too close it retreats", () => {
    // Narrow bodies so the two can stand inside 0.6x the preferred range
    // without the separation pass pushing them back out to contact distance.
    const cfg = config([
      { ...side("home", 10, -60), radiusMm: 60 },
      { ...side("away", 10, 60), radiusMm: 60 },
    ])
    const { fight, controller } = place(cfg, 0)
    const ordered = order(fight, controller)
    expect(ordered.verb).toBe("retreat")
    expect(dir(ordered.intent).x).toBeLessThan(0)
  })

  test("in the band on a press slot it commits the heaviest reach", () => {
    // 900 mm is outside the innate strike's edge-to-edge reach for these two
    // bodies (860 mm), so the heaviest special that reaches is the press.
    const cfg = config([side("home", 10, -450), side("away", 10, 450)])
    const { fight, controller } = place(cfg, 0)
    const ordered = order(fight, controller)
    expect(ordered.verb).toBe("commit")
    expect(ordered.commit).toBe("blaze_bolt")
    expect(ordered.dodgeCost).toBe(0)
  })

  test("an inbound shot on the body's line is dodged, for the documented price", () => {
    const cfg = config([side("home", 12, -2000, 100), side("away", 10, 2000)])
    const { fight, controller } = place(cfg, 0)
    const shot = incoming()
    const state: FightState = { ...fight.state, projectiles: [shot] }
    const ordered = decide({
      state,
      side: 0,
      controller,
      profile: profileFor("obedient"),
      kit: KIT,
    })
    expect(ordered.verb).toBe("dodge")
    expect(ordered.dodgeCost).toBe(DODGE_STAMINA_COST)
    // A lateral burst: it runs across the shot's line, never along it, and it
    // is ordered as a dodge so the step can charge for it (FR-10).
    const burst = dir(ordered.intent)
    const dot = burst.x * shot.dir.x + burst.z * shot.dir.z
    expect(dot).toBe(0)
    expect("dodge" in ordered.intent).toBe(true)
  })

  test("a fighter who cannot pay the dodge does not dodge", () => {
    const poor: FighterInit = { ...side("home", 10, -2000), staminaMax: 4 }
    const cfg = config([poor, side("away", 10, 2000)])
    const { fight, controller } = place(cfg, 0)
    const state: FightState = {
      ...fight.state,
      projectiles: [incoming()],
    }
    const ordered = decide({
      state,
      side: 0,
      controller,
      profile: profileFor("obedient"),
      kit: KIT,
    })
    expect(ordered.verb).not.toBe("dodge")
    expect(ordered.dodgeCost).toBe(0)
  })
})

describe("controller — spacing (FR-1, FR-2)", () => {
  /** The preferred range this pair actually steers by, in mm. */
  function preferredOf(fight: Fight, temperament: Temperament = "obedient") {
    const [me, foe] = fight.state.fighters
    return preferredRangeFor(profileFor(temperament), reachEdgeMm(me, foe))
  }

  test("the preferred range sits between the reach edge and 1.5x it", () => {
    const [me, foe] = createFight(config()).state.fighters
    const edge = reachEdgeMm(me, foe)
    const temperaments: readonly Temperament[] = ["rush", "obedient", "slow"]
    for (const temperament of temperaments) {
      const preferred = preferredRangeFor(profileFor(temperament), edge)
      expect(preferred).toBeGreaterThanOrEqual(edge)
      expect(preferred).toBeLessThanOrEqual(Math.trunc((edge * 3) / 2))
    }
    const rush = preferredRangeFor(profileFor("rush"), edge)
    const obedient = preferredRangeFor(profileFor("obedient"), edge)
    const slow = preferredRangeFor(profileFor("slow"), edge)
    expect(rush).toBeLessThan(obedient)
    expect(obedient).toBeLessThan(slow)
  })

  test("a fighter inside 0.6x its preferred range retreats", () => {
    // 240 mm apart against a 607 mm preferred range for these narrow bodies:
    // well inside the 364 mm retreat threshold.
    const cfg = config([
      { ...side("home", 10, -120), radiusMm: 60 },
      { ...side("away", 10, 120), radiusMm: 60 },
    ])
    const { fight, controller } = place(cfg, 0)
    const preferred = preferredOf(fight)
    const threshold = Math.trunc(
      (preferred * RETREAT_FRACTION_PERMILLE) / 1000,
    )
    expect(240).toBeLessThan(threshold)
    expect(threshold).toBeLessThan(preferred)
    expect(order(fight, controller).verb).toBe("retreat")
  })

  test("a fighter between 0.6x and 1x its preferred range does not retreat", () => {
    // 500 mm apart: past the retreat threshold, still short of preferred.
    const cfg = config([
      { ...side("home", 10, -250), radiusMm: 60 },
      { ...side("away", 10, 250), radiusMm: 60 },
    ])
    const { fight, controller } = place(cfg, 0)
    const preferred = preferredOf(fight)
    const threshold = Math.trunc(
      (preferred * RETREAT_FRACTION_PERMILLE) / 1000,
    )
    expect(500).toBeGreaterThan(threshold)
    expect(500).toBeLessThan(preferred)
    expect(order(fight, controller).verb).not.toBe("retreat")
  })

  test("a retreat continues until the preferred range is reached", () => {
    const cfg = config([
      { ...side("home", 10, -120), radiusMm: 60 },
      { ...side("away", 10, 120), radiusMm: 60 },
    ])
    const fight = createFight(cfg)
    const profile = profileFor("obedient")
    const preferred = preferredOf(fight)
    let controller = createController()
    const seen: { verb: ControllerVerb; gap: number }[] = []
    for (let i = 0; i < 600; i++) {
      const ordered = decide({
        state: fight.state,
        side: 0,
        controller,
        profile,
        kit: KIT,
      })
      controller = ordered.state
      if (i % DECISION_STEPS === 0) {
        const [me, foe] = fight.state.fighters
        const dx = foe.pos.x - me.pos.x
        const dz = foe.pos.z - me.pos.z
        seen.push({
          verb: ordered.verb,
          gap: Math.round(Math.sqrt(dx * dx + dz * dz)),
        })
      }
      fight.advance([ordered.intent, HOLD])
    }
    // The first decision is a retreat, and every retreat after it holds the
    // order until the gap is back at the preferred range.
    expect(seen[0]?.verb).toBe("retreat")
    const stopped = seen.findIndex((entry) => entry.verb !== "retreat")
    expect(stopped).toBeGreaterThan(0)
    for (const entry of seen.slice(0, stopped)) {
      expect(entry.verb).toBe("retreat")
      expect(entry.gap).toBeLessThan(preferred)
    }
    expect(seen[stopped]?.gap).toBeGreaterThanOrEqual(preferred)
  })

  test("a cornered fighter does not retreat into the wall", () => {
    // Home has 50 mm of floor behind it: crowded, but no room to back off, so
    // it takes a circle slot instead of shivering against the fence.
    const cfg = config([side("home", 10, -3950), side("away", 10, -3400)])
    const { fight, controller } = place(cfg, 8 * DECISION_STEPS)
    const ordered = order(fight, controller)
    expect(ordered.verb).toBe("strafe")
    // Never a step further into the fence.
    expect(dir(ordered.intent).x).toBeGreaterThanOrEqual(0)
  })

  test("the retreat order is reported", () => {
    const cfg = config([
      { ...side("home", 10, -120), radiusMm: 60 },
      { ...side("away", 10, 120), radiusMm: 60 },
    ])
    const { fight, controller } = place(cfg, 0)
    const ordered = order(fight, controller)
    expect(ordered.verb).toBe("retreat")
    expect(ordered.commit).toBeNull()
    expect(ordered.dodgeCost).toBe(0)
    expect("dodge" in ordered.intent).toBe(false)
    expect(dir(ordered.intent).x).toBeLessThan(0)
  })
})

describe("controller — commitment locks (FR-6)", () => {
  test("a locked fighter keeps its intent and asks for no commit", () => {
    const fight = createFight(config())
    const profile = profileFor("rush")
    let controller = createController()
    let locked = 0
    let commits = 0
    for (let i = 0; i < 300; i++) {
      const attacking = Boolean(fight.state.fighters[0].attack)
      const before = controller
      const ordered = decide({
        state: fight.state,
        side: 0,
        controller,
        profile,
        kit: KIT,
      })
      if (attacking && i % DECISION_STEPS === 0) {
        expect(ordered.intent).toBe(before.intent)
        expect(ordered.verb).toBe(before.verb)
        expect(ordered.commit).toBeNull()
        locked++
      }
      controller = ordered.state
      if (ordered.commit) {
        // A refused commit would be a behaviour bug even if the state is legal.
        expect(fight.commit(0, ordered.commit)).toBe(true)
        commits++
      }
      fight.advance([ordered.intent, HOLD])
    }
    expect(locked).toBeGreaterThan(0)
    expect(commits).toBeGreaterThan(0)
  })
})

describe("controller — one archetype table (FR-11)", () => {
  test("every temperament has a row, and the table is frozen", () => {
    expect(Object.keys(CONTROLLER_PROFILES).sort()).toEqual([
      "obedient",
      "rush",
      "slow",
    ])
    expect(profileFor("rush")).toBe(CONTROLLER_PROFILES.rush)
    expect(profileFor("slow")).toBe(CONTROLLER_PROFILES.slow)
    expect(profileFor("obedient")).toBe(CONTROLLER_PROFILES.obedient)
    expect(Object.isFrozen(CONTROLLER_PROFILES)).toBe(true)
  })

  test("rush presses closer and harder than slow, and circles less", () => {
    const rush = profileFor("rush")
    const slow = profileFor("slow")
    expect(rush.aggression).toBeGreaterThan(slow.aggression)
    expect(rush.preferredRangeMm).toBeLessThan(slow.preferredRangeMm)
    expect(rush.strafeBias).toBeLessThan(slow.strafeBias)
  })

  test("every profile keeps a usable band and a dodge threshold", () => {
    for (const row of Object.values(CONTROLLER_PROFILES)) {
      expect(row.preferredRangeMm).toBeGreaterThan(RANGE_BAND_MM)
      expect(row.dodgeThresholdMm).toBeGreaterThan(0)
      expect(row.aggression).toBeGreaterThanOrEqual(0)
      expect(row.aggression).toBeLessThanOrEqual(100)
      expect(row.strafeBias).toBeGreaterThanOrEqual(0)
      expect(row.strafeBias).toBeLessThanOrEqual(100)
    }
  })
})

describe("controller — determinism (AC-11)", () => {
  test("the same seed and the same tuning order the same fight", () => {
    const first = run(config(), 600)
    const second = run(config(), 600)
    expect(second.hashes).toEqual(first.hashes)
    expect(second.verbs).toEqual(first.verbs)
    expect(second.intents).toEqual(first.intents)
    expect(second.commits).toEqual(first.commits)
    expect(second.decisions).toEqual(first.decisions)
  })

  test("a different tuning orders a different fight", () => {
    const aggressive = run(config(), 600, ["rush", "rush"])
    const patient = run(config(), 600, ["slow", "slow"])
    expect(patient.intents).not.toEqual(aggressive.intents)
  })
})

describe("controller — a fight progresses", () => {
  test("both fighters move, commit, and stay on the cadence", () => {
    const cfg = config()
    const opening = createFight(cfg).state.fighters
    const result = run(cfg, 600)
    expect(result.state.fighters[0].pos).not.toEqual(opening[0].pos)
    expect(result.state.fighters[1].pos).not.toEqual(opening[1].pos)
    const committed = result.commits.flat().filter((id) => id !== null)
    expect(committed.length).toBeGreaterThan(0)
    expect(result.decisions).toEqual([50, 50])
    for (const pair of result.verbs) {
      for (const verb of pair) expect(VERBS).toContain(verb)
    }
  })
})
