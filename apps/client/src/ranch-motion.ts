import {
  type CreatureConditions,
  EXHAUSTED_ENERGY,
  SICK_HEALTH,
} from "@apex/sim"
import { generate, makeRng, type Stage } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"
import {
  createEvolutionCeremony,
  createPlayCeremony,
  createRestCeremony,
  createTreatCeremony,
  createWalk,
  createWander,
  type GaitPose,
  gaitPose,
  type PlayDrive,
  phaseHash,
  pickVisitTarget,
  type RestDrive,
  stageScale,
  swayAngle,
  type TreatDrive,
  WANDER_DISC_RADIUS,
  type WanderDrive,
  windBaseAmp,
} from "./scene-logic"
import { lambertMaterialOf } from "./scene-utils"

/**
 * The ranch creature's whole performing life, extracted from scene.ts:
 * condition-driven mood idles (breath, droop, bounce), the feed-walk
 * ceremony, the rest ceremony (curl-down sleep + wake-and-stretch, FR3),
 * sparse wandering, the baby→juvenile evolution ceremony, wind
 * sway on scattered props, and the rig rebuild contract. scene.ts wires
 * this unit into the frame loop and the HUD-facing SceneHandle.
 *
 * Pure math seams (unit-tested in ranch-motion.test.ts): smoothstep,
 * standPointOnLineTo, moodModeFrom, gaitIntensity.
 */

/** Visual idle modes derived from the creature's conditions. */
export type MoodMode = "normal" | "sluggish" | "droopy" | "happy"

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

export function moodModeFrom(conditions: CreatureConditions): MoodMode {
  if (conditions.health < SICK_HEALTH) return "droopy"
  if (conditions.energy <= EXHAUSTED_ENERGY) return "sluggish"
  if (conditions.mood >= 80) return "happy"
  return "normal"
}

export const smoothstep = (k: number): number => k * k * (3 - 2 * k)

/**
 * Standing spot for the feed ceremony: on the creature→pile line, stopped
 * `setback` world units short of the pile so the creature stands just
 * before it and faces it — the shortest way, exactly as specified.
 */
export const standPointOnLineTo = (
  cx: number,
  cz: number,
  pileX: number,
  pileZ: number,
  setback: number,
): { x: number; z: number } => {
  const toPileX = pileX - cx
  const toPileZ = pileZ - cz
  const dist = Math.hypot(toPileX, toPileZ) || 1
  return {
    x: pileX - (toPileX / dist) * setback,
    z: pileZ - (toPileZ / dist) * setback,
  }
}

/**
 * Walk intensity for the gait: full stride while traveling with room to
 * spare, easing smoothly to zero over the last 0.6 units so the creature
 * arrives at a stop instead of snapping out of stride.
 */
export const gaitIntensity = (traveling: boolean, remaining: number): number =>
  traveling ? smoothstep(Math.min(1, remaining / 0.6)) : 0

/** Registered swayers: {group, baseAmp, phase} attached at scatter
 * time, advanced per tick as a runtime transform. Rocks and the food
 * pile never register (amplitude 0); rebuilt on every re-scatter. */
