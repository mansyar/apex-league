/**
 * Training programs — the four conditioning blocks that replaced the
 * single-stat focus (save v18). Each program yields one primary stat every
 * paying night and a trickle stat on every third trained night. Pure data
 * plus pure lookups: no RNG, no conditions logic, no I/O.
 *
 * The catalog order (power, endurance, sprint, ring) is the picker order.
 * `programFor` reproduces the v17 focus mapping exactly, so a migrated save
 * keeps the stat it was training toward.
 */

import type { StatKey } from "./creature"

/** The four training programs, in picker order. */
export type TrainingProgram = "power" | "endurance" | "sprint" | "ring"

/** One program: display copy plus the two stats it develops. */
export interface TrainingProgramDef {
  id: TrainingProgram
  /** Dock label ("Power Lifting"). */
  label: string
  /** One-sentence coach-voice tradeoff line. */
  blurb: string
  /** The stat that gains +1 on every paying night. */
  primary: StatKey
  /** The stat that also gains +1 on every third trained night. */
  trickle: StatKey
}

/** Energy a paying program night costs. Flat across all four programs. */
export const TRAINING_ENERGY_COST = 10

const CATALOG: readonly TrainingProgramDef[] = [
  {
    id: "power",
    label: "Power Lifting",
    blurb: "Heavy sets build ATK, with DEF on breakthrough nights.",
    primary: "atk",
    trickle: "def",
  },
  {
    id: "endurance",
    label: "Endurance Circuit",
    blurb: "Long circuits build HP, with DEF on breakthrough nights.",
    primary: "hp",
    trickle: "def",
  },
  {
    id: "sprint",
    label: "Sprint Work",
    blurb: "Sprints build SPD, with ATK on breakthrough nights.",
    primary: "spd",
    trickle: "atk",
  },
  {
    id: "ring",
    label: "Ring Craft",
    blurb: "Sparring builds ATK and lifts mood and bond on paying nights.",
    primary: "atk",
    trickle: "def",
  },
]

/** The four programs in picker order. */
export const TRAINING_PROGRAMS: readonly TrainingProgramDef[] = Object.freeze(
  CATALOG.map((program) => Object.freeze(program)),
)

const BY_ID: Record<TrainingProgram, TrainingProgramDef> = Object.freeze(
  Object.fromEntries(TRAINING_PROGRAMS.map((program) => [program.id, program])),
) as Record<TrainingProgram, TrainingProgramDef>

/** The definition for a program id. */
export function getTrainingProgram(id: TrainingProgram): TrainingProgramDef {
  return BY_ID[id]
}

/** Whether a persisted value is one of the four program ids. */
export function isTrainingProgram(value: unknown): value is TrainingProgram {
  return (
    value === "power" ||
    value === "endurance" ||
    value === "sprint" ||
    value === "ring"
  )
}

/**
 * The program a v17 focus stat migrates onto: HP trains endurance, ATK and
 * DEF train power, SPD trains sprint. Returns null for anything that is not
 * a stat key (a corrupt or missing persisted focus).
 */
export function programFor(stat: StatKey): TrainingProgram | null {
  switch (stat) {
    case "hp":
      return "endurance"
    case "atk":
    case "def":
      return "power"
    case "spd":
      return "sprint"
    default:
      return null
  }
}
