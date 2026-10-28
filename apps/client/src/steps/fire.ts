import type { PlaybackStep } from "@apex/sim"
import { clamp01, jitter } from "../anim"
import { type ReactionKind, reactionFor } from "../choreo"
import type { DriveFighter } from "../fighter-driver"
import { fxFor, PROJECTILE_LIFE_MS } from "../move-fx"
import type { Side, StepIO } from "./context"
import { applyTransit } from "./fire-transit"
import { applyPosture, heavyHit, strikeReach } from "./pure"

/**
 * Shared fire/impact machinery for the step choreography: the victim's
 * contact reaction, the per-move arrival treatment, and the unified
 * special-fire pipeline (FR5). Each takes the StepIO port so nothing
 * here reaches back into staging's closures.
 */

/** Kick a fighter's squash spring; reduced motion dampens the impulse. */
export function impulse(io: StepIO, c: DriveFighter, amount: number): void {
  if (io.reduced()) amount *= 0.4
  c.squash.v += amount
}

/** Jump a fighter's whole walk state straight to its stage. */
export function snapTo(c: DriveFighter): void {
  c.smooth.copy(c.stage)
  c.velocity.set(0, 0, 0)
  c.offset.set(0, 0, 0)
}

/** Lateral spread of a landed hit's contact jitter, in world units (±). */
export const CONTACT_JITTER = 0.15

/**
 * Deterministic contact jitter (FR-7): the lateral offset a landed hit
 * nudges its victim by is a pure function of the step - seeded by the
 * playback tick where the caller knows it, keyed by the victim's
 * identity and the damage everywhere else. Same step, same pixel; no
 * clock, no RNG.
 */
export function contactJitter(
  seed: number | undefined,
  victimKey: string,
  damage: number | undefined,
): number {
  return jitter(seed ?? 0, `${victimKey}:${damage ?? 0}`, CONTACT_JITTER)
}

/**
 * The victim reaction at an attack's contact moment: squash the body
 * (profile-weighted from the reaction library), flash and stop the
 * frame on big hits. Heavy reactions skip the stage shove - the
 * outward movement belongs to the follow-up stagger/knockback reel
 * (the sim's range shift), not a second nudge. One helper so basic
 * and special hits look like the same physical impact.
 *
 * The optional `seed` is the playback tick: every production call site
 * passes `step.tick`, so a repeat hit on the same victim still lands
 * somewhere new. Omitting it stays supported - the offset then keys off
 * the victim and damage alone. Either way the lateral offset is a pure
 * function of the step (FR-7) - no clock, no RNG.
 */
export function contactReaction(
  io: StepIO,
  damage: number | undefined,
  at: DriveFighter,
  heavy = false,
  element?: string,
  seed?: number,
): void {
  if (!heavy) {
    const knock = strikeReach(damage)
    // Knockback pushes the victim OUTWARD (own away side, same convention
    // as the dodge dash) - a minus here drags the pair into each other
    // with every landed hit.
    at.stage.x += at.away * knock
    at.stage.z += contactJitter(seed, at.key ?? at.name, damage)
  }
  const kind: ReactionKind = heavy ? "stagger" : "glance"
  impulse(io, at, reactionFor(kind, at.profile).impulse)
  io.effects.startFlash(at)
  io.bigHit(damage)
  io.effects.spawnDecal(at.group.position, element, damage ?? 4)
}

/**
 * The per-move arrival treatment where a special lands - shared by
 * ranged arrivals (the impact step) and point-blank micro-flights.
 */
export function arriveSpecial(
  io: StepIO,
  step: PlaybackStep,
  side: Side,
): void {
  const fx = fxFor(step.moveId, step.element)
  // Exit wound (Phase 5 fix, P5.F3): a row-driven exit offset lands the
  // arrival burst past the defender along the attack axis. Zero on every
  // other row, whose bursts stay exactly where they are.
  const beyond = fx.arrival.beyond ?? 0
  const at = side.target.group.position.clone()
  if (beyond !== 0) {
    const ao = side.actor
    const dx = side.target.group.position.x - ao.group.position.x
    const dz = side.target.group.position.z - ao.group.position.z
    const dist = Math.hypot(dx, dz)
    if (dist > 1e-6) {
      at.x += (dx / dist) * beyond
      at.z += (dz / dist) * beyond
    } else {
      at.x += -ao.away * beyond
    }
  }
  if (fx.arrival.lanes) {
    for (const dz of fx.arrival.lanes) {
      const p = at.clone()
      p.z += dz
      io.effects.spawnBurst(p, step.element, fx.arrival.burst)
    }
  } else {
    io.effects.spawnBurst(at, step.element, fx.arrival.burst)
  }
  if (fx.arrival.shove !== 0) impulse(io, side.target, fx.arrival.shove)
}

/**
 * Unified special fire (FR5): run the move's launch body and release
 * its shots. Ranged fire runs at full pacing from the projectile
 * step (arrival is a separate impact step); point-blank fire
 * compresses the same body into the impact step with a micro-flight,
 * and the victim reacts when the shot actually lands.
 */
