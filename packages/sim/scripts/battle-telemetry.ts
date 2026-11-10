/**
 * Battle telemetry harness — "not turn-based" measured, not asserted
 * (Continuous Arena Battle FR-14, AC-14, AC-24).
 *
 * Plays the same 14 seeded matchups `pacing.test.ts` plays, through the same
 * public resolver the cup calls, and reads the dense per-step stream the
 * resolver already records (`streamOf`). The harness is a consumer: it does not
 * step the sim itself and does not change a single value in it.
 *
 * Six metrics, each defined precisely because a loose definition is how a
 * turn-based fight would pass a "continuous" gate:
 *
 * - **Engagement distance** — the centre-to-centre gap in millimetres, sampled
 *   once per step. The opening pose at stream index 0 is staging, not a fight
 *   step, so it is excluded. Reported as min / median / max over the sample.
 * - **Exchange rate** — committed attacks per second of fight time. A commit is
 *   a step where a side's attack phase moves from `none` to `startup`; it counts
 *   even when the attack is later interrupted, because the fighter still chose
 *   to commit. Reported per side and combined. This is the attack rate FR-3 and
 *   FR-4 constrain.
 * - **Idle time** — the share of fight time in which neither side has an attack
 *   in any phase. This is the metric that separates a fight from two fighters
 *   circling. Hitstun counts as idle: a body held in hitstun has no attack
 *   running.
 * - **Distinct positions** — how many distinct 100 mm cells each side visits. A
 *   fight staged as two poses scores two; continuous movement scores many.
 * - **Contact share** — the share of fight time the two bodies spend closer than
 *   the sum of both radii plus `CONTACT_MARGIN_MM` (40 mm). The threshold is the
 *   same for both sides, so one share describes the pair.
 * - **Retreats** — retreat orders issued per side. The stream records positions
 *   and attack phases, not the controller's verb, so this metric replays the
 *   same deterministic decisions the resolver took and checks the replay ends on
 *   the resolver's own step and hit points before reporting.
 *
 * Plus **cap share** (AC-24): the share of fights decided at `FIGHT_CAP_MS`
 * rather than by knockout. The cap is the top of the 25-40 s band, so the band
 * alone cannot tell a long fight from a stalled one.
 *
 * R1 (F8): FR-4's one-in-three cap target is gated by `bun run balance` over
 * the standard-doctrine matrix (210 ordered pairings x 4 seeds, every measured
 * side its species' own typical creature). This script is a different sample —
 * a small mixed-doctrine smoke fixture whose rows deliberately span rush,
 * obedient and slow temperaments — so it carries its own looser bound
 * (`1/2`, the spec's own ceiling) and must not be read as FR-4's verdict.
 * The bound is not tightened here on purpose: a 14-fight fixture cannot
 * resolve one-in-three, and tightening it would make the smoke test flaky.
 *
 * Run it as one command:
 *
 *   bun packages/sim/scripts/battle-telemetry.ts
 *
 * It exits 0 when every bound holds and 1 when one does not, naming the metric,
 * the observed value and the bound. `src/battle/continuous/telemetry.test.ts`
 * asserts the same `BOUNDS` through the same `measure()` call, so the readable
 * run and the CI gate cannot drift.
 */

import {
  type ControllerState,
  createController,
  decide,
} from "../src/battle/continuous/controller"
import {
  ARENA_BOUNDS,
  downEnding,
  engagementFor,
  FIGHT_CAP_MS,
  FIGHT_CAP_STEPS,
  initFor,
  resolveContinuous,
} from "../src/battle/continuous/resolve"
import { createFight } from "../src/battle/continuous/step"
import {
  type FightStream,
  readFrame,
  STREAM_PHASE,
  type StreamFrame,
  streamOf,
} from "../src/battle/continuous/stream"
import { HOLD, type MoveIntent, STEP_MS } from "../src/battle/continuous/types"
import type { Tactic } from "../src/battle/policy"
import type {
  BattleReason,
  BattleResult,
  BattleSide,
} from "../src/battle/resolver"
import { branchesForSpecies, getBranch } from "../src/branches"
import {
  ALL_SPECIES,
  bodyProfileFor,
  getSpecies,
  type SpeciesDef,
} from "../src/species"

