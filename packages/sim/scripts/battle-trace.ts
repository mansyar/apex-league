/**
 * Battle trace — one seeded fight, step by step, headless.
 *
 * The project has two ways to look at a fight: aggregate telemetry over 14
 * seeds (`bun run telemetry`) and a screenshot. Neither can answer "which step
 * did it go wrong on", which is why every investigation into "it teleports",
 * "they never retreat" or "the cooldown is too fast" ended in reading source
 * and guessing. This harness closes that gap: it replays one fight through the
 * same public resolver the cup calls, then prints the per-step state the dense
 * stream does not carry (stamina, poise, velocity, the committed move, the
 * controller's verb) and checks the invariants a fight must hold.
 *
 *   bun run trace                                  # the default KO fight
 *   bun run trace --seed 3 --every 50              # a coarse timeline
 *   bun run trace --seed 3 --check                 # invariant gate, exit code
 *   bun run trace --seed 3 --json > fight.json     # machine-readable
 *
 * The replay is the resolver's own loop, not a second engine: the same
 * `initFor` orders, `engagementFor` profiles, `createController` brains,
 * `decide` cadence and `createFight` step. It is not trusted — every trace is
 * cross-checked against `resolveContinuous` (same ending, same final HP, same
 * event log, byte for byte) and the harness refuses to report a trace that
 * diverged. So the numbers below are the fight the game plays, and the extra
 * columns are read from the state the resolver held while playing it.
 *
 * Integer arithmetic only, no wall clock, no random source: the same flags
 * print the same bytes. `--check` is the point of the tool: it exits non-zero
 * naming the invariant that failed, so a bug is a failing assertion rather
 * than a picture to argue about.
 */

import type { BattleEvent } from "../src/battle/clock"
import { fighterKey } from "../src/battle/clock"
import {
  type ControllerProfile,
  type ControllerState,
  createController,
  decide,
  preferredRangeFor,
  reachEdgeMm,
} from "../src/battle/continuous/controller"
import { POISE_BREAK_MS } from "../src/battle/continuous/poise"
import {
  hpSnapshot,
  type Sides,
  stepEvents,
} from "../src/battle/continuous/report"
import {
  ARENA_BOUNDS,
  downEnding,
  type Ending,
  engagementFor,
  FIGHT_CAP_STEPS,
  initFor,
  pointsWinner,
  resolveContinuous,
} from "../src/battle/continuous/resolve"
import { createFight, stateHash } from "../src/battle/continuous/step"
import {
  type ArenaBounds,
  type AttackPhase,
  type FighterState,
  HOLD,
  type MoveIntent,
  STEP_MS,
} from "../src/battle/continuous/types"
import { getFrameData } from "../src/battle/frames"
import { getMove } from "../src/battle/moves"
import type { Tactic } from "../src/battle/policy"
import type { BattleReason, BattleSide } from "../src/battle/resolver"
import { branchesForSpecies, getBranch } from "../src/branches"
import type { Element } from "../src/creature"
import {
  ALL_SPECIES,
  bodyProfileFor,
  getSpecies,
  type SpeciesDef,
  type Temperament,
} from "../src/species"

/**
 * The stat line both sides are ramped to, exactly as the telemetry harness
 * does: the middle of the starter band, clamped into each species' own roll
 * bounds, which is what `rampStats` builds for a real cup fight. A traced fight
 * therefore reproduces its telemetry row rather than a second, private stat
 * convention.
 */
const REFERENCE = { hp: 189, atk: 10, def: 10, spd: 10 } as const

/** The default pair: the telemetry sample's KO row at an odd seed. */
const DEFAULT_OWNED = "plant_ox"
const DEFAULT_RIVAL = "embercub"

/** The grid a "distinct position" is counted on, in millimetres. */
const CELL_MM = 100

/** Everything the command line can change. */
export interface TraceOptions {
  readonly seed: number
  readonly owned: string
  readonly rival: string
  readonly kit: readonly string[] | null
  readonly rivalKit: readonly string[] | null
  /** Sample every n steps instead of printing only steps that changed. */
  readonly every: number
  readonly json: boolean
  readonly check: boolean
}

/** One side as the fight opened: the sheet, the kit and the profile in force. */
export interface SideTrace {
  readonly speciesId: string
  readonly name: string
  readonly element: Element
  readonly temperament: Temperament
  readonly tactic: Tactic
  readonly stats: {
    readonly hp: number
    readonly atk: number
    readonly def: number
    readonly spd: number
  }
  readonly kit: readonly string[]
  readonly branch: string | null
  readonly radiusMm: number
  readonly heightMm: number
  /** The pool the resolver actually fights on (`startingHp`), not the stat. */
  readonly hpMax: number
  readonly staminaMax: number
  readonly poiseMax: number
  /** The archetype row plus the coach's tactic overlay. */
  readonly profile: ControllerProfile
  /** The preferred range this pair actually holds, in mm (FR-1). */
  readonly preferredRangeMm: number
  /** The innate strike's reach plus both bodies' radii, in mm. */
  readonly reachEdgeMm: number
}

/** One side's state at one step, read from the live `FighterState`. */
export interface FrameSide {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly vx: number
  readonly vy: number
  readonly vz: number
  readonly hp: number
  readonly stamina: number
  readonly poise: number
  readonly poiseBreakMs: number
  readonly hitstunMs: number
  readonly pinned: boolean
  readonly phase: AttackPhase | null
  /** Milliseconds spent in the current phase, 0 when no attack is held. */
  readonly phaseMs: number
  readonly moveId: string | null
}

