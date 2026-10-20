/**
 * Creature detail modal: the full 4-way stat breakdown per stat (rolled
 * base, trained bonus, evolution boost, inherited floor) plus the partner's
 * context rows (stage, generation, cups won, bond, mood) and the Growth
 * section naming the gate it is growing through. Opened by tapping the
 * ranch creature plate; renders fresh from state on every open and repaints
 * the Growth section in place while it stays open.
 *
 * The shell is pinned like the handbook: header, tab strip and close action
 * stay put while the active page scrolls. Tabs are the shared controller's,
 * so the same keyboard rules apply to both modals.
 *
 * Pure DOM from the shared broadcast kit — no interaction wiring beyond the
 * modal's own Escape/backdrop/close semantics and the tab strip.
 */
import {
  type Creature,
  defaultLoadout,
  effectiveTraits,
  type GameState,
  getMove,
  getSpecies,
  knownMoves,
  requiredTierDays,
  type StatKey,
  statBreakdown,
} from "@apex/sim"
import { focusTrap } from "./battleUI"
import { createTrainingHost } from "./detail/training-tab"
import { parentageLabel, traitCopy } from "./graduation/nursery-vm"
import { createGrowthHost } from "./growth-panel"
import { crest, tab } from "./ui/kit"
import { romanNumeral, stageLabel } from "./ui/labels"
import { createTabs, type TabSpec } from "./ui/tabs"

const STAT_LABELS: Array<{ key: StatKey; label: string }> = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
]

/** A generation as a Roman numeral — "Gen I", "Gen II" (0 → "Gen 0"). */
function generationLabel(generation: number): string {
  return generation < 1 ? "Gen 0" : `Gen ${romanNumeral(generation)}`
}

/** One stat row: label + total, then the four breakdown chips beneath. */
function statRow(
  key: StatKey,
  label: string,
  breakdown: ReturnType<typeof statBreakdown>,
): HTMLElement {
  const row = document.createElement("div")
  row.className = "detail-stat"
  const head = document.createElement("div")
  head.className = "detail-stat-head"
  const name = document.createElement("span")
  name.className = "detail-stat-label"
  name.textContent = label
  const total = document.createElement("span")
  total.className = "detail-stat-total"
  total.textContent = String(breakdown[key].total)
  head.append(name, total)
  const chips = document.createElement("div")
  chips.className = "detail-stat-chips"
  const parts: Array<[string, number | null]> = [
    ["rolled", breakdown[key].baseRolled],
    ["trained", breakdown[key].trainedBonus],
    ["evolved", breakdown[key].stageBoost],
    ["floor", breakdown[key].inheritedFloor],
  ]
  for (const [word, value] of parts) {
    const chipEl = document.createElement("span")
    chipEl.className = "detail-stat-chip"
    const shown =
      value === null
        ? "—"
        : value > 0 && word !== "rolled"
          ? `+${value}`
          : String(value)
    chipEl.textContent = `${word} ${shown}`
    chips.append(chipEl)
  }
  row.append(head, chips)
  return row
}

/** One context row: a dim label and its value. */
function contextRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div")
  row.className = "detail-context-row"
  const name = document.createElement("span")
  name.className = "detail-context-label"
  name.textContent = label
  const val = document.createElement("span")
  val.className = "detail-context-value"
  val.textContent = value
  row.append(name, val)
  return row
}

export interface CreatureDetail {
  /** The modal root — append it to the HUD root once. Starts hidden. */
  root: HTMLElement
  /** Render from current state and show the modal, on the Stats page. */
  open: (state: GameState) => void
  /**
   * Record state and repaint the Growth section when the modal is open. The
   * record survives a closed modal, so entering Growth after a settlement
   * paints fresh rows instead of the ones from the last open. The HUD calls it
   * on every commit.
   */
  sync: (state: GameState) => void
}

/**
 * The six pool rows for the detail modal: equipped moves read "In kit",
 * known moves read "Learned", and locked ones carry their gate. The gate
 * copy is the same language the picker uses so a coach can map one to the
 * other.
 */
function kitRows(creature: Creature): HTMLElement[] {
  const species = getSpecies(creature.speciesId)
  if (!species) return []
  const known = new Set(knownMoves(creature, species))
  const equipped = new Set(
    creature.loadout ?? defaultLoadout(creature, species),
  )
  return species.kit.map((id, index) => {
    const row = document.createElement("div")
    row.className = "detail-kit-row"
    const name = document.createElement("span")
    name.className = "detail-kit-name"
    name.textContent = getMove(id)?.displayName ?? id
    const state = document.createElement("span")
    state.className = "detail-kit-state"
    if (equipped.has(id)) {
      state.textContent = "In kit"
      state.dataset.state = "equipped"
    } else if (known.has(id)) {
      state.textContent = "Learned"
      state.dataset.state = "known"
    } else {
      const remaining =
        requiredTierDays(index, creature.stage) - creature.trainingDays
      const spell = remaining === 1 ? "day" : "days"
      state.textContent =
        index === 2 && creature.stage === "baby"
          ? `${remaining} ${spell}, or evolve`
          : `${remaining} ${spell}`
      state.dataset.state = "locked"
    }
    row.append(name, state)
    return row
  })
}

