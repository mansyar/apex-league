import {
  ACTION_POINTS_PER_DAY,
  type CareAction,
  type CareRejection,
  type CreatureConditions,
  careAction,
  EXHAUSTED_ENERGY,
  type GameState,
  previewTraining,
  SICK_HEALTH,
  type StatKey,
  TRAINING_CAP,
} from "@apex/sim"

export interface HudHandlers {
  onAdvanceDay: () => void
  onCare: (action: CareAction) => void
  onTrain: (stat: StatKey) => void
}

export interface Hud {
  update(state: GameState): void
}

/** Coach-voice copy for disabled actions (≤ 2 sentences, never punishing). */
const REJECTION_COPY: Record<CareRejection, string> = {
  "no-creature": "No partner yet.",
  "no-ap": "No AP left today.",
  "not-sick": "Not sick — save the medicine.",
  "too-sick": "Too sick to play today.",
  "too-tired": "Too tired to play.",
}

const CONDITIONS: Array<{
  key: keyof CreatureConditions
  label: string
  className: string
}> = [
  { key: "hunger", label: "Hunger", className: "bar-hunger" },
  { key: "energy", label: "Energy", className: "bar-energy" },
  { key: "health", label: "Health", className: "bar-health" },
  { key: "mood", label: "Mood", className: "bar-mood" },
  { key: "bond", label: "Bond", className: "bar-bond" },
]

const ACTIONS: Array<{ action: CareAction; label: string }> = [
  { action: "feed", label: "Feed" },
  { action: "rest", label: "Rest" },
  { action: "treat", label: "Treat" },
  { action: "play", label: "Play" },
]

const STATS: Array<{ key: StatKey; label: string }> = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
]

const STAT_LABEL: Record<StatKey, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spd: "SPD",
}

/** What tonight would do, from the sim's own preview helper. */
function previewNote(preview: "gained" | "sick" | "hungry"): string {
  if (preview === "gained") return "+1 tonight"
  if (preview === "sick") return "no gain — unwell"
  return "no gain — hungry"
}

function coachVoice(conditions: CreatureConditions, name: string): string {
  if (conditions.health < SICK_HEALTH) {
    return `${name} seems unwell — medicine would help.`
  }
  if (conditions.energy <= EXHAUSTED_ENERGY) {
    return `${name} seems sluggish today…`
  }
  if (conditions.mood < 30) return `${name} seems a little down today.`
  if (conditions.hunger <= 20) return `${name} looks hungry.`
  return ""
}

/**
 * The status line leads with training: the preview while a focus is set,
 * the morning result after Advance Day, and the condition coach line only
 * when training has nothing to say.
 */
function trainingStatus(
  creature: NonNullable<GameState["creature"]>,
  lastFocus: StatKey | null,
): string {
  if (creature.trainingFocus) {
    const stat = STAT_LABEL[creature.trainingFocus]
    const preview = previewTraining(creature)
    if (preview === "gained") {
      return `A full night's rest will sharpen ${stat}.`
    }
    if (preview === "sick") {
      return "Too unwell to gain from training — medicine would help."
    }
    return "Too hungry to gain from tonight's training."
  }
  switch (creature.trainingResult) {
    case "gained":
      return lastFocus
        ? `Last night's rest sharpened ${STAT_LABEL[lastFocus]}.`
        : "A night of rest paid off in training."
    case "sick":
      return `${creature.name} was too unwell to gain from training.`
    case "hungry":
      return `${creature.name} was too hungry to gain from training.`
    default:
      return ""
  }
}

/**
 * The care HUD: broadcast-style overlays over the 3D ranch — a top-center
 * day scoreboard, a bottom-left creature lower-third with condition bars,
 * and a bottom-right action cluster. Flat translucent panels, no gradients.
 */