/** Something that happened on a step, with the number that makes it checkable. */
export interface TraceEvent {
  readonly step: number
  readonly kind: string
  /** 0 owned / 1 rival, or null when the event names no side. */
  readonly side: 0 | 1 | null
  readonly moveId: string | null
  readonly damage: number
  readonly poiseDamage: number
  readonly detail: string
}

/** One step of the fight: both bodies, the gap, and what happened. */
export interface StepFrame {
  readonly step: number
  readonly ms: number
  /** Centre-to-centre gap in whole millimetres (integer sqrt, floored). */
  readonly gap: number
  readonly owned: FrameSide
  readonly rival: FrameSide
  readonly events: readonly TraceEvent[]
}

/** The summary numbers a bug report is written from. */
export interface Summary {
  readonly ms: number
  readonly steps: number
  readonly reason: BattleReason
  readonly winner: string | null
  /** Landed blows (a hit, not a swing or a launch), owned then rival. */
  readonly blows: readonly [number, number]
  /** Accepted commits, owned then rival. */
  readonly commits: readonly [number, number]
  /** Damage dealt, owned then rival. */
  readonly damage: readonly [number, number]
  /** Damage dealt as a share of the foe's pool, owned then rival. */
  readonly damageShare: readonly [number, number]
  /** Accepted commits per second of fight time, owned then rival. */
  readonly attackRate: readonly [number, number]
  readonly gap: {
    readonly min: number
    readonly median: number
    readonly max: number
  }
  /** Distinct 100 mm cells visited, owned then rival. */
  readonly distinct: readonly [number, number]
  readonly staminaMin: readonly [number, number]
  readonly poiseMin: readonly [number, number]
  readonly hash: number
}

/** One fight, fully traced. */
export interface FightTrace {
  readonly options: TraceOptions
  readonly owned: SideTrace
  readonly rival: SideTrace
  readonly bounds: ArenaBounds
  readonly steps: readonly StepFrame[]
  readonly events: readonly TraceEvent[]
  readonly hash: number
  readonly reason: BattleReason
  readonly winner: string | null
  readonly finalHp: Readonly<Record<string, number>>
  readonly summary: Summary
}

/** One named assertion `--check` runs. */
export interface Invariant {
  readonly name: string
  readonly description: string
  readonly ok: boolean
  /** The first offending step and value, or what was sampled. */
  readonly detail: string
}

function clampStat(value: number, bounds: readonly [number, number]): number {
  return Math.min(bounds[1], Math.max(bounds[0], value))
}

/** A roster species as the side a cup slot would build, with the telemetry stats. */
function battleSideOf(
  species: SpeciesDef,
  tactic: Tactic,
  kit: readonly string[] | null,
): BattleSide {
  const body = branchesForSpecies(species.id)[0]
  const bounds = species.statBounds
  return {
    name: species.displayName,
    // The side key, not the species id: a mirror must still be two sides, and
    // the exhibition's own keys are the readable ones.
    id: species.id,
    element: species.element,
    stats: {
      hp: clampStat(REFERENCE.hp, bounds.hp),
      atk: clampStat(REFERENCE.atk, bounds.atk),
      def: clampStat(REFERENCE.def, bounds.def),
      spd: clampStat(REFERENCE.spd, bounds.spd),
    },
    kit: kit ?? species.kit.slice(0, 4),
    tactic,
    temperament: species.temperament,
    branch: body?.id,
  }
}

/**
 * The body a side fights with (FR-17): its form names a species, the species
 * names an archetype, and the archetype's authored profile carries the volume.
 * Mirrors `bodyFor` in ./resolve, which is private, so the header and the fight
 * cannot disagree about a body.
 */
function bodyOf(side: BattleSide): { radiusMm: number; heightMm: number } {
  const branch = side.branch ? getBranch(side.branch) : undefined
  const target = branch?.speciesId ? getSpecies(branch.speciesId) : undefined
  const body = bodyProfileFor(target?.archetypeId)
  return { radiusMm: body.radiusMm, heightMm: body.heightMm }
}

/** A whole number in a fixed-width numeric column. */
function num(value: number, width: number): string {
  return String(value).padStart(width)
}

/** A label in a fixed-width text column. */
function text(value: string, width: number): string {
  return value.padEnd(width)
}

/**
 * The floor distance between two points, in whole millimetres, with integer
 * arithmetic only (Newton's method). Floored rather than rounded so the value
 * is a function of the state and never of a float rounding mode.
 */
export function integerGap(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = ax - bx
  const dz = az - bz
  const n = dx * dx + dz * dz
  if (n <= 0) return 0
  let x = n
  let y = Math.floor((x + 1) / 2)
  while (y < x) {
    x = y
    y = Math.floor((x + Math.floor(n / x)) / 2)
  }
  return x
}

/** The middle of a numeric sample (the mean of the two middles when even). */
function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const mid = sorted.length >> 1
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/** A side's frame, read from the resolver's own state. */
function frameSide(fighter: FighterState, pinned: boolean): FrameSide {
  return {
    x: fighter.pos.x,
    y: fighter.pos.y,
    z: fighter.pos.z,
    vx: fighter.vel.x,
    vy: fighter.vel.y,
    vz: fighter.vel.z,
    hp: fighter.hp,
    stamina: fighter.stamina,
    poise: fighter.poise,
    poiseBreakMs: fighter.poiseBreakMs,
    hitstunMs: fighter.hitstunMs,
    pinned,
    phase: fighter.attack?.phase ?? null,
    phaseMs: fighter.attack?.elapsedMs ?? 0,
    moveId: fighter.attack?.moveId ?? null,
  }
}

