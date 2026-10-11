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
import {
  type BattleResult,
  type BattleSide,
  resolveBattle,
  type Tactic,
} from "./battle"
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
  /** The full battle replay (live cup): the arena replays from these
   * events (spec FR5). Null only on a forfeit verdict — the round was
   * given away without a fight. */
  readonly battle: BattleResult | null
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

/** One pre-resolved rival pairing of the player-independent subtree: the
 * verdict for display, plus the slots that advance/exit (progression). */
export interface RivalResolution {
  readonly verdict: RoundVerdict
  readonly winner: CupSlot
  readonly loser: CupSlot
}

/** A live cup session (live-cup spec FR2): the seeded bracket plus the
 * player-independent subtree resolved at entry. The player's own branch
 * (QF1, SF1, Final) resolves on demand at fight time, with the loadout
 * and tactic picked in the coaching room. Immutable: every resolution
 * returns a new session. */
export interface CupSession {
  readonly bracket: CupBracket
  /** The bracket seed — the determinism anchor (day + creature identity). */
  readonly seed: number
  /** Pre-resolved rival pairings in reveal order: QF2, QF3, QF4, SF2. */
  readonly rivalResolutions: readonly RivalResolution[]
  /** The rival verdicts (display contract, in reveal order). */
  readonly rivalVerdicts: readonly RoundVerdict[]
  /** The player's live-resolved verdicts, in round order. */
  readonly playerVerdicts: readonly RoundVerdict[]
  /** Rival matches resolved after the player's exit (auto-complete). */
  readonly completionVerdicts: readonly RoundVerdict[]
  /** The round the player fights next (1-3); 0 once eliminated or crowned. */
  readonly nextPlayerRound: number
  /** The player's next opponent, or null when the player is done. */
  readonly nextOpponent: CupSlot | null
  readonly status: "player-turn" | "eliminated" | "champion"
  /** The champion once the cup completes; null while the player is live. */
  readonly championName: string | null
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
  const rivalResolutions: readonly RivalResolution[] = [qf2, qf3, qf4, sf2]
  return {
    bracket,
    seed,
    rivalResolutions,
    rivalVerdicts: rivalResolutions.map((r) => r.verdict),
    playerVerdicts: [],
    completionVerdicts: [],
    nextPlayerRound: 1,
    nextOpponent: slotAt(1),
    status: "player-turn",
    championName: null,
  }
}

/**
 * Resolve the player's current match live with the coaching room's picks
 * (live-cup spec FR3/FR5). The battle seed follows the legacy per-pairing
 * formula `(day*97 + round*13 + i*7)` with the player's pairing always
 * first in its round (i = 0), so default picks reproduce the legacy
 * one-sitting battles exactly. Pure: returns a fresh advanced session;
 * throws when the session is not waiting on the player.
 */
export function resolvePlayerMatch(
  session: CupSession,
  loadout: readonly string[],
  tactic: Tactic,
): { session: CupSession; verdict: RoundVerdict } {
  if (session.status !== "player-turn") {
    throw new Error("The cup is not waiting on the player")
  }
  const round = session.nextPlayerRound
  const opponent = session.nextOpponent
  const playerSlot = session.bracket.slots[0]
  if (!opponent || !playerSlot) {
    throw new Error("The session has no pending player pairing")
  }
  const seed = (session.bracket.day * 97 + round * 13) >>> 0
  const result: BattleResult = resolveBattle(
    slotPlayerSide(playerSlot, loadout, tactic),
    sideFor(opponent, seed),
    seed,
  )
  const line = result.winner
    ? `${result.winner} takes the ${roundLabel(round)}!`
    : `Both fighters are down — the ${roundLabel(round)} is a draw.`
  const verdict: RoundVerdict = {
    round,
    slotA: playerSlot.name,
    slotB: opponent.name,
    winner: result.winner,
    line,
    battle: result,
  }
  // On a draw the legacy fallback favors the player slot (slot a here).
  const playerWon = result.winner === null || result.winner === playerSlot.name
  if (playerWon && round === CUP_ROUNDS) {
    return {
      session: {
        ...session,
        playerVerdicts: [...session.playerVerdicts, verdict],
        nextPlayerRound: 0,
        nextOpponent: null,
        status: "champion",
        championName: playerSlot.name,
      },
      verdict,
    }
  }
  if (!playerWon) {
    return {
      session: {
        ...session,
        playerVerdicts: [...session.playerVerdicts, verdict],
        nextPlayerRound: 0,
        nextOpponent: null,
        status: "eliminated",
      },
      verdict,
    }
  }
  // Advanced to the next round: the player now meets the winner of the
  // opposing pairing (QF2's winner in the semifinal, SF2's in the final).
  const nextOpponent =
    round === 1
      ? session.rivalResolutions[0]?.winner
      : session.rivalResolutions[3]?.winner
  if (!nextOpponent) throw new Error("Missing rival winner for the next round")
  return {
    session: {
      ...session,
      playerVerdicts: [...session.playerVerdicts, verdict],
      nextPlayerRound: round + 1,
      nextOpponent,
    },
    verdict,
  }
}

