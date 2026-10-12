import { isCupDay } from "../calendar"
import { createCreature, TRAINED_START } from "../creature"
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
      settings: { reducedMotion: false, seenHints: [] },
      cupsWon: 0,
      lastCupDay: null,
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
      settings: { reducedMotion: false, seenHints: [] },
      cupsWon: 0,
      lastCupDay: null,
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
      settings: { reducedMotion: false, seenHints: [] },
      cupsWon: 0,
      lastCupDay: null,
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
      settings: { reducedMotion: false, seenHints: [] },
      cupsWon: 0,
      lastCupDay: null,
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
      settings,
      cupsWon: 0,
      lastCupDay: null,
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
    }
    return { version: 6, state: migrated, savedAt: raw.savedAt ?? 0 }
  },

  // v6 → v7 (merged migration, save-safety track): saves gain the persisted
  // cup-session slot (null — a migrated save never has a live session) and
  // a clean onboarding hint ledger in settings. A v6 payload's settings
  // predate the ledger, so stamp it here; reducedMotion stays whatever the
  // save said (defaulting false on a corrupt value, matching the v5 recipe).
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
      },
      cupsWon: s.cupsWon as GameState["cupsWon"],
      lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    }
    return {
      version: 7,
      state: migrated,
      savedAt: raw.savedAt ?? 0,
      session: null,
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
