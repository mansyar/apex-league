import { PLAYBACK_PHASES } from "@apex/sim"
import * as THREE from "three"
import { phaseAt } from "../anim"
import type { StepRunner } from "./context"
import { contactReaction, impulse, snapTo } from "./fire"
import { heavyHit, meleeContact, STANCE_GAP, strikePose, weave } from "./pure"

/**
 * Authored attack: wind-up (coil back), committed strike into contact,
 * then a weighted recovery. A hit lands at contact (knockback, squash,
 * flash); a miss is a whiff the target slipped (dodge dash) or simply
 * avoids. Phase timing comes from the enriched playback contract (FR3)
 * — the melee boundaries here are the contract's own numbers, so
 * choreography and script agree by construction.
 */
export const meleeStep: StepRunner = (step, instant, side, _o, _r, io) => {
  const hit = step.hit !== false
  const dodged = !hit && step.missReason === "dodge"
  if (instant) {
    // Resolve instantly: run the contact consequences with no anim.
    if (hit)
      contactReaction(
        io,
        step.damage,
        side.target,
        heavyHit(step),
        step.element,
        step.tick,
      )
    if (dodged) {
      side.target.stage.x += side.target.away * 0.85
      snapTo(side.target)
    }
    side.actor.stage.set(
      side.target.stage.x + side.actor.away * STANCE_GAP,
      0,
      side.target.stage.z,
    )
    snapTo(side.actor)
    return
  }
  const from = side.actor.group.position.clone()
  const toPos = side.target.group.position.clone()
  const geo = meleeContact(from, toPos, weave(step))
  const dir = new THREE.Vector3(geo.dirX, 0, geo.dirZ)
  const contact = new THREE.Vector3(geo.x, from.y, geo.z)
  let landed = false
  io.startAction(
    (t, ao, at) => {
      const melee = phaseAt(t, PLAYBACK_PHASES.melee)
      // The archetype's attack character scales the strike's amplitudes.
      const strike = ao.profile.strikeMult
      // The travel to the contact point is a distance, not an amplitude:
      // it stays the same whatever the body weighs.
      const reach = contact.distanceTo(from)
      if (melee.phase === "windup") {
        // Anticipation: coil back on the approach line, drop weight.
        const pose = strikePose("windup", melee.local, reach, strike)
        ao.offset.copy(dir).multiplyScalar(pose.along)
        if (pose.y !== undefined) ao.offset.y = pose.y
        if (pose.roll !== undefined) ao.lean.roll = pose.roll
      } else if (melee.phase === "contact") {
        // The strike: uncoil fast down the line (easeOutCubic).
        const pose = strikePose("contact", melee.local, reach, strike)
        ao.offset.copy(dir).multiplyScalar(pose.along)
        if (pose.y !== undefined) ao.offset.y = pose.y
        if (pose.pitch !== undefined) ao.lean.pitch = pose.pitch
        if (pose.roll !== undefined) ao.lean.roll = pose.roll
        if (pose.impulse !== undefined) impulse(io, ao, pose.impulse)
      } else {
        // Follow-through + recovery: settle back to stance spacing.
        const pose = strikePose("recovery", melee.local, reach, strike, hit)
        ao.offset.copy(dir).multiplyScalar(pose.along)
        if (pose.pitch !== undefined) ao.lean.pitch = pose.pitch
        if (pose.roll !== undefined) ao.lean.roll = pose.roll
        if (!landed) {
          landed = true
          if (hit) {
            contactReaction(
              io,
              step.damage,
              at,
              heavyHit(step),
              step.element,
              step.tick,
            )
          } else if (dodged) {
            // The target slipped: a quick dash off the lane.
            at.stage.x += at.away * 0.85
            impulse(io, at, -0.3)
          }
        }
        if (pose.impulse !== undefined) impulse(io, ao, pose.impulse)
      }
    },
    side.actor,
    side.target,
  )
}
