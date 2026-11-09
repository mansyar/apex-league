/**
 * The damage band (Battle Agency and Balance FR-1, AC-1; FR-8, AC-8).
 *
 * The band is measured on a **base hit**: a front hit that is not a counter,
 * with the type chart inert. Flank (x1.25), rear (x1.5) and counter (x1.25)
 * are earned bonuses and stack to x1.875, so a rear counter is *allowed* to
 * exceed the ceiling — that is the reward for the angle, not a hole in the
 * band. Measuring delivered damage instead would force rear hits to be
 * authored weaker, which would make circling pointless.
 *
 * The reference pool is derived from `startingHp` at the reference stat line
 * (hp 90 / atk 10 / def 10 / spd 10), never hard-coded, so the Phase 5 stat
 * fold cannot silently invalidate the band.
 */

import { describe, expect, test } from "bun:test"
import { startingHp } from "./continuous/hp"
import { positionalDamage } from "./continuous/damage"
import { getFrameData } from "./frames"
import { BASIC_MOVE, CATALOG, type MoveDef } from "./moves"

/** The reference stat line: the middle of the starter band (spec assumption). */
const REFERENCE_STATS = { hp: 90, atk: 10, def: 10, spd: 10 } as const

/** The pool a reference body fights on, derived exactly as the resolver does. */
const REFERENCE_POOL = startingHp({ stats: REFERENCE_STATS })

/** The FR-1 band, in percent of the reference pool. */
const BAND_MIN_PERCENT = 4
const BAND_MAX_PERCENT = 12

const ALL_MOVES: readonly MoveDef[] = [BASIC_MOVE, ...CATALOG]

/**
 * One move's base hit: front, no counter, chart-neutral. This is the only
 * reading the band constrains (see the file header).
 */
function baseDamage(move: MoveDef): number {
  return positionalDamage({
    power: move.power,
    atk: REFERENCE_STATS.atk,
    def: REFERENCE_STATS.def,
    type: { num: 1, den: 1 },
    position: "front",
    counter: false,
  })
}

/** A base hit's share of the reference pool, in percent. */
function baseShare(move: MoveDef): number {
  return (baseDamage(move) * 100) / REFERENCE_POOL
}

describe("damage band — every catalog move (FR-1, AC-1)", () => {
  test("a base hit lands inside 4-12% of the reference pool", () => {
    const offenders = ALL_MOVES.map((move) => ({
      id: move.id,
      damage: baseDamage(move),
      share: baseShare(move),
    })).filter(
      ({ share }) => share < BAND_MIN_PERCENT || share > BAND_MAX_PERCENT,
    )
    if (offenders.length > 0) {
      throw new Error(
        `base hit outside the ${BAND_MIN_PERCENT}-${BAND_MAX_PERCENT}% band ` +
          `(reference pool ${REFERENCE_POOL}): ` +
          offenders
            .map(
              ({ id, damage, share }) =>
                `${id} ${damage}/${REFERENCE_POOL} = ${share.toFixed(2)}%`,
            )
            .join(", "),
      )
    }
  })

  test("the pool is derived from startingHp, not a literal", () => {
    // Phase 5 folds HP_SCALE_PERCENT into stored stats; if this test hard-coded
    // 189 the band would drift silently when that fold lands.
    expect(REFERENCE_POOL).toBe(startingHp({ stats: REFERENCE_STATS }))
    expect(REFERENCE_POOL).toBeGreaterThan(0)
  })

  test("a rear counter may exceed the ceiling — the earned-angle reward", () => {
    const heaviest = ALL_MOVES.reduce((best, move) =>
      baseDamage(move) > baseDamage(best) ? move : best,
    )
    const base = baseShare(heaviest)
    expect(base).toBeLessThanOrEqual(BAND_MAX_PERCENT)

    const rearCounter =
      (positionalDamage({
        power: heaviest.power,
        atk: REFERENCE_STATS.atk,
        def: REFERENCE_STATS.def,
        type: { num: 1, den: 1 },
        position: "rear",
        counter: true,
      }) *
        100) /
      REFERENCE_POOL

    // Rear x1.5 times counter x1.25 is 1.875x the base share; the integer
    // floor keeps the delivered value at or below that ceiling.
    expect(rearCounter).toBeGreaterThan(BAND_MAX_PERCENT)
    expect(
      rearCounter,
      `${heaviest.id}: rear counter ${rearCounter.toFixed(2)}%`,
    ).toBeLessThanOrEqual((BAND_MAX_PERCENT * 15) / 8)
  })
})

