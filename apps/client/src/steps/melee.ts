import { PLAYBACK_PHASES } from "@apex/sim"
import * as THREE from "three"
import { easeOut, easeOutCubic, phaseAt } from "../anim"
import type { StepRunner } from "./context"
import { contactReaction, impulse, snapTo } from "./fire"
import { heavyHit, meleeContact, STANCE_GAP, weave } from "./pure"

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
      if (melee.phase === "windup") {
        // Anticipation: coil back on the approach line, drop weight.
        const w = melee.local
        ao.offset.copy(dir).multiplyScalar(-0.22 * Math.sin(w * Math.PI))
        ao.offset.y = -0.05 * Math.sin(w * Math.PI)
        ao.lean.roll = 0.05 * Math.sin(w * Math.PI)
      } else if (melee.phase === "contact") {
        // The strike: uncoil fast down the line (easeOutCubic).
        const w = melee.local
        ao.offset
          .copy(dir)
          .multiplyScalar(
            -0.22 + (contact.distanceTo(from) + 0.22) * easeOutCubic(w),
          )
        ao.offset.y = -0.05 * (1 - w) + 0.06 * w
        ao.lean.pitch = 0.1 * Math.sin(w * Math.PI)
        ao.lean.roll = -0.05 * (1 - w)
        if (w > 0.3) impulse(io, ao, -0.28) // stretch while committing
      } else {
        // Follow-through + recovery: settle back to stance spacing.
        const w = melee.local
        ao.offset
          .copy(contact)
          .sub(from)
          .multiplyScalar(1 - easeOut(w))
        ao.lean.pitch = 0.1 * (1 - easeOut(w))
        ao.lean.roll = -0.05 * (1 - easeOut(w))
        if (!landed) {
          landed = true
          if (hit) {
            contactReaction(io, step.damage, at, heavyHit(step), step.element)
          } else if (dodged) {
            // The target slipped: a quick dash off the lane.
            at.stage.x += at.away * 0.85
            impulse(io, at, -0.3)
          }
        }
        if (hit && w > 0.6) impulse(io, ao, 0.12) // attacker settles heavy
      }
    },
    side.actor,
    side.target,
  )
}
