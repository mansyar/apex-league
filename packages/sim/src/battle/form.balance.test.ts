/**
 * Form balance probe (training_programs FR16, AC-9) — the boss tuning batch
 * from `bosses.balance.test.ts` re-run with form-bearing creatures, so a form
 * tier can never quietly rewrite the FR12 bands.
 *
 * What the probe holds fixed is the FR12 player profile itself: stat bonuses
 * trained to `TRAINING_CAP` on every stat, the birth kit (the boss probe's
 * `playerAt` leaves `trainingDays` at 0, so `defaultLoadout` still slices the
 * first four of the six known moves). Everything the boss probe pinned stays
 * pinned — six creature seeds, six battle seeds, the six authored bosses, the
 * same bundled loadout and balanced tactic — and exactly one thing varies:
 * the care routine the training program left behind. That is the whole of
 * what this track adds to a battle, so it is the whole of what the probe
 * sweeps.
 *
 * A mix is the routine an owner ran: the program whose nights built the
 * creature plus the care those nights imply. The steady mix is the starting
 * hand and reproduces the recorded FR12 tallies byte for byte (AC-1); the
 * other three leave flat, sluggish, and sharp creatures behind.
 *
 * One model gap is reported, not asserted (the bands do not describe it):
 * a REAL program-built creature has spent 6+ trained days, so its default
 * kit carries four moves instead of the calibration profile's two. Those
 * numbers are in the report's second table — see the phase evidence for the
 * finding they raise about the FR12 calibration, which predates this track
 * and is out of its scope.
 *
 * Regenerate the markdown report for the evidence file:
 *   APEX_FORM_BALANCE_REPORT=1 bun test packages/sim/src/battle/form.balance.test.ts
 *
 * The lever under test is ATK-only (product decision, 2026-10-20): sharp +1 ATK,
 * flat -1 ATK, sluggish -2 ATK, steady 0, and SPD never moves. The first run of
 * this probe measured the original ATK+SPD lever and found that a ±1 SPD delta
 * flips initiative on the FR12 boundary (Koda 0.0% sluggish / 91.7% sharp), so
 * SPD was dropped from `FORM_DELTAS` and AC-9 was amended. What AC-9 now asks
 * of this probe: steady form holds the FR12 40-70% band, no tier pushes a
 * gatekeeper cell below 15%, and the tiers stay monotonic per boss.
 *
 * Measured on the ATK-only lever: steady reproduces every FR12 tally, the
 * ladder is monotonic on all six gatekeeper cells, and AC-9's 15% floor holds
 * on all 24 tier-cells with the tightest margin at Delmar x fire_drake
 * sluggish (16.7%, 6 of 36); Delmar flat, Fenn sluggish and Thessa sluggish sit
 * under 25% but well clear of the floor. P3.T4.3's fallback was measured too:
 * sluggish at -1 ATK collapses the ladder (sluggish and flat become the same
 * battle) and still leaves Delmar at 22.2%, so the -2 ATK lever shipped. The
 * sub-25% cells and their margins are recorded in the phase evidence.
 */

import { describe, expect, test } from "bun:test"
import { BOSSES, type BossDef } from "../bosses"
import {
  type Creature,
  type CreatureConditions,
  createCreature,
  TRAINING_CAP,
} from "../creature"
import { battleSideForSlot } from "../cup"
import { battleStats, type FormTier, formTier } from "../form"
import { defaultLoadout } from "../loadout"
import { getSpecies, STARTER_SPECIES } from "../species"
import type { TrainingProgram } from "../training"
import { typeFactor } from "./chart"
import type { Tactic } from "./policy"
import { type BattleSide, resolveBattle } from "./resolver"

/** Creature seeds sampling the stat-roll space (mirrors the boss probe). */
const CREATURE_SEEDS: readonly number[] = [11, 42, 77, 101, 143, 202]

