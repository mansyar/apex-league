import { initialLadder } from "../../ladder"
import { initialLineage } from "../../legacy"
import { type GameState, initialEvolutionKnowledge } from "../../state"
import { validateStateShape } from "./common"

/**
 * v6 → v7 (merged migration, save-safety track): saves gain the persisted
 * cup-session slot (null — a migrated save never has a live session) and
 * a clean onboarding hint ledger in settings. A v6 payload's settings
 * predate the ledger, so stamp it here; reducedMotion is forwarded
 * unchanged so corrupt values still fail load-time validation (the same
 * gate the v5→v6 flow relies on).
 */
export function migrateFromV6(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 6)
  const rawSettings =
    s.settings !== undefined && s.settings !== null
      ? (s.settings as Record<string, unknown>)
      : {}
  const seenHints = Array.isArray(rawSettings.seenHints)
    ? (rawSettings.seenHints as unknown[]).filter(
        (hint): hint is string => typeof hint === "string",
      )
    : []
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: s.creature as GameState["creature"],
    settings: {
      reducedMotion:
        rawSettings.reducedMotion as GameState["settings"]["reducedMotion"],
      seenHints,
      // Stamped early so the intermediate GameState literal type-checks;
      // the v8 → v9 step stamps it again for direct v8 saves.
      arenaCamera: "cinematic",
      muted: false,
      // Stamped early for the same reason; the v15 → v16 step sets these.
      musicVolume: 1,
      sfxVolume: 1,
    },
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    // The ladder starts fresh for every migrated save (bronze ladder,
    // no-backfill decision): cups already won are history.
    ladder: initialLadder(),
    lineage: initialLineage(),
    bossDefeats: [],
    legendTitles: 0,
    evolutionKnowledge: initialEvolutionKnowledge(),
    claimedTiers: [],
    pendingRewards: [],
    stable: [],
  }
  return {
    version: 7,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: null,
  }
}
