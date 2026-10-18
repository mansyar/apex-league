import { type Creature, type StatKey, TRAINING_CAP } from "../creature"
import { BRACKET_SLOTS, CUP_ROUNDS, type CupSession } from "../cup"
import { SICK_COOLDOWN_NIGHTS } from "../evolution"
import type { RetiredRecord } from "../legacy"
import { getSpecies } from "../species"
import type { GameState } from "../state"
import { isLineageTrait } from "../traits"
import { migrate } from "./migrate"
import { SAVE_VERSION, type SaveData, serializeSave } from "./schema"

export const SAVE_KEY = "apex.save"

/**
 * Minimal storage surface (the subset of Storage the game needs).
 * Keeps this module DOM-free: the client wires real localStorage in,
 * tests pass a mock.
 */
export interface SaveAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** In-memory adapter for tests and headless use. */
export function createMemoryAdapter(): SaveAdapter {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

/**
 * Persist the current state (and optionally the live cup session) as a
 * versioned save. Returns false when the write fails (quota, private mode)
 * — the caller decides how to surface it; saving must never crash the day.
 */
export function saveGame(
  adapter: SaveAdapter,
  state: GameState,
  savedAt: number,
  session: CupSession | null = null,
): boolean {
  const data: SaveData = { version: SAVE_VERSION, state, savedAt, session }
  try {
    adapter.setItem(SAVE_KEY, serializeSave(data))
    return true
  } catch {
    return false
  }
}

const ELEMENTS = ["fire", "water", "plant", "electric", "earth", "wind"]
const STAGES = ["baby", "juvenile", "champion"]
const STAT_KEYS = ["hp", "atk", "def", "spd"]
const TRAINING_RESULTS = ["gained", "sick", "hungry"]

/** Save v15: a lineage trait list is canonical, unique, and at most four. */
function isValidTraitList(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 4) return false
  const seen = new Set<string>()
  for (const id of value) {
    if (!isLineageTrait(id) || seen.has(id)) return false
    seen.add(id)
  }
  return true
}

/**
 * Save v15: parentage is at most two generation numbers (one for the founder
 * successor path, two for a bred pair), never negative or duplicated.
 */
function isValidParentList(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 2) return false
  const seen = new Set<number>()
  for (const generation of value) {
    if (
      typeof generation !== "number" ||
      !Number.isInteger(generation) ||
      generation < 0 ||
      seen.has(generation)
    ) {
      return false
    }
    seen.add(generation)
  }
  return true
}

/** A creature is valid when every field is the right type and in range. */
function isValidCreature(c: unknown): c is Creature {
  if (typeof c !== "object" || c === null) return false
  const creature = c as Record<string, unknown>
  if (typeof creature.speciesId !== "string" || creature.speciesId.length === 0)
    return false
  // The species must exist in the catalog — a hand-edited save referencing
  // an unknown species would crash the client on first render otherwise.
  if (getSpecies(creature.speciesId) === undefined) return false
  if (typeof creature.bondedToday !== "boolean") return false
  if (!ELEMENTS.includes(creature.element as string)) return false
  if (!STAGES.includes(creature.stage as string)) return false
  const stats = creature.stats
  if (typeof stats !== "object" || stats === null) return false
  for (const value of Object.values(stats as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
      return false
  }
  const conditions = creature.conditions
  if (typeof conditions !== "object" || conditions === null) return false
  for (const value of Object.values(conditions as Record<string, unknown>)) {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 100
    )
      return false
  }
  // v3: training fields must be present and well-formed. Trained bonuses
  // stay within [0, TRAINING_CAP]; focus and result are the sim's own
  // unions (or the absent null after a focusless night).
  const trained = creature.trained
  if (typeof trained !== "object" || trained === null) return false
  const t = trained as Record<string, unknown>
  for (const key of STAT_KEYS) {
    const value = t[key]
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > TRAINING_CAP
    )
      return false
  }
  const focus = creature.trainingFocus
  if (focus !== null && !STAT_KEYS.includes(focus as StatKey)) return false
  const result = creature.trainingResult
  if (result !== null && !TRAINING_RESULTS.includes(result as string))
    return false
  // v4: the daily food flag is a strict boolean and always present.
  if (typeof creature.fedToday !== "boolean") return false
  // v6: the sickness cooldown is a small non-negative integer — the sim
  // only ever writes 0..SICK_COOLDOWN_NIGHTS.
  const cooldown = creature.sickCooldown
  if (
    typeof cooldown !== "number" ||
    !Number.isInteger(cooldown) ||
    cooldown < 0 ||
    cooldown > SICK_COOLDOWN_NIGHTS
  ) {
    return false
  }
  // v15: lineage fields are always present after migration.
  if (!isValidTraitList(creature.traits)) return false
  if (!isValidParentList(creature.parents)) return false
  return true
}