/** The verb a decision ordered, in the third person for the log. */
function verbText(verb: string): string {
  switch (verb) {
    case "advance":
      return "advances"
    case "retreat":
      return "retreats"
    case "strafe":
      return "strafes"
    case "dodge":
      return "dodges"
    case "commit":
      return "commits"
    default:
      return "holds"
  }
}

/** A stable signature of the event sequence, for the determinism invariant. */
function eventSignature(events: readonly TraceEvent[]): string {
  return events
    .map(
      (event) =>
        `${event.step}:${event.kind}:${event.side ?? "-"}:${event.moveId ?? "-"}:${event.damage}:${event.poiseDamage}`,
    )
    .join("|")
}

interface Replay {
  readonly owned: SideTrace
  readonly rival: SideTrace
  readonly steps: StepFrame[]
  readonly events: TraceEvent[]
  readonly hash: number
  readonly reason: BattleReason
  readonly winner: string | null
  readonly finalHp: Readonly<Record<string, number>>
}

/**
 * Replay the fight and collect the per-step detail the stream does not store.
 * The loop is `resolveContinuous`'s, decision for decision; the result is
 * checked against that resolver before it is returned, so a drift between the
 * two is a loud error rather than a quietly different fight.
 */
function replay(options: TraceOptions): Replay {
  // Tactics follow the telemetry harness's seed-parity rule, so a traced fight
  // is the same fight as its telemetry row (an odd seed fields specials on the
  // owned side). The seed still decides nothing inside the step loop.
  const even = options.seed % 2 === 0
  const ownedTactic: Tactic = even ? "balanced" : "specials"
  const rivalTactic: Tactic = even ? "specials" : "balanced"
  const ownedDef = getSpecies(options.owned)
  const rivalDef = getSpecies(options.rival)
  if (!ownedDef) {
    throw new Error(
      `unknown species "${options.owned}" — one of: ${ALL_SPECIES.map((row) => row.id).join(", ")}`,
    )
  }
  if (!rivalDef) {
    throw new Error(
      `unknown species "${options.rival}" — one of: ${ALL_SPECIES.map((row) => row.id).join(", ")}`,
    )
  }
  const ownedSide = battleSideOf(ownedDef, ownedTactic, options.kit)
  const rivalSide = battleSideOf(rivalDef, rivalTactic, options.rivalKit)

  const names = [ownedSide.name, rivalSide.name] as const
  const firstKey = fighterKey(ownedSide)
  const secondKey = fighterKey(rivalSide)
  const keys: readonly [string, string] = [
    firstKey,
    firstKey === secondKey ? `${secondKey}#1` : secondKey,
  ]
  const sides: Sides = { names, keys }

  const fight = createFight({
    seed: options.seed,
    bounds: ARENA_BOUNDS,
    fighters: [initFor(ownedSide, keys[0], 0), initFor(rivalSide, keys[1], 1)],
  })
  const brains: [ControllerState, ControllerState] = [
    createController(),
    createController(),
  ]
  const profiles: [ControllerProfile, ControllerProfile] = [
    engagementFor(ownedSide.temperament, ownedSide.tactic),
    engagementFor(rivalSide.temperament, rivalSide.tactic),
  ]
  const kits: [readonly string[], readonly string[]] = [
    ownedSide.kit,
    rivalSide.kit,
  ]
  const poiseDealt: [number, number] = [0, 0]
  const downed = new Set<number>()
  const canonical: BattleEvent[] = []
  const steps: StepFrame[] = []
  const events: TraceEvent[] = []
  const previousVerbs: [string | null, string | null] = [null, null]

  let state = fight.state
  const opening = state
  const openingFrame: StepFrame = {
    step: 0,
    ms: 0,
    gap: integerGap(
      opening.fighters[0].pos.x,
      opening.fighters[0].pos.z,
      opening.fighters[1].pos.x,
      opening.fighters[1].pos.z,
    ),
    owned: frameSide(opening.fighters[0], false),
    rival: frameSide(opening.fighters[1], false),
    events: [],
  }
  steps.push(openingFrame)

  let ending: Ending | null = null
  for (let step = 0; step < FIGHT_CAP_STEPS && !ending; step++) {
    const before = state
    const tick = before.step + 1
    const orders: [MoveIntent, MoveIntent] = [HOLD, HOLD]
    const tickEvents: TraceEvent[] = []

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
      const label = side === 0 ? "owned" : "rival"

      if (previousVerbs[side] !== order.verb) {
        previousVerbs[side] = order.verb
        tickEvents.push({
          step: tick,
          kind: "verb",
          side,
          moveId: null,
          damage: 0,
          poiseDamage: 0,
          detail: `${label} ${verbText(order.verb)}`,
        })
      }
      if (order.commit) {
        const accepted = fight.commit(side, order.commit)
        tickEvents.push({
          step: tick,
          kind: accepted ? "commit" : "commit-refused",
          side,
          moveId: order.commit,
          damage: 0,
          poiseDamage: 0,
          detail: accepted
            ? `${label} commits ${order.commit}`
            : `${label} commit refused: ${order.commit}`,
        })
      }
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
    canonical.push(...stepEvents(result, sides, before, downed))

    const sideOf = (key: string): 0 | 1 =>
      state.fighters[0].key === key ? 0 : 1
    for (const strike of result.strikes) {
      const side = sideOf(strike.attackerKey)
      tickEvents.push({
        step: tick,
        kind: "strike",
        side,
        moveId: strike.moveId,
        damage: strike.damage,
        poiseDamage: strike.poiseDamage,
        detail: `${side === 0 ? "owned" : "rival"} lands ${strike.moveId} for ${strike.damage} (poise ${strike.poiseDamage})`,
      })
    }
    for (const shot of result.shots) {
      const side = sideOf(shot.ownerKey)
      const hit = shot.outcome === "hit"
      tickEvents.push({
        step: tick,
        kind: hit ? "shot-hit" : "shot-dodged",
        side,
        moveId: shot.moveId,
        damage: shot.damage,
        poiseDamage: shot.poiseDamage,
        detail: hit
          ? `${side === 0 ? "owned" : "rival"}'s ${shot.moveId} hits for ${shot.damage} (poise ${shot.poiseDamage})`
          : `${side === 0 ? "rival" : "owned"} slips ${shot.moveId}`,
      })
    }
    for (const launch of result.launched) {
      const side = sideOf(launch.ownerKey)
      tickEvents.push({
        step: tick,
        kind: "launch",
        side,
        moveId: launch.moveId,
        damage: 0,
        poiseDamage: 0,
        detail: `${side === 0 ? "owned" : "rival"} looses ${launch.moveId}`,
      })
    }
    for (const whiff of result.whiffs) {
      const side = sideOf(whiff.attackerKey)
      tickEvents.push({
        step: tick,
        kind: "whiff",
        side,
        moveId: whiff.moveId,
        damage: 0,
        poiseDamage: 0,
        detail: `${side === 0 ? "owned" : "rival"}'s ${whiff.moveId} swings wide`,
      })
    }
    for (const dodge of result.dodges) {
      const side = sideOf(dodge.key)
      tickEvents.push({
        step: tick,
        kind: dodge.paid ? "dodge" : "dodge-refused",
        side,
        moveId: null,
        damage: 0,
        poiseDamage: 0,
        detail: dodge.paid
          ? `${side === 0 ? "owned" : "rival"} dodges`
          : `${side === 0 ? "owned" : "rival"} dodge refused (stamina)`,
      })
    }
    for (const pinned of result.pinned) {
      const side = sideOf(pinned.key)
      tickEvents.push({
        step: tick,
        kind: "pinned",
        side,
        moveId: null,
        damage: 0,
        poiseDamage: 0,
        detail: `${side === 0 ? "owned" : "rival"} pinned (x ${pinned.x}, z ${pinned.z})`,
      })
    }
    for (const side of [0, 1] as const) {
      const broke =
        before.fighters[side].poiseBreakMs !== POISE_BREAK_MS &&
        state.fighters[side].poiseBreakMs === POISE_BREAK_MS
      if (!broke) continue
      tickEvents.push({
        step: tick,
        kind: "break",
        side,
        moveId: null,
        damage: 0,
        poiseDamage: 0,
        detail: `${side === 0 ? "owned" : "rival"} guard breaks`,
      })
    }
    for (const side of [0, 1] as const) {
      if (before.fighters[side].hp > 0 && state.fighters[side].hp <= 0) {
        tickEvents.push({
          step: tick,
          kind: "down",
          side,
          moveId: null,
          damage: 0,
          poiseDamage: 0,
          detail: `${side === 0 ? "owned" : "rival"} goes down`,
        })
      }
    }

    events.push(...tickEvents)
    const pinnedKeys = new Set(result.pinned.map((row) => row.key))
    steps.push({
      step: state.step,
      ms: state.elapsedMs,
      gap: integerGap(
        state.fighters[0].pos.x,
        state.fighters[0].pos.z,
        state.fighters[1].pos.x,
        state.fighters[1].pos.z,
      ),
      owned: frameSide(
        state.fighters[0],
        pinnedKeys.has(state.fighters[0].key),
      ),
      rival: frameSide(
        state.fighters[1],
        pinnedKeys.has(state.fighters[1].key),
      ),
      events: tickEvents,
    })
    ending = downEnding(state)
  }

  if (!ending) {
    const side = pointsWinner(state, poiseDealt, options.seed)
    ending = { side, reason: "time" }
  }
  const finalHp = hpSnapshot(state, keys)
  const winner = ending.side === null ? null : names[ending.side]

  // The replay is only worth reporting if it is the resolver's fight. This is
  // the telemetry harness's discipline applied to a single fight: compare the
  // ending, the pools and the whole ordered event log, not a spot check.
  const resolved = resolveContinuous(ownedSide, rivalSide, options.seed)
  const loopEvents = resolved.events.slice(0, canonical.length)
  const tail = resolved.events.slice(canonical.length)
  const tailIsEnding =
    tail.length === 0 ||
    (tail.length === 1 &&
      (tail[0]?.kind === "time" || tail[0]?.kind === "draw"))
  if (
    resolved.reason !== ending.reason ||
    resolved.winner !== winner ||
    JSON.stringify(resolved.finalHp) !== JSON.stringify(finalHp) ||
    !tailIsEnding ||
    JSON.stringify(loopEvents) !== JSON.stringify(canonical)
  ) {
    throw new Error(
      `the trace replay diverged from resolveContinuous (seed ${options.seed})`,
    )
  }

  const ownedBody = bodyOf(ownedSide)
  const rivalBody = bodyOf(rivalSide)
  const openingOwned = opening.fighters[0]
  const openingRival = opening.fighters[1]
  const ownedProfile = profiles[0]
  const rivalProfile = profiles[1]
  const ownedEdge = reachEdgeMm(openingOwned, openingRival)
  const rivalEdge = reachEdgeMm(openingRival, openingOwned)

  return {
    owned: {
      speciesId: ownedSide.id ?? options.owned,
      name: ownedSide.name,
      element: ownedSide.element,
      temperament: ownedSide.temperament,
      tactic: ownedSide.tactic,
      stats: ownedSide.stats,
      kit: ownedSide.kit,
      branch: ownedSide.branch ?? null,
      radiusMm: ownedBody.radiusMm,
      heightMm: ownedBody.heightMm,
      hpMax: openingOwned.hpMax,
      staminaMax: openingOwned.staminaMax,
      poiseMax: openingOwned.poiseMax,
      profile: ownedProfile,
      preferredRangeMm: preferredRangeFor(ownedProfile, ownedEdge),
      reachEdgeMm: ownedEdge,
    },
    rival: {
      speciesId: rivalSide.id ?? options.rival,
      name: rivalSide.name,
      element: rivalSide.element,
      temperament: rivalSide.temperament,
      tactic: rivalSide.tactic,
      stats: rivalSide.stats,
      kit: rivalSide.kit,
      branch: rivalSide.branch ?? null,
      radiusMm: rivalBody.radiusMm,
      heightMm: rivalBody.heightMm,
      hpMax: openingRival.hpMax,
      staminaMax: openingRival.staminaMax,
      poiseMax: openingRival.poiseMax,
      profile: rivalProfile,
      preferredRangeMm: preferredRangeFor(rivalProfile, rivalEdge),
      reachEdgeMm: rivalEdge,
    },
    steps,
    events,
    hash: stateHash(state),
    reason: ending.reason,
    winner,
    finalHp,
  }
}

