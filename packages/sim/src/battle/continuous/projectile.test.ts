/**
 * Projectiles: shots cross real distance in real time, and a body that moved
 * off the line dodges them.
 *
 * Continuous Arena Battle FR-8 and AC-8. The travel tests pin the integer
 * stepping and the distance-proportional arrival; the dodge tests pin lateral
 * motion as the only way to miss, so the arena — not a roll — decides.
 */

import { describe, expect, test } from "bun:test"
import { strikeDamage } from "../damage"
import { BODY_RADIUS_MM } from "../frames"
import { bodyOf, segmentHitsBody } from "./contact"
import { openingPoise } from "./poise"
import {
  advanceProjectile,
  DODGE_CLEARANCE_MM,
  launchProjectile,
  type ProjectileResolution,
  type ProjectileState,
  passedBody,
  perpendicularOffsetMm,
  resolveProjectiles,
  type ShotReport,
  shotDirection,
} from "./projectile"
import { openingStamina } from "./stamina"
import { createFight, type Fight, type FighterInit, stateHash } from "./step"
import type { StrikeStats } from "./strike"
import {
  type ArenaBounds,
  type AttackState,
  type Dir2,
  type FighterState,
  HOLD,
  type MoveIntent,
  type Vec3,
} from "./types"

const BOUNDS: ArenaBounds = {
  minX: -8000,
  maxX: 8000,
  minZ: -8000,
  maxZ: 8000,
}

const EAST: Dir2 = { x: 1000, z: 0 }
const WEST: Dir2 = { x: -1000, z: 0 }

/** Both sides stand still. */
const BOTH_HOLD: readonly [MoveIntent, MoveIntent] = [HOLD, HOLD]

/** The away side strafes across the line while the home side holds. */
const STRAFE: readonly [MoveIntent, MoveIntent] = [HOLD, { x: 0, z: 1000 }]

const STATS: readonly [StrikeStats, StrikeStats] = [
  { atk: 30, def: 20 },
  { atk: 30, def: 20 },
]

function at(x: number, z = 0): Vec3 {
  return { x, y: 0, z }
}

function side(key: string, x: number, facing: Dir2): FighterInit {
  return { key, spd: 10, at: { x, z: 0 }, facing, stats: { atk: 30, def: 20 } }
}

/** Two fighters `distance` apart, facing each other, both at rest. */
function duel(distance: number): Fight {
  const half = Math.floor(distance / 2)
  return createFight({
    seed: 20261108,
    bounds: BOUNDS,
    fighters: [side("home", -half, EAST), side("away", half, WEST)],
  })
}

/** A bare fighter for the resolution tests, away from the factory's rules. */
function fighter(
  key: string,
  x: number,
  facing: Dir2,
  attack?: AttackState | null,
): FighterState {
  return {
    key,
    pos: at(x),
    vel: { x: 0, y: 0, z: 0 },
    facing,
    radiusMm: 220,
    heightMm: 900,
    spd: 10,
    hp: 100,
    hpMax: 100,
    attack,
    ...openingPoise(),
    ...openingStamina(),
    hitstunMs: 0,
  }
}

function launched(
  shooter: FighterState,
  target: FighterState,
  moveId: string,
): ProjectileState {
  const shot = launchProjectile(0, shooter, target, moveId)
  if (!shot) throw new Error(`expected ${moveId} to launch a shot`)
  return shot
}

function onlyShot(shots: readonly ShotReport[]): ShotReport {
  const [shot] = shots
  if (!shot) throw new Error("expected a resolved shot")
  return shot
}

function onlyProjectile(fight: Fight): ProjectileState {
  const [shot] = fight.state.projectiles
  if (!shot) throw new Error("expected a projectile in flight")
  return shot
}

/** Advance one shot until it resolves, with both bodies held still. */
function resolveShot(
  shot: ProjectileState,
  before: readonly [FighterState, FighterState],
  after: readonly [FighterState, FighterState],
  stats: readonly [StrikeStats, StrikeStats],
): ProjectileResolution {
  let projectiles: readonly ProjectileState[] = [shot]
  for (let step = 0; step < 60; step++) {
    const result = resolveProjectiles(projectiles, before, after, stats)
    if (result.shots.length > 0) return result
    projectiles = result.projectiles
  }
  throw new Error("shot never resolved")
}

