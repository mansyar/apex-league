/**
 * The continuous fight's resolver: two sides and a seed in, the `BattleResult`
 * the game already consumes out.
 *
 * Continuous Arena Battle FR-12 and AC-12. `./step` runs the fixed-step fight,
 * `./controller` orders both sides on its cadence, and this module is the seam
 * that opens the fight from the same `BattleSide` the gauge clock takes, walks
 * it to an ending, and reports that ending in the existing vocabulary:
 *
 * - exactly one side at zero HP is a `ko`; both at zero in the same step is a
 *   `double_ko`, including a shot that lands after its owner is already down;
 * - at the cap the higher remaining HP percentage wins, then the higher poise
 *   damage dealt, then the seed — in exactly that order (`time`).
 *
 * The cap is a duration in milliseconds, never a step count, so retuning
 * `STEP_MS` cannot change how long a fight may run. `./report` maps the steps
 * onto the existing event kinds, so `buildPlaybackScript` and the cup replay
 * read this result unchanged.
 *
 * `resolveBattle` in ../resolver stays exactly as it is: it is the frozen
 * legacy path, and this engine is a separate entry point.
 */

import type { Temperament } from "../../species"
import { type BattleEvent, fighterKey } from "../clock"
import type { Tactic } from "../policy"
import type { BattleReason, BattleResult, BattleSide } from "../resolver"
import {
  type ControllerProfile,
  type ControllerState,
  createController,
  decide,
  profileFor,
  RANGE_BAND_MM,
} from "./controller"
import { hpSnapshot, type Sides, stepEvents } from "./report"
import { createFight, type Fight, type FighterInit } from "./step"
import {
  type ArenaBounds,
  DIR_SCALE,
  type FightState,
  HOLD,
  type MoveIntent,
  STEP_MS,
} from "./types"

/**
 * The cap: how long a fight may run, in ms (tunable). The spec's fights land
 * in the 25-40 s band, so the cap is the top of that band and a normal KO
 * lands well before it. Duration, not steps, is the contract (FR-12).
 */
export const FIGHT_CAP_MS = 40000

/** The cap counted in fixed steps, for the loop bound only. */
export const FIGHT_CAP_STEPS = FIGHT_CAP_MS / STEP_MS

/**
 * The arena the resolver fights in, in millimetres: 8 m × 6 m centred on the
 * origin. The fight only needs the fence, so this is the floor every phase's
 * tests walk; the client's staging owns what is drawn on it.
 */
export const ARENA_BOUNDS: ArenaBounds = Object.freeze({
  minX: -4000,
  maxX: 4000,
  minZ: -3000,
  maxZ: 3000,
})

/** How far from the centre line each side opens, in mm. */
export const OPENING_GAP_MM = 2000

/**
 * What a coach's tactic adds to its archetype's engagement, in the two fields
 * the controller steers by: the centre of the range band, in mm, and the share
 * of each cycle spent pressing, in percent. `specials` works the fight out at
 * distance and presses harder; `balanced` prefers the clinch and leans on its
 * basic. This is a mapping, not a second system: the archetype row stays the
 * base, so a rush rival still rushes (FR-11).
 */
export interface EngagementOverlay {
  /** Added to the archetype's preferred range, in mm (negative closes). */
  readonly rangeMm: number
  /** Added to the archetype's aggression, in percent. */
  readonly aggression: number
}

/**
 * The two overlays, frozen so a balance pass can move them here rather than
 * hunting through the resolver. The archetype rows sit 1,200 mm and 40 points
 * apart, so half a step each way is enough to change the decisions a fight
 * turns on without inverting a temperament: rush + `balanced` holds 800 mm,
 * slow + `specials` holds 3,200 mm, and neither leaves its character behind.
 */
export const TACTIC_OVERLAYS: Readonly<Record<Tactic, EngagementOverlay>> =
  Object.freeze({
    balanced: Object.freeze({ rangeMm: -600, aggression: -10 }),
    specials: Object.freeze({ rangeMm: 600, aggression: 10 }),
  })