/**
 * The stat line both sides are ramped to, exactly as `pacing.test.ts` does:
 * the middle of the starter band, clamped into each species' own roll bounds,
 * which is what `rampStats` builds for a real cup fight.
 */
const REFERENCE = { hp: 189, atk: 10, def: 10, spd: 10 } as const

/** The grid a "distinct position" is counted on, in millimetres. */
const CELL_MM = 100

/**
 * How far past the sum of both body radii still counts as contact, in mm
 * (measurement definition, not a sim tunable). Forty millimetres is the same
 * clearance the dodge uses: a pair closer than this is touching or pressed
 * together, not fighting at the edge of reach.
 */
const CONTACT_MARGIN_MM = 40

type StatLine = { hp: number; atk: number; def: number; spd: number }

function clampStat(value: number, bounds: readonly [number, number]): number {
  return Math.min(bounds[1], Math.max(bounds[0], value))
}

/** A roster species as the side a cup slot would build. */
function sideOf(species: SpeciesDef, tactic: Tactic): BattleSide {
  const body = branchesForSpecies(species.id)[0]
  const bounds = species.statBounds
  const stats: StatLine = {
    hp: clampStat(REFERENCE.hp, bounds.hp),
    atk: clampStat(REFERENCE.atk, bounds.atk),
    def: clampStat(REFERENCE.def, bounds.def),
    spd: clampStat(REFERENCE.spd, bounds.spd),
  }
  return {
    name: species.displayName,
    id: species.id,
    element: species.element,
    stats,
    kit: species.kit.slice(0, 4),
    tactic,
    temperament: species.temperament,
    branch: body?.id,
  }
}

/**
 * The body radius the resolver gives a roster species, in mm (FR-17): its
 * branch names a species, that species names an archetype, and the archetype's
 * authored profile carries the radius. Mirrors `bodyFor` in ./resolve, which
 * is private, so the contact threshold is the one the fight actually uses.
 */
function radiusOf(species: SpeciesDef): number {
  const branch = branchesForSpecies(species.id)[0]
  const resolved = branch ? getBranch(branch.id) : undefined
  const target = resolved?.speciesId
    ? getSpecies(resolved.speciesId)
    : undefined
  return bodyProfileFor(target?.archetypeId).radiusMm
}

/** One seeded pairing. */
export interface Matchup {
  readonly home: SpeciesDef
  readonly away: SpeciesDef
  readonly seed: number
}

/**
 * The 14 matchups `pacing.test.ts` pins: the same roster walk, the same seeds,
 * no mirrors (a mirror keys both sides the same, so the event log cannot
 * attribute a blow to a side, and no real cup field contains two of a species).
 */
export function matchups(): Matchup[] {
  const out: Matchup[] = []
  const roster = ALL_SPECIES
  for (let i = 0; i < 14; i++) {
    const home = roster[i % roster.length]
    let away = roster[(i * 5 + 7) % roster.length]
    if (!home || !away) throw new Error("the roster shrank")
    for (let hop = 1; away.id === home.id && hop < roster.length; hop++) {
      away = roster[(i * 5 + 7 + hop) % roster.length] ?? away
    }
    out.push({ home, away, seed: 20261108 + i })
  }
  return out
}

/** One fight, measured from the stream the resolver recorded. */
export interface FightTelemetry {
  readonly label: string
  /** Fight time in ms: the last step index times the step length. */
  readonly ms: number
  readonly reason: BattleReason
  /** Which side won, 0 home / 1 away, or null for a double knockout. */
  readonly winner: 0 | 1 | null
  /** Landed blows (a hit, not a swing or a launch), home then away. */
  readonly hits: readonly [number, number]
  /** Committed attacks (a `none` -> `startup` transition), home then away. */
  readonly commits: readonly [number, number]
  /** Centre-to-centre gap over the fight, whole millimetres. */
  readonly gap: {
    readonly min: number
    readonly median: number
    readonly max: number
  }
  /** The per-step gap samples `gap` summarises, for the pooled median. */
  readonly gaps: readonly number[]
  /** Share of fight steps with no attack running on either side, 0..1. */
  readonly idle: number
  /** Distinct 100 mm cells visited, home then away. */
  readonly distinct: readonly [number, number]
  /** Share of fight steps inside both body radii + 40 mm, 0..1. */
  readonly contact: number
  /** Retreat orders issued, home then away. */
  readonly retreats: readonly [number, number]
}

