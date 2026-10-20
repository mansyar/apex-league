import {
  type CareAction,
  type GameState,
  TRAINING_PROGRAMS,
  type TrainingProgram,
} from "@apex/sim"
import { icons } from "../ui/icons"
import { button, cta, plate } from "../ui/kit"
import { REJECTION_COPY, trainButtonLabel } from "./copy"
import { programTradeoff } from "./copy-care"
import { allPrimariesCapped, nextRowIndex } from "./programs"

/** Care actions in dock order, with their coach labels and glyphs. */
const ACTIONS: Array<{ action: CareAction; label: string; glyph: string }> = [
  { action: "feed", label: "Feed", glyph: icons.feed },
  { action: "rest", label: "Rest", glyph: icons.rest },
  { action: "treat", label: "Treat", glyph: icons.treat },
  { action: "play", label: "Play", glyph: icons.play },
]

/** Why the train control is available or closed, as pure data. */
export interface TrainButtonState {
  disabled: boolean
  /** Tooltip reason when disabled (kit tooltip), null when enabled. */
  reason: string | null
  /** The button's own label: it names the assigned program. */
  label: string
  /** The AP badge, or null once a program is set — a re-point is free. */
  cost: string | null
  focus: boolean
}

/**
 * Train-button availability: disabled only when nothing is possible. An
 * assigned program keeps it enabled at 0 AP, because a same-day swap is free,
 * and the AP badge drops away in the same breath so the button never implies
 * a second cost.
 */
export function trainButtonState(
  creature: NonNullable<GameState["creature"]>,
  actionPoints: number,
): TrainButtonState {
  const program = creature.trainingProgram
  const focus = program !== null
  const label = trainButtonLabel(program)
  if (allPrimariesCapped(creature)) {
    return {
      disabled: true,
      reason: "Nothing left to train for now.",
      label,
      cost: null,
      focus,
    }
  }
  if (actionPoints === 0 && !program) {
    return {
      disabled: true,
      reason: REJECTION_COPY["no-ap"],
      label,
      cost: null,
      focus,
    }
  }
  return {
    disabled: false,
    reason: null,
    label,
    cost: program === null ? "1 AP" : null,
    focus,
  }
}

/** One picker row's elements, in catalog order. */
export interface PickerRowRefs {
  button: HTMLButtonElement
  name: HTMLElement
  tradeoff: HTMLElement
  note: HTMLElement
  assigned: HTMLElement
  id: TrainingProgram
}

/** The command-dock elements the daily update writes into. */
export interface CommandDockRefs {
  root: HTMLElement
  dockHead: HTMLButtonElement
  /** The collapsed head's one-fact read: the assigned program. */
  dockHeadMeta: HTMLElement
  dockRow: HTMLElement
  actionButtons: Array<{ button: HTMLButtonElement; action: CareAction }>
  dockTrain: HTMLElement
  trainButton: HTMLButtonElement
  trainName: HTMLElement | null
  trainCost: HTMLElement | null
  picker: HTMLElement
  pickerRows: PickerRowRefs[]
  advance: HTMLElement
  advanceLabel: HTMLElement | null
  /** Graduation send-off container + chip (shown only when eligible). */
  dockGraduate: HTMLElement
  graduateChip: HTMLButtonElement
}

/** One picker row: name + assigned marker, the tradeoff, tonight's line. */
function pickerRow(
  id: TrainingProgram,
  onPick: (program: TrainingProgram) => void,
): PickerRowRefs {
  const program = TRAINING_PROGRAMS.find((entry) => entry.id === id)
  const entry = document.createElement("button")
  entry.className = "train-entry"
  entry.type = "button"
  entry.setAttribute("role", "radio")
  entry.setAttribute("aria-checked", "false")
  entry.tabIndex = -1
  entry.dataset.program = id
  if (program) entry.title = program.blurb
  const head = document.createElement("span")
  head.className = "train-entry-head"
  const name = document.createElement("span")
  name.className = "train-entry-name"
  const assigned = document.createElement("span")
  assigned.className = "train-assigned"
  assigned.textContent = "Assigned"
  assigned.hidden = true
  head.append(name, assigned)
  const tradeoff = document.createElement("span")
  tradeoff.className = "train-tradeoff"
  tradeoff.textContent = programTradeoff(id)
  const note = document.createElement("span")
  note.className = "train-note"
  entry.append(head, tradeoff, note)
  entry.addEventListener("click", () => onPick(id))
  return { button: entry, name, tradeoff, note, assigned, id }
}

