import {
  ACTION_POINTS_PER_DAY,
  type CareAction,
  type CreatureConditions,
  careAction,
  type GameState,
  getSpecies,
} from "@apex/sim"

export interface HudHandlers {
  onAdvanceDay: () => void
  onCare: (action: CareAction) => void
}

export interface Hud {
  update(state: GameState): void
}

/** Coach-voice copy for disabled actions (≤ 2 sentences, never punishing). */
const REJECTION_COPY: Record<string, string> = {
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

function coachVoice(conditions: CreatureConditions, name: string): string {
  if (conditions.health < 80) {
    return `${name} seems unwell — medicine would help.`
  }
  if (conditions.energy <= 30) return `${name} seems sluggish today…`
  if (conditions.mood < 30) return `${name} seems a little down today.`
  if (conditions.hunger <= 20) return `${name} looks hungry.`
  return ""
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
  lowerThird.append(nameRow, barList, status)

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
  const advance = document.createElement("button")
  advance.className = "advance-button"
  advance.type = "button"
  advance.textContent = "Advance Day"
  advance.addEventListener("click", handlers.onAdvanceDay)
  cluster.append(actionRow, advance)

  root.append(dayChip, lowerThird, cluster)

  const update = (state: GameState): void => {
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
      status.textContent = ""
      return
    }
    lowerThird.style.display = ""
    actionRow.style.display = ""

    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error(`unknown species ${creature.speciesId}`)
    creatureName.textContent = species.displayName
    elementBadge.textContent = species.element
    elementBadge.className = `element-badge el-${species.element}`

    for (const bar of bars) {
      const v = creature.conditions[bar.key]
      bar.fill.style.width = `${v}%`
      bar.value.textContent = String(v)
    }
    status.textContent = coachVoice(creature.conditions, species.displayName)

    // Disabled states come from the sim itself — a dry-run careAction is
    // the single source of truth for why an action can't happen.
    for (const entry of actionButtons) {
      const result = careAction(state, entry.action)
      if (result.ok) {
        entry.button.disabled = false
        entry.reason.textContent = ""
      } else {
        entry.button.disabled = true
        entry.reason.textContent = REJECTION_COPY[result.reason] ?? ""
      }
    }
  }

  return { update }
}
