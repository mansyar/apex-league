/**
 * Frame-data completeness (Continuous Arena Battle FR-5, AC-5): every move in
 * the catalog carries authored timing and space, and the validator rejects the
 * rows the continuous engine cannot run.
 */

import { describe, expect, test } from "bun:test"
import { DEFAULT_POISE_MAX } from "./continuous/poise"
import { RECOVERY_REFERENCE_SPD, recoveryMsFor } from "./continuous/strike"
import {
  BLOW_WEIGHT,
  BODY_RADIUS_MM,
  FRAME_DATA,
  getFrameData,
  validateFrameData,
} from "./frames"
import { BASIC_MOVE, CATALOG, getMove } from "./moves"

const ELEMENTS = ["fire", "plant", "water", "electric", "earth", "wind"]

const ALL_MOVES = [BASIC_MOVE, ...CATALOG]

/** The authored row for an id, or a loud failure so tests never narrow. */
function frameOf(moveId: string) {
  const row = getFrameData(moveId)
  if (!row) throw new Error(`No frame data for ${moveId}`)
  return row
}

function moveOf(moveId: string) {
  const move = getMove(moveId)
  if (!move) throw new Error(`Unknown move ${moveId}`)
  return move
}

/** The six kit rows of one element, in catalog order. */
function kitOf(element: string) {
  const kit = CATALOG.filter((move) => move.element === element).slice(0, 6)
  if (kit.length !== 6) throw new Error(`Incomplete kit: ${element}`)
  return kit
}

describe("frame data — catalog completeness", () => {
  test("has exactly one row per catalog id and no strays", () => {
    const ids = ALL_MOVES.map((move) => move.id).sort()
    expect(ids).toHaveLength(49)
    expect(Object.keys(FRAME_DATA).sort()).toEqual(ids)
  })

  test("passes validation for every catalog move", () => {
    for (const move of ALL_MOVES) {
      expect(() => validateFrameData(move, frameOf(move.id))).not.toThrow()
    }
  })

  test("authors non-default timing on every row", () => {
    for (const move of ALL_MOVES) {
      const row = frameOf(move.id)
      expect(row.startupMs).toBeGreaterThan(0)
      expect(row.activeMs).toBeGreaterThan(0)
      expect(row.recoveryMs).toBeGreaterThan(0)
      expect(row.poiseDamage).toBeGreaterThan(0)
      expect(row.staminaCost).toBeGreaterThan(0)
    }
  })

  test("keeps every reach at or above the body radius", () => {
    expect(BODY_RADIUS_MM).toBeGreaterThan(0)
    for (const move of ALL_MOVES) {
      expect(frameOf(move.id).reachMm).toBeGreaterThanOrEqual(BODY_RADIUS_MM)
    }
  })

  test("authors a non-empty height band on every row", () => {
    for (const move of ALL_MOVES) {
      const band = frameOf(move.id).band
      expect(band.toMm).toBeGreaterThan(band.fromMm)
      expect(band.fromMm).toBeGreaterThanOrEqual(0)
    }
  })

  test("gives every ranged move a speed and the melee basic none", () => {
    expect(frameOf(BASIC_MOVE.id).speedMmPerMs).toBe(0)
    for (const move of CATALOG) {
      expect(frameOf(move.id).speedMmPerMs).toBeGreaterThan(0)
    }
  })

  test("looks rows up by id, refusing unknown and prototype keys", () => {
    const spark = frameOf("spark")
    expect(FRAME_DATA.spark).toBe(spark)
    expect(getFrameData("no_such_move")).toBeUndefined()
    expect(getFrameData("constructor")).toBeUndefined()
  })
})