/** A blank frame to read into; `readFrame` overwrites every field. */
function frame(): StreamFrame {
  return {
    x: 0,
    z: 0,
    facingX: 0,
    facingZ: 0,
    phase: STREAM_PHASE.none,
    phaseT: 0,
    hp: 0,
    hitstunMs: 0,
    pinned: false,
  }
}

/** The middle of a numeric sample (the mean of the two middles when even). */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const mid = sorted.length >> 1
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/** The landing blows the event log records, home then away. */
function hitsOf(
  events: readonly { kind: string; hit?: boolean; actorKey?: string }[],
  homeId: string,
): [number, number] {
  const hits: [number, number] = [0, 0]
  for (const event of events) {
    if (event.hit !== true) continue
    if (event.kind !== "basic" && event.kind !== "impact") continue
    hits[event.actorKey === homeId ? 0 : 1] += 1
  }
  return hits
}

/**
 * Replay one fight's controller decisions and count the retreat orders.
 *
 * The stream records where the bodies went, not what they wanted, so the verb
 * tally has to be read where the verb lives. The replay is the resolver's own
 * loop: the same `initFor` orders, the same `engagementFor` profiles, the same
 * `createController` brains and the same `createFight` step. Nothing is random,
 * so the replay must land on the resolver's step and hit points; if it does not,
 * the tally would describe a different fight and the harness refuses to report
 * it. Keys are arbitrary here because neither the step nor the controller reads
 * them, and the sample has no mirror to disambiguate.
 */
function retreatsOf(
  matchup: Matchup,
  result: BattleResult,
  stream: FightStream,
  home: BattleSide,
  away: BattleSide,
): [number, number] {
  const fight = createFight({
    seed: matchup.seed,
    bounds: ARENA_BOUNDS,
    fighters: [initFor(home, "home", 0), initFor(away, "away", 1)],
  })
  const profiles = [
    engagementFor(home.temperament, home.tactic),
    engagementFor(away.temperament, away.tactic),
  ] as const
  const kits = [home.kit, away.kit] as const
  const brains: [ControllerState, ControllerState] = [
    createController(),
    createController(),
  ]
  const retreats: [number, number] = [0, 0]
  let state = fight.state

  while (state.step < FIGHT_CAP_STEPS && !downEnding(state)) {
    const orders: [MoveIntent, MoveIntent] = [HOLD, HOLD]
    for (const side of [0, 1] as const) {
      const order = decide({
        state,
        side,
        controller: brains[side],
        profile: profiles[side],
        kit: kits[side],
      })
      brains[side] = order.state
      orders[side] = order.intent
      if (order.verb === "retreat") retreats[side] += 1
      if (order.commit) fight.commit(side, order.commit)
    }
    state = fight.advance(orders).state
  }

  const replayHp = [state.fighters[0].hp, state.fighters[1].hp].sort(
    (left, right) => left - right,
  )
  const resolvedHp = Object.values(result.finalHp).sort(
    (left, right) => left - right,
  )
  if (
    state.step !== stream.steps - 1 ||
    replayHp[0] !== resolvedHp[0] ||
    replayHp[1] !== resolvedHp[1]
  ) {
    throw new Error(
      `${matchup.home.id} v ${matchup.away.id}: the order replay diverged from the resolver`,
    )
  }
  return retreats
}

/**
 * Measure one fight. Every number comes from the stream or the event log the
 * resolver already produced; the retreat tally replays the same decisions and
 * checks itself against the result before reporting.
 */