/** Count the events of one kind per side. */
function countBySide(
  events: readonly TraceEvent[],
  kinds: readonly string[],
): [number, number] {
  const counts: [number, number] = [0, 0]
  for (const event of events) {
    if (event.side === null || !kinds.includes(event.kind)) continue
    counts[event.side] += 1
  }
  return counts
}

/** Sum the damage each side dealt. */
function damageBySide(events: readonly TraceEvent[]): [number, number] {
  const damage: [number, number] = [0, 0]
  for (const event of events) {
    if (event.side === null || event.damage === 0) continue
    damage[event.side] += event.damage
  }
  return damage
}

/** The fight's summary numbers, all read from the frames and events above. */
function summarise(replay: Replay): Summary {
  const fightFrames = replay.steps.slice(1)
  const gaps = fightFrames.map((frame) => frame.gap)
  const cells: [Set<string>, Set<string>] = [new Set(), new Set()]
  const staminaMin: [number, number] = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ]
  const poiseMin: [number, number] = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ]
  for (const frame of replay.steps) {
    for (const side of [0, 1] as const) {
      const body = side === 0 ? frame.owned : frame.rival
      staminaMin[side] = Math.min(staminaMin[side], body.stamina)
      poiseMin[side] = Math.min(poiseMin[side], body.poise)
    }
  }
  for (const frame of fightFrames) {
    cells[0].add(
      `${Math.floor(frame.owned.x / CELL_MM)},${Math.floor(frame.owned.z / CELL_MM)}`,
    )
    cells[1].add(
      `${Math.floor(frame.rival.x / CELL_MM)},${Math.floor(frame.rival.z / CELL_MM)}`,
    )
  }
  const ms = replay.steps[replay.steps.length - 1]?.ms ?? 0
  const seconds = ms / 1000
  const blows = countBySide(replay.events, ["strike", "shot-hit"])
  const commits = countBySide(replay.events, ["commit"])
  const damage = damageBySide(replay.events)
  return {
    ms,
    steps: replay.steps.length - 1,
    reason: replay.reason,
    winner: replay.winner,
    blows,
    commits,
    damage,
    damageShare: [
      replay.rival.hpMax === 0 ? 0 : damage[0] / replay.rival.hpMax,
      replay.owned.hpMax === 0 ? 0 : damage[1] / replay.owned.hpMax,
    ],
    attackRate: [
      seconds === 0 ? 0 : commits[0] / seconds,
      seconds === 0 ? 0 : commits[1] / seconds,
    ],
    gap: {
      min: gaps.length === 0 ? 0 : Math.min(...gaps),
      median: median(gaps),
      max: gaps.length === 0 ? 0 : Math.max(...gaps),
    },
    distinct: [cells[0].size, cells[1].size],
    staminaMin,
    poiseMin,
    hash: replay.hash,
  }
}

