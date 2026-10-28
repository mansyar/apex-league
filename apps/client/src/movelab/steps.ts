import {
  getMove,
  PLAYBACK_BEATS,
  PLAYBACK_PHASES,
  type PlaybackStep,
  type PlaybackStepKind,
} from "@apex/sim"

/**
 * Move Lab step fabrication (elemental-identity FR-8): builds the
 * `PlaybackStep` queue the lab feeds to `staging.applyStep`, so every
 * catalog move is triggerable with no sim, no AI, and no feed-timing
 * races. Projectile rows stage as approach (far only) + launch + impact;
 * point-blank range replays from the impact step so the unified-fire
 * compressed body runs, exactly like a production point-blank special.
 */

/** Lab range toggle: how far apart the fighters start the trigger. */
export type LabRange = "far" | "close" | "point-blank"

/** Who fights in the lab bowl: fixed display names, stable side keys. */
export interface LabCast {
  readonly attacker: string
  readonly attackerKey: string
  readonly defender: string
  readonly defenderKey: string
}

export const LAB_CAST: LabCast = {
  attacker: "Lab Attacker",
  attackerKey: "home",
  defender: "Lab Defender",
  defenderKey: "away",
}

function baseStep(
  kind: PlaybackStepKind,
  tick: number,
  moveId: string,
  cast: LabCast,
): PlaybackStep {
  const move = getMove(moveId)
  return {
    tick,
    kind,
    actor: cast.attacker,
    actorKey: cast.attackerKey,
    target: cast.defender,
    moveId,
    element: move?.element,
    damage: move?.power ?? 6,
    hit: kind === "impact" ? true : undefined,
    hpAfter: {},
    line: `Move Lab: ${move?.displayName ?? moveId}`,
    beats: PLAYBACK_BEATS[kind],
    phases: PLAYBACK_PHASES[kind],
  }
}

/**
 * The staging queue for one lab trigger. Far closes with an approach
 * step first; close fires from the launch; point-blank replays the
 * launch body compressed from the impact step alone.
 */
export function labStepsFor(
  moveId: string,
  range: LabRange,
  cast: LabCast = LAB_CAST,
  tick = 1,
): PlaybackStep[] {
  const launch = baseStep("projectile", tick, moveId, cast)
  const impact = baseStep("impact", tick, moveId, cast)
  if (range === "point-blank") return [impact]
  if (range === "close") return [launch, impact]
  return [baseStep("approach", tick, moveId, cast), launch, impact]
}
