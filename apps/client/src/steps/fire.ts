import type { PlaybackStep } from "@apex/sim"
import { clamp01 } from "../anim"
import { type ReactionKind, reactionFor } from "../choreo"
import type { DriveFighter } from "../fighter-driver"
import { fxFor, PROJECTILE_LIFE_MS } from "../move-fx"
import type { Side, StepIO } from "./context"
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

/**
 * The victim reaction at an attack's contact moment: squash the body
 * (profile-weighted from the reaction library), flash and stop the
 * frame on big hits. Heavy reactions skip the stage shove - the
 * outward movement belongs to the follow-up stagger/knockback reel
 * (the sim's range shift), not a second nudge. One helper so basic
 * and special hits look like the same physical impact.
 */
export function contactReaction(
  io: StepIO,
  damage: number | undefined,
  at: DriveFighter,
  heavy = false,
  element?: string,
): void {
  if (!heavy) {
    const knock = strikeReach(damage)
    // Knockback pushes the victim OUTWARD (own away side, same convention
    // as the dodge dash) - a minus here drags the pair into each other
    // with every landed hit.
    at.stage.x += at.away * knock
    at.stage.z += (Math.random() - 0.5) * 0.3
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
  const fx = fxFor(step.moveId)
  const at = side.target.group.position.clone()
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
  const fx = fxFor(step.moveId)
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
        )
      }
      const release = beats[0] ?? wind
      const w = clamp01((t - release) / Math.max(0.01, 1 - release))
      applyPosture(fx.pose.recoil, w, ao, away)
    },
    side.actor,
    side.target,
  )
}
