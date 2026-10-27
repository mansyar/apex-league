/**
 * The results card (cup_modules_per_screen split): verdict stamp, placement
 * plate, rewards, exit CTA. Moved verbatim from cup-screens.ts.
 */

/** The results card's writable surfaces. */
export interface ResultsScreenRefs {
  screen: HTMLElement
  resultCard: HTMLElement
  resultStamp: HTMLElement
  resultTitle: HTMLElement
  resultRule: HTMLElement
  resultSub: HTMLElement
  resultPlateTab: HTMLElement
  resultPlateLine: HTMLElement
  resultRewards: HTMLElement
  resultBack: HTMLButtonElement
}

/** The results card: verdict stamp, placement plate, rewards, exit CTA. */
export function buildResultsScreen(): ResultsScreenRefs {
  const screen = document.createElement("div")
  screen.className = "cup-screen cup-screen-results"
  const resultCard = document.createElement("div")
  resultCard.className = "cup-result-card kit-surface"
  const resultStamp = document.createElement("div")
  resultStamp.className = "cup-result-stamp"
  const resultTitle = document.createElement("div")
  resultTitle.className = "cup-result-title"
  const resultRule = document.createElement("div")
  resultRule.className = "cup-result-rule"
  const resultSub = document.createElement("div")
  resultSub.className = "cup-result-sub"
  const resultPlate = document.createElement("div")
  resultPlate.className = "cup-result-plate kit-line"
  const resultPlateTab = document.createElement("span")
  resultPlateTab.className = "cup-result-tab"
  const resultPlateLine = document.createElement("span")
  resultPlateLine.className = "cup-result-line"
  resultPlate.append(resultPlateTab, resultPlateLine)
  const resultRewards = document.createElement("div")
  resultRewards.className = "cup-result-rewards"
  const resultBack = document.createElement("button")
  resultBack.type = "button"
  resultBack.className = "cup-cta-go"
  resultBack.textContent = "Back to the ranch"
  resultCard.append(
    resultStamp,
    resultTitle,
    resultRule,
    resultSub,
    resultPlate,
    resultRewards,
    resultBack,
  )
  screen.append(resultCard)
  return {
    screen,
    resultCard,
    resultStamp,
    resultTitle,
    resultRule,
    resultSub,
    resultPlateTab,
    resultPlateLine,
    resultRewards,
    resultBack,
  }
}
