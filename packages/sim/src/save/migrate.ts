import { isCupDay } from "../calendar"
import { createCreature, TRAINED_START } from "../creature"
import type { CupSession } from "../cup"
import { initialLadder } from "../ladder"
import { initialLineage } from "../legacy"
import type { GameState } from "../state"
import { ACTION_POINTS_PER_DAY } from "../state"
import { SAVE_VERSION, type SaveData } from "./schema"

/** Seed used when a migrated save is granted its default starter. */
export const STARTER_GRANT_SEED = 42

/**
 * Validate the persisted GameState's core scalar fields (day/phase/AP) that
 * every migration step leans on. Throws a version-tagged error on a broken
 * shape; returns the validated scalars plus the state record so each
 * migration entry stays a pure field-shaper.
 */
export function validateStateShape(
  raw: Record<string, unknown>,
  version: number,
): {
  day: number
  phase: "day" | "cup"
  actionPoints: number
  state: Record<string, unknown>
} {
  const state = raw.state
  if (typeof state !== "object" || state === null) {
    throw new Error(`invalid v${version} save: missing state`)
  }
  const s = state as Record<string, unknown>
  const day = s.day
  const phase = s.phase
  const actionPoints = s.actionPoints
  if (
    typeof day !== "number" ||
    !Number.isInteger(day) ||
    day < 1 ||
    (phase !== "day" && phase !== "cup") ||
    typeof actionPoints !== "number" ||
    !Number.isInteger(actionPoints) ||
    actionPoints < 0
  ) {
    throw new Error(`invalid v${version} save: broken state`)
  }
  return { day, phase, actionPoints, state: s }
}

/**
 * The optional persisted creature object from a validated state, or null.
 * Throws on a non-object creature (a corrupt hand-edited save). Steps that
 * predate object validation keep their lenient inline cast instead.
 */
function persistedCreature(
  state: Record<string, unknown>,
  version: number,
): Record<string, unknown> | null {
  const c = state.creature
  if (c === null || c === undefined) return null
  if (typeof c !== "object") {
    throw new Error(`invalid v${version} save: broken creature`)
  }
  return c as Record<string, unknown>
}

/**
 * Migration chain: each entry upgrades a payload from key version to key + 1.
 * New versions append here; migrate() walks the chain step by step. Keys are
 * ascending; every entry validates through validateStateShape and only shapes
 * fields.
 */
const migrations: Record<
  number,
  (raw: Record<string, unknown>) => Record<string, unknown>