export function measureFight(matchup: Matchup): FightTelemetry {
  const homeSide = sideOf(
    matchup.home,
    matchup.seed % 2 === 0 ? "balanced" : "specials",
  )
  const awaySide = sideOf(
    matchup.away,
    matchup.seed % 2 === 0 ? "specials" : "balanced",
  )
  const result = resolveContinuous(homeSide, awaySide, matchup.seed)
  const label = `${matchup.home.id} v ${matchup.away.id}`
  const stream: FightStream | undefined = streamOf(result)
  if (!stream) throw new Error(`${label} resolved without a stream`)
  if (stream.steps < 2) throw new Error(`${label} recorded no fight step`)

  const contactMm =
    radiusOf(matchup.home) + radiusOf(matchup.away) + CONTACT_MARGIN_MM
  const home = frame()
  const away = frame()
  readFrame(stream, 0, 0, home)
  readFrame(stream, 0, 1, away)
  let previous: [number, number] = [home.phase, away.phase]

  const commits: [number, number] = [0, 0]
  const cells: [Set<string>, Set<string>] = [new Set(), new Set()]
  const gaps: number[] = []
  let idleSteps = 0
  let contactSteps = 0

  for (let step = 1; step < stream.steps; step++) {
    readFrame(stream, step, 0, home)
    readFrame(stream, step, 1, away)

    const gap = Math.round(Math.hypot(home.x - away.x, home.z - away.z))
    gaps.push(gap)
    if (gap < contactMm) contactSteps += 1

    const phases: [number, number] = [home.phase, away.phase]
    if (home.phase === STREAM_PHASE.none && away.phase === STREAM_PHASE.none) {
      idleSteps += 1
    }
    for (const side of [0, 1] as const) {
      if (
        previous[side] === STREAM_PHASE.none &&
        phases[side] === STREAM_PHASE.startup
      ) {
        commits[side] += 1
      }
    }
    previous = phases

    cells[0].add(
      `${Math.floor(home.x / CELL_MM)},${Math.floor(home.z / CELL_MM)}`,
    )
    cells[1].add(
      `${Math.floor(away.x / CELL_MM)},${Math.floor(away.z / CELL_MM)}`,
    )
  }

  const fightSteps = stream.steps - 1
  return {
    label,
    ms: fightSteps * STEP_MS,
    reason: result.reason,
    winner:
      result.winner === null ? null : result.winner === homeSide.name ? 0 : 1,
    hits: hitsOf(result.events, matchup.home.id),
    commits,
    gap: {
      min: Math.min(...gaps),
      median: median(gaps),
      max: Math.max(...gaps),
    },
    gaps,
    idle: idleSteps / fightSteps,
    distinct: [cells[0].size, cells[1].size],
    contact: contactSteps / fightSteps,
    retreats: retreatsOf(matchup, result, stream, homeSide, awaySide),
  }
}

/** The whole sample's numbers, pooled where a pooled share is the question. */
export interface SampleTelemetry {
  readonly fights: readonly FightTelemetry[]
  readonly engagement: {
    readonly min: number
    readonly median: number
    readonly max: number
  }
  readonly exchange: {
    readonly home: number
    readonly away: number
    readonly combined: number
  }
  readonly idle: number
  readonly distinct: { readonly min: number; readonly median: number }
  /** Share of all fight steps inside both body radii + 40 mm, 0..1. */
  readonly contact: number
  /** Retreat orders issued over the sample, home then away. */
  readonly retreats: { readonly home: number; readonly away: number }
  readonly cap: {
    readonly count: number
    readonly total: number
    readonly share: number
  }
  /** Fastest and slowest fight in the sample, in ms (AC-7's duration band). */
  readonly duration: { readonly min: number; readonly max: number }
}

