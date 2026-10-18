import { createApi } from "./api"
import { createRanchState } from "./state"
import type { RanchMotion, RanchMotionDeps } from "./types"

export type { RanchMotion, RanchMotionDeps } from "./types"

/**
 * The ranch creature's whole performing life, extracted from scene.ts:
 * condition-driven mood idles (breath, droop, bounce), the feed-walk
 * ceremony, the rest ceremony (curl-down sleep + wake-and-stretch, FR3),
 * sparse wandering, the baby→juvenile evolution ceremony, wind
 * sway on scattered props, and the rig rebuild contract. scene.ts wires
 * this unit into the frame loop and the HUD-facing SceneHandle.
 *
 * This file is only the assembly point (ranch_decomposition_20261018):
 * the state lives in state.ts, the frame in frame.ts, the pose writers in
 * poses.ts, the effects in effects.ts, and the ceremony starters in api.ts.
 */
export function createRanchMotion(deps: RanchMotionDeps): RanchMotion {
  return createApi(createRanchState(deps))
}
