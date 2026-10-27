/**
 * Ghost data (ghost_data_async_rivals, Phase 1): a cup win captures a full
 * replay bundle — the deciding battle's seed, both kits, and the event log —
 * pinned to the simulator version that produced it, so any later reader can
 * replay it byte-identically or skip it quietly on a version mismatch.
 *
 * Everything here is pure and DOM-free. The bundle is derived from the
 * finished cup session (no save-schema change, no migration): `finalizeCup`
 * stays bundle-free and the client holds the bundle for the Phase 3 submit
 * path. Per-trainer best and server storage arrive in Phase 2 — this phase
 * is capture + local replay only.
 */

import {
  type BattleEvent,
  type BattleResult,
  type BattleSide,
  resolveBattle,
} from "../battle"
import type { CupSession } from "./session/walk"
import { cupMatchSeed } from "./verdicts"

/**
 * The simulator version pinned in every ghost bundle. Bump it whenever
 * battle or cup resolution changes meaning (damage, clock, policy, seeds,
 * kits): a reader whose version differs must skip the replay rather than
 * misread it.
 */
export const SIM_VERSION = 1

/** A full replay bundle for one cup-winning final: everything a later
 * reader needs to replay the deciding battle without the session. No
 * trainer identity rides here (privacy, NFR-4) — the submit path attaches
 * the display name server-side in Phase 2. */
export interface GhostBundle {
  /** The simulator version that produced this bundle (see SIM_VERSION). */
  readonly simVersion: number
  /** The deciding battle's seed: `cupMatchSeed(day, round, 0)`. */
  readonly seed: number
  /** The cup day the winning session was played on. */
  readonly day: number
  /** The deciding round (always the final for a championship). */
  readonly round: number
  /** The champion's side: frozen stats, winning kit, tactic. */
  readonly player: BattleSide
  /** The final opponent's side: frozen stats, kit, tactic. */
  readonly rival: BattleSide
  /** The champion's name (the verdict winner, null on a drawn final). */
  readonly winner: string | null
  /** The deciding battle's full ordered event log. */
  readonly events: readonly BattleEvent[]
}

/**
 * Capture the ghost bundle from a finished cup session (the cup-win path):
 * the champion's deciding final carries its battle and both sides, so the
 * bundle is a projection, not a re-resolution. Returns null unless the
 * session crowned a champion with a fought final — forfeits (null battle)
 * and walkovers (absent sides) never capture.
 */
export function buildGhostBundle(session: CupSession): GhostBundle | null {
  if (session.status !== "champion") return null
  const final = session.playerVerdicts[session.playerVerdicts.length - 1]
  if (!final?.battle) return null
  const sides = final.sides
  if (sides?.length !== 2) return null
  const player = sides[0]
  const rival = sides[1]
  if (!player || !rival) return null
  // Copy on capture: the session stays live after the final (the walk, the
  // results screen, a refresh) and later mutation must never rewrite a
  // queued bundle. Kit, stats, and the event log are the mutable parts —
  // name/element/tactic are scalars and ride along.
  const copySide = (side: BattleSide): BattleSide => ({
    ...side,
    stats: { ...side.stats },
    kit: [...side.kit],
  })
  return {
    simVersion: SIM_VERSION,
    seed: cupMatchSeed(session.bracket.day, final.round, 0),
    day: session.bracket.day,
    round: final.round,
    player: copySide(player),
    rival: copySide(rival),
    winner: final.battle.winner,
    events: [...final.battle.events],
  }
}

/** Replay the deciding battle from the bundle alone (no session needed). */
export function replayGhost(bundle: GhostBundle): BattleResult {
  return resolveBattle(bundle.player, bundle.rival, bundle.seed)
}

/**
 * Verify a bundle: the version must match this simulator and the replayed
 * event log must be byte-identical to the captured one. A mismatch fails
 * quietly (false) — the caller skips the replay and keeps any listing
 * entry, per the version-skew edge case.
 */
export function verifyGhostBundle(bundle: GhostBundle): boolean {
  if (bundle.simVersion !== SIM_VERSION) return false
  const replayed = replayGhost(bundle)
  if (replayed.winner !== bundle.winner) return false
  return JSON.stringify(replayed.events) === JSON.stringify(bundle.events)
}