/** Resolve the remaining rival pairings from `conqueror` to a champion
 * (live-cup spec: the bracket always plays out). Uses the same per-pairing
 * seeds as the one-sitting resolver, so completed brackets are identical
 * with the legacy flow. Pure. */
function completeBracket(session: CupSession, conqueror: CupSlot): CupSession {
  const wins = session.playerVerdicts.filter(
    (v) => v.winner === session.bracket.slots[0]?.name,
  ).length
  const day = session.bracket.day
  const seedFor = (round: number, i: number): number =>
    (day * 97 + round * 13 + i * 7) >>> 0
  const completion: RoundVerdict[] = []
  // A player who lost the final (2 wins) left the SF2 winner as champion.
  if (wins >= CUP_ROUNDS - 1) {
    const champion =
      session.rivalResolutions[session.rivalResolutions.length - 1]?.winner
    return {
      ...session,
      completionVerdicts: completion,
      championName: champion?.name ?? null,
    }
  }
  let a: CupSlot = conqueror
  // The player lost the quarterfinal: their conqueror meets the QF2
  // winner in SF1 (pairing index 0 of round 2, matching the legacy field
  // order where the player's branch feeds the top half).
  if (wins === 0) {
    const rival = session.rivalResolutions[0]?.winner
    if (!rival) throw new Error("Missing QF2 winner")
    const sf1 = resolvePairing(2, a, rival, null, seedFor(2, 0))
    completion.push(sf1.verdict)
    a = sf1.winner
  }
  const sf2Winner =
    session.rivalResolutions[session.rivalResolutions.length - 1]?.winner
  if (!sf2Winner) throw new Error("Missing SF2 winner")
  const final = resolvePairing(3, a, sf2Winner, null, seedFor(3, 0))
  completion.push(final.verdict)
  return {
    ...session,
    completionVerdicts: completion,
    championName: final.winner.name,
  }
}

/**
 * Resolve the remaining rival matches after the player's exit so the cup
 * crowns a champion (live-cup spec). Throws on a live session — the player
 * still has fights to play.
 */
export function completeCup(session: CupSession): CupSession {
  if (session.status !== "eliminated") {
    throw new Error("The player is still live in this cup")
  }
  const last = session.playerVerdicts[session.playerVerdicts.length - 1]
  if (!last) throw new Error("The player left without a verdict")
  const conqueror = session.bracket.slots.find((s) => s.name === last.slotB)
  if (!conqueror) throw new Error("Unknown conqueror slot")
  return completeBracket(session, conqueror)
}

/**
 * Forfeit the current round (the give-up modal, live-cup spec): the
 * opponent advances without a battle, the bracket auto-completes, and the
 * placement lands as-if-lost. Pure; throws when the player has no fight
 * pending.
 */
