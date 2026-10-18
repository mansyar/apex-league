/**
 * Cup bracket construction (part of the cup, live-cup spec): a seeded
 * 8-slot single-elimination field on cup days.
 *
 * Everything here is pure and DOM-free: the bracket is a function of the
 * player's rolled creature and the cup day, so the same save at the same
 * day always draws the same tournament. Rivals come from the same creature
 * data as the spar's exhibition helper; their stats ride a gentle ramp
 * (quarterfinal −5%, semifinal even, final +5% vs the player's effective
 * stats) clamped inside the species' legal roll bounds, so the final feels
 * earned rather than a lottery cliff.
 *
 * Split out of the former monolithic cup.ts (cup_module_refactor_20261018)
 * — pure relocation, no behavior change. Session resolution lives in
 * ./session, pairing resolution in ./verdicts.
 */

import type { BossDef } from "../bosses"
import { type Creature, effectiveStats } from "../creature"
import type { CupKind } from "../ladder"
import { makeRng, type Rng } from "../rng"
import {
  getSpecies,
  type SpeciesDef,
  STARTER_SPECIES as STARTERS,
} from "../species"

/** A bracket slot: either the player or a named rival. */
export interface CupSlot {
  readonly isPlayer: boolean
  readonly name: string
  readonly speciesId: string
  readonly stats: Readonly<Creature["stats"]>
  /** Set when the slot is an authored boss (final-rival substitution,
   * silver_ladder_bosses_20261016). The boss' pinned kit and tactic ride
   * the registry, keyed by this id — not on the slot — so a persisted
   * session stays small and the registry stays the single source of truth. */
  readonly bossId?: string
}

/** Hand-written coach-style rival names (the bracket's narrative spine). */
export const RIVAL_NAME_POOL: readonly string[] = Object.freeze([
  "Bramble Knoll Ox",
  "Cindersnout",
  "Tidecaller Nibbles",
  "Emberhold Flicker",
  "Mossbottom Brute",
  "Driftbelle",
  "Ash-ledger",
  "Pondskipper Grub",
  "Gilded Horn",
  "Thistledown Ash",
  "Reedle Mirefin",
  "Bonfire Brook",
])

/** 8 slots, 3 rounds; there is always a champion, never a bye. */
export const BRACKET_SLOTS = 8
export const CUP_ROUNDS = 3

/** The seeded ramp vs the player's effective stats: QF −5%, SF 0, F +5%. */
export const RIVAL_RAMP: readonly number[] = Object.freeze([
  -0.05, -0.05, -0.05, -0.05, 0, 0, +0.05,
])

/** One resolved cup: bracket + round verdicts + a champion. */
export interface CupBracket {
  readonly day: number
  readonly slots: readonly CupSlot[]
  /** The last rival (slot 8) — the presumed final-round opponent. */
  readonly finalRival: CupSlot
  readonly rounds: number
  readonly roundLabels: readonly string[]
  /** Championship (regular) or promotion — the Bronze→Silver gate cup
   * (silver_ladder_bosses_20261016, FR3). */
  readonly kind: CupKind
  /** Banner label when the final is an authored boss ("Promotion Cup", or
   * the boss-framed regular final). Absent for a fully generated field. */
  readonly banner?: string
  /** The substituted boss' arena intro copy, verbatim from the registry. */
  readonly bossIntro?: string
}

/** Compute one cup bracket from the player's creature and the cup day. Pure.
 * `seed` defaults to a day-only stream; the machine passes a seed folded
 * with the save's creature identity so two saves on the same day draw
 * different fields (spec FR2: bracket from day + save seed). */
