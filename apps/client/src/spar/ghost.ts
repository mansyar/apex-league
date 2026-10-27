/**
 * The ghost-rival reader (ghost_data_async_rivals FR-5, AC-5): the spar side
 * of the board's Fight Ghost action. Board bundles travel opaque; this module
 * decides replayability — a bundle is fightable only when it carries this
 * build's simulator version and a complete champion side — and borrows the
 * champion's kit and name onto a seeded exhibition rival. Everything here is
 * pure data: nothing touches GameState, the store, the save, or the cloud, so
 * a ghost bout resolves locally and dies with the panel.
 */

import {
  type Creature,
  makeExhibition,
  SIM_VERSION,
  type SparSetup,
  type Tactic,
} from "@apex/sim"

/**
 * The fightable champion inside an opaque board bundle: the seed that keeps
 * the bout deterministic, the name the rival row shows, and the kit the
 * rival borrows. The rival's species, stats, tactic, and temperament stay the
 * seeded exhibition's own — only the kit is borrowed.
 */
export interface GhostContender {
  readonly seed: number
  readonly name: string
  readonly element: string
  readonly kit: readonly string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function championSideOf(
  bundle: Record<string, unknown>,
): Record<string, unknown> | null {
  const player = bundle.player
  return isRecord(player) ? player : null
}

/**
 * A bundle this build cannot bout with but may still list: a champion side
 * recorded under another simulator version. The board answers with its quiet
 * version note instead of a Fight button.
 */
export function isVersionSkippedBundle(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (
    typeof value.simVersion !== "number" ||
    value.simVersion === SIM_VERSION
  ) {
    return false
  }
  return championSideOf(value) !== null
}

function kitOf(side: Record<string, unknown>): readonly string[] | null {
  const kit = side.kit
  if (!Array.isArray(kit) || kit.length === 0) return null
  if (!kit.every((move): move is string => typeof move === "string")) {
    return null
  }
  return [...kit]
}

/**
 * The fightable champion inside an opaque board bundle, or null when the
 * bundle is foreign, version-skewed, or incomplete. Never throws: the board
 * lists whatever the server served, and only fightable rows grow a button.
 */
export function readGhostContender(value: unknown): GhostContender | null {
  if (!isRecord(value)) return null
  if (value.simVersion !== SIM_VERSION) return null
  if (typeof value.seed !== "number" || !Number.isInteger(value.seed)) {
    return null
  }
  const champion = championSideOf(value)
  if (champion === null) return null
  if (typeof champion.name !== "string" || champion.name.length === 0) {
    return null
  }
  if (typeof champion.element !== "string" || champion.element.length === 0) {
    return null
  }
  const kit = kitOf(champion)
  if (kit === null) return null
  return {
    seed: value.seed,
    name: champion.name,
    element: champion.element,
    kit,
  }
}

/**
 * A seeded exhibition whose rival wears the ghost champion's kit and name.
 * The bout resolves through the spar's usual `resolveBattle` path, so a
 * ghost win or loss lives only in the panel — no cups, ladder,
 * morning-after, or ghost re-submit can observe it.
 */
export function ghostSparSetup(
  owned: Creature,
  contender: GhostContender,
  tactic: Tactic,
): SparSetup {
  const setup = makeExhibition(owned, tactic, contender.seed)
  return {
    ...setup,
    rivalSide: { ...setup.rivalSide, name: contender.name, kit: contender.kit },
  }
}
