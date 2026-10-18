import {
  gaitIntensity,
  gaitPose,
  type PlayDrive,
  type WanderDrive,
} from "../scene-logic"
import type { MoodProfile } from "./mood"
import { applyGait } from "./poses"
import type { RanchState } from "./state"

/** How deep the nibble head-dips go (in the head pivot's local units —
 * the rig runs in grid units, so this scales with the creature). */
const DIP_DEPTH = 1.2
/** Peak height of the play celebrate hop. */
const PLAY_BOUNCE_HEIGHT = 0.18

/**
 * The idle half of the frame: feed walk, sparse wandering, the gait, the
 * nibble head-dips, the happy bounce / celebrate hop. Returns whether the
 * creature moved logic this frame (the camera track's `away` flag).
 *
 * It owns the walk advance, because the play chase/return legs ride on the
 * same machine.
 */
export function updateIdle(
  s: RanchState,
  t: number,
  dt: number,
  pd: PlayDrive,
  profile: MoodProfile,
): boolean {
  const creature = s.creatureGroup
  if (!creature) return false
  let away = false
  const wd = s.walk.advance(creature.position.x, creature.position.z, dt)
  // Play legs ride on the shared walk machine (FR5): start a leg
  // when the ceremony enters chase/return, and report the leg's
  // completion to the machine on the walk's falling edge.
  if (s.playActive && pd.phase !== s.prevPlayPhase) {
    if (pd.phase === "chase") {
      s.walk.begin(
        creature.position.x,
        creature.position.z,
        s.playLanding.x,
        s.playLanding.z,
        creature.rotation.y,
      )
    } else if (pd.phase === "return") {
      s.walk.begin(
        creature.position.x,
        creature.position.z,
        s.playHome.x,
        s.playHome.z,
        creature.rotation.y,
      )
    }
  }
  if (s.playActive && s.prevWalkMoving && wd.phase === "idle") {
    s.play.walkDone()
  }
  s.prevPlayPhase = pd.phase
  s.prevWalkMoving = wd.phase !== "idle"
  if (wd.phase !== "idle") {
    // While walking, the machine owns the creature's pose. While idle
    // it never touches it — a stale machine yaw must never yank the
    // freshly rebuilt idle creature around (user-reported snap).
    creature.position.x = wd.x
    creature.position.z = wd.z
    creature.rotation.y = wd.yaw
  }
  // Sparse wandering (FR3): while the ceremony is idle and the mood is
  // eligible, the wander machine may start a trip to a nearby tuft or
  // bush. A feed ceremony takes priority — startFeed aborts the
  // wanderer, so the two machines never fight over the creature.
  let wandDrive: WanderDrive | null = null
  if (wd.phase === "idle" && s.wander) {
    wandDrive = s.wander.advance(
      creature.position.x,
      creature.position.z,
      creature.rotation.y,
      dt,
      s.mode !== "droopy" && !s.playActive,
    )
    if (wandDrive.phase !== "home-idle") {
      creature.position.x = wandDrive.x
      creature.position.z = wandDrive.z
      creature.rotation.y = wandDrive.yaw + wandDrive.lookOffset
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
        drive.targetX - creature.position.x,
        drive.targetZ - creature.position.z,
      )
    : 0
  applyGait(
    creature,
    gaitPose(t, gaitIntensity(traveling, remaining), s.reducedMotion),
  )
  const head = s.rigParts.head
  if (wd.phase === "nibble" && head) {
    // 2–3 gentle head-dips toward the pile over the existing pivot.
    head.position.y -= wd.dipOffset * DIP_DEPTH
  }
  if (s.playActive && pd.phase === "celebrate") {
    // Celebrate hop: three quick in-place hops over the machine's
    // bounce envelope — the walk/wander idles underneath stay flat.
    creature.position.y = pd.bounce * PLAY_BOUNCE_HEIGHT
  } else if (
    !s.reducedMotion &&
    drive.phase === "idle" &&
    !wandDrive &&
    profile.bounce > 0
  ) {
    creature.position.y = Math.abs(Math.sin(t * 3.2)) * profile.bounce
  } else {
    creature.position.y = 0
  }
  away = away || wd.phase !== "idle" || wandDrive !== null
  return away
}