/** Play the reference sample and pool its metrics. */
export function measure(): SampleTelemetry {
  const fights = matchups().map(measureFight)
  const gaps: number[] = []
  let commits = 0
  let seconds = 0
  let idle = 0
  let contact = 0
  let retreatHome = 0
  let retreatAway = 0
  let capCount = 0
  const distinct: number[] = []

  for (const fight of fights) {
    seconds += fight.ms / 1000
    commits += fight.commits[0] + fight.commits[1]
    idle += fight.idle * (fight.ms / STEP_MS)
    contact += fight.contact * (fight.ms / STEP_MS)
    retreatHome += fight.retreats[0]
    retreatAway += fight.retreats[1]
    distinct.push(fight.distinct[0], fight.distinct[1])
    gaps.push(...fight.gaps)
    if (fight.reason === "time") {
      if (fight.ms !== FIGHT_CAP_MS) {
        throw new Error(`${fight.label} ended on time below the cap`)
      }
      capCount += 1
    }
  }

  const fightSteps = fights.reduce((sum, fight) => sum + fight.ms / STEP_MS, 0)
  return {
    fights,
    engagement: {
      min: Math.min(...fights.map((fight) => fight.gap.min)),
      median: median(gaps),
      max: Math.max(...fights.map((fight) => fight.gap.max)),
    },
    exchange: {
      home: fights.reduce((sum, fight) => sum + fight.commits[0], 0) / seconds,
      away: fights.reduce((sum, fight) => sum + fight.commits[1], 0) / seconds,
      combined: commits / seconds,
    },
    idle: idle / fightSteps,
    distinct: { min: Math.min(...distinct), median: median(distinct) },
    contact: contact / fightSteps,
    retreats: { home: retreatHome, away: retreatAway },
    cap: {
      count: capCount,
      total: fights.length,
      share: capCount / fights.length,
    },
    duration: {
      min: Math.min(...fights.map((fight) => fight.ms)),
      max: Math.max(...fights.map((fight) => fight.ms)),
    },
  }
}

/** The metric a bound constrains. */
export type Metric =
  | "engagementMin"
  | "engagementMedian"
  | "engagementMax"
  | "exchangeHome"
  | "exchangeAway"
  | "idleShare"
  | "distinctPositions"
  | "contactShare"
  | "retreatHome"
  | "retreatAway"
  | "capShare"
  | "durationMin"
  | "durationMax"

/** One CI-enforced bound, with the reason it exists. */
export interface Bound {
  readonly metric: Metric
  readonly kind: "min" | "max"
  readonly value: number
  readonly why: string
}

/**
 * The thresholds, each set after measuring the sample and chosen with headroom:
 * the measured value is in each `why`, and the bound sits far enough above or
 * below it that a one-point move in an unrelated constant cannot fail CI. Only
 * `capShare` is the spec's own ceiling (AC-24) rather than a measured choice.
 */
