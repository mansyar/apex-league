/**
 * Cup screen builders — the bracket board, coaching room, results card,
 * give-up modal and battle chrome, extracted from cup.ts so the session
 * state machine reads without scrolling through markup. Mirrors the
 * staging-fx.ts pattern: factories build DOM and return handles; cup.ts
 * owns all behavior (listeners that touch session state stay there).
 *
 * Pure structure — no session reads, no timers.
 */

import { BRACKET_SLOTS } from "@apex/sim"
import { focusTrap } from "./battleUI"
import { bracketPlan } from "./bracket-model"

type MatchId = string

/** One bracket card on the board. */
export interface MatchCard {
  el: HTMLElement
  ribbon: HTMLElement
  slots: { a: HTMLElement; b: HTMLElement }
  /** Grid column the card lives in (for the column-head reveal states). */
  column: "qf" | "sf" | "f"
}

/** The bracket screen's writable surfaces. */
export interface BracketScreenRefs {
  screen: HTMLElement
  headSub: HTMLElement
  colHeadEls: Record<"qf" | "sf" | "f", HTMLElement>
  cards: Map<MatchId, MatchCard>
  champ: HTMLElement
  champName: HTMLElement
  cta: HTMLElement
  ctaGhost: HTMLButtonElement
  ctaGo: HTMLButtonElement
  tickerLine: HTMLElement
}

/**
 * The bracket board: head, three reveal columns with the card plan laid
 * out from pure topology (bracket-model), the champion slot, the entry
 * CTA row and the Apex-feed ticker.
 */
export function buildBracketScreen(): BracketScreenRefs {
  const screen = document.createElement("div")
  screen.className = "cup-screen cup-screen-bracket"

  const head = document.createElement("div")
  head.className = "cup-head"
  const headTab = document.createElement("span")
  headTab.className = "cup-head-tab"
  headTab.textContent = "Cup day"
  const headTitle = document.createElement("span")
  headTitle.className = "cup-head-title"
  headTitle.textContent = "Bronze Cup"
  const headSub = document.createElement("span")
  headSub.className = "cup-head-sub"
  head.append(headTab, headTitle, headSub)

  const bracket = document.createElement("div")
  bracket.className = "cup-bracket"
  const cols: Record<"qf" | "sf" | "f", HTMLElement> = {
    qf: document.createElement("div"),
    sf: document.createElement("div"),
    f: document.createElement("div"),
  }
  for (const key of ["qf", "sf", "f"] as const) {
    const col = cols[key]
    col.className = `cup-col cup-col-${key}`
    const colHead = document.createElement("div")
    colHead.className = "cup-col-head"
    colHead.textContent =
      key === "qf" ? "Quarterfinals" : key === "sf" ? "Semifinals" : "Final"
    const matches = document.createElement("div")
    matches.className = "cup-matches"
    col.append(colHead, matches)
    bracket.append(col)
  }

  const cards = new Map<MatchId, MatchCard>()
  const colHeadEls: Record<"qf" | "sf" | "f", HTMLElement> = {
    qf: cols.qf.querySelector(".cup-col-head") as HTMLElement,
    sf: cols.sf.querySelector(".cup-col-head") as HTMLElement,
    f: cols.f.querySelector(".cup-col-head") as HTMLElement,
  }
  const matchBoxes: Record<"qf" | "sf" | "f", HTMLElement> = {
    qf: cols.qf.querySelector(".cup-matches") as HTMLElement,
    sf: cols.sf.querySelector(".cup-matches") as HTMLElement,
    f: cols.f.querySelector(".cup-matches") as HTMLElement,
  }
  // The card plan is pure topology (bracket-model): ids, columns, labels —
  // no session needed to build the board.
  for (const entry of bracketPlan(BRACKET_SLOTS)) {
    const col = entry.column
    const el = document.createElement("div")
    el.className = `cup-match m-${entry.id}`
    el.dataset.match = entry.id
    const ribbon = document.createElement("div")
    ribbon.className = "cup-ribbon"
    ribbon.textContent = "Your match"
    const slotA = document.createElement("div")
    slotA.className = "cup-slot slot-a"
    const slotB = document.createElement("div")
    slotB.className = "cup-slot slot-b"
    el.append(ribbon, slotA, slotB)
    matchBoxes[col].append(el)
    cards.set(entry.id, {
      el,
      ribbon,
      slots: { a: slotA, b: slotB },
      column: entry.column,
    })
  }

  const champ = document.createElement("div")
  champ.className = "cup-champ"
  const champCup = document.createElement("div")
  champCup.className = "cup-champ-cup"
  champCup.textContent = "🏆"
  const champLabel = document.createElement("div")
  champLabel.className = "cup-champ-label"
  champLabel.textContent = "Champion"
  const champName = document.createElement("div")
  champName.className = "cup-champ-name"
  champName.textContent = "—"
  champ.append(champCup, champLabel, champName)
  cols.f.append(champ)

  const cta = document.createElement("div")
  cta.className = "cup-cta"
  const ctaGhost = document.createElement("button")
  ctaGhost.type = "button"
  ctaGhost.className = "cup-cta-ghost"
  ctaGhost.textContent = "Scout the rival"
  const ctaGo = document.createElement("button")
  ctaGo.type = "button"
  ctaGo.className = "cup-cta-go"
  ctaGo.textContent = "Step into the arena"
  cta.append(ctaGhost, ctaGo)

  const ticker = document.createElement("div")
  ticker.className = "cup-ticker"
  const tickerTab = document.createElement("span")
  tickerTab.className = "cup-ticker-tab"
  tickerTab.textContent = "Apex feed"
  const tickerLine = document.createElement("span")
  tickerLine.className = "cup-ticker-line"
  ticker.append(tickerTab, tickerLine)

  screen.append(head, bracket, cta, ticker)
  return {
    screen,
    headSub,
    colHeadEls,
    cards,
    champ,
    champName,
    cta,
    ctaGhost,
    ctaGo,
    tickerLine,
  }
}

