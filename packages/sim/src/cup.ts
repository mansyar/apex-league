/**
 * The cup: a seeded 8-slot single-elimination bracket on cup days.
 *
 * Everything here is pure and DOM-free: the bracket is a function of the
 * player's rolled creature and the cup day, so the same save at the same
 * day always draws the same tournament. Rivals come from the same creature
 * data as the spar's exhibition helper; their stats ride a gentle ramp
 * (quarterfinal −5%, semifinal even, final +5% vs the player's effective
 * stats) clamped inside the species' legal roll bounds, so the final feels
 * earned rather than a lottery cliff. The resolver stays untouched; the
 * cup only assembles `BattleSide`s and calls into it.
 */

import { type Creature, effectiveStats } from "./creature"
import { makeRng, type Rng } from "./rng"
import { getSpecies, type SpeciesDef } from "./species"

/** A bracket slot: either the player or a named rival. */
export interface CupSlot {
  readonly isPlayer: boolean
  readonly name: string
  readonly speciesId: string
  readonly stats: Readonly<Creature["stats"]>
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
  const shuffledNames: readonly string[] = pickNames(
    rng,
    RIVAL_NAME_POOL.length - 1,
  )
  const rivals: CupSlot[] = []
  for (let i = 0; i < BRACKET_SLOTS - 1; i++) {
    const idx = rng.int(available.length)
    const speciesDef = available[idx]
    if (!speciesDef) throw new Error("No available starter species")
    // Consume one rng draw per slot regardless — the stream is part of the
    // deterministic bracket identity, so never prune draws.
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
  }
}

