import {
  type CreatureConditions,
  EXHAUSTED_ENERGY,
  SICK_HEALTH,
} from "@apex/sim"
import { generate, makeRng } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"
import { buildPropGroup } from "./prop"

export interface SceneHandle {
  /** Raw three.js scene root, for environment modules (e.g. the arena). */
  readonly sceneRoot: THREE.Scene
  /** Fixed broadcast framing for battle playback (and back to free orbit). */
  setCameraMode(mode: "ranch" | "arena"): void
  /** Cross-fade the ranch set (lighting rig + sunset dome), 1 → 0. */
  setRanchBlend(k: number): void
  /** Stop the render loop and free GPU resources. */
  dispose(): void
  /** Replace (or add) the showcased creature, built from the archetype registry. */
  setCreature(archetypeId: string, seed: number): void
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

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / (container.clientHeight || 1),
    0.1,
    100,
  )

  // Drag-to-orbit camera around the creature, so the idles can be
  // inspected from any angle. Wheel zooms, clamped to sane distances.
  // While a fight plays the camera is a broadcast pit member: fixed
  // framing, no orbit input.
  type CameraMode = "ranch" | "arena"
  let cameraMode: CameraMode = "ranch"
  let savedOrbit = { azimuth: 0, elevation: 0, radius: 0 }
  const target = new THREE.Vector3(0, 0.8, 0)
  const orbit = { azimuth: 0.567, elevation: 0.326, radius: 6.9 }
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
      orbit.radius = ARENA_FRAMING.radius
      target.y = ARENA_FRAMING.targetY
    } else {
      Object.assign(orbit, savedOrbit)
      target.y = 0.8
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
  const osReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches
  /** Save v5 pref wins when set; null defers to the OS media query. */
  let motionReduced: boolean | null = null
  const reducedMotion = (): boolean => motionReduced ?? osReducedMotion

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
  let headBaseY = 0

  const disposeGroup = (group: THREE.Group): void => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const mat = obj.material
        if (Array.isArray(mat)) {
          for (const m of mat) m.dispose()
        } else {
          mat.dispose()
        }
      }
    })
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

  const handle: SceneHandle = {
    sceneRoot: scene,
    setCameraMode,
    shake: setShake,
    setMotionReduced(v) {
      motionReduced = v
      if (reducedMotion()) shakeAmp = 0
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
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("wheel", onWheel)
      // Free every geometry/material on the scene to avoid GPU leaks when
      // scenes are swapped (ranch <-> arena later).
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mat = obj.material
          if (Array.isArray(mat)) {
            for (const m of mat) m.dispose()
          } else {
            mat.dispose()
          }
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    },
    setCreature(archetypeId, seed) {
      if (creatureGroup) disposeGroup(creatureGroup)
      const { dna, build, def } = generate(archetypeId, seed)
      creatureGroup = buildCreatureGroup(dna, build, def.grid)
      creatureGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.castShadow = true
      })
      scene.add(creatureGroup)
      headBaseY = creatureGroup.getObjectByName("head")?.position.y ?? 0
      // Cache the rig part refs once per build — the idle loop would
      // otherwise run five O(n) scene-graph searches every frame.
      rigParts = {
        body: creatureGroup.getObjectByName("body") ?? undefined,
        head: creatureGroup.getObjectByName("head") ?? undefined,
        tail: creatureGroup.getObjectByName("tail") ?? undefined,
        tailTip: creatureGroup.getObjectByName("tailTip") ?? undefined,
      }
    },
    setProps(visualSeed) {
      if (scenerySeed === visualSeed) return
      scenerySeed = visualSeed
      if (ranchScenery) disposeGroup(ranchScenery)
      const scenery = new THREE.Group()
      scenery.name = "ranch-scenery"
      const rng = makeRng(visualSeed)
      const scatter = (propId: string, angle: number, radius: number): void => {
        const prop = buildPropGroup(propId, rng.int(2 ** 30))
        prop.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
        prop.rotation.y = rng.next() * Math.PI * 2
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
        scenery.add(prop)
      }
      landmark("broadleafTree", -6.5, -4.5, 0.65, 1101)
      landmark("broadleafTree", 3, -5.5, -1.1, 1102)
      landmark("rock", -4.2, -3, 0.3, 2201)
      landmark("rock", 5.6, -4.4, -2.1, 2202)
      landmark("rock", -7.5, -1.6, 1.4, 2203)
      scene.add(scenery)
      ranchScenery = scenery
    },
    setFedToday(fedToday) {
      if (!foodPile) {
        foodPile = buildPropGroup("foodPile", 3301)
        foodPile.position.set(-2.4, 0, 0.4)
        foodPile.rotation.y = -0.4
        scene.add(foodPile)
      }
      fedTodayVisible = fedToday
      foodPile.visible = fedToday && ranchBlendK > 0.5
    },
    updateConditions(conditions) {
      mode = conditions ? moodModeFrom(conditions) : "normal"
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
    const profile = MOOD_PROFILES[mode]
    if (creatureGroup) {
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
      if (!reducedMotion() && profile.bounce > 0) {
        creatureGroup.position.y = Math.abs(Math.sin(t * 3.2)) * profile.bounce
      } else {
        creatureGroup.position.y = 0
      }
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
    renderer.render(scene, camera)
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
  }
  window.addEventListener("resize", onResize)

  return handle
}