/** Run a fight until the first shot resolves, reporting the step it landed. */
function runUntilResolved(
  fight: Fight,
  moveId: string,
  orders: readonly [MoveIntent, MoveIntent],
): { step: number; shots: readonly ShotReport[] } {
  if (!fight.commit(0, moveId)) throw new Error(`could not commit ${moveId}`)
  for (let step = 0; step < 60; step++) {
    const result = fight.advance(orders)
    if (result.shots.length > 0) {
      return { step: result.state.step, shots: result.shots }
    }
  }
  return { step: -1, shots: [] }
}

describe("projectiles — the launch (FR-8)", () => {
  test("aims along the line to the body as a unit direction", () => {
    expect(shotDirection(at(0), at(3000))).toEqual({ x: 1000, z: 0 })
    expect(shotDirection(at(0), at(3000, 4000))).toEqual({ x: 600, z: 800 })
    expect(shotDirection(at(0), at(0))).toEqual({ x: 0, z: 0 })
  })

  test("starts at the shooter's centre with the authored speed", () => {
    const fight = duel(3000)
    const [home, away] = fight.state.fighters
    const shot = launched(home, away, "spark")
    expect(shot.ownerKey).toBe("home")
    expect(shot.moveId).toBe("spark")
    expect(shot.origin).toEqual(home.pos)
    expect(shot.pos).toEqual(home.pos)
    expect(shot.dir).toEqual({ x: 1000, z: 0 })
    expect(shot.speedMmPerMs).toBe(12)
    expect(shot.travelledMm).toBe(0)
  })

  test("a melee move launches nothing", () => {
    const fight = duel(420)
    const [home, away] = fight.state.fighters
    expect(launchProjectile(0, home, away, "basic")).toBeNull()
  })

  test("an unknown move is refused", () => {
    const fight = duel(3000)
    const [home, away] = fight.state.fighters
    expect(() => launchProjectile(0, home, away, "nope")).toThrow(
      /Unknown move/,
    )
  })
})

describe("projectiles — travel (FR-8)", () => {
  test("each step covers the authored speed times the step", () => {
    const fight = duel(3000)
    const [home, away] = fight.state.fighters
    let shot = launched(home, away, "spark")
    for (let step = 1; step <= 10; step++) {
      shot = advanceProjectile(shot)
      expect(shot.travelledMm).toBe(step * 12 * 20)
      expect(shot.pos).toEqual(at(shot.origin.x + step * 240))
    }
  })

  test("a slow shot travels its own speed, not the fast one's", () => {
    const fight = duel(3000)
    const [home, away] = fight.state.fighters
    const slow = launched(home, away, "tectonic_slam")
    expect(slow.speedMmPerMs).toBe(4)
    expect(advanceProjectile(advanceProjectile(slow)).travelledMm).toBe(160)
  })

  test("a shot is spent once it has passed the body", () => {
    const fight = duel(3000)
    const [home, away] = fight.state.fighters
    const body = bodyOf(away)
    const shot = launched(home, away, "spark")
    expect(passedBody(shot, body)).toBe(false)
    expect(passedBody({ ...shot, travelledMm: 3220 }, body)).toBe(false)
    expect(passedBody({ ...shot, travelledMm: 3221 }, body)).toBe(true)
    expect(passedBody({ ...shot, travelledMm: 4000 }, body)).toBe(true)
  })

  test("a fast shot cannot tunnel through a small body between steps", () => {
    const home = fighter("home", 0, EAST)
    const away = { ...fighter("away", 350, WEST), radiusMm: 100 }
    const shot = launched(home, away, "spark")
    const first = advanceProjectile(shot)
    const second = advanceProjectile(first)
    const body = bodyOf(away)
    const band = { fromMm: 150, toMm: 1100 }
    expect(second.travelledMm).toBe(480)
    expect(segmentHitsBody(first.pos, second.pos, body, band)).toBe(true)
    const report = onlyShot(
      resolveShot(shot, [home, away], [home, away], STATS).shots,
    )
    expect(report.outcome).toBe("hit")
  })

  test("perpendicular offset is a cross product, never trigonometry", () => {
    const fight = duel(3000)
    const [home, away] = fight.state.fighters
    const shot = launched(home, away, "spark")
    expect(perpendicularOffsetMm(shot, at(shot.origin.x + 500, 300))).toBe(300)
    expect(perpendicularOffsetMm(shot, at(shot.origin.x + 500, -300))).toBe(300)
    expect(perpendicularOffsetMm(shot, at(shot.origin.x + 500, 0))).toBe(0)
  })
})

