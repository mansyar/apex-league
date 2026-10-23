/**
 * The cup results (cup_module_refactor_20261018 FR3): the results screen
 * assembly and the finalize hand-off to the sim. Relocated verbatim from
 * `createCup` — the copy and math live in view-models (resultsView), this
 * module only renders rows and flips the sim's phase.
 */
import { finalizeCup, leagueRewardPending } from "@apex/sim"
import type { CupShared } from "./shared"
import { resultsView } from "./view-models"

/** Create the results flow over the shared cup context. */
export function createResults(shared: CupShared): {
  showResults(): void
  conclude(): void
} {
  const { mem, handlers } = shared
  const {
    resultCard,
    resultStamp,
    resultTitle,
    resultSub,
    resultPlateTab,
    resultPlateLine,
    resultRewards,
  } = shared.results

  const showResults = (): void => {
    if (!mem.session || !mem.state) return
    const view = resultsView(
      mem.session,
      mem.state.ladder,
      mem.ladderBefore,
      mem.state.legendTitles,
      // The league rewards (FR-5): the grant reads as a reward row when an egg
      // is waiting in the nursery.
      leagueRewardPending(mem.state),
    )
    // The title follows the session's status, not the placement: a drawn
    // final (double-KO) crowns the player while placement rounds survive.
    resultTitle.textContent = view.title
    resultStamp.classList.toggle("lost", !view.won)
    resultSub.textContent = view.sub
    resultPlateTab.textContent = view.tab
    resultPlateLine.textContent = view.line
    resultRewards.replaceChildren()
    view.rows.forEach((text, i) => {
      const row = document.createElement("div")
      row.className = "cup-reward-row"
      row.textContent = text
      row.style.animationDelay = `${0.25 + i * 0.22}s`
      resultRewards.append(row)
    })
    // Restart the entrance animations.
    resultCard.classList.remove("play")
    void resultCard.offsetWidth
    resultCard.classList.add("play")
    shared.showScreen("results")
    // The results screen is the only place to act: put focus on its Back.
    shared.results.resultBack.focus()
  }

  /** The bracket fully played out: finalize the placement through the sim. */
  const conclude = (): void => {
    if (!mem.session || !mem.state) return
    const next = finalizeCup(mem.state, mem.session)
    mem.state = next
    handlers.onFinalize(next, mem.session)
    showResults()
  }

  return { showResults, conclude }
}
