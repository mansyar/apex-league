import type { CreatureConditions, LifeStage } from "@apex/sim"
import { makeRng } from "@apex/voxel"
import * as THREE from "three"
import { resolveMotionPref } from "./motion"
import {
  type ArenaStyle,
  type CameraIntent,
  createOrbitCamera,
} from "./orbit-camera"
import { buildPropGroup } from "./prop"
import { createRanchMotion } from "./ranch-motion"
import { setupRanchScene } from "./scene-setup"
import { disposeObject3D, lambertMaterialOf } from "./scene-utils"

export interface SceneHandle {
  /** Raw three.js scene root, for environment modules (e.g. the arena). */
  readonly sceneRoot: THREE.Scene
  /** Fixed broadcast framing for battle playback (and back to free orbit). */
  setCameraMode(mode: "ranch" | "arena"): void
  /** Cross-fade the ranch set (lighting rig + sunset dome), 1 → 0. */
  setRanchBlend(k: number): void
  /** Stop the render loop and free GPU resources. */
  dispose(): void
  /** Replace (or add) the showcased creature, built from the archetype
   * registry. The stage picks the life-stage variant and its world scale.
   * Takes the sim's LifeStage; champions render as juveniles until their
   * own build lands. */
  setCreature(archetypeId: string, seed: number, stage?: LifeStage): void
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
   * Play the evolution ceremony (baby → juvenile, spec R5): walk to the
   * ranch center, glow and swell, swap the baby rig for the juvenile rig
   * at the pulse's peak, settle. Purely visual — the sim already evolved.
   * Non-cancelable like the feed ceremony; it preempts an in-flight feed
   * walk. Reduced motion swaps in place with no travel or glow.
   */
  startEvolutionCeremony(archetypeId: string, seed: number): void
  /**
   * One droopy idle window (cup early exit, spec FR4): force the droopy
   * profile for a short moment, then fall back to the condition-driven
   * idle. Purely visual — the sim is untouched.
   */
  droopyMoment(durationMs?: number): void
}

/**
 * Bootstrap the 3D scene: camera, lights, ground, and the owned creature
 * performing condition-driven procedural idles via the part-hierarchy rig.
 */