/** Trace one fight. Pure: same options in, same bytes out. */
export function traceFight(options: TraceOptions): FightTrace {
  const replayResult = replay(options)
  return {
    options,
    owned: replayResult.owned,
    rival: replayResult.rival,
    bounds: ARENA_BOUNDS,
    steps: replayResult.steps,
    events: replayResult.events,
    hash: replayResult.hash,
    reason: replayResult.reason,
    winner: replayResult.winner,
    finalHp: replayResult.finalHp,
    summary: summarise(replayResult),
  }
}

/** The first frame/side a predicate rejects, as a readable failure. */
function firstBadFrame(
  trace: FightTrace,
  predicate: (body: FrameSide, side: 0 | 1) => string | null,
): string {
  for (const frame of trace.steps) {
    for (const side of [0, 1] as const) {
      const body = side === 0 ? frame.owned : frame.rival
      const bad = predicate(body, side)
      if (bad !== null) {
        return `step ${frame.step} ${side === 0 ? "owned" : "rival"} ${bad}`
      }
    }
  }
  return ""
}

/**
 * The five invariants a fight must hold, each a named assertion. A failure
 * names the step, the side and the value; the command exits non-zero.
 */
export function checkInvariants(trace: FightTrace): Invariant[] {
  const frames = trace.steps.length
  const out: Invariant[] = []

  const yBad = firstBadFrame(trace, (body) =>
    body.y === 0 ? null : `y = ${body.y}`,
  )
  out.push({
    name: "y-zero",
    description: "every sampled position has pos.y === 0",
    ok: yBad === "",
    detail: yBad === "" ? `${frames} frames × 2 sides` : yBad,
  })

  const hpBad = firstBadFrame(trace, (body, side) => {
    const hpMax = side === 0 ? trace.owned.hpMax : trace.rival.hpMax
    return body.hp >= 0 && body.hp <= hpMax
      ? null
      : `hp = ${body.hp} (pool ${hpMax})`
  })
  out.push({
    name: "hp-range",
    description: "0 <= hp <= hpMax for every fighter at every step",
    ok: hpBad === "",
    detail: hpBad === "" ? `${frames} frames × 2 sides` : hpBad,
  })

  const bounds = trace.bounds
  const arenaBad = firstBadFrame(trace, (body) =>
    body.x >= bounds.minX &&
    body.x <= bounds.maxX &&
    body.z >= bounds.minZ &&
    body.z <= bounds.maxZ
      ? null
      : `(${body.x}, ${body.z}) outside (${bounds.minX}..${bounds.maxX}, ${bounds.minZ}..${bounds.maxZ})`,
  )
  out.push({
    name: "arena-bounds",
    description: "both bodies stay inside the arena bounds",
    ok: arenaBad === "",
    detail: arenaBad === "" ? `${frames} frames × 2 sides` : arenaBad,
  })

  const integerBad =
    firstBadFrame(trace, (body) => {
      const fields: [string, number][] = [
        ["x", body.x],
        ["y", body.y],
        ["z", body.z],
        ["vx", body.vx],
        ["vy", body.vy],
        ["vz", body.vz],
      ]
      for (const [name, value] of fields) {
        if (!Number.isInteger(value)) return `${name} = ${value}`
      }
      return null
    }) ||
    (() => {
      for (const event of trace.events) {
        if (!Number.isInteger(event.damage)) {
          return `step ${event.step} damage = ${event.damage}`
        }
        if (!Number.isInteger(event.poiseDamage)) {
          return `step ${event.step} poise damage = ${event.poiseDamage}`
        }
      }
      return ""
    })()
  out.push({
    name: "integers",
    description: "every position, velocity and damage value is an integer",
    ok: integerBad === "",
    detail:
      integerBad === ""
        ? `${frames} frames × 2 sides, ${trace.events.length} events`
        : integerBad,
  })

  let deterministicDetail =
    "same seed replays to the same hash and event sequence"
  let deterministicOk = true
  try {
    const again = traceFight(trace.options)
    if (again.hash !== trace.hash) {
      deterministicOk = false
      deterministicDetail = `hash ${hex(trace.hash)} vs ${hex(again.hash)}`
    } else if (eventSignature(again.events) !== eventSignature(trace.events)) {
      deterministicOk = false
      deterministicDetail = "the event sequence differs on replay"
    }
  } catch (error) {
    deterministicOk = false
    deterministicDetail = error instanceof Error ? error.message : String(error)
  }
  out.push({
    name: "deterministic",
    description:
      "running the same seed twice produces the same final hash and event sequence",
    ok: deterministicOk,
    detail: deterministicDetail,
  })

  return out
}