/** Battle seeds replayed inside every duel cell (mirrors the boss probe). */
const BATTLE_SEEDS: readonly number[] = [11, 29, 47, 53, 71, 89]

/** The player's default tactic; rivals and bosses roll their own. */
const PLAYER_TACTIC: Tactic = "balanced"

/**
 * FR12 bands, mirrored exactly from `bosses.balance.test.ts` (recorded
 * 2026-10-18, move_pool_20261018 Phase 3). No invented thresholds: if a form
 * mix leaves one of these, the tuning decision belongs to the primary.
 */
const FR12_GRIND_FLOOR = 0.35
const FR12_BAND_MIN = 0.4
const FR12_BAND_MAX = 0.7

/**
 * AC-9 (amended 2026-10-20, floor lowered to 15% at `744314a`): no form tier may
 * push any gatekeeper cell below this floor — the band may move inside 15-70%,
 * but a neglected creature must still be able to win somewhere. The ATK-only
 * lever's worst cell (Delmar, sluggish) sits at 16.7%, one battle above it.
 */
const TIER_FLOOR = 0.15

/** The FR12 recorded disadvantaged-cap tallies, for the steady mix. */
const FR12_DISADVANTAGED_CAP_WINS: Record<
  string,
  { won: number; games: number }
> = {
  koda: { won: 23, games: 36 },
  hesse: { won: 21, games: 36 },
  marlow: { won: 20, games: 36 },
  delmar: { won: 17, games: 36 },
  fenn: { won: 22, games: 36 },
  thessa: { won: 20, games: 36 },
}

/**
 * Measured gatekeeper rates (won of 36), ATK-only lever, 2026-10-20. The
 * `steady` column is the FR12 table above by construction (form is neutral
 * there); the other three are the ladder. These are recorded, not aspirational:
 * four cells sit under 25% (Delmar flat/sluggish, Fenn sluggish, Thessa
 * sluggish) and the worst still clears AC-9's 15% floor by a single battle, so
 * pinning them keeps a new low-water mark from appearing unnoticed.
 */
const GATEKEEPER_WINS: Record<string, Record<FormTier, number>> = {
  koda: { sharp: 33, steady: 23, flat: 19, sluggish: 14 },
  hesse: { sharp: 27, steady: 21, flat: 19, sluggish: 10 },
  marlow: { sharp: 21, steady: 20, flat: 18, sluggish: 13 },
  delmar: { sharp: 20, steady: 17, flat: 8, sluggish: 6 },
  fenn: { sharp: 24, steady: 22, flat: 14, sluggish: 6 },
  thessa: { sharp: 31, steady: 20, flat: 16, sluggish: 8 },
}

/** Games behind every gatekeeper cell: six creature seeds x six battle seeds. */
const GATEKEEPER_GAMES = CREATURE_SEEDS.length * BATTLE_SEEDS.length

/**
 * A program mix: the program whose nights built the creature, the care those
 * nights imply, and the form tier that care must produce (guarded below).
 */
interface ProgramMix {
  readonly id: TrainingProgram
  readonly conditions: CreatureConditions
  readonly form: FormTier
}

const MIXES: readonly ProgramMix[] = [
  {
    id: "power",
    conditions: { hunger: 80, energy: 80, health: 100, mood: 60, bond: 10 },
    form: "steady",
  },
  {
    id: "endurance",
    conditions: { hunger: 60, energy: 60, health: 100, mood: 40, bond: 0 },
    form: "flat",
  },
  {
    id: "sprint",
    conditions: { hunger: 40, energy: 60, health: 100, mood: 10, bond: 0 },
    form: "sluggish",
  },
  {
    id: "ring",
    conditions: { hunger: 90, energy: 90, health: 100, mood: 100, bond: 100 },
    form: "sharp",
  },
]

const CAP = {
  hp: TRAINING_CAP,
  atk: TRAINING_CAP,
  def: TRAINING_CAP,
  spd: TRAINING_CAP,
} as const