/** One resolved cup: bracket + round verdicts + a champion. */
export interface CupBracket {
  readonly day: number
  readonly slots: readonly CupSlot[]
  /** The last rival (slot 8) — the presumed final-round opponent. */
  readonly finalRival: CupSlot
  readonly rounds: number
  readonly roundLabels: readonly string[]
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

// Re-exported for test imports (STARTERS is from ./species in reality).
import { type BattleResult, type BattleSide, resolveBattle } from "./battle"
import { defaultLoadout } from "./loadout"
import { STARTER_SPECIES as STARTERS } from "./species"

// ----------------------------------------------------------------------------
// Round resolution (spec FR3): three rounds resolved in one sitting.
// Pairing: slot order pairs (0,1), (2,3), (4,5), (6,7) in the quarterfinal,
// then standard single-elim reductions. The player's side is assembled from
// the owned creature (effective stats + chosen loadout); rivals carry their
// ramped stats, their species kit, and a balanced tactic.
// ----------------------------------------------------------------------------

/** The verdict of one pairing inside a cup round. */
export interface RoundVerdict {
  readonly round: number
  readonly slotA: string
  readonly slotB: string
  /** The winner's name, or null on a double-KO. */
  readonly winner: string | null
  /** One announcer line (product voice). */
  readonly line: string
  /** The full resolver output — the arena replays the battle from
   * `battle.events` (live-cup spec FR5). */
  readonly battle: BattleResult
}

export interface CupRoundResult {
  readonly round: number
  /** The fighters who advanced. */
  readonly winners: readonly CupSlot[]
  readonly verdicts: readonly RoundVerdict[]
}

export interface CupResult {
  /** Champion (winner name), or null on a pathological final double-KO. */
  readonly championName: string | null
  /** Player's placement: 1 / 2 / 3-4 (rendered as 3). */
  readonly playerPlacement: 1 | 2 | 3 | 4
  readonly rounds: readonly CupRoundResult[]
  readonly roundsPlayed: number
}

/** A live cup session (live-cup spec FR2): the seeded bracket plus the
 * player-independent subtree resolved at entry. The player's own branch
 * (QF1, SF1, Final) resolves on demand at fight time, with the loadout
 * and tactic picked in the coaching room. */
export interface CupSession {
  readonly bracket: CupBracket
  /** The bracket seed — the determinism anchor (day + creature identity). */
  readonly seed: number
  /** Pre-resolved rival verdicts in reveal order: QF2, QF3, QF4, SF2. */
  readonly rivalVerdicts: readonly RoundVerdict[]
}

/** Start a live cup session: build the seeded bracket and pre-resolve the
 * player-independent subtree — QF2/QF3/QF4, then SF2 from their winners —
 * with the same per-pairing seed formula the one-sitting resolver uses, so
 * rival battles stay byte-identical with the legacy flow. Pure. */
export function startCupSession(
  owned: Readonly<Creature>,
  day: number,
  seed: number,
): CupSession {
  const bracket = makeBracket(owned, day, seed)
  const slotAt = (i: number): CupSlot => {
    const slot = bracket.slots[i]
    if (!slot) throw new Error("Bracket slot missing")
    return slot
  }
  // Same formula as runRound: (day*97 + round*13 + i*7) with i the pairing
  // index inside its round.
  const rivalSeed = (round: number, i: number): number =>
    (day * 97 + round * 13 + i * 7) >>> 0
  const qf2 = resolvePairing(1, slotAt(2), slotAt(3), owned, rivalSeed(1, 1))
  const qf3 = resolvePairing(1, slotAt(4), slotAt(5), owned, rivalSeed(1, 2))
  const qf4 = resolvePairing(1, slotAt(6), slotAt(7), owned, rivalSeed(1, 3))
  // The round-2 field is the round-1 winners in slot order, so SF2 pairs
  // the QF3 and QF4 winners (SF1 would pair the QF1/QF2 winners).
  const sf2 = resolvePairing(2, qf3.winner, qf4.winner, owned, rivalSeed(2, 1))
  return {
    bracket,
    seed,
    rivalVerdicts: [qf2.verdict, qf3.verdict, qf4.verdict, sf2.verdict],
  }
}

/** A pairing of two slots for one battle. */
interface Pairing {
  readonly a: CupSlot
  readonly b: CupSlot
}

/** Standard single-elim pairings of an ordered field: (0,1), (2,3), ... */
function pairings(field: readonly CupSlot[]): readonly Pairing[] {
  if (field.length % 2 !== 0)
    throw new Error("The field is odd and cannot pair")
  const out: Pairing[] = []
  for (let i = 0; i < field.length; i += 2) {
    const a = field[i]
    const b = field[i + 1]
    if (!a || !b) throw new Error("The field is broken and cannot pair")
    out.push({ a, b })
  }
  return out
}

/** Assemble a BattleSide from a bracket slot. */
function sideFor(slot: CupSlot, seed: number): BattleSide {
  const species = getSpecies(slot.speciesId)
  if (!species) throw new Error(`Unknown species: ${slot.speciesId}`)
  const rng = makeRng(seed ^ (slot.name.length * 31 + slot.speciesId.length))
  const TACTICS = ["balanced", "specials"] as const
  const tactic = TACTICS[rng.int(TACTICS.length)] ?? "balanced"
  return {
    name: slot.name,
    element: species.element,
    stats: slot.stats,
    kit: species.kit,
    tactic,
    temperament: species.temperament,
  }
}

/** The player's own BattleSide: effective stats + the chosen loadout. */
function playerSide(owned: Readonly<Creature>): BattleSide {
  const species = getSpecies(owned.speciesId)
  if (!species) throw new Error(`Unknown species: ${owned.speciesId}`)
  return {
    name: owned.name,
    element: owned.element,
    stats: effectiveStats(owned),
    kit: owned.loadout ?? defaultLoadout(owned, species),
    tactic: "balanced",
    temperament: species.temperament,
  }
}

/** Resolve one pairing into a verdict (pure). */
function resolvePairing(
  round: number,
  a: CupSlot,
  b: CupSlot,
  player: Readonly<Creature>,
  seed: number,
): { verdict: RoundVerdict; winner: CupSlot } {
  let aSide: BattleSide
  let bSide: BattleSide
  if (a.isPlayer) {
    aSide = playerSide(player)
    bSide = sideFor(b, seed)
  } else if (b.isPlayer) {
    aSide = sideFor(a, seed)
    bSide = playerSide(player)
  } else {
    aSide = sideFor(a, seed)
    bSide = sideFor(b, seed ^ 1)
  }
  const result: BattleResult = resolveBattle(aSide, bSide, seed)
  const line = result.winner
    ? `${result.winner} takes the ${roundLabel(round)}!`
    : `Both fighters are down — the ${roundLabel(round)} is a draw.`
  const winnerSlot = result.winner === a.name ? a : b
  const fallback = a.isPlayer ? a : b
  return {
    verdict: {
      round,
      slotA: a.name,
      slotB: b.name,
      winner: result.winner,
      line,
      battle: result,
    },
    // On a draw (double-ko) neither advanced cleanly; pick the slot with the
    // higher remaining HP via resolver's finalHp to keep the field shrinking.
    // The resolver already guarantees exactly one winner unless double_ko.
    winner: result.winner ? winnerSlot : fallback,
  }
}

function roundLabel(round: number): string {
  return ["Quarterfinal", "Semifinal", "Final"][round - 1] ?? `Round ${round}`
}

/** One complete round: pair the field, resolve each pairing, halve it.
 * `alive` defaults to the full bracket on round 1; pass the previous
 * round's winners for rounds 2-3 (the test contract that drove this API). */
export function runRound(
  bracket: CupBracket,
  round: number,
  player: Readonly<Creature>,
  alive?: readonly CupSlot[],
): CupRoundResult {
  if (round < 1 || round > CUP_ROUNDS)
    throw new Error(`No round ${round} in this cup`)
  if (bracket.slots.length !== BRACKET_SLOTS) {
    throw new Error("The cup needs a full 8-slot bracket")
  }
  const field = alive ?? bracket.slots
  const pairs = pairings(field)
  const verdicts: RoundVerdict[] = []
  const winners: CupSlot[] = []
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i]
    if (!p) throw new Error("Pairing broken")
    const seed = (bracket.day * 97 + round * 13 + i * 7) >>> 0
    const { verdict, winner } = resolvePairing(round, p.a, p.b, player, seed)
    verdicts.push(verdict)
    winners.push(winner)
  }
  return { round, winners, verdicts }
}

