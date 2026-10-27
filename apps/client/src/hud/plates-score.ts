import { ACTION_POINTS_PER_DAY, type GameState } from "@apex/sim"
import { icons } from "../ui/icons"
import { meter, plate, replay, tab } from "../ui/kit"
import { apPipPlan, climbAnnouncement, ladderRead } from "./ladder-read"

/** The score-bug elements the daily update writes into. */
export interface ScoreBugRefs {
  root: HTMLElement
  phaseTab: HTMLElement
  dayNum: HTMLElement
  apMeter: ReturnType<typeof meter>
  trophy: HTMLElement
  trophyCount: HTMLElement
  rank: HTMLElement
  rankRank: HTMLElement
  rankPts: HTMLElement
  rankTitles: HTMLElement
}

/**
 * Top-center score bug: phase tab, day, AP segmented meter, championship
 * tally, and the Bronze ladder standing (save v8). Pure DOM — values are
 * owned by createHud's update().
 */
export function buildScoreBug(): ScoreBugRefs {
  const root = plate({ className: "score-bug" })
  const phaseTab = tab("Day phase", "outline")
  const dayNum = document.createElement("span")
  dayNum.className = "score-day-num"
  const dayLabel = document.createElement("span")
  dayLabel.className = "score-day-label"
  dayLabel.textContent = "Day"
  const scoreDay = document.createElement("span")
  scoreDay.className = "score-day"
  scoreDay.append(dayLabel, dayNum)
  const divider = document.createElement("span")
  divider.className = "score-divider"
  const divider2 = divider.cloneNode() as HTMLElement
  const apLabel = document.createElement("span")
  apLabel.className = "score-ap-label"
  apLabel.textContent = "AP"
  const scoreAp = document.createElement("span")
  scoreAp.className = "score-ap"
  const apMeter = meter(0, ACTION_POINTS_PER_DAY)
  scoreAp.append(apLabel, apMeter.root)
  // Lifetime championships (save v5): one gold tally, no silent cap.
  // role="img": without it assistive tech ignores aria-label on a
  // generic span, so the painted count would never be announced.
  const trophy = document.createElement("span")
  trophy.className = "score-trophy"
  trophy.setAttribute("role", "img")
  trophy.title = "Cup championships"
  const trophyCount = document.createElement("span")
  trophyCount.className = "score-trophy-count"
  trophy.innerHTML = icons.trophy
  trophy.append(trophyCount)
  // Bronze ladder standing (save v8): sub-tier tab + points, mirroring
  // the trophy's one-segment-one-fact grammar.
  const divider3 = divider.cloneNode() as HTMLElement
  const rank = document.createElement("span")
  rank.className = "score-ladder"
  rank.title = "League standing"
  const rankRank = document.createElement("span")
  rankRank.className = "score-ladder-rank"
  const rankPts = document.createElement("span")
  rankPts.className = "score-ladder-pts"
  // Legend titles (save v14): a collected-titles tally that only shows on
  // the plateau — hidden for every other tier.
  const rankTitles = document.createElement("span")
  rankTitles.className = "score-ladder-titles"
  rankTitles.hidden = true
  rank.append(rankRank, rankPts, rankTitles)
  root.append(
    phaseTab,
    scoreDay,
    divider,
    scoreAp,
    divider2,
    trophy,
    divider3,
    rank,
  )
  return {
    root,
    phaseTab,
    dayNum,
    apMeter,
    trophy,
    trophyCount,
    rank,
    rankRank,
    rankPts,
    rankTitles,
  }
}

/**
 * The one-update bookkeeping the score-bug paint carries between paints:
 * the AP spend flash, the climb-announcement handoff the ticker consumes,
 * and the live pip element list.
 */
export interface ScoreBugPaint {
  prevAp: number | null
  prevLadder: GameState["ladder"] | null
  climbLine: string | null
  apPips: HTMLElement[]
}

/**
 * Paint the top-center score bug: phase tab, day, AP segmented meter,
 * championship tally, ladder standing, and the dock's advance label. The
 * climb announcement banks onto the paint state for the status line to
 * consume on the same update.
 */
export function paintScoreBug(
  bug: ScoreBugRefs,
  advanceLabel: HTMLElement | null,
  state: GameState,
  paint: ScoreBugPaint,
): void {
  const {
    phaseTab,
    dayNum,
    apMeter,
    trophy,
    trophyCount,
    rank,
    rankRank,
    rankPts,
    rankTitles,
  } = bug
  // Score bug: the phase tab flips to accent gold on cup day.
  const cupDay = state.phase === "cup"
  phaseTab.textContent = cupDay ? "Cup day" : "Day phase"
  phaseTab.className = cupDay ? "kit-tab" : "kit-tab is-outline"
  dayNum.textContent = String(state.day)

  // AP segmented meter. Cup bonus points extend past the daily max as
  // chevron-cut bonus pips; a fresh spend flashes the drained pip out.
  const { bonus, clamped, wantPips, flash } = apPipPlan(
    state.actionPoints,
    paint.prevAp,
  )
  if (paint.apPips.length !== wantPips) {
    const rebuilt = meter(clamped, ACTION_POINTS_PER_DAY, bonus)
    apMeter.root.replaceChildren(...rebuilt.pips)
    paint.apPips = rebuilt.pips
  }
  paint.apPips.forEach((pip, i) => {
    pip.classList.toggle("is-bonus", i >= ACTION_POINTS_PER_DAY)
    pip.classList.toggle("is-empty", i >= clamped)
    pip.classList.toggle("is-spent", i === flash)
  })
  paint.prevAp = state.actionPoints

  // Championship tally: designed overflow — "× N" scales to any count.
  // The count is visible text; the accessible name says what it counts
  // (FR-16), so the meaning never lives only in the tooltip.
  trophyCount.textContent = `× ${state.cupsWon}`
  trophy.style.display = state.cupsWon > 0 ? "" : "none"
  trophy.setAttribute("aria-label", `Cup championships: ${state.cupsWon}`)

  // Ladder standing (save v14): tier + sub-tier tab + points, matching
  // the trophy segment's one-fact-per-segment grammar. Below the top
  // sub-tier the read is progress-to-next; at the tier's top the points
  // are banked toward the next tier, so the raw total is the honest
  // number (Bronze I banks toward Silver, Silver I toward Gold, Gold I
  // toward the Legend gate). Legend titles ride along on the plateau.
  const ladder = state.ladder
  const read = ladderRead(ladder, state.legendTitles)
  rankRank.textContent = read.rank
  rank.classList.remove(
    "score-ladder--silver",
    "score-ladder--gold",
    "score-ladder--legend",
  )
  if (read.tierClass !== "bronze") {
    rank.classList.add(`score-ladder--${read.tierClass}`)
  }
  rankPts.textContent = read.points
  rankTitles.textContent = read.titles ?? ""
  rankTitles.hidden = read.titles === null
  rank.setAttribute("aria-label", read.ariaLabel)
  const announcement = climbAnnouncement(paint.prevLadder, ladder)
  if (announcement !== null) {
    paint.climbLine = announcement
    replay(rank, "chip-pop")
  }
  paint.prevLadder = ladder
  if (advanceLabel) {
    advanceLabel.textContent =
      state.phase === "cup" ? "Continue past cup" : "Advance Day"
  }
}
