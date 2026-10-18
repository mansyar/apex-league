import type { CreatureConditions } from "@apex/sim"
import type { Stage } from "@apex/voxel"
import type * as THREE from "three"
import type { PetVariant } from "../scene-logic"

/** Registered swayers: {group, baseAmp, phase} attached at scatter
 * time, advanced per tick as a runtime transform. Rocks and the food
 * pile never register (amplitude 0); rebuilt on every re-scatter. */
export interface Swayer {
  group: THREE.Group
  baseAmp: number
  phase: number
}

export interface RanchMotionDeps {
  scene: THREE.Scene
  /** Dispose + detach a scene-owned group (the scene's disposeGroup). */
  disposeGroup(group: THREE.Group): void
  /**
   * Report the creature's post-update spot for the soft camera track
   * (orbit-camera.track). Called only on frames the creature moved logic.
   */
  onCreatureMoved(away: boolean, x: number, z: number, dt: number): void
  /** Food-pile anchor (world units) the feed ceremony walks toward. */
  pileX: number
  pileZ: number
}

export interface RanchMotion {
  /** The creature's holder group, or null before the first rebuild. */
  readonly group: THREE.Group | null
  /** Build a creature rig (archetype + seed + stage). */
  rebuild(archetypeId: string, seed: number, stage: Stage): void
  /** Drive the condition visual states from the creature's conditions. */
  updateConditions(conditions: CreatureConditions | null): void
  /** Momentary droopy window (cup early exit). */
  droopyMoment(durationMs?: number): void
  /** Begin the feed ceremony (aborts any in-flight wander trip). */
  startFeed(): void
  /** Begin the rest ceremony: curl down where the creature stands, a
   * deep-sleep hold, then a wake-and-stretch (ranch_rituals_20261018
   * FR3). Preempts any in-flight walk or wander trip. */
  startRest(): void
  /** Begin the treat ceremony: settle into a subdued slump, a balm moment
   * with a relief sparkle burst, then recover (ranch_rituals_20261018
   * FR4). Preempts any in-flight walk, wander, or rest. */
  startTreat(): void
  /** Begin the play ceremony: toss the ball out, chase it, bop it further,
   * trot home and celebrate with happy hops (ranch_rituals_20261018 FR5).
   * Preempts rest/treat/wander; later feed/evolution preempt it. */
  startPlay(): void
  /**
   * Pet the creature (ranch_rituals_20261018 FR6): pick a mood-aware
   * reaction and play it. Returns the variant that started, or `null` when
   * the pet was ignored — a ceremony owns the creature, it is still
   * reacting, or the spam cooldown has not elapsed. Presentation-only: no
   * sim state is touched.
   */
  startPet(): PetVariant | null
  /** Begin the evolution ceremony (juvenile→champion or baby→juvenile)
   * from the current pose; the swap rebuilds to the target stage. `onDone`
   * fires once the machine has settled — the cue that the ceremony is over
   * (the legacy send-off opens its egg screen on it, never on a timer, so
   * a long walk can't be cut short). It survives a ceremony that a plain
   * rebuild cancels, so a pending send-off still completes. */
  startEvolution(
    archetypeId: string,
    seed: number,
    targetStage: Stage,
    onDone?: () => void,
  ): void
  /** A plain rebuild cancels an in-flight evolution ceremony. */
  clearEvolution(): void
  /** Drop all registered swayers + wander candidates (re-scatter). */
  resetProps(): void
  /** Attach a scattered prop: sway registration + wander candidates. */
  registerSway(propId: string, prop: THREE.Group): void
  /** Publish the accumulated wander candidates to the wanderer (FR3). */
  commitProps(): void
  /** Rebuild the idle machines for a reduced-motion flip. */
  setReducedMotion(reduced: boolean): void
  /**
   * Per-frame update. `ranchActive` is false in arena mode — the creature
   * is hidden and its machines must park (the "camera thrown away
   * mid-fight" bug). Wind sway advances every frame regardless.
   */
  update(t: number, dt: number, ranchActive: boolean): void
  /** Release the creature rig. */
  dispose(): void
}