/** A share of the cycle, clamped to a percentage. */
function share(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/**
 * One side's controller tuning: its archetype row with the coach's tactic laid
 * over the engagement fields only — preferred range and aggression. Strafe and
 * dodge stay the archetype's own, and the range keeps a floor of one band so a
 * band can never invert.
 */
export function engagementFor(
  temperament: Temperament,
  tactic: Tactic,
): ControllerProfile {
  const base = profileFor(temperament)
  const overlay = TACTIC_OVERLAYS[tactic]
  const range = base.preferredRangeMm + overlay.rangeMm
  return Object.freeze({
    ...base,
    preferredRangeMm: Math.max(RANGE_BAND_MM, range),
    aggression: share(base.aggression + overlay.aggression),
  })
}

/** How one fight ended: the winning side, or null for a double KO, and why. */
export interface Ending {
  /** 0 or 1 for a winner; null when both sides went down together. */
  readonly side: 0 | 1 | null
  readonly reason: BattleReason
}

/**
 * The fight's own keys: each side's stable key, with side 1 disambiguated
 * only when a mirror match would otherwise collide. `finalHp` keeps the
 * contract keys, so callers see the map the gauge clock emits.
 */
function fightKeys(sides: Sides): [string, string] {
  const [first, second] = sides.keys
  return [first, first === second ? `${second}#1` : second]
}

/** One side's opening order: stats, hit points, and a facing at its foe. */
function initFor(side: BattleSide, key: string, index: 0 | 1): FighterInit {
  const way = index === 0 ? 1 : -1
  return {
    key,
    spd: side.stats.spd,
    at: { x: way * OPENING_GAP_MM, z: 0 },
    facing: { x: way * DIR_SCALE, z: 0 },
    stats: { atk: side.stats.atk, def: side.stats.def, element: side.element },
    hp: side.stats.hp,
  }
}

/**
 * The ending a state has already reached, or null while the fight is live.
 * Both sides at zero is a double KO whatever order they fell in: the step is
 * judged as a whole (FR-7, FR-12).
 */
export function downEnding(state: FightState): Ending | null {
  const [home, away] = state.fighters
  const homeDown = home.hp <= 0
  const awayDown = away.hp <= 0
  if (homeDown && awayDown) return { side: null, reason: "double_ko" }
  if (homeDown) return { side: 1, reason: "ko" }
  if (awayDown) return { side: 0, reason: "ko" }
  return null
}

/**
 * The cap's ranking (AC-12): higher remaining HP percentage first — compared
 * as `hp * foeMax` against `foeHp * hpMax`, so the comparison stays integer —
 * then the higher poise damage dealt, then the seed, in that order. An even
 * seed favours side 0, matching the legacy resolver's tiebreak.
 */
export function pointsWinner(
  state: FightState,
  poiseDealt: readonly [number, number],
  seed: number,
): 0 | 1 {
  const [home, away] = state.fighters
  const homeShare = home.hp * away.hpMax
  const awayShare = away.hp * home.hpMax
  if (homeShare !== awayShare) return homeShare > awayShare ? 0 : 1
  if (poiseDealt[0] !== poiseDealt[1]) {
    return poiseDealt[0] > poiseDealt[1] ? 0 : 1
  }
  return (seed >>> 0) % 2 === 0 ? 0 : 1
}

/**
 * Run one fight to its ending and report it as a `BattleResult` (FR-12).
 *
 * Both sides are decided from the same top-of-step state and committed before
 * the step advances, so the fight is a pure function of the two sides, the
 * seed, and nothing else — no wall clock, no random draw. The returned event
 * log is the ordered replay the cup and the arena already consume.
 */
export function resolveContinuous(
  a: Readonly<BattleSide>,
  b: Readonly<BattleSide>,
  seed: number,
): BattleResult {
  const sides: Sides = {
    names: [a.name, b.name],
    keys: [fighterKey(a), fighterKey(b)],
  }
  const keys = fightKeys(sides)
  const fight: Fight = createFight({
    seed,
    bounds: ARENA_BOUNDS,
    fighters: [initFor(a, keys[0], 0), initFor(b, keys[1], 1)],
  })
  const brains: [ControllerState, ControllerState] = [
    createController(),
    createController(),
  ]
  const profiles: [ControllerProfile, ControllerProfile] = [
    engagementFor(a.temperament, a.tactic),
    engagementFor(b.temperament, b.tactic),
  ]
  const kits: [readonly string[], readonly string[]] = [a.kit, b.kit]
  const poiseDealt: [number, number] = [0, 0]
  const downed = new Set<number>()
  const events: BattleEvent[] = []
  let ending: Ending | null = null
  let state = fight.state

  for (let step = 0; step < FIGHT_CAP_STEPS && !ending; step++) {
    const before = state
    const orders: [MoveIntent, MoveIntent] = [HOLD, HOLD]
    for (const side of [0, 1] as const) {
      const order = decide({
        state: before,
        side,
        controller: brains[side],
        profile: profiles[side],
        kit: kits[side],
      })
      brains[side] = order.state
      orders[side] = order.intent
      if (order.commit) fight.commit(side, order.commit)
    }
    const result = fight.advance(orders)
    state = result.state
    for (const strike of result.strikes) {
      const side = state.fighters[0].key === strike.attackerKey ? 0 : 1
      poiseDealt[side] += strike.poiseDamage
    }
    for (const shot of result.shots) {
      if (shot.outcome !== "hit") continue
      const side = state.fighters[0].key === shot.ownerKey ? 0 : 1
      poiseDealt[side] += shot.poiseDamage
    }
    events.push(...stepEvents(result, sides, before, downed))
    ending = downEnding(state)
  }

  if (!ending) {
    const side = pointsWinner(state, poiseDealt, seed)
    ending = { side, reason: "time" }
    events.push({
      tick: state.step,
      kind: "time",
      actor: sides.names[side],
      actorKey: sides.keys[side],
      hpAfter: hpSnapshot(state, sides.keys),
      line: `Time's up. ${sides.names[side]} is still standing.`,
    })
  } else if (ending.reason === "double_ko") {
    events.push({
      tick: state.step,
      kind: "draw",
      actor: "",
      hpAfter: hpSnapshot(state, sides.keys),
      line: "Both fighters are down. The spar is a draw.",
    })
  }

  return {
    winner: ending.side === null ? null : sides.names[ending.side],
    reason: ending.reason,
    finalHp: hpSnapshot(state, sides.keys),
    events,
  }
}