/** A 32-bit hash as a fixed-width hex word. */
function hex(value: number): string {
  return `0x${value.toString(16).padStart(8, "0")}`
}

/** One side's columns: position, velocity, pools, phase and move. */
function sideCell(body: FrameSide): string {
  const phase =
    body.phase === null
      ? "-"
      : `${body.phase === "startup" ? "S" : body.phase === "active" ? "A" : "R"}${body.phaseMs}`
  return `${num(body.x, 6)},${num(body.z, 6)} v${num(body.vx, 5)},${num(body.vz, 5)} ${num(body.hp, 3)}/${num(body.stamina, 3)}/${num(body.poise, 2)} ${text(phase, 7)} ${text(body.moveId ?? "-", 14)}`
}

/** A side's opening sheet, for the header. */
function sideHeader(label: string, side: SideTrace, pool: number): string[] {
  return [
    `${label.padEnd(8)} ${side.name} [${side.speciesId}]  ${side.element}  ${side.temperament}  tactic ${side.tactic}`,
    `${"".padEnd(8)} stats hp ${side.stats.hp} atk ${side.stats.atk} def ${side.stats.def} spd ${side.stats.spd}  →  pool ${pool} hp`,
    `${"".padEnd(8)} body radius ${side.radiusMm} mm  height ${side.heightMm} mm  branch ${side.branch ?? "none"}`,
    `${"".padEnd(8)} kit ${side.kit.join(", ")}`,
    `${"".padEnd(8)} profile preferred ${side.preferredRangeMm} mm for this pair (row ${side.profile.preferredRangeMm}, reach edge ${side.reachEdgeMm})`,
    `${"".padEnd(8)}         aggression ${side.profile.aggression}%  strafe ${side.profile.strafeBias}%  dodge at ${side.profile.dodgeThresholdMm} mm`,
  ]
}