/**
 * Bottom-right command dock (broadcast kit plate): care buttons, the
 * train control with its inline program picker, and the Advance Day CTA.
 * Care/pick clicks call the given handlers; the train-toggle, the picker's
 * own keyboard rules and the collapse interactions stay with createHud
 * (they re-render).
 */
export function buildCommandDock(handlers: {
  onCare: (action: CareAction) => void
  /** A program picked from the inline picker (re-picking the set one clears). */
  onTrain: (program: TrainingProgram) => void
  /** Escape inside the picker: leave it, keep the dock folded out. */
  onClosePicker: () => void
  onAdvanceDay: () => void
  /** Open the graduation send-off confirm (legacy track). */
  onGraduate: () => void
}): CommandDockRefs {
  // A slim header row doubles as the collapse toggle; collapsed, the
  // "ACTIONS" label and the assigned program stay pinned to the corner.
  const root = plate({ className: "command-dock" })
  const dockHead = document.createElement("button")
  dockHead.className = "dock-head"
  dockHead.type = "button"
  dockHead.setAttribute("aria-expanded", "true")
  dockHead.title = "Collapse panel"
  const dockHeadLabel = document.createElement("span")
  dockHeadLabel.textContent = "Actions"
  const dockHeadMeta = document.createElement("span")
  dockHeadMeta.className = "dock-head-meta"
  const dockChev = document.createElement("span")
  dockChev.className = "collapse-chev"
  dockChev.innerHTML = icons.chevron
  dockHead.append(dockHeadLabel, dockHeadMeta, dockChev)
  const dockRow = document.createElement("div")
  dockRow.className = "dock-row"
  const actionButtons = ACTIONS.map(({ action, label, glyph }) => {
    const btn = button({
      label,
      glyph,
      cost: "1 AP",
      onClick: () => handlers.onCare(action),
    })
    dockRow.append(btn)
    return { button: btn, action }
  })
  // Train control and its inline program picker. Opening or closing the
  // picker spends nothing — only a first assignment of the day can.
  const dockTrain = document.createElement("div")
  dockTrain.className = "dock-train"
  const trainButton = button({
    label: trainButtonLabel(null),
    glyph: icons.train,
    cost: "1 AP",
    tag: "",
  })
  const trainName = trainButton.querySelector<HTMLElement>(".kit-button-name")
  const trainCost = trainButton.querySelector<HTMLElement>(".kit-button-cost")
  dockTrain.append(trainButton)

  const picker = document.createElement("div")
  picker.className = "train-picker"
  picker.style.display = "none"
  picker.setAttribute("role", "radiogroup")
  picker.setAttribute("aria-label", "Training program")
  const pickerRows = TRAINING_PROGRAMS.map(({ id }) =>
    pickerRow(id, handlers.onTrain),
  )
  picker.append(...pickerRows.map((row) => row.button))
  // Roving tabindex: the arrow keys move focus between pickable rows,
  // Escape leaves the picker without folding the dock away.
  picker.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault()
      handlers.onClosePicker()
      return
    }
    const delta =
      event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    const buttons = pickerRows.map((row) => row.button)
    const from = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = nextRowIndex(
      pickerRows.map((row) => ({ disabled: row.button.disabled })),
      from,
      delta,
    )
    const target = buttons[next]
    if (!target) return
    for (const btn of buttons) btn.tabIndex = -1
    target.tabIndex = 0
    target.focus()
  })
  const advance = cta("Advance Day", handlers.onAdvanceDay)
  const advanceLabel = advance.querySelector<HTMLElement>(".kit-cta-label")
  // Graduation send-off (legacy track): hidden until the sim reports the
  // champion eligible (canGraduate), so the dock never offers a dead end.
  const dockGraduate = document.createElement("div")
  dockGraduate.className = "dock-graduate"
  dockGraduate.style.display = "none"
  const graduateChip = button({
    label: "Graduate",
    tag: "",
    onClick: () => handlers.onGraduate(),
  })
  dockGraduate.append(graduateChip)
  root.append(dockHead, dockRow, dockTrain, dockGraduate, picker, advance)
  return {
    root,
    dockHead,
    dockHeadMeta,
    dockRow,
    actionButtons,
    dockTrain,
    trainButton,
    trainName,
    trainCost,
    picker,
    pickerRows,
    advance,
    advanceLabel,
    dockGraduate,
    graduateChip,
  }
}