describe("frame data — authored ordering", () => {
  test("each element's heavy finisher is the slowest row in its kit", () => {
    for (const element of ELEMENTS) {
      const kit = kitOf(element)
      const finisher = kit[5]
      if (!finisher) throw new Error(`Incomplete kit: ${element}`)
      const heavy = frameOf(finisher.id)
      for (const other of kit.slice(0, 5)) {
        const row = frameOf(other.id)
        expect(heavy.startupMs).toBeGreaterThan(row.startupMs)
        expect(heavy.recoveryMs).toBeGreaterThan(row.recoveryMs)
      }
    }
  })

  test("a heavier kit row starts slower and recovers longer", () => {
    for (const element of ELEMENTS) {
      const rows = kitOf(element).map((move) => frameOf(move.id))
      for (let i = 2; i < 4; i += 1) {
        const lighter = rows[i - 1]
        const heavier = rows[i]
        if (!lighter || !heavier) throw new Error(`Gap in ${element}`)
        expect(heavier.startupMs).toBeGreaterThan(lighter.startupMs)
        expect(heavier.recoveryMs).toBeGreaterThan(lighter.recoveryMs)
      }
    }
  })

  test("a longer cooldown never starts faster or recovers sooner", () => {
    const bands = [0, 1, 2, 3].map((cooldown) => {
      const moves = ALL_MOVES.filter((move) => move.cooldown === cooldown)
      return moves.map((move) => frameOf(move.id))
    })
    const fields = [
      "startupMs",
      "recoveryMs",
      "poiseDamage",
      "staminaCost",
    ] as const
    for (let i = 1; i < bands.length; i += 1) {
      const faster = bands[i - 1]
      const slower = bands[i]
      if (!faster || !slower) throw new Error(`Missing cooldown band ${i}`)
      expect(faster.length).toBeGreaterThan(0)
      expect(slower.length).toBeGreaterThan(0)
      for (const field of fields) {
        const fastest = Math.max(...faster.map((row) => row[field]))
        const slowest = Math.min(...slower.map((row) => row[field]))
        expect(fastest).toBeLessThan(slowest)
      }
    }
  })
})

describe("frame data — the blow weight (Phase 6)", () => {
  test("every per-blow field carries the weight, so none can drift", () => {
    for (const move of ALL_MOVES) {
      const row = frameOf(move.id)
      const fields = [
        "startupMs",
        "activeMs",
        "recoveryMs",
        "poiseDamage",
        "staminaCost",
      ] as const
      for (const field of fields) {
        expect(row[field] % BLOW_WEIGHT).toBe(0)
        expect(row[field] / BLOW_WEIGHT).toBeGreaterThan(0)
      }
    }
  })

  test("the basic row is the pre-weight row times the weight", () => {
    const basic = frameOf(BASIC_MOVE.id)
    expect(basic.recoveryMs).toBe(750)
    expect(basic.poiseDamage).toBe(6)
    expect(basic.staminaCost).toBe(6)
  })

  test("a poise break still lands after the same frame time", () => {
    // A break is tuned in blows and in seconds of fight, not in points. The
    // weight triples the poise one blow carries and the whole cycle it costs,
    // so blows-to-break × cycle must land where the pre-weight table put it.
    // Forgetting poise (2 per blow, 1170 ms cycle) would read 11700 ms;
    // forgetting startup and active (6 poise, 670 ms cycle) would read 2680 ms —
    // both fail loudly.
    const basic = frameOf(BASIC_MOVE.id)
    const blows = Math.ceil(DEFAULT_POISE_MAX / basic.poiseDamage)
    const cycleMs =
      basic.startupMs +
      basic.activeMs +
      recoveryMsFor(basic, RECOVERY_REFERENCE_SPD)
    const preWeightBlows = Math.ceil(
      DEFAULT_POISE_MAX / (basic.poiseDamage / BLOW_WEIGHT),
    )
    const preWeightCycleMs =
      (basic.startupMs + basic.activeMs + basic.recoveryMs) / BLOW_WEIGHT
    expect(blows).toBe(4)
    expect(preWeightBlows).toBe(10)
    const weightedMs = blows * cycleMs
    const preWeightMs = preWeightBlows * preWeightCycleMs
    // Within a quarter: the break is 20 poise, so the integer ceiling rounds 3.3
    // blows up to 4 and the weighted break lands a fifth sooner in frame time.
    expect(Math.abs(weightedMs - preWeightMs)).toBeLessThan(
      Math.trunc(preWeightMs / 4),
    )
  })
})

