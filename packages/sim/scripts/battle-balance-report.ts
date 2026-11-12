/**
 * Battle balance report — every claim in the track's spec as one deterministic
 * command (FR-4, FR-5, FR-6, FR-7, AC-4, AC-5, AC-6, AC-7).
 *
 * The harness is a consumer: it drives the public resolver the cup calls and
 * reads the event log and the recorded stream. It changes nothing in the
 * simulation.
 *
 * Three separations are the point of the report:
 *
 * - **Species and doctrines are never measured together.** The species matrix
 *   holds one stated standard doctrine on both sides; the doctrine table holds
 *   one stated standard species and matchup and varies only the measured
 *   side's doctrine. A doctrine that flatters a weak species can therefore not
 *   be mistaken for species strength.
 * - **Mirrors are excluded from the species matrix.** A species fighting
 *   itself contributes neither a win nor a loss.
 * - **Bosses are their own table.** They are excluded from the 45-55% band but
 *   each must be beatable and not trivial, so each row reports the player's
 *   measured wins against that boss.
 *
 * The sample is fixed and stated in the output. Each measured side is a species'
 * own typical creature (FR-22): the integer midpoint of its authored stat
 * bounds, per stat. The equal-investment reference line is still measured and
 * printed as a diagnostic, and never gates. The engine draws from a seeded RNG
 * (FR-21), so the matrix plays four seeds per ordered pairing — fifteen species
 * give 15 x 14 x 4 seeds = 840 matrix fights, 112 games per species — and the
 * diversity line reports how many pairings actually change winner with the seed.
 *
 * Run it as one command:
 *
 *   bun run balance
 *
 * It exits 0 when every target holds and 1 when one does not, naming the
 * target, the observed value and the bound, in the same `ok`/`FAIL` line
 * format as `battle-telemetry.ts`. The current roster does not pass; the
 * co-located `balance-report.test.ts` records today's known misses as named
 * targets, so a green suite today and a real gate tomorrow are the same code
 * path.
 */

import {
  DOCTRINE_IDS,
  DOCTRINE_LABELS,
  type DoctrineId,
  tacticForDoctrine,
} from "../src/battle/continuous/controller-profile"
import {
  NEUTRAL_RATIO,
  positionalDamage,
} from "../src/battle/continuous/damage"
import { startingHp } from "../src/battle/continuous/hp"
import { resolveContinuous } from "../src/battle/continuous/resolve"
import {
  type FightStream,
  readFrame,
  STREAM_PHASE,
  type StreamFrame,
  streamOf,
} from "../src/battle/continuous/stream"
import { hitPosition } from "../src/battle/continuous/strike"
import { STEP_MS } from "../src/battle/continuous/types"
import { BASIC_MOVE, CATALOG } from "../src/battle/moves"
import type { BattleReason, BattleSide } from "../src/battle/resolver"
import { BOSSES, type BossDef } from "../src/bosses"
import { branchesForSpecies } from "../src/branches"
import { battleSideForSlot } from "../src/cup/verdicts"
import { ALL_SPECIES, type SpeciesDef } from "../src/species"

/**
 * The equal-investment line: the middle of the starter band, as
 * `pacing.test.ts` and `battle-telemetry.ts` use it. Since Phase 12 (FR-22) this
 * is **not** how a species is measured — a measured side is built from its own
 * bounds midpoint. The reference line survives as a printed diagnostic that
 * answers one question ("is any species stronger when every creature has
 * identical stats?") and never gates.
 */
const REFERENCE = { hp: 189, atk: 10, def: 10, spd: 10 } as const

/**
 * The doctrine species are measured under. Press is the mapped default of the
 * legacy `balanced` tactic and the most neutral band in the table (closest to
 * the reach edge, no rear-seeking, commits on every press slot), so it adds no
 * positional bias of its own to a species' win rate.
 */
const STANDARD_DOCTRINE: DoctrineId = "press"

/**
 * The species doctrines are measured under. The first starter, because it is
 * the roster's index-zero reference; the opponent is the electric hound, the
 * first starter the type chart is neutral against, so the table measures
 * movement and not the chart.
 */
const STANDARD_SPECIES = "fire_drake"
const DOCTRINE_OPPONENT = "electric_hound"

/** Two seeds, one odd and one even, per ordered pairing. */
const MATRIX_SEEDS = [20261109, 20261110, 20261111, 20261112] as const

/** Three seeds per order for the doctrine table: six fights per doctrine. */
const DOCTRINE_SEEDS = [20261109, 20261110, 20261111] as const

/** Two seeds per species for the boss table: thirty fights per boss. */
const BOSS_SEEDS = [20261109, 20261110] as const

/** FR-5 / AC-5: every species lands in this band under the standard doctrine. */
export const SPECIES_MIN = 0.45
export const SPECIES_MAX = 0.55

/**
 * The gate's decision rule (P10.T2.2). A point band is not a decision rule: at
 * 56 games a genuinely balanced species lands outside 45-55% about a third of
 * the time, because the band is narrower than the sample's own noise. So the
 * pass/fail test is "is the win rate significantly off 50% at this sample size",
 * using the normal approximation to the binomial with the *null* standard error
 * sqrt(0.25/n). That construction fails a truly balanced species 5% of the time
 * by design (two-sided, alpha = 0.05), which is the "passes at least 95% of the
 * time" the phase asks for. The 45-55% band is still printed as the design
 * target: "is this species balanced" and "would I notice if it were not" are
 * different questions and the second one needs a sample size to answer.
 */
const SIGNIFICANCE_Z = 1.96

/** FR-4 / AC-4: at most one fight in three may be decided at the cap. */
/**
 * The least number of *distinct* fights a species row may rest on (R1, F1).
 *
 * The matrix has 28 independent cells per species (14 opponents x 2 seat
 * orders). Extra seeds do move fights — the engine draws now (FR-21), so a
 * fourth seed can flip a winner — but they move them less than a fresh cell
 * does, and the count they add is bounded by how many distinguishable endings
 * the RNG actually produces: measured, the roster lands at 21-34 distinct of
 * 112 games, not at 112. The gate therefore rests on the distinct count rather
 * than the game count, and reports the standard error that count buys (8.6-10.9
 * points on the shipped roster, i.e. an interval 16.8-21.4 points wide). A row
 * below 12 distinct fights is certifying something the sample cannot see, and is
 * reported `UNVERIFIED` and failed rather than passed. The floor is permissive
 * by design and the width it admits is stated on every row (see the spec's
 * limitation note), so a pass at the floor is not read as a precise measurement.
 */
export const DISTINCT_FLOOR = 12

const CAP_MAX = 1 / 3

/** FR-4: the window the median must land inside (Rework 2 - outlasting wins). */
const BAND_MIN_MS = 25_000
const BAND_MAX_MS = 40_000

/**
 * FR-20 / AC-17: two fights in three must end decisively — a knockout, or an
 * outlasting win at the cap whose HP margin clears `CAP_MARGIN_FLOOR_BP`.
 *
 * The margin is measured **per side's own pool**: `winnerHp/winnerMax -
 * loserHp/loserMax` in hundredths of a point. That is not the 189-HP reference
 * line — the authored roll bounds span 130-209 HP and the measured typical pools
 * 145-186 HP, so one basic strike (`BASIC_MOVE`, power 9) is 4.9-6.2% of a
 * typical pool, not 4.76%. Five points is therefore
 * about one basic hit of separation, which is a scale, not a guarantee: a single
 * final exchange can cross it in either direction, so this floor does not prove
 * the winner was ahead before the last blow.
 *
 * `decisiveShare` alone also cannot police this. Knockouts are 590/840 (70.2%)
 * of the matrix on their own, already past the 66.7% bound, so cap-win quality
 * is invisible in that ratio; `capWinQuality` gates `decisiveCapWins / capWins`
 * separately (R3).
 */