describe("damage tiers — a heavy lands harder, costs more, recovers slower (FR-8, AC-8)", () => {
  const ELEMENTS = [
    "fire",
    "plant",
    "water",
    "electric",
    "earth",
    "wind",
  ] as const

  test("every element's heavy finisher beats its light kit row on all three", () => {
    for (const element of ELEMENTS) {
      const kit = CATALOG.filter((move) => move.element === element).slice(0, 6)
      const light = kit[0]
      const heavy = kit[5]
      if (!light || !heavy) throw new Error(`incomplete kit: ${element}`)
      const lightRow = getFrameData(light.id)
      const heavyRow = getFrameData(heavy.id)
      if (!lightRow || !heavyRow) throw new Error(`missing row: ${heavy.id}`)

      const label = `${element}: ${heavy.id} vs ${light.id}`
      expect(heavyRow.staminaCost, `${label} stamina`).toBeGreaterThan(
        lightRow.staminaCost,
      )
      expect(heavyRow.recoveryMs, `${label} recovery`).toBeGreaterThan(
        lightRow.recoveryMs,
      )
      expect(heavyRow.poiseDamage, `${label} poise`).toBeGreaterThan(
        lightRow.poiseDamage,
      )
      expect(baseDamage(heavy), `${label} damage`).toBeGreaterThan(
        baseDamage(light),
      )
    }
  })

  test("a kit's six power tiers stay distinct", () => {
    for (const element of ELEMENTS) {
      const powers = CATALOG.filter((move) => move.element === element)
        .slice(0, 6)
        .map((move) => move.power)
      expect(new Set(powers).size, `${element}: ${powers.join("/")}`).toBe(6)
      const heavy = powers[5]
      if (heavy === undefined) throw new Error(`incomplete kit: ${element}`)
      for (const power of powers.slice(0, 5)) {
        expect(heavy, `${element} heavy ${heavy} vs ${power}`).toBeGreaterThan(
          power,
        )
      }
    }
  })

  test("the basic strike is the floor and every special hits harder", () => {
    const basic = baseDamage(BASIC_MOVE)
    for (const move of CATALOG) {
      expect(
        baseDamage(move),
        `${move.id} (power ${move.power}) vs basic (power ${BASIC_MOVE.power})`,
      ).toBeGreaterThan(basic)
    }
  })

  test("basic < light < mid < heavy, and gating stays separate from damage", () => {
    for (const element of ELEMENTS) {
      const kit = CATALOG.filter((move) => move.element === element).slice(0, 6)
      const light = kit[0]
      const mid = kit[2]
      const heavy = kit[5]
      if (!light || !mid || !heavy) throw new Error(`incomplete kit: ${element}`)

      const label = `${element}: ${light.id} < ${mid.id} < ${heavy.id}`
      expect(baseDamage(light), `${label} light vs basic`).toBeGreaterThan(
        baseDamage(BASIC_MOVE),
      )
      expect(baseDamage(mid), `${label} mid vs light`).toBeGreaterThan(
        baseDamage(light),
      )
      expect(baseDamage(heavy), `${label} heavy vs mid`).toBeGreaterThan(
        baseDamage(mid),
      )

      // Gating is its own authored field: every special pays a cooldown, the
      // basic does not. Damage is never asked to carry the gate.
      for (const move of kit) {
        expect(move.cooldown, `${move.id} cooldown`).toBeGreaterThan(0)
      }
      expect(BASIC_MOVE.cooldown).toBe(0)
    }
  })
})
