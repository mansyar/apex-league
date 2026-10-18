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
import { isTap } from "./scene-logic"
import { setupRanchScene } from "./scene-setup"
import { disposeObject3D } from "./scene-utils"

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
   * ceremony itself instead of guessing at its length.
   */
  startEvolutionCeremony(
    archetypeId: string,
    seed: number,
    targetStage: LifeStage,
    onDone?: () => void,
  ): void
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

export function createScene(
  container: HTMLElement,
  hooks: SceneHooks = {},
): SceneHandle {
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

  // -- Ambient pet (ranch_rituals_20261018 FR6) -------------------------------
  // A tap — not a drag — on the creature pets it. This listener is a pure
  // observer of the same pointer stream the orbit rig consumes: it arms on a
  // canvas press, disarms on release, and never calls preventDefault, so
  // orbit-drag, pinch zoom, and the HUD's plate-head → detail-modal path are
  // all untouched. The tap rule itself is pure (scene-logic.isTap, tested);
  // the mood → reaction pick and its spam cooldown live in ranch-motion.
  const raycaster = new THREE.Raycaster()
  const petNdc = new THREE.Vector2()
  /** The press being tracked, or null when no pet gesture is armed. */
  let petPress: {
    pointerId: number
    x: number
    y: number
    t: number
    multi: boolean
  } | null = null

  /** True when the pointer is over the creature mesh. */
  const petHit = (e: PointerEvent): boolean => {
    const target = motion.group
    const rect = renderer.domElement.getBoundingClientRect()
    if (!target || rect.width === 0 || rect.height === 0) return false
    petNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    // The tap can land between frames, so refresh the camera's world matrix
    // first — otherwise the ray is aimed with the previous frame's pose.
    camera.updateMatrixWorld()
    raycaster.setFromCamera(petNdc, camera)
    return raycaster.intersectObject(target, true).length > 0
  }

  const onPetPointerDown = (e: PointerEvent): void => {
    // The arena has no pet to pet, and a second pointer is a pinch — the
    // gesture is disqualified rather than misread as a tap.
    if (cameraRig.mode() !== "ranch") return
    if (petPress) {
      petPress.multi = true
      return
    }
    petPress = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      multi: false,
    }
  }
  const onPetPointerUp = (e: PointerEvent): void => {
    const press = petPress
    if (!press || press.pointerId !== e.pointerId) return
    petPress = null
    if (press.multi) return
    if (
      !isTap(
        press.x,
        press.y,
        e.clientX,
        e.clientY,
        performance.now() - press.t,
      )
    )
      return
    if (cameraRig.mode() !== "ranch" || !petHit(e)) return
    // Null means the pet was ignored (still reacting, cooling down, or a
    // ceremony owns the creature): no reaction, so no chirp.
    if (motion.startPet()) hooks.onPet?.()
  }
  const onPetPointerCancel = (e: PointerEvent): void => {
    if (petPress?.pointerId === e.pointerId) petPress = null
  }
  renderer.domElement.addEventListener("pointerdown", onPetPointerDown)
  window.addEventListener("pointerup", onPetPointerUp)
  window.addEventListener("pointercancel", onPetPointerCancel)

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
    setPaused(next) {
      // Idempotent: the visibility listener can fire the same state twice
      // (and dispose() must not leave a paused scene unable to ever stop).
      if (next === paused) return
      paused = next
      if (next) {
        cancelAnimationFrame(raf)
        raf = 0
      } else {
        resumedFrame = true
        raf = requestAnimationFrame(tick)
      }
    },
    dispose() {
      motion.dispose()
      cancelAnimationFrame(raf)
      paused = true
      composer?.dispose()
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointerup", onPetPointerUp)
      window.removeEventListener("pointercancel", onPetPointerCancel)
      renderer.domElement.removeEventListener("pointerdown", onPetPointerDown)
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

  const clockStart = performance.now()
  let raf = 0
  let lastFrameT = 0
  /** Previous tick's time, for the clamped walk step. */
  let lastT = 0
  /** Suspended by `setPaused` (hidden tab). */
  let paused = false
  /** The next frame is the first after a resume: its delta is zero. */
  let resumedFrame = false

  const tick = (): void => {
    const t = (performance.now() - clockStart) / 1000
    // Clamped frame delta for the walk machine — a long gap advances at
    // most one clamped step, so phases can never be skipped.
    // A resume reports dt = 0 (F5): the hidden span is not game time, and
    // letting the clamp through would advance the walk by its maximum step
    // the instant the player looked back.
    const dt = resumedFrame ? 0 : Math.min(0.1, Math.max(0, t - lastT))
    resumedFrame = false
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
    try {
      if (cameraRig.mode() === "arena" && composer) {
        try {
          composer.render()
        } catch {
          composer = null
          renderer.render(scene, camera)
        }
      } else renderer.render(scene, camera)
    } catch {
      // A resumed context can still be unusable: report it and stop spinning
      // rather than erroring every frame (F7).
      hooks.onGraphics?.("frame_error")
      return
    }
    lastFrameT = t
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  const onResize = (): void => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    cameraRig.resize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    // Browser zoom and monitor moves change devicePixelRatio without
    // recreating the renderer; refresh it here (F6).
    renderer.setPixelRatio(window.devicePixelRatio)
    composer?.setSize(w, h)
  }
  window.addEventListener("resize", onResize)

  // Graphics failure is a runtime event, not a crash (F7): a lost context
  // parks the loop (the runtime reducer decides how), a restore attempts a
  // resume, and a frame that still throws reports frame_error.
  // preventDefault keeps the canvas alive so the restore event can fire.
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault()
    hooks.onGraphics?.("lost")
  })
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    hooks.onGraphics?.("restored")
  })

  return handle
}
