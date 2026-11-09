import { describe, expect, test } from "bun:test"
import { getMove } from "../moves"
import {
  createController,
  DECISION_STEPS,
  type DecisionInput,
  decide,
} from "./controller"
import { awayFrom, strafeIntent } from "./controller-aim"
import { DODGE_COOLDOWN_MS } from "./controller-dodge"
import { DOCTRINES, profileForDoctrine } from "./controller-profile"
import {
  KEEP_BACK_FLOOR_PERCENT,
  RULE_IDS,
  RULE_LABELS,
  RULES,
  type RuleId,
} from "./controller-rule"
import { createFight } from "./step"
import { type FightState, HOLD, STEP_MS } from "./types"

const BOUNDS = { minX: -4000, maxX: 4000, minZ: -3000, maxZ: 3000 }
const PRESS = profileForDoctrine(DOCTRINES.press, "obedient")
const KIT = ["spark"]

interface Case {
  /** Centre-to-centre gap, mm, when explicit positions are not given. */
  readonly gap?: number
  readonly home?: { x: number; z: number }
  readonly away?: { x: number; z: number }
  /** The home fighter's stamina; the opening pool is full. */
  readonly stamina?: number
  /** The foe's remaining HP as a share of its pool. */
  readonly foeHpPercent?: number
  /** The foe's move, if it is winding one up. */
  readonly tell?: string
  readonly foeBroken?: boolean
}

function fighter(key: string, x: number, z: number) {
  return {
    key,
    spd: 10,
    at: { x, z },
    facing: { x: key === "home" ? 1000 : -1000, z: 0 },
    stats: { atk: 10, def: 5 },
  }
}

function stateFor(c: Case): FightState {
  const gap = c.gap ?? 1100
  const half = Math.trunc(gap / 2)
  const home = c.home ?? { x: -half, z: 0 }
  const away = c.away ?? { x: half, z: 0 }
  const fight = createFight({
    seed: 7,
    bounds: BOUNDS,
    fighters: [
      fighter("home", home.x, home.z),
      fighter("away", away.x, away.z),
    ],
  })
  const base = fight.state
  const me = base.fighters[0]
  const foe = base.fighters[1]
  const foeHp =
    c.foeHpPercent === undefined
      ? foe.hp
      : Math.trunc((foe.hpMax * c.foeHpPercent) / 100)
  return {
    ...base,
    fighters: [
      { ...me, stamina: c.stamina ?? me.stamina },
      {
        ...foe,
        hp: foeHp,
        ...(c.foeBroken ? { poiseBreakMs: 600 } : {}),
        ...(c.tell
          ? {
              attack: {
                moveId: c.tell,
                phase: "startup" as const,
                elapsedMs: 0,
                landed: false,
              },
            }
          : {}),
      },
    ],
  }
}

function order(rule: RuleId | undefined, c: Case = {}) {
  const input: DecisionInput = {
    state: stateFor(c),
    side: 0,
    controller: createController(),
    profile: PRESS,
    kit: KIT,
    ...(rule ? { rule } : {}),
  }
  return decide(input)
}

describe("the rule table (FR-13)", () => {
  test("four frozen notes, each with a trigger and an action", () => {
    expect(RULE_IDS).toEqual([
      "save_heavy",
      "read_tell",
      "keep_back",
      "never_trade",
    ])
    expect(Object.isFrozen(RULES)).toBe(true)
    expect(Object.isFrozen(RULE_IDS)).toBe(true)
    for (const id of RULE_IDS) {
      expect(RULES[id].id).toBe(id)
      expect(RULES[id].label.length).toBeGreaterThan(0)
      expect(RULES[id].trigger.length).toBeGreaterThan(0)
      expect(RULES[id].action.length).toBeGreaterThan(0)
    }
    expect(RULE_LABELS.save_heavy).toBe("Save the heavy")
    expect(RULE_LABELS.read_tell).toBe("Read the tell")
    expect(RULE_LABELS.keep_back).toBe("Keep something back")
    expect(RULE_LABELS.never_trade).toBe("Never trade")
    expect(KEEP_BACK_FLOOR_PERCENT).toBe(30)
  })

  test("the heavy the rule saves is a special, not the innate strike", () => {
    expect(getMove("spark")?.melee).toBe(false)
    expect(getMove("basic")?.melee).toBe(true)
  })
})

