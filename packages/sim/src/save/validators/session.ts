/**
 * Save payload validators, part two: the shape rules for the persisted save
 * itself and for the live cup session it may carry.
 *
 * Split out of the former monolithic save/storage.ts
 * (sim-voxel-size-guard, phase 2) — pure relocation, no behavior change. The
 * creature and Hall of Fame rules live in ./creature.
 */

import { BRACKET_SLOTS, CUP_ROUNDS, type CupSession } from "../../cup"
import { getSpecies } from "../../species"
import type { GameState } from "../../state"
import { isValidCreature, isValidRetiredRecord } from "./creature"

/**
 * A persisted cup session is valid when its shape matches the sim contract
 * closely enough to hand back to the client: the bracket, the verdict
 * arrays, the pending round, and the champion stamp. This is defense against
 * a corrupt/hand-edited payload — the client renders names and species from
 * a restored session, so the deep fields it reads are checked here.
 */
export function isValidSession(s: unknown): s is CupSession {
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
 * A pending reward egg (save v25, generalizing v22's single pending gift)
 * is valid when it names a known species and an integer seed.
 */
function isValidPendingEgg(egg: unknown): boolean {
  if (typeof egg !== "object" || egg === null) return false
  const g = egg as { speciesId?: unknown; seed?: unknown }
  if (typeof g.speciesId !== "string") return false
  if (getSpecies(g.speciesId) === undefined) return false
  return typeof g.seed === "number" && Number.isInteger(g.seed)
}

/**
 * The per-tier league reward claims (save v25): a list of distinct reward
 * tiers — the tiers the league actually pays (Silver and above; bronze
 * carries no reward). A duplicate tier would double-grant, an unknown tier
 * would grant nothing real, so both fail the load instead.
 */
function isValidClaimedTiers(tiers: unknown): boolean {
  if (!Array.isArray(tiers)) return false
  const seen = new Set<string>()
  for (const tier of tiers) {
    if (
      typeof tier !== "string" ||
      (tier !== "silver" && tier !== "gold" && tier !== "legend")
    ) {
      return false
    }
    if (seen.has(tier)) return false
    seen.add(tier)
  }
  return true
}

/**
 * Whether a migrated state is structurally legal (the v5-v17 rules).
 * Shared by loadSave and save import, so both paths accept exactly the same
 * states.
 */
export function isValidSaveState(state: GameState): boolean {
  return !(
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
    // v16: both bus levels are finite numbers in 0..1 (release polish).
    typeof state.settings.musicVolume !== "number" ||
    !Number.isFinite(state.settings.musicVolume) ||
    state.settings.musicVolume < 0 ||
    state.settings.musicVolume > 1 ||
    typeof state.settings.sfxVolume !== "number" ||
    !Number.isFinite(state.settings.sfxVolume) ||
    state.settings.sfxVolume < 0 ||
    state.settings.sfxVolume > 1 ||
    // v5: cup bookkeeping must be present and well-formed.
    !Number.isInteger(state.cupsWon) ||
    state.cupsWon < 0 ||
    (state.lastCupDay !== null &&
      (!Number.isInteger(state.lastCupDay) || state.lastCupDay < 1)) ||
    // v8: the ladder slice is required and strictly typed (bronze ladder) -
    // a hand-edited points total or sub-tier fails the load.
    // v11: the tier must be one of the ladder tiers.
    // v14: the full four-tier ladder - gold and legend are legal saves.
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
    // v14: the legend title tally is a strict non-negative integer - a
    // hand-edited or malformed count fails the load.
    !Number.isInteger(state.legendTitles) ||
    state.legendTitles < 0 ||
    // v11: the boss defeat ledger is a plain array of boss ids.
    !Array.isArray(state.bossDefeats) ||
    !state.bossDefeats.every((id) => typeof id === "string") ||
    // v10: the bloodline slice is required and strictly typed (legacy
    // track) - a hand-edited generation or a malformed Hall of Fame record
    // fails the load.
    typeof state.lineage !== "object" ||
    state.lineage === null ||
    !Number.isInteger(state.lineage.generation) ||
    state.lineage.generation < 0 ||
    !Array.isArray(state.lineage.hallOfFame) ||
    !state.lineage.hallOfFame.every(isValidRetiredRecord) ||
    // v17: the evolution discovery record is required and strictly typed -
    // both gates are plain booleans, so a hand-edited flag fails the load
    // instead of silently revealing (or hiding) the thresholds.
    typeof state.evolutionKnowledge !== "object" ||
    state.evolutionKnowledge === null ||
    typeof state.evolutionKnowledge.juvenile !== "boolean" ||
    typeof state.evolutionKnowledge.champion !== "boolean" ||
    // v25: the league reward record is required and strictly typed — the
    // claims are distinct reward tiers and the queue holds well-typed eggs
    // (known species, integer seed). A hand-edited record fails the load
    // instead of granting (or blocking) a reward.
    !isValidClaimedTiers(state.claimedTiers) ||
    !Array.isArray(state.pendingRewards) ||
    !state.pendingRewards.every(isValidPendingEgg) ||
    // v24: the stable is a plain list of whole pets — every entry a valid
    // creature (a known species, a positive age, a valid stage, branch and
    // loadout). A half-pet fails the load, not the game.
    !Array.isArray(state.stable) ||
    !state.stable.every(isValidCreature)
  )
}