export const CAP_MARGIN_FLOOR_BP = 500
export const DECISIVE_SHARE_MIN = 2 / 3

/** The engine's measured floor and the fight cap, in ms (AC-7). */
const DURATION_MIN_MS = 8_000
const DURATION_MAX_MS = 40_000

/** FR-1: the base hit of every catalog move, in percent of the reference pool. */
const DAMAGE_MIN_PERCENT = 4
const DAMAGE_MAX_PERCENT = 12

type StatLine = { hp: number; atk: number; def: number; spd: number }

/** One stat's authored roll range, as `species.statBounds` holds it. */
export type StatBounds = {
  readonly hp: readonly [number, number]
  readonly atk: readonly [number, number]
  readonly def: readonly [number, number]
  readonly spd: readonly [number, number]
}

/** A partial bounds override, used by the stat-visibility test. */
export type BoundsOverride = Readonly<Record<string, Partial<StatBounds>>>

function clampStat(value: number, bounds: readonly [number, number]): number {
  return Math.min(bounds[1], Math.max(bounds[0], value))
}

/**
 * A species' bounds, with any override applied. Kept a pure function of the
 * species and the override map so the report and the stat-visibility test see
 * exactly the same arithmetic.
 */
export function boundsOf(
  species: SpeciesDef,
  overrides?: BoundsOverride,
): StatBounds {
  const authored = species.statBounds
  const patch = overrides?.[species.id]
  return {
    hp: patch?.hp ?? authored.hp,
    atk: patch?.atk ?? authored.atk,
    def: patch?.def ?? authored.def,
    spd: patch?.spd ?? authored.spd,
  }
}

/**
 * The typical creature of a species (FR-22): the integer midpoint of each
 * authored roll range, per stat.
 *
 *   midpoint(bounds) = Math.floor((bounds[0] + bounds[1]) / 2)
 *
 * This is the creature a player would own after a fair roll, so it is what the
 * gate measures. Before Phase 12 the harness clamped one reference line into
 * every species' bounds, which meant a species' stats only reached the fight
 * when its bounds excluded 10 — the gate was blind to the only lever that could
 * tune it.
 */
export function typicalLine(bounds: StatBounds): StatLine {
  return {
    hp: Math.floor((bounds.hp[0] + bounds.hp[1]) / 2),
    atk: Math.floor((bounds.atk[0] + bounds.atk[1]) / 2),
    def: Math.floor((bounds.def[0] + bounds.def[1]) / 2),
    spd: Math.floor((bounds.spd[0] + bounds.spd[1]) / 2),
  }
}

/** The equal-investment line, clamped into a species' bounds: the diagnostic. */
export function referenceLine(bounds: StatBounds): StatLine {
  return {
    hp: clampStat(REFERENCE.hp, bounds.hp),
    atk: clampStat(REFERENCE.atk, bounds.atk),
    def: clampStat(REFERENCE.def, bounds.def),
    spd: clampStat(REFERENCE.spd, bounds.spd),
  }
}

/** A roster species as a cup slot would build it, at a stated stat line. */
function speciesSide(
  species: SpeciesDef,
  doctrine: DoctrineId,
  stats: StatLine,
): BattleSide {
  const body = branchesForSpecies(species.id)[0]
  return {
    name: species.displayName,
    id: species.id,
    element: species.element,
    stats,
    kit: species.kit.slice(0, 4),
    tactic: tacticForDoctrine(doctrine),
    doctrine,
    temperament: species.temperament,
    branch: body?.id,
  }
}

/** A boss as the production slot builder makes it: pinned stats, kit, tactic. */
function bossSide(boss: BossDef, seed: number): BattleSide {
  return battleSideForSlot(
    {
      isPlayer: false,
      name: boss.name,
      speciesId: boss.speciesId,
      stats: boss.stats,
      bossId: boss.id,
    },
    seed,
  )
}

/** One fight, as the report records it. */
export interface Fought {
  readonly label: string
  readonly ms: number
  readonly reason: BattleReason
  /** Which side won, 0 home / 1 away, or null for a double knockout. */
  readonly winner: 0 | 1 | null
}

/** The middle of a numeric sample (the mean of the two middles when even). */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const mid = sorted.length >> 1
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/** Fight time in ms: the last event's tick times the step length. */
function msOf(result: ReturnType<typeof resolveContinuous>): number {
  const last = result.events[result.events.length - 1]
  return last ? last.tick * STEP_MS : 0
}

/** The winner as a side index, by display name. */
function winnerOf(
  result: ReturnType<typeof resolveContinuous>,
  home: BattleSide,
  away: BattleSide,
): 0 | 1 | null {
  if (result.winner === null) return null
  if (result.winner === home.name) return 0
  if (result.winner === away.name) return 1
  throw new Error(
    `${home.name} v ${away.name}: unknown winner ${result.winner}`,
  )
}

/**
 * One fight's identity for the distinct-fight count (FR-21): the measured
 * side's outcome, the fight's length, and that side's final HP.
 *
 * R3 (T1): this used to read `finalHp[side.name]` while the resolver keys
 * `finalHp` by `fighterKey = id ?? name`, and `speciesSide` always sets an id.
 * The lookup was therefore `undefined` on every fight, the signature collapsed
 * to `(outcome, duration)`, and `distinct` counted a fraction of the sample it
 * claimed. The key is passed in from the caller's own `id ?? name`, and a
 * missing key throws: a blind count must fail loudly, not quietly widen every
 * species' interval.
 */
export function fightSignature(
  key: string,
  outcome: "w" | "l" | "d",
  ms: number,
  finalHp: number | undefined,
): string {
  if (finalHp === undefined) {
    throw new Error(`no final HP for ${key}: the distinct count would go blind`)
  }
  return `${outcome}|${ms}|${finalHp}`
}

/** One species' measured row in the matrix. */
export interface SpeciesRow {
  readonly id: string
  readonly name: string
  readonly games: number
  readonly wins: number
  readonly draws: number
  /** (wins + draws / 2) / games: a double knockout counts half to each side. */
  readonly rate: number
  /**
   * Fights that actually played out differently from each other (FR-21). Until
   * Phase 10 the engine was seed-free, so this always equalled `games / seeds`
   * — a "56-fight sample" was 28 fights counted twice. It is reported so that
   * can never silently happen again.
   */
  readonly distinct: number
  /**
   * Binomial standard error of `rate` over the *distinct* fights, as a
   * fraction. R1 (F1): the game count is not the sample size — 112 games
   * resting on 4 distinct fights carry the noise of 4.
   */
  readonly se: number
}

/** One doctrine's measured row, holding species and matchup fixed. */
export interface DoctrineRow {
  readonly id: DoctrineId
  readonly label: string
  readonly fights: number
  readonly rate: number
  /** Share of the measured side's landed blows that were flank or rear. */
  readonly rearOrFlank: number
  /** Share of the measured side's landed blows that came from behind (R1, F2). */
  readonly rear: number
  /** Median centre-to-centre gap over every step of every fight, in mm. */
  readonly engagementMedian: number
  /** Paid dodges the measured side spent (R1, F2). */
  readonly dodges: number
  /**
   * Paid dodges per controller decision, measured side only (R1, F2). A melee
   * step-out is a `reach` whiff in the event log, so this reads the step's own
   * `DodgeReport` rather than the projectile `dodge` reason.
   */
  readonly dodgeRate: number
}

