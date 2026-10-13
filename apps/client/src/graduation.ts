/**
 * The legacy surfaces (legacy_breeding_20261013): the graduation confirm
 * modal, the egg screen (choose the next creature, with the inherited stat
 * floor previewed), and the Hall of Fame panel. Presentation only — the sim
 * decides eligibility (canGraduate) and performs the succession (graduate);
 * main.ts owns the wiring and the ceremony.
 */

import {
  type CreatureStats,
  type GameState,
  getSpecies,
  inheritedFloor,
  lineagePerks,
  lineagePrestige,
  type RetiredRecord,
  STARTER_SPECIES,
} from "@apex/sim"
import { focusTrap } from "./battleUI"
import { chip, crest, tab } from "./ui/kit"

export interface GraduationHandlers {
  /** The player confirmed the send-off; main plays the ceremony + opens the
   * egg screen. */
  onConfirm: () => void
  /** The player chose the next creature's species. */
  onPick: (speciesId: string) => void
}

export interface GraduationFlow {
  /** Open the confirm modal ("start the send-off?"). */
  openConfirm(state: GameState): void
  /** Open the egg screen (choose the successor, floor previewed). */
  showEggScreen(state: GameState): void
  /** Open the Hall of Fame panel. */
  openHallOfFame(state: GameState): void
  /** Mirror live state into any open surface (family name / records). */
  update(state: GameState): void
  /** Close every surface. */
  close(): void
}

/** Coach-voice confirm copy (≤ 2 sentences, warm, never grimdark). */
export function confirmCopy(name: string): string {
  return `${name} has had a full career. Retire ${name} to the Hall of Fame and pass a stat floor to the next egg?`
}

/** The send-off confirmation button label. */
export function confirmLabel(name: string): string {
  return `Graduate ${name}`
}

/** The bloodline summary line for the egg screen. */
export function lineageSummary(state: GameState): string {
  const g = state.lineage.generation
  const prestige = lineagePrestige(state)
  return `Generation ${g} · Prestige ${prestige} · ${state.cupsWon} cup${state.cupsWon === 1 ? "" : "s"}`
}

/** One stat-floor summary, e.g. "HP 44 · ATK 8 · DEF 10 · SPD 6". */
export function floorSummary(floor: CreatureStats): string {
  return `HP ${floor.hp} · ATK ${floor.atk} · DEF ${floor.def} · SPD ${floor.spd}`
}

/** The perk badges active at a prestige rating (for the egg screen). */
export function perkLabels(state: GameState): string[] {
  const perks = lineagePerks(lineagePrestige(state))
  const out: string[] = []
  if (perks.warmBloodline) out.push("Warm bloodline: +10 starting bond")
  if (perks.establishedLine)
    out.push("Established line: +1 to every inherited stat")
  return out
}

/** A Hall of Fame entry label, e.g. "Ember Drake · Champion · gen 0 · day 60". */
export function hallEntryLabel(record: RetiredRecord): string {
  return `${record.name} · Champion · gen ${record.generation} · day ${record.retiredOnDay}`
}

function modalShell(): {
  root: HTMLDivElement
  box: HTMLDivElement
  title: HTMLHeadingElement
  text: HTMLParagraphElement
  actions: HTMLDivElement
} {
  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box"
  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  const text = document.createElement("p")
  text.className = "kit-modal-text"
  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  box.append(title, text)
  root.append(box)
  return { root, box, title, text, actions }
}

/** Wire a modal's escape/backdrop/trap behavior around an actions row. */
function wireModal(
  root: HTMLElement,
  box: HTMLElement,
  close: () => void,
): {
  handleKeydown: (event: KeyboardEvent) => void
} {
  const trap = focusTrap(box)
  const handleKeydown = (event: KeyboardEvent): void => {
    trap(event)
    if (event.key === "Escape") {
      event.stopPropagation()
      close()
    }
  }
  root.addEventListener("keydown", handleKeydown)
  root.addEventListener("click", (event) => {
    if (event.target === root) close()
  })
  return { handleKeydown }
}

/**
 * Build the graduation surfaces: a confirm modal, an egg screen (starter-kit
 * grid with an inherited-floor line per species), and a Hall of Fame modal.
 * All three start hidden; callers open them explicitly.
 */
