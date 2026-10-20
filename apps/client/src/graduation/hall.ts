/**
 * The Hall of Fame panel (graduation_modules split): the retired line and the
 * scalp ledger. Moved verbatim out of graduation.ts — same rows, same copy,
 * same empty states; the close chip stays with the flow that dismisses it.
 */

import { BOSSES, type GameState, getSpecies } from "@apex/sim"
import { crest } from "../ui/kit"
import { hallEntryLabel, hallEntryMeta } from "./copy"
import { modalShell } from "./modal"

/** The Hall modal's DOM and the lists its update fills in. */
export interface HallView {
  root: HTMLDivElement
  box: HTMLDivElement
  title: HTMLHeadingElement
  text: HTMLParagraphElement
  actions: HTMLDivElement
  list: HTMLUListElement
  scalpsList: HTMLUListElement
}

/** Build the Hall of Fame modal (hidden) with both ledgers in place. */
export function buildHall(): HallView {
  const shell = modalShell()
  shell.title.textContent = "Hall of Fame"
  const list = document.createElement("ul")
  list.className = "hall-list"
  shell.box.append(list)
  // Scalps (silver_ladder_bosses_20261016, FR11): the boss ledger rides in
  // the Hall of Fame — the definitive list of gatekeepers this line has
  // put down, in defeat order.
  const scalpsTitle = document.createElement("div")
  scalpsTitle.className = "hall-scalps-title"
  scalpsTitle.textContent = "Scalps"
  const scalpsList = document.createElement("ul")
  scalpsList.className = "hall-list"
  shell.box.append(scalpsTitle, scalpsList)
  return { ...shell, list, scalpsList }
}

/** Mirror live state into both ledgers. */
export function renderHall(view: HallView, state: GameState): void {
  // Hall of Fame: newest first.
  const records = [...state.lineage.hallOfFame].reverse()
  view.list.replaceChildren(
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
    view.list.append(empty)
  }
  // Scalps: the boss ledger, in defeat order, resolved through the
  // registry so the display can never drift from the boss roster.
  const scalps = state.bossDefeats
    .map((id) => BOSSES.find((boss) => boss.id === id))
    .filter((boss) => boss !== undefined)
  view.scalpsList.replaceChildren(
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
    view.scalpsList.append(empty)
  }
}
