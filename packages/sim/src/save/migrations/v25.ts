import type { CupSession } from "../../cup/session"
import type { GameState } from "../../state"
import { rewardRecordOf, validateStateShape } from "./common"

/**
 * v25 → v26 (stat fold, FR-2/FR-3): the two multipliers that sat between the
 * sheet and the fight are baked into the stored numbers. The HP stat absorbs
 * the old 210% arena scale (`round(hp * 21 / 10)`), and the trained HP bonus
 * absorbs it too, clamped to the scaled cap of 13, so a fully trained
 * creature is worth the same pool as before (2 * 13 = 26 against the old
 * 2 * 6 * 2.1 = 25.2). Nothing else moves: ATK/DEF/SPD, conditions, kits and
 * every non-HP field forward untouched.
 *
 * The frozen session's sides also carry a legacy `tactic`; each one gains the
 * matching `doctrine` (`specials` → kite, `balanced` → press), the same map
 * the live boundary uses, while `tactic` stays readable for the frozen legacy
 * path. The arithmetic is written out here rather than imported: a migration
 * step is frozen the day it ships and must not follow a later change to the
 * live fold helper.
 */
const foldHp = (raw: number): number => Math.round((raw * 21) / 10)

const foldTrainedHp = (raw: number): number => Math.min(13, foldHp(raw))

function foldStats(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value
  const stats = value as Record<string, unknown>
  const hp = stats.hp
  if (typeof hp !== "number") return value
  return { ...stats, hp: foldHp(hp) }
}

/** Fold one stored creature (or Hall of Fame record) by value. */
function foldCreature(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value
  const creature = value as Record<string, unknown>
  const trained = creature.trained
  const nextTrained =
    typeof trained === "object" && trained !== null
      ? {
          ...(trained as Record<string, unknown>),
          hp: foldTrainedHp(
            Number((trained as Record<string, unknown>).hp ?? 0),
          ),
        }
      : trained
  return { ...creature, stats: foldStats(creature.stats), trained: nextTrained }
}

/** Fold one persisted BattleSide: HP stat plus the tactic → doctrine map. */
function foldSide(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value
  const side = value as Record<string, unknown>
  const tactic = side.tactic
  const mapped =
    typeof side.doctrine === "string"
      ? side.doctrine
      : tactic === "specials"
        ? "kite"
        : tactic === "balanced"
          ? "press"
          : undefined
  return {
    ...side,
    stats: foldStats(side.stats),
    ...(mapped === undefined ? {} : { doctrine: mapped }),
  }
}

function foldVerdict(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value
  const verdict = value as Record<string, unknown>
  const sides = verdict.sides
  return Array.isArray(sides)
    ? { ...verdict, sides: sides.map(foldSide) }
    : verdict
}

function foldVerdicts(value: unknown): unknown {
  return Array.isArray(value) ? value.map(foldVerdict) : value
}

function foldSlot(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value
  const slot = value as Record<string, unknown>
  return { ...slot, stats: foldStats(slot.stats) }
}

function foldSession(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value
  const session = value as Record<string, unknown>
  const bracket = session.bracket
  const nextBracket =
    typeof bracket === "object" && bracket !== null
      ? {
          ...(bracket as Record<string, unknown>),
          slots: Array.isArray((bracket as Record<string, unknown>).slots)
            ? ((bracket as Record<string, unknown>).slots as unknown[]).map(
                foldSlot,
              )
            : (bracket as Record<string, unknown>).slots,
          finalRival: foldSlot((bracket as Record<string, unknown>).finalRival),
        }
      : bracket
  const resolutions = session.rivalResolutions
  return {
    ...session,
    bracket: nextBracket,
    nextOpponent: foldSlot(session.nextOpponent),
    rivalVerdicts: foldVerdicts(session.rivalVerdicts),
    playerVerdicts: foldVerdicts(session.playerVerdicts),
    completionVerdicts: foldVerdicts(session.completionVerdicts),
    rivalResolutions: Array.isArray(resolutions)
      ? resolutions.map((entry) => {
          const resolution = entry as Record<string, unknown>
          return { ...resolution, verdict: foldVerdict(resolution.verdict) }
        })
      : resolutions,
  }
}

export function migrateFromV25(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const { day, phase, actionPoints, state: s } = validateStateShape(raw, 25)
  const lineage = s.lineage as Record<string, unknown> | undefined
  const hallOfFame = lineage?.hallOfFame
  const nextLineage =
    lineage === undefined
      ? lineage
      : {
          ...lineage,
          hallOfFame: Array.isArray(hallOfFame)
            ? hallOfFame.map(foldCreature)
            : hallOfFame,
        }
  const migrated: GameState = {
    day,
    phase,
    actionPoints,
    creature: foldCreature(s.creature) as GameState["creature"],
    settings: s.settings as GameState["settings"],
    cupsWon: s.cupsWon as GameState["cupsWon"],
    lastCupDay: s.lastCupDay as GameState["lastCupDay"],
    ladder: s.ladder as GameState["ladder"],
    lineage: nextLineage as GameState["lineage"],
    bossDefeats: s.bossDefeats as GameState["bossDefeats"],
    legendTitles: s.legendTitles as GameState["legendTitles"],
    evolutionKnowledge: s.evolutionKnowledge as GameState["evolutionKnowledge"],
    ...rewardRecordOf(s),
    stable: Array.isArray(s.stable)
      ? (s.stable.map(foldCreature) as GameState["stable"])
      : (s.stable as GameState["stable"]),
  }
  return {
    version: 26,
    state: migrated,
    savedAt: raw.savedAt ?? 0,
    session: foldSession(raw.session ?? null) as CupSession | null,
  }
}
