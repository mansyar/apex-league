/**
 * Frame-data completeness (Continuous Arena Battle FR-5, AC-5): every move in
 * the catalog carries authored timing and space, and the validator rejects the
 * rows the continuous engine cannot run.
 */

import { describe, expect, test } from "bun:test"
import {
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

  test("gives every ranged move a speed and the melee basic none", () => {
    expect(frameOf(BASIC_MOVE.id).speedMmPerMs).toBe(0)
    for (const move of CATALOG) {
      expect(frameOf(move.id).speedMmPerMs).toBeGreaterThan(0)
    }
  })

  test("looks rows up by id, refusing unknown and prototype keys", () => {
    expect(frameOf("spark")).toBe(FRAME_DATA.spark)
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

  test("rejects an empty active window", () => {
    const spark = moveOf("spark")
    expect(() =>
      validateFrameData(spark, { ...frameOf(spark.id), activeMs: 0 }),
    ).toThrow(/positive active window/)
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
    expect(() => validateFrameData(spark, { ...base, poiseDamage: -1 })).toThrow(
      /Poise damage/,
    )
    expect(() => validateFrameData(spark, { ...base, staminaCost: -1 })).toThrow(
      /Stamina cost/,
    )
  })
})