/**
 * A Hall of Fame record (save v10) is valid when every field the client
 * displays is well-typed: a known species, an element, integer stats/trained
 * in range, and non-negative counters.
 */
function isValidRetiredRecord(r: unknown): r is RetiredRecord {
  if (typeof r !== "object" || r === null) return false
  const rec = r as Record<string, unknown>
  if (typeof rec.name !== "string" || rec.name.length === 0) return false
  if (
    typeof rec.speciesId !== "string" ||
    getSpecies(rec.speciesId) === undefined
  )
    return false
  if (typeof rec.archetypeId !== "string") return false
  if (!ELEMENTS.includes(rec.element as string)) return false
  const stats = rec.stats
  if (typeof stats !== "object" || stats === null) return false
  for (const value of Object.values(stats as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
      return false
  }
  const trained = rec.trained
  if (typeof trained !== "object" || trained === null) return false
  for (const value of Object.values(trained as Record<string, unknown>)) {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > TRAINING_CAP
    )
      return false
  }
  if (!Number.isInteger(rec.cupsWon) || (rec.cupsWon as number) < 0)
    return false
  if (!Number.isInteger(rec.generation) || (rec.generation as number) < 0)
    return false
  if (!Number.isInteger(rec.retiredOnDay) || (rec.retiredOnDay as number) < 1)
    return false
  // v15: every archived career carries its derived traits and parentage.
  if (!isValidTraitList(rec.traits)) return false
  if (!isValidParentList(rec.parents)) return false
  return true
}

/**
 * A persisted cup session is valid when its shape matches the sim contract
 * closely enough to hand back to the client: the bracket, the verdict
 * arrays, the pending round, and the champion stamp. This is defense against
 * a corrupt/hand-edited payload — the client renders names and species from
 * a restored session, so the deep fields it reads are checked here.
 */
function isValidSession(s: unknown): s is CupSession {
  if (typeof s !== "object" || s === null) return false
  const session = s as Record<string, unknown>
  if (typeof session.seed !== "number" || !Number.isInteger(session.seed))
    return false
  const bracket = session.bracket
  if (typeof bracket !== "object" || bracket === null) return false
  const b = bracket as Record<string, unknown>
  if (!Number.isInteger(b.day) || (b.day as number) < 1) return false
  if (!Array.isArray(b.slots) || b.slots.length !== BRACKET_SLOTS) return false
  for (const slot of b.slots) {
    if (typeof slot !== "object" || slot === null) return false
    const c = slot as Record<string, unknown>
    if (typeof c.name !== "string" || c.name.length === 0) return false
    if (
      typeof c.speciesId !== "string" ||
      getSpecies(c.speciesId) === undefined
    )
      return false
    if (typeof c.stats !== "object" || c.stats === null) return false
    for (const value of Object.values(c.stats as Record<string, unknown>)) {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
        return false
    }
  }
  for (const key of ["rivalVerdicts", "playerVerdicts", "completionVerdicts"]) {
    if (!Array.isArray(session[key])) return false
  }
  if (
    session.status !== "player-turn" &&
    session.status !== "eliminated" &&
    session.status !== "champion"
  )
    return false
  const round = session.nextPlayerRound
  if (
    typeof round !== "number" ||
    !Number.isInteger(round) ||
    (round as number) < 0 ||
    (round as number) > CUP_ROUNDS
  )
    return false
  const opponent = session.nextOpponent
  if (opponent !== null && typeof opponent !== "object") return false
  const champion = session.championName
  if (champion !== null && typeof champion !== "string") return false
  return true
}

/**
 * Load and migrate the full save payload — state plus the live cup session.
 * Returns null on absent, corrupt, or unreadable saves; a corrupt session
 * inside an otherwise-valid save is dropped (state survives, the cup walk
 * is lost) rather than failing the whole load.
 */
