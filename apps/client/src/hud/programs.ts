/**
 * The dock's program picker as pure data (FR-12). Four rows in catalog order,
 * each carrying the sim's own label and blurb, tonight's projection and the
 * assigned/capped reads. No DOM, no wiring — `dock.ts` stamps these into nodes
 * and `update.ts` repaints them, and the row reading is testable without a
 * browser.
 *
 * The projection is the sim's: `previewProgram` reads a program as if it were
 * picked tonight, including the counter bump a first assignment makes, so the
 * row for the assigned program is exactly `previewTraining(creature)` and no
 * other row guesses at its own payout.
 */
import {
  type Creature,
  getTrainingProgram,
  previewProgram,
  RING_BOND_BONUS,
  RING_MOOD_BONUS,
  type StatKey,
  TRAINING_CAP,
  TRAINING_PROGRAMS,
  type TrainingProgram,
} from "@apex/sim"
import { cappedLine, programTradeoff, tonightLine } from "./copy-care"

/** One picker row's whole read, as pure data. */
export interface ProgramRow {
  id: TrainingProgram
  /** The catalog label ("Power Lifting"). */
  label: string
  /** The catalog's coach line, never duplicated in the client. */
  blurb: string
  /** "ATK +1/night — DEF on breakthrough nights". */
  tradeoff: string
  primary: StatKey
  trickle: StatKey
  /** Tonight's gains, or the reason there are none, or the cap note. */
  tonight: string
  /** Whether this is the program assigned for tonight. */
  assigned: boolean
  /** The row's primary stat is at the training cap, so it cannot be picked. */
  capped: boolean
  disabled: boolean
}

/**
 * What a paying Ring Craft night adds besides stats: mood and bond, read from
 * the sim's own bonuses, and only the halves that still have room (both clamp
 * at 100). Power Lifting trains the same two stats, so without this the two
 * rows would read identically.
 */
function ringExtras(creature: Creature): string {
  const parts: string[] = []
  if (creature.conditions.mood < 100) parts.push(`+${RING_MOOD_BONUS} MOOD`)
  if (creature.conditions.bond < 100) parts.push(`+${RING_BOND_BONUS} BOND`)
  return parts.join(" · ")
}

/** One row for one program, read from the creature's conditions and history. */
export function programRow(
  creature: Creature,
  id: TrainingProgram,
): ProgramRow {
  const def = getTrainingProgram(id)
  const capped = creature.trained[def.primary] >= TRAINING_CAP
  const preview = previewProgram(creature, id)
  const extras = id === "ring" ? ringExtras(creature) : ""
  return {
    id,
    label: def.label,
    blurb: def.blurb,
    tradeoff: programTradeoff(id),
    primary: def.primary,
    trickle: def.trickle,
    tonight: capped ? cappedLine(def.primary) : tonightLine(preview, extras),
    assigned: creature.trainingProgram === id,
    capped,
    disabled: capped,
  }
}

/** All four rows, in catalog order (the picker's order). */
export function programRows(creature: Creature): ProgramRow[] {
  return TRAINING_PROGRAMS.map((program) => programRow(creature, program.id))
}

/**
 * Whether every program's primary is capped. Only then is the train control
 * closed: a capped primary never blocks a program whose trickle still has
 * room, and a live trickle keeps the picker open.
 */
export function allPrimariesCapped(creature: Creature): boolean {
  return TRAINING_PROGRAMS.every(
    ({ primary }) => creature.trained[primary] >= TRAINING_CAP,
  )
}

/**
 * The row that owns the picker's single tab stop: the assigned program when it
 * can still be picked, else the first pickable row, else the first row.
 */
export function rovingRow(rows: readonly ProgramRow[]): number {
  if (rows.length === 0) return -1
  const assigned = rows.findIndex((row) => row.assigned && !row.disabled)
  if (assigned >= 0) return assigned
  const pickable = rows.findIndex((row) => !row.disabled)
  return pickable >= 0 ? pickable : 0
}

/**
 * Where ArrowUp/ArrowDown lands from `from`, stepping by `delta` and wrapping,
 * skipping rows that cannot take focus. Returns -1 when nothing is pickable.
 */
export function nextRowIndex(
  rows: ReadonlyArray<{ disabled: boolean }>,
  from: number,
  delta: number,
): number {
  const count = rows.length
  if (count === 0) return -1
  const start = from < 0 ? 0 : Math.min(from, count - 1)
  for (let step = 1; step <= count; step += 1) {
    const index = (start + delta * step + count * step) % count
    if (!rows[index]?.disabled) return index
  }
  return -1
}