export function makeBracket(
  owned: Readonly<Creature>,
  day: number,
  seed?: number,
): CupBracket {
  const species = getSpecies(owned.speciesId)
  if (!species) throw new Error(`Unknown species: ${owned.speciesId}`)
  const rng = makeRng(seed ?? (day * 7 + 1) >>> 0)
  const eff = effectiveStats(owned)

  // 7 rivals: each rolled from an available species, named from the pool,
  // ramped by slot position (final rival most likely the toughest).
  const available = STARTERS.filter((s) => s.available)
  // STREAM-NEUTRAL: pickNames shuffles the whole pool (fixed draw count),
  // so the requested slice size never changes the rng stream — the slice
  // is exactly the rivals we need.
  const shuffledNames: readonly string[] = pickNames(rng, BRACKET_SLOTS - 1)
  const rivals: CupSlot[] = []
  for (let i = 0; i < BRACKET_SLOTS - 1; i++) {
    const idx = rng.int(available.length)
    const speciesDef = available[idx]
    if (!speciesDef) throw new Error("No available starter species")
    // RNG STREAM INVARIANT (do not prune): the bracket's identity is the
    // full draw sequence, not just the seed — species picks, names, and
    // stat jitters all read positions in one stream. This discarded draw
    // is load-bearing spacing: removing it shifts every later draw and
    // changes which opponents a given (day, save) meets, silently
    // rewriting cup history for existing saves. The golden test in
    // cup.test.ts ("draw stream is stable") enforces this.
    const creatureSeed = Math.floor(rng.next() * 0x7fffffff)
    void creatureSeed
    const name = shuffledNames[i]
    if (!name) throw new Error("Not enough rival names in the pool")
    const ramp = RIVAL_RAMP[i] ?? 0
    const stats = rampStats(rng, speciesDef, eff, ramp)
    rivals.push({
      isPlayer: false,
      name,
      speciesId: speciesDef.id,
      stats,
    })
  }
  const playerSlot: CupSlot = {
    isPlayer: true,
    name: owned.name,
    speciesId: owned.speciesId,
    stats: eff,
  }
  const slots: CupSlot[] = [playerSlot, ...rivals]
  const finalRival = rivals[rivals.length - 1]
  if (!finalRival) throw new Error("The bracket needs seven rivals")
  return {
    day,
    slots,
    finalRival,
    rounds: CUP_ROUNDS,
    roundLabels: ["Quarterfinal", "Semifinal", "Final"],
    kind: "championship",
  }
}

/**
 * Substitute the bracket's final rival slot with an authored boss AFTER the
 * draw sequence completes (silver_ladder_bosses_20261016, FR3): no draws
 * added or pruned, so regular brackets for existing saves stay
 * byte-identical — the golden stream test enforces it. The bracket is
 * flagged with the cup kind and carries the boss' presentation metadata
 * (banner, arena intro) so the client never re-derives it. Pure.
 */
export function substituteFinalBoss(
  bracket: CupBracket,
  boss: BossDef,
  kind: CupKind = "championship",
): CupBracket {
  const previous = bracket.slots[bracket.slots.length - 1]
  if (!previous) throw new Error("The bracket needs seven rivals")
  const bossSlot: CupSlot = {
    isPlayer: false,
    name: boss.name,
    speciesId: boss.speciesId,
    stats: boss.stats,
    bossId: boss.id,
  }
  return {
    ...bracket,
    kind,
    slots: [...bracket.slots.slice(0, -1), bossSlot],
    finalRival: bossSlot,
    banner:
      kind === "promotion" ? "Promotion Cup" : `Boss Final · ${boss.name}`,
    bossIntro: boss.intro,
  }
}

/** A rival-facing stats roll: ramped vs the player, clamped to bounds. */
function rampStats(
  rng: Rng,
  species: SpeciesDef,
  eff: Readonly<Creature["stats"]>,
  ramp: number,
): Readonly<Creature["stats"]> {
  const bounds = {
    hp: species.statBounds.hp,
    atk: species.statBounds.atk,
    def: species.statBounds.def,
    spd: species.statBounds.spd,
  } as const
  const out = { hp: 0, atk: 0, def: 0, spd: 0 }
  for (const stat of ["hp", "atk", "def", "spd"] as const) {
    const target = eff[stat] * (1 + ramp)
    const [lo, hi] = bounds[stat]
    // Clamp the ramped target into legal bounds, then roll ±1-2 of the
    // target (seeded) so an identical ramp doesn't sit on the same stat.
    const clamped = Number.isNaN(target)
      ? (lo + hi) / 2
      : Math.min(hi, Math.max(lo, target))
    const jitter = Math.floor(rng.next() * 3) - 1 // [-1, 1]
    out[stat] = Math.round(Math.min(hi, Math.max(lo, clamped + jitter)))
  }
  return Object.freeze(out)
}

/** Draw `count` unique names from the RIVAL_NAME_POOL (first shuffle slice). */
function pickNames(rng: Rng, count: number): readonly string[] {
  const indices: number[] = []
  for (let i = 0; i < RIVAL_NAME_POOL.length; i++) indices.push(i)
  // Fisher-Yates with the seeded rng draws a deterministic shuffle.
  for (let i = indices.length - 1; i > 0; i--) {
    const j = rng.int(i + 1)
    const tmp = indices[i]
    const other = indices[j]
    if (tmp === undefined || other === undefined) throw new Error("index error")
    indices[i] = other
    indices[j] = tmp
  }
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const idx = indices[i]
    const n = idx === undefined ? undefined : RIVAL_NAME_POOL[idx]
    if (n === undefined) throw new Error("Not enough names in the rival pool")
    names.push(n)
  }
  return Object.freeze(names)
}
