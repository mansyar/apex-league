import type * as THREE from "three"
import { resolveMotionPref } from "./motion"
import {
  type ArenaStyle,
  type CameraIntent,
  createOrbitCamera,
} from "./orbit-camera"
import { createRanchMotion } from "./ranch/motion"
import { createRanchDressing, PILE_POS } from "./scene/dressing"
import { createSceneFrame } from "./scene/frame"
import { createPetGesture } from "./scene/pet"
import type { SceneHandle, SceneHooks } from "./scene/types"
import { setupRanchScene } from "./scene-setup"
import { disposeObject3D } from "./scene-utils"

export type { SceneHandle, SceneHooks } from "./scene/types"

/**
 * Bootstrap the 3D scene: camera, lights, ground, and the owned creature
 * performing condition-driven procedural idles via the part-hierarchy rig.
 *
 * This file is the composition root (20261020-client-decomposition): the
 * render surface and lighting rig live in `scene-setup.ts`, the seeded
 * dressing in `scene/dressing.ts`, the ambient pet gesture in `scene/pet.ts`
 * and the frame loop in `scene/frame.ts`; `scene/types.ts` owns the exported
 * handle contract.
 */
export function createScene(
  container: HTMLElement,
  hooks: SceneHooks = {},
): SceneHandle {
  const setup = setupRanchScene(container)
  const { renderer, scene, camera, lights, ranchRig, sky, ground } = setup
  // Mutable because the tick's context-loss fallback can drop the
  // composer mid-session (degrades to the plain renderer).
  const composer = { current: setup.composer }

  // Drag-to-orbit camera around the creature, so the idles can be
  // inspected from any angle — and a broadcast pit member while a fight
  // plays (fixed framing, cinematic director, punch shake). All camera
  // state lives in the orbit-camera module.
  const cameraRig = createOrbitCamera(camera, renderer.domElement)

  // Honor reduced motion: keep the gentle breath, drop the bounce.
  /** Save v5 pref wins when set; null defers to the OS media query. */
  let motionReduced: boolean | null = null
  /**
   * Live effective motion flag — re-derived by setMotionReduced. The idle
   * machines capture it at creation and are rebuilt on a flip, so every
   * consumer reads a current value.
   */
  let reducedMotion = resolveMotionPref(motionReduced)

  const disposeGroup = (group: THREE.Group): void => {
    disposeObject3D(group)
    scene.remove(group)
  }

  // The creature's whole performing life — mood idles, the feed ceremony,
  // wandering, evolution, wind sway — lives in the ranch-motion module;
  // the scene wires it into the frame loop and the HUD-facing handle.
  const motion = createRanchMotion({
    scene,
    disposeGroup,
    pileX: PILE_POS.x,
    pileZ: PILE_POS.z,
    onCreatureMoved: (away, x, z, dt) => cameraRig.track(away, x, z, dt),
  })

  // A tap on the creature pets it (ranch_rituals_20261018 FR6).
  const pet = createPetGesture({
    canvas: renderer.domElement,
    camera,
    mode: () => cameraRig.mode(),
    group: () => motion.group,
    startPet: () => motion.startPet(),
    onPet: hooks.onPet,
  })

  // The seeded scenery ring and the food-pile landmark.
  const dressing = createRanchDressing({ scene, motion, disposeGroup })

  // The clamped frame clock, hidden-tab pause and resize wiring.
  const frame = createSceneFrame({
    container,
    renderer,
    scene,
    camera,
    composer,
    motion,
    cameraRig,
    reducedMotion: () => reducedMotion,
    onGraphics: hooks.onGraphics,
  })

  const handle: SceneHandle = {
    sceneRoot: scene,
    setCameraMode: (mode) => cameraRig.setMode(mode),
    shake: (strength) => cameraRig.shake(strength),
    /** Choose the arena camera style (FR6). */
    setArenaCameraStyle(style: ArenaStyle) {
      cameraRig.setArenaStyle(style)
    },
    /** Feed the director's latest shot; stale intents settle to broadcast. */
    applyDirectorIntent(intent: CameraIntent) {
      cameraRig.applyDirectorIntent(intent)
    },
    setMotionReduced(v) {
      motionReduced = v
      const next = resolveMotionPref(motionReduced)
      if (next === reducedMotion) return
      reducedMotion = next
      cameraRig.resetShake()
      // The idle machines captured the previous flag at creation; rebuild
      // them so the new motion mode applies immediately (the wanderer
      // pauses its rhythm, the walk restarts from home — an accessibility
      // flip legitimately resets ornamental motion).
      motion.setReducedMotion(next)
    },
    /** Cross-fade the ranch "set" (rig, sunset dome, ground, scenery). */
    setRanchBlend(k) {
      const blend = Math.min(1, Math.max(0, k))
      lights.ambient.intensity = ranchRig.ambient * blend
      lights.hemi.intensity = ranchRig.hemi * blend
      lights.sun.intensity = ranchRig.sun * blend
      lights.rim.intensity = ranchRig.rim * blend
      sky.visible = blend > 0.001
      ground.visible = blend > 0.001
      dressing.setBlend(blend)
    },
    setPaused(next) {
      frame.setPaused(next)
    },
    dispose() {
      motion.dispose()
      frame.dispose()
      pet.dispose()
      cameraRig.dispose()
      // Free every geometry/material on the scene to avoid GPU leaks when
      // scenes are swapped (ranch <-> arena later).
      disposeObject3D(scene)
      renderer.dispose()
      renderer.domElement.remove()
    },
    setCreature(archetypeId, seed, stage = "baby") {
      motion.rebuild(archetypeId, seed, stage)
      // A plain rebuild cancels an in-flight evolution ceremony (the new
      // mesh already reflects the caller's intent); the ceremony's own
      // swap calls rebuild directly, so it survives.
      motion.clearEvolution()
    },
    startEvolutionCeremony(archetypeId, seed, targetStage, onDone) {
      motion.startEvolution(archetypeId, seed, targetStage, onDone)
    },
    setProps(visualSeed) {
      dressing.setProps(visualSeed)
    },
    setFedToday(fedToday) {
      dressing.setFedToday(fedToday)
    },
    updateConditions(conditions) {
      motion.updateConditions(conditions)
    },
    startFeedCeremony() {
      motion.startFeed()
    },
    startRestCeremony() {
      motion.startRest()
    },
    startTreatCeremony() {
      motion.startTreat()
    },
    startPlayCeremony() {
      motion.startPlay()
    },
    setRanchCreatureVisible(visible) {
      if (motion.group) motion.group.visible = visible
    },
  }

  return handle
}
