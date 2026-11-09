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
 * The sample is fixed and stated in the output. The continuous engine is
 * seed-free (`advance.ts`): the seed only decides a capped fight's tiebreak, so
 * the matrix plays one odd and one even seed per ordered pairing — a capped
 * fight's tiebreak cannot favour one side — and the movement metrics are read
 * from the same deterministic fights. Fifteen species give 15 x 14 x 2 orders x
 * 2 seeds = 840 matrix fights, 56 games per species (1.8% per game).
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
 * The stat line every side is ramped to, exactly as `pacing.test.ts` and
 * `battle-telemetry.ts` do: the middle of the starter band, clamped into each
 * species' own roll bounds. The sheet's HP is the pool since Phase 5 folded
 * the scale away.
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
const MATRIX_SEEDS = [20261109, 20261110] as const

/** Three seeds per order for the doctrine table: six fights per doctrine. */
const DOCTRINE_SEEDS = [20261109, 20261110, 20261111] as const

/** Two seeds per species for the boss table: thirty fights per boss. */
const BOSS_SEEDS = [20261109, 20261110] as const

/** FR-5 / AC-5: every species lands in this band under the standard doctrine. */
const SPECIES_MIN = 0.45
const SPECIES_MAX = 0.55

/** FR-4 / AC-4: at most one fight in three may be decided at the cap. */
const CAP_MAX = 1 / 3

/** FR-4: a majority of fights finish inside the tuned band. */
const BAND_MIN_MS = 25_000
const BAND_MAX_MS = 40_000
const BAND_SHARE_MIN = 0.5

/** The engine's measured floor and the fight cap, in ms (AC-7). */
const DURATION_MIN_MS = 8_000
const DURATION_MAX_MS = 40_000

/** FR-1: the base hit of every catalog move, in percent of the reference pool. */
const DAMAGE_MIN_PERCENT = 4
const DAMAGE_MAX_PERCENT = 12

type StatLine = { hp: number; atk: number; def: number; spd: number }

function clampStat(value: number, bounds: readonly [number, number]): number {
  return Math.min(bounds[1], Math.max(bounds[0], value))
}

/** A roster species as a cup slot would build it, under a stated doctrine. */
function speciesSide(species: SpeciesDef, doctrine: DoctrineId): BattleSide {
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

/** One species' measured row in the matrix. */
export interface SpeciesRow {
  readonly id: string
  readonly name: string
  readonly games: number
  readonly wins: number
  readonly draws: number
  /** (wins + draws / 2) / games: a double knockout counts half to each side. */
  readonly rate: number
}

/** One doctrine's measured row, holding species and matchup fixed. */
export interface DoctrineRow {
  readonly id: DoctrineId
  readonly label: string
  readonly fights: number
  readonly rate: number
  /** Share of the measured side's landed blows that were flank or rear. */
  readonly rearOrFlank: number
  /** Median centre-to-centre gap over every step of every fight, in mm. */
  readonly engagementMedian: number
  /** Dodged swings / (dodged swings + landed blows), measured side only. */
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
  readonly why: string
}

/** Everything the command measures. */
export interface BalanceSample {
  readonly matrix: {
    readonly fights: number
    readonly matchups: number
    readonly seeds: readonly number[]
    readonly species: readonly SpeciesRow[]
  }
  readonly doctrines: readonly DoctrineRow[]
  readonly bosses: readonly BossRow[]
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
    readonly inBand: number
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
  dodged: number
}

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
    if (event.missReason === "dodge") {
      tallies[side].dodged += 1
      continue
    }
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
}

