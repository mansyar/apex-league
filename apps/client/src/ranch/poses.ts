import * as THREE from "three"
import {
  type GaitPose,
  gaitPose,
  type PetDrive,
  type RestDrive,
  type TreatDrive,
} from "../scene-logic"
import { lambertMaterialOf } from "../scene-utils"
import type { MoodProfile } from "./mood"
import type { RigParts } from "./state"

/** Deep, slow breathing while the rest ceremony owns the creature
 * (ranch_rituals_20261018 FR3) — sleep reads as long, heavy breaths
 * instead of the condition-driven idle profile. */
export const REST_BREATH_RATE = 0.8
export const REST_BREATH_AMP = 0.05

/** Paint the glow: emissive lift on every mesh of the current rig. The
 * decay tail writes the materials back to black before the machine goes
 * idle, so no explicit reset is needed. */
export function applyGlow(group: THREE.Object3D, intensity: number): void {
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
export function applyGait(creature: THREE.Group, pose: GaitPose): void {
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
 * Breathe idle: squash-and-stretch on the body around its HIP-LINE pivot,
 * plus the head droop and the tail sway. Scale never moves the pivot, so
 * body voxels at the leg junction stay fixed and the legs remain visually
 * attached. While the rest ceremony owns the creature the breath is deep
 * and slow (ranch_rituals_20261018 FR3). Returns the breath phase so the
 * rest pose can ride the same curve.
 */
export function applyBreath(
  rig: RigParts,
  t: number,
  profile: MoodProfile,
  restActive: boolean,
  headBaseY: number,
): number {
  const bRate = restActive ? REST_BREATH_RATE : profile.breathRate
  const bAmp = restActive ? REST_BREATH_AMP : profile.breathAmp
  const breath = Math.sin(t * bRate)
  const body = rig.body
  if (body) {
    body.scale.set(
      1 - breath * bAmp * 0.3,
      1 + breath * bAmp,
      1 - breath * bAmp * 0.3,
    )
  }
  const head = rig.head
  if (head) {
    head.position.y =
      headBaseY + breath * bAmp * 0.6 - (restActive ? 0 : profile.headDroop)
  }
  const sway = Math.sin(t * 1.3)
  const tail = rig.tail
  if (tail) tail.rotation.y = sway * 0.06
  const tailTip = rig.tailTip
  if (tailTip) tailTip.rotation.y = sway * 0.12
  return breath
}

/** Map the rest ceremony's drive onto the rig: legs fold under, the body
 * settles low, the head sinks; the wake stretch lifts the head and
 * reaches the spine tall. Called after the breathing writes so it
 * composes with (never fights) the idle breath. Reduced motion rides the
 * same mapping — the machine just jumps straight to a still curl. */
export function applyRestPose(
  creature: THREE.Group,
  rig: RigParts,
  rd: RestDrive,
  breath: number,
  headBaseY: number,
): void {
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
  const head = rig.head
  if (head) {
    // Sleep: the head sinks onto the curl. Wake: it rises past base —
    // the reach that reads as a stretch.
    head.position.y =
      headBaseY +
      breath * REST_BREATH_AMP * 0.6 -
      curl * (headBaseY * 0.35 + 0.05) +
      rd.stretch * (headBaseY * 0.35 + 0.05)
  }
  const body = rig.body
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
export function applyTreatPose(
  creature: THREE.Group,
  rig: RigParts,
  td: TreatDrive,
  headBaseY: number,
): void {
  applyGait(creature, gaitPose(0, 0, true))
  const s = td.subdued
  const head = rig.head
  if (head) head.position.y = headBaseY - s * (headBaseY * 0.45 + 0.06)
  const body = rig.body
  if (body) body.rotation.x = s * 0.08
  creature.position.y = -s * 0.05
}

/** Map a pet drive onto the rig. `react` is the machine's eased 0..1 arc
 * (already attenuated for reduced motion), so every variant starts and
 * ends at rest. */
export function applyPetPose(
  creature: THREE.Group,
  rig: RigParts,
  pd: PetDrive,
  petTime: number,
): void {
  const r = pd.react
  const body = rig.body
  const head = rig.head
  const tail = rig.tail
  if (pd.variant === "hop") {
    // Happy bounce: the whole creature leaves the ground on the arc.
    creature.position.y += r * (pd.subtle ? 0.05 : 0.2)
    if (body) body.scale.y *= 1 + r * 0.06
    return
  }
  if (pd.variant === "wiggle") {
    // Content wag: a quick side-to-side roll with the tail keeping time.
    const wobble = Math.sin(petTime * (pd.subtle ? 9 : 16))
    if (body) body.rotation.z += wobble * r * 0.09
    if (head) head.rotation.z = wobble * r * 0.06
    if (tail) tail.rotation.y += Math.sin(petTime * 14) * r * 0.25
    return
  }
  // "lean" (low mood) and "stir" (sick override): subdued responses — a
  // slow weight shift and a small head lift, no travel. The sick stir is
  // deliberately weaker: it reads as "trying", not as a perk-up.
  const depth = pd.variant === "stir" ? 0.05 : 0.14
  if (body) body.rotation.z -= r * depth
  if (head) head.position.y += r * (pd.variant === "stir" ? 0.008 : 0.03)
  creature.position.y += r * (pd.variant === "stir" ? 0.008 : 0.03)
}
