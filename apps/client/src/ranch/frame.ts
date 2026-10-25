import { driveFace } from "../face-motion"
import {
  gaitPose,
  retireMorningAfterTint,
  setMorningAfterTint,
  stageScale,
  swayAngle,
} from "../scene-logic"
import { updateBall, updateSparkle } from "./effects"
import { updateIdle } from "./idle"
import { MOOD_PROFILES, moodModeFrom } from "./mood"
import { rebuild } from "./mount"
import {
  applyBreath,
  applyGait,
  applyGlow,
  applyMorningAfterIdle,
  applyMorningAfterPose,
  applyPetPose,
  applyRestPose,
  applyTreatPose,
} from "./poses"
import type { RanchState } from "./state"

/**
 * One ranch frame: expire the droopy window, breathe, run the evolution
 * ceremony, then either the care pose or the idle half, lay the pet pose on
 * top, report the creature to the camera, and rock the props. `ranchActive`
 * false parks the creature but still advances the wind.
 */
export function updateRanch(
  s: RanchState,
  t: number,
  dt: number,
  ranchActive: boolean,
): void {
  // Momentary droopy window (cup early exit): once it expires, fall back
  // to the condition-driven idle.
  if (s.droopyUntil !== 0 && performance.now() >= s.droopyUntil) {
    s.droopyUntil = 0
    s.mode = s.lastConditions ? moodModeFrom(s.lastConditions) : "normal"
  }
  // Night settle (postcup_morning_after FR-9): a day tint from an earlier
  // sim day clears here — the morning-after never outlives its day. The
  // app pushes the sim day down explicitly (a day 0 default can never
  // retire: the tint's own day is always >= 1).
  if (s.morningAfterTint.active) {
    retireMorningAfterTint(s.morningAfterTint, s.day)
    if (!s.morningAfterTint.active) {
      // The tint actually retired — the night settle. The class-conditioned
      // first-pet window belongs to the ritual day too: never petted, it
      // closes with the day (FR-5) and the mood picks again tomorrow.
      s.morningAfterPetPending = false
    }
  }
  const profile = MOOD_PROFILES[s.mode]
  const creatureGroup = s.creatureGroup
  if (ranchActive && creatureGroup) {
    const breath = applyBreath(
      s.rigParts,
      t,
      profile,
      s.restActive,
      s.headBaseY,
    )
    // Evolution ceremony (spec R5): while active it owns the creature's
    // pose, scale, and glow outright — the feed walk and the wanderer
    // stay parked (startEvolution preempted them). The swap rebuilds the
    // rig to the juvenile build mid-ceremony; afterwards the machine
    // keeps driving the fresh rig until it settles.
    const evo = s.evolution.advance(
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
    if (s.evolutionActive && !evoActive) {
      const done = s.evolutionDone
      s.evolutionDone = null
      done?.()
    }
    s.evolutionActive = evoActive
    let evoGait = false
    if (evoActive) {
      creatureGroup.position.x = evo.x
      creatureGroup.position.z = evo.z
      creatureGroup.rotation.y = evo.yaw
      creatureGroup.scale.setScalar(evo.scale)
      applyGlow(creatureGroup, evo.glow)
      if (evo.swap && s.evolutionSwap) {
        const swap = s.evolutionSwap
        s.evolutionSwap = null
        rebuild(s, swap.archetypeId, swap.seed, swap.stage, swap.branch)
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
      creatureGroup.scale.setScalar(stageScale(s.currentStage))
      // Postcup morning-after ceremony: while the machine owns the
      // creature the other ceremony machines keep advancing silently and
      // the walk machines stay parked — a starter abandoned any target.
      // The settle edge latches the class stance as the day tint (the
      // machine's latched outcome never re-fires it later).
      const wasMorningAfter = s.morningAfterActive
      const md = s.morningAfter.advance(dt)
      s.morningAfterActive = md.active
      const rd = s.rest.advance(dt)
      s.restActive = rd.phase !== "idle"
      const td = s.treat.advance(dt)
      s.treatActive = td.phase !== "idle"
      updateSparkle(s.sparkle, t, s.treatActive ? td.relief : 0)
      const pd = s.play.advance(dt)
      s.playActive = pd.phase !== "idle"
      updateBall(s.ball, pd)
      if (s.morningAfterActive) {
        applyMorningAfterPose(
          creatureGroup,
          s.rigParts,
          s.archetypeId,
          md,
          s.headBaseY,
        )
      } else {
        if (wasMorningAfter && md.outcome !== "none") {
          setMorningAfterTint(s.morningAfterTint, s.morningAfterClass, s.day)
        }
        // Rest (FR3) and treat (FR4) ceremonies: while either is active it
        // owns the creature's pose — walk and wander stay parked.
        if (s.restActive) {
          applyRestPose(creatureGroup, s.rigParts, rd, breath, s.headBaseY)
        } else if (s.treatActive) {
          applyTreatPose(creatureGroup, s.rigParts, td, s.headBaseY)
        } else {
          away = away || updateIdle(s, t, dt, pd, profile)
        }
        // The day tint (FR-3): the retired latch writes zeros — every
        // morning-after move returns to rest the frame after the night
        // settle.
        applyMorningAfterIdle(
          s.rigParts,
          s.archetypeId,
          s.morningAfterTint.strut,
          s.morningAfterTint.droop,
          s.headBaseY,
        )
      }
      // Ambient pet (FR6): advance the reaction and lay its pose on top of
      // the frame's base pose, so it composes with the breath and gait. A
      // ceremony that started mid-reaction owns the creature outright, so
      // the pose is withheld (the machine keeps timing, which means the
      // cooldown cannot be reset by spamming care actions).
      const petD = s.petMachine.advance(dt)
      if (
        petD.active &&
        !s.morningAfterActive &&
        !s.restActive &&
        !s.treatActive &&
        !s.playActive
      ) {
        s.petTime += dt
        applyPetPose(creatureGroup, s.rigParts, petD, s.petTime)
      }
    } else {
      // During the ceremony the legs stride only on the walk phase; the
      // glow/settle phases hold the pose. The holder sits on the ground.
      applyGait(creatureGroup, gaitPose(t, evoGait ? 1 : 0, s.reducedMotion))
      creatureGroup.position.y = 0
    }
    // Face idle: the lid and the eye-only glance. Reduced motion keeps
    // the blink (a lid, not travel) and parks the glance. Eyes are cached
    // at rebuild time, so this is four number writes per frame.
    driveFace(s.rigParts.eyes, s.faceSeed, t, s.reducedMotion)
    // Soft camera track: report where the creature ended up this frame.
    s.deps.onCreatureMoved(
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
  for (const w of s.windProps) {
    const angle = swayAngle(w.baseAmp, w.phase, t, s.reducedMotion)
    w.group.rotation.x = angle
    w.group.rotation.z = angle * 0.5
  }
}
