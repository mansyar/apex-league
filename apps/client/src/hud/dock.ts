import {
  type CareAction,
  type GameState,
  getTrainingProgram,
  type StatKey,
  TRAINING_CAP,
  type TrainingPreview,
} from "@apex/sim"
import { icons } from "../ui/icons"
import { button, cta, plate } from "../ui/kit"
import { previewNote, REJECTION_COPY, STATS, statLabel } from "./copy"

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
  /** The inline tag under the label (the program label) or "" when quiet. */
  tag: string
  focus: boolean
}

/**
 * Train-button availability: disabled only when nothing is possible. An
 * assigned program keeps it enabled at 0 AP, because a same-day swap is free.
 */
export function trainButtonState(
  creature: NonNullable<GameState["creature"]>,
  actionPoints: number,
): TrainButtonState {
  const program = creature.trainingProgram
  const focus = program !== null
  const allCapped = STATS.every(
    ({ key }) => creature.trained[key] >= TRAINING_CAP,
  )
  if (allCapped) {
    return {
      disabled: true,
      reason: "Nothing left to train for now.",
      tag: "",
      focus,
    }
  }
  if (actionPoints === 0 && !program) {
    return {
      disabled: true,
      reason: REJECTION_COPY["no-ap"],
      tag: "",
      focus,
    }
  }
  return {
    disabled: false,
    reason: null,
    tag: program ? getTrainingProgram(program).label : "",
    focus,
  }
}

/** One picker row's read, as pure data. */
export interface PickerEntry {
  capped: boolean
  isFocus: boolean
  note: string
}

/**
 * Picker entries: tonight's delta, or the waste reason. Capped stats are
 * disabled; the assigned program's primary stat is marked.
 */
export function pickerEntry(
  creature: NonNullable<GameState["creature"]>,
  key: StatKey,
  preview: TrainingPreview,
): PickerEntry {
  const capped = creature.trained[key] >= TRAINING_CAP
  const program = creature.trainingProgram
  const isFocus =
    program !== null && getTrainingProgram(program).primary === key
  const gain = preview.gains[key] ?? 0
  let note: string
  if (capped) {
    note = "as sharp as it can get for now"
  } else if (isFocus) {
    note = preview.result
      ? `focused · ${previewNote(preview.result)}`
      : "focused"
  } else if (preview.result === "gained" && gain > 0) {
    const total = creature.stats[key] + creature.trained[key]
    note = `${statLabel(key)} ${total} → ${total + gain}`
  } else {
    note = preview.result ? previewNote(preview.result) : "costs 1 AP"
  }
  return { capped, isFocus, note }
}

/** The command-dock elements the daily update writes into. */
export interface CommandDockRefs {
  root: HTMLElement
  dockHead: HTMLButtonElement
  dockRow: HTMLElement
  actionButtons: Array<{ button: HTMLButtonElement; action: CareAction }>
  dockTrain: HTMLElement
  trainButton: HTMLButtonElement
  trainTag: HTMLElement | null
  picker: HTMLElement
  pickerButtons: Array<{
    button: HTMLButtonElement
    note: HTMLElement
    key: StatKey
  }>
  advance: HTMLElement
  advanceLabel: HTMLElement | null
  /** Graduation send-off container + chip (shown only when eligible). */
  dockGraduate: HTMLElement
  graduateChip: HTMLButtonElement
}

/**
 * Bottom-right command dock (broadcast kit plate): care buttons, the
 * train control with its inline four-stat picker, and the Advance Day
 * CTA. Care/pick clicks call the given handlers; the train-toggle and
 * collapse interactions stay with createHud (they re-render).
 */
export function buildCommandDock(handlers: {
  onCare: (action: CareAction) => void
  /** A stat picked from the inline picker (closes it + spends 1 AP). */
  onTrain: (key: StatKey) => void
  onAdvanceDay: () => void
  /** Open the graduation send-off confirm (legacy track). */
  onGraduate: () => void
}): CommandDockRefs {
  // A slim header row doubles as the collapse toggle; collapsed, only
  // the "ACTIONS" label remains pinned to the corner.
  const root = plate({ className: "command-dock" })
  const dockHead = document.createElement("button")
  dockHead.className = "dock-head"
  dockHead.type = "button"
  dockHead.setAttribute("aria-expanded", "true")
  dockHead.title = "Collapse panel"
  const dockHeadLabel = document.createElement("span")
  dockHeadLabel.textContent = "Actions"
  const dockChev = document.createElement("span")
  dockChev.className = "collapse-chev"
  dockChev.innerHTML = icons.chevron
  dockHead.append(dockHeadLabel, dockChev)
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
  // Train control and its inline four-stat picker. Opening or closing
  // the picker spends nothing — only an assignment can.
  const dockTrain = document.createElement("div")
  dockTrain.className = "dock-train"
  const trainButton = button({
    label: "Train",
    glyph: icons.train,
    cost: "1 AP",
    tag: "",
  })
  const trainTag = trainButton.querySelector<HTMLElement>(".kit-button-tag")
  dockTrain.append(trainButton)

  const picker = document.createElement("div")
  picker.className = "train-picker"
  picker.style.display = "none"
  const pickerButtons = STATS.map(({ key, label }) => {
    const entry = document.createElement("button")
    entry.className = "train-entry"
    entry.type = "button"
    const name = document.createElement("span")
    name.className = "train-entry-name"
    name.textContent = label
    const note = document.createElement("span")
    note.className = "train-note"
    entry.append(name, note)
    entry.addEventListener("click", () => {
      handlers.onTrain(key)
    })
    picker.append(entry)
    return { button: entry, note, key }
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
    dockRow,
    actionButtons,
    dockTrain,
    trainButton,
    trainTag,
    picker,
    pickerButtons,
    advance,
    advanceLabel,
    dockGraduate,
    graduateChip,
  }
}
