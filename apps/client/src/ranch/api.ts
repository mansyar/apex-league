import { SICK_HEALTH } from "@apex/sim"
import { makeRng } from "@apex/voxel"
import {
  createEvolutionCeremony,
  createPlayCeremony,
  createRestCeremony,
  createTreatCeremony,
  createWalk,
  createWander,
  type PetVariant,
  phaseHash,
  pickPetReaction,
  pickVisitTarget,
  stageScale,
  standPointOnLineTo,
  WANDER_DISC_RADIUS,
  windBaseAmp,
} from "../scene-logic"
import { buildBall, buildSparkle, disposeBall, disposeSparkle } from "./effects"
import { updateRanch } from "./frame"
import { moodModeFrom } from "./mood"
import { rebuild } from "./mount"
import type { RanchState } from "./state"
import type { RanchMotion } from "./types"

/**
 * The SceneHandle-facing surface: every ceremony starter, the prop
 * registration, and the frame entry point. Pure plumbing over the shared
 * state — no pose math lives here (see poses.ts / idle.ts / frame.ts).
 */
export function createApi(s: RanchState): RanchMotion {
  return {
    get group() {
      return s.creatureGroup
    },
    rebuild(archetypeId, seed, stage) {
      rebuild(s, archetypeId, seed, stage)
    },
    updateConditions(conditions) {
      s.lastConditions = conditions
      // An active momentary droopy window owns the mode until it expires.
      if (s.droopyUntil === 0 || performance.now() >= s.droopyUntil) {
        s.mode = conditions ? moodModeFrom(conditions) : "normal"
      }
    },
    droopyMoment(durationMs = 6000) {
      s.mode = "droopy"
      s.droopyUntil = performance.now() + durationMs
    },
    startFeed() {
      if (!s.creatureGroup) return
      // A new ceremony takes over: an in-flight rest is replaced (the
      // non-cancelable policy governs the committed action, and the next
      // ceremony legitimately owns the creature's motion).
      s.rest = createRestCeremony()
      s.restActive = false
      s.treat = createTreatCeremony()
      s.treatActive = false
      cancelPlay(s)
      // A feed takes the creature over: abandon any in-flight wander trip
      // (FR3 — wander is suspended during the ceremony) and let the
      // ceremony machine drive from the creature's current pose.
      s.wander?.abort()
      // Straight-line approach: the stand point sits ON the line from the
      // creature's current position to the pile center, stopped 1.15 world
      // units short of the pile so the creature stands just before it and
      // faces it — the shortest way, exactly as specified. (Reduced motion
      // ignores the stand spot; the machine nibbles in place wherever the
      // creature currently stands.)
      const spot = standPointOnLineTo(
        s.creatureGroup.position.x,
        s.creatureGroup.position.z,
        s.deps.pileX,
        s.deps.pileZ,
        1.15,
      )
      s.standX = spot.x
      s.standZ = spot.z
      // The walk starts from wherever the creature currently stands and
      // faces, so successive feeds re-trigger cleanly (non-cancelable
      // policy) and the turn eases instead of snapping.
      s.walk.begin(
        s.creatureGroup.position.x,
        s.creatureGroup.position.z,
        s.standX,
        s.standZ,
        s.creatureGroup.rotation.y,
      )
    },
    startRest() {
      if (!s.creatureGroup) return
      // Rest preempts an in-flight feed walk or wander trip: reset the walk
      // machine so no ghost walk resumes after the creature wakes (the
      // same fresh-machine trick startEvolution uses). The rest ceremony
      // itself runs where the creature currently stands.
      s.walk = createWalk(s.reducedMotion)
      s.wander?.abort()
      s.treat = createTreatCeremony()
      s.treatActive = false
      cancelPlay(s)
      s.rest.begin(s.reducedMotion)
    },
    startTreat() {
      if (!s.creatureGroup) return
      // Treat preempts an in-flight walk or wander trip the same way rest
      // does (fresh walk machine so no ghost walk resumes), and replaces an
      // in-flight rest. The balm moment runs where the creature stands.
      s.walk = createWalk(s.reducedMotion)
      s.wander?.abort()
      s.rest = createRestCeremony()
      s.restActive = false
      cancelPlay(s)
      if (!s.sparkle) s.sparkle = buildSparkle(s.creatureGroup)
      s.treat.begin(s.reducedMotion)
    },
    startPlay() {
      if (!s.creatureGroup) return
      // Play preempts rest/treat (they own the pose) and any wander trip.
      // The walk machine is NOT reset: the chase leg begins from the
      // current pose via its safe mid-walk begin().
      s.rest = createRestCeremony()
      s.restActive = false
      s.treat = createTreatCeremony()
      s.treatActive = false
      s.wander?.abort()
      const ox = s.creatureGroup.position.x
      const oz = s.creatureGroup.position.z
      s.playHome = { x: ox, z: oz }
      // Deterministic per-play landing: a visit-style spot near a
      // registered prop when one qualifies, else a seeded angle clamped
      // inside the moss disc.
      const rng = makeRng((s.wanderSeed + s.playSeedCounter * 0x9e3779b9) | 0)
      s.playSeedCounter++
      const hit = pickVisitTarget(s.wanderCandidates, ox, oz, rng)
      if (hit) {
        // Pull the landing 70% of the way in: a full visit distance makes
        // the chase ~4 s each leg — twice the whole feed ceremony. A short
        // romp reads better inside a 3-AP day.
        s.playLanding = {
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
        s.playLanding = { x: lx, z: lz }
      }
      if (!s.ball) s.ball = buildBall(s.deps.scene)
      s.play.begin(ox, oz, s.playLanding.x, s.playLanding.z, s.reducedMotion)
    },
    startPet(): PetVariant | null {
      // No creature on stage, or a ceremony already owns it: ignore the pet
      // outright (never yank a sleeper out of its pose).
      if (
        !s.creatureGroup ||
        s.restActive ||
        s.treatActive ||
        s.playActive ||
        s.evolutionActive
      ) {
        return null
      }
      // Mood drives the reaction; a sick creature (the same health gate the
      // idle uses) always gets the weak stir instead of a perky one.
      const mood = s.lastConditions?.mood ?? 60
      const sick = s.lastConditions
        ? s.lastConditions.health < SICK_HEALTH
        : false
      const variant = pickPetReaction(mood, sick)
      if (!s.petMachine.begin(variant, s.reducedMotion)) return null
      s.petTime = 0
      return variant
    },
    startEvolution(archetypeId, seed, targetStage, onDone) {
      if (!s.creatureGroup) return
      // Preempt an in-flight feed walk (the growth moment takes over) and
      // abandon any wander trip, then begin from the current pose. The
      // scale journey follows the stage ladder: a champion ceremony starts
      // at the juvenile's scale and settles grander.
      if (onDone) s.evolutionDone = onDone
      s.walk = createWalk(s.reducedMotion)
      s.wander?.abort()
      s.rest = createRestCeremony()
      s.restActive = false
      s.treat = createTreatCeremony()
      s.treatActive = false
      cancelPlay(s)
      s.evolutionSwap = { archetypeId, seed, stage: targetStage }
      s.evolution.begin(s.creatureGroup.rotation.y, s.reducedMotion, {
        fromScale: stageScale(s.currentStage),
        toScale: stageScale(targetStage),
      })
    },
    clearEvolution() {
      s.evolutionSwap = null
      s.evolution = createEvolutionCeremony()
    },
    resetProps() {
      s.windProps = []
      s.windSalt = 0
      s.wanderCandidates.length = 0
    },
    registerSway(propId, prop) {
      // Wander candidates (FR3): tufts and bushes are legitimate visit
      // spots; rocks, trees, and the food pile never register.
      if (propId === "tuft" || propId === "bush") {
        s.wanderCandidates.push({ x: prop.position.x, z: prop.position.z })
      }
      const baseAmp = windBaseAmp(propId)
      if (baseAmp <= 0) return
      s.windProps.push({
        group: prop,
        baseAmp,
        phase: phaseHash(prop.position.x, prop.position.z, s.windSalt++),
      })
    },
    commitProps() {
      s.wander?.setCandidates(s.wanderCandidates)
    },
    setReducedMotion(reduced) {
      s.reducedMotion = reduced
      // The idle machines captured the previous flag at creation; rebuild
      // them so the new motion mode applies immediately (the wanderer
      // pauses its rhythm, the walk restarts from home — an accessibility
      // flip legitimately resets ornamental motion).
      s.walk = createWalk(reduced)
      if (s.wander) {
        s.wander.pause()
        s.wander = createWander(reduced, s.wanderSeed)
      }
    },
    update(t, dt, ranchActive) {
      updateRanch(s, t, dt, ranchActive)
    },
    dispose() {
      disposeSparkle(s.sparkle)
      s.sparkle = null
      disposeBall(s.ball, s.deps.scene)
      s.ball = null
      if (s.creatureGroup) s.deps.disposeGroup(s.creatureGroup)
    },
  }
}

/** Tear down an in-flight play ceremony without touching the walk
 * machine (whoever cancels play owns the creature next). */
function cancelPlay(s: RanchState): void {
  s.play = createPlayCeremony()
  s.playActive = false
  s.prevPlayPhase = "idle"
  if (s.ball) s.ball.visible = false
}