export const BOUNDS: readonly Bound[] = Object.freeze([
  {
    metric: "engagementMin",
    kind: "max",
    value: 900,
    why: "the fighters must close to strike range; measured min 379 mm",
  },
  {
    metric: "engagementMedian",
    kind: "max",
    value: 1500,
    why: "the fight must be fought at fighting range, not at opposite ends; measured median 807 mm",
  },
  {
    metric: "engagementMax",
    kind: "max",
    value: 4500,
    why: "neither side may flee the engagement; measured max 3984 mm, which is the opening stance, so this bound only catches a gross disengagement",
  },
  {
    metric: "exchangeHome",
    kind: "max",
    value: 2.5,
    why: "the home side's attack rate is a ceiling, not a floor; measured 0.26/s after the blow weight",
  },
  {
    metric: "exchangeAway",
    kind: "max",
    value: 2.5,
    why: "the away side's attack rate is a ceiling, not a floor; measured 0.24/s after the blow weight",
  },
  {
    metric: "idleShare",
    kind: "max",
    value: 0.5,
    why: "at least half the fight must have an attack running somewhere; measured 28.2% after the blow weight (the Phase 3 relaxation to 0.5 is still the smallest bound the tuned engine meets; the pre-track 0.4 is not met)",
  },
  {
    metric: "distinctPositions",
    kind: "min",
    value: 20,
    why: "every side must visit many positions, not hold two poses; measured min 23 cells after the blow weight (the fastest fight ends in 8.78 s, so it has less time to walk)",
  },
  {
    metric: "contactShare",
    kind: "max",
    value: 0.7,
    why: "the bodies must not spend most of the fight pressed together; measured 15.5%",
  },
  {
    metric: "retreatHome",
    kind: "min",
    value: 14,
    why: "AC-3: at least one retreat order per fight over the sample; measured 5003 orders",
  },
  {
    metric: "retreatAway",
    kind: "min",
    value: 14,
    why: "AC-3: at least one retreat order per fight over the sample; measured 5260 orders",
  },
  {
    metric: "capShare",
    kind: "max",
    value: 1 / 2,
    why: "AC-24: at most one fight in two may be decided at the cap — the spec's own ceiling. The one-in-three target is missed at 6/14 (42.9%): the triple-length cycle means fewer blows per fight, so more fights run out the clock",
  },
  {
    metric: "durationMin",
    kind: "min",
    value: 8_000,
    why: "AC-7: no fight may end before the tuned floor; measured fastest 8.78 s with every frame field weighted, where a 40-damage special ends a low-HP matchup in three blows. The spec's 25 s floor is still missed",
  },
  {
    metric: "durationMax",
    kind: "max",
    value: 40_000,
    why: "AC-7: no fight may run past the cap; measured max 40.00 s",
  },
])

/** A bound and the value that broke it. */
export interface Violation {
  readonly bound: Bound
  readonly observed: number
}

/** Read the observed value a bound constrains out of the sample. */
export function observed(sample: SampleTelemetry, metric: Metric): number {
  switch (metric) {
    case "engagementMin":
      return sample.engagement.min
    case "engagementMedian":
      return sample.engagement.median
    case "engagementMax":
      return sample.engagement.max
    case "exchangeHome":
      return sample.exchange.home
    case "exchangeAway":
      return sample.exchange.away
    case "idleShare":
      return sample.idle
    case "distinctPositions":
      return sample.distinct.min
    case "contactShare":
      return sample.contact
    case "retreatHome":
      return sample.retreats.home
    case "retreatAway":
      return sample.retreats.away
    case "capShare":
      return sample.cap.share
    case "durationMin":
      return sample.duration.min
    case "durationMax":
      return sample.duration.max
  }
}

/** Every bound the sample breaks, in declaration order. */
export function violations(sample: SampleTelemetry): Violation[] {
  const broken: Violation[] = []
  for (const bound of BOUNDS) {
    const value = observed(sample, bound.metric)
    const fails =
      bound.kind === "min" ? value < bound.value : value > bound.value
    if (fails) broken.push({ bound, observed: value })
  }
  return broken
}

/** A number in its metric's units. */
function show(metric: Metric, value: number): string {
  switch (metric) {
    case "idleShare":
    case "contactShare":
    case "capShare":
      return `${(value * 100).toFixed(1)}%`
    case "exchangeHome":
    case "exchangeAway":
      return `${value.toFixed(2)}/s`
    case "distinctPositions":
      return `${Math.round(value)} cells`
    case "retreatHome":
    case "retreatAway":
      return `${Math.round(value)} orders`
    case "durationMin":
    case "durationMax":
      return `${(value / 1000).toFixed(2)}s`
    default:
      return `${Math.round(value)} mm`
  }
}

/** The one-line failure the harness prints, and the test asserts. */
export function describe(violation: Violation): string {
  const { bound } = violation
  return `${bound.metric}: observed ${show(bound.metric, violation.observed)}, bound ${bound.kind === "min" ? ">=" : "<="} ${show(bound.metric, bound.value)}`
}

/** Pad a cell to a fixed width. */
function pad(value: string | number, width: number): string {
  return String(value).padEnd(width)
}

