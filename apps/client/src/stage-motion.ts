/**
 * Stage-composed motion identity (FR-1). A life stage scales an archetype's
 * presentation amplitudes only. Tempo (the three frequency knobs) is
 * choreographed per archetype and is deliberately left alone; so are the
 * physical footprint and every sim coordinate — those stay owned by
 * `arena-scale.ts` and `roster.ts`.
 *
 * Pure data in, pure frozen data out: no THREE, no DOM, no sim state, so the
 * ranch can reuse this composer in its own stage/calm adapter (FR-4) without
 * re-authoring the ladder.
 */
import type { LifeStage } from "@apex/sim"
import { type BodyProfile, profileFor } from "./choreo"
import { stageScale } from "./scene-logic/stage"

/**
 * Compose an archetype's authored motion identity with a life stage.
 *
 * An absent stage is the neutral factor (`1`) and returns the authored
 * profile unchanged — the rig build still defaults to the baby voxel build,
 * but its motion keeps the archetype's authored amplitudes. Known stages
 * multiply the nine amplitude/weight fields by `stageScale(stage)` while
 * copying `gaitFreq`, `swayFreq` and `breathFreq` verbatim.
 */
export function composeStageProfile(
  archetypeId: string,
  stage?: LifeStage,
): BodyProfile {
  const authored = profileFor(archetypeId)
  const factor = stage === undefined ? 1 : stageScale(stage)
  if (factor === 1) return authored
  return Object.freeze({
    ...authored,
    gaitAmp: authored.gaitAmp * factor,
    leanPitch: authored.leanPitch * factor,
    swayAmp: authored.swayAmp * factor,
    breathAmp: authored.breathAmp * factor,
    hurtMult: authored.hurtMult * factor,
    staggerMult: authored.staggerMult * factor,
    windupMult: authored.windupMult * factor,
    recoilMult: authored.recoilMult * factor,
    strikeMult: authored.strikeMult * factor,
  })
}