describe("projectiles — arrival and dodge (FR-8, AC-8)", () => {
  test("a shot from far lands later than the same shot from near", () => {
    const near = runUntilResolved(duel(1500), "spark", BOTH_HOLD)
    const far = runUntilResolved(duel(4500), "spark", BOTH_HOLD)
    expect(onlyShot(near.shots).outcome).toBe("hit")
    expect(onlyShot(far.shots).outcome).toBe("hit")
    expect(near.step).toBe(19)
    expect(far.step).toBe(31)
    expect(far.step).toBeGreaterThan(near.step)
  })

  test("the same strafe dodges a far shot but not a near one", () => {
    const near = runUntilResolved(duel(700), "spark", STRAFE)
    const far = runUntilResolved(duel(4500), "spark", STRAFE)
    expect(onlyShot(near.shots).outcome).toBe("hit")
    expect(onlyShot(far.shots).outcome).toBe("dodged")
    expect(onlyShot(far.shots).damage).toBe(0)
  })

  test("the dodge clearance is the body radius", () => {
    expect(DODGE_CLEARANCE_MM).toBe(BODY_RADIUS_MM)
    expect(DODGE_CLEARANCE_MM).toBe(220)
  })
})

describe("projectiles — damage reuses the strike path (FR-4)", () => {
  test("a front hit deals the shared positional damage", () => {
    const home = fighter("home", -1500, EAST)
    const away = fighter("away", 1500, WEST)
    const result = resolveShot(
      launched(home, away, "spark"),
      [home, away],
      [home, away],
      STATS,
    )
    const report = onlyShot(result.shots)
    expect(report.outcome).toBe("hit")
    expect(report.position).toBe("front")
    expect(report.counter).toBe(false)
    expect(report.interrupted).toBe(false)
    expect(report.damage).toBe(strikeDamage(12, 30, 20, 1, 1, true))
    expect(result.projectiles).toHaveLength(0)
  })

  test("the shot carries the move's type factor", () => {
    const home = fighter("home", -1500, EAST)
    const away = fighter("away", 1500, WEST)
    const typed: readonly [StrikeStats, StrikeStats] = [
      { atk: 30, def: 20, element: "fire" },
      { atk: 30, def: 20, element: "plant" },
    ]
    const report = onlyShot(
      resolveShot(
        launched(home, away, "spark"),
        [home, away],
        [home, away],
        typed,
      ).shots,
    )
    expect(report.damage).toBe(strikeDamage(12, 30, 20, 3, 2, true))
  })

  test("a shot on a recovering victim is a counter", () => {
    const home = fighter("home", -1500, EAST)
    const away = fighter("away", 1500, WEST)
    const recovering: AttackState = {
      moveId: "basic",
      phase: "recovery",
      elapsedMs: 0,
      landed: true,
    }
    const report = onlyShot(
      resolveShot(
        launched(home, away, "spark"),
        [home, away],
        [home, { ...away, attack: recovering }],
        STATS,
      ).shots,
    )
    expect(report.counter).toBe(true)
    expect(report.damage).toBeGreaterThan(strikeDamage(6, 30, 20, 1, 1, true))
  })

  test("a shot on a starting victim interrupts it", () => {
    const home = fighter("home", -1500, EAST)
    const away = fighter("away", 1500, WEST)
    const starting: AttackState = {
      moveId: "basic",
      phase: "startup",
      elapsedMs: 0,
      landed: false,
    }
    const result = resolveShot(
      launched(home, away, "spark"),
      [home, away],
      [home, { ...away, attack: starting }],
      STATS,
    )
    expect(onlyShot(result.shots).interrupted).toBe(true)
    expect(result.fighters[1].attack).toBeNull()
  })

  test("a body off the line is dodged, not damaged", () => {
    const home = fighter("home", -1500, EAST)
    const away = fighter("away", 1500, WEST)
    const offset = { ...away, pos: at(1500, 300) }
    const report = onlyShot(
      resolveShot(
        launched(home, away, "spark"),
        [home, offset],
        [home, offset],
        STATS,
      ).shots,
    )
    expect(report.outcome).toBe("dodged")
    expect(report.damage).toBe(0)
    expect(report.counter).toBe(false)
  })
})