/** The tiers best to worst — the order AC-9's monotonicity reads. */
const LADDER: readonly FormTier[] = ["sharp", "steady", "flat", "sluggish"]

/**
 * The FR12 calibration profile: every stat trained to the cap, birth kit
 * (`trainingDays` 0 keeps `defaultLoadout` at its two starting moves), with
 * the program the owner ran and the conditions the routine left behind.
 */
function calibrationCreature(
  speciesId: string,
  seed: number,
  mix: ProgramMix,
): Creature {
  const base = createCreature(speciesId, seed)
  return {
    ...base,
    trained: CAP,
    trainingProgram: mix.id,
    conditions: mix.conditions,
  }
}

/**
 * A real program-built creature: the same cap, but 24 paying nights — enough
 * for four stats' worth of primary nights, which also unlocks the four-move
 * default kit.
 */
function programCreature(
  speciesId: string,
  seed: number,
  mix: ProgramMix,
): Creature {
  return { ...calibrationCreature(speciesId, seed, mix), trainingDays: 24 }
}

/** The player's side as the seam builds it: form stats, default loadout. */
function playerSide(c: Creature): BattleSide {
  const def = getSpecies(c.speciesId)
  if (!def) throw new Error(`unknown species ${c.speciesId}`)
  return {
    name: "Challenger",
    id: "player",
    element: c.element,
    stats: battleStats(c),
    kit: defaultLoadout(c, def),
    tactic: PLAYER_TACTIC,
    temperament: def.temperament,
  }
}

/** The boss's side, straight from the production slot builder. */
function bossSide(boss: BossDef, seed: number): BattleSide {
  const slot = {
    isPlayer: false,
    name: boss.name,
    speciesId: boss.speciesId,
    stats: boss.stats,
    bossId: boss.id,
  }
  return battleSideForSlot(slot, seed)
}

/** The species each boss elementally dominates — the FR12 exam cell. */
function disadvantagedSpecies(boss: BossDef): string {
  const bossDef = getSpecies(boss.speciesId)
  if (!bossDef) throw new Error(`unknown boss species ${boss.speciesId}`)
  const match = STARTER_SPECIES.find((s) => {
    const factor = typeFactor(bossDef.element, s.element)
    return factor.num > factor.den
  })
  if (!match) throw new Error(`no disadvantaged species for ${boss.id}`)
  return match.id
}

interface Tally {
  won: number
  lost: number
  drew: number
}

function emptyTally(): Tally {
  return { won: 0, lost: 0, drew: 0 }
}

function games(t: Tally): number {
  return t.won + t.lost + t.drew
}

/**
 * Win rate as the FR12 probe records it: `won / games`, draws counted as
 * non-wins, because a drawn boss cell is not a boss cleared.
 */
function winRate(t: Tally): number {
  const g = games(t)
  return g === 0 ? 0 : t.won / g
}