/** The coaching room's writable surfaces. */
export interface CoachScreenRefs {
  screen: HTMLElement
  coachTab: HTMLElement
  fighterCard: HTMLElement
  rivalCard: HTMLElement
  kitCard: HTMLElement
  coachNote: HTMLElement
  coachBack: HTMLButtonElement
  coachGo: HTMLButtonElement
}

/** The coaching room: fighter/rival/kit cards over a note + CTA foot. */
export function buildCoachScreen(): CoachScreenRefs {
  const screen = document.createElement("div")
  screen.className = "cup-screen cup-screen-coach"
  const coachHead = document.createElement("div")
  coachHead.className = "cup-head"
  const coachTab = document.createElement("span")
  coachTab.className = "cup-head-tab"
  const coachTitle = document.createElement("span")
  coachTitle.className = "cup-head-title"
  coachTitle.textContent = "Coaching room"
  coachHead.append(coachTab, coachTitle)
  const coachBody = document.createElement("div")
  coachBody.className = "cup-coach-body"

  const fighterCard = document.createElement("div")
  fighterCard.className = "cup-card cup-card-fighter"
  const rivalCard = document.createElement("div")
  rivalCard.className = "cup-card cup-card-rival"
  const kitCard = document.createElement("div")
  kitCard.className = "cup-card cup-card-kit"
  coachBody.append(fighterCard, rivalCard, kitCard)

  const coachFoot = document.createElement("div")
  coachFoot.className = "cup-coach-foot"
  const coachNote = document.createElement("div")
  coachNote.className = "cup-coach-note"
  coachNote.textContent = "Nothing is committed until you step in."
  const coachBack = document.createElement("button")
  coachBack.type = "button"
  coachBack.className = "cup-cta-ghost"
  coachBack.textContent = "Back to bracket"
  const coachGo = document.createElement("button")
  coachGo.type = "button"
  coachGo.className = "cup-cta-go"
  coachGo.textContent = "Step into the arena"
  coachFoot.append(coachNote, coachBack, coachGo)
  screen.append(coachHead, coachBody, coachFoot)
  return {
    screen,
    coachTab,
    fighterCard,
    rivalCard,
    kitCard,
    coachNote,
    coachBack,
    coachGo,
  }
}

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
  resultCard.className = "cup-result-card"
  const resultStamp = document.createElement("div")
  resultStamp.className = "cup-result-stamp"
  const resultTitle = document.createElement("div")
  resultTitle.className = "cup-result-title"
  const resultRule = document.createElement("div")
  resultRule.className = "cup-result-rule"
  const resultSub = document.createElement("div")
  resultSub.className = "cup-result-sub"
  const resultPlate = document.createElement("div")
  resultPlate.className = "cup-result-plate"
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