describe("projectiles — in the step (FR-8)", () => {
  test("a ranged move fires a shot instead of landing on the spot", () => {
    const fight = duel(1500)
    expect(fight.commit(0, "spark")).toBe(true)
    let strikes = 0
    let shots = 0
    for (let step = 0; step < 60; step++) {
      const result = fight.advance(BOTH_HOLD)
      strikes += result.strikes.length
      shots += result.shots.length
    }
    expect(strikes).toBe(0)
    expect(shots).toBe(1)
  })

  test("one committed move fires exactly once", () => {
    const fight = duel(3000)
    expect(fight.commit(0, "pyre_wall")).toBe(true)
    let shots = 0
    for (let step = 0; step < 80; step++) {
      shots += fight.advance(BOTH_HOLD).shots.length
    }
    expect(shots).toBe(1)
  })

  test("a shot leaves the state when it resolves", () => {
    const fight = duel(1500)
    expect(fight.commit(0, "spark")).toBe(true)
    let inFlight = 0
    for (let step = 0; step < 60; step++) {
      fight.advance(BOTH_HOLD)
      inFlight = Math.max(inFlight, fight.state.projectiles.length)
    }
    expect(inFlight).toBe(1)
    expect(fight.state.projectiles).toHaveLength(0)
  })

  test("a melee move still lands on the spot and fires nothing", () => {
    const fight = duel(420)
    expect(fight.commit(0, "basic")).toBe(true)
    let strikes = 0
    let shots = 0
    for (let step = 0; step < 20; step++) {
      const result = fight.advance(BOTH_HOLD)
      strikes += result.strikes.length
      shots += result.shots.length
    }
    expect(strikes).toBeGreaterThan(0)
    expect(shots).toBe(0)
    expect(fight.state.projectiles).toHaveLength(0)
  })
})

describe("projectiles — determinism (NFR-1)", () => {
  test("identical fights replay identical shots and hashes", () => {
    function replay(): { hashes: number[]; shots: string[] } {
      const fight = duel(3000)
      fight.commit(0, "spark")
      const hashes: number[] = []
      const shots: string[] = []
      for (let step = 0; step < 60; step++) {
        const result = fight.advance(STRAFE)
        hashes.push(result.hash)
        for (const shot of result.shots) {
          shots.push(
            `${shot.ownerKey}:${shot.moveId}:${shot.outcome}:${shot.damage}`,
          )
        }
      }
      return { hashes, shots }
    }
    const first = replay()
    const second = replay()
    expect(first.hashes).toEqual(second.hashes)
    expect(first.shots).toEqual(second.shots)
    expect(first.shots.length).toBeGreaterThan(0)
  })

  test("the hash covers the shots in flight", () => {
    const fight = duel(4500)
    fight.commit(0, "spark")
    for (let step = 0; step < 21; step++) fight.advance(BOTH_HOLD)
    const shot = onlyProjectile(fight)
    expect(stateHash(fight.state)).not.toBe(
      stateHash({ ...fight.state, projectiles: [] }),
    )
    expect(
      stateHash({
        ...fight.state,
        projectiles: [{ ...shot, travelledMm: shot.travelledMm + 1 }],
      }),
    ).not.toBe(stateHash(fight.state))
  })
})