export function forfeitCup(session: CupSession): CupSession {
  if (session.status !== "player-turn") {
    throw new Error("The cup is not waiting on the player")
  }
  const round = session.nextPlayerRound
  const opponent = session.nextOpponent
  const playerSlot = session.bracket.slots[0]
  if (!opponent || !playerSlot) {
    throw new Error("The session has no pending player pairing")
  }
  const verdict: RoundVerdict = {
    round,
    slotA: playerSlot.name,
    slotB: opponent.name,
    winner: opponent.name,
    line: `${opponent.name} advances — ${playerSlot.name} forfeits the ${roundLabel(round)}.`,
    battle: null,
  }
  return completeBracket(
    {
      ...session,
      playerVerdicts: [...session.playerVerdicts, verdict],
      nextPlayerRound: 0,
      nextOpponent: null,
      status: "eliminated",
    },
    opponent,
  )
}

/** The player's placement from a finished session: champion 1, else by
 * rounds survived (QF exit 4, SF exit 3, final loss 2). Placement counts
 * rounds played rather than wins so a drawn verdict (double-KO, winner
 * null) that still advanced the player cannot under-place them. */
export function cupPlacement(session: CupSession): 1 | 2 | 3 | 4 {
  if (session.status === "champion") return 1
  const played = session.playerVerdicts.length
  return played >= CUP_ROUNDS ? 2 : played === 2 ? 3 : 4
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

/** The player's own BattleSide: effective stats + the chosen loadout and
 * tactic. The live cup passes the coaching room's picks; the legacy
 * one-sitting path omits them (equipped loadout, balanced tactic). */
function playerSide(
  owned: Readonly<Creature>,
  loadout?: readonly string[],
  tactic?: Tactic,
): BattleSide {
  const species = getSpecies(owned.speciesId)
  if (!species) throw new Error(`Unknown species: ${owned.speciesId}`)
  return {
    name: owned.name,
    element: owned.element,
    stats: effectiveStats(owned),
    kit: loadout ?? owned.loadout ?? defaultLoadout(owned, species),
    tactic: tactic ?? "balanced",
    temperament: species.temperament,
  }
}

/** The player's BattleSide from their frozen bracket slot (live cup): the
 * snapshot stats taken at entry, plus the coaching room's loadout/tactic. */
function slotPlayerSide(
  slot: CupSlot,
  loadout: readonly string[],
  tactic: Tactic,
): BattleSide {
  const species = getSpecies(slot.speciesId)
  if (!species) throw new Error(`Unknown species: ${slot.speciesId}`)
  return {
    name: slot.name,
    element: species.element,
    stats: slot.stats,
    kit: loadout,
    tactic,
    temperament: species.temperament,
  }
}

/** Deterministic double-KO tiebreak: the slot with the higher remaining HP
 * advances; an exact tie (or a missing finalHp entry, treated as 0) falls to
 * the earlier slot in field order. Pure — the verdict line still reports the
 * draw; only bracket advancement is decided here. */
export function doubleKoWinner(
  a: CupSlot,
  b: CupSlot,
  finalHp: Readonly<Record<string, number>>,
): CupSlot {
  const hpA = finalHp[a.name] ?? 0
  const hpB = finalHp[b.name] ?? 0
  return hpB > hpA ? b : a
}

/** Resolve one pairing into a verdict (pure). */
function resolvePairing(
  round: number,
  a: CupSlot,
  b: CupSlot,
  player: Readonly<Creature> | null,
  seed: number,
): { verdict: RoundVerdict; winner: CupSlot; loser: CupSlot } {
  let aSide: BattleSide
  let bSide: BattleSide
  if (a.isPlayer) {
    if (!player) throw new Error("Player side needs the player creature")
    aSide = playerSide(player)
    bSide = sideFor(b, seed)
  } else if (b.isPlayer) {
    if (!player) throw new Error("Player side needs the player creature")
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
  // On a draw (double-ko) the verdict still reads "draw", but the bracket
  // must keep shrinking: the slot with the higher remaining HP advances
  // (exact tie → the earlier slot). See doubleKoWinner.
  const advancing = result.winner
    ? winnerSlot
    : doubleKoWinner(a, b, result.finalHp)
  return {
    verdict: {
      round,
      slotA: a.name,
      slotB: b.name,
      winner: result.winner,
      line,
      battle: result,
    },
    winner: advancing,
    loser: advancing === a ? b : a,
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
