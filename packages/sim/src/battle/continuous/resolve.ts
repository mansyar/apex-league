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
 *   `double_ko`, including a shot that lands in the same step its owner goes
 *   down;
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

import { getBranch } from "../../branches"
import { bodyProfileFor, getSpecies, type Temperament } from "../../species"
import { type BattleEvent, fighterKey } from "../clock"
import type { Tactic } from "../policy"
import type { BattleReason, BattleResult, BattleSide } from "../resolver"
import {
  type ControllerProfile,
  type ControllerState,
  createController,
  DOCTRINES,
  type DoctrineId,
  decide,
  doctrineForTactic,
  profileForDoctrine,
} from "./controller"
import { startingHp } from "./hp"
import { hpSnapshot, type Sides, stepEvents } from "./report"
import { createFight, type Fight, type FighterInit } from "./step"
import { createStreamRecorder, rememberStream } from "./stream"
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
 * One side's controller tuning (FR-11, FR-12): the doctrine owns the band,
 * the strafe intent and the dodge policy, and the temperament only shades the
 * intensity inside it. A side that carries an explicit doctrine uses it; a
 * legacy save or gauge-clock side names a tactic instead, mapped forward at
 * this boundary so old saves still compile and still have a plan.
 */
export function engagementFor(
  temperament: Temperament,
  tactic: Tactic,
  doctrine?: DoctrineId,
): ControllerProfile {
  return profileForDoctrine(
    DOCTRINES[doctrine ?? doctrineForTactic(tactic)],
    temperament,
  )
}

/** How one fight ended: the winning side, or null for a double KO, and why. */
export interface Ending {
  /** 0 or 1 for a winner; null when both sides went down together. */
  readonly side: 0 | 1 | null
  readonly reason: BattleReason
}

/**
 * The fight's own keys: side 1 is disambiguated when a mirror would collide,
 * and that pair is what the whole result is filed under, so a mirror keeps
 * two sides.
 */
function fightKeys(sides: Sides): [string, string] {
  const [first, second] = sides.keys
  return [first, first === second ? `${second}#1` : second]
}

/**
 * The body volume a side opens with (FR-17): its form names a species, the
 * species names an archetype, and the archetype's authored profile gives the
 * radius and height. A side with no branch, or a branch with no species (the
 * legacy form), takes the default body rather than inventing a size.
 */
function bodyFor(side: BattleSide): { radiusMm: number; heightMm: number } {
  const branch = side.branch ? getBranch(side.branch) : undefined
  const species = branch?.speciesId ? getSpecies(branch.speciesId) : undefined
  const body = bodyProfileFor(species?.archetypeId)
  return { radiusMm: body.radiusMm, heightMm: body.heightMm }
}

/**
 * The hit-point scale every fighter enters with, in percent (tunable, FR-21).
 * It lives in `./hp` with `startingHp`, which applies it to a side; kept
 * exported here so the resolver's own surface is unchanged.
 */

/** One side's opening order: stats, hit points, body volume, and a facing at its foe. */
export function initFor(
  side: BattleSide,
  key: string,
  index: 0 | 1,
): FighterInit {
  const way = index === 0 ? 1 : -1
  const body = bodyFor(side)
  return {
    key,
    spd: side.stats.spd,
    at: { x: way * OPENING_GAP_MM, z: 0 },
    facing: { x: way * DIR_SCALE, z: 0 },
    stats: {
      atk: side.stats.atk,
      def: side.stats.def,
      element: side.element,
      affinity: side.affinity ?? null,
    },
    hp: startingHp(side),
    radiusMm: body.radiusMm,
    heightMm: body.heightMm,
  }
}

/**
 * The ending a state has already reached, or null while the fight is live.
 * Both sides at zero is a double KO (FR-7, FR-12).
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
  const names = [a.name, b.name] as const
  const sides: Sides = {
    names,
    // A mirror's second side is `name#1` in `finalHp` and the log (FR-12).
    keys: fightKeys({ names, keys: [fighterKey(a), fighterKey(b)] }),
  }
  const keys = sides.keys
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
    engagementFor(a.temperament, a.tactic, a.doctrine),
    engagementFor(b.temperament, b.tactic, b.doctrine),
  ]
  const kits: [readonly string[], readonly string[]] = [a.kit, b.kit]
  const poiseDealt: [number, number] = [0, 0]
  const downed = new Set<number>()
  const events: BattleEvent[] = []
  let ending: Ending | null = null
  let state = fight.state
  const recorder = createStreamRecorder(
    keys,
    ARENA_BOUNDS,
    FIGHT_CAP_STEPS + 1,
    state,
  )

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
        rule: (side === 0 ? a : b).rule,
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
    recorder.push(state, result.pinned)
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
    // A draw still files under a slot: playback and the cup's filters key on
    // `actorKey`, and the line names neither side as the victor.
    events.push({
      tick: state.step,
      kind: "draw",
      actor: sides.names[0],
      actorKey: sides.keys[0],
      hpAfter: hpSnapshot(state, sides.keys),
      line: "Both fighters are down. The spar is a draw.",
    })
  }

  const result: BattleResult = {
    winner: ending.side === null ? null : sides.names[ending.side],
    reason: ending.reason,
    finalHp: hpSnapshot(state, sides.keys),
    events,
  }
  // The dense trace rides with the result in memory (never in the save):
  // the arena that plays this fight reads it, a restored verdict does not.
  return rememberStream(result, recorder.finish())
}
