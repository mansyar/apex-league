/**
 * The single source of truth for sim-battle verdict copy. Both seams take
 * already-resolved inputs: nothing here recomputes a winner, a placement, or a
 * reward. Spar/cup/HUD adapters pass their existing inputs and get a frozen
 * title/sub pair back, so the wording lives in exactly one place.
 *
 * DOM-free and side-effect free by design — the playback driver and the cup
 * session stay behind their adapters (FR-1, FR-2, NFR-2).
 */
import type { BattleResult } from "@apex/sim"
import { reasonLine, winningSideKey } from "../battleUI"

/** The structural slice of a fight the stamp copy reads (no driver types). */
export interface StampFight {
  owned: { key: string; name: string }
  rival: { key: string; name: string }
}

/** One frozen verdict title/sub pair. */
export interface VerdictCopy {
  readonly title: string
  readonly sub: string
}

/**
 * Spar wording: the title names the winner; a mirror match qualifies the side
 * because both plates show the same display name while the sim reports stable
 * side keys. The sub is always the shared reason line.
 */
function sparTitle(
  verdict: Readonly<BattleResult>,
  fight: StampFight | null,
): string {
  if (verdict.winner === null) return "A drawn spar"
  if (!fight) return `Victory — ${verdict.winner}`
  const key = winningSideKey(verdict)
  const mirror = fight.owned.name === fight.rival.name
  if (key === fight.owned.key) {
    return mirror
      ? `Victory — your ${verdict.winner}`
      : `Victory — ${verdict.winner}`
  }
  if (key === fight.rival.key) {
    return mirror
      ? `Victory — rival ${verdict.winner}`
      : `Victory — ${verdict.winner}`
  }
  return `Victory — ${verdict.winner}`
}

/**
 * Cup wording: outcome-first, name-qualified for ordinary fights and
 * side-qualified for mirror names. A cup stamp is always cast, so a null fight
 * is only a defensive path — with no owned side to credit, it reads defeat.
 */
function cupTitle(
  verdict: Readonly<BattleResult>,
  fight: StampFight | null,
): string {
  if (verdict.winner === null) return "A draw"
  if (!fight) return "Defeat"
  if (fight.owned.name !== fight.rival.name) {
    return verdict.winner === fight.owned.name ? "Victory" : "Defeat"
  }
  return winningSideKey(verdict) === fight.owned.key
    ? "Victory — your fighter"
    : "Defeat — the rival"
}

/** Shared stamp copy for the spar and cup battle verdict surfaces. */
export function battleStampCopy(input: {
  verdict: Readonly<BattleResult>
  fight: StampFight | null
  flow: "spar" | "cup"
}): VerdictCopy {
  const { verdict, fight, flow } = input
  return Object.freeze({
    title:
      flow === "spar" ? sparTitle(verdict, fight) : cupTitle(verdict, fight),
    sub: reasonLine(verdict),
  })
}

/**
 * Cup results-card copy from the already-derived outcome, player, cup name and
 * champion name. Placement, rewards and winner state stay in `resultsView`.
 */
export function cupResultCopy(input: {
  won: boolean
  player: string
  cupName: string
  championName: string | null
}): VerdictCopy {
  const { won, player, cupName, championName } = input
  return Object.freeze({
    title: won ? "Champion" : "Eliminated",
    sub: won
      ? `${player} takes the ${cupName}!`
      : championName
        ? `${championName} takes the ${cupName}.`
        : "The cup ends without a champion.",
  })
}