export function createScene(container: HTMLElement): SceneHandle {
  const setup = setupRanchScene(container)
  const { renderer, scene, camera, lights, ranchRig, sky, ground } = setup
  // Mutable because the tick's context-loss fallback can drop the
  // composer mid-session (degrades to the plain renderer).
  let composer = setup.composer

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

  let ranchScenery: THREE.Group | null = null
  let scenerySeed = -1
  let foodPile: THREE.Group | null = null
  let fedTodayVisible = false
  let ranchBlendK = 1

  // -- Feeding ceremony (FR2) -------------------------------------------------
  // The creature's home anchor is the origin where it idles; the food pile
  // is a fixed landmark. Ceremony visuals translate/rotate the creature as a
  // runtime transform only — the sim is untouched.
  const pilePos = new THREE.Vector3(-2.4, 0, 0.4)

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
    pileX: pilePos.x,
    pileZ: pilePos.z,
    onCreatureMoved: (away, x, z, dt) => cameraRig.track(away, x, z, dt),
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
      ranchBlendK = blend
      lights.ambient.intensity = ranchRig.ambient * blend
      lights.hemi.intensity = ranchRig.hemi * blend
      lights.sun.intensity = ranchRig.sun * blend
      lights.rim.intensity = ranchRig.rim * blend
      sky.visible = blend > 0.001
      ground.visible = blend > 0.001
      if (ranchScenery) ranchScenery.visible = blend > 0.001
      if (foodPile) foodPile.visible = fedTodayVisible && blend > 0.5
    },
    dispose() {
      motion.dispose()
      cancelAnimationFrame(raf)
      composer?.dispose()
      window.removeEventListener("resize", onResize)
      cameraRig.dispose()
      // Free every geometry/material on the scene to avoid GPU leaks when
      // scenes are swapped (ranch <-> arena later).
      disposeObject3D(scene)
      renderer.dispose()
      renderer.domElement.remove()
    },
    setCreature(archetypeId, seed, stage = "baby") {
      motion.rebuild(archetypeId, seed, stage === "baby" ? "baby" : "juvenile")
      // A plain rebuild cancels an in-flight evolution ceremony (the new
      // mesh already reflects the caller's intent); the ceremony's own
      // swap calls rebuild directly, so it survives.
      motion.clearEvolution()
    },
    startEvolutionCeremony(archetypeId, seed) {
      motion.startEvolution(archetypeId, seed)
    },
    setProps(visualSeed) {
      if (scenerySeed === visualSeed) return
      scenerySeed = visualSeed
      if (ranchScenery) disposeGroup(ranchScenery)
      motion.resetProps()
      const scenery = new THREE.Group()
      scenery.name = "ranch-scenery"
      const rng = makeRng(visualSeed)
      const scatter = (propId: string, angle: number, radius: number): void => {
        const prop = buildPropGroup(propId, rng.int(2 ** 30))
        prop.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
        prop.rotation.y = rng.next() * Math.PI * 2
        motion.registerSway(propId, prop)
        scenery.add(prop)
      }
      // Seeded vegetation ring: the creature's visualSeed picks each
      // tuft/bush position, variant, and facing. Ground radius keeps the
      // footprint clear (2.2+) and the horizon clear (rho <= 8.8).
      for (let i = 0; i < 16; i++) {
        scatter("tuft", rng.next() * Math.PI * 2, 2.2 + rng.next() * 6.6)
      }
      for (let i = 0; i < 5; i++) {
        scatter("bush", rng.next() * Math.PI * 2, 3.2 + rng.next() * 5.6)
      }
      // Landmark trees and rocks: fixed positions, fixed seeds — the
      // silhouettes the ranch composition hangs on.
      const landmark = (
        propId: string,
        x: number,
        z: number,
        rotY: number,
        seed: number,
      ): void => {
        const prop = buildPropGroup(propId, seed)
        prop.position.set(x, 0, z)
        prop.rotation.y = rotY
        motion.registerSway(propId, prop)
        scenery.add(prop)
      }
      landmark("broadleafTree", -6.5, -4.5, 0.65, 1101)
      landmark("broadleafTree", 3, -5.5, -1.1, 1102)
      landmark("rock", -4.2, -3, 0.3, 2201)
      landmark("rock", 5.6, -4.4, -2.1, 2202)
      landmark("rock", -7.5, -1.6, 1.4, 2203)
      scene.add(scenery)
      ranchScenery = scenery
      // Publish the fresh candidate list to the wanderer (FR3).
      motion.commitProps()
    },
    setFedToday(fedToday) {
      if (!foodPile) {
        foodPile = buildPropGroup("foodPile", 3301)
        foodPile.position.copy(pilePos)
        foodPile.rotation.y = -0.4
        scene.add(foodPile)
      }
      fedTodayVisible = fedToday
      foodPile.visible = fedToday && ranchBlendK > 0.5
    },
    updateConditions(conditions) {
      motion.updateConditions(conditions)
    },
    droopyMoment(durationMs = 6000) {
      motion.droopyMoment(durationMs)
    },
    startFeedCeremony() {
      motion.startFeed()
    },
    setRanchCreatureVisible(visible) {
      if (motion.group) motion.group.visible = visible
    },
  }

  const clockStart = performance.now()
  let raf = 0
  let lastFrameT = 0
  /** Previous tick's time, for the clamped walk step. */
  let lastT = 0

  const tick = (): void => {
    const t = (performance.now() - clockStart) / 1000
    // Clamped frame delta for the walk machine — a long gap advances at
    // most one clamped step, so phases can never be skipped.
    const dt = Math.min(0.1, Math.max(0, t - lastT))
    lastT = t
    // The creature's performing life (mood idles, feed ceremony, wander,
    // evolution) plus the wind sway — all in the ranch-motion module. The
    // ranch creature block is gated on camera mode inside the module: in
    // the arena the hidden creature's machines must not run, and the
    // camera track must not drag the broadcast framing off the arena
    // toward the invisible wanderer (the "camera thrown away mid-fight"
    // bug).
    motion.update(t, dt, cameraRig.mode() === "ranch")
    // Arena camera updates (shake decay + cinematic director ease) live
    // in the orbit-camera module; the tick just feeds the clock.
    {
      const prev = t - lastFrameT
      const frameDt = prev > 0 && prev < 0.5 ? prev : 1 / 60
      cameraRig.updateArena(t, frameDt, reducedMotion)
    }
    // Bloom rides arena fights only - the ranch keeps its clean look. A
    // runtime composer failure (context loss) degrades to the plain
    // renderer instead of killing the frame loop.
    if (cameraRig.mode() === "arena" && composer) {
      try {
        composer.render()
      } catch {
        composer = null
        renderer.render(scene, camera)
      }
    } else renderer.render(scene, camera)
    lastFrameT = t
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  const onResize = (): void => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer?.setSize(w, h)
  }
  window.addEventListener("resize", onResize)

  return handle
}