export function fireSpecial(
  io: StepIO,
  step: PlaybackStep,
  side: Side,
  compressed: boolean,
): void {
  const fx = fxFor(step.moveId, step.element)
  const away = side.actor.away
  const wind = compressed ? (fx.compressed?.wind ?? 0.32) : fx.wind
  // Scale the fixed micro-flight with the live pace, exactly like
  // animMs() does - otherwise fast-forward clamps animMs() to 120 ms
  // while the flight stays at full length and landBeat escapes [0, 1],
  // silently dropping the victim's reaction, burst, and decal.
  const flight = compressed
    ? (fx.compressed?.flight ?? Math.min(300, io.animMs() * 0.5)) *
      io.paceRatio()
    : (fx.shots[0]?.life ?? PROJECTILE_LIFE_MS)
  const beats =
    compressed && fx.compressed?.beats !== undefined
      ? fx.compressed.beats
      : compressed
        ? fx.shots.map(() => wind)
        : fx.shots.map((s) => s.at)
  const firedRef = { n: 0 }
  const landedRef = { done: false }
  const zeroRef = { done: false }
  const chargeRef = { done: false }
  const beamRef = { done: false }
  const trailRef = { bucket: -1 }
  // Point-blank: the shot lands inside this action; the victim
  // reacts at the landing beat, not before it. Clamped so a degenerate
  // schedule still fires the landing at the action's end.
  const landBeat = compressed
    ? Math.min(1, (beats[0] ?? wind) + flight / io.animMs())
    : Number.POSITIVE_INFINITY
  io.startAction(
    (t, ao) => {
      if (t < wind) {
        const w = t / wind
        applyPosture(fx.pose.windup, w, ao, away)
        if (fx.charge) {
          io.effects.setCharge(
            ao,
            step.element,
            fx.charge.from + w * (fx.charge.to - fx.charge.from),
          )
        }
        return
      }
      // Release the shots on their beats.
      while (firedRef.n < fx.shots.length) {
        const beat = beats[firedRef.n]
        const shot = fx.shots[firedRef.n]
        if (beat === undefined || shot === undefined || t < beat) break
        io.effects.spawnProjectile(ao, side.target, step.element, {
          size: shot.size,
          life: compressed ? flight : shot.life,
          spread: shot.spread ?? 0,
          // Thread the move id so the row's MOVE_SHOT_LOOK geometry
          // (fork/needle from Phase 2 on) actually renders in flight.
          moveId: step.moveId,
        })
        impulse(io, ao, fx.kick)
        if (firedRef.n === 0) {
          if (fx.charge) io.effects.clearCharge()
          if (fx.muzzle) {
            const mouth = ao.group.position.clone()
            mouth.y += 0.2
            io.effects.spawnBurst(mouth, step.element, fx.muzzle)
          }
        }
        firedRef.n += 1
      }
      // Zero-shot body launches still read as an attack: stage the kick
      // and clear the wreath once at the release beat, plus the muzzle
      // pop when the row authors one. Launch-path only — guards land
      // through the compressed impact below, which stays untouched.
      if (
        !compressed &&
        fx.shots.length === 0 &&
        !zeroRef.done &&
        t >= (beats[0] ?? wind)
      ) {
        zeroRef.done = true
        impulse(io, ao, fx.kick)
        // Transit rows keep the wreath: it rides the crossing body and
        // clears on the return (below) instead of vanishing at release.
        if (fx.charge && fx.transit === undefined) io.effects.clearCharge()
        if (fx.muzzle) {
          const mouth = ao.group.position.clone()
          mouth.y += 0.2
          io.effects.spawnBurst(mouth, step.element, fx.muzzle)
        }
      }
      // Pass-through beam (Phase 5 fix, P5.F3): a zero-shot row with a
      // row-driven exit offset fires one piercing streak from the mouth
      // through the defender to the exit point, so the flight geometry
      // visibly extends past the body. The shot count stays zero — the
      // streak is the beam, not a shot. Both paths: ranged and the
      // point-blank replay.
      const beamBeyond = fx.arrival.beyond ?? 0
      if (
        fx.shots.length === 0 &&
        beamBeyond > 0 &&
        !beamRef.done &&
        t >= (beats[0] ?? wind)
      ) {
        beamRef.done = true
        const bdx = side.target.group.position.x - ao.group.position.x
        const bdz = side.target.group.position.z - ao.group.position.z
        const bdist = Math.hypot(bdx, bdz)
        let bnx = -away
        let bnz = 0
        if (bdist > 1e-6) {
          bnx = bdx / bdist
          bnz = bdz / bdist
        }
        const exit = side.target.group.position.clone()
        exit.x += bnx * beamBeyond
        exit.z += bnz * beamBeyond
        io.effects.spawnProjectile(
          ao,
          { group: { position: exit } },
          step.element,
          {
            size: fx.arrival.burst.size ?? 1,
            life: 450,
            moveId: step.moveId,
          },
        )
      }
      // Point-blank: the shot lands inside this action.
      if (compressed && !landedRef.done && t >= landBeat) {
        landedRef.done = true
        arriveSpecial(io, step, side)
        contactReaction(
          io,
          step.damage,
          side.target,
          heavyHit(step),
          step.element,
          step.tick,
        )
      }
      const release = beats[0] ?? wind
      const w = clamp01((t - release) / Math.max(0.01, 1 - release))
      applyPosture(fx.pose.recoil, w, ao, away)
      // Attacker transit (Phase 5 fix, P5.F1/P5.F2; trail Phase 7):
      // the body lunges and returns — see applyTransit. Applied after
      // the recoil posture so it composes instead of being overwritten.
      if (fx.transit !== undefined) {
        applyTransit(
          fx.transit,
          fx.charge,
          t,
          release,
          ao,
          side.target.group.position,
          away,
          io,
          step.element,
          trailRef,
          chargeRef,
        )
      }
    },
    side.actor,
    side.target,
  )
}
