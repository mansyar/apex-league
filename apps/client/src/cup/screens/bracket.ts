/**
 * The bracket board (cup_modules_per_screen split): head, three reveal
 * columns, the champion slot, the entry CTA row and the Apex-feed ticker.
 * Moved verbatim from cup-screens.ts; pure structure, no session reads.
 */

import { BRACKET_SLOTS } from "@apex/sim"
import { bracketPlan } from "../../bracket-model"

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
  headTitle: HTMLElement
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
    el.className = `cup-match kit-surface m-${entry.id}`
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
  ctaGhost.className = "cup-cta-ghost kit-line"
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
  tickerLine.className = "cup-ticker-line kit-surface"
  ticker.append(tickerTab, tickerLine)

  screen.append(head, bracket, cta, ticker)
  return {
    screen,
    headTitle,
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