interface Swayer {
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

export function createRanchMotion(deps: RanchMotionDeps): RanchMotion {
  let reducedMotion = false

  let creatureGroup: THREE.Group | null = null
  /** Rig part refs cached at rebuild time (avoids per-frame lookups). */
  let rigParts: {
    body?: THREE.Object3D
    head?: THREE.Object3D
    tail?: THREE.Object3D
    tailTip?: THREE.Object3D
  } = {}
  let currentStage: Stage = "baby"
  let headBaseY = 0
  // headBaseY stays in the head's LOCAL units — the update writes it back
  // to head.position.y in the same space (the rig runs in grid units).

  let mode: MoodMode = "normal"
  let lastConditions: CreatureConditions | null = null
  let droopyUntil = 0

  let walk = createWalk(reducedMotion)
  /** One wanderer per scene lifetime (FR3). */
  let wander: ReturnType<typeof createWander> | null = null
  let wanderSeed = 0
  const wanderCandidates: { x: number; z: number }[] = []

  // -- Evolution ceremony (baby → juvenile, spec R5) ---------------------------
  // The machine drives the walk-to-center, the glow swell, and the one-frame
  // swap signal; this unit owns the actual rig rebuild and the glow paint.
  let evolution = createEvolutionCeremony()
  /** The juvenile rebuild the ceremony's swap frame should perform. */
  let evolutionSwap: {
    archetypeId: string
    seed: number
    stage: Stage
  } | null = null
  /** Invoked once when the ceremony settles; null when nobody is waiting. */
  let evolutionDone: (() => void) | null = null
  /** True while the machine owns the creature — the settle edge ends it. */
  let evolutionActive = false

  // -- Rest ceremony (ranch_rituals_20261018 FR3) ------------------------------
  // The machine drives curl → deep-sleep hold → wake-and-stretch where the
  // creature stands; this unit maps the drive onto the rig (folded legs,
  // lowered head, deep slow breath) — see applyRestPose.
  let rest = createRestCeremony()
  /** Whether the rest machine currently owns the creature (drives the
   * deep-sleep breathing override; cleared by preemption or settle). */
  let restActive = false

  // -- Treat ceremony (ranch_rituals_20261018 FR4) -----------------------------
  // Settle into a subdued slump, a balm moment with a relief sparkle burst
  // overhead, then recover back to the normal stance. The machine is pure
  // (scene-logic.ts); this unit maps the drive onto the rig and runs the
  // sparkle points.
  let treat = createTreatCeremony()
  /** Whether the treat machine currently owns the creature. */
  let treatActive = false
  /** Relief sparkle points floating above the creature (visible only while
   * the balm's relief window is open). */
  let sparkle: THREE.Points | null = null

  /** How deep the nibble head-dips go (in the head pivot's local units —
   * the rig runs in grid units, so this scales with the creature). */
  const DIP_DEPTH = 1.2
  /** Standing spot near the pile, on the creature→pile line, chosen at
   * start by startFeed. */
  let standX = 0
  let standZ = 0

  let windProps: Swayer[] = []
  let windSalt = 0

  /** Paint the glow: emissive lift on every mesh of the current rig. The
   * decay tail writes the materials back to black before the machine goes
   * idle, so no explicit reset is needed. */
  const applyGlow = (group: THREE.Object3D, intensity: number): void => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        lambertMaterialOf(obj)?.emissive.setScalar(intensity * 0.85)
      }
    })
  }

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

  /** Deep, slow breathing while the rest ceremony owns the creature
   * (ranch_rituals_20261018 FR3) — sleep reads as long, heavy breaths
   * instead of the condition-driven idle profile. */
  const REST_BREATH_RATE = 0.8
  const REST_BREATH_AMP = 0.05

  /** Map the rest ceremony's drive onto the rig: legs fold under, the body
   * settles low, the head sinks; the wake stretch lifts the head and
   * reaches the spine tall. Called after the breathing writes so it
   * composes with (never fights) the idle breath. Reduced motion rides the
   * same mapping — the machine just jumps straight to a still curl. */
  const applyRestPose = (
    creature: THREE.Group,
    rd: RestDrive,
    breath: number,
  ): void => {
    // Legs come back to rest first (zero gait pose), then fold by curl.
    applyGait(creature, gaitPose(0, 0, true))
    const curl = rd.curl
    const fold = (name: string, angle: number): void => {
      const pivot = creature.getObjectByName(name)
      if (pivot) pivot.rotation.x = angle * curl
    }
    fold("legFL", -0.85)
    fold("legFR", -0.85)
    fold("legBL", 0.85)
    fold("legBR", 0.85)
    // Settle slightly toward the ground while curled.
    creature.position.y = -curl * 0.08
    const head = rigParts.head
    if (head) {
      // Sleep: the head sinks onto the curl. Wake: it rises past base —
      // the reach that reads as a stretch.
      head.position.y =
        headBaseY +
        breath * REST_BREATH_AMP * 0.6 -
        curl * (headBaseY * 0.35 + 0.05) +
        rd.stretch * (headBaseY * 0.35 + 0.05)
    }
    const body = rigParts.body
    if (body) {
      // The wake reach stretches the spine tall (on top of the breath scale).
      body.scale.y *= 1 + rd.stretch * 0.14
    }
  }

  /** Map the treat ceremony's drive onto the rig (ranch_rituals_20261018
   * FR4): a subdued slump — head sinking onto the chest, a slight body
   * pitch, settling low — easing back to the normal stance on recover.
   * Called after the breathing writes so it composes with the idle breath.
   * Reduced motion rides the same mapping — the machine just holds a still
   * slump with no relief pulse. */
  const applyTreatPose = (creature: THREE.Group, td: TreatDrive): void => {
    applyGait(creature, gaitPose(0, 0, true))
    const s = td.subdued
    const head = rigParts.head
    if (head) head.position.y = headBaseY - s * (headBaseY * 0.45 + 0.06)
    const body = rigParts.body
    if (body) body.rotation.x = s * 0.08
    creature.position.y = -s * 0.05
  }

  // -- Relief sparkle (treat ceremony FR4) -------------------------------------
  // A small burst of drifting motes above the creature, visible only while
  // the balm's relief window is open. Cosmetic only (no sim meaning), so it
  // is verified by eye rather than by unit tests.
  const SPARKLE_COUNT = 14
  const SPARKLE_RISE = 0.9
  const sparkleBaseY = new Float32Array(SPARKLE_COUNT)
  const sparklePhase = new Float32Array(SPARKLE_COUNT)

  /** Build the sparkle points as a child of the creature group (so they
   * follow it and scale with the stage). Deterministic layout — cosmetic
   * decor, no gameplay meaning. */
  const buildSparkle = (creature: THREE.Group): void => {
    const positions = new Float32Array(SPARKLE_COUNT * 3)
    sparkleBaseY.fill(0)
    sparklePhase.fill(0)
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const angle = (i / SPARKLE_COUNT) * Math.PI * 2
      const radius = 0.5 + (((i * 37) % 10) / 10) * 0.6
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 2] = Math.sin(angle) * radius
      const baseY = 1.6 + (((i * 53) % 10) / 10) * 0.8
      positions[i * 3 + 1] = baseY
      sparkleBaseY[i] = baseY
      sparklePhase[i] = ((i * 29) % 10) / 10
    }
    const geom = new THREE.BufferGeometry()
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffe9a8,
      size: 0.26,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    })
    sparkle = new THREE.Points(geom, mat)
    sparkle.visible = false
    creature.add(sparkle)
  }

  /** Drive the sparkle burst: motes drift upward on individual cycles while
   * the relief window is open, fading with it. A no-op (invisible) at
   * relief 0. */
  const updateSparkle = (t: number, relief: number): void => {
    if (!sparkle) return
    const mat = sparkle.material as THREE.PointsMaterial
    if (relief <= 0.01) {
      sparkle.visible = false
      return
    }
    sparkle.visible = true
    mat.opacity = Math.min(1, relief)
    const attr = sparkle.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const cycle = (t * 1.2 + (sparklePhase[i] ?? 0)) % 1
      attr.setY(i, (sparkleBaseY[i] ?? 0) + cycle * SPARKLE_RISE)
    }
    attr.needsUpdate = true
  }

  // -- Play ceremony (FR5) -----------------------------------------------------
  // A tossed ball the creature chases, bops further, trots home from, and
  // celebrates over. The machine is pure (scene-logic.ts); the shared walk
  // machine carries the chase and return legs, the ball is a simple prop
  // mesh, and the celebrate phase hops the creature in place.
  const PLAY_BOUNCE_HEIGHT = 0.18
  const BALL_RADIUS = 0.3
  let play = createPlayCeremony()
  let playActive = false
  let playHome = { x: 0, z: 0 }
  let playLanding = { x: 0, z: 0 }
  let prevPlayPhase: PlayDrive["phase"] = "idle"
  let prevWalkMoving = false
  let playSeedCounter = 0
  let ball: THREE.Mesh | null = null

  const buildBall = (): void => {
    const geom = new THREE.IcosahedronGeometry(BALL_RADIUS, 0)
    const mat = new THREE.MeshLambertMaterial({ color: 0xe8a13c })
    ball = new THREE.Mesh(geom, mat)
    ball.castShadow = true
    ball.visible = false
    deps.scene.add(ball)
  }

  /** Place the ball prop from the machine's world-space drive. */
  const updateBall = (pd: PlayDrive): void => {
    if (!ball) return
    ball.visible = pd.ballVisible
    if (pd.ballVisible) {
      ball.position.set(pd.ballX, pd.ballY + BALL_RADIUS, pd.ballZ)
    }
  }

  /** Tear down an in-flight play ceremony without touching the walk
   * machine (whoever cancels play owns the creature next). */
  const cancelPlay = (): void => {
    play = createPlayCeremony()
    playActive = false
    prevPlayPhase = "idle"
    if (ball) ball.visible = false
  }

  /** Build a creature rig (archetype + seed + stage) with the visual-center
   * holder contract and the stage's world scale. Kept as its own step so
   * the evolution ceremony's swap reuses the exact same path. */
  const rebuild = (archetypeId: string, seed: number, stage: Stage): void => {
    if (creatureGroup) deps.disposeGroup(creatureGroup)
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
    rig.scale.setScalar(stageScale(stage))
    creatureGroup = rig
    currentStage = stage
    rig.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.castShadow = true
    })
    deps.scene.add(rig)
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
    // it cleanly via startFeed.
    if (wander) {
      wander.pause()
    } else {
      wander = createWander(reducedMotion, seed)
    }
    wanderSeed = seed
    headBaseY = rig.getObjectByName("head")?.position.y ?? 0
  }

  const update = (t: number, dt: number, ranchActive: boolean): void => {
    // Momentary droopy window (cup early exit): once it expires, fall back
    // to the condition-driven idle.
    if (droopyUntil !== 0 && performance.now() >= droopyUntil) {
      droopyUntil = 0
      mode = lastConditions ? moodModeFrom(lastConditions) : "normal"
    }
    const profile = MOOD_PROFILES[mode]
    if (ranchActive && creatureGroup) {
      // Breathe idle: squash-and-stretch on the body around its HIP-LINE
      // pivot. Scale never moves the pivot, so body voxels at the leg
      // junction stay fixed and the legs remain visually attached; the chest
      // and belly flex above/below it. Horizontal squash is kept small (it
      // slides the body's voxel pattern against the planted legs); the
      // vertical stretch carries the read. Neck/head/horns/tail ride along
      // via the rig hierarchy. While the rest ceremony owns the creature
      // the breath is deep and slow (ranch_rituals_20261018 FR3).
      const bRate = restActive ? REST_BREATH_RATE : profile.breathRate
      const bAmp = restActive ? REST_BREATH_AMP : profile.breathAmp
      const breath = Math.sin(t * bRate)
      const body = rigParts.body
      if (body) {
        body.scale.set(
          1 - breath * bAmp * 0.3,
          1 + breath * bAmp,
          1 - breath * bAmp * 0.3,
        )
      }
      const head = rigParts.head
      if (head) {
        head.position.y =
          headBaseY + breath * bAmp * 0.6 - (restActive ? 0 : profile.headDroop)
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
      // stay parked (startEvolution preempted them). The swap rebuilds the
      // rig to the juvenile build mid-ceremony; afterwards the machine
      // keeps driving the fresh rig until it settles.
      const evo = evolution.advance(
        creatureGroup.position.x,
        creatureGroup.position.z,
        dt,
      )
      const evoActive = evo.active
      // The ceremony hands control back exactly once, on the frame it
      // settles. Every phase — walk, glow, settle — reports active, and only
      // the idle fallthrough reports false, so the falling edge is a
      // reliable "the farewell is over" signal (the reduced-motion variant
      // reaches it one frame later).
      if (evolutionActive && !evoActive) {
        const done = evolutionDone
        evolutionDone = null
        done?.()
      }
      evolutionActive = evoActive
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
          rebuild(swap.archetypeId, swap.seed, swap.stage)
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
        creatureGroup.scale.setScalar(stageScale(currentStage))
        // Rest (FR3) and treat (FR4) ceremonies: while either is active it
        // owns the creature's pose — walk and wander stay parked.
        const rd = rest.advance(dt)
        restActive = rd.phase !== "idle"
        const td = treat.advance(dt)
        treatActive = td.phase !== "idle"
        updateSparkle(t, treatActive ? td.relief : 0)
        const pd = play.advance(dt)
        playActive = pd.phase !== "idle"
        updateBall(pd)
        if (restActive) {
          applyRestPose(creatureGroup, rd, breath)
        } else if (treatActive) {
          applyTreatPose(creatureGroup, td)
        } else {
          const wd = walk.advance(
            creatureGroup.position.x,
            creatureGroup.position.z,
            dt,
          )
          // Play legs ride on the shared walk machine (FR5): start a leg
          // when the ceremony enters chase/return, and report the leg's
          // completion to the machine on the walk's falling edge.
          if (playActive && pd.phase !== prevPlayPhase) {
            if (pd.phase === "chase") {
              walk.begin(
                creatureGroup.position.x,
                creatureGroup.position.z,
                playLanding.x,
                playLanding.z,
                creatureGroup.rotation.y,
              )
            } else if (pd.phase === "return") {
              walk.begin(
                creatureGroup.position.x,
                creatureGroup.position.z,
                playHome.x,
                playHome.z,
                creatureGroup.rotation.y,
              )
            }
          }
          if (playActive && prevWalkMoving && wd.phase === "idle") {
            play.walkDone()
          }
          prevPlayPhase = pd.phase
          prevWalkMoving = wd.phase !== "idle"
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
          // bush. A feed ceremony takes priority — startFeed aborts the
          // wanderer, so the two machines never fight over the creature.
          let wandDrive: WanderDrive | null = null
          if (wd.phase === "idle" && wander) {
            wandDrive = wander.advance(
              creatureGroup.position.x,
              creatureGroup.position.z,
              creatureGroup.rotation.y,
              dt,
              mode !== "droopy" && !playActive,
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
            gaitPose(t, gaitIntensity(traveling, remaining), reducedMotion),
          )
          if (wd.phase === "nibble" && head) {
            // 2–3 gentle head-dips toward the pile over the existing pivot.
            head.position.y -= wd.dipOffset * DIP_DEPTH
          }
          if (playActive && pd.phase === "celebrate") {
            // Celebrate hop: three quick in-place hops over the machine's
            // bounce envelope — the walk/wander idles underneath stay flat.
            creatureGroup.position.y = pd.bounce * PLAY_BOUNCE_HEIGHT
          } else if (
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
        }
      } else {
        // During the ceremony the legs stride only on the walk phase; the
        // glow/settle phases hold the pose. The holder sits on the ground.
        applyGait(creatureGroup, gaitPose(t, evoGait ? 1 : 0, reducedMotion))
        creatureGroup.position.y = 0
      }
      // Soft camera track: report where the creature ended up this frame.
      deps.onCreatureMoved(
        away,
        creatureGroup.position.x,
        creatureGroup.position.z,
        dt,
      )
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
  }

  return {
    get group() {
      return creatureGroup
    },
    rebuild,
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
    startFeed() {
      if (!creatureGroup) return
      // A new ceremony takes over: an in-flight rest is replaced (the
      // non-cancelable policy governs the committed action, and the next
      // ceremony legitimately owns the creature's motion).
      rest = createRestCeremony()
      restActive = false
      treat = createTreatCeremony()
      treatActive = false
      cancelPlay()
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
      const spot = standPointOnLineTo(
        creatureGroup.position.x,
        creatureGroup.position.z,
        deps.pileX,
        deps.pileZ,
        1.15,
      )
      standX = spot.x
      standZ = spot.z
      // The walk starts from wherever the creature currently stands and
      // faces, so successive feeds re-trigger cleanly (non-cancelable
      // policy) and the turn eases instead of snapping.
      walk.begin(
        creatureGroup.position.x,
        creatureGroup.position.z,
        standX,
        standZ,
        creatureGroup.rotation.y,
      )
    },
    startRest() {
      if (!creatureGroup) return
      // Rest preempts an in-flight feed walk or wander trip: reset the walk
      // machine so no ghost walk resumes after the creature wakes (the
      // same fresh-machine trick startEvolution uses). The rest ceremony
      // itself runs where the creature currently stands.
      walk = createWalk(reducedMotion)
      wander?.abort()
      treat = createTreatCeremony()
      treatActive = false
      cancelPlay()
      rest.begin(reducedMotion)
    },
    startTreat() {
      if (!creatureGroup) return
      // Treat preempts an in-flight walk or wander trip the same way rest
      // does (fresh walk machine so no ghost walk resumes), and replaces an
      // in-flight rest. The balm moment runs where the creature stands.
      walk = createWalk(reducedMotion)
      wander?.abort()
      rest = createRestCeremony()
      restActive = false
      cancelPlay()
      if (!sparkle) buildSparkle(creatureGroup)
      treat.begin(reducedMotion)
    },
    startPlay() {
      if (!creatureGroup) return
      // Play preempts rest/treat (they own the pose) and any wander trip.
      // The walk machine is NOT reset: the chase leg begins from the
      // current pose via its safe mid-walk begin().
      rest = createRestCeremony()
      restActive = false
      treat = createTreatCeremony()
      treatActive = false
      wander?.abort()
      const ox = creatureGroup.position.x
      const oz = creatureGroup.position.z
      playHome = { x: ox, z: oz }
      // Deterministic per-play landing: a visit-style spot near a
      // registered prop when one qualifies, else a seeded angle clamped
      // inside the moss disc.
      const rng = makeRng((wanderSeed + playSeedCounter * 0x9e3779b9) | 0)
      playSeedCounter++
      const hit = pickVisitTarget(wanderCandidates, ox, oz, rng)
      if (hit) {
        // Pull the landing 70% of the way in: a full visit distance makes
        // the chase ~4 s each leg — twice the whole feed ceremony. A short
        // romp reads better inside a 3-AP day.
        playLanding = {
          x: ox + (hit.x - ox) * 0.7,
          z: oz + (hit.z - oz) * 0.7,
        }
      } else {
        const angle = rng.next() * Math.PI * 2
        const dist = 4.5 + rng.next() * 2
        let lx = ox + Math.cos(angle) * dist
        let lz = oz + Math.sin(angle) * dist
        const d = Math.hypot(lx, lz)
        if (d > WANDER_DISC_RADIUS - 1) {
          lx *= (WANDER_DISC_RADIUS - 1) / d
          lz *= (WANDER_DISC_RADIUS - 1) / d
        }
        playLanding = { x: lx, z: lz }
      }
      if (!ball) buildBall()
      play.begin(ox, oz, playLanding.x, playLanding.z, reducedMotion)
    },
    startEvolution(archetypeId, seed, targetStage, onDone) {
      if (!creatureGroup) return
      // Preempt an in-flight feed walk (the growth moment takes over) and
      // abandon any wander trip, then begin from the current pose. The
      // scale journey follows the stage ladder: a champion ceremony starts
      // at the juvenile's scale and settles grander.
      if (onDone) evolutionDone = onDone
      walk = createWalk(reducedMotion)
      wander?.abort()
      rest = createRestCeremony()
      restActive = false
      treat = createTreatCeremony()
      treatActive = false
      cancelPlay()
      evolutionSwap = { archetypeId, seed, stage: targetStage }
      evolution.begin(creatureGroup.rotation.y, reducedMotion, {
        fromScale: stageScale(currentStage),
        toScale: stageScale(targetStage),
      })
    },
    clearEvolution() {
      evolutionSwap = null
      evolution = createEvolutionCeremony()
    },
    resetProps() {
      windProps = []
      windSalt = 0
      wanderCandidates.length = 0
    },
    registerSway(propId, prop) {
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
    },
    commitProps() {
      wander?.setCandidates(wanderCandidates)
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced
      // The idle machines captured the previous flag at creation; rebuild
      // them so the new motion mode applies immediately (the wanderer
      // pauses its rhythm, the walk restarts from home — an accessibility
      // flip legitimately resets ornamental motion).
      walk = createWalk(reduced)
      if (wander) {
        wander.pause()
        wander = createWander(reduced, wanderSeed)
      }
    },
    update,
    dispose() {
      if (sparkle) {
        sparkle.geometry.dispose()
        ;(sparkle.material as THREE.PointsMaterial).dispose()
        sparkle = null
      }
      if (ball) {
        ball.geometry.dispose()
        ;(ball.material as THREE.MeshLambertMaterial).dispose()
        deps.scene.remove(ball)
        ball = null
      }
      if (creatureGroup) deps.disposeGroup(creatureGroup)
    },
  }
}