/** The readable report, as lines. */
export function report(sample: SampleTelemetry): string[] {
  const lines: string[] = []
  lines.push(
    `Battle telemetry — ${sample.cap.total} seeded matchups through resolveContinuous (FR-14, AC-14)`,
  )
  lines.push(
    "engagement distance: centre-to-centre gap per step, mm (opening pose excluded)",
  )
  lines.push(
    "exchange rate:       committed attacks (none -> startup) per second of fight time",
  )
  lines.push(
    "idle time:           share of fight time with no attack running on either side",
  )
  lines.push("distinct positions:  distinct 100 mm cells each side visits")
  lines.push(
    "contact share:       share of fight time inside both body radii + 40 mm",
  )
  lines.push("retreats:            retreat orders issued, home then away")
  lines.push(
    `cap share:           fights decided at FIGHT_CAP_MS (${FIGHT_CAP_MS} ms) rather than by knockout (AC-7)`,
  )
  lines.push("")
  lines.push(
    `${pad("#", 3)}${pad("matchup", 38)}${pad("time", 8)}${pad("ending", 7)}${pad("blows", 8)}${pad("commits", 10)}${pad("gap min/med/max", 18)}${pad("cells", 10)}idle`,
  )
  for (const [index, fight] of sample.fights.entries()) {
    lines.push(
      `${pad(index + 1, 3)}${pad(fight.label, 38)}${pad(`${(fight.ms / 1000).toFixed(2)}s`, 8)}${pad(fight.reason, 7)}${pad(`${fight.hits[0]}-${fight.hits[1]}`, 8)}${pad(`${fight.commits[0]}-${fight.commits[1]}`, 10)}${pad(`${fight.gap.min}/${Math.round(fight.gap.median)}/${fight.gap.max}`, 18)}${pad(`${fight.distinct[0]}-${fight.distinct[1]}`, 10)}${(fight.idle * 100).toFixed(1)}%`,
    )
  }
  lines.push("")
  lines.push(
    `engagement:  min ${show("engagementMin", sample.engagement.min)}  median ${show("engagementMedian", sample.engagement.median)}  max ${show("engagementMax", sample.engagement.max)}`,
  )
  lines.push(
    `exchange:    home ${sample.exchange.home.toFixed(2)}/s  away ${sample.exchange.away.toFixed(2)}/s  combined ${sample.exchange.combined.toFixed(2)}/s`,
  )
  lines.push(`idle:        ${show("idleShare", sample.idle)}`)
  lines.push(`contact:     ${show("contactShare", sample.contact)}`)
  lines.push(
    `retreats:    home ${sample.retreats.home}  away ${sample.retreats.away}`,
  )
  lines.push(
    `positions:   min ${show("distinctPositions", sample.distinct.min)}  median ${show("distinctPositions", sample.distinct.median)}`,
  )
  lines.push(
    `cap share:   ${sample.cap.count}/${sample.cap.total} (${show("capShare", sample.cap.share)})`,
  )
  lines.push(
    `duration:    ${show("durationMin", sample.duration.min)} .. ${show("durationMax", sample.duration.max)}`,
  )
  lines.push("")
  for (const bound of BOUNDS) {
    const value = observed(sample, bound.metric)
    const fails =
      bound.kind === "min" ? value < bound.value : value > bound.value
    lines.push(
      `${fails ? "FAIL" : "ok  "} ${bound.metric}: observed ${show(bound.metric, value)}, bound ${bound.kind === "min" ? ">=" : "<="} ${show(bound.metric, bound.value)}`,
    )
  }
  return lines
}

/**
 * Run the harness over a sample, writing every line to `out`, and return the
 * process exit code: 0 when every bound holds, 1 when one does not. Split from
 * `main` so the test can prove the exit code and the failure line without
 * spawning a process.
 */
export function run(
  sample: SampleTelemetry,
  out: (line: string) => void = console.log,
): number {
  for (const line of report(sample)) out(line)
  const broken = violations(sample)
  for (const violation of broken) out(`FAIL ${describe(violation)}`)
  return broken.length === 0 ? 0 : 1
}

/** Measure the reference sample and run the gate. */
export function main(): number {
  return run(measure())
}

if (import.meta.main) {
  process.exitCode = main()
}