describe("frame data — validation", () => {
  test("accepts the authored rows", () => {
    expect(() =>
      validateFrameData(moveOf("spark"), frameOf("spark")),
    ).not.toThrow()
    expect(() =>
      validateFrameData(BASIC_MOVE, frameOf(BASIC_MOVE.id)),
    ).not.toThrow()
  })

  test("rejects a non-positive recovery", () => {
    const spark = moveOf("spark")
    const base = frameOf(spark.id)
    expect(() => validateFrameData(spark, { ...base, recoveryMs: 0 })).toThrow(
      /positive recovery/,
    )
    expect(() =>
      validateFrameData(spark, { ...base, recoveryMs: -20 }),
    ).toThrow(/positive recovery/)
  })

  test("rejects an active window shorter than one step", () => {
    const spark = moveOf("spark")
    expect(() =>
      validateFrameData(spark, { ...frameOf(spark.id), activeMs: 0 }),
    ).toThrow(/at least one step/)
    expect(() =>
      validateFrameData(spark, { ...frameOf(spark.id), activeMs: 19 }),
    ).toThrow(/at least one step/)
    expect(() =>
      validateFrameData(spark, { ...frameOf(spark.id), activeMs: 20 }),
    ).not.toThrow()
  })

  test("rejects an empty or inverted height band", () => {
    const spark = moveOf("spark")
    const base = frameOf(spark.id)
    expect(() =>
      validateFrameData(spark, {
        ...base,
        band: { fromMm: 600, toMm: 600 },
      }),
    ).toThrow(/positive height/)
    expect(() =>
      validateFrameData(spark, {
        ...base,
        band: { fromMm: 900, toMm: 300 },
      }),
    ).toThrow(/positive height/)
    expect(() =>
      validateFrameData(spark, {
        ...base,
        band: { fromMm: -1, toMm: 600 },
      }),
    ).toThrow(/below the floor/)
    expect(() =>
      validateFrameData(spark, {
        ...base,
        band: { fromMm: 0, toMm: 2001 },
      }),
    ).toThrow(/implausibly high/)
  })

  test("rejects a projectile that never travels", () => {
    const spark = moveOf("spark")
    expect(() =>
      validateFrameData(spark, { ...frameOf(spark.id), speedMmPerMs: 0 }),
    ).toThrow(/needs a projectile speed/)
  })

  test("rejects a reach shorter than the body radius", () => {
    const spark = moveOf("spark")
    const base = frameOf(spark.id)
    expect(() =>
      validateFrameData(spark, { ...base, reachMm: BODY_RADIUS_MM - 1 }),
    ).toThrow(/below the body radius/)
    expect(() =>
      validateFrameData(spark, { ...base, reachMm: BODY_RADIUS_MM }),
    ).not.toThrow()
  })

  test("rejects a melee move that carries a projectile speed", () => {
    expect(() =>
      validateFrameData(BASIC_MOVE, {
        ...frameOf(BASIC_MOVE.id),
        speedMmPerMs: 4,
      }),
    ).toThrow(/melee move carries no projectile speed/)
  })

  test("rejects negative poise damage and stamina cost", () => {
    const spark = moveOf("spark")
    const base = frameOf(spark.id)
    expect(() =>
      validateFrameData(spark, { ...base, poiseDamage: -1 }),
    ).toThrow(/Poise damage/)
    expect(() =>
      validateFrameData(spark, { ...base, staminaCost: -1 }),
    ).toThrow(/Stamina cost/)
  })
})
