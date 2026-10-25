import type { CreatureConditions, LifeStage } from "@apex/sim"
import type * as THREE from "three"
import type { MorningAfterDerivation } from "../morning-after/derive"
import type { CameraIntent } from "../orbit-camera"

/** The ranch scene's HUD-facing contract (moved verbatim from `scene.ts`). */
export interface SceneHandle {
  /** Raw three.js scene root, for environment modules (e.g. the arena). */
  readonly sceneRoot: THREE.Scene
  /** Fixed broadcast framing for battle playback (and back to free orbit). */
  setCameraMode(mode: "ranch" | "arena"): void
  /** Cross-fade the ranch set (lighting rig + sunset dome), 1 → 0. */
  setRanchBlend(k: number): void
  /**
   * Suspend/resume the render loop for a hidden tab (F5). Resume re-anchors
   * the frame clock, so the first frame back reports `dt = 0` and a clamped
   * walk step cannot be advanced across the hidden gap.
   */
  setPaused(paused: boolean): void
  /** Stop the render loop and free GPU resources. */
  dispose(): void
  /** Replace (or add) the showcased creature, built from the archetype
   * registry. The stage picks the life-stage variant and its world scale.
   * Takes the sim's LifeStage; champions render as juveniles until their
   * own build lands. `branch` applies the earned form's accent wash. */
  setCreature(
    archetypeId: string,
    seed: number,
    stage?: LifeStage,
    branch?: string | null,
  ): void
  /** Drive the condition visual states from the owned creature's conditions. */
  updateConditions(conditions: CreatureConditions | null): void
  /**
   * (Re)scatter the ranch scenery from the creature's visual seed. Same
   * seed → identical scatter (determinism gate covered); no-op when the
   * seed is unchanged so HUD updates never churn the props.
   */
  setProps(visualSeed: number): void
  /** Show or hide the food pile (fedToday from the sim). */
  setFedToday(fedToday: boolean): void
  /**
   * Broadcast punch: kick a decaying camera shake of the given strength
   * (arena mode only; reduced-motion callers pass 0). 0 ices it off.
   */
  shake(strength: number): void
  /** Arena camera style (FR6): broadcast framing or the cinematic director. */
  setArenaCameraStyle(style: "broadcast" | "cinematic"): void
  /** Feed the director's latest shot intent (stale intents expire). */
  applyDirectorIntent(intent: CameraIntent): void
  /**
   * Reduced-motion override (save v5 pref). true = no shake, no bounce;
   * null = fall back to the OS media query. Callers may re-apply freely.
   */
  setMotionReduced(reduced: boolean | null): void
  /**
   * The ranch's own star (the idle creature) hides while a battle is on:
   * the fighters already stand on the show floor, and the ranch pose
   * would bleed through the swap.
   */
  setRanchCreatureVisible(visible: boolean): void
  /**
   * Play the feeding ceremony: turn toward the pile, walk to a facing
   * spot, nibble 2–3 dips, walk home. Purely visual — the sim already
   * committed. Non-cancelable (2026-10-10 decision): HUD input applies to
   * the sim immediately but never interrupts the creature's motion; safe
   * to call mid-ceremony (successive feeds re-trigger). Reduced motion
   * plays an in-place nibble at the anchor.
   */
  startFeedCeremony(): void
  /**
   * Play the rest ceremony (ranch_rituals_20261018 FR3): curl down where
   * the creature stands, a deep-sleep hold with slow heavy breathing, then
   * a wake-and-stretch. Purely visual — the sim already committed. It
   * preempts any in-flight walk or wander trip; a later feed/evolution
   * ceremony preempts it in turn. Reduced motion plays a still, shortened
   * sleep with no curl or stretch animation.
   */
  startRestCeremony(): void
  /**
   * Play the treat ceremony (ranch_rituals_20261018 FR4): settle into a
   * subdued slump, a balm moment with a relief sparkle burst overhead,
   * then recover back to the normal stance. Purely visual — the sim
   * already committed. It preempts any in-flight walk, wander, or rest;
   * a later feed/evolution ceremony preempts it in turn. Reduced motion
   * plays a still, shortened slump with no relief pulse.
   */
  startTreatCeremony(): void
  /**
   * Play the play ceremony (ranch_rituals_20261018 FR5): the ball arcs
   * out to a landing spot, the creature chases it, bops it further, trots
   * home and celebrates with happy hops. Purely visual — the sim already
   * committed. It preempts any in-flight rest/treat/wander; a later
   * feed/evolution ceremony preempts it in turn. Reduced motion skips
   * the toss arc, the nudge slide, and the hops — the walk legs carry
   * the whole read.
   */
  startPlayCeremony(): void
  /**
   * Play the evolution ceremony (baby → juvenile, spec R5): walk to the
   * ranch center, glow and swell, swap the baby rig for the juvenile rig
   * at the pulse's peak, settle. Purely visual — the sim already evolved.
   * Non-cancelable like the feed ceremony; it preempts an in-flight feed
   * walk. Reduced motion swaps in place with no travel or glow. `onDone`
   * fires when the machine settles, so callers can sequence off the
   * ceremony itself instead of guessing at its length. `branch` tints the
   * swapped rig with the form the sim just earned.
   */
  startEvolutionCeremony(
    archetypeId: string,
    seed: number,
    targetStage: LifeStage,
    onDone?: () => void,
    branch?: string | null,
  ): void
  /**
   * Begin the postcup morning-after arrival ceremony (FR-2) from the
   * derivation the store banked at finalize: the machine owns the
   * creature from its current pose — the arrival beat, the class pose,
   * the glow, the amplifier beat — and reduced motion jump-cuts straight
   * to the short glow (FR-7). Purely visual; a running ceremony ignores
   * a second begin.
   */
  startMorningAfterCeremony(derivation: MorningAfterDerivation): void
  /**
   * Latch the sim day into the ranch frame: the day tint's night-settle
   * retire reads it (FR-3) — a day 0 default could never retire.
   */
  setRanchDay(day: number): void
}

/**
 * Bootstrap the 3D scene: camera, lights, ground, and the owned creature
 * performing condition-driven procedural idles via the part-hierarchy rig.
 */
/** Graphics events the scene observes on behalf of the runtime reducer (F7). */
export interface SceneHooks {
  onGraphics?: (status: "lost" | "restored" | "frame_error") => void
  /** A tap on the creature started a pet reaction (ranch_rituals FR6). The
   * holster for the chirp: the scene never touches audio itself. */
  onPet?: () => void
}