/** Whether a step is worth printing in the default (change-only) log. */
function interesting(
  previous: StepFrame | undefined,
  frame: StepFrame,
): boolean {
  if (!previous) return true
  if (frame.events.length > 0) return true
  return (
    frame.owned.phase !== previous.owned.phase ||
    frame.rival.phase !== previous.rival.phase ||
    frame.owned.moveId !== previous.owned.moveId ||
    frame.rival.moveId !== previous.rival.moveId ||
    frame.owned.pinned !== previous.owned.pinned ||
    frame.rival.pinned !== previous.rival.pinned
  )
}

/** The readable report, as lines. */
export function report(trace: FightTrace, options: TraceOptions): string[] {
  const lines: string[] = []
  const summary = trace.summary
  lines.push(
    `battle trace — seed ${options.seed}  (${trace.owned.speciesId} v ${trace.rival.speciesId})`,
  )
  lines.push(
    "headless replay of resolveContinuous's own loop; every column is the state the resolver held",
  )
  lines.push(
    `arena    ${trace.bounds.maxX - trace.bounds.minX} × ${trace.bounds.maxZ - trace.bounds.minZ} mm centred on the origin`,
  )
  lines.push(
    "stats    reference line (hp 90 atk 10 def 10 spd 10), clamped to each species' roll bounds",
  )
  lines.push(...sideHeader("owned", trace.owned, trace.owned.hpMax))
  lines.push(...sideHeader("rival", trace.rival, trace.rival.hpMax))
  lines.push("")
  lines.push(
    options.every > 0
      ? `step log — every ${options.every} steps (the final step is always printed)`
      : "step log — steps where something changed (an event, a phase, a move, or a pin)",
  )
  lines.push(
    "           side: x,z  vx,vz  hp/stamina/poise  phase+elapsed-ms  move  (S startup, A active, R recovery)",
  )
  lines.push(
    `${text("step", 5)} ${text("ms", 6)} | ${text("owned", 49)} | ${text("rival", 49)} | ${text("gap", 5)} | events`,
  )

  const finalIndex = trace.steps.length - 1
  for (const [index, frame] of trace.steps.entries()) {
    const show =
      index === 0 ||
      index === finalIndex ||
      (options.every > 0
        ? frame.step % options.every === 0
        : interesting(trace.steps[index - 1], frame))
    if (!show) continue
    const detail =
      frame.events.length === 0
        ? "-"
        : frame.events.map((event) => event.detail).join("; ")
    lines.push(
      `${num(frame.step, 5)} ${num(frame.ms, 6)} | ${sideCell(frame.owned)} | ${sideCell(frame.rival)} | ${num(frame.gap, 5)} | ${detail}`,
    )
  }

  lines.push("")
  lines.push("summary")
  lines.push(
    `  duration    ${summary.ms} ms (${summary.steps} steps of ${STEP_MS} ms)`,
  )
  lines.push(
    `  ending      ${summary.reason}${summary.winner === null ? " — draw" : ` — ${summary.winner} wins`}`,
  )
  lines.push(
    `  blows       ${summary.blows[0]} owned / ${summary.blows[1]} rival  (${summary.blows[0] + summary.blows[1]} landed)`,
  )
  lines.push(
    `  damage      ${summary.damage[0]} owned → ${(summary.damageShare[0] * 100).toFixed(1)}% of rival pool; ${summary.damage[1]} rival → ${(summary.damageShare[1] * 100).toFixed(1)}% of owned pool`,
  )
  lines.push(
    `  attack rate ${summary.attackRate[0].toFixed(2)}/s owned, ${summary.attackRate[1].toFixed(2)}/s rival  (${summary.commits[0]}/${summary.commits[1]} accepted commits)`,
  )
  lines.push(
    `  gap         min ${summary.gap.min}  median ${Math.round(summary.gap.median)}  max ${summary.gap.max} mm  (opening pose excluded)`,
  )
  lines.push(
    `  positions   ${summary.distinct[0]} / ${summary.distinct[1]} distinct ${CELL_MM} mm cells`,
  )
  lines.push(
    `  stamina min ${summary.staminaMin[0]} / ${summary.staminaMin[1]}  (pool ${trace.owned.staminaMax} / ${trace.rival.staminaMax})`,
  )
  lines.push(
    `  poise min   ${summary.poiseMin[0]} / ${summary.poiseMin[1]}  (pool ${trace.owned.poiseMax} / ${trace.rival.poiseMax})`,
  )
  lines.push(`  final hash  ${hex(summary.hash)}`)

  if (options.check) {
    const invariants = checkInvariants(trace)
    lines.push("")
    lines.push(`check — ${invariants.length} invariants`)
    for (const invariant of invariants) {
      lines.push(
        `  ${invariant.ok ? "ok  " : "FAIL"} ${text(invariant.name, 14)} ${invariant.description}  [${invariant.detail}]`,
      )
    }
  }
  return lines
}