export function createGraduation(
  root: HTMLElement,
  handlers: GraduationHandlers,
): GraduationFlow {
  // -- Confirm modal ---------------------------------------------------------
  const confirm = modalShell()
  const keepChip = chip({
    label: "Not yet",
    variant: "dim",
    onClick: () => {
      confirm.root.style.display = "none"
    },
  })
  const confirmButton = document.createElement("button")
  confirmButton.className = "kit-button"
  confirmButton.type = "button"
  confirm.actions.append(keepChip, confirmButton)
  confirm.box.append(confirm.actions)

  // -- Egg screen ------------------------------------------------------------
  const egg = document.createElement("div")
  egg.className = "starter-overlay graduation-overlay"
  egg.style.display = "none"
  const eggHead = document.createElement("div")
  eggHead.className = "starter-head"
  eggHead.append(tab("Legacy", "accent"))
  const eggHeading = document.createElement("span")
  eggHeading.className = "starter-heading"
  eggHeading.textContent = "Choose the next creature"
  const eggSummary = document.createElement("span")
  eggSummary.className = "lineage-meta"
  eggHead.append(eggHeading, eggSummary)
  const perkRow = document.createElement("div")
  perkRow.className = "graduation-perks"
  const eggGrid = document.createElement("div")
  eggGrid.className = "starter-grid"
  const eggFloors = new Map<string, HTMLElement>()
  for (const species of STARTER_SPECIES) {
    const card = document.createElement("button")
    card.type = "button"
    card.className = "starter-card kit-plate"
    if (!species.available) {
      card.disabled = true
      card.classList.add("locked")
    }
    card.append(crest(species.element))
    const name = document.createElement("span")
    name.className = "starter-name"
    name.textContent = species.displayName
    const floorLine = document.createElement("span")
    floorLine.className = "graduation-floor"
    card.append(name, floorLine)
    if (species.available) {
      card.addEventListener("click", () => handlers.onPick(species.id))
    }
    eggGrid.append(card)
    eggFloors.set(species.id, floorLine)
  }
  egg.append(eggHead, perkRow, eggGrid)

  // -- Hall of Fame modal ----------------------------------------------------
  const hall = modalShell()
  hall.title.textContent = "Hall of Fame"
  const hallList = document.createElement("ul")
  hallList.className = "hall-list"
  hall.box.append(hallList)
  const hallClose = chip({
    label: "Close",
    variant: "dim",
    onClick: () => {
      hall.root.style.display = "none"
    },
  })
  hall.actions.append(hallClose)
  hall.box.append(hall.actions)

  root.append(confirm.root, egg, hall.root)
  wireModal(confirm.root, confirm.box, () => {
    confirm.root.style.display = "none"
  })
  wireModal(hall.root, hall.box, () => {
    hall.root.style.display = "none"
  })

  const close = (): void => {
    confirm.root.style.display = "none"
    egg.style.display = "none"
    hall.root.style.display = "none"
  }

  const update = (state: GameState): void => {
    const creature = state.creature
    if (!creature) return
    // Egg screen: the inherited floor per species + the active perks.
    const prestige = lineagePrestige(state)
    for (const species of STARTER_SPECIES) {
      const line = eggFloors.get(species.id)
      if (!line) continue
      const floor = inheritedFloor(
        {
          hp: creature.stats.hp + creature.trained.hp,
          atk: creature.stats.atk + creature.trained.atk,
          def: creature.stats.def + creature.trained.def,
          spd: creature.stats.spd + creature.trained.spd,
        },
        species,
        prestige,
      )
      line.textContent = `Inherited floor — ${floorSummary(floor)}`
    }
    eggSummary.textContent = lineageSummary(state)
    const perks = perkLabels(state)
    perkRow.replaceChildren(
      ...perks.map((label) => {
        const badge = document.createElement("span")
        badge.className = "kit-tab is-outline graduation-perk"
        badge.textContent = label
        return badge
      }),
    )
    // Hall of Fame: newest first.
    const records = [...state.lineage.hallOfFame].reverse()
    hallList.replaceChildren(
      ...records.map((record) => {
        const li = document.createElement("li")
        li.className = "hall-entry"
        const badge = crest(record.element)
        const label = document.createElement("span")
        label.className = "hall-entry-label"
        label.textContent = hallEntryLabel(record)
        li.append(badge, label)
        return li
      }),
    )
    if (records.length === 0) {
      const empty = document.createElement("li")
      empty.className = "hall-entry is-empty"
      empty.textContent =
        "No retired champions yet — graduate one to begin the line."
      hallList.append(empty)
    }
  }

  return {
    openConfirm(state) {
      const creature = state.creature
      if (!creature) return
      confirm.title.textContent = confirmLabel(creature.name)
      confirm.text.textContent = confirmCopy(creature.name)
      confirmButton.textContent = "Graduate"
      confirmButton.onclick = () => {
        confirm.root.style.display = "none"
        handlers.onConfirm()
      }
      update(state)
      confirm.root.style.display = ""
      confirmButton.focus()
    },
    showEggScreen(state) {
      update(state)
      egg.style.display = ""
    },
    openHallOfFame(state) {
      update(state)
      hall.root.style.display = ""
      hallClose.focus()
    },
    update,
    close,
  }
}
