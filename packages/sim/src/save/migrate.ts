import { isCupDay } from "../calendar"
import { createCreature, TRAINED_START } from "../creature"
import type { GameState } from "../state"
import { ACTION_POINTS_PER_DAY } from "../state"
import { SAVE_VERSION, type SaveData } from "./schema"

/** Seed used when a migrated save is granted its default starter. */
export const STARTER_GRANT_SEED = 42

/**
 * Migration chain: each entry upgrades a payload from key version to key + 1.
 * New versions append here; migrate() walks the chain step by step.
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
    }
    return { version: 1, state, savedAt: 0 }
  },

  // v1 → v2: saves from before the care loop have no creature. Grant the
  // default Fire drake starter so the creature is always owned going forward.
  1: (raw) => {
    const state = raw.state
    if (typeof state !== "object" || state === null) {
      throw new Error("invalid v1 save: missing state")
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
      throw new Error("invalid v1 save: broken state")
    }
    const migrated: GameState = {
      day,
      phase,
      actionPoints,
      creature: createCreature("fire_drake", STARTER_GRANT_SEED),
    }
    return { version: 2, state: migrated, savedAt: raw.savedAt ?? 0 }
  },

  // v3 → v4: saves from before the daily food-pile flag have no fedToday
  // on the creature. Wake every migrated creature unfed.
  3: (raw) => {
    const state = raw.state
    if (typeof state !== "object" || state === null) {
      throw new Error("invalid v3 save: missing state")
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
      throw new Error("invalid v3 save: broken state")
    }
    let creature: GameState["creature"] = null
    if (s.creature !== null && s.creature !== undefined) {
      if (typeof s.creature !== "object") {
        throw new Error("invalid v3 save: broken creature")
      }
      creature = {
        ...(s.creature as Record<string, unknown>),
        fedToday: false,
      } as unknown as GameState["creature"]
    }
    const migrated: GameState = { day, phase, actionPoints, creature }
    return { version: 4, state: migrated, savedAt: raw.savedAt ?? 0 }
  },

  // v2 → v3: saves from before training have no training fields on the
  // creature. Grant neutral training state; rolled stats are untouched.
  2: (raw) => {
    const state = raw.state
    if (typeof state !== "object" || state === null) {
      throw new Error("invalid v2 save: missing state")
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
      throw new Error("invalid v2 save: broken state")
    }
    let creature: GameState["creature"] = null
    if (s.creature !== null && s.creature !== undefined) {
      if (typeof s.creature !== "object") {
        throw new Error("invalid v2 save: broken creature")
      }
      creature = {
        ...(s.creature as Record<string, unknown>),
        trained: { ...TRAINED_START },
        trainingFocus: null,
        trainingResult: null,
      } as unknown as GameState["creature"]
    }
    const migrated: GameState = { day, phase, actionPoints, creature }
    return { version: 3, state: migrated, savedAt: raw.savedAt ?? 0 }
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