/**
 * Resolve an entire cup in one sitting: three rounds of single elimination
 * starting from the full bracket, then a champion and the player's placement.
 * The player's field runs alongside; on a player loss the bracket still
 * completes so standings make sense.
 */
export function resolveCup(
  bracket: CupBracket,
  player: Readonly<Creature>,
): CupResult {
  const allRounds: CupRoundResult[] = []
  let alive: readonly CupSlot[] = bracket.slots
  let placement: 1 | 2 | 3 | 4 = 4
  for (let round = 1; round <= CUP_ROUNDS; round++) {
    const r = runRound(bracket, round, player, round === 1 ? undefined : alive)
    allRounds.push(r)
    alive = r.winners
    const playerIn = r.winners.some((w) => w.isPlayer)
    if (!playerIn) {
      // The player fell this round: the rest of the bracket still runs.
      // QF exit → 4, SF exit → 3, final exit → 2 (spec FR3 placement).
      placement = (CUP_ROUNDS - round + 2) as 1 | 2 | 3 | 4
      // Continue resolving the remainder without the player to a champion.
      let restAlive = alive
      let nextRound = round + 1
      while (restAlive.length > 1) {
        const rest = runRound(bracket, nextRound, player, restAlive)
        allRounds.push(rest)
        restAlive = rest.winners
        nextRound++
      }
      // The champion is the continuation loop's last survivor — NOT the
      // loss round's winners (a QF exit would otherwise announce a
      // semifinalist as champion).
      const champion = restAlive[0]
      return {
        championName: champion?.name ?? null,
        playerPlacement: placement,
        rounds: allRounds,
        roundsPlayed: allRounds.length,
      }
    }
  }
  const champion = alive[0]
  if (champion?.isPlayer) {
    return {
      championName: champion.name,
      playerPlacement: 1,
      rounds: allRounds,
      roundsPlayed: allRounds.length,
    }
  }
  // Player was in every round but lost inside the final — placement 2.
  return {
    championName: champion?.name ?? null,
    playerPlacement: 2,
    rounds: allRounds,
    roundsPlayed: allRounds.length,
  }
}
