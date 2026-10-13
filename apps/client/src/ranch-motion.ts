import {
  type CreatureConditions,
  EXHAUSTED_ENERGY,
  SICK_HEALTH,
} from "@apex/sim"
import { generate, type Stage } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"
import {
  createEvolutionCeremony,
  createWalk,
  createWander,
  type GaitPose,
  gaitPose,
  phaseHash,
  stageScale,
  swayAngle,
  type WanderDrive,
  windBaseAmp,
} from "./scene-logic"
import { lambertMaterialOf } from "./scene-utils"

/**
 * The ranch creature's whole performing life, extracted from scene.ts:
 * condition-driven mood idles (breath, droop, bounce), the feed-walk
 * ceremony, sparse wandering, the baby→juvenile evolution ceremony, wind
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
  /** Begin the evolution ceremony (juvenile→champion or baby→juvenile)
   * from the current pose; the swap rebuilds to the target stage. */
  startEvolution(archetypeId: string, seed: number, targetStage: Stage): void
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
  let evolutionSwap: { archetypeId: string; seed: number; stage: Stage } | null =
    null

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
      // stay parked (startEvolution preempted them). The swap rebuilds the
      // rig to the juvenile build mid-ceremony; afterwards the machine
      // keeps driving the fresh rig until it settles.
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
        // bush. A feed ceremony takes priority — startFeed aborts the
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
          gaitPose(t, gaitIntensity(traveling, remaining), reducedMotion),
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
    startEvolution(archetypeId, seed, targetStage) {
      if (!creatureGroup) return
      // Preempt an in-flight feed walk (the growth moment takes over) and
      // abandon any wander trip, then begin from the current pose. The
      // scale journey follows the stage ladder: a champion ceremony starts
      // at the juvenile's scale and settles grander.
      walk = createWalk(reducedMotion)
      wander?.abort()
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
      if (creatureGroup) deps.disposeGroup(creatureGroup)
    },
  }
}