describe("a side with no rule equipped is the doctrine alone (AC-13)", () => {
  test("no rule key and an undefined rule decide the same thing", () => {
    const absent = order(undefined)
    const explicit = decide({
      state: stateFor({}),
      side: 0,
      controller: createController(),
      profile: PRESS,
      kit: KIT,
      rule: undefined,
    })
    expect(explicit).toEqual(absent)
    expect(absent.rule).toBeUndefined()
  })

  test("the unequipped side still presses, and names no rule", () => {
    const press = order(undefined)
    expect(press.verb).toBe("commit")
    expect(press.commit).toBe("spark")
    expect(press.rule).toBeUndefined()

    // The doctrine's own gate answers a melee wind-up inside its reach.
    const tell = order(undefined, { gap: 860, tell: "basic" })
    expect(tell.verb).toBe("dodge")
    expect(tell.rule).toBeUndefined()

    // It does not read a ranged wind-up: no rule, no dodge, it swings.
    const ranged = order(undefined, { tell: "spark" })
    expect(ranged.verb).toBe("commit")
    expect(ranged.rule).toBeUndefined()

    const dry = order(undefined, { gap: 860, tell: "basic", stamina: 6 })
    expect(dry.verb).toBe("commit")
    expect(dry.commit).toBe("basic")
    expect(dry.rule).toBeUndefined()
  })
})

describe("save the heavy (FR-13)", () => {
  test("holds the biggest special until the foe's poise breaks", () => {
    const press = order("save_heavy")
    expect(press.commit).toBeNull()
    expect(press.verb).toBe("advance")
    expect(press.rule).toBe("save_heavy")
  })

  test("spends it once the guard breaks", () => {
    const broken = order("save_heavy", { foeBroken: true })
    expect(broken.commit).toBe("spark")
    expect(broken.rule).toBeUndefined()
  })

  test("spends it for the finisher", () => {
    const finish = order("save_heavy", { foeHpPercent: 20 })
    expect(finish.commit).toBe("spark")
    expect(finish.rule).toBeUndefined()
  })
})

describe("read the tell (FR-13)", () => {
  test("commits to a dodge even with a dry pool, where the doctrine swings", () => {
    const dry = order("read_tell", { tell: "spark", stamina: 0 })
    expect(dry.verb).toBe("dodge")
    expect(dry.rule).toBe("read_tell")
    expect(dry.state.dodgeReadyMs).toBe(DODGE_COOLDOWN_MS)

    const me = stateFor({ tell: "spark", stamina: 0 }).fighters[0]
    const foe = stateFor({ tell: "spark", stamina: 0 }).fighters[1]
    expect(dry.intent).toEqual({ dodge: awayFrom(me, foe) })
  })

  test("reads a ranged wind-up the doctrine's gate ignores", () => {
    const ranged = order("read_tell", { tell: "spark" })
    expect(ranged.verb).toBe("dodge")
    expect(ranged.rule).toBe("read_tell")
    expect(ranged.commit).toBeNull()
  })

  test("the refused dodge is visible in the step outcome, like any other", () => {
    const state = stateFor({ tell: "spark", stamina: 0 })
    const told = decide({
      state,
      side: 0,
      controller: createController(),
      profile: PRESS,
      kit: KIT,
      rule: "read_tell",
    })
    expect(told.verb).toBe("dodge")
    const fight = createFight({
      seed: 7,
      bounds: BOUNDS,
      fighters: [
        {
          ...fighter("home", state.fighters[0].pos.x, state.fighters[0].pos.z),
          staminaMax: 1,
        },
        fighter("away", state.fighters[1].pos.x, state.fighters[1].pos.z),
      ],
    })
    const result = fight.advance([told.intent, HOLD])
    expect(result.dodges).toEqual([{ key: "home", paid: false }])
  })

  test("does nothing when the foe is not winding up", () => {
    const quiet = order("read_tell")
    expect(quiet.rule).toBeUndefined()
    expect(quiet.commit).toBe("spark")
  })
})