export function loadSave(adapter: SaveAdapter): SaveData | null {
  const raw = adapter.getItem(SAVE_KEY)
  if (raw === null) return null
  try {
    const data = migrate(JSON.parse(raw) as unknown)
    const { state } = data
    if (
      !Number.isInteger(state.day) ||
      state.day < 1 ||
      (state.phase !== "day" && state.phase !== "cup") ||
      !Number.isInteger(state.actionPoints) ||
      state.actionPoints < 0 ||
      (state.creature !== null && !isValidCreature(state.creature)) ||
      // v5: the settings block is required and strictly typed.
      typeof state.settings !== "object" ||
      state.settings === null ||
      typeof state.settings.reducedMotion !== "boolean" ||
      // v7: the hint ledger is a plain array of string ids.
      !Array.isArray(state.settings.seenHints) ||
      !state.settings.seenHints.every((hint) => typeof hint === "string") ||
      // v9: the camera preference must be one of the two styles.
      (state.settings.arenaCamera !== "cinematic" &&
        state.settings.arenaCamera !== "broadcast") ||
      // v13: the audio mute toggle is a strict boolean (false = sound on).
      typeof state.settings.muted !== "boolean" ||
      // v5: cup bookkeeping must be present and well-formed.
      !Number.isInteger(state.cupsWon) ||
      state.cupsWon < 0 ||
      (state.lastCupDay !== null &&
        (!Number.isInteger(state.lastCupDay) || state.lastCupDay < 1)) ||
      // v8: the ladder slice is required and strictly typed (bronze
      // ladder) — a hand-edited points total or sub-tier fails the load.
      // v11: the tier must be one of the ladder tiers.
      // v14: the full four-tier ladder — gold and legend are legal saves.
      typeof state.ladder !== "object" ||
      state.ladder === null ||
      !Number.isInteger(state.ladder.points) ||
      state.ladder.points < 0 ||
      (state.ladder.subTier !== "III" &&
        state.ladder.subTier !== "II" &&
        state.ladder.subTier !== "I") ||
      (state.ladder.tier !== "bronze" &&
        state.ladder.tier !== "silver" &&
        state.ladder.tier !== "gold" &&
        state.ladder.tier !== "legend") ||
      // v14: the legend title tally is a strict non-negative integer —
      // a hand-edited or malformed count fails the load.
      !Number.isInteger(state.legendTitles) ||
      state.legendTitles < 0 ||
      // v11: the boss defeat ledger is a plain array of boss ids.
      !Array.isArray(state.bossDefeats) ||
      !state.bossDefeats.every((id) => typeof id === "string") ||
      // v10: the bloodline slice is required and strictly typed (legacy
      // track) — a hand-edited generation or a malformed Hall of Fame
      // record fails the load.
      typeof state.lineage !== "object" ||
      state.lineage === null ||
      !Number.isInteger(state.lineage.generation) ||
      state.lineage.generation < 0 ||
      !Array.isArray(state.lineage.hallOfFame) ||
      !state.lineage.hallOfFame.every(isValidRetiredRecord)
    ) {
      return null
    }
    // A session is presentation bookkeeping: it rides the save even after
    // the first fight commits (phase "day") so a refresh mid-walk can
    // never strand the rewards. An invalid session is dropped, not fatal.
    const session =
      data.session !== undefined &&
      data.session !== null &&
      isValidSession(data.session)
        ? data.session
        : null
    return { ...data, session }
  } catch {
    return null
  }
}

/**
 * Load and migrate the saved state.
 * Returns null on absent, corrupt, or unreadable saves — the caller
 * falls back to a fresh run. Callers that need the persisted cup session
 * use loadSave instead.
 */
export function loadGame(adapter: SaveAdapter): GameState | null {
  return loadSave(adapter)?.state ?? null
}

/**
 * Wipe the persisted save. The next boot reads as "no save yet" — a silent
 * fresh start with the starter picker, never the corrupt-save banner.
 * Backed by SaveAdapter.removeItem (localStorage has it natively).
 */
export function clearSave(adapter: SaveAdapter): void {
  adapter.removeItem(SAVE_KEY)
}

/**
 * Boot probe: distinguishes "no save yet" (null — a silent fresh start)
 * from "a save exists but is unreadable" ({corrupt: true} — fresh start
 * plus a calm notice, so the player is never silently robbed of a ranch).
 * A healthy save boots state + session in one read.
 */
export type BootPayload =
  | { state: GameState; session: CupSession | null }
  | { corrupt: true }

export function loadBoot(adapter: SaveAdapter): BootPayload | null {
  if (adapter.getItem(SAVE_KEY) === null) return null
  const data = loadSave(adapter)
  if (data === null) return { corrupt: true }
  return { state: data.state, session: data.session }
}
