import type { Creature, CreatureConditions, FormTier, StatKey } from "@apex/sim"
import { FORM_COPY, formTier } from "@apex/sim"
import { icons } from "../ui/icons"
import { bar, crest, plate, tab, ticker } from "../ui/kit"
import { formDeltaLine, STATS } from "./copy-care"

const CONDITIONS: Array<{
  key: keyof CreatureConditions
  label: string
  glyph: string
  color: string
}> = [
  {
    key: "hunger",
    label: "Hunger",
    glyph: icons.hunger,
    color: "var(--bar-hunger)",
  },
  {
    key: "energy",
    label: "Energy",
    glyph: icons.energy,
    color: "var(--bar-energy)",
  },
  {
    key: "health",
    label: "Health",
    glyph: icons.health,
    color: "var(--bar-health)",
  },
  { key: "mood", label: "Mood", glyph: icons.mood, color: "var(--bar-mood)" },
  { key: "bond", label: "Bond", glyph: icons.bond, color: "var(--bar-bond)" },
]

/** The creature lower-third elements the daily update writes into. */
export interface CreaturePlateRefs {
  root: HTMLElement
  creatureHead: HTMLButtonElement
  collapseButton: HTMLButtonElement
  headRow: HTMLElement
  creatureName: HTMLElement
  stageTab: HTMLElement
  formChip: HTMLElement
  crestEl: HTMLElement
  renameButton: HTMLButtonElement
  nameInput: HTMLInputElement
  renameConfirm: HTMLButtonElement
  renameCancel: HTMLButtonElement
  editRow: HTMLElement
  statCells: Array<{ total: HTMLElement; bonus: HTMLElement; key: StatKey }>
  bars: Array<{
    handle: ReturnType<typeof bar>
    delta: HTMLElement
    key: keyof CreatureConditions
    prev: number | null
  }>
  statusTicker: ReturnType<typeof ticker>
}

/**
 * Bottom-left creature lower-third (broadcast kit plate): head row with
 * collapse/rename affordances, stat cells, condition bars with transient
 * delta chips, and the live-region status ticker. Pure DOM — interaction
 * wiring and values stay with createHud.
 */
export function buildCreaturePlate(): CreaturePlateRefs {
  const root = plate({ className: "creature-plate" })
  // The creature head opens the partner-details modal (coach_knowledge_20261016):
  // crest + name + stage, one tap to the full stat breakdown.
  const creatureHead = document.createElement("button")
  creatureHead.className = "creature-head"
  creatureHead.type = "button"
  creatureHead.title = "Partner details"
  const crestEl = crest("fire")
  const creatureName = document.createElement("span")
  creatureName.className = "creature-name"
  const stageTab = tab("Baby", "stage")
  // Form chip (FR-14): the tier word rides the existing chip row, stacked with
  // the stage tab so the 74px collapsed plate keeps its height. The word is the
  // carrier and the title spells the ATK consequence (NFR-5: never colour
  // alone). Values are painted by `paintFormChip` from the daily update.
  const formChip = tab(FORM_COPY.steady.label, "stage")
  formChip.classList.add("creature-form", "is-outline")
  const chips = document.createElement("span")
  chips.className = "creature-chips"
  chips.append(stageTab, formChip)
  creatureHead.append(crestEl, creatureName, chips)

  // Rename affordance: a sibling button (never nested inside a button) that
  // swaps the head row for an inline edit form.
  const renameButton = document.createElement("button")
  renameButton.className = "rename-button"
  renameButton.type = "button"
  renameButton.title = "Rename partner"
  renameButton.setAttribute("aria-label", "Rename partner")
  renameButton.innerHTML = icons.pencil
  // Collapse affordance: its own button so the head stays free for the
  // details modal. The chevron points down expanded, right collapsed (CSS).
  const collapseButton = document.createElement("button")
  collapseButton.className = "collapse-toggle"
  collapseButton.type = "button"
  collapseButton.title = "Collapse panel"
  collapseButton.setAttribute("aria-label", "Collapse panel")
  collapseButton.setAttribute("aria-expanded", "true")
  const creatureChev = document.createElement("span")
  creatureChev.className = "collapse-chev"
  creatureChev.innerHTML = icons.chevron
  collapseButton.append(creatureChev)
  const headRow = document.createElement("div")
  headRow.className = "creature-headrow"
  headRow.append(creatureHead, renameButton, collapseButton)

  // Inline edit form: name input + confirm/cancel. Hidden until the
  // pencil is pressed; Enter confirms, Escape cancels.
  const nameInput = document.createElement("input")
  nameInput.className = "creature-name-input"
  nameInput.type = "text"
  nameInput.maxLength = 16
  nameInput.setAttribute("aria-label", "Creature name")
  const renameConfirm = document.createElement("button")
  renameConfirm.className = "kit-button rename-confirm"
  renameConfirm.type = "button"
  renameConfirm.textContent = "Save"
  renameConfirm.setAttribute("aria-label", "Save name")
  const renameCancel = document.createElement("button")
  renameCancel.className = "kit-button rename-cancel"
  renameCancel.type = "button"
  renameCancel.textContent = "Cancel"
  renameCancel.setAttribute("aria-label", "Cancel rename")
  const editRow = document.createElement("div")
  editRow.className = "creature-name-edit"
  editRow.style.display = "none"
  editRow.append(nameInput, renameConfirm, renameCancel)

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
    bonus.className = "stat-chip"
    cell.append(statLabel, total, bonus)
    statRow.append(cell)
    return { total, bonus, key }
  })
  const conditionList = document.createElement("div")
  conditionList.className = "condition-list"
  const bars: Array<{
    handle: ReturnType<typeof bar>
    delta: HTMLElement
    key: keyof CreatureConditions
    prev: number | null
  }> = CONDITIONS.map((def) => {
    const handle = bar({
      label: def.label,
      glyph: def.glyph,
      value: 0,
      max: 100,
      color: def.color,
    })
    // Transient change chip: pinned next to the value for ~1.2s on a
    // meaningful swing, then hidden again (mock "bar change feedback").
    const delta = document.createElement("em")
    delta.className = "condition-delta"
    delta.style.display = "none"
    handle.value.append(delta)
    conditionList.append(handle.root)
    return { handle, delta, key: def.key, prev: null }
  })
  const statusTicker = ticker()
  // Hardening: the announcer strip is live region (screen readers hear
  // routine callouts without focus).
  statusTicker.root.setAttribute("aria-live", "polite")
  root.append(headRow, editRow, statRow, conditionList, statusTicker.root)
  return {
    root,
    creatureHead,
    collapseButton,
    headRow,
    creatureName,
    stageTab,
    formChip,
    crestEl,
    renameButton,
    nameInput,
    renameConfirm,
    renameCancel,
    editRow,
    statCells,
    bars,
    statusTicker,
  }
}

/** The plate chip's accessible name: the tier word plus its ATK consequence. */
export function formChipTitle(tier: FormTier): string {
  return `${FORM_COPY[tier].label}: ${formDeltaLine(tier)}`
}

/**
 * Paint the form chip from a creature. Text carries the tier, `title` and
 * `aria-label` carry the consequence, so the readout survives greyscale.
 */
export function paintFormChip(chip: HTMLElement, creature: Creature): void {
  const tier = formTier(creature)
  const read = formChipTitle(tier)
  chip.textContent = FORM_COPY[tier].label
  chip.title = read
  chip.setAttribute("aria-label", read)
}