/** Add one fight's tally into a doctrine row's running total. */
function mergeTally(into: PositionTally, from: PositionTally): void {
  into.flank += from.flank
  into.rear += from.rear
  into.landed += from.landed
  into.dodged += from.dodged
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

/** Measure the species matrix, the doctrine table and the boss table. */
export function measure(): BalanceSample {
  const roster = ALL_SPECIES
  const tallies = new Map<
    string,
    { wins: number; draws: number; games: number }
  >()
  for (const species of roster) {
    tallies.set(species.id, { wins: 0, draws: 0, games: 0 })
  }

  const durations: number[] = []
  const blowShares: number[] = []
  let ko = 0
  let time = 0
  let draws = 0
  let matchups = 0

  for (const home of roster) {
    for (const away of roster) {
      if (home.id === away.id) continue
      for (const seed of MATRIX_SEEDS) {
        matchups += 1
        const homeSide = speciesSide(home, STANDARD_DOCTRINE)
        const awaySide = speciesSide(away, STANDARD_DOCTRINE)
        const result = resolveContinuous(homeSide, awaySide, seed)
        const winner = winnerOf(result, homeSide, awaySide)
        const ms = msOf(result)
        durations.push(ms)
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
    const row: SpeciesRow = {
      id: def.id,
      name: def.displayName,
      games: tally.games,
      wins: tally.wins,
      draws: tally.draws,
      rate,
    }
    species.push(row)
  }

  const doctrines = measureDoctrines()
  const bosses = measureBosses()

  const sorted = [...durations].sort((left, right) => left - right)
  const inBand = durations.filter(
    (ms) => ms >= BAND_MIN_MS && ms <= BAND_MAX_MS,
  ).length

  return {
    matrix: {
      fights: durations.length,
      matchups,
      seeds: MATRIX_SEEDS,
      species,
    },
    doctrines,
    bosses,
    damage: { pool: startingHp({ stats: REFERENCE }), rows: damageRows() },
    duration: {
      total: durations.length,
      min: sorted[0] ?? 0,
      median: median(durations),
      max: sorted[sorted.length - 1] ?? 0,
      ko,
      time,
      draws,
      inBand,
    },
    observedBlowShare: median(blowShares),
  }
}

/** The doctrine table: one species, one matchup, one row per doctrine. */
function measureDoctrines(): DoctrineRow[] {
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
    }
    const incomingTally: PositionTally = {
      flank: 0,
      rear: 0,
      landed: 0,
      dodged: 0,
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
        )
        const awaySide = speciesSide(
          away,
          order === 0 ? STANDARD_DOCTRINE : doctrine,
        )
        const result = resolveContinuous(homeSide, awaySide, seed)
        const stream = streamOf(result)
        if (!stream) throw new Error(`${doctrine} resolved without a stream`)
        const tallies: [PositionTally, PositionTally] = [
          { flank: 0, rear: 0, landed: 0, dodged: 0 },
          { flank: 0, rear: 0, landed: 0, dodged: 0 },
        ]
        positionsOf(result, stream, tallies)
        const watch = order === 0 ? 0 : 1
        mergeTally(measuredTally, tallies[watch])
        mergeTally(incomingTally, tallies[watch === 0 ? 1 : 0])
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
    const incomingSwings = incomingTally.landed + incomingTally.dodged
    rows.push({
      id: doctrine,
      label: DOCTRINE_LABELS[doctrine],
      fights,
      rate: (wins + draws / 2) / fights,
      rearOrFlank:
        measuredSwings === 0
          ? 0
          : (measuredTally.flank + measuredTally.rear) / measuredSwings,
      engagementMedian: median(gaps),
      dodgeRate:
        incomingSwings === 0 ? 0 : incomingTally.dodged / incomingSwings,
    })
  }
  return rows
}

/** The boss table: every boss against the whole roster at the reference line. */
function measureBosses(): BossRow[] {
  const rows: BossRow[] = []
  for (const boss of BOSSES) {
    let playerWins = 0
    let draws = 0
    let fights = 0
    for (const species of ALL_SPECIES) {
      for (const seed of BOSS_SEEDS) {
        fights += 1
        const player = speciesSide(species, STANDARD_DOCTRINE)
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
    out.push({
      name: `species:${row.id}`,
      observed: `${pct(row.rate)} (${row.wins}/${row.games})`,
      bound: `${pct(SPECIES_MIN)}..${pct(SPECIES_MAX)}`,
      ok: row.rate >= SPECIES_MIN && row.rate <= SPECIES_MAX,
      why: "FR-5 / AC-5: every species lands in the 45-55% band under the standard doctrine",
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

  const bandShare = cap.total === 0 ? 0 : cap.inBand / cap.total
  out.push({
    name: "durationBand",
    observed: `${pct(bandShare)} (${cap.inBand}/${cap.total})`,
    bound: `>= ${pct(BAND_SHARE_MIN)} in 25.00s..40.00s`,
    ok: bandShare >= BAND_SHARE_MIN,
    why: "FR-4: a majority of fights finish inside the tuned 25-40s band",
  })

  out.push({
    name: "durationMin",
    observed: `${(cap.min / 1000).toFixed(2)}s`,
    bound: `>= ${(DURATION_MIN_MS / 1000).toFixed(2)}s`,
    ok: cap.min >= DURATION_MIN_MS,
    why: "AC-7: no fight may end before the tuned floor",
  })
  out.push({
    name: "durationMax",
    observed: `${(cap.max / 1000).toFixed(2)}s`,
    bound: `<= ${(DURATION_MAX_MS / 1000).toFixed(2)}s`,
    ok: cap.max <= DURATION_MAX_MS,
    why: "AC-7: no fight may run past the cap",
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
    `reference line:    hp ${REFERENCE.hp}, atk ${REFERENCE.atk}, def ${REFERENCE.def}, spd ${REFERENCE.spd}, clamped into each species' own roll bounds`,
  )
  lines.push(
    `seeds:             matrix ${sample.matrix.seeds.join(", ")} (one odd, one even per ordered pairing); the engine is seed-free, the seed decides only a capped fight's tiebreak`,
  )
  lines.push(
    `sample:            ${sample.matrix.matchups / sample.matrix.seeds.length} ordered pairings x ${sample.matrix.seeds.length} seeds = ${sample.matrix.fights} fights; mirrors excluded; ${sample.matrix.species[0]?.games ?? 0} games per species`,
  )
  lines.push("")

  lines.push("species matrix (standard doctrine, mirrors excluded)")
  lines.push(
    `${pad("species", 22)}${pad("games", 7)}${pad("wins", 6)}${pad("draws", 7)}win rate`,
  )
  for (const row of sample.matrix.species) {
    lines.push(
      `${pad(row.id, 22)}${pad(row.games, 7)}${pad(row.wins, 6)}${pad(row.draws, 7)}${pct(row.rate)}`,
    )
  }
  lines.push("")

  lines.push("doctrine table (one species, one matchup, one row per doctrine)")
  lines.push(
    `${pad("doctrine", 10)}${pad("fights", 8)}${pad("win rate", 10)}${pad("rear-or-flank", 15)}${pad("median gap", 12)}dodge rate`,
  )
  for (const row of sample.doctrines) {
    lines.push(
      `${pad(row.label, 10)}${pad(row.fights, 8)}${pad(pct(row.rate), 10)}${pad(pct(row.rearOrFlank), 15)}${pad(`${Math.round(row.engagementMedian)}mm`, 12)}${pct(row.dodgeRate)}`,
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
  lines.push(
    `25-40s band:       ${duration.inBand}/${duration.total} (${pct(duration.inBand / duration.total)})`,
  )
  lines.push(
    `observed blow:     median ${sample.observedBlowShare.toFixed(2)}% of the victim's pool`,
  )
  lines.push("")
  for (const target of targets(sample)) {
    lines.push(`${target.ok ? "ok  " : "FAIL"} ${describe(target)}`)
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
  for (const line of report(sample)) out(line)
  const broken = violations(sample)
  for (const target of broken) out(`FAIL ${describe(target)}`)
  return broken.length === 0 ? 0 : 1
}

/** Measure the roster and run the gate. */
export function main(): number {
  return run(measure())
}

if (import.meta.main) {
  process.exitCode = main()
}