/** Decisive win rate: draws excluded, the tactics probe's convention. */
function decisiveRate(t: Tally): number {
  const decisive = t.won + t.lost
  return decisive === 0 ? 0 : t.won / decisive
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

interface Cell {
  speciesId: string
  mix: ProgramMix
  bossId: string
  tally: Tally
}

/** Duel matrix: every species x program mix x boss, at the cap. */
function runProbe(
  build: (speciesId: string, seed: number, mix: ProgramMix) => Creature,
): { cells: Cell[]; battles: number } {
  const cells: Cell[] = []
  let battles = 0
  for (const speciesId of STARTER_SPECIES.map((s) => s.id)) {
    for (const mix of MIXES) {
      for (const boss of BOSSES) {
        const tally = emptyTally()
        for (const creatureSeed of CREATURE_SEEDS) {
          const player = playerSide(build(speciesId, creatureSeed, mix))
          const rival = bossSide(boss, creatureSeed)
          for (const seed of BATTLE_SEEDS) {
            const result = resolveBattle(player, rival, seed)
            battles += 1
            if (result.winner === null) tally.drew += 1
            else if (result.winner === player.name) tally.won += 1
            else tally.lost += 1
          }
        }
        cells.push({ speciesId, mix, bossId: boss.id, tally })
      }
    }
  }
  return { cells, battles }
}

function cellFor(
  cells: readonly Cell[],
  speciesId: string,
  mix: ProgramMix,
  bossId: string,
): Tally {
  const cell = cells.find(
    (c) =>
      c.speciesId === speciesId && c.mix.id === mix.id && c.bossId === bossId,
  )
  if (!cell) throw new Error(`missing cell ${speciesId}/${mix.id}/${bossId}`)
  return cell.tally
}

/** The slowest boss cell for a species under a mix — the FR12 floor reads it. */
function worstBossRate(
  cells: readonly Cell[],
  speciesId: string,
  mix: ProgramMix,
): number {
  return Math.min(
    ...BOSSES.map((boss) => winRate(cellFor(cells, speciesId, mix, boss.id))),
  )
}

/** Pooled tally across every boss for one species x mix. */
function pooled(
  cells: readonly Cell[],
  speciesId: string,
  mix: ProgramMix,
): Tally {
  return BOSSES.map((boss) => cellFor(cells, speciesId, mix, boss.id)).reduce(
    (acc, t) => ({
      won: acc.won + t.won,
      lost: acc.lost + t.lost,
      drew: acc.drew + t.drew,
    }),
    emptyTally(),
  )
}

/** The steady mix: the starting hand, and the profile FR12 was recorded on. */
function neutralMix(): ProgramMix {
  return mixFor("steady")
}

/** The mix that leaves a creature in the given form tier. */
function mixFor(form: FormTier): ProgramMix {
  const mix = MIXES.find((m) => m.form === form)
  if (!mix) throw new Error(`no ${form} mix`)
  return mix
}

function report(
  calibration: { cells: Cell[]; battles: number },
  program: { cells: Cell[]; battles: number },
): string {
  const lines: string[] = []
  lines.push("# Form balance probe (FR16)")
  lines.push("")
  lines.push(
    `Calibration profile (FR12): ${calibration.battles} battles. Real program builds: ${program.battles} battles.`,
  )
  lines.push("")
  lines.push("## FR12 calibration profile — species x program mix")
  lines.push("")
  lines.push(
    "| species | mix | form | games | won | lost | drew | win rate | decisive | worst boss cell | FR12 floor |",
  )
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|")
  for (const speciesId of STARTER_SPECIES.map((s) => s.id)) {
    for (const mix of MIXES) {
      const t = pooled(calibration.cells, speciesId, mix)
      const worst = worstBossRate(calibration.cells, speciesId, mix)
      lines.push(
        `| ${speciesId} | ${mix.id} | ${mix.form} | ${games(t)} | ${t.won} | ${t.lost} | ${t.drew} | ${pct(winRate(t))} | ${pct(decisiveRate(t))} | ${pct(worst)} | ${worst >= FR12_GRIND_FLOOR ? "in band" : "BELOW"} |`,
      )
    }
  }
  lines.push("")
  lines.push("## Every boss x species cell, by form tier (AC-9)")
  lines.push("")
  lines.push(
    "| boss | species | sharp | steady | flat | sluggish | steady in band | monotonic |",
  )
  lines.push("|---|---|---|---|---|---|---|---|")
  for (const boss of BOSSES) {
    for (const speciesId of STARTER_SPECIES.map((s) => s.id)) {
      const rates = LADDER.map((tier) =>
        winRate(cellFor(calibration.cells, speciesId, mixFor(tier), boss.id)),
      )
      const steady = rates[LADDER.indexOf("steady")] ?? 0
      const monotonic = rates.every(
        (rate, i) => i === 0 || (rates[i - 1] ?? 0) >= rate,
      )
      lines.push(
        `| ${boss.name} | ${speciesId} | ${rates.map(pct).join(" | ")} | ${steady >= FR12_BAND_MIN && steady <= FR12_BAND_MAX ? "in band" : "OUT"} | ${monotonic ? "yes" : "NO"} |`,
      )
    }
  }
  lines.push("")
  lines.push("## Model gap: real program builds (four-move default kit)")
  lines.push("")
  lines.push(
    "| species | mix | form | games | won | lost | drew | win rate | decisive | worst boss cell |",
  )
  lines.push("|---|---|---|---|---|---|---|---|---|---|")
  for (const speciesId of STARTER_SPECIES.map((s) => s.id)) {
    for (const mix of MIXES) {
      const t = pooled(program.cells, speciesId, mix)
      const worst = worstBossRate(program.cells, speciesId, mix)
      lines.push(
        `| ${speciesId} | ${mix.id} | ${mix.form} | ${games(t)} | ${t.won} | ${t.lost} | ${t.drew} | ${pct(winRate(t))} | ${pct(decisiveRate(t))} | ${pct(worst)} |`,
      )
    }
  }
  return lines.join("\n")
}

describe("form balance probe (FR16)", () => {
  test("report mode emits the markdown probe doc", () => {
    if (!process.env.APEX_FORM_BALANCE_REPORT) return
    console.log(
      report(runProbe(calibrationCreature), runProbe(programCreature)),
    )
  })

  test("every mix builds a capped creature and lands in its form tier", () => {
    for (const mix of MIXES) {
      const c = calibrationCreature("fire_drake", 42, mix)
      expect(c.trained).toEqual(CAP)
      expect(formTier(c), mix.id).toBe(mix.form)
    }
  })

  test("the neutral mix is grindable for every species (FR12 floor)", () => {
    const neutral = neutralMix()
    const { cells } = runProbe(calibrationCreature)
    for (const speciesId of STARTER_SPECIES.map((s) => s.id)) {
      for (const boss of BOSSES) {
        expect(
          winRate(cellFor(cells, speciesId, neutral, boss.id)),
          `${boss.name} vs ${speciesId}`,
        ).toBeGreaterThanOrEqual(FR12_GRIND_FLOOR)
      }
    }
  }, 120000)

  test("the neutral mix holds the 40-70% band (FR12)", () => {
    const neutral = neutralMix()
    const { cells } = runProbe(calibrationCreature)
    for (const boss of BOSSES) {
      const speciesId = disadvantagedSpecies(boss)
      const rate = winRate(cellFor(cells, speciesId, neutral, boss.id))
      expect(rate, `${boss.name} vs ${speciesId}`).toBeGreaterThanOrEqual(
        FR12_BAND_MIN,
      )
      expect(rate, `${boss.name} vs ${speciesId}`).toBeLessThanOrEqual(
        FR12_BAND_MAX,
      )
    }
  }, 120000)

  test("the neutral mix reproduces the recorded FR12 tallies (AC-1)", () => {
    const neutral = neutralMix()
    const { cells } = runProbe(calibrationCreature)
    for (const boss of BOSSES) {
      const recorded = FR12_DISADVANTAGED_CAP_WINS[boss.id]
      if (!recorded) throw new Error(`no recorded band rate for ${boss.id}`)
      const t = cellFor(cells, disadvantagedSpecies(boss), neutral, boss.id)
      expect(
        { won: t.won, games: games(t) },
        `${boss.name} neutral disadvantaged cap`,
      ).toEqual(recorded)
    }
  }, 120000)

  test("every gatekeeper cell keeps its recorded rate at every tier", () => {
    const { cells } = runProbe(calibrationCreature)
    for (const boss of BOSSES) {
      const speciesId = disadvantagedSpecies(boss)
      const expected = GATEKEEPER_WINS[boss.id]
      if (!expected) throw new Error(`no recorded ladder for ${boss.id}`)
      for (const tier of LADDER) {
        const t = cellFor(cells, speciesId, mixFor(tier), boss.id)
        expect(
          { won: t.won, games: games(t) },
          `${boss.name} vs ${speciesId} ${tier}`,
        ).toEqual({ won: expected[tier], games: GATEKEEPER_GAMES })
      }
    }
  }, 120000)

  test("the tier ladder never reverses on a gatekeeper cell (AC-9)", () => {
    const { cells } = runProbe(calibrationCreature)
    for (const boss of BOSSES) {
      const speciesId = disadvantagedSpecies(boss)
      const rates = LADDER.map((tier) =>
        winRate(cellFor(cells, speciesId, mixFor(tier), boss.id)),
      )
      for (let i = 1; i < rates.length; i += 1) {
        const prev = rates[i - 1] ?? 0
        const curr = rates[i] ?? 0
        expect(
          prev,
          `${boss.name} vs ${speciesId}: ${LADDER[i - 1]} >= ${LADDER[i]}`,
        ).toBeGreaterThanOrEqual(curr)
      }
    }
  }, 120000)

  test("sharp and steady keep every gatekeeper cell above the AC-9 floor", () => {
    const { cells } = runProbe(calibrationCreature)
    for (const boss of BOSSES) {
      const speciesId = disadvantagedSpecies(boss)
      for (const tier of ["sharp", "steady"] as const) {
        expect(
          winRate(cellFor(cells, speciesId, mixFor(tier), boss.id)),
          `${boss.name} vs ${speciesId} ${tier}`,
        ).toBeGreaterThanOrEqual(TIER_FLOOR)
      }
    }
  }, 120000)

  test("no gatekeeper cell sits under the 15% floor (AC-9)", () => {
    // The floor's margin is thin: Delmar x fire_drake sluggish is the worst
    // cell at 16.7% (6 of 36), and Delmar flat, Fenn sluggish and Thessa
    // sluggish sit under 25% too. Both the per-cell floor and the identity of
    // the worst cell are asserted, so a regression cannot hide behind a
    // slightly worse ladder.
    const { cells } = runProbe(calibrationCreature)
    let worst = { id: "", rate: 1 }
    for (const boss of BOSSES) {
      const speciesId = disadvantagedSpecies(boss)
      for (const tier of LADDER) {
        const rate = winRate(cellFor(cells, speciesId, mixFor(tier), boss.id))
        expect(
          rate,
          `${boss.name} vs ${speciesId} ${tier}`,
        ).toBeGreaterThanOrEqual(TIER_FLOOR)
        if (rate < worst.rate) worst = { id: `${boss.id}/${tier}`, rate }
      }
    }
    expect(worst).toEqual({
      id: "delmar/sluggish",
      rate: 6 / GATEKEEPER_GAMES,
    })
  }, 120000)

  test("care moves power in the one direction form promises", () => {
    // Aggregate over every boss, per species: a sharp creature wins more than
    // a steady one, which wins more than a flat one, which wins more than a
    // sluggish one. The tiers are a ladder, not a band — the per-cell numbers
    // are the report's job (see the phase evidence for where the ladder
    // leaves the FR12 band).
    const { cells } = runProbe(calibrationCreature)
    for (const speciesId of STARTER_SPECIES.map((s) => s.id)) {
      const points = LADDER.map((tier) => ({
        form: tier,
        rate: winRate(pooled(cells, speciesId, mixFor(tier))),
      }))
      for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1]
        const curr = points[i]
        if (!prev || !curr) throw new Error("ladder gap")
        expect(
          prev.rate,
          `${speciesId}: ${prev.form} vs ${curr.form}`,
        ).toBeGreaterThan(curr.rate)
      }
    }
  }, 120000)
})