/** The machine-readable shape. Stable keys, every step, no thinned log. */
export function toJson(
  trace: FightTrace,
  invariants: readonly Invariant[] | null,
): Record<string, unknown> {
  return {
    seed: trace.options.seed,
    owned: trace.owned,
    rival: trace.rival,
    bounds: trace.bounds,
    steps: trace.steps,
    events: trace.events,
    summary: trace.summary,
    check:
      invariants === null
        ? null
        : {
            passed: invariants.every((invariant) => invariant.ok),
            assertions: invariants,
          },
  }
}

/** The exit code for a check run: 0 when every invariant holds, 1 otherwise. */
export function checkExit(invariants: readonly Invariant[]): number {
  return invariants.some((invariant) => !invariant.ok) ? 1 : 0
}

/** Run the trace, print it, and return the process exit code. */
export function run(
  options: TraceOptions,
  out: (line: string) => void = console.log,
): number {
  const trace = traceFight(options)
  const invariants = options.check ? checkInvariants(trace) : null
  if (options.json) {
    out(JSON.stringify(toJson(trace, invariants), null, 2))
  } else {
    for (const line of report(trace, options)) out(line)
  }
  return invariants === null ? 0 : checkExit(invariants)
}

/**
 * One flag's value: `undefined` when the flag is absent, `null` when it is
 * present but has no value. `--flag=value` and `--flag value` both work; a
 * following flag is never swallowed as a value.
 */
function flagValue(
  argv: readonly string[],
  name: string,
): string | null | undefined {
  const inline = argv.find((entry) => entry.startsWith(`--${name}=`))
  if (inline !== undefined) return inline.slice(name.length + 3)
  const at = argv.indexOf(`--${name}`)
  if (at < 0) return undefined
  const next = argv[at + 1]
  return next === undefined || next.startsWith("--") ? null : next
}

/** True when a boolean flag is present. */
function flagOn(argv: readonly string[], name: string): boolean {
  return argv.includes(`--${name}`)
}

/** A whole number flag, refusing anything that is not one. */
function integerFlag(
  argv: readonly string[],
  name: string,
  fallback: number,
  min: number,
): number {
  const raw = flagValue(argv, name)
  if (raw === undefined) return fallback
  if (raw === null) throw new Error(`--${name} needs a value`)
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`--${name} must be a whole number >= ${min}: ${raw}`)
  }
  return value
}

/** A string flag, refusing a flag that is present without one. */
function stringFlag(
  argv: readonly string[],
  name: string,
  fallback: string,
): string {
  const raw = flagValue(argv, name)
  if (raw === undefined) return fallback
  if (raw === null || raw.length === 0)
    throw new Error(`--${name} needs a value`)
  return raw
}

/** A comma-separated move list, validated against the catalog. */
function kitFlag(
  argv: readonly string[],
  name: string,
): readonly string[] | null {
  const raw = flagValue(argv, name)
  if (raw === undefined) return null
  if (raw === null) throw new Error(`--${name} needs a value`)
  const ids = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
  if (ids.length === 0) throw new Error(`--${name} names no moves`)
  if (ids.length > 4)
    throw new Error(`--${name} takes at most 4 moves: ${ids.length} given`)
  if (new Set(ids).size !== ids.length) {
    throw new Error(`--${name} names a move twice: ${ids.join(", ")}`)
  }
  for (const id of ids) {
    if (!getFrameData(id) || !getMove(id)) {
      throw new Error(`--${name}: unknown move "${id}"`)
    }
  }
  return ids
}

/** Parse the command line. Unknown flags are an error, not silently ignored. */
export function parseArgs(argv: readonly string[]): TraceOptions {
  const known = new Set([
    "seed",
    "owned",
    "rival",
    "kit",
    "rival-kit",
    "every",
    "json",
    "check",
  ])
  const takesValue = new Set([
    "seed",
    "owned",
    "rival",
    "kit",
    "rival-kit",
    "every",
  ])
  for (let index = 0; index < argv.length; index++) {
    const entry = argv[index] ?? ""
    if (!entry.startsWith("--"))
      throw new Error(`unexpected argument: ${entry}`)
    const name = entry.slice(2).split("=")[0] ?? ""
    if (!known.has(name)) throw new Error(`unknown flag: --${name}`)
    // Skip the value of `--flag value`, so it is not read as a positional.
    if (takesValue.has(name) && !entry.includes("=")) {
      const next = argv[index + 1]
      if (next !== undefined && !next.startsWith("--")) index += 1
    }
  }
  return {
    seed: integerFlag(argv, "seed", 1, 0),
    owned: stringFlag(argv, "owned", DEFAULT_OWNED),
    rival: stringFlag(argv, "rival", DEFAULT_RIVAL),
    kit: kitFlag(argv, "kit"),
    rivalKit: kitFlag(argv, "rival-kit"),
    every: integerFlag(argv, "every", 0, 1),
    json: flagOn(argv, "json"),
    check: flagOn(argv, "check"),
  }
}

/** Parse the command line, trace, and print. */
export function main(argv: readonly string[] = process.argv.slice(2)): number {
  return run(parseArgs(argv))
}

if (import.meta.main) {
  try {
    process.exitCode = main()
  } catch (error) {
    console.error(
      `trace: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exitCode = 2
  }
}
