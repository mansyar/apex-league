import {
  type CreatureConditions,
  EXHAUSTED_ENERGY,
  SICK_HEALTH,
} from "@apex/sim"
import { generate, makeRng } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"
import { buildPropGroup } from "./prop"
import {
  type CeremonyState,
  createCeremony,
  type GaitPose,
  gaitPose,
  lerpAngle,
  phaseHash,
  swayAngle,
  windBaseAmp,
} from "./scene-logic"

export interface SceneHandle {
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
   * Play the feeding ceremony: turn toward the pile, walk to a facing
   * spot, nibble 2–3 dips, walk home. Purely visual — the sim already
   * committed. Non-cancelable (2026-10-10 decision): HUD input applies to
   * the sim immediately but never interrupts the creature's motion; safe
   * to call mid-ceremony (successive feeds re-trigger). Reduced motion
   * plays an in-place nibble at the anchor.
   */
  startFeedCeremony(): void
}

const GROUND_COLOR = 0x3a4d34

/**
 * Ranch environment palette (golden hour). The ranch reads as late
 * afternoon: amber light pooling at the horizon, cooling to navy
 * overhead, with a warm key sun and a cool rim to silhouette the
 * creature. These four tones are the identity of the ranch look —
 * retune them together, never one alone.
 */
const SKY_HORIZON = 0xd98c4a // dusk amber, pools at the horizon
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

  let dragging = false
  let lastX = 0
  let lastY = 0
  const onPointerDown = (e: PointerEvent): void => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }
  const onPointerMove = (e: PointerEvent): void => {
    if (!dragging) return
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

  // Real drop-in shadows: the creature's parts cast, the ground receives.
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
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

  // Honor reduced motion: keep the gentle breath, drop the bounce.
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches

  let creatureGroup: THREE.Group | null = null
  let ranchScenery: THREE.Group | null = null
  let scenerySeed = -1
  let foodPile: THREE.Group | null = null
  let mode: MoodMode = "normal"
  let headBaseY = 0

  // -- Feeding ceremony (FR2) -------------------------------------------------
  // The creature's home anchor is the origin where it idles; the food pile
  // is a fixed landmark. Ceremony visuals translate/rotate the creature as a
  // runtime transform only — the sim is untouched.
  const pilePos = new THREE.Vector3(-2.4, 0, 0.4)
  const ceremony = createCeremony(reducedMotion)
  /** Seconds, kept current by tick() — the machine's time base. */
  let now = 0
  /** Standing spot near the pile (seeded side offset), chosen at start. */
  const standPos = new THREE.Vector3()
  /** Yaw facing the pile from `standPos`. */
  let pileYaw = 0
  // Yaw facing the travel direction from the stand spot back to the home
  // anchor — used during walk-home so the creature walks forward home.
  let homeTravelYaw = 0
  /** The creature's yaw before the ceremony began (restored at the end). */
  let homeYaw = 0

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

  /**
   * Drive creature pos/yaw from a ceremony tick state. `head` receives the
   * gentle dip overlay during the nibble phase. The walk gait itself is
   * applied by `applyGait` in the tick loop.
   */
  const driveCeremony = (
    s: CeremonyState,
    creature: THREE.Group,
    head: THREE.Object3D | undefined,
  ): void => {
    const ease = smoothstep(s.phaseElapsed / Math.max(s.phaseDuration, 1e-6))
    switch (s.phase) {
      case "turn":
        creature.rotation.y = lerpAngle(homeYaw, pileYaw, ease)
        creature.position.x = 0
        creature.position.z = 0
        break
      case "walk-out":
        creature.position.x = standPos.x * ease
        creature.position.z = standPos.z * ease
        creature.rotation.y = pileYaw
        break
      case "nibble": {
        creature.position.x = standPos.x
        creature.position.z = standPos.z
        creature.rotation.y = pileYaw
        // 2–3 gentle head-dips toward the pile over the existing head pivot.
        if (head) head.position.y -= s.dipOffset * 0.3
        break
      }
      case "walk-home":
        creature.position.x = standPos.x * (1 - ease)
        creature.position.z = standPos.z * (1 - ease)
        // Face the travel direction the whole way home. Blending the yaw
        // from pile-facing to idle-facing while the body still slides read
        // as walking backward (user-reported 2026-10-10).
        creature.rotation.y = homeTravelYaw
        break
      default:
        break
    }
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

  /**
   * Attach a prop to the wind list if its class sways (tuft, bush,
   * broadleaf tree; landmark trees use the same rule). Phase comes from
   * a seeded hash of the prop's world position — each prop sways on its
   * own clock, no shared uniform. Zero-amplitude ids (rocks, food pile)
   * never register.
   */
  const registerSway = (propId: string, prop: THREE.Group): void => {
    const baseAmp = windBaseAmp(propId)
    if (baseAmp <= 0) return
    windProps.push({
      group: prop,
      baseAmp,
      phase: phaseHash(prop.position.x, prop.position.z, windSalt++),
    })
  }

  const handle: SceneHandle = {
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
    },
    setProps(visualSeed) {
      if (scenerySeed === visualSeed) return
      scenerySeed = visualSeed
      if (ranchScenery) disposeGroup(ranchScenery)
      windProps = []
      windSalt = 0
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
    },
    setFedToday(fedToday) {
      if (!foodPile) {
        foodPile = buildPropGroup("foodPile", 3301)
        foodPile.position.copy(pilePos)
        foodPile.rotation.y = -0.4
        scene.add(foodPile)
      }
      foodPile.visible = fedToday
    },
    updateConditions(conditions) {
      mode = conditions ? moodModeFrom(conditions) : "normal"
    },
    startFeedCeremony() {
      if (!creatureGroup) return
      ceremony.cancel() // safe even if none running
      if (reducedMotion) {
        // In-place nibble at the anchor: no turn, no travel.
        standPos.set(0, 0, 0)
        pileYaw = homeYaw
        homeTravelYaw = homeYaw
      } else {
        // Seeded standing spot: the creature's visual seed picks the side
        // of the anchor→pile line — same creature, same spot, every feed.
        const rng = makeRng(scenerySeed ^ 0xfeec)
        const side = rng.next() < 0.5 ? -1 : 1
        const out = pilePos.clone().setY(0).normalize()
        const perp = new THREE.Vector3(-out.z, 0, out.x)
        standPos
          .copy(pilePos)
          .addScaledVector(out, 1.15)
          .addScaledVector(perp, 0.45 * side)
        standPos.y = 0
        const face = new THREE.Vector3().subVectors(pilePos, standPos)
        // The creature mesh faces -z at rest, so heading toward a world
        // direction is atan2(dx, dz) + π — without the flip it shuffles
        // backward toward the pile.
        pileYaw = Math.atan2(face.x, face.z) + Math.PI
        // Walk-home faces where it is going: from the stand spot toward
        // the home anchor (the origin), computed once per ceremony.
        homeTravelYaw = Math.atan2(-standPos.x, -standPos.z) + Math.PI
      }
      homeYaw = creatureGroup.rotation.y
      ceremony.start(now)
    },
  }

  const clockStart = performance.now()
  let raf = 0

  const tick = (): void => {
    const t = (performance.now() - clockStart) / 1000
    now = t
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
      const body = creatureGroup.getObjectByName("body")
      if (body) {
        body.scale.set(
          1 - breath * profile.breathAmp * 0.3,
          1 + breath * profile.breathAmp,
          1 - breath * profile.breathAmp * 0.3,
        )
      }
      const head = creatureGroup.getObjectByName("head")
      if (head) {
        head.position.y =
          headBaseY + breath * profile.breathAmp * 0.6 - profile.headDroop
      }
      const sway = Math.sin(t * 1.3)
      const tail = creatureGroup.getObjectByName("tail")
      if (tail) {
        tail.rotation.y = sway * 0.06
      }
      const tailTip = creatureGroup.getObjectByName("tailTip")
      if (tailTip) {
        tailTip.rotation.y = sway * 0.12
      }
      // Ceremony drives position/yaw and suppresses the bounce; the mood
      // idle takes back over the moment ceremony (or its cancel) ends.
      // The gait applies every frame with a zero pose outside walks, so
      // leg pivots and the weight roll always come back to rest.
      const ce = ceremony.tick(now)
      const traveling = ce.phase === "walk-out" || ce.phase === "walk-home"
      const amp = traveling
        ? smoothstep(ce.phaseElapsed / Math.max(ce.phaseDuration, 1e-6))
        : 0
      applyGait(creatureGroup, gaitPose(t, amp, reducedMotion))
      if (ce.phase !== "idle") {
        driveCeremony(ce, creatureGroup, head ?? undefined)
      } else if (!reducedMotion && profile.bounce > 0) {
        creatureGroup.position.y = Math.abs(Math.sin(t * 3.2)) * profile.bounce
      } else {
        creatureGroup.position.y = 0
      }
      // Soft camera tracking: while the creature is away from home the
      // orbit target eases toward it (ceremony today; wander in Phase C)
      // and drifts back to the home anchor when idle. Only the look
      // target moves — user drag/wheel keep full authority over the view.
      const away = ce.phase !== "idle"
      focusPoint.set(
        away ? creatureGroup.position.x : 0,
        0.8,
        away ? creatureGroup.position.z : 0,
      )
      target.lerp(focusPoint, 0.08)
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
    renderer.render(scene, camera)
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
