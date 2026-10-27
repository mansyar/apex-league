import { ACTION_POINTS_PER_DAY } from "@apex/sim"
import { icons } from "../ui/icons"
import { meter, plate, tab } from "../ui/kit"

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
  const trophy = document.createElement("span")
  trophy.className = "score-trophy"
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
