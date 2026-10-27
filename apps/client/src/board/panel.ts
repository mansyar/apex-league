/**
 * The board surface (FR-5, FR-6, AC-4, AC-5): one quiet chip beside Cloud and
 * one modal behind it with all four boards — rank, name and value per row,
 * the served rank rendered verbatim, ties included.
 *
 * The modal fetches on every open and paints what comes back: live boards
 * from the server, the last snapshot with a quiet offline note when the
 * server is out of reach, or a calm error line when no snapshot was ever
 * written. Nothing here throws and nothing here touches the save.
 */
import type { BoardEntry, GhostBoardEntry } from "../cloud/api"
import type { GhostBoardLoad } from "../cloud/ghosts"
import { chip } from "../ui/kit"
import { closeModal, openModal } from "../ui/modal"
import {
  BOARD_CATEGORIES,
  BOARD_CHIP_LABEL,
  BOARD_EMPTY_COPY,
  BOARD_ERROR_COPY,
  BOARD_LOADING_COPY,
  BOARD_TITLE,
  boardCategoryLabel,
  boardOfflineLine,
} from "./copy"
import type { BoardLoad } from "./fetch"
import { buildGhostSection } from "./ghost-section"
import type { CategoryBoards } from "./snapshot"

export interface BoardPanel {
  /** The modal root — append once. Starts hidden. */
  root: HTMLElement
  /** The chip that opens it — append into the HUD's chip cluster. */
  chip: HTMLButtonElement
  open: () => void
  close: () => void
}

interface CategorySection {
  list: HTMLElement
  empty: HTMLElement
}

/** One ranked row: the served rank, name and value, in that order. */
function boardRow(entry: BoardEntry): HTMLElement {
  const item = document.createElement("li")
  item.className = "board-row"
  const rank = document.createElement("span")
  rank.className = "board-rank"
  // The rank is the server's, verbatim — ties already share one.
  rank.textContent = String(entry.rank)
  const name = document.createElement("span")
  name.className = "board-name"
  name.textContent = entry.name
  const value = document.createElement("span")
  value.className = "board-value"
  value.textContent = String(entry.value)
  item.append(rank, name, value)
  return item
}

export function buildBoardPanel(opts: {
  load: () => Promise<BoardLoad>
  /**
   * The ghost board behind the same modal (FR-4): champions with badge,
   * preview, and Fight. Absent without a cloud — the four score boards
   * stand alone, and the fight callback closes the modal when the bout
   * opens (true) so the player lands in the spar.
   */
  ghosts?: {
    load: () => Promise<GhostBoardLoad>
    onFight: (entry: GhostBoardEntry) => boolean
  }
}): BoardPanel {
  const { load } = opts
  const ghostSource = opts.ghosts ?? null
  // `close` is a hoisted declaration below: the Fight callback only runs
  // after the build, so closing from here is safe.
  const ghost = ghostSource
    ? buildGhostSection((entry) => {
        if (ghostSource.onFight(entry)) close()
      })
    : null

  const root = document.createElement("div")
  root.className = "kit-modal board-modal"
  root.classList.add("is-hidden")
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", BOARD_TITLE)

  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box board-box"

  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  title.textContent = BOARD_TITLE

  const status = document.createElement("p")
  status.className = "board-status"
  status.setAttribute("role", "status")

  box.append(title, status)

  const sections: CategorySection[] = []
  for (const category of BOARD_CATEGORIES) {
    const section = document.createElement("section")
    section.className = "board-category"
    const head = document.createElement("h3")
    head.className = "board-category-title"
    head.textContent = boardCategoryLabel(category)
    const list = document.createElement("ul")
    list.className = "board-list"
    const empty = document.createElement("p")
    empty.className = "board-empty"
    empty.textContent = BOARD_EMPTY_COPY
    section.append(head, list, empty)
    box.append(section)
    sections.push({ list, empty })
  }
  // The ghost board rides the same modal, last: badge, preview, and Fight
  // per champion. Without a cloud the score boards stand alone.
  if (ghost) box.append(ghost.element)

  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const closeButton = document.createElement("button")
  closeButton.className = "kit-button"
  closeButton.type = "button"
  closeButton.textContent = "Back to the ranch"
  actions.append(closeButton)
  box.append(actions)
  root.append(box)

  const chipEl = chip({
    label: BOARD_CHIP_LABEL,
    variant: "dim",
    onClick: () => open(),
  })
  chipEl.classList.add("boards-chip")
  chipEl.title = BOARD_TITLE

  // Open generations: a slow fetch from a closed visit never repaints.
  let generation = 0

  function paintBoards(boards: CategoryBoards): void {
    BOARD_CATEGORIES.forEach((category, index) => {
      const section = sections[index]
      if (!section) return
      const entries = boards[category]
      section.list.replaceChildren(...entries.map(boardRow))
      section.empty.hidden = entries.length > 0
    })
  }

  function paint(result: BoardLoad): void {
    if (result.kind === "unavailable") {
      for (const section of sections) {
        section.list.replaceChildren()
        section.empty.hidden = true
      }
      status.textContent = BOARD_ERROR_COPY
      return
    }
    paintBoards(result.boards)
    // A snapshot says it is a snapshot and how stale (FR-12): the boards
    // are the last ones seen, and the age rides in the same sentence.
    status.textContent =
      result.kind === "snapshot"
        ? boardOfflineLine(result.fetchedAt, Date.now())
        : ""
  }

  function open(): void {
    // Closing bumps the generation too, via the helper's onClose below, so
    // a slow fetch from a dismissed visit never repaints.
    openModal(root, {
      box,
      initialFocus: closeButton,
      onClose: () => {
        generation += 1
      },
    })
    for (const section of sections) {
      section.list.replaceChildren()
      section.empty.hidden = true
    }
    status.textContent = BOARD_LOADING_COPY
    generation += 1
    const seen = generation
    void load().then((result) => {
      if (seen !== generation) return
      paint(result)
    })
    // The ghost board fetches beside the scores under the same generation
    // guard: a slow answer from a closed visit never repaints.
    if (ghost && ghostSource) {
      void ghostSource.load().then((result) => {
        if (seen !== generation) return
        ghost.paint(result)
      })
    }
  }

  function close(): void {
    closeModal(root)
  }

  closeButton.addEventListener("click", close)

  return { root, chip: chipEl, open, close }
}