> = {
  // v0 (pre-schema): { version: 0, day } — derive the rest of GameState.
  0: (raw) => {
    const day = raw.day
    if (typeof day !== "number" || !Number.isInteger(day) || day < 1) {
      throw new Error("invalid v0 save: missing day")
    }
    const state: GameState = {
      day,
      phase: isCupDay(day) ? "cup" : "day",
      actionPoints: ACTION_POINTS_PER_DAY,
      creature: null,
      settings: {
        reducedMotion: false,
        seenHints: [],
        arenaCamera: "cinematic",
        muted: false,
      },
      cupsWon: 0,
      lastCupDay: null,
      // The ladder starts fresh for every migrated save (bronze ladder,
      // no-backfill decision): cups already won are history.
      ladder: initialLadder(),
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return { version: 1, state, savedAt: 0 }
  },

  // v1 → v2: saves from before the care loop have no creature. Grant the
  // default Fire drake starter so the creature is always owned going forward.
  1: (raw) => {
    const { day, phase, actionPoints } = validateStateShape(raw, 1)
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature: createCreature("fire_drake", STARTER_GRANT_SEED),
      settings: {
        reducedMotion: false,
        seenHints: [],
        arenaCamera: "cinematic",
        muted: false,
      },
      cupsWon: 0,
      lastCupDay: null,
      // The ladder starts fresh for every migrated save (bronze ladder,
      // no-backfill decision): cups already won are history.
      ladder: initialLadder(),
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return { version: 2, state: migrated, savedAt: raw.savedAt ?? 0 }
  },

  // v2 → v3: saves from before training have no training fields on the
  // creature. Grant neutral training state; rolled stats are untouched.
  2: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 2)
    const legacy = persistedCreature(s, 2)
    const creature = legacy
      ? ({
          ...legacy,
          trained: { ...TRAINED_START },
          trainingFocus: null,
          trainingResult: null,
        } as unknown as GameState["creature"])
      : null
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature,
      settings: {
        reducedMotion: false,
        seenHints: [],
        arenaCamera: "cinematic",
        muted: false,
      },
      cupsWon: 0,
      lastCupDay: null,
      // The ladder starts fresh for every migrated save (bronze ladder,
      // no-backfill decision): cups already won are history.
      ladder: initialLadder(),
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return { version: 3, state: migrated, savedAt: raw.savedAt ?? 0 }
  },

  // v3 → v4: saves from before the daily food-pile flag and the move-kit
  // ledger have neither fedToday nor trainingDays/loadout on the creature.
  // Merged migration (ranch dressing + combat prep both bumped 3→4): wake
  // every migrated creature unfed; credit 6 trained days so pre-gate
  // creatures (who knew their full kit) suffer no surprise loss; loadout
  // starts at the default slicing (null). Rolled stats are untouched.
  3: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 3)
    const legacy = persistedCreature(s, 3)
    const creature = legacy
      ? ({
          ...legacy,
          fedToday: false,
          trainingDays: 6,
          loadout: null,
        } as unknown as GameState["creature"])
      : null
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature,
      settings: {
        reducedMotion: false,
        seenHints: [],
        arenaCamera: "cinematic",
        muted: false,
      },
      cupsWon: 0,
      lastCupDay: null,
      // The ladder starts fresh for every migrated save (bronze ladder,
      // no-backfill decision): cups already won are history.
      ladder: initialLadder(),
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return { version: 4, state: migrated, savedAt: raw.savedAt ?? 0 }
  },

  // v4 → v5: merged migration (arena playback + cup day both bumped 4→5).
  // Saves from before the arena wake with full ornamental motion
  // (reducedMotion defaults false; the preference lives in state.settings)
  // and from before the cup system with no cup bookkeeping (never won a
  // cup, never entered one).
  4: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 4)
    const settings =
      s.settings !== undefined && s.settings !== null
        ? (s.settings as GameState["settings"])
        : { reducedMotion: false, seenHints: [] }
    const creature =
      s.creature !== null && s.creature !== undefined
        ? (s.creature as GameState["creature"])
        : null
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature,
      settings: { ...settings, arenaCamera: "cinematic", muted: false },
      cupsWon: 0,
      lastCupDay: null,
      // The ladder starts fresh for every migrated save (bronze ladder,
      // no-backfill decision): cups already won are history.
      ladder: initialLadder(),
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return { version: 5, state: migrated, savedAt: raw.savedAt ?? 0 }
  },

  // v5 → v6: saves from before evolution have no sickness-cooldown
  // bookkeeping on the creature. Stamp it clean (0): a migrated creature
  // wakes exactly as it slept — maturity stays whatever it was, and the
  // next settlement's evolution gate decides the stage (so a long-lived
  // v5 baby matures on its next well-cared night).
  5: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 5)
    const legacy = persistedCreature(s, 5)
    const creature = legacy
      ? ({ ...legacy, sickCooldown: 0 } as unknown as GameState["creature"])
      : null
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature,
      settings: s.settings as GameState["settings"],
      cupsWon: s.cupsWon as GameState["cupsWon"],
      lastCupDay: s.lastCupDay as GameState["lastCupDay"],
      // The ladder starts fresh for every migrated save (bronze ladder,
      // no-backfill decision): cups already won are history.
      ladder: initialLadder(),
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return { version: 6, state: migrated, savedAt: raw.savedAt ?? 0 }
  },

  // v6 → v7 (merged migration, save-safety track): saves gain the persisted
  // cup-session slot (null — a migrated save never has a live session) and
  // a clean onboarding hint ledger in settings. A v6 payload's settings
  // predate the ledger, so stamp it here; reducedMotion is forwarded
  // unchanged so corrupt values still fail load-time validation (the same
  // gate the v5→v6 flow relies on).
  6: (raw) => {
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
        // the v8 → v9 step below stamps it again for direct v8 saves.
        arenaCamera: "cinematic",
        muted: false,
      },
      cupsWon: s.cupsWon as GameState["cupsWon"],
      lastCupDay: s.lastCupDay as GameState["lastCupDay"],
      // The ladder starts fresh for every migrated save (bronze ladder,
      // no-backfill decision): cups already won are history.
      ladder: initialLadder(),
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return {
      version: 7,
      state: migrated,
      savedAt: raw.savedAt ?? 0,
      session: null,
    }
  },

  // v7 → v8 (bronze ladder track): saves gain the ladder slice. The
  // no-backfill decision stamps a fresh ladder (0 points, Bronze III) for
  // every migrated save — cups already won are history, the ladder starts
  // with the tier it will climb.
  7: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 7)
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature: s.creature as GameState["creature"],
      settings: s.settings as GameState["settings"],
      cupsWon: s.cupsWon as GameState["cupsWon"],
      lastCupDay: s.lastCupDay as GameState["lastCupDay"],
      // Always fresh: a hand-edited or future ladder value in a v7 payload
      // cannot smuggle points past the migration gate.
      ladder: initialLadder(),
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return {
      version: 8,
      state: migrated,
      savedAt: raw.savedAt ?? 0,
      // The live cup session predates this step (save v7) and is forwarded
      // untouched — the ladder migration only adds a fresh ladder slice.
      session: (raw.session as CupSession | null) ?? null,
    }
  },

  // v8 → v9 (merged migration, battle-animation track): saves from before
  // the camera director have no arena-camera preference. Stamp the
  // cinematic default: the director is the intended presentation, and
  // reduced-motion players are pinned to the broadcast feel at render time
  // regardless of this value. Ladder and cup session predate this step and
  // are forwarded untouched.
  8: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 8)
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature: s.creature as GameState["creature"],
      settings: {
        ...(s.settings as GameState["settings"]),
        arenaCamera: "cinematic",
        muted: false,
      },
      cupsWon: s.cupsWon as GameState["cupsWon"],
      lastCupDay: s.lastCupDay as GameState["lastCupDay"],
      ladder: s.ladder as GameState["ladder"],
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return {
      version: 9,
      state: migrated,
      savedAt: raw.savedAt ?? 0,
      session: (raw.session as CupSession | null) ?? null,
    }
  },

  // v9 → v10 (legacy & breeding track): saves gain the bloodline slice
  // (generation + Hall of Fame). A migrated save starts its bloodline fresh
  // — generation 0, empty Hall of Fame. cupsWon (v5) already persists and
  // feeds prestige, so there is no backfill: cups already won are history,
  // exactly like the v8 ladder. The live cup session is forwarded untouched.
  9: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 9)
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature: s.creature as GameState["creature"],
      settings: s.settings as GameState["settings"],
      cupsWon: s.cupsWon as GameState["cupsWon"],
      lastCupDay: s.lastCupDay as GameState["lastCupDay"],
      ladder: s.ladder as GameState["ladder"],
      lineage: initialLineage(),
      bossDefeats: [],
    }
    return {
      version: 10,
      state: migrated,
      savedAt: raw.savedAt ?? 0,
      session: (raw.session as CupSession | null) ?? null,
    }
  },

  // v10 → v11 (silver ladder & rival bosses track): the ladder gains its
  // tier — every existing save is stamped "bronze" (no save predates the
  // Promotion Cup, so nobody can already be Silver) — and the state gains
  // the boss defeat ledger, empty for migrated saves: no boss existed
  // before this track, so there is nothing to backfill. Unlike the v7/v8
  // ladder stamp this PRESERVES the migrated ladder's points and sub-tier —
  // banked progress is the player's real standing at the promotion gate.
  10: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 10)
    const persistedLadder = s.ladder as Record<string, unknown>
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature: s.creature as GameState["creature"],
      settings: s.settings as GameState["settings"],
      cupsWon: s.cupsWon as GameState["cupsWon"],
      lastCupDay: s.lastCupDay as GameState["lastCupDay"],
      ladder: {
        ...persistedLadder,
        tier: "bronze",
      } as GameState["ladder"],
      lineage: s.lineage as GameState["lineage"],
      bossDefeats: [],
    }
    return {
      version: 11,
      state: migrated,
      savedAt: raw.savedAt ?? 0,
      session: (raw.session as CupSession | null) ?? null,
    }
  },
  // v11 → v12 (element chart & battle length track): every stored HP is
  // doubled to the new scale — the live creature, every cup-session slot
  // (rivals and the player snapshot alike), the final rival, and every
  // Hall of Fame record. Trained bonuses, atk/def/spd, the ladder, and the
  // boss ledger are scale-free and forwarded untouched. Because the v11
  // effective HP was base + 1×trained and the v12 effective HP is
  // 2×base + 2×trained, doubling the stored magnitude is exact for any
  // trained bonus within the unchanged cap.
  11: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 11)
    const doubleHp = <T extends { hp: number }>(stats: T): T => ({
      ...stats,
      hp: stats.hp * 2,
    })
    const creature = s.creature as GameState["creature"]
    const session = raw.session as CupSession | null
    const migratedSession = session
      ? {
          ...session,
          bracket: {
            ...session.bracket,
            slots: session.bracket.slots.map((slot) => ({
              ...slot,
              stats: doubleHp(slot.stats),
            })),
            finalRival: {
              ...session.bracket.finalRival,
              stats: doubleHp(session.bracket.finalRival.stats),
            },
          },
        }
      : null
    const lineage = s.lineage as GameState["lineage"]
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature: creature
        ? {
            ...creature,
            stats: doubleHp(creature.stats),
          }
        : null,
      settings: s.settings as GameState["settings"],
      cupsWon: s.cupsWon as GameState["cupsWon"],
      lastCupDay: s.lastCupDay as GameState["lastCupDay"],
      ladder: s.ladder as GameState["ladder"],
      lineage: {
        ...lineage,
        hallOfFame: lineage.hallOfFame.map((record) => ({
          ...record,
          stats: doubleHp(record.stats),
        })),
      },
      bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    }
    return {
      version: 12,
      state: migrated,
      savedAt: raw.savedAt ?? 0,
      session: migratedSession,
    }
  },

  // v12 → v13 (audio_foundation_20261017): settings gain the persisted
  // audio mute toggle, stamped false — sound is on for every migrated
  // save until the player silences it in the settings modal. Everything
  // else predates this step and is forwarded untouched.
  12: (raw) => {
    const { day, phase, actionPoints, state: s } = validateStateShape(raw, 12)
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature: s.creature as GameState["creature"],
      settings: {
        ...(s.settings as GameState["settings"]),
        muted: false,
      },
      cupsWon: s.cupsWon as GameState["cupsWon"],
      lastCupDay: s.lastCupDay as GameState["lastCupDay"],
      ladder: s.ladder as GameState["ladder"],
      lineage: s.lineage as GameState["lineage"],
      bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    }
    return {
      version: 13,
      state: migrated,
      savedAt: raw.savedAt ?? 0,
      session: (raw.session as CupSession | null) ?? null,
    }
  },
}
/**
 * Migrate any versioned save payload to the current schema.
 * Throws on unknown/missing versions — callers treat throws as corrupt data.
 */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("invalid save: not an object")
  }
  let obj = raw as Record<string, unknown>
  const rawVersion: unknown = obj.version
  if (typeof rawVersion !== "number") {
    throw new Error("invalid save: missing version")
  }
  let version: number = rawVersion
  while (version < SAVE_VERSION) {
    const step = migrations[version]
    if (!step) {
      throw new Error(`invalid save: no migration from version ${version}`)
    }
    obj = step(obj)
    version = obj.version as number
  }
  if (version !== SAVE_VERSION) {
    throw new Error(`invalid save: future version ${version}`)
  }
  return obj as unknown as SaveData
}
