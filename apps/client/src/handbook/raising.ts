/**
 * Raising page: direction-only coach guidance, then the shipped training
 * system — the four programs, the energy gate, breakthrough nights, and form.
 * Every number and every tier sentence is read from the sim, so the page
 * teaches exactly what the ranch and the arena do.
 */

import {
  EXHAUSTED_ENERGY,
  FORM_COPY,
  SICK_HEALTH,
  TRAINING_CAP,
  TRAINING_ENERGY_COST,
  TRAINING_PROGRAMS,
} from "@apex/sim"
import { statLabel } from "../hud/copy-care"
import { ruleRow, subhead, tip } from "./common"

/** Raising guidance: direction-only coach voice, nothing spoiled. */
const RAISING_GUIDANCE: ReadonlyArray<string> = [
  "A healthy partner trains better — watch Energy and Health before a session.",
  "Training adds up: every session leaves a mark your partner keeps for life.",
  "Strong bonds carry on — a graduated partner leaves an inheritance floor for the next egg.",
  "Evolution comes with time and cups. Watch for the coach's hints.",
]

/**
 * The shipped training system (FR-15): one row per program, built from the
 * catalog's own label, blurb, primary, and trickle — never a second copy.
 */
function buildPrograms(panel: HTMLElement): void {
  panel.append(subhead("Training programs"))
  for (const program of TRAINING_PROGRAMS) {
    panel.append(
      ruleRow(
        program.label,
        `${program.blurb} ${statLabel(program.primary)} +1 a paying night.`,
      ),
    )
  }
  panel.append(
    tip(
      `A paying night costs ${TRAINING_ENERGY_COST} Energy, and needs ${EXHAUSTED_ENERGY} Energy or more before recovery to count. A sick or starving night, or a night under that mark, pays nothing and costs nothing.`,
    ),
  )
}

/** Breakthrough cadence: every third trained night, both stats capped. */
function buildBreakthroughs(panel: HTMLElement): void {
  panel.append(subhead("Breakthrough nights"))
  panel.append(
    tip(
      `Every third trained night adds +1 to the program's trickle stat as well. Trained stats stop at +${TRAINING_CAP}.`,
    ),
  )
}

/**
 * Form (FR-14, FR-15): the four tiers with their ATK consequence in the sim's
 * own words, plus the sickness pin. Only ATK moves; HP, DEF, and SPD do not.
 */
function buildForm(panel: HTMLElement): void {
  panel.append(subhead("Form"))
  panel.append(
    tip(
      "Form reads mood, bond, and health, and it moves ATK only. The fight and every preview use these numbers, so what you read here is what the arena rolls.",
    ),
  )
  for (const copy of Object.values(FORM_COPY)) {
    panel.append(ruleRow(copy.label, copy.line))
  }
  panel.append(
    ruleRow(
      "Sick",
      `A partner under ${SICK_HEALTH} Health is Sluggish whatever its mood.`,
    ),
  )
}

export function buildRaising(panel: HTMLElement): void {
  for (const line of RAISING_GUIDANCE) panel.append(tip(line))
  buildPrograms(panel)
  buildBreakthroughs(panel)
  buildForm(panel)
}