/** One boss's measured row. */
export interface BossRow {
  readonly id: string
  readonly name: string
  readonly speciesId: string
  /** The ladder stage it is meant to gate. */
  readonly stage: string
  readonly fights: number
  readonly playerWins: number
  readonly draws: number
}

/** One move's authored base hit, as the band sees it. */
export interface DamageRow {
  readonly id: string
  readonly power: number
  readonly damage: number
  /** Damage as a percent of the reference pool. */
  readonly share: number
}

/** A target the spec sets, measured. */
export interface Target {
  readonly name: string
  readonly observed: string
  readonly bound: string
  readonly ok: boolean
  /**
   * Set when the sample cannot support the judgement at all (R1, F1): a row
   * resting on fewer than `DISTINCT_FLOOR` distinct fights. An unverified
   * target always fails the gate — it is never a silent pass.
   */
  readonly unverified?: boolean
  readonly why: string
}

/** Everything the command measures. */
export interface BalanceSample {
  readonly matrix: {
    readonly fights: number
    readonly matchups: number
    readonly seeds: readonly number[]
    readonly species: readonly SpeciesRow[]
    /**
     * The equal-investment diagnostic (FR-22): the same matrix replayed with
     * every side clamped to `REFERENCE`. It answers "is any species stronger
     * when every creature has identical stats?" and is printed, never gated.
     */
    readonly reference: readonly SpeciesRow[]
    /**
     * The reference pass's own cap share (FR-7): how many of the same fights,
     * replayed at the equal-investment line, ran out the clock. A diagnostic
     * printed beside the reference-line table; it gates nothing.
     */
    readonly referenceCap: {
      readonly count: number
      readonly total: number
    }
    /**
     * Share of ordered pairings whose winner changes across the sample's seeds
     * (FR-21, P10.T3.1). A floor, not a ceiling: a fight that plays the same way
     * every time it is dealt is a fight with no variance to read.
     */
    readonly diversity: number
  }
  readonly doctrines: readonly DoctrineRow[]
  readonly bosses: readonly BossRow[]
  /** Paid dodges where a dodge is observable (R1, F2). */
  readonly dodgeProbe: readonly DodgeRow[]
  readonly damage: {
    readonly pool: number
    readonly rows: readonly DamageRow[]
  }
  readonly duration: {
    readonly total: number
    readonly min: number
    readonly median: number
    readonly max: number
    readonly ko: number
    readonly time: number
    readonly draws: number
    /**
     * Fights that finished inside the band **and were not decided by the
     * clock** (R2, T1). A cap fight lasts exactly `FIGHT_CAP_MS`, so counting
     * it as "inside 25-40 s" made the gate print 54.5% for a sample whose
     * honest figure was 23.1%. The ending reason is carried beside every
     * duration precisely so this count cannot be reconstructed wrongly.
     */
    readonly resolvedInBand: number
    /**
     * HP-margin distribution of the cap wins, in basis points of the pool
     * (Rework 2). Margin is `winnerHp/winnerMax - loserHp/loserMax` in
     * hundredths of a point, so 500 = 5.00 points. An outlasting win is
     * decisive when it clears `CAP_MARGIN_FLOOR_BP`.
     */
    readonly capMargins: readonly number[]
    /** 5th-percentile fight length in ms (R1, F4): the pacing floor's sample. */
    readonly p05: number
  }
  /** Median landed blow as a percent of the victim's pool, matrix-wide. */
  readonly observedBlowShare: number
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

/** Where each side's landed blows came from, and what it dodged. */
interface PositionTally {
  flank: number
  rear: number
  landed: number
  /** Paid dodges this side spent (R1, F2). */
  dodged: number
  /** Controller decisions this side took: the dodge rate's denominator. */
  decisions: number
}

/** Steps between controller decisions (`DECISION_MS / STEP_MS`). */
const DECISION_STEPS = 240 / STEP_MS

/**
 * Attribute one fight's landed blows to front/flank/rear from the recorded
 * stream, using the simulation's own `hitPosition` at the top of the striking
 * step (the snapshot the strike resolution reads). Dodge counts are read from
 * the event log: a swing that missed for `dodge`, not for `accuracy`. Both
 * sides are tallied, because a dodge is filed on the swinger's event.
 */
function positionsOf(
  result: ReturnType<typeof resolveContinuous>,
  stream: FightStream,
  tallies: [PositionTally, PositionTally],
): void {
  const keys = Object.keys(result.finalHp)
  const attacker = frame()
  const victim = frame()
  for (const event of result.events) {
    if (event.kind !== "basic" && event.kind !== "impact") continue
    if (!event.actorKey) continue
    const side = event.actorKey === keys[0] ? 0 : 1
    if (event.hit !== true) continue
    tallies[side].landed += 1
    const index = Math.min(stream.steps - 1, Math.max(0, event.tick - 1))
    readFrame(stream, index, side, attacker)
    readFrame(stream, index, side === 0 ? 1 : 0, victim)
    const position = hitPosition(
      { x: victim.facingX, z: victim.facingZ },
      { x: victim.x, y: 0, z: victim.z },
      { x: attacker.x, y: 0, z: attacker.z },
    )
    if (position === "flank") tallies[side].flank += 1
    if (position === "rear") tallies[side].rear += 1
  }
  // R1 (F2): a melee step-out is a `reach` whiff in the event log and a paid
  // dodge in the step's own report, so the event log alone can never show a
  // dodge. Read the step outcome: the side that paid is the side that dodged.
  const paid = result.dodges ?? [0, 0]
  tallies[0].dodged += paid[0]
  tallies[1].dodged += paid[1]
  const decisions = Math.floor(Math.max(0, stream.steps - 1) / DECISION_STEPS)
  tallies[0].decisions += decisions
  tallies[1].decisions += decisions
}

/** Add one fight's tally into a doctrine row's running total. */
function mergeTally(into: PositionTally, from: PositionTally): void {
  into.flank += from.flank
  into.rear += from.rear
  into.landed += from.landed
  into.dodged += from.dodged
  into.decisions += from.decisions
}

/** The base hit every move lands on the reference line, front and no counter. */
export function damageRows(): DamageRow[] {
  const pool = startingHp({ stats: REFERENCE })
  const rows: DamageRow[] = []
  for (const move of [BASIC_MOVE, ...CATALOG]) {
    const damage = positionalDamage({
      power: move.power,
      atk: REFERENCE.atk,
      def: REFERENCE.def,
      type: NEUTRAL_RATIO,
      position: "front",
      counter: false,
    })
    rows.push({
      id: move.id,
      power: move.power,
      damage,
      share: (damage * 100) / pool,
    })
  }
  return rows
}

/** How to build the measured sides; the stat-visibility test overrides bounds. */
export interface MeasureOptions {
  /**
   * Per-species bounds overrides (FR-22, AC-19). Absent means the authored
   * `species.statBounds`. It exists so a test can prove a stat is a lever the
   * gate can see without editing `species/**`.
   */
  readonly bounds?: BoundsOverride
}

/** Measure the species matrix, the doctrine table and the boss table. */
export function measure(options: MeasureOptions = {}): BalanceSample {
  const roster = ALL_SPECIES
  const lines = new Map<string, { typical: StatLine; reference: StatLine }>()
  for (const species of roster) {
    const bounds = boundsOf(species, options.bounds)
    lines.set(species.id, {
      typical: typicalLine(bounds),
      reference: referenceLine(bounds),
    })
  }
  const tallies = new Map<
    string,
    { wins: number; draws: number; games: number }
  >()
  const referenceTallies = new Map<
    string,
    { wins: number; draws: number; games: number }
  >()
  const signatures = new Map<string, Set<string>>()
  const pairingWinners = new Map<string, Set<string>>()
  for (const species of roster) {
    tallies.set(species.id, { wins: 0, draws: 0, games: 0 })
    referenceTallies.set(species.id, { wins: 0, draws: 0, games: 0 })
    signatures.set(species.id, new Set())
  }

  const durations: number[] = []
  const endings: { ms: number; reason: BattleReason }[] = []
  const capMargins: number[] = []
  const blowShares: number[] = []
  let ko = 0
  let time = 0
  let draws = 0
  let matchups = 0
  /** Fights in the reference pass that ended at the cap (FR-7). */
  let referenceTime = 0

  for (const home of roster) {
    for (const away of roster) {
      if (home.id === away.id) continue
      for (const seed of MATRIX_SEEDS) {
        matchups += 1
        const homeLines = lines.get(home.id)
        const awayLines = lines.get(away.id)
        if (!homeLines || !awayLines) throw new Error("a species has no line")
        const homeSide = speciesSide(home, STANDARD_DOCTRINE, homeLines.typical)
        const awaySide = speciesSide(away, STANDARD_DOCTRINE, awayLines.typical)
        const result = resolveContinuous(homeSide, awaySide, seed)
        const winner = winnerOf(result, homeSide, awaySide)
        const homeKey = homeSide.id ?? homeSide.name
        const awayKey = awaySide.id ?? awaySide.name
        const ms = msOf(result)
        durations.push(ms)
        endings.push({ ms, reason: result.reason })
        // Rework 2: a cap decision is an outlasting win. Record how far ahead
        // the winner finished, in basis points of its own pool, so the report
        // can print the distribution and the gate can ask whether the win was
        // decisive rather than a coin-flip tiebreak. Integer arithmetic only:
        // `pointsWinner` already ranks by `hp * foeMax`, so the difference is
        // the same comparison scaled to hundredths of a point.
        if (result.reason === "time" && winner !== null) {
          const winnerSide = winner === 0 ? homeSide : awaySide
          const loserSide = winner === 0 ? awaySide : homeSide
          const winnerMax = winnerSide.stats.hp
          const loserMax = loserSide.stats.hp
          const winnerHp = result.finalHp[winner === 0 ? homeKey : awayKey] ?? 0
          const loserHp = result.finalHp[winner === 0 ? awayKey : homeKey] ?? 0
          const den = winnerMax * loserMax
          const num = winnerHp * loserMax - loserHp * winnerMax
          capMargins.push(
            den === 0 ? 0 : Math.max(0, Math.floor((num * 10_000) / den)),
          )
        }
        // The equal-investment diagnostic (FR-22): the same pairing played with
        // both sides clamped to REFERENCE. Measured so the report can print it,
        // never gated.
        const homeRef = speciesSide(
          home,
          STANDARD_DOCTRINE,
          homeLines.reference,
        )
        const awayRef = speciesSide(
          away,
          STANDARD_DOCTRINE,
          awayLines.reference,
        )
        const refResult = resolveContinuous(homeRef, awayRef, seed)
        const refWinner = winnerOf(refResult, homeRef, awayRef)
        // FR-7: the reference pass already ran, so its cap share costs one
        // counter. A `time` ending is a fight that ran to `FIGHT_CAP_MS`; it
        // is printed beside the reference-line table and gates nothing.
        if (refResult.reason === "time") referenceTime += 1
        for (const side of [0, 1] as const) {
          const species = side === 0 ? home : away
          const tally = referenceTallies.get(species.id)
          if (!tally) throw new Error(`no reference tally for ${species.id}`)
          tally.games += 1
          if (refWinner === side) tally.wins += 1
          if (refWinner === null) tally.draws += 1
        }
        const pairingKey = `${home.id}>${away.id}`
        const seen = pairingWinners.get(pairingKey) ?? new Set<string>()
        seen.add(winner === null ? "draw" : `${winner}`)
        pairingWinners.set(pairingKey, seen)
        if (result.reason === "ko") ko += 1
        if (result.reason === "time") time += 1
        if (result.reason === "double_ko") draws += 1
        for (const side of [0, 1] as const) {
          const species = side === 0 ? home : away
          const tally = tallies.get(species.id)
          if (!tally) throw new Error(`no tally for ${species.id}`)
          tally.games += 1
          if (winner === side) tally.wins += 1
          if (winner === null) tally.draws += 1
          // R3 (T1): read the key the resolver wrote, and let the signature
          // helper throw if it is missing. `finalHp` is keyed by
          // `fighterKey = id ?? name`, and `speciesSide` always sets an id.
          const finalHpKey = side === 0 ? homeKey : awayKey
          signatures
            .get(species.id)
            ?.add(
              fightSignature(
                finalHpKey,
                winner === side ? "w" : winner === null ? "d" : "l",
                ms,
                result.finalHp[finalHpKey],
              ),
            )
        }
        const keys = Object.keys(result.finalHp)
        const pools = [homeSide.stats.hp, awaySide.stats.hp] as const
        for (const event of result.events) {
          if (event.hit !== true) continue
          if (event.kind !== "basic" && event.kind !== "impact") continue
          if (event.damage === undefined || !event.actorKey) continue
          const victim = event.actorKey === keys[0] ? 1 : 0
          blowShares.push((event.damage * 100) / (pools[victim] ?? 1))
        }
      }
    }
  }

  const species: SpeciesRow[] = []
  for (const def of roster) {
    const tally = tallies.get(def.id)
    if (!tally) throw new Error(`no tally for ${def.id}`)
    const rate =
      tally.games === 0 ? 0 : (tally.wins + tally.draws / 2) / tally.games
    const distinct = signatures.get(def.id)?.size ?? 0
    const row: SpeciesRow = {
      id: def.id,
      name: def.displayName,
      games: tally.games,
      wins: tally.wins,
      draws: tally.draws,
      rate,
      distinct,
      se: distinct === 0 ? 0 : Math.sqrt(0.25 / distinct),
    }
    species.push(row)
  }

  const reference: SpeciesRow[] = []
  for (const def of roster) {
    const tally = referenceTallies.get(def.id)
    if (!tally) throw new Error(`no reference tally for ${def.id}`)
    const rate =
      tally.games === 0 ? 0 : (tally.wins + tally.draws / 2) / tally.games
    reference.push({
      id: def.id,
      name: def.displayName,
      games: tally.games,
      wins: tally.wins,
      draws: tally.draws,
      rate,
      distinct: 0,
      se: tally.games === 0 ? 0 : Math.sqrt((rate * (1 - rate)) / tally.games),
    })
  }

  let diverse = 0
  for (const winners of pairingWinners.values()) {
    if (winners.size > 1) diverse += 1
  }

  const doctrines = measureDoctrines(lines)
  const dodgeProbe = measureDodges(lines)
  const bosses = measureBosses(lines)

  const sorted = [...durations].sort((left, right) => left - right)
  // R2 (T1): only a fight that finished can finish *inside* the band. The cap
  // sits at the top of the window, so a cap fight has always been counted here
  // as a success; it is counted by cap share instead and never by the band.
  const resolvedInBand = endings.filter(
    (ending) =>
      ending.reason !== "time" &&
      ending.ms >= BAND_MIN_MS &&
      ending.ms <= BAND_MAX_MS,
  ).length
  // R1 (F4): the 5th percentile, not the single fastest fight. One blowout in
  // 840 is not a pacing defect; five percent of the sample ending early is.
  const p05 =
    sorted.length === 0 ? 0 : (sorted[Math.floor(sorted.length * 0.05)] ?? 0)

  return {
    matrix: {
      fights: durations.length,
      matchups,
      seeds: MATRIX_SEEDS,
      species,
      reference,
      referenceCap: { count: referenceTime, total: matchups },
      diversity: pairingWinners.size === 0 ? 0 : diverse / pairingWinners.size,
    },
    doctrines,
    dodgeProbe,
    bosses,
    damage: { pool: startingHp({ stats: REFERENCE }), rows: damageRows() },
    duration: {
      total: durations.length,
      min: sorted[0] ?? 0,
      p05,
      median: median(durations),
      max: sorted[sorted.length - 1] ?? 0,
      ko,
      time,
      draws,
      resolvedInBand,
      capMargins,
    },
    observedBlowShare: median(blowShares),
  }
}

/**
 * One species' row, measured on exactly the schedule the matrix uses (FR-22):
 * the same fourteen opponents, both seat orders and every matrix seed, with
 * every side built from its own bounds midpoint. The full `measure()` plays all
 * fifteen species at once; this plays one, so a re-tune can read a single row —
 * and prove a stat is a lever — without paying for the whole matrix.
 */
export function measureSpecies(
  id: string,
  options: MeasureOptions = {},
): SpeciesRow {
  const species = ALL_SPECIES.find((def) => def.id === id)
  if (!species) throw new Error(`no species ${id}`)
  const line = typicalLine(boundsOf(species, options.bounds))
  const signatures = new Set<string>()
  let wins = 0
  let draws = 0
  let games = 0
  for (const opponent of ALL_SPECIES) {
    if (opponent.id === species.id) continue
    const opponentLine = typicalLine(boundsOf(opponent, options.bounds))
    for (const order of [0, 1] as const) {
      for (const seed of MATRIX_SEEDS) {
        const home = order === 0 ? species : opponent
        const away = order === 0 ? opponent : species
        const homeSide = speciesSide(
          home,
          STANDARD_DOCTRINE,
          order === 0 ? line : opponentLine,
        )
        const awaySide = speciesSide(
          away,
          STANDARD_DOCTRINE,
          order === 0 ? opponentLine : line,
        )
        const result = resolveContinuous(homeSide, awaySide, seed)
        const winner = winnerOf(result, homeSide, awaySide)
        const watch = order === 0 ? 0 : 1
        games += 1
        if (winner === watch) wins += 1
        if (winner === null) draws += 1
        // R3 (T1): the same `id ?? name` key the resolver wrote, through the
        // same signature helper the matrix uses — a second, games-based error
        // in an exported function is a trap.
        const watchKey =
          order === 0
            ? (homeSide.id ?? homeSide.name)
            : (awaySide.id ?? awaySide.name)
        signatures.add(
          fightSignature(
            watchKey,
            winner === watch ? "w" : winner === null ? "d" : "l",
            msOf(result),
            result.finalHp[watchKey],
          ),
        )
      }
    }
  }
  const rate = games === 0 ? 0 : (wins + draws / 2) / games
  const distinct = signatures.size
  return {
    id: species.id,
    name: species.displayName,
    games,
    wins,
    draws,
    rate,
    distinct,
    se: distinct === 0 ? 0 : Math.sqrt(0.25 / distinct),
  }
}

/** The typical stat line a species fights at, from the precomputed map. */
type LineMap = ReadonlyMap<string, { typical: StatLine; reference: StatLine }>

function typicalOf(lines: LineMap, species: SpeciesDef): StatLine {
  const line = lines.get(species.id)
  if (!line) throw new Error(`no line for ${species.id}`)
  return line.typical
}

/** The doctrine table: one species, one matchup, one row per doctrine. */
function measureDoctrines(lines: LineMap): DoctrineRow[] {
  const standard = ALL_SPECIES.find((s) => s.id === STANDARD_SPECIES)
  const opponent = ALL_SPECIES.find((s) => s.id === DOCTRINE_OPPONENT)
  if (!standard || !opponent) {
    throw new Error("the standard doctrine matchup left the roster")
  }
  const rows: DoctrineRow[] = []
  for (const doctrine of DOCTRINE_IDS) {
    const measuredTally: PositionTally = {
      flank: 0,
      rear: 0,
      landed: 0,
      dodged: 0,
      decisions: 0,
    }
    const gaps: number[] = []
    let wins = 0
    let draws = 0
    let fights = 0
    for (const order of [0, 1] as const) {
      for (const seed of DOCTRINE_SEEDS) {
        fights += 1
        // The measured species takes each side once, so a side bias cannot be
        // mistaken for a doctrine effect.
        const home = order === 0 ? standard : opponent
        const away = order === 0 ? opponent : standard
        const homeSide = speciesSide(
          home,
          order === 0 ? doctrine : STANDARD_DOCTRINE,
          typicalOf(lines, home),
        )
        const awaySide = speciesSide(
          away,
          order === 0 ? STANDARD_DOCTRINE : doctrine,
          typicalOf(lines, away),
        )
        const result = resolveContinuous(homeSide, awaySide, seed)
        const stream = streamOf(result)
        if (!stream) throw new Error(`${doctrine} resolved without a stream`)
        const tallies: [PositionTally, PositionTally] = [
          { flank: 0, rear: 0, landed: 0, dodged: 0, decisions: 0 },
          { flank: 0, rear: 0, landed: 0, dodged: 0, decisions: 0 },
        ]
        positionsOf(result, stream, tallies)
        const watch = order === 0 ? 0 : 1
        mergeTally(measuredTally, tallies[watch])
        const winner = winnerOf(result, homeSide, awaySide)
        if (winner === watch) wins += 1
        if (winner === null) draws += 1
        const homeFrame = frame()
        const awayFrame = frame()
        for (let step = 1; step < stream.steps; step++) {
          readFrame(stream, step, 0, homeFrame)
          readFrame(stream, step, 1, awayFrame)
          gaps.push(
            Math.round(
              Math.hypot(homeFrame.x - awayFrame.x, homeFrame.z - awayFrame.z),
            ),
          )
        }
      }
    }
    // A dodge is filed on the swinger's event, so the measured side's dodge
    // rate is the share of the opponent's swings it made miss for `dodge`.
    const measuredSwings = measuredTally.landed + measuredTally.dodged
    rows.push({
      id: doctrine,
      label: DOCTRINE_LABELS[doctrine],
      fights,
      rate: (wins + draws / 2) / fights,
      rearOrFlank:
        measuredSwings === 0
          ? 0
          : (measuredTally.flank + measuredTally.rear) / measuredSwings,
      rear: measuredSwings === 0 ? 0 : measuredTally.rear / measuredSwings,
      engagementMedian: median(gaps),
      dodges: measuredTally.dodged,
      dodgeRate:
        measuredTally.decisions === 0
          ? 0
          : measuredTally.dodged / measuredTally.decisions,
    })
  }
  return rows
}

/**
 * Paid dodges, measured where a dodge is observable (R1, F2). The doctrine
 * table's fixed matchup draws none: both sides stand at about 1.2 m and trade
 * shots, and the controller's dodge gate fires only on an incoming swing or a
 * shot already on this body's line, so that pairing reports 0.0% honestly. This
 * fixture puts each doctrine under real pressure (electric_hound's short-reach
 * kit against the tortoise's guard) and reports the paid dodges apart from the
 * table rather than inventing a number for a matchup that has none.
 */
export interface DodgeRow {
  readonly id: DoctrineId
  readonly label: string
  readonly fights: number
  readonly dodges: number
  readonly perFight: number
}

const DODGE_SPECIES = "electric_hound"
const DODGE_OPPONENT = "earth_tortoise"

/** Paid dodges per fight, one row per doctrine (R1, F2). */
export function measureDodges(lines: LineMap): DodgeRow[] {
  const subject = ALL_SPECIES.find((species) => species.id === DODGE_SPECIES)
  const rival = ALL_SPECIES.find((species) => species.id === DODGE_OPPONENT)
  if (!subject || !rival) throw new Error("the dodge fixture left the roster")
  const rows: DodgeRow[] = []
  for (const doctrine of DOCTRINE_IDS) {
    let dodges = 0
    let fights = 0
    for (const seed of DOCTRINE_SEEDS) {
      for (const order of [0, 1] as const) {
        fights += 1
        const home = order === 0 ? subject : rival
        const away = order === 0 ? rival : subject
        const homeSide = speciesSide(
          home,
          order === 0 ? doctrine : STANDARD_DOCTRINE,
          typicalOf(lines, home),
        )
        const awaySide = speciesSide(
          away,
          order === 0 ? STANDARD_DOCTRINE : doctrine,
          typicalOf(lines, away),
        )
        const result = resolveContinuous(homeSide, awaySide, seed)
        dodges += result.dodges?.[order === 0 ? 0 : 1] ?? 0
      }
    }
    rows.push({
      id: doctrine,
      label: DOCTRINE_LABELS[doctrine],
      fights,
      dodges,
      perFight: fights === 0 ? 0 : dodges / fights,
    })
  }
  return rows
}

/** The boss table: every boss against the whole roster at its typical line. */
function measureBosses(lines: LineMap): BossRow[] {
  const rows: BossRow[] = []
  for (const boss of BOSSES) {
    let playerWins = 0
    let draws = 0
    let fights = 0
    for (const species of ALL_SPECIES) {
      for (const seed of BOSS_SEEDS) {
        fights += 1
        const player = speciesSide(
          species,
          STANDARD_DOCTRINE,
          typicalOf(lines, species),
        )
        const rival = bossSide(boss, seed)
        const result = resolveContinuous(player, rival, seed)
        const winner = winnerOf(result, player, rival)
        if (winner === 0) playerWins += 1
        if (winner === null) draws += 1
      }
    }
    rows.push({
      id: boss.id,
      name: boss.name,
      speciesId: boss.speciesId,
      stage: `${boss.tier} ${boss.milestone}`,
      fights,
      playerWins,
      draws,
    })
  }
  return rows
}

/** A percentage with one decimal, deterministically formatted. */
function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/** Pad a cell to a fixed width. */
function pad(value: string | number, width: number): string {
  return String(value).padEnd(width)
}

/** Every target the spec sets, measured against the sample. */
export function targets(sample: BalanceSample): Target[] {
  const out: Target[] = []
  for (const row of sample.matrix.species) {
    // R1 (F1): the decision rests on distinct fights, not games. `distinct`
    // is the effective sample; the null standard error is `sqrt(0.25 / n)`.
    const unverified = row.distinct < DISTINCT_FLOOR
    const slack =
      SIGNIFICANCE_Z * Math.sqrt(0.25 / Math.max(DISTINCT_FLOOR, row.distinct))
    out.push({
      name: `species:${row.id}`,
      observed: `${pct(row.rate)} (${row.wins}/${row.games}, ${row.distinct} distinct, se ${pct(row.se)})`,
      bound: unverified
        ? `needs >= ${DISTINCT_FLOOR} distinct fights to be judged (has ${row.distinct})`
        : `|rate - 50%| <= ${pct(slack)} (design target ${pct(SPECIES_MIN)}..${pct(SPECIES_MAX)})`,
      ok: !unverified && Math.abs(row.rate - 0.5) <= slack,
      unverified,
      why: "FR-5 / AC-5: a species is balanced unless its win rate is significantly off 50% over its distinct fights; the 45-55% band is the design target, not the pass condition",
    })
  }

  const cap = sample.duration
  const capShare = cap.total === 0 ? 0 : cap.time / cap.total
  out.push({
    name: "capShare",
    observed: `${pct(capShare)} (${cap.time}/${cap.total})`,
    bound: `<= ${pct(CAP_MAX)}`,
    ok: cap.time * 3 <= cap.total,
    why: "FR-4 / AC-4: at most one fight in three may be decided at the cap",
  })

  // Rework 2 (owner ruling 2026-11-10): a cap decision is an outlasting win,
  // not a stalemate, so FR-4 no longer gates the knockout-only band. The band
  // stays in the sample and is printed as a diagnostic. What gates instead is
  // the *decisive* share: knockouts plus cap wins that finished far enough
  // ahead to be an outlasting rather than a tiebreak.
  const decisiveCapWins = cap.capMargins.filter(
    (bp) => bp >= CAP_MARGIN_FLOOR_BP,
  ).length
  const decisive = cap.ko + decisiveCapWins
  out.push({
    name: "decisiveShare",
    observed: `${pct(cap.total === 0 ? 0 : decisive / cap.total)} (${decisive}/${cap.total}; ${cap.ko} ko + ${decisiveCapWins} cap wins at >= ${(CAP_MARGIN_FLOOR_BP / 100).toFixed(2)} pts)`,
    bound: `>= ${pct(DECISIVE_SHARE_MIN)}`,
    ok: cap.total !== 0 && decisive * 3 >= cap.total * 2,
    why: "FR-20 / AC-17: two fights in three must end decisively — a knockout, or an outlasting cap win whose HP margin clears the stated floor",
  })
  out.push({
    name: "capWinQuality",
    observed: `${pct(cap.time === 0 ? 0 : decisiveCapWins / cap.time)} (${decisiveCapWins}/${cap.time} cap wins clear ${(CAP_MARGIN_FLOOR_BP / 100).toFixed(2)} pts)`,
    bound: `>= ${pct(DECISIVE_SHARE_MIN)}`,
    // Vacuous when there is nothing to judge: a matrix where every fight ends
    // by knockout has no cap wins, so "two in three cap wins" is satisfied by
    // the absence of the population rather than by its quality. FR-4 explicitly
    // allows a 0% cap share, so this row must not fail on it (R4 T1).
    ok: cap.time === 0 || decisiveCapWins * 3 >= cap.time * 2,
    why: "FR-20 / AC-17 (R3, amended R4): decisiveShare counts knockouts, so it cannot fail on the quality of the cap wins it adds — this row judges the cap wins alone: two in three must finish far enough ahead to be an outlasting, not a tiebreak; with no cap wins there is nothing to judge and the row is satisfied",
  })
  out.push({
    name: "medianDuration",
    observed: `${(cap.median / 1000).toFixed(2)}s`,
    bound: "inside 25.00s..40.00s (>= 25.00s and < 40.00s)",
    ok: cap.median >= BAND_MIN_MS && cap.median < DURATION_MAX_MS,
    why: "FR-4 / AC-4: the median fight lands inside the window; FR-20 / AC-17: and strictly below the cap",
  })

  // R1 (F4): the pacing floor is the 5th percentile, not the single fastest
  // fight — a bound on one fight in 840 invites propping up a glass cannon.
  // `durationMin` stays printed in the summary as a diagnostic.
  out.push({
    name: "durationP05",
    observed: `${(cap.p05 / 1000).toFixed(2)}s (min ${(cap.min / 1000).toFixed(2)}s, diagnostic)`,
    bound: `>= ${(DURATION_MIN_MS / 1000).toFixed(2)}s`,
    ok: cap.p05 >= DURATION_MIN_MS,
    why: "FR-4 / AC-4: the 5th-percentile fight may not end before the tuned floor",
  })
  out.push({
    name: "durationMax",
    observed: `${(cap.max / 1000).toFixed(2)}s`,
    bound: `<= ${(DURATION_MAX_MS / 1000).toFixed(2)}s`,
    ok: cap.max <= DURATION_MAX_MS,
    why: "FR-4 / AC-4: no fight may run past the cap",
  })

  const offenders = sample.damage.rows.filter(
    (row) => row.share < DAMAGE_MIN_PERCENT || row.share > DAMAGE_MAX_PERCENT,
  )
  out.push({
    name: "damageBand",
    observed:
      offenders.length === 0
        ? `${sample.damage.rows.length}/${sample.damage.rows.length} moves inside`
        : offenders
            .map((row) => `${row.id} ${row.share.toFixed(2)}%`)
            .join(", "),
    bound: `${DAMAGE_MIN_PERCENT}%..${DAMAGE_MAX_PERCENT}% of the ${sample.damage.pool} pool`,
    ok: offenders.length === 0,
    why: "FR-1 / AC-1: every catalog move's base hit lands in the 4-12% band",
  })

  for (const boss of sample.bosses) {
    out.push({
      name: `boss:${boss.id}`,
      observed: `player won ${boss.playerWins}/${boss.fights} (${pct(
        boss.playerWins / boss.fights,
      )}), drew ${boss.draws}`,
      bound: "0 < player wins < fights",
      ok: boss.playerWins > 0 && boss.playerWins < boss.fights,
      why: "FR-6 / AC-6: every boss is beatable at its stage and not trivial",
    })
  }
  return out
}

/** Every target the sample misses, in declaration order. */
export function violations(sample: BalanceSample): Target[] {
  return targets(sample).filter((target) => !target.ok)
}

/**
 * The species rows outside the printed 45-55% design band (FR-5 / AC-5).
 *
 * This is a *report*, not a pass condition: the gate's decision rule is the
 * two-sided significance test over distinct fights. AC-5 still requires the
 * rows outside the design target to be named in a maintained list, so the
 * report computes them from the sample and the suite asserts the list against
 * a recorded array — a row drifting across 45% or 55% fails the suite and the
 * list is updated deliberately.
 */
export function designBandMisses(sample: BalanceSample): SpeciesRow[] {
  return sample.matrix.species.filter(
    (row) => row.rate < SPECIES_MIN || row.rate > SPECIES_MAX,
  )
}

/** The one-line result the harness prints, and the test asserts. */
export function describe(target: Target): string {
  return `${target.name}: observed ${target.observed}, bound ${target.bound}`
}

/** The readable report, as lines. */
export function report(sample: BalanceSample): string[] {
  const lines: string[] = []
  const speciesCount = sample.matrix.species.length
  const doctrineFights = sample.doctrines.reduce(
    (sum, row) => sum + row.fights,
    0,
  )
  const bossFights = sample.bosses.reduce((sum, row) => sum + row.fights, 0)
  lines.push(
    `Battle balance report — ${speciesCount} species, ${sample.matrix.fights} matrix fights, ${doctrineFights} doctrine fights, ${bossFights} boss fights (FR-4..FR-7)`,
  )
  lines.push(
    `standard doctrine: ${STANDARD_DOCTRINE} — the mapped default of the legacy balanced tactic, the most neutral band in the table`,
  )
  lines.push(
    `doctrine table:    species ${STANDARD_SPECIES} vs ${DOCTRINE_OPPONENT}, measured side varies, opponent stays ${STANDARD_DOCTRINE}`,
  )
  lines.push(
    `measured line:     each species' own typical creature — the integer midpoint of its roll bounds, floor((min + max) / 2) per stat (FR-22)`,
  )
  lines.push(
    `reference line:    hp ${REFERENCE.hp}, atk ${REFERENCE.atk}, def ${REFERENCE.def}, spd ${REFERENCE.spd}, clamped into each species' own roll bounds — diagnostic only, never gates`,
  )
  lines.push(
    `seeds:             matrix ${sample.matrix.seeds.join(", ")}; the fight's own RNG is seeded from it, so two seeds play two different fights (FR-21)`,
  )
  lines.push(
    `sample:            ${sample.matrix.matchups / sample.matrix.seeds.length} ordered pairings x ${sample.matrix.seeds.length} seeds = ${sample.matrix.fights} fights; mirrors excluded; ${sample.matrix.species[0]?.games ?? 0} games per species`,
  )
  lines.push(
    `diversity:         ${pct(sample.matrix.diversity)} of ordered pairings change winner across the seeds (FR-21; a floor, not a ceiling)`,
  )
  lines.push("")

  lines.push("species matrix (standard doctrine, mirrors excluded)")
  lines.push(
    `${pad("species", 22)}${pad("games", 7)}${pad("distinct", 10)}${pad("wins", 6)}${pad("draws", 7)}${pad("win rate", 10)}se`,
  )
  for (const row of sample.matrix.species) {
    lines.push(
      `${pad(row.id, 22)}${pad(row.games, 7)}${pad(row.distinct, 10)}${pad(row.wins, 6)}${pad(row.draws, 7)}${pad(pct(row.rate), 10)}${pct(row.se)}`,
    )
  }
  const misses = designBandMisses(sample)
  lines.push(
    `design-band misses (outside ${pct(SPECIES_MIN)}..${pct(SPECIES_MAX)}, FR-5 / AC-5): ${
      misses.length === 0
        ? "none"
        : misses.map((row) => `${row.id} ${pct(row.rate)}`).join(", ")
    }`,
  )
  lines.push("")

  lines.push(
    "reference line (diagnostic — every species at the equal-investment line; printed, never gated)",
  )
  lines.push(
    `${pad("species", 22)}${pad("games", 7)}${pad("wins", 6)}${pad("draws", 7)}win rate`,
  )
  for (const row of sample.matrix.reference) {
    lines.push(
      `${pad(row.id, 22)}${pad(row.games, 7)}${pad(row.wins, 6)}${pad(row.draws, 7)}${pct(row.rate)}`,
    )
  }
  // R2 (T6): the spread is a finding, not a target. At identical stats the
  // roster still ranges from the drake to the voltfox, so kit shape — reach,
  // recovery, accuracy and cooldown — dominates at equal investment.
  const spread = [...sample.matrix.reference].sort(
    (left, right) => left.rate - right.rate,
  )
  const lowest = spread[0]
  const highest = spread[spread.length - 1]
  if (lowest && highest) {
    lines.push(
      `finding: reference-line spread ${lowest.id} ${pct(lowest.rate)} .. ${highest.id} ${pct(highest.rate)} at equal investment — kit shape, not stats, dominates (FR-22 diagnostic, recorded not gated)`,
    )
  }
  // FR-7: the same pass's clock endings. One line, no bound, no target — the
  // reference line stays a diagnostic, and this is the only new thing said
  // about it.
  const referenceCap = sample.matrix.referenceCap
  lines.push(
    `reference line cap share: ${referenceCap.count}/${referenceCap.total} (${pct(referenceCap.total === 0 ? 0 : referenceCap.count / referenceCap.total)}) — diagnostic only`,
  )
  lines.push("")

  const probeByDoctrine = new Map(
    sample.dodgeProbe.map((row) => [row.id, row] as const),
  )
  lines.push("doctrine table (one species, one matchup, one row per doctrine)")
  lines.push(
    `${pad("doctrine", 10)}${pad("fights", 8)}${pad("win rate", 10)}${pad("rear-or-flank", 15)}${pad("rear", 8)}${pad("median gap", 12)}${pad("dodges", 8)}${pad("dodge rate", 12)}probe/fight`,
  )
  for (const row of sample.doctrines) {
    const probe = probeByDoctrine.get(row.id)
    lines.push(
      `${pad(row.label, 10)}${pad(row.fights, 8)}${pad(pct(row.rate), 10)}${pad(pct(row.rearOrFlank), 15)}${pad(pct(row.rear), 8)}${pad(`${Math.round(row.engagementMedian)}mm`, 12)}${pad(row.dodges, 8)}${pad(pct(row.dodgeRate), 12)}${probe ? probe.perFight.toFixed(2) : "-"}`,
    )
  }
  // R2 (T5): the table's fixed matchup draws no paid dodges, so its own dodge
  // column is honestly 0.0% on every row. The probe column beside it is the
  // measured dodge behaviour, and it separates the doctrines; the table now
  // shows both rather than a column of zeroes pretending to be a measurement.
  const kite = sample.doctrines.find((row) => row.id === "kite")
  if (kite) {
    const verdict =
      kite.rate === 0
        ? "a doctrine that loses every sampled fight is not a choice; the owner needs to decide whether Kite is a trap or a missing tool"
        : `Kite wins ${pct(kite.rate)} of its sampled fights; the R1 0/6 result is no longer the verdict`
    lines.push(
      `finding: ${kite.label} ${kite.rate === 0 ? "0/6" : `${pct(kite.rate)} (${kite.fights} fights)`} — ${verdict}`,
    )
  }
  lines.push("")

  lines.push(
    "dodge probe (paid dodges where a dodge is observable; the table above draws none in its fixed matchup) (R1, F2)",
  )
  lines.push(
    `${pad("doctrine", 10)}${pad("fights", 8)}${pad("dodges", 8)}per fight`,
  )
  for (const row of sample.dodgeProbe) {
    lines.push(
      `${pad(row.label, 10)}${pad(row.fights, 8)}${pad(row.dodges, 8)}${row.perFight.toFixed(2)}`,
    )
  }
  lines.push("")

  lines.push(
    "boss table (excluded from the 45-55% band; each must be beatable and not trivial)",
  )
  lines.push(
    `${pad("boss", 22)}${pad("species", 18)}${pad("stage", 20)}${pad("fights", 8)}${pad("player won", 12)}rate`,
  )
  for (const row of sample.bosses) {
    lines.push(
      `${pad(row.id, 22)}${pad(row.speciesId, 18)}${pad(row.stage, 20)}${pad(row.fights, 8)}${pad(row.playerWins, 12)}${pct(row.playerWins / row.fights)}`,
    )
  }
  lines.push("")

  lines.push(
    `base hits (front, no counter, chart-neutral; pool ${sample.damage.pool})`,
  )
  lines.push(`${pad("move", 22)}${pad("power", 7)}${pad("damage", 8)}share`)
  for (const row of sample.damage.rows) {
    lines.push(
      `${pad(row.id, 22)}${pad(row.power, 7)}${pad(row.damage, 8)}${row.share.toFixed(2)}%`,
    )
  }
  lines.push("")

  const duration = sample.duration
  lines.push(
    `fights:            ${duration.total} (ko ${duration.ko}, time ${duration.time}, draw ${duration.draws})`,
  )
  lines.push(
    `duration:          min ${(duration.min / 1000).toFixed(2)}s  median ${(duration.median / 1000).toFixed(2)}s  max ${(duration.max / 1000).toFixed(2)}s`,
  )
  lines.push(
    `cap share:         ${duration.time}/${duration.total} (${pct(duration.time / duration.total)})`,
  )
  const resolvedCount = duration.total - duration.time
  lines.push(
    `knockout band:     ${duration.resolvedInBand}/${duration.total} (${pct(duration.resolvedInBand / duration.total)} of all fights, ${resolvedCount === 0 ? "no resolved fights" : `${pct(duration.resolvedInBand / resolvedCount)} of ${resolvedCount} resolved`}) — diagnostic only (FR-4: a cap win is an outlasting win)`,
  )
  lines.push(
    `knockout share:    ${duration.ko}/${duration.total} (${pct(duration.ko / duration.total)}) — diagnostic`,
  )
  const margins = [...duration.capMargins].sort((left, right) => left - right)
  const decisiveCapWins = margins.filter(
    (bp) => bp >= CAP_MARGIN_FLOOR_BP,
  ).length
  const decisive = duration.ko + decisiveCapWins
  lines.push(
    `decisive share:    ${decisive}/${duration.total} (${pct(duration.total === 0 ? 0 : decisive / duration.total)}; ${duration.ko} ko + ${decisiveCapWins} cap wins at >= ${(CAP_MARGIN_FLOOR_BP / 100).toFixed(2)} pts)`,
  )
  lines.push(
    `cap-win quality:   ${decisiveCapWins}/${duration.time} cap wins clear the floor (${pct(duration.time === 0 ? 0 : decisiveCapWins / duration.time)}; FR-20 / AC-17, gated separately from decisive share)`,
  )
  if (margins.length === 0) {
    lines.push("cap margin:        no cap wins")
  } else {
    const at = (share: number): number =>
      margins[
        Math.min(margins.length - 1, Math.floor(margins.length * share))
      ] ?? 0
    lines.push(
      `cap margin:        p05 ${(at(0.05) / 100).toFixed(2)} pts / median ${(median(margins) / 100).toFixed(2)} pts / p95 ${(at(0.95) / 100).toFixed(2)} pts over ${margins.length} cap wins; ${margins.length - decisiveCapWins} inside ${(CAP_MARGIN_FLOOR_BP / 100).toFixed(2)} pts (not decisive)`,
    )
  }
  lines.push(
    `observed blow:     median ${sample.observedBlowShare.toFixed(2)}% of the victim's pool`,
  )
  lines.push("")
  for (const target of targets(sample)) {
    lines.push(
      `${target.unverified === true ? "UNVERIFIED" : target.ok ? "ok  " : "FAIL"} ${describe(target)}`,
    )
  }
  return lines
}

/**
 * Run the harness over a sample, writing every line to `out`, and return the
 * process exit code: 0 when every target holds, 1 when one does not. Split
 * from `main` so the test can prove the exit code and the failure line
 * without spawning a process.
 */
export function run(
  sample: BalanceSample,
  out: (line: string) => void = console.log,
): number {
  // `report` already marks every target with `ok`, `FAIL` or `UNVERIFIED`, so
  // the run does not repeat the failing rows: a duplicate FAIL line is how the
  // old gate looked like it had two problems when it had one.
  for (const line of report(sample)) out(line)
  return violations(sample).length === 0 ? 0 : 1
}

/** Measure the roster and run the gate. */
export function main(): number {
  return run(measure())
}

if (import.meta.main) {
  process.exitCode = main()
}
