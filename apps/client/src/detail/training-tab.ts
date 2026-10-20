/**
 * The detail modal's Training tab (FR-13): tonight's program and its catalog
 * blurb, trained nights, the next breakthrough, the form tier with the ATK
 * delta it applies, and the four-program table.
 *
 * Split out of `creature-detail.ts` so that module stays under the 12 KB cap
 * (NFR-4). The reading is a pure `trainingView(creature)`, so the breakthrough
 * arithmetic and the copy are testable without a DOM; the host only stamps
 * that reading into nodes, using the modal's existing row and chip styles.
 */
import {
  type Creature,
  FORM_COPY,
  formTier,
  type GameState,
  getTrainingProgram,
  SICK_HEALTH,
  TRAINING_PROGRAMS,
  type TrainingProgram,
} from "@apex/sim"
import {
  breakthroughLine,
  FORM_SICK_NOTE,
  formDeltaLine,
  statLabel,
  TRAINING_EMPTY,
  TRAINING_EMPTY_POINTER,
  TRAINING_TAB_HEADINGS,
} from "../hud/copy-care"

/** One program-table row: label, the two stats it develops, tonight's mark. */
export interface ProgramTableRow {
  id: TrainingProgram
  label: string
  primary: string
  trickle: string
  /** The assigned program, i.e. the one training tonight. */
  tonight: boolean
}

/** Everything the Training tab says, as pure data. */
export interface TrainingView {
  program: { label: string; blurb: string; empty: boolean }
  nights: number
  breakthrough: string
  form: { label: string; delta: string; line: string; sickNote: string | null }
  rows: ProgramTableRow[]
}

/** Read one creature into the Training tab's whole content. */
export function trainingView(creature: Creature): TrainingView {
  const program = creature.trainingProgram
  const def = program === null ? null : getTrainingProgram(program)
  const tier = formTier(creature)
  const sick = creature.conditions.health < SICK_HEALTH
  return {
    program: {
      label: def ? def.label : TRAINING_EMPTY,
      blurb: def ? def.blurb : TRAINING_EMPTY_POINTER,
      empty: def === null,
    },
    nights: creature.trainingDays,
    breakthrough: breakthroughLine(
      creature.trainingDays,
      creature.trainingProgram !== null,
    ),
    form: {
      label: FORM_COPY[tier].label,
      delta: formDeltaLine(tier),
      line: FORM_COPY[tier].line,
      sickNote: sick ? FORM_SICK_NOTE : null,
    },
    rows: TRAINING_PROGRAMS.map((entry) => ({
      id: entry.id,
      label: entry.label,
      primary: statLabel(entry.primary),
      trickle: statLabel(entry.trickle),
      tonight: entry.id === program,
    })),
  }
}

/** A small text node with a class, the one shape every line below shares. */
function text(className: string, content: string): HTMLElement {
  const node = document.createElement("span")
  node.className = className
  node.textContent = content
  return node
}

/** One titled section of the panel. */
function section(title: string, ...children: HTMLElement[]): HTMLElement {
  const node = document.createElement("section")
  node.className = "detail-training-section"
  const heading = document.createElement("h2")
  heading.className = "detail-training-title"
  heading.textContent = title
  node.append(heading, ...children)
  return node
}

/** A context row in the modal's own grammar: dim label, bold value. */
function contextRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div")
  row.className = "detail-context-row"
  row.append(
    text("detail-context-label", label),
    text("detail-context-value", value),
  )
  return row
}

/** The whole Training page: program, progress, form, program table. */
export function trainingSection(view: TrainingView): HTMLElement {
  const root = document.createElement("div")
  root.className = "detail-training"

  // 1. Program — the label and the catalog's own coach line, or the empty
  // state with its one-line pointer back to the ranch dock.
  const program = section(TRAINING_TAB_HEADINGS.program)
  const name = document.createElement("p")
  name.className = "detail-training-program"
  name.textContent = view.program.label
  if (view.program.empty) name.dataset.empty = "true"
  const blurb = document.createElement("p")
  blurb.className = "detail-training-blurb"
  blurb.textContent = view.program.blurb
  program.append(name, blurb)

  // 2. Progress — trained nights and the next breakthrough night.
  const progress = section(
    TRAINING_TAB_HEADINGS.progress,
    contextRow("Trained nights", String(view.nights)),
    text("detail-training-line", view.breakthrough),
  )

  // 3. Form — the tier word and the ATK delta side by side, so neither the
  // colour nor the chip alone carries it, plus the consequence line.
  const chips = document.createElement("div")
  chips.className = "detail-stat-chips"
  chips.append(
    text("detail-stat-chip", view.form.label),
    text("detail-stat-chip", view.form.delta),
  )
  const form = section(
    TRAINING_TAB_HEADINGS.form,
    chips,
    text("detail-training-note", view.form.line),
  )
  if (view.form.sickNote !== null) {
    form.append(text("detail-training-note", view.form.sickNote))
  }

  // 4. Program table — a header row names the three columns, and each row
  // states its own label, the two stats it develops and, for the assigned
  // program only, the "Tonight" marker inside the row it belongs to.
  const table = document.createElement("div")
  table.className = "detail-program-table"
  const head = document.createElement("div")
  head.className = "detail-program-head"
  head.append(
    text("detail-program-head-cell", "Program"),
    text("detail-program-head-cell", "Builds"),
    text("detail-program-head-cell", "Tonight"),
  )
  table.append(head)
  for (const row of view.rows) {
    const node = document.createElement("div")
    node.className = "detail-program-row"
    node.dataset.assigned = row.tonight ? "true" : "false"
    const stats = document.createElement("span")
    stats.className = "detail-program-chips"
    stats.append(
      text("detail-stat-chip", row.primary),
      text("detail-stat-chip", `${row.trickle} on breakthroughs`),
    )
    node.append(
      text("detail-program-name", row.label),
      stats,
      text(
        row.tonight ? "detail-program-tonight" : "detail-program-blank",
        row.tonight ? "Tonight" : "",
      ),
    )
    table.append(node)
  }

  root.append(
    program,
    progress,
    form,
    section(TRAINING_TAB_HEADINGS.table, table),
  )
  return root
}

/** The slice of DOM the host needs — lets the contract be tested plainly. */
export type TrainingHostNode = Pick<HTMLElement, "replaceChildren">

export interface TrainingHost {
  /** Repaint the panel from state. Cheap enough to run on every commit. */
  paint: (state: GameState) => void
}

/**
 * The Training slot inside the detail modal. It repaints in place, so a state
 * that lands while the modal is open (a settlement, a new assignment) reads
 * current without a reopen, and it touches nothing but the node it was given.
 */
export function createTrainingHost(node: TrainingHostNode): TrainingHost {
  return {
    paint: (state) => {
      const creature = state.creature
      node.replaceChildren(
        ...(creature ? [trainingSection(trainingView(creature))] : []),
      )
    },
  }
}
