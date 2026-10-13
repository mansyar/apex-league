import {
  type CreatureConditions,
  EXHAUSTED_ENERGY,
  type LifeStage,
  SICK_HEALTH,
} from "@apex/sim"
import { generate, makeRng, type Stage } from "@apex/voxel"
import * as THREE from "three"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js"
import { buildCreatureGroup } from "./creature"
import type { CameraIntent } from "./director"
import { prefersReducedMotionOs } from "./motion"
import { buildPropGroup } from "./prop"
import {
  arenaFramingAdjust,
  BABY_SCALE,
  createEvolutionCeremony,
  createWalk,
  createWander,
  type GaitPose,
  gaitPose,
  JUVENILE_SCALE,
  phaseHash,
  swayAngle,
  type WanderDrive,
  windBaseAmp,
} from "./scene-logic"
import { disposeObject3D } from "./scene-utils"

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

const GROUND_COLOR = 0x3a4d34

/**
 * Broadcast camera framing the ranch orbit hands over to during a fight:
 * a fixed side-elevated wide shot that keeps both ends of the show floor
 * (STAGE bounds ±3.4 on X, ±2 on Z) in frame with margin. 2026-10-11:
 * widened after live feedback — no fighter leaves the camera's view.
 */
const ARENA_FRAMING = {
  azimuth: 0.12,
  elevation: 0.55,
  radius: 12.5,
  targetY: 0.9,
} as const

/** Base vertical FOV; narrow viewports widen the lens on top of this
 * (see arenaFramingAdjust). */
const BASE_FOV = 45

/**
 * Ranch environment palette (golden hour). The ranch reads as late
 * afternoon: amber light pooling at the horizon, cooling to navy
 * overhead, with a warm key sun and a cool rim to silhouette the
 * creature. These four tones are the identity of the ranch look —
 * retune them together, never one alone.
 */
const SKY_HORIZON = 0xd98c4a // dusk amber, pools at the horizon
export const RANCH_SKY = SKY_HORIZON
const SKY_TOP = 0x1a1f2e // navy, cools the sky overhead
const KEY_COLOR = 0xffd9a0 // warm low sun
const RIM_COLOR = 0x8fb4d9 // cool skylight from the far side

/** Visual idle modes derived from the creature's conditions. */
type MoodMode = "normal" | "sluggish" | "droopy" | "happy"

interface MoodProfile {
  breathRate: number
  breathAmp: number
  headDroop: number
  bounce: number
}

const MOOD_PROFILES: Record<MoodMode, MoodProfile> = {
  normal: { breathRate: 2, breathAmp: 0.035, headDroop: 0, bounce: 0 },
  // Low energy: slow, shallow breathing — the creature is dragging through the day.
  sluggish: { breathRate: 0.9, breathAmp: 0.015, headDroop: 0.02, bounce: 0 },
  // Sick: head hangs, breath weak.
  droopy: { breathRate: 1.2, breathAmp: 0.02, headDroop: 0.06, bounce: 0 },
  // High mood: lively breath and a periodic happy bounce.
  happy: { breathRate: 2.6, breathAmp: 0.035, headDroop: 0, bounce: 0.08 },
}

function moodModeFrom(conditions: CreatureConditions): MoodMode {
  if (conditions.health < SICK_HEALTH) return "droopy"
  if (conditions.energy <= EXHAUSTED_ENERGY) return "sluggish"
  if (conditions.mood >= 80) return "happy"
  return "normal"
}

/**
 * Bootstrap the 3D scene: camera, lights, ground, and the owned creature
 * performing condition-driven procedural idles via the part-hierarchy rig.
 */