/** The give-up modal's interactive surfaces. */
export interface GiveupModalRefs {
  root: HTMLElement
  giveupStay: HTMLButtonElement
  giveupQuit: HTMLButtonElement
}

/**
 * Give-up modal (over the bracket): a deliberate two-step for a forfeit.
 * Dialog semantics + focus management: the scrim hides the bracket, so
 * Tab must cycle inside the card, and Escape bails out to Stay, handing
 * focus back to the bracket's close button (which owns the reopen).
 */
export function buildGiveupModal(close: HTMLElement): GiveupModalRefs {
  const root = document.createElement("div")
  root.className = "cup-giveup"
  root.style.display = "none"
  const giveupCard = document.createElement("div")
  giveupCard.className = "cup-giveup-card"
  const giveupTab = document.createElement("span")
  giveupTab.className = "cup-giveup-tab"
  giveupTab.textContent = "Forfeit"
  const giveupTitle = document.createElement("div")
  giveupTitle.className = "cup-giveup-title"
  giveupTitle.textContent = "Walk away?"
  const giveupCopy = document.createElement("div")
  giveupCopy.className = "cup-giveup-copy"
  giveupCopy.textContent =
    "Giving up counts as a loss in this round — your placement stands as if you lost it, and the consolation (+2 mood) still applies. No cup is won."
  const giveupRow = document.createElement("div")
  giveupRow.className = "cup-giveup-row"
  const giveupStay = document.createElement("button")
  giveupStay.type = "button"
  giveupStay.className = "cup-cta-ghost"
  giveupStay.textContent = "Stay in the bracket"
  const giveupQuit = document.createElement("button")
  giveupQuit.type = "button"
  giveupQuit.className = "cup-cta-go cup-cta-danger"
  giveupQuit.textContent = "Give up"
  giveupRow.append(giveupStay, giveupQuit)
  giveupCard.append(giveupTab, giveupTitle, giveupCopy, giveupRow)
  root.append(giveupCard)
  giveupCard.setAttribute("role", "dialog")
  giveupCard.setAttribute("aria-modal", "true")
  giveupTitle.id = "cup-giveup-title"
  giveupCard.setAttribute("aria-labelledby", "cup-giveup-title")
  const giveupTrap = focusTrap(giveupCard)
  root.addEventListener("keydown", (event) => {
    giveupTrap(event)
    if (event.key === "Escape") {
      root.style.display = "none"
      close.focus()
    }
  })
  return { root, giveupStay, giveupQuit }
}

/** The battle chrome: speed pill floating over the arena during a fight. */
export function buildBattleChips(): {
  battleChips: HTMLElement
  fastButton: HTMLButtonElement
} {
  const battleChips = document.createElement("div")
  battleChips.className = "cup-battle-chips"
  battleChips.style.display = "none"
  const fastButton = document.createElement("button")
  fastButton.type = "button"
  fastButton.className = "cup-speed"
  battleChips.append(fastButton)
  return { battleChips, fastButton }
}