/**
 * Build the creature detail modal. Callers append `root` to the HUD and
 * call `open(state)` when the creature plate is tapped.
 */
export function buildCreatureDetail(): CreatureDetail {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Partner details")

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box creature-detail-box"

  // Head: crest + name + stage tab — mirrors the plate's head row.
  const head = document.createElement("div")
  head.className = "creature-detail-head"
  const crestEl = crest("fire")
  const name = document.createElement("span")
  name.className = "creature-detail-name"
  const stageTab = tab("Baby", "stage")
  head.append(crestEl, name, stageTab)

  // Stats page: the four stat rows, rebuilt on every open.
  const statList = document.createElement("div")
  statList.className = "detail-stat-list"

  // Stats page, continued: stage, generation, cups won, bond, mood.
  const context = document.createElement("div")
  context.className = "detail-context"

  // Moves page: six rows, the equipped four marked and every locked row
  // spelling out its gate (move_pool_20261018 FR5).
  const kit = document.createElement("div")
  kit.className = "detail-kit"

  // Growth page's slot: swapped in place on every commit so a gate unlocked
  // while the panel is open repaints without a reopen (FR-7). It keeps its
  // own node so scroll and focus elsewhere in the modal never reset.
  const growth = document.createElement("div")
  growth.className = "detail-growth-host"
  growth.hidden = true
  const growthHost = createGrowthHost(growth)

  // Training page's slot: repainted from every commit, so a settlement or a
  // new assignment that lands while the modal is open reads current.
  const training = document.createElement("div")
  training.className = "detail-training-host"
  const trainingHost = createTrainingHost(training)

  /** The last state painted, so Growth can repaint whenever it is entered. */
  let last: GameState | null = null

  const TABS: TabSpec[] = [
    { label: "Stats", build: (panel) => panel.append(statList, context) },
    { label: "Growth", build: (panel) => panel.append(growth) },
    { label: "Training", build: (panel) => panel.append(training) },
    { label: "Moves", build: (panel) => panel.append(kit) },
  ]
  const { tablist, panels, select } = createTabs({
    ariaLabel: "Partner details sections",
    idPrefix: "detail",
    tabs: TABS,
    // Entering Growth paints it from the remembered state, so a page left
    // behind before a settlement can never come back stale (AC-5).
    onSelect: (index) => {
      if (index === 1 && last !== null) growthHost.paint(last)
    },
  })
  tablist.classList.add("detail-tabs")
  for (const button of tablist.children) {
    button.classList.add("kit-tab", "detail-tab")
  }
  for (const panel of panels) panel.classList.add("detail-panel")

  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const close = document.createElement("button")
  close.className = "kit-button"
  close.type = "button"
  close.textContent = "Back to the ranch"
  actions.append(close)

  box.append(head, tablist, ...panels, actions)
  root.append(box)

  /** Where focus goes when the modal closes (the tapped plate head). */
  let opener: HTMLElement | null = null
  const closeNow = (): void => {
    root.style.display = "none"
    growthHost.setVisible(false)
    if (opener?.isConnected) opener.focus()
    opener = null
  }
  const trap = focusTrap(box)
  root.addEventListener("keydown", (event) => {
    trap(event)
    if (event.key === "Escape") closeNow()
  })
  root.addEventListener("click", (event) => {
    if (event.target === root) closeNow()
  })
  close.addEventListener("click", closeNow)

  return {
    root,
    open: (state) => {
      const creature = state.creature
      if (!creature) return
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      crestEl.replaceWith(crest(creature.element))
      name.textContent = creature.name
      stageTab.textContent = stageLabel(creature.stage)

      const breakdown = statBreakdown(creature, state.lineage)
      statList.replaceChildren(
        ...STAT_LABELS.map(({ key, label }) => statRow(key, label, breakdown)),
      )

      const traits = effectiveTraits(creature)
      context.replaceChildren(
        contextRow("Stage", stageLabel(creature.stage)),
        contextRow(
          "Lineage",
          `${generationLabel(state.lineage.generation)} · ${parentageLabel(creature.parents)}`,
        ),
        contextRow(
          "Traits",
          traits.length > 0
            ? traits.map((id) => traitCopy(id).label).join(" · ")
            : "—",
        ),
        contextRow("Cups won", String(state.cupsWon)),
        contextRow("Bond", `${creature.conditions.bond}/100`),
        contextRow("Mood", `${creature.conditions.mood}/100`),
      )

      kit.replaceChildren(...kitRows(creature))
      // Paint before showing: the host renders once on the way in, from the
      // state it was just handed, instead of once on show and again on paint.
      last = state
      growthHost.paint(state)
      trainingHost.paint(state)
      growthHost.setVisible(true)
      select(0)
      root.style.display = ""
      close.focus()
    },
    sync: (state) => {
      // The repaint inside `paint` is a no-op while the modal is closed, but
      // the record is always updated, so entering Growth after a settlement
      // paints fresh rows (FR-7). The HUD can call this on every commit.
      last = state
      growthHost.paint(state)
      trainingHost.paint(state)
    },
  }
}