describe("keep something back (FR-13)", () => {
  test("gives ground under the floor, where the doctrine presses", () => {
    const held = order("keep_back", { stamina: 20 })
    expect(held.verb).toBe("retreat")
    expect(held.rule).toBe("keep_back")
  })

  test("does nothing on a full pool", () => {
    const rested = order("keep_back")
    expect(rested.commit).toBe("spark")
    expect(rested.rule).toBeUndefined()
  })

  test("does nothing when the foe is one hit from down", () => {
    const finish = order("keep_back", { stamina: 20, foeHpPercent: 20 })
    expect(finish.rule).toBeUndefined()
    expect(finish.verb).toBe("commit")
  })

  test("an impossible note cannot deadlock: no stamina, no room, it still acts", () => {
    // Against the fence with a dry pool there is nothing to back off to and
    // nothing to spend; the note has to degrade to a strafe, not to a hold.
    let controller = createController()
    let state = stateFor({
      stamina: 0,
      home: { x: 3700, z: 0 },
      away: { x: 2600, z: 0 },
    })
    for (let i = 0; i < 24; i++) {
      const next = decide({
        state,
        side: 0,
        controller,
        profile: PRESS,
        kit: KIT,
        rule: "keep_back",
      })
      expect(next.verb).not.toBe("hold")
      expect(next.intent).not.toEqual(HOLD)
      expect(next.rule).toBe("keep_back")
      controller = next.state
      const step = (i + 1) * DECISION_STEPS
      state = { ...state, step, elapsedMs: step * STEP_MS }
    }
  })

  test("the strafe it falls back to is the doctrine's own strafe intent", () => {
    const state = stateFor({
      stamina: 0,
      home: { x: 3700, z: 0 },
      away: { x: 2600, z: 0 },
    })
    const next = decide({
      state,
      side: 0,
      controller: createController(),
      profile: PRESS,
      kit: KIT,
      rule: "keep_back",
    })
    expect(next.verb).toBe("strafe")
    expect(next.intent).toEqual(
      strafeIntent(state.fighters[0], state.fighters[1], 1, PRESS.seeksRear),
    )
  })

  test("the doctrine resumes the cadence after the note fires", () => {
    const low = stateFor({ stamina: 20 })
    const first = decide({
      state: low,
      side: 0,
      controller: createController(),
      profile: PRESS,
      kit: KIT,
      rule: "keep_back",
    })
    expect(first.rule).toBe("keep_back")
    const step = DECISION_STEPS
    const rested = decide({
      state: {
        ...low,
        step,
        elapsedMs: step * STEP_MS,
        fighters: [
          { ...low.fighters[0], stamina: low.fighters[0].staminaMax },
          low.fighters[1],
        ],
      },
      side: 0,
      controller: first.state,
      profile: PRESS,
      kit: KIT,
      rule: "keep_back",
    })
    expect(rested.rule).toBeUndefined()
    expect(rested.commit).toBe("spark")
  })
})

describe("never trade into a startup (FR-13)", () => {
  test("refuses the commit the doctrine would make", () => {
    const free = order(undefined, { gap: 860, tell: "basic", stamina: 6 })
    expect(free.commit).toBe("basic")
    expect(free.rule).toBeUndefined()

    const trade = order("never_trade", {
      gap: 860,
      tell: "basic",
      stamina: 6,
    })
    expect(trade.verb).toBe("advance")
    expect(trade.commit).toBeNull()
    expect(trade.rule).toBe("never_trade")
  })

  test("commits as usual when the foe is not winding up", () => {
    const free = order("never_trade")
    expect(free.commit).toBe("spark")
    expect(free.rule).toBeUndefined()
  })
})

describe("a rule never moves the band, the strafe, or the dodge policy (FR-12)", () => {
  test("above the ceiling every rule still closes", () => {
    for (const rule of RULE_IDS) {
      const out = order(rule, { gap: 2000 })
      expect(out.verb).toBe("advance")
      expect(out.rule).toBeUndefined()
    }
  })

  test("keep something back leaves the doctrine's dodge gate alone", () => {
    const told = order("keep_back", { gap: 860, tell: "basic" })
    expect(told.verb).toBe("dodge")
    expect(told.rule).toBeUndefined()
  })
})
