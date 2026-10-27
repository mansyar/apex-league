/**
 * The board surface's copy (FR-5, FR-6, AC-5).
 *
 * Every line is quiet information, never an alarm — the boards are a place
 * to look, not a warning that something broke. Pure constants and functions
 * so the wording stays testable without a DOM.
 */
import type { ScoreCategory } from "../cloud/api"

/** The boards in spec order (FR-5): cup wins, ladder, AP, collection. */
export const BOARD_CATEGORIES: readonly ScoreCategory[] = [
  "cups",
  "ladder",
  "ap",
  "collection",
]

/** The title of the board surface. */
export const BOARD_TITLE = "Leaderboards"

/** The chip that opens the boards. */
export const BOARD_CHIP_LABEL = "Boards"

/** What the surface says while the four boards load. */
export const BOARD_LOADING_COPY = "Checking the boards…"

/** One board's heading, in the same words the spec uses. */
export function boardCategoryLabel(category: ScoreCategory): string {
  switch (category) {
    case "cups":
      return "Cup wins"
    case "ladder":
      return "Ladder points"
    case "ap":
      return "Trainer AP"
    case "collection":
      return "Collection"
  }
}

/** A board with no entries says so in words, never a blank panel. */
export const BOARD_EMPTY_COPY =
  "Nobody is on this board yet — your next result puts you on it."

/**
 * The quiet offline note (AC-5): the last snapshot shows, and one sentence
 * says it is the last one. Never an error plate.
 */
export const BOARD_OFFLINE_COPY =
  "The cloud is out of reach — showing the last boards we saw."

/** No snapshot and no server: a calm line, not an alarm. */
export const BOARD_ERROR_COPY =
  "Can't reach the boards right now — take another look later."

/** The ghost board's heading: cup champions, kept for async rematches. */
export const GHOST_SECTION_TITLE = "Ghost rivals"

/** The badge every ghost row wears: this rival is a recording, not live. */
export const GHOST_BADGE_LABEL = "Ghost"

/** The per-row action: open a free spar bout against the champion. */
export const GHOST_FIGHT_LABEL = "Fight Ghost"

/** No champions recorded yet: words, never a blank section. */
export const GHOST_EMPTY_COPY =
  "No ghost rivals yet — cup champions appear here after they sync."

/**
 * The quiet stale note (AC-6): the last ghost board shows, and one sentence
 * says it is the last one. Never an error plate.
 */
export const GHOST_STALE_COPY =
  "The cloud is out of reach — showing the last ghost rivals we saw."

/** No snapshot and no server for the ghost board: a calm line, not an alarm. */
export const GHOST_ERROR_COPY =
  "Can't reach the ghost rivals right now — take another look later."

/**
 * A champion recorded under another simulator version stays listed but
 * unboutable (the version-skew edge): kept for the board, not for bouts.
 */
export const GHOST_VERSION_COPY =
  "Recorded on an older build — kept for the board, not for bouts."

/**
 * One ghost row's preview (FR-4): the champion's team name and the cup score
 * it was recorded at. A missing stamp reads as a bare final — the row still
 * lists, the preview just says less.
 */
export function ghostPreviewLine(
  champion: string,
  day: number | null,
  round: number | null,
): string {
  const parts = [champion]
  if (day !== null) parts.push(`day ${day}`)
  if (round !== null) parts.push(`round ${round}`)
  return parts.join(" · ")
}