export function createHud(root: HTMLElement, handlers: HudHandlers): Hud {
  // Top-center scoreboard chip.
  const dayChip = document.createElement("div")
  dayChip.className = "day-chip"
  const dayReadout = document.createElement("span")
  dayReadout.className = "day-readout"
  const apRow = document.createElement("span")
  apRow.className = "ap-row"
  dayChip.append(dayReadout, apRow)

  // Bottom-left creature lower-third.
  const lowerThird = document.createElement("div")
  lowerThird.className = "lower-third"
  const nameRow = document.createElement("div")
  nameRow.className = "creature-name-row"
  const creatureName = document.createElement("span")
  creatureName.className = "creature-name"
  const elementBadge = document.createElement("span")
  elementBadge.className = "element-badge"
  nameRow.append(creatureName, elementBadge)

  const bars: Array<{
    row: HTMLElement
    fill: HTMLElement
    value: HTMLElement
    key: keyof CreatureConditions
  }> = []
  const statRow = document.createElement("div")
  statRow.className = "stat-row"
  const statCells = STATS.map(({ key, label }) => {
    const cell = document.createElement("span")
    cell.className = "stat-cell"
    const statLabel = document.createElement("span")
    statLabel.className = "stat-label"
    statLabel.textContent = label
    const total = document.createElement("span")
    total.className = "stat-total"
    const bonus = document.createElement("span")
    bonus.className = "stat-bonus"
    cell.append(statLabel, total, bonus)
    statRow.append(cell)
    return { total, bonus, key }
  })
  const barList = document.createElement("div")
  barList.className = "condition-bars"
  for (const def of CONDITIONS) {
    const row = document.createElement("div")
    row.className = "condition-row"
    const label = document.createElement("span")
    label.className = "condition-label"
    label.textContent = def.label
    const track = document.createElement("div")
    track.className = "condition-track"
    const fill = document.createElement("div")
    fill.className = `condition-fill ${def.className}`
    track.append(fill)
    const value = document.createElement("span")
    value.className = "condition-value"
    row.append(label, track, value)
    barList.append(row)
    bars.push({ row, fill, value, key: def.key })
  }
  const status = document.createElement("div")
  status.className = "status-callout"
  lowerThird.append(nameRow, statRow, barList, status)

  // Bottom-right action cluster.
  const cluster = document.createElement("div")
  cluster.className = "action-cluster"
  const actionRow = document.createElement("div")
  actionRow.className = "action-row"
  const actionButtons = ACTIONS.map(({ action, label }) => {
    const button = document.createElement("button")
    button.className = "care-button"
    button.type = "button"
    const name = document.createElement("span")
    name.textContent = label
    const cost = document.createElement("span")
    cost.className = "ap-cost"
    cost.textContent = "1 AP"
    const reason = document.createElement("span")
    reason.className = "action-reason"
    button.append(name, cost, reason)
    button.addEventListener("click", () => handlers.onCare(action))
    actionRow.append(button)
    return { button, reason, action }
  })
  // Train control and its inline four-stat picker. Opening or closing
  // the picker spends nothing — only an assignment can.
  const trainRow = document.createElement("div")
  trainRow.className = "train-row"
  const trainButton = document.createElement("button")
  trainButton.className = "care-button"
  trainButton.type = "button"
  const trainName = document.createElement("span")
  trainName.textContent = "Train"
  const trainCost = document.createElement("span")
  trainCost.className = "ap-cost"
  trainCost.textContent = "1 AP"
  const trainReason = document.createElement("span")
  trainReason.className = "action-reason"
  trainButton.append(trainName, trainCost, trainReason)
  trainRow.append(trainButton)

  const picker = document.createElement("div")
  picker.className = "train-picker"
  picker.style.display = "none"
  const pickerButtons = STATS.map(({ key, label }) => {
    const button = document.createElement("button")
    button.className = "train-entry"
    button.type = "button"
    const name = document.createElement("span")
    name.className = "train-entry-name"
    name.textContent = label
    const note = document.createElement("span")
    note.className = "train-note"
    button.append(name, note)
    button.addEventListener("click", () => {
      pickerOpen = false
      handlers.onTrain(key)
    })
    picker.append(button)
    return { button, note, key }
  })
  const advance = document.createElement("button")
  advance.className = "advance-button"
  advance.type = "button"
  advance.textContent = "Advance Day"
  advance.addEventListener("click", handlers.onAdvanceDay)
  cluster.append(actionRow, trainRow, picker, advance)

  root.append(dayChip, lowerThird, cluster)

  let pickerOpen = false
  let lastFocus: StatKey | null = null
  let current: GameState | null = null

  // Toggling the picker spends nothing — render only.
  trainButton.addEventListener("click", () => {
    pickerOpen = !pickerOpen
    if (current) update(current)
  })

  const update = (state: GameState): void => {
    current = state
    dayReadout.textContent = `Day ${state.day} · ${
      state.phase === "cup" ? "Cup day" : "Day phase"
    }`
    const filled = "●".repeat(state.actionPoints)
    const empty = "○".repeat(
      Math.max(0, ACTION_POINTS_PER_DAY - state.actionPoints),
    )
    apRow.textContent = `AP ${filled}${empty}`
    advance.textContent =
      state.phase === "cup" ? "Continue past cup" : "Advance Day"

    const creature = state.creature
    if (!creature) {
      // Pre-starter: only the day chip is meaningful.
      lowerThird.style.display = "none"
      actionRow.style.display = "none"
      trainRow.style.display = "none"
      picker.style.display = "none"
      status.textContent = ""
      return
    }
    lowerThird.style.display = ""
    actionRow.style.display = ""
    trainRow.style.display = ""

    // The creature carries its own identity; the species catalog is only
    // needed for starter-card display.
    creatureName.textContent = creature.name
    elementBadge.textContent = creature.element
    elementBadge.className = `element-badge el-${creature.element}`

    // Stat row: name, total (rolled base + trained), bonus when above 0.
    for (const cell of statCells) {
      const base = creature.stats[cell.key]
      const trained = creature.trained[cell.key]
      cell.total.textContent = String(base + trained)
      cell.bonus.textContent = trained > 0 ? `+${trained}` : ""
    }

    // Train button: disabled only when nothing is possible. A focus set
    // keeps it enabled at 0 AP, because a same-day swap is free.
    const preview = previewTraining(creature)
    const allCapped = STATS.every(
      ({ key }) => creature.trained[key] >= TRAINING_CAP,
    )
    if (allCapped) {
      trainButton.disabled = true
      trainReason.textContent = "Nothing left to train for now."
    } else if (state.actionPoints === 0 && !creature.trainingFocus) {
      trainButton.disabled = true
      trainReason.textContent = REJECTION_COPY["no-ap"]
    } else {
      trainButton.disabled = false
      trainReason.textContent = creature.trainingFocus
        ? `Focus: ${STAT_LABEL[creature.trainingFocus]}`
        : ""
    }

    // Picker entries: tonight's delta, or the waste reason. Capped stats
    // are disabled; the current focus is marked.
    picker.style.display = pickerOpen ? "" : "none"
    for (const entry of pickerButtons) {
      const capped = creature.trained[entry.key] >= TRAINING_CAP
      entry.button.disabled = capped
      entry.button.classList.toggle(
        "is-focus",
        creature.trainingFocus === entry.key,
      )
      if (capped) {
        entry.note.textContent = "as sharp as it can get for now"
      } else if (creature.trainingFocus === entry.key) {
        entry.note.textContent = preview
          ? `focused · ${previewNote(preview)}`
          : "focused"
      } else if (preview === "gained") {
        const total = creature.stats[entry.key] + creature.trained[entry.key]
        entry.note.textContent = `${STAT_LABEL[entry.key]} ${total} → ${total + 1}`
      } else {
        entry.note.textContent = preview ? previewNote(preview) : "costs 1 AP"
      }
    }

    for (const bar of bars) {
      const v = creature.conditions[bar.key]
      bar.fill.style.width = `${v}%`
      bar.value.textContent = String(v)
    }
    const training = trainingStatus(creature, lastFocus)
    status.textContent =
      training || coachVoice(creature.conditions, creature.name)

    // Disabled states come from the sim itself — a dry-run careAction is
    // the single source of truth for why an action can't happen.
    for (const entry of actionButtons) {
      const result = careAction(state, entry.action)
      if (result.ok) {
        entry.button.disabled = false
        entry.reason.textContent = ""
      } else {
        entry.button.disabled = true
        entry.reason.textContent = REJECTION_COPY[result.reason]
      }
    }

    // Remember the focus across Advance Day so the morning result can
    // name the stat it sharpened.
    if (creature.trainingFocus) lastFocus = creature.trainingFocus
  }

  return { update }
}
