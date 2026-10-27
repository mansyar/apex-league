/**
 * The ghost board section (ghost_data_async_rivals FR-4, AC-4): cup
 * champions served by the ghost board, each with a ghost badge, a team/score
 * preview, and a Fight button for fightable rows. Version-skewed bundles
 * stay listed with a quiet note and no button; malformed ones list bare.
 * Empty, stale, and unreachable states all read as calm lines.
 */

import type { GhostBoardEntry } from "../cloud/api"
import type { GhostBoardLoad } from "../cloud/ghosts"
import { isVersionSkippedBundle, readGhostContender } from "../spar/ghost"
import {
  GHOST_BADGE_LABEL,
  GHOST_EMPTY_COPY,
  GHOST_ERROR_COPY,
  GHOST_FIGHT_LABEL,
  GHOST_SECTION_TITLE,
  GHOST_STALE_COPY,
  GHOST_VERSION_COPY,
  ghostPreviewLine,
} from "./copy"

function stampOf(bundle: unknown, key: string): number | null {
  if (typeof bundle !== "object" || bundle === null || Array.isArray(bundle)) {
    return null
  }
  const value = (bundle as Record<string, unknown>)[key]
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

function paintRow(
  list: HTMLElement,
  entry: GhostBoardEntry,
  onFight: (entry: GhostBoardEntry) => void,
): void {
  const row = document.createElement("li")
  row.className = "board-row board-ghost-row"

  const rank = document.createElement("span")
  rank.className = "board-rank"
  rank.textContent = String(entry.rank)

  const main = document.createElement("span")
  main.className = "board-ghost-main"

  const name = document.createElement("span")
  name.className = "board-ghost-name"
  name.textContent = entry.name

  const badge = document.createElement("span")
  badge.className = "kit-tab is-outline board-ghost-badge"
  badge.textContent = GHOST_BADGE_LABEL
  badge.setAttribute("aria-label", "Ghost rival")
  name.append(badge)
  main.append(name)

  const contender = readGhostContender(entry.ghost)
  if (contender !== null) {
    const preview = document.createElement("span")
    preview.className = "board-ghost-preview"
    preview.textContent = ghostPreviewLine(
      contender.name,
      stampOf(entry.ghost, "day"),
      stampOf(entry.ghost, "round"),
    )
    main.append(preview)

    const fight = document.createElement("button")
    fight.type = "button"
    fight.className = "board-fight"
    fight.textContent = GHOST_FIGHT_LABEL
    fight.addEventListener("click", () => onFight(entry))
    row.append(rank, main, fight)
  } else {
    if (isVersionSkippedBundle(entry.ghost)) {
      const note = document.createElement("span")
      note.className = "board-ghost-preview"
      note.textContent = GHOST_VERSION_COPY
      main.append(note)
    }
    row.append(rank, main)
  }

  list.append(row)
}

/**
 * The Ghost rivals section for the board modal. `paint` replaces the rows
 * wholesale on every board open, like the four score sections: live and
 * snapshot kinds list in served order, unavailable reads as a calm line,
 * and an empty board reads as words, never a blank section.
 */
export function buildGhostSection(onFight: (entry: GhostBoardEntry) => void): {
  element: HTMLElement
  paint(result: GhostBoardLoad): void
} {
  const section = document.createElement("section")
  section.className = "board-category board-ghosts"

  const heading = document.createElement("h3")
  heading.className = "board-category-title"
  heading.textContent = GHOST_SECTION_TITLE

  const status = document.createElement("p")
  status.className = "board-status board-ghost-status"
  status.style.display = "none"

  const list = document.createElement("ul")
  list.className = "board-list"

  const empty = document.createElement("p")
  empty.className = "board-empty"
  empty.style.display = "none"

  section.append(heading, status, list, empty)

  function paint(result: GhostBoardLoad): void {
    list.replaceChildren()
    if (result.kind === "unavailable") {
      status.style.display = ""
      status.textContent = GHOST_ERROR_COPY
      empty.style.display = "none"
      return
    }
    status.style.display = result.kind === "snapshot" ? "" : "none"
    status.textContent = result.kind === "snapshot" ? GHOST_STALE_COPY : ""
    for (const entry of result.entries) paintRow(list, entry, onFight)
    empty.style.display = result.entries.length === 0 ? "" : "none"
    empty.textContent = GHOST_EMPTY_COPY
  }

  return { element: section, paint }
}
