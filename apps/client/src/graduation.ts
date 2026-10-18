/**
 * The legacy surfaces (legacy_breeding_20261013): the graduation confirm
 * modal, the egg screen (choose the next creature, with the inherited stat
 * floor previewed), and the Hall of Fame panel. Presentation only — the sim
 * decides eligibility (canGraduate) and performs the succession (graduate);
 * main.ts owns the wiring and the ceremony.
 */

import {
  BOSSES,
  type CreatureStats,
  effectiveStats,
  effectiveTraits,
  type GameState,
  getSpecies,
  inheritedFloor,
  lineagePerks,
  lineagePrestige,
  type RetiredRecord,
  STARTER_SPECIES,
} from "@apex/sim"
import { focusTrap } from "./battleUI"
import { createNursery } from "./graduation/nursery"
import { parentageLabel, traitCopy } from "./graduation/nursery-vm"
import { chip, crest, tab } from "./ui/kit"

export interface GraduationHandlers {
  /** The player confirmed the send-off; main plays the ceremony + opens the
   * egg screen. */
  onConfirm: () => void
  /** The player chose the next creature's species. */
  onPick: (speciesId: string) => void
  /** The player hatched a dual-parent egg in the Nursery. */
  onHatch: (generations: number[], speciesId: string, seed: number) => void
}

export interface GraduationFlow {
  /** Open the confirm modal ("start the send-off?"). */
  openConfirm(state: GameState): void
  /** Open the egg screen (choose the successor, floor previewed). */
  showEggScreen(state: GameState): void
  /** Open the Nursery (pair two Hall records, preview the seeded hatch). */
  showNursery(state: GameState): void
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

/**
 * The second Hall line: parentage plus carried traits. Founder records show
 * "Founder"; a bred line reads like "Child of Gen 0 × Gen 1 — Sturdy +2 HP".
 */
export function hallEntryMeta(record: RetiredRecord): string {
  const parentage = parentageLabel(record.parents)
  // Pre-v15 records migrate with `traits: []`; derive one for display so an
  // old Hall still reads meaningfully.
  const traits = effectiveTraits(record).map((id) => traitCopy(id).label)
  return traits.length > 0 ? `${parentage} — ${traits.join(" · ")}` : parentage
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
 * The element that opened a surface, remembered so focus can return to it
 * when the surface closes — the same courtesy the spar overlay pays its chip.
 * Null when nothing focusable was active (a programmatic open).
 */
function openerElement(): HTMLElement | null {
  const active = document.activeElement
  return active instanceof HTMLElement ? active : null
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
  /** Where focus goes when a surface closes (nothing to do if it is gone). */
  let confirmOpener: HTMLElement | null = null
  let hallOpener: HTMLElement | null = null
  const restoreFocus = (target: HTMLElement | null): void => {
    if (target?.isConnected) target.focus()
  }
  /** Dismiss the confirm modal and hand focus back to the Graduate chip. */
  const dismissConfirm = (): void => {
    confirm.root.style.display = "none"
    restoreFocus(confirmOpener)
  }
  const keepChip = chip({
    label: "Not yet",
    variant: "dim",
    onClick: dismissConfirm,
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
  /** The first pickable card: where focus lands when the screen opens. */
  let firstEggCard: HTMLButtonElement | null = null
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
      firstEggCard ??= card
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
  // Scalps (silver_ladder_bosses_20261016, FR11): the boss ledger rides in
  // the Hall of Fame — the definitive list of gatekeepers this line has
  // put down, in defeat order.
  const scalpsTitle = document.createElement("div")
  scalpsTitle.className = "hall-scalps-title"
  scalpsTitle.textContent = "Scalps"
  const scalpsList = document.createElement("ul")
  scalpsList.className = "hall-list"
  hall.box.append(scalpsTitle, scalpsList)
  /** Dismiss the Hall of Fame and hand focus back to the Lineage plate. */
  const dismissHall = (): void => {
    hall.root.style.display = "none"
    restoreFocus(hallOpener)
  }
  const hallClose = chip({
    label: "Close",
    variant: "dim",
    onClick: dismissHall,
  })
  hall.actions.append(hallClose)
  hall.box.append(hall.actions)

  // -- Nursery ---------------------------------------------------------------
  const nursery = createNursery({ onHatch: handlers.onHatch })

  root.append(confirm.root, egg, hall.root, nursery.root)
  wireModal(confirm.root, confirm.box, dismissConfirm)
  wireModal(hall.root, hall.box, dismissHall)

  const close = (): void => {
    confirm.root.style.display = "none"
    egg.style.display = "none"
    hall.root.style.display = "none"
    nursery.close()
  }

  const update = (state: GameState): void => {
    const creature = state.creature
    if (!creature) return
    // Egg screen: the inherited floor per species + the active perks.
    const prestige = lineagePrestige(state)
    for (const species of STARTER_SPECIES) {
      const line = eggFloors.get(species.id)
      if (!line) continue
      // effectiveStats is the sim's own sum — never re-added here, so the
      // previewed floor can never drift from the floor `graduate` applies.
      const floor = inheritedFloor(effectiveStats(creature), species, prestige)
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
        const meta = document.createElement("span")
        meta.className = "hall-entry-meta"
        meta.textContent = hallEntryMeta(record)
        li.append(badge, label, meta)
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
    // Scalps: the boss ledger, in defeat order, resolved through the
    // registry so the display can never drift from the boss roster.
    const scalps = state.bossDefeats
      .map((id) => BOSSES.find((boss) => boss.id === id))
      .filter((boss) => boss !== undefined)
    scalpsList.replaceChildren(
      ...scalps.map((boss) => {
        const li = document.createElement("li")
        li.className = "hall-entry"
        const species = getSpecies(boss.speciesId)
        const badge = species ? crest(species.element) : null
        const label = document.createElement("span")
        label.className = "hall-entry-label"
        label.textContent = `${boss.name} · ${boss.milestone} gate`
        if (badge) li.append(badge)
        li.append(label)
        return li
      }),
    )
    if (scalps.length === 0) {
      const empty = document.createElement("li")
      empty.className = "hall-entry is-empty"
      empty.textContent = "No gate bosses scalped yet — the gates await."
      scalpsList.append(empty)
    }
  }

  return {
    openConfirm(state) {
      const creature = state.creature
      if (!creature) return
      confirmOpener = openerElement()
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
      // The send-off ends here: put the keyboard on the first egg, not on a
      // body that just stopped being the champion.
      firstEggCard?.focus()
    },
    showNursery(state) {
      update(state)
      nursery.show(state)
    },
    openHallOfFame(state) {
      update(state)
      hallOpener = openerElement()
      hall.root.style.display = ""
      hallClose.focus()
    },
    update,
    close,
  }
}
