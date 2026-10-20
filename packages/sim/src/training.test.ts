import { describe, expect, test } from "bun:test"

import type { StatKey } from "./creature"
import {
  getTrainingProgram,
  isTrainingProgram,
  programFor,
  TRAINING_PROGRAMS,
} from "./training"

/** The catalog the spec fixes; the four programs in declaration order. */
const EXPECTED = [
  {
    id: "power",
    label: "Power Lifting",
    primary: "atk",
    trickle: "def",
    blurb: "Heavy sets build ATK, with DEF on breakthrough nights.",
  },
  {
    id: "endurance",
    label: "Endurance Circuit",
    primary: "hp",
    trickle: "def",
    blurb: "Long circuits build HP, with DEF on breakthrough nights.",
  },
  {
    id: "sprint",
    label: "Sprint Work",
    primary: "spd",
    trickle: "atk",
    blurb: "Sprints build SPD, with ATK on breakthrough nights.",
  },
  {
    id: "ring",
    label: "Ring Craft",
    primary: "atk",
    trickle: "def",
    blurb: "Sparring builds ATK and lifts mood and bond on paying nights.",
  },
] as const

describe("TRAINING_PROGRAMS", () => {
  test("holds exactly the four programs, in power/endurance/sprint/ring order", () => {
    expect(TRAINING_PROGRAMS.map((program) => program.id)).toEqual([
      "power",
      "endurance",
      "sprint",
      "ring",
    ])
  })

  test("every program carries the spec's label, primary, trickle and blurb", () => {
    for (const expected of EXPECTED) {
      const program = TRAINING_PROGRAMS.find((p) => p.id === expected.id)
      if (!program) throw new Error(`missing program: ${expected.id}`)
      expect(program.label).toBe(expected.label)
      expect(program.primary).toBe(expected.primary)
      expect(program.trickle).toBe(expected.trickle)
      expect(program.blurb).toBe(expected.blurb)
    }
  })

  test("every trickle differs from its primary", () => {
    for (const program of TRAINING_PROGRAMS) {
      expect(program.trickle).not.toBe(program.primary)
    }
  })

  test("the primary stats cover ATK, HP and SPD (DEF trickles instead)", () => {
    const primaries = new Set(TRAINING_PROGRAMS.map((p) => p.primary))
    expect(primaries).toEqual(new Set<StatKey>(["atk", "hp", "spd"]))
    expect(
      TRAINING_PROGRAMS.every(
        (p) => p.trickle === "def" || p.trickle === "atk",
      ),
    ).toBe(true)
  })

  test("every blurb is one sentence", () => {
    for (const program of TRAINING_PROGRAMS) {
      expect(program.blurb.endsWith(".")).toBe(true)
      expect(
        program.blurb.split(".").filter((part) => part.trim() !== ""),
      ).toHaveLength(1)
    }
  })
})

describe("getTrainingProgram", () => {
  test("resolves every catalog id to its own definition", () => {
    for (const program of TRAINING_PROGRAMS) {
      expect(getTrainingProgram(program.id)).toBe(program)
    }
  })
})

describe("isTrainingProgram", () => {
  test("accepts the four ids", () => {
    for (const program of TRAINING_PROGRAMS) {
      expect(isTrainingProgram(program.id)).toBe(true)
    }
  })

  test("rejects anything else", () => {
    for (const value of ["atk", "focus", "Power", "", null, 3, {}, undefined]) {
      expect(isTrainingProgram(value)).toBe(false)
    }
  })
})

describe("programFor — the v17 focus mapping", () => {
  test("maps each stat exactly as the migration documents", () => {
    expect(programFor("hp")).toBe("endurance")
    expect(programFor("atk")).toBe("power")
    expect(programFor("def")).toBe("power")
    expect(programFor("spd")).toBe("sprint")
  })

  test("every mapped program exists in the catalog", () => {
    for (const stat of ["hp", "atk", "def", "spd"] as const) {
      const id = programFor(stat)
      if (id === null) throw new Error(`unmapped stat: ${stat}`)
      expect(getTrainingProgram(id).id).toBe(id)
    }
  })
})