export function createScene(container: HTMLElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()

  // Golden-hour sky: a dome with a vertical gradient from the amber
  // horizon up to navy, replacing the flat color background. The dome
  // has no fog of its own — it IS the horizon color the ground fades into.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40, 16, 12),
    new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color(SKY_TOP) },
        horizon: { value: new THREE.Color(SKY_HORIZON) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 top;
        uniform vec3 horizon;
        void main() {
          // Amber pools at the horizon, cools to navy overhead. The ramp
          // is steep because the orbit camera looks slightly down — only
          // the low band of the dome is ever on screen.
          float h = normalize(vPos).y;
          float t = pow(clamp(h * 2.4, 0.0, 1.0), 0.85);
          gl_FragColor = vec4(mix(horizon, top, t), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  )
  scene.add(sky)

  // Linear fog in the horizon tone: distant ground dissolves into the
  // sunset while the creature (always well inside the near plane) stays
  // crisp even at maximum zoom-out.
  scene.fog = new THREE.Fog(SKY_HORIZON, 16, 30)

  // F6 (responsive_foundation_20261013): the broadcast framing was tuned
  // for wide desktop viewports; narrow/portrait ones crop the stage
  // corners out of frame. Back the arena shot off and widen the lens,
  // recomputed on resize (onResize). Applies to the whole camera, so the
  // ranch also shows more world on tall screens.
  let arenaAdjust = arenaFramingAdjust(
    container.clientWidth / (container.clientHeight || 1),
  )
  let arenaRadius = ARENA_FRAMING.radius * arenaAdjust.radiusMult

  const camera = new THREE.PerspectiveCamera(
    BASE_FOV + arenaAdjust.fovAdd,
    container.clientWidth / (container.clientHeight || 1),
    0.1,
    100,
  )

  // -- Bloom post pass (FR7) --------------------------------------------------
  // Arena-only post processing: bright additive VFX (projectile glows,
  // hit flashes, bursts) bloom softly over the dark show floor. Built
  // defensively - a weak GPU or missing addon support degrades to the
  // plain renderer instead of breaking the game.
  let composer: EffectComposer | null = null
  try {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.32,
        0.4,
        0.72,
      ),
    )
    composer.setSize(container.clientWidth, container.clientHeight)
  } catch {
    composer = null
  }

  // Drag-to-orbit camera around the creature, so the idles can be
  // inspected from any angle. Wheel zooms, clamped to sane distances.
  // While a fight plays the camera is a broadcast pit member: fixed
  // framing, no orbit input.
  type CameraMode = "ranch" | "arena"
  let cameraMode: CameraMode = "ranch"
  // -- Cinematic director (FR6) ----------------------------------------------
  type ArenaStyle = "broadcast" | "cinematic"
  let arenaStyle: ArenaStyle = "broadcast"
  let directorIntent: CameraIntent | null = null
  let intentAt = 0
  // Scratch vectors for the director ease (no per-frame allocations).
  const directorDesired = new THREE.Vector3()
  const directorLook = new THREE.Vector3()
  let savedOrbit = { azimuth: 0, elevation: 0, radius: 0 }
  const target = new THREE.Vector3(0, 0.8, 0)
  const orbit = { azimuth: 0.567, elevation: 0.326, radius: 6.9 }
  // Reusable scratch vector for the soft camera track (no per-frame alloc).
  const focusPoint = new THREE.Vector3()
  const clamp = (v: number, lo: number, hi: number): number =>
    Math.min(Math.max(v, lo), hi)
  const applyOrbit = (): void => {
    camera.position.set(
      target.x +
        orbit.radius * Math.cos(orbit.elevation) * Math.sin(orbit.azimuth),
      target.y + orbit.radius * Math.sin(orbit.elevation),
      target.z +
        orbit.radius * Math.cos(orbit.elevation) * Math.cos(orbit.azimuth),
    )
    camera.lookAt(target)
  }
  applyOrbit()

  /** Hand the camera over to the broadcast pit (and back). */
  const setCameraMode = (mode: CameraMode): void => {
    if (cameraMode === mode) return
    cameraMode = mode
    // A mode change re-frames the camera outright; drop any live shake
    // so a stale anchor can't fight the new framing.
    shakeAmp = 0
    shakeBase = null
    if (mode === "arena") {
      savedOrbit = { ...orbit }
      orbit.azimuth = ARENA_FRAMING.azimuth
      orbit.elevation = ARENA_FRAMING.elevation
      orbit.radius = arenaRadius
      // The arena is centered at the world origin — a ranch camera that
      // was soft-tracking a wandering creature must not carry that aim
      // offset into the broadcast framing.
      target.set(0, ARENA_FRAMING.targetY, 0)
    } else {
      Object.assign(orbit, savedOrbit)
      // Reset the full aim, not just the height - a cinematic director
      // may have left the target tracking a fighter.
      target.set(0, 0.8, 0)
    }
    applyOrbit()
  }

  let dragging = false
  let lastX = 0
  let lastY = 0
  const onPointerDown = (e: PointerEvent): void => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }
  const onPointerMove = (e: PointerEvent): void => {
    if (!dragging || cameraMode !== "ranch") return
    orbit.azimuth -= (e.clientX - lastX) * 0.005
    orbit.elevation = clamp(
      orbit.elevation + (e.clientY - lastY) * 0.005,
      0.05,
      1.45,
    )
    lastX = e.clientX
    lastY = e.clientY
    applyOrbit()
  }
  const onPointerUp = (): void => {
    dragging = false
  }
  const onWheel = (e: WheelEvent): void => {
    if (cameraMode !== "ranch") return
    orbit.radius = clamp(
      orbit.radius * (1 + Math.sign(e.deltaY) * 0.1),
      2.5,
      14,
    )
    applyOrbit()
  }
  const canvas = renderer.domElement
  canvas.addEventListener("pointerdown", onPointerDown)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  canvas.addEventListener("wheel", onWheel)

  // Lighting rig: warm key from the sun side, cool rim from the far
  // side to keep shadowed voxels readable. A hemisphere ramp gives the
  // creature amber light from above sky and a muted cool bounce from
  // the moss below — the golden-hour bounce that makes the character read.
  const ambient = new THREE.AmbientLight(0xbcc7d6, 0.3)
  const hemi = new THREE.HemisphereLight(0xe8ab72, 0x3a4a44, 1.15)
  const sun = new THREE.DirectionalLight(KEY_COLOR, 2.0)
  sun.position.set(4, 6, 2)
  const rim = new THREE.DirectionalLight(RIM_COLOR, 0.5)
  rim.position.set(-5, 3, -4)
  scene.add(ambient, hemi, sun, rim)
  // Ranch rig intensities kept so the set can be cross-faded away when the
  // arena takes over (arena blend drives its own rig from zero).
  const RANCH_RIG = {
    ambient: ambient.intensity,
    hemi: hemi.intensity,
    sun: sun.intensity,
    rim: rim.intensity,
  } as const

  // Real drop-in shadows: the creature's parts cast, the ground receives.
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  // Palettes are hand-tuned for a linear response; tone mapping stays off
  // explicitly so a three.js default flip can't silently retune the look.
  renderer.toneMapping = THREE.NoToneMapping
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -9
  sun.shadow.camera.right = 9
  sun.shadow.camera.top = 9
  sun.shadow.camera.bottom = -9
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 20

  // Mossy ground: a disc as wide as the sky dome, so the moss always
  // runs to the horizon and meets the dome at its equator — there is no
  // visible ground edge to dissolve. Fog takes over at distance.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshLambertMaterial({ color: GROUND_COLOR }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  // The mossy ground belongs to the ranch set: arena views dissolve the
  // horizon into fog, not moss.
  ground.name = "ranch-ground"

  // Honor reduced motion: keep the gentle breath, drop the bounce.
  const osReducedMotion = prefersReducedMotionOs()
  /** Save v5 pref wins when set; null defers to the OS media query. */
  let motionReduced: boolean | null = null
  /**
   * Live effective motion flag — re-derived by setMotionReduced. The idle
   * machines below capture it at creation and are rebuilt on a flip, so
   * every consumer reads a current value.
   */
  let reducedMotion = osReducedMotion

  let creatureGroup: THREE.Group | null = null
  /** Rig part refs cached at setCreature time (avoids per-frame lookups). */
  let rigParts: {
    body?: THREE.Object3D
    head?: THREE.Object3D
    tail?: THREE.Object3D
    tailTip?: THREE.Object3D
  } = {}
  let ranchScenery: THREE.Group | null = null
  let scenerySeed = -1
  let foodPile: THREE.Group | null = null
  let fedTodayVisible = false
  let ranchBlendK = 1
  let mode: MoodMode = "normal"
  /** Last conditions seen by updateConditions, so a momentary idle window
   * (cup early exit) can restore the condition-driven mode when it ends. */
  let lastConditions: CreatureConditions | null = null
  /** performance.now() deadline of the momentary droopy window; 0 = none. */
  let droopyUntil = 0
  let headBaseY = 0
  /** Life stage of the current ranch creature (picks the static holder
   * scale when no ceremony is driving). */
  let currentStage: Stage = "baby"

  // -- Feeding ceremony (FR2) -------------------------------------------------
  // The creature's home anchor is the origin where it idles; the food pile
  // is a fixed landmark. Ceremony visuals translate/rotate the creature as a
  // runtime transform only — the sim is untouched.
  const pilePos = new THREE.Vector3(-2.4, 0, 0.4)
  let walk = createWalk(reducedMotion)
  /** Sparse wanderer (FR3). Created per creature in setCreature (it needs
   * the visual seed); null before that and after dispose. */
  let wander: ReturnType<typeof createWander> | null = null
  /** The visual seed the wanderer was built with (setMotionReduced rebuilds). */
  let wanderSeed = 0
  /** Tuft/bush world positions the wanderer may visit (rebuilt on scatter). */
  const wanderCandidates: { x: number; z: number }[] = []

  // -- Evolution ceremony (baby → juvenile, spec R5) ---------------------------
  // The machine drives the walk-to-center, the glow swell, and the one-frame
  // swap signal; the scene owns the actual rig rebuild and the glow paint.
  let evolution = createEvolutionCeremony()
  /** The juvenile rebuild the ceremony's swap frame should perform. */
  let evolutionSwap: { archetypeId: string; seed: number } | null = null

  /** Paint the glow: emissive lift on every mesh of the current rig. The
   * decay tail writes the materials back to black before the machine goes
   * idle, so no explicit reset is needed. */
  const applyGlow = (group: THREE.Object3D, intensity: number): void => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshLambertMaterial
        mat.emissive?.setScalar(intensity * 0.85)
      }
    })
  }

  /** Build a creature rig (archetype + seed + stage) with the visual-center
   * holder contract and the stage's world scale. Extracted from setCreature
   * so the evolution ceremony's swap reuses the exact same path. */
  const rebuildCreature = (
    archetypeId: string,
    seed: number,
    stage: Stage,
  ): void => {
    if (creatureGroup) disposeGroup(creatureGroup)
    const { dna, build, def } = generate(archetypeId, seed, stage)
    // The rig is built in voxel GRID units inside an inner group that
    // carries the tiny world scale — children positions are ~20× larger
    // than world units, so mutating them to re-anchor went wrong by that
    // factor (the visible mass kept sitting ~1.7 units off the origin and
    // every yaw pivot swung the body around a distant axis — user-reported
    // "arc/turn that moves the position"). Instead: keep the rig untouched
    // inside its scaled group, measure the visual center of the WHOLE
    // creature, and wrap it in an identity-scale holder whose child offset
    // (in true world units) places the visual center on the holder origin.
    // All motion code drives the holder afterwards. The stage scale lives
    // on the holder too (never on rig children — learnings.md), so babies
    // measure the same visual center the adult would.
    const inner = buildCreatureGroup(dna, build, def.grid)
    inner.updateMatrixWorld(true)
    const innerBox = new THREE.Box3().setFromObject(inner)
    const center = innerBox.getCenter(new THREE.Vector3())
    const rig = new THREE.Group()
    rig.add(inner)
    inner.position.set(-center.x, 0, -center.z)
    rig.scale.setScalar(stage === "baby" ? BABY_SCALE : JUVENILE_SCALE)
    creatureGroup = rig
    currentStage = stage
    rig.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.castShadow = true
    })
    scene.add(rig)
    // Cache the rig part refs once per build — the idle loop would
    // otherwise run five O(n) scene-graph searches every frame.
    rigParts = {
      body: rig.getObjectByName("body") ?? undefined,
      head: rig.getObjectByName("head") ?? undefined,
      tail: rig.getObjectByName("tail") ?? undefined,
      tailTip: rig.getObjectByName("tailTip") ?? undefined,
    }
    // One wanderer per scene lifetime (FR3): rebuilding the creature (day
    // advance, training) pauses the machine — the 20–40 s rhythm survives
    // visual rebuilds instead of restarting. A feed ceremony still aborts
    // it cleanly via startFeedCeremony.
    if (wander) {
      wander.pause()
    } else {
      wander = createWander(reducedMotion, seed)
    }
    wanderSeed = seed
    // headBaseY stays in the head's LOCAL units — the tick writes it back
    // to head.position.y in the same space (the rig runs in grid units).
    headBaseY = rig.getObjectByName("head")?.position.y ?? 0
  }
  /** How deep the nibble head-dips go (in the head pivot's local units —
   * the rig runs in grid units, so this scales with the creature). */
  const DIP_DEPTH = 1.2
  /** Standing spot near the pile, on the creature→pile line, chosen at
   * start by startFeedCeremony. */
  let standX = 0
  let standZ = 0
  /** Previous tick's time, for the clamped walk step. */
  let lastT = 0

  const smoothstep = (k: number): number => k * k * (3 - 2 * k)

  /** Map a gait pose onto the creature rig: hip-pivot swings, weight-shift
   * roll on the body, and the walk bob as the creature's ground height.
   * Called every frame with a zero pose outside walks, so pivots always
   * come back to rest. */
  const applyGait = (creature: THREE.Group, pose: GaitPose): void => {
    const setLeg = (name: string, angle: number): void => {
      const pivot = creature.getObjectByName(name)
      if (pivot) pivot.rotation.x = angle
    }
    setLeg("legFL", pose.fl)
    setLeg("legBR", pose.br)
    setLeg("legFR", pose.fr)
    setLeg("legBL", pose.bl)
    const body = creature.getObjectByName("body")
    if (body) body.rotation.z = pose.roll
    creature.position.y = pose.bob
  }

  /** Registered swayers: {group, baseAmp, phase} attached at scatter
   * time, advanced per tick as a runtime transform. Rocks and the food
   * pile never register (amplitude 0); rebuilt on every re-scatter. */
  interface Swayer {
    group: THREE.Group
    baseAmp: number
    phase: number
  }
  let windProps: Swayer[] = []
  let windSalt = 0

  const disposeGroup = (group: THREE.Group): void => {
    disposeObject3D(group)
    scene.remove(group)
  }

  /** Broadcast punch: kick a decaying camera shake of the given strength. */
  let shakeAmp = 0
  let shakePhase = Math.PI * 2 * Math.random()
  /**
   * The camera's resting position when the shake began. The shake writes
   * position = base + offset every frame (never `+=`), so the residual
   * can't random-walk the broadcast framing off its mark.
   */
  let shakeBase: THREE.Vector3 | null = null
  const SHAKE_DECAY_PER_S = 4.2
  const SHAKE_FREQ = 26
  const setShake = (strength: number): void => {
    if (shakeAmp <= 0.001) shakeBase = camera.position.clone()
    if (strength > shakeAmp) shakeAmp = strength
    if (shakeAmp > 0) shakePhase = Math.PI * 2 * Math.random()
  }

  /**
   * Attach a prop to the wind list if its class sways (tuft, bush,
   * broadleaf tree; landmark trees use the same rule). Phase comes from
   * a seeded hash of the prop's world position — each prop sways on its
   * own clock, no shared uniform. Zero-amplitude ids (rocks, food pile)
   * never register.
   */
  const registerSway = (propId: string, prop: THREE.Group): void => {
    // Wander candidates (FR3): tufts and bushes are legitimate visit
    // spots; rocks, trees, and the food pile never register.
    if (propId === "tuft" || propId === "bush") {
      wanderCandidates.push({ x: prop.position.x, z: prop.position.z })
    }
    const baseAmp = windBaseAmp(propId)
    if (baseAmp <= 0) return
    windProps.push({
      group: prop,
      baseAmp,
      phase: phaseHash(prop.position.x, prop.position.z, windSalt++),
    })
  }

  const handle: SceneHandle = {
    sceneRoot: scene,
    setCameraMode,
    shake: setShake,
    /** Choose the arena camera style (FR6). */
    setArenaCameraStyle(style: ArenaStyle) {
      if (style === arenaStyle) return
      arenaStyle = style
      if (style === "broadcast") {
        // Leaving cinematic: nothing else writes the camera in broadcast
        // arena mode, so re-frame NOW or the shot freezes at the last
        // director pose until the fight ends.
        target.set(0, ARENA_FRAMING.targetY, 0)
        applyOrbit()
        directorIntent = null
      }
    },
    /** Feed the director's latest shot; stale intents settle to broadcast. */
    applyDirectorIntent(intent: CameraIntent) {
      directorIntent = intent
      intentAt = performance.now()
    },
    setMotionReduced(v) {
      motionReduced = v
      const next = motionReduced ?? osReducedMotion
      if (next === reducedMotion) return
      reducedMotion = next
      shakeAmp = 0
      // The idle machines captured the previous flag at creation; rebuild
      // them so the new motion mode applies immediately (the wanderer
      // pauses its rhythm, the walk restarts from home — an accessibility
      // flip legitimately resets ornamental motion).
      walk = createWalk(reducedMotion)
      if (wander) {
        wander.pause()
        wander = createWander(reducedMotion, wanderSeed)
      }
    },
    /** Cross-fade the ranch "set" (rig, sunset dome, ground, scenery). */
    setRanchBlend(k) {
      const blend = Math.min(1, Math.max(0, k))
      ranchBlendK = blend
      ambient.intensity = RANCH_RIG.ambient * blend
      hemi.intensity = RANCH_RIG.hemi * blend
      sun.intensity = RANCH_RIG.sun * blend
      rim.intensity = RANCH_RIG.rim * blend
      sky.visible = blend > 0.001
      ground.visible = blend > 0.001
      if (ranchScenery) ranchScenery.visible = blend > 0.001
      if (foodPile) foodPile.visible = fedTodayVisible && blend > 0.5
    },
    dispose() {
      if (creatureGroup) disposeGroup(creatureGroup)
      cancelAnimationFrame(raf)
      composer?.dispose()
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("wheel", onWheel)
      // Free every geometry/material on the scene to avoid GPU leaks when
      // scenes are swapped (ranch <-> arena later).
      disposeObject3D(scene)
      renderer.dispose()
      renderer.domElement.remove()
    },
    setCreature(archetypeId, seed, stage = "baby") {
      rebuildCreature(archetypeId, seed, stage === "baby" ? "baby" : "juvenile")
      // A plain rebuild cancels an in-flight evolution ceremony (the new
      // mesh already reflects the caller's intent); the ceremony's own
      // swap calls rebuildCreature directly, so it survives.
      evolutionSwap = null
      evolution = createEvolutionCeremony()
    },
    startEvolutionCeremony(archetypeId, seed) {
      if (!creatureGroup) return
      // Preempt an in-flight feed walk (the growth moment takes over) and
      // abandon any wander trip, then begin from the current pose.
      walk = createWalk(reducedMotion)
      wander?.abort()
      evolutionSwap = { archetypeId, seed }
      evolution.begin(creatureGroup.rotation.y, reducedMotion)
    },
    setProps(visualSeed) {
      if (scenerySeed === visualSeed) return
      scenerySeed = visualSeed
      if (ranchScenery) disposeGroup(ranchScenery)
      windProps = []
      windSalt = 0
      wanderCandidates.length = 0
      const scenery = new THREE.Group()
      scenery.name = "ranch-scenery"
      const rng = makeRng(visualSeed)
      const scatter = (propId: string, angle: number, radius: number): void => {
        const prop = buildPropGroup(propId, rng.int(2 ** 30))
        prop.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
        prop.rotation.y = rng.next() * Math.PI * 2
        registerSway(propId, prop)
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
        registerSway(propId, prop)
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
      wander?.setCandidates(wanderCandidates)
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
      lastConditions = conditions
      // An active momentary droopy window owns the mode until it expires.
      if (droopyUntil === 0 || performance.now() >= droopyUntil) {
        mode = conditions ? moodModeFrom(conditions) : "normal"
      }
    },
    droopyMoment(durationMs = 6000) {
      mode = "droopy"
      droopyUntil = performance.now() + durationMs
    },
    startFeedCeremony() {
      if (!creatureGroup) return
      // A feed takes the creature over: abandon any in-flight wander trip
      // (FR3 — wander is suspended during the ceremony) and let the
      // ceremony machine drive from the creature's current pose.
      wander?.abort()
      // Straight-line approach: the stand point sits ON the line from the
      // creature's current position to the pile center, stopped 1.15 world
      // units short of the pile so the creature stands just before it and
      // faces it — the shortest way, exactly as specified. (Reduced motion
      // ignores the stand spot; the machine nibbles in place wherever the
      // creature currently stands.)
      const cx = creatureGroup.position.x
      const cz = creatureGroup.position.z
      const toPileX = pilePos.x - cx
      const toPileZ = pilePos.z - cz
      const dist = Math.hypot(toPileX, toPileZ) || 1
      standX = pilePos.x - (toPileX / dist) * 1.15
      standZ = pilePos.z - (toPileZ / dist) * 1.15
      // The walk starts from wherever the creature currently stands and
      // faces, so successive feeds re-trigger cleanly (non-cancelable
      // policy) and the turn eases instead of snapping.
      walk.begin(cx, cz, standX, standZ, creatureGroup.rotation.y)
    },
    setRanchCreatureVisible(visible) {
      if (creatureGroup) creatureGroup.visible = visible
    },
  }

  const clockStart = performance.now()
  let raf = 0
  let lastFrameT = 0

  const tick = (): void => {
    const t = (performance.now() - clockStart) / 1000
    // Clamped frame delta for the walk machine — a long gap advances at
    // most one clamped step, so phases can never be skipped.
    const dt = Math.min(0.1, Math.max(0, t - lastT))
    lastT = t
    // Momentary droopy window (cup early exit): once it expires, fall back
    // to the condition-driven idle.
    if (droopyUntil !== 0 && performance.now() >= droopyUntil) {
      droopyUntil = 0
      mode = lastConditions ? moodModeFrom(lastConditions) : "normal"
    }
    const profile = MOOD_PROFILES[mode]
    // The ranch block owns the ranch creature AND the soft camera track.
    // Guarded on camera mode: in the arena the ranch creature is hidden
    // but its wander/walk machines would keep running — and the camera
    // track would drag the broadcast framing off the arena toward the
    // invisible wanderer, then ease back when the trip ends. (The
    // "camera thrown away mid-fight" bug.)
    if (creatureGroup && cameraMode === "ranch") {
      // Breathe idle: squash-and-stretch on the body around its HIP-LINE
      // pivot. Scale never moves the pivot, so body voxels at the leg
      // junction stay fixed and the legs remain visually attached; the chest
      // and belly flex above/below it. Horizontal squash is kept small (it
      // slides the body's voxel pattern against the planted legs); the
      // vertical stretch carries the read. Neck/head/horns/tail ride along
      // via the rig hierarchy.
      const breath = Math.sin(t * profile.breathRate)
      const body = rigParts.body
      if (body) {
        body.scale.set(
          1 - breath * profile.breathAmp * 0.3,
          1 + breath * profile.breathAmp,
          1 - breath * profile.breathAmp * 0.3,
        )
      }
      const head = rigParts.head
      if (head) {
        head.position.y =
          headBaseY + breath * profile.breathAmp * 0.6 - profile.headDroop
      }
      const sway = Math.sin(t * 1.3)
      const tail = rigParts.tail
      if (tail) {
        tail.rotation.y = sway * 0.06
      }
      const tailTip = rigParts.tailTip
      if (tailTip) {
        tailTip.rotation.y = sway * 0.12
      }
      // Evolution ceremony (spec R5): while active it owns the creature's
      // pose, scale, and glow outright — the feed walk and the wanderer
      // stay parked (startEvolutionCeremony preempted them). The swap
      // rebuilds the rig to the juvenile build mid-ceremony; afterwards
      // the machine keeps driving the fresh rig until it settles.
      const evo = evolution.advance(
        creatureGroup.position.x,
        creatureGroup.position.z,
        dt,
      )
      const evoActive = evo.active
      let evoGait = false
      if (evoActive) {
        creatureGroup.position.x = evo.x
        creatureGroup.position.z = evo.z
        creatureGroup.rotation.y = evo.yaw
        creatureGroup.scale.setScalar(evo.scale)
        applyGlow(creatureGroup, evo.glow)
        if (evo.swap && evolutionSwap) {
          const swap = evolutionSwap
          evolutionSwap = null
          rebuildCreature(swap.archetypeId, swap.seed, "juvenile")
        }
        evoGait = evo.phase === "walk" && !evo.pivoting
      }
      // Position-driven walk: the machine strides toward its current
      // target (the pile stand spot, then the home anchor) at a constant
      // speed, so a paused tab or a long frame can never strand the body
      // mid-path — the walk simply continues and converges. The gait
      // applies every frame with a zero pose outside walks, so leg pivots
      // and the weight roll always come back to rest.
      let away = evoActive
      if (!evoActive) {
        creatureGroup.scale.setScalar(
          currentStage === "baby" ? BABY_SCALE : JUVENILE_SCALE,
        )
        const wd = walk.advance(
          creatureGroup.position.x,
          creatureGroup.position.z,
          dt,
        )
        if (wd.phase !== "idle") {
          // While walking, the machine owns the creature's pose. While idle
          // it never touches it — a stale machine yaw must never yank the
          // freshly rebuilt idle creature around (user-reported snap).
          creatureGroup.position.x = wd.x
          creatureGroup.position.z = wd.z
          creatureGroup.rotation.y = wd.yaw
        }
        // Sparse wandering (FR3): while the ceremony is idle and the mood is
        // eligible, the wander machine may start a trip to a nearby tuft or
        // bush. A feed ceremony takes priority — startFeedCeremony aborts the
        // wanderer, so the two machines never fight over the creature.
        let wandDrive: WanderDrive | null = null
        if (wd.phase === "idle" && wander) {
          wandDrive = wander.advance(
            creatureGroup.position.x,
            creatureGroup.position.z,
            creatureGroup.rotation.y,
            dt,
            mode !== "droopy",
          )
          if (wandDrive.phase !== "home-idle") {
            creatureGroup.position.x = wandDrive.x
            creatureGroup.position.z = wandDrive.z
            creatureGroup.rotation.y = wandDrive.yaw + wandDrive.lookOffset
          } else {
            wandDrive = null
          }
        }
        const drive = wandDrive ?? wd
        const traveling =
          (drive.phase === "walk-out" || drive.phase === "walk-home") &&
          !drive.pivoting
        const remaining = traveling
          ? Math.hypot(
              drive.targetX - creatureGroup.position.x,
              drive.targetZ - creatureGroup.position.z,
            )
          : 0
        applyGait(
          creatureGroup,
          gaitPose(
            t,
            traveling ? smoothstep(Math.min(1, remaining / 0.6)) : 0,
            reducedMotion,
          ),
        )
        if (wd.phase === "nibble" && head) {
          // 2–3 gentle head-dips toward the pile over the existing pivot.
          head.position.y -= wd.dipOffset * DIP_DEPTH
        }
        if (
          !reducedMotion &&
          drive.phase === "idle" &&
          !wandDrive &&
          profile.bounce > 0
        ) {
          creatureGroup.position.y =
            Math.abs(Math.sin(t * 3.2)) * profile.bounce
        } else {
          creatureGroup.position.y = 0
        }
        away = away || wd.phase !== "idle" || wandDrive !== null
      } else {
        // During the ceremony the legs stride only on the walk phase; the
        // glow/settle phases hold the pose. The holder sits on the ground.
        applyGait(creatureGroup, gaitPose(t, evoGait ? 1 : 0, reducedMotion))
        creatureGroup.position.y = 0
      }
      // Soft camera track: while the creature is in the ceremony or on a
      // wander trip it eases toward the creature's position; the rest of
      // the time it drifts back to the home anchor. Frame-rate independent
      // smoothing — drag and wheel still own the final say over
      // azimuth/elevation/radius.
      focusPoint.set(
        away ? creatureGroup.position.x : 0,
        0.8,
        away ? creatureGroup.position.z : 0,
      )
      target.lerp(focusPoint, 1 - Math.exp(-2.5 * dt))
      applyOrbit()
    }
    // Wind sway: every registered vegetation prop rocks gently around its
    // base, each on its own phase, driven through the gust envelope. Pure
    // runtime rotation — geometry, palettes, and digests are untouched, and
    // reduced-motion flattens every angle to 0.
    for (const w of windProps) {
      const angle = swayAngle(w.baseAmp, w.phase, t, reducedMotion)
      w.group.rotation.x = angle
      w.group.rotation.z = angle * 0.5
    }
    // Broadcast punch: the camera is written back to its pre-shake anchor
    // plus a decaying offset — never accumulated additively — so the
    // broadcast framing survives the shake exactly. Arena-only so the
    // orbit camera stays untouched; freeze-safe (time-based, no dt
    // assumption).
    if (cameraMode === "arena" && shakeAmp > 0.001 && shakeBase) {
      const prev = t - lastFrameT
      const dt = prev > 0 && prev < 0.5 ? prev : 1 / 60
      shakeAmp = Math.max(0, shakeAmp - SHAKE_DECAY_PER_S * dt)
      camera.position.set(
        shakeBase.x + Math.sin(t * SHAKE_FREQ + shakePhase) * shakeAmp,
        shakeBase.y +
          Math.cos(t * SHAKE_FREQ * 1.3 + shakePhase) * shakeAmp * 0.6,
        shakeBase.z,
      )
      if (shakeAmp <= 0.001) {
        camera.position.copy(shakeBase)
        shakeBase = null
      }
    }
    // Cinematic director (FR6): ease (or cut) toward the latest intent.
    // Intents offset the broadcast framing, so a stale or absent intent
    // settles the shot back to the fixed framing. Reduced motion pins
    // the broadcast camera; an active shake owns the frame until it
    // decays so the punch-in can't fight the shake offsets.
    if (
      cameraMode === "arena" &&
      arenaStyle === "cinematic" &&
      !reducedMotion &&
      !(shakeAmp > 0.001 && shakeBase)
    ) {
      const prev = t - lastFrameT
      const dt = prev > 0 && prev < 0.5 ? prev : 1 / 60
      const fresh =
        directorIntent !== null && performance.now() - intentAt < 400
      if (fresh && directorIntent) {
        const intent = directorIntent
        const radius = arenaRadius * intent.radiusMult
        const azimuth = ARENA_FRAMING.azimuth + intent.azimuthDelta
        const elevation = ARENA_FRAMING.elevation + intent.elevationDelta
        directorDesired.set(
          intent.look.x + radius * Math.cos(elevation) * Math.sin(azimuth),
          intent.look.y + radius * Math.sin(elevation),
          intent.look.z + radius * Math.cos(elevation) * Math.cos(azimuth),
        )
        directorLook.set(intent.look.x, intent.look.y, intent.look.z)
        if (intent.cut) {
          camera.position.copy(directorDesired)
          target.copy(directorLook)
        } else {
          // Frame-rate-independent ease (learnings 7). Deliberately slow:
          // a film camera glides between framings; fast panning dizzy.
          const k = 1 - Math.exp(-2 * dt)
          camera.position.lerp(directorDesired, k)
          target.lerp(directorLook, k)
        }
      } else {
        // No live coverage: glide home to the broadcast framing.
        directorLook.set(0, ARENA_FRAMING.targetY, 0)
        const k = 1 - Math.exp(-2 * dt)
        target.lerp(directorLook, k)
        directorDesired.set(
          target.x +
            arenaRadius *
              Math.cos(ARENA_FRAMING.elevation) *
              Math.sin(ARENA_FRAMING.azimuth),
          target.y + arenaRadius * Math.sin(ARENA_FRAMING.elevation),
          target.z +
            arenaRadius *
              Math.cos(ARENA_FRAMING.elevation) *
              Math.cos(ARENA_FRAMING.azimuth),
        )
        camera.position.lerp(directorDesired, k)
      }
      camera.lookAt(target)
    }
    // Bloom rides arena fights only - the ranch keeps its clean look. A
    // runtime composer failure (context loss) degrades to the plain
    // renderer instead of killing the frame loop.
    if (cameraMode === "arena" && composer) {
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
    arenaAdjust = arenaFramingAdjust(w / h)
    arenaRadius = ARENA_FRAMING.radius * arenaAdjust.radiusMult
    // A mid-battle resize must reach the orbit too — the broadcast
    // modes that drive the camera from applyOrbit (motion style,
    // reduced motion) would otherwise hold the stale radius until the
    // mode is re-entered.
    if (cameraMode === "arena") orbit.radius = arenaRadius
    camera.fov = BASE_FOV + arenaAdjust.fovAdd
    camera.updateProjectionMatrix()
    // Refresh the pixel ratio too: browser zoom and monitor moves change
    // devicePixelRatio without recreating the renderer, and the ratio was
    // previously captured once at creation.
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    composer?.setSize(w, h)
  }
  window.addEventListener("resize", onResize)

  return handle
}
