/**
 * The live cup (live-cup spec): entering the cup opens a bracket view —
 * rival matches pre-resolve at entry and reveal in strict tournament
 * order, while the player's branch resolves LIVE at fight time with the
 * coach's kit and tactic picks. The cup is consumed (phase → day) only
 * when the player steps into the arena for the first time; before that,
 * closing is a free look. A give-up after the commit forfeits the current
 * round; a loss auto-completes the bracket to a champion; the results
 * screen finalizes rewards through the sim.
 *
 * Broadcast voice (product guidelines): short, punchy, present tense.
 */

import {
  ACTION_POINTS_PER_DAY,
  type BattleResult,
  type Creature,
  CUP_REWARDS,
  type CupSession,
  type CupSlot,
  completeCup,
  cupPlacement,
  defaultLoadout,
  effectiveStats,
  endCup,
  finalizeCup,
  forfeitCup,
  type GameState,
  getMove,
  getSpecies,
  isCupDay,
  type PlaybackStep,
  prepareCup,
  type RoundVerdict,
  resolvePlayerMatch,
  type Tactic,
} from "@apex/sim"
import { createBattleHud } from "./battleHud"
import {
  buildKitPicker,
  buildTacticRow,
  castFighter,
  focusTrap,
  reasonLine,
  renderSpeedButton,
  toggleKitChoice,
  winningSideKey,
} from "./battleUI"
import { crestGlyph, elementHue } from "./element"
import { prefersReducedMotionOs } from "./motion"
import { createPlaybackDriver, type PlaybackFight } from "./playbackDriver"
import type { FightCasting } from "./staging"
import { visualSeedOf } from "./staging-seed"
import { icons } from "./ui/icons"

export interface CupHandlers {
  /** A player match starts: dissolve into the arena and cast both. */
  onFightStart: (casting: FightCasting) => void
  /** Every playback step steps the arena staging. */
  onStep: (step: PlaybackStep, instant: boolean) => void
  /** The arena scales action animations to the playback pace. */
  onPace: (msPerStep: number) => void
  /** The arena match ended; the bracket takes over again. */
  onArenaExit: () => void
  /**
   * The first coach commit consumed the cup (endCup flipped the phase to
   * "day"): persist the returned state so the entry is durable.
   */
  onCommit: (state: GameState) => void
  /**
   * The cup concluded (champion, loss, or forfeit): the placement is
   * final and the rewards are applied - persist the returned state.
   */
  onFinalize: (state: GameState, session: CupSession) => void
  /**
   * The live session changed (prepared, advanced, forfeited, or cleared):
   * persist it so a refresh anywhere in the walk resumes exactly here.
   * Optional — callers without session persistence may omit it.
   */
  onSession?: (session: CupSession | null) => void
}

export interface Cup {
  /** Sync the chip and live state with the current sim state. */
  update(state: GameState): void
}

/** The strict reveal plan, in true tournament order. */
type MatchId = "qf1" | "qf2" | "qf3" | "qf4" | "sf1" | "sf2" | "f1"

const PLAN: ReadonlyArray<{ id: MatchId; label: string }> = [
  { id: "qf1", label: "Quarterfinal" },
  { id: "qf2", label: "Quarterfinal" },
  { id: "qf3", label: "Quarterfinal" },
  { id: "qf4", label: "Quarterfinal" },
  { id: "sf1", label: "Semifinal" },
  { id: "sf2", label: "Semifinal" },
  { id: "f1", label: "Final" },
]

/** Column of a match id, for the bracket grid + clip-path language. */
const columnOf = (id: MatchId): "qf" | "sf" | "f" =>
  id === "qf1" || id === "qf2" || id === "qf3" || id === "qf4"
    ? "qf"
    : id === "sf1" || id === "sf2"
      ? "sf"
      : "f"

/** Pacing beats for the bracket walk (ms). */
const WALK_SETTLE = 600
const WALK_STAGGER = 700
const WALK_STEP = 500
const WALK_CROWN = 1800
const STAMP_HOLD = 2200
const STAMP_HOLD_REDUCED = 900

export function createCup(
  root: HTMLElement,
  handlers: CupHandlers,
  options?: {
    /**
     * A session restored from the save (save v7): the bracket walk resumes
     * exactly where it stopped — no fresh entry, no re-resolution.
     */
    restoredSession?: CupSession | null
  },
): Cup {
  // The Enter Cup chip sits beside the Spar chip (top-right cluster).
  // Kit chip with the broadcast title/sub stack, matching Spar.
  const cupButton = document.createElement("button")
  cupButton.className = "cup-button kit-chip"
  cupButton.type = "button"
  const cupGlyph = document.createElement("span")
  cupGlyph.className = "kit-chip-glyph"
  cupGlyph.innerHTML = icons.trophy
  const cupText = document.createElement("span")
  cupText.className = "spar-text"
  const cupLabel = document.createElement("span")
  cupLabel.className = "spar-title"
  cupLabel.textContent = "Enter Cup"
  const cupHint = document.createElement("span")
  cupHint.className = "spar-sub"
  cupHint.textContent = "Cup day · free"
  cupText.append(cupLabel, cupHint)
  cupButton.append(cupGlyph, cupText)
  root.append(cupButton)

  // Full-screen overlay, hidden until entry.
  const overlay = document.createElement("div")
  overlay.className = "cup-overlay"
  overlay.style.display = "none"

  // Broadcast backdrop: the navy dome from the approved mock owns the
  // screen while a cup screen is up; it steps aside for arena battles.
  const backdrop = document.createElement("div")
  backdrop.className = "cup-backdrop"
  overlay.append(backdrop)

  const battleHud = createBattleHud(overlay)

  // ------------------------------------------------------------------
  // Bracket screen
  // ------------------------------------------------------------------
  const bracketScreen = document.createElement("div")
  bracketScreen.className = "cup-screen cup-screen-bracket"

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

  interface MatchCard {
    el: HTMLElement
    ribbon: HTMLElement
    slots: { a: HTMLElement; b: HTMLElement }
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
  for (const entry of PLAN) {
    const col = columnOf(entry.id)
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
    cards.set(entry.id, { el, ribbon, slots: { a: slotA, b: slotB } })
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

  bracketScreen.append(head, bracket, cta, ticker)

  // ------------------------------------------------------------------
  // Coach screen
  // ------------------------------------------------------------------
  const coachScreen = document.createElement("div")
  coachScreen.className = "cup-screen cup-screen-coach"
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
  coachScreen.append(coachHead, coachBody, coachFoot)

  // ------------------------------------------------------------------
  // Give-up modal (over the bracket)
  // ------------------------------------------------------------------
  const giveup = document.createElement("div")
  giveup.className = "cup-giveup"
  giveup.style.display = "none"
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
  giveup.append(giveupCard)
  // Dialog semantics + focus management (a11y): the scrim hides the
  // bracket, so Tab must cycle inside the card, Escape must bail out to
  // Stay, and closing hands focus back to the control that opened it.
  giveupCard.setAttribute("role", "dialog")
  giveupCard.setAttribute("aria-modal", "true")
  giveupTitle.id = "cup-giveup-title"
  giveupCard.setAttribute("aria-labelledby", "cup-giveup-title")
  const giveupTrap = focusTrap(giveupCard)
  giveup.addEventListener("keydown", (event) => {
    giveupTrap(event)
    if (event.key === "Escape") {
      giveup.style.display = "none"
      close.focus()
    }
  })

  // ------------------------------------------------------------------
  // Results screen
  // ------------------------------------------------------------------
  const resultsScreen = document.createElement("div")
  resultsScreen.className = "cup-screen cup-screen-results"
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
  resultsScreen.append(resultCard)

  // Battle chrome: speed pill floats over the arena during a fight.
  const battleChips = document.createElement("div")
  battleChips.className = "cup-battle-chips"
  battleChips.style.display = "none"
  const fastButton = document.createElement("button")
  fastButton.type = "button"
  fastButton.className = "cup-speed"
  renderSpeedButton(fastButton, "paced")
  battleChips.append(fastButton)
  overlay.append(bracketScreen, coachScreen, resultsScreen, giveup, battleChips)
  root.append(overlay)

  // ------------------------------------------------------------------
  // Session state
  // ------------------------------------------------------------------
  let state: GameState | null = null
  let session: CupSession | null = options?.restoredSession ?? null
  // Ladder snapshot at cup entry (save v8): the results screen diffs the
  // post-finalize standing against it to report what the run earned.
  let ladderBefore: GameState["ladder"] | null = null
  /** The cup is consumed (endCup applied) — set at the first coach commit. */
  let committed = false
  /** Reveal cursor into PLAN. */
  let cursor = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let inBattle = false
  /** The match id currently waiting for the player (CTA shown). */
  let pendingId: MatchId | null = null
  /** The coach's working picks for the pending match. */
  let picks: { loadout: string[]; tactic: Tactic } | null = null
  /** The fight currently in the arena (stamp wording + cleanup). */
  let fightNow: PlaybackFight | null = null

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const reducedMotion = (): boolean =>
    state?.settings.reducedMotion === true || prefersReducedMotionOs()

  const beat = (ms: number): number => (reducedMotion() ? 0 : ms)

  const setLine = (text: string): void => {
    tickerLine.textContent = text
    // Restart the swap animation for each new line.
    tickerLine.classList.remove("swap")
    void tickerLine.offsetWidth
    tickerLine.classList.add("swap")
  }

  const showScreen = (name: "bracket" | "coach" | "results" | null): void => {
    bracketScreen.style.display = name === "bracket" ? "" : "none"
    coachScreen.style.display = name === "coach" ? "" : "none"
    resultsScreen.style.display = name === "results" ? "" : "none"
    // The global close belongs to the bracket only; the coach and the
    // results have their own exits.
    close.style.display = name === "bracket" ? "" : "none"
  }

  // ------------------------------------------------------------------
  // Session views: verdicts, winners, match slots
  // ------------------------------------------------------------------
  const playerName = (): string => session?.bracket.slots[0]?.name ?? ""

  const verdictOf = (id: MatchId): RoundVerdict | null => {
    if (!session) return null
    const pv = session.playerVerdicts
    const rv = session.rivalVerdicts
    const cv = session.completionVerdicts
    switch (id) {
      case "qf1":
        return pv[0] ?? null
      case "qf2":
        return rv[0] ?? null
      case "qf3":
        return rv[1] ?? null
      case "qf4":
        return rv[2] ?? null
      case "sf1":
        if (pv[1]) return pv[1]
        // Eliminated (or forfeited) in the QF: SF1 is a completion match.
        return pv.length === 1 ? (cv[0] ?? null) : null
      case "sf2":
        return rv[3] ?? null
      case "f1":
        if (pv[2]) return pv[2]
        if (session.status !== "player-turn") {
          const last = cv[cv.length - 1]
          return last ?? null
        }
        return null
    }
  }

  /** Is this match the player's own fight (given the current session)? */
  const isPlayerMatch = (id: MatchId): boolean => {
    if (!session) return false
    const me = playerName()
    if (id === "qf1") return true
    if (id === "sf1") {
      const qf1 = session.playerVerdicts[0]
      return qf1 !== undefined && qf1.winner === me
    }
    if (id === "f1") {
      const sf1 = verdictOf("sf1")
      return sf1 !== null && sf1.winner === me
    }
    return false
  }

  const winnerNameOf = (id: MatchId): string | null =>
    verdictOf(id)?.winner ?? null

  const slotOf = (name: string | null): CupSlot | null => {
    if (!session || name === null) return null
    return session.bracket.slots.find((s) => s.name === name) ?? null
  }

  const slotsOf = (id: MatchId): { a: CupSlot | null; b: CupSlot | null } => {
    if (!session) return { a: null, b: null }
    const s = session.bracket.slots
    switch (id) {
      case "qf1":
        return { a: s[0] ?? null, b: s[1] ?? null }
      case "qf2":
        return { a: s[2] ?? null, b: s[3] ?? null }
      case "qf3":
        return { a: s[4] ?? null, b: s[5] ?? null }
      case "qf4":
        return { a: s[6] ?? null, b: s[7] ?? null }
      case "sf1":
        return {
          a: slotOf(winnerNameOf("qf1")),
          b: slotOf(winnerNameOf("qf2")),
        }
      case "sf2":
        return {
          a: slotOf(winnerNameOf("qf3")),
          b: slotOf(winnerNameOf("qf4")),
        }
      case "f1":
        return {
          a: slotOf(winnerNameOf("sf1")),
          b: slotOf(winnerNameOf("sf2")),
        }
    }
  }

  // ------------------------------------------------------------------
  // Bracket rendering
  // ------------------------------------------------------------------
  const crest = (element: string): string => crestGlyph(element)

  /** Element hues: ui/element.ts re-derives from the sim's canonical
   * ELEMENT_HUE contract (single source of truth next to the matchup math). */
  const hueColor = (element: string): string =>
    `hsl(${elementHue(element)} 70% 60%)`

  const speciesElement = (speciesId: string): string =>
    getSpecies(speciesId)?.element ?? "fire"

  const fillSlot = (el: HTMLElement, slot: CupSlot | null): void => {
    el.replaceChildren()
    if (!slot) {
      el.classList.add("tbd")
      const dash = document.createElement("span")
      dash.className = "cup-dash"
      dash.textContent = "— — —"
      el.append(dash)
      return
    }
    el.classList.remove("tbd")
    const element = speciesElement(slot.speciesId)
    const ic = document.createElement("span")
    ic.className = "cup-mini-crest"
    ic.style.color = hueColor(element)
    ic.innerHTML = crest(element)
    const name = document.createElement("span")
    name.className = "cup-s-name"
    name.textContent = slot.name
    el.append(ic, name)
    if (slot.isPlayer) {
      const tag = document.createElement("span")
      tag.className = "cup-you-tag"
      tag.textContent = "You"
      el.append(tag)
    }
  }

  /** Fill both slots of a card; stamps winner/loser when a verdict exists. */
  const renderMatch = (id: MatchId): void => {
    const card = cards.get(id)
    if (!card) return
    const { a, b } = slotsOf(id)
    fillSlot(card.slots.a, a)
    fillSlot(card.slots.b, b)
    const v = verdictOf(id)
    card.el.classList.toggle("resolved", v !== null)
    if (v) stampWinner(id, v)
  }

  /** Gold winner, struck-out loser, ribbon down. */
  const stampWinner = (id: MatchId, verdict: RoundVerdict): void => {
    const card = cards.get(id)
    if (!card) return
    card.el.classList.add("resolved")
    card.el.classList.remove("yours")
    card.ribbon.classList.remove("show")
    const { a, b } = slotsOf(id)
    card.slots.a.classList.toggle("won", a?.name === verdict.winner)
    card.slots.a.classList.toggle(
      "lost",
      a !== null && a.name !== verdict.winner,
    )
    card.slots.b.classList.toggle("won", b?.name === verdict.winner)
    card.slots.b.classList.toggle(
      "lost",
      b !== null && b.name !== verdict.winner,
    )
  }

  // ------------------------------------------------------------------
  // The reveal walk
  // ------------------------------------------------------------------
  const ctaShow = (): void => cta.classList.add("show")
  const ctaHide = (): void => cta.classList.remove("show")

  const walk = (): void => {
    clearTimer()
    ctaHide()
    const entry = PLAN[cursor]
    if (!entry) {
      conclude()
      return
    }
    const card = cards.get(entry.id)
    if (!card) return
    renderMatch(entry.id)
    card.el.classList.add("in")
    colHeadEls[columnOf(entry.id)].classList.add("in")

    const v = verdictOf(entry.id)
    if (isPlayerMatch(entry.id) && !v) {
      // The player's match: highlight, CTA, and pause the walk.
      pendingId = entry.id
      card.el.classList.add("yours")
      card.ribbon.classList.add("show")
      setLine(`Your ${entry.label.toLowerCase()}. The coaching room is open.`)
      ctaShow()
      return
    }
    pendingId = null
    if (!v) return // defensive: nothing resolved to show
    setLine(v.line)
    const advance = (): void => {
      stampWinner(entry.id, v)
      if (entry.id === "f1") {
        crown()
        clearTimer()
        timer = setTimeout(conclude, beat(WALK_CROWN))
        return
      }
      cursor += 1
      timer = setTimeout(walk, beat(WALK_STEP))
    }
    // Rival verdicts land one beat after the names appear (staggered reveal).
    timer = setTimeout(advance, beat(WALK_STAGGER))
  }

  const crown = (): void => {
    const name = session?.championName ?? null
    if (!name) return
    champName.textContent = name
    champ.classList.add("crowned")
  }

  // ------------------------------------------------------------------
  // Results screen
  // ------------------------------------------------------------------
  const showResults = (): void => {
    if (!session || !state) return
    const placement = cupPlacement(session)
    // The title follows the session's status, not the placement: a drawn
    // final (double-KO) crowns the player while placement rounds survive.
    const won = session.status === "champion"
    resultTitle.textContent = won ? "Champion" : "Eliminated"
    resultStamp.classList.toggle("lost", !won)
    resultSub.textContent = won
      ? `${playerName()} takes the Bronze Cup!`
      : session.championName
        ? `${session.championName} takes the Bronze Cup.`
        : "The cup ends without a champion."
    resultPlateTab.textContent =
      placement === 1
        ? "1st"
        : `${placement}${placement === 2 ? "nd" : placement === 3 ? "rd" : "th"}`
    resultPlateLine.textContent = won
      ? `${playerName()} · unbeaten through three rounds`
      : `${playerName()} · out in the ${
          placement === 2
            ? "final"
            : placement === 3
              ? "semifinal"
              : "quarterfinal"
        }`
    resultRewards.replaceChildren()
    let ladderRow: string
    if (ladderBefore === null) {
      // Resumed walk without a snapshot: report the standing as-is.
      ladderRow = `Ladder: Bronze ${state.ladder.subTier} · ${state.ladder.points} pts`
    } else {
      // A forfeit zeroes the run's points (bronze ladder): say so plainly
      // instead of the neutral "unchanged".
      const lastVerdict = session.playerVerdicts.at(-1)
      const forfeited = lastVerdict !== undefined && lastVerdict.battle === null
      const earned = state.ladder.points - ladderBefore.points
      ladderRow =
        earned > 0
          ? state.ladder.subTier !== ladderBefore.subTier
            ? `Ladder +${earned} — promoted to Bronze ${state.ladder.subTier}`
            : `Ladder +${earned} · Bronze ${state.ladder.subTier}`
          : forfeited
            ? "Forfeit — no ladder points"
            : "Ladder unchanged"
    }
    const rows = won
      ? [
          `+1 action point tomorrow (${ACTION_POINTS_PER_DAY + 1} total)`,
          `Bond +${CUP_REWARDS.bond}`,
          `Mood +${CUP_REWARDS.mood}`,
          "🏆 Cup won",
          ladderRow,
        ]
      : [`Consolation: mood +${CUP_REWARDS.consolations.mood}`, ladderRow]
    rows.forEach((text, i) => {
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
    showScreen("results")
  }

  /** The bracket fully played out: finalize the placement through the sim. */
  const conclude = (): void => {
    if (!session || !state) return
    const next = finalizeCup(state, session)
    state = next
    handlers.onFinalize(next, session)
    showResults()
  }

  // ------------------------------------------------------------------
  // Arena battle (player matches)
  // ------------------------------------------------------------------
  const driver = createPlaybackDriver({
    onStep: (step, instant) => {
      handlers.onStep(step, instant)
      battleHud.update(step)
    },
    onLine: setLine,
    onFinish: ({ verdict, instant }) => {
      if (!fightNow) return
      battleHud.stamp(stampTitle(verdict, fightNow), reasonLine(verdict))
      fastButton.style.display = "none"
      battleChips.style.display = "none"
      // Hold the stamp, then back to the bracket. The cursor stays on the
      // match just fought: the walk re-stamps it on the bracket, then
      // continues with the rival reveals.
      clearTimer()
      timer = setTimeout(
        () => {
          timer = null
          inBattle = false
          fightNow = null
          handlers.onArenaExit()
          battleHud.hide()
          overlay.classList.remove("cup-battling")
          showScreen("bracket")
          // A loss auto-completes the rival bracket to a champion.
          if (session && session.status === "eliminated") {
            session = completeCup(session)
            handlers.onSession?.(session)
          }
          walk()
        },
        instant ? STAMP_HOLD_REDUCED : STAMP_HOLD,
      )
    },
    onPace: (msPerStep) => handlers.onPace(msPerStep),
    motionPref: () => state?.settings.reducedMotion === true,
  })

  /** Stamp wording: side-qualified for mirror matches. */
  const stampTitle = (verdict: BattleResult, fight: PlaybackFight): string => {
    if (verdict.winner === null) return "A draw"
    if (fight.owned.name !== fight.rival.name) {
      return verdict.winner === fight.owned.name ? "Victory" : "Defeat"
    }
    // Mirror match: qualify by side (the sim reports under stable keys).
    return winningSideKey(verdict) === fight.owned.key
      ? "Victory - your fighter"
      : "Defeat - the rival"
  }

  const castingFor = (creature: Creature, opponent: CupSlot): FightCasting => {
    return {
      owned: castFighter({
        speciesId: creature.speciesId,
        name: creature.name,
        // Stage-aware: a juvenile's boosted stats must fold back to the
        // creation seed, or the cup arena re-rolls the partner's DNA.
        seed: visualSeedOf(creature.stats, creature.stage),
        context: "the cup match",
      }),
      rival: castFighter({
        speciesId: opponent.speciesId,
        name: opponent.name,
        // Rivals carry no stage in the sim - the stats-only seed keeps
        // their look stable for the whole bracket.
        seed: visualSeedOf(opponent.stats),
        context: "the cup match",
      }),
    }
  }

  const fight = (): void => {
    if (!state?.creature || !session || !pendingId || !picks) return
    const opponent = session.nextOpponent
    if (!opponent) return
    // The commit moment (spec): the FIRST step into the arena consumes
    // the cup — the phase flips to "day", so no second entry is possible.
    if (!committed) {
      const consumed = endCup(state)
      if (consumed.ok) {
        committed = true
        state = consumed.state
        handlers.onCommit(consumed.state)
      }
    }
    const creature = state.creature
    if (!creature) return
    const resolved = resolvePlayerMatch(session, picks.loadout, picks.tactic)
    session = resolved.session
    handlers.onSession?.(resolved.session)
    const verdict = resolved.verdict
    if (!verdict?.battle) {
      throw new Error("The cup match resolved without a battle log")
    }
    const cs = getSpecies(creature.speciesId)
    const rs = getSpecies(opponent.speciesId)
    if (!cs || !rs) throw new Error("Unknown species: cannot frame the fight")
    fightNow = {
      owned: {
        name: creature.name,
        key: creature.name,
        element: cs.element,
        maxHp: effectiveStats(creature).hp,
      },
      rival: {
        name: opponent.name,
        key: opponent.name,
        element: rs.element,
        maxHp: opponent.stats.hp,
      },
    }
    // Into the arena: screens out, broadcast chrome in.
    inBattle = true
    pendingId = null
    showScreen(null)
    giveup.style.display = "none"
    overlay.classList.add("cup-battling")
    battleHud.show(fightNow)
    battleChips.style.display = ""
    renderSpeedButton(fastButton, "paced")
    fastButton.style.display = ""
    handlers.onFightStart(castingFor(creature, opponent))
    driver.start(fightNow, verdict.battle)
  }

  // ------------------------------------------------------------------
  // Coach screen
  // ------------------------------------------------------------------
  const statRow = (label: string, value: number, max = 60): HTMLElement => {
    const row = document.createElement("div")
    row.className = "cup-stat"
    const name = document.createElement("span")
    name.className = "cup-stat-name"
    name.textContent = label
    const bar = document.createElement("span")
    bar.className = "cup-stat-bar"
    const fill = document.createElement("span")
    fill.className = "cup-stat-fill"
    fill.style.width = `${Math.min(100, Math.round((value / max) * 100))}%`
    bar.append(fill)
    const num = document.createElement("span")
    num.className = "cup-stat-num"
    num.textContent = String(value)
    row.append(name, bar, num)
    return row
  }

  const openCoach = (): void => {
    if (!state?.creature || !session || !pendingId) return
    const creature = state.creature
    const opponent = session.nextOpponent
    if (!opponent) return
    const cs = getSpecies(creature.speciesId)
    const rs = getSpecies(opponent.speciesId)
    if (!cs || !rs) throw new Error("Unknown species: cannot open the coach")
    const entry = PLAN.find((p) => p.id === pendingId)
    if (!entry) return
    coachTab.textContent = `${entry.label} · ready`
    picks = {
      loadout: [...(creature.loadout ?? defaultLoadout(creature, cs))],
      tactic: "balanced",
    }

    // Your fighter card.
    fighterCard.replaceChildren()
    const fHead = document.createElement("div")
    fHead.className = "cup-card-title"
    fHead.textContent = "Your fighter"
    const fName = document.createElement("div")
    fName.className = "cup-fighter-name"
    fName.textContent = creature.name
    const fSpecies = document.createElement("div")
    fSpecies.className = "cup-fighter-species"
    fSpecies.textContent = `${cs.displayName} · ${cs.element}`
    fighterCard.append(fHead, fName, fSpecies)
    const eff = effectiveStats(creature)
    for (const [label, key] of [
      ["HP", "hp"],
      ["ATK", "atk"],
      ["DEF", "def"],
      ["SPD", "spd"],
    ] as const) {
      fighterCard.append(statRow(label, eff[key]))
    }

    // Rival scouting card (tactic withheld — that is the scouting tension).
    rivalCard.replaceChildren()
    const rHead = document.createElement("div")
    rHead.className = "cup-card-title"
    rHead.textContent = "Scouting report"
    const rName = document.createElement("div")
    rName.className = "cup-fighter-name rival"
    rName.textContent = opponent.name
    const rSpecies = document.createElement("div")
    rSpecies.className = "cup-fighter-species"
    rSpecies.textContent = `${rs.displayName} · ${rs.element}`
    rivalCard.append(rHead, rName, rSpecies)
    for (const [label, key] of [
      ["HP", "hp"],
      ["ATK", "atk"],
      ["DEF", "def"],
      ["SPD", "spd"],
    ] as const) {
      rivalCard.append(statRow(label, opponent.stats[key]))
    }
    const rKit = document.createElement("div")
    rKit.className = "cup-kit-list"
    for (const id of rs.kit) {
      const move = document.createElement("div")
      move.className = "cup-kit-move"
      move.textContent = getMove(id)?.displayName ?? id
      rKit.append(move)
    }
    const rTactic = document.createElement("div")
    rTactic.className = "cup-tactic-unknown"
    rTactic.textContent = "Tactic unknown — watch the first exchanges."
    rivalCard.append(rKit, rTactic)

    // Your kit card: picker + tactic call.
    kitCard.replaceChildren()
    const kHead = document.createElement("div")
    kHead.className = "cup-card-title"
    kHead.textContent = "Your kit"
    kitCard.append(kHead)
    const kitRows: HTMLElement[] = []
    const renderKit = (): void => {
      if (!picks) return
      const chosen = picks.loadout
      for (const row of kitRows) row.remove()
      kitRows.length = 0
      const picker = buildKitPicker({
        species: cs,
        creature,
        chosen: () => chosen,
        classes: { base: "cup-pick", locked: "locked", chosen: "on" },
        // Locked kit slots stay mysterious until trained (cup UX).
        lockedText: (name) => name + " ??",
        onToggle: (id) => {
          if (!picks) return
          const next = toggleKitChoice(picks.loadout, id, 2, 4)
          if (next) {
            picks.loadout = next
            renderKit()
          }
        },
      })
      kitRows.push(...picker.rows)
      kitCard.append(picker.fragment)
    }
    renderKit()
    const tacticHead = document.createElement("div")
    tacticHead.className = "cup-card-title tactic"
    tacticHead.textContent = "Tactic"
    kitCard.append(tacticHead)
    const { row: tacticRow } = buildTacticRow({
      rowClass: "cup-tactic-row",
      describe: (t) => ({ label: t === "balanced" ? "Balanced" : "Specials" }),
      classes: { base: "cup-tactic", on: "on" },
      initialOn: "balanced",
      onPick: (t) => {
        if (picks) picks.tactic = t
      },
    })
    kitCard.append(tacticRow)

    showScreen("coach")
  }

  coachBack.addEventListener("click", () => {
    // Free back-out: nothing commits here.
    showScreen("bracket")
  })
  coachGo.addEventListener("click", fight)
  ctaGhost.addEventListener("click", openCoach)
  ctaGo.addEventListener("click", openCoach)
  fastButton.addEventListener("click", () => {
    const next = driver.speedToggle()
    renderSpeedButton(fastButton, next)
  })

  // ------------------------------------------------------------------
  // Give-up modal + close semantics
  // ------------------------------------------------------------------
  giveupStay.addEventListener("click", () => {
    giveup.style.display = "none"
    close.focus()
  })
  giveupQuit.addEventListener("click", () => {
    if (!session) return
    giveup.style.display = "none"
    close.focus()
    ctaHide()
    // Forfeit the current round: the opponent advances without a fight,
    // then the bracket auto-completes to a champion.
    session = forfeitCup(session)
    handlers.onSession?.(session)
    setLine(`${playerName()} forfeits — the rival advances.`)
    walk()
  })

  const syncChip = (): void => {
    if (!state) return
    const creature = state.creature
    const cupToday =
      isCupDay(state.day) && state.phase === "cup" && creature !== null
    // Standing tie-in (save v8): the entry chip reads the ladder, so the
    // player sees what tonight's cup is worth before committing.
    cupHint.textContent = `Bronze ${state.ladder.subTier} · ${state.ladder.points} pts`
    // A persisted session keeps the chip alive across refreshes - even
    // once the entry is consumed (phase "day"), the walk can resume.
    const resumable = session !== null
    cupButton.style.display = cupToday || resumable ? "" : "none"
    cupButton.disabled = !cupToday && !resumable
  }

  const closeFree = (): void => {
    clearTimer()
    driver.stop()
    // A live player-turn session rides the save and stays resumable from
    // the chip; anything else (finalized, consumed) is dropped here.
    if (session && session.status !== "player-turn") {
      session = null
      handlers.onSession?.(null)
    }
    committed = false
    cursor = 0
    pendingId = null
    picks = null
    inBattle = false
    fightNow = null
    overlay.style.display = "none"
    battleHud.hide()
    champ.classList.remove("crowned")
    champName.textContent = "—"
    for (const entry of PLAN) {
      const card = cards.get(entry.id)
      if (!card) continue
      card.el.className = `cup-match m-${entry.id}`
      card.slots.a.replaceChildren()
      card.slots.b.replaceChildren()
      colHeadEls[columnOf(entry.id)].classList.remove("in")
    }
    ctaHide()
    giveup.style.display = "none"
    syncChip()
  }

  const close = document.createElement("button")
  close.className = "cup-close"
  close.type = "button"
  close.textContent = "Back to the ranch"
  close.style.display = ""
  // In-flow bottom furniture of the bracket screen (between the CTA row and
  // the feed) — absolutely positioning it over the grid made it overlap the
  // semifinal cards on shorter viewports.
  cta.after(close)
  close.addEventListener("click", () => {
    if (inBattle) return
    if (!committed) {
      // Free look: nothing consumed, the chip returns.
      closeFree()
      return
    }
    if (session && session.status === "player-turn") {
      giveup.style.display = ""
      giveupStay.focus()
      return
    }
    closeFree()
  })

  resultBack.addEventListener("click", closeFree)

  // ------------------------------------------------------------------
  // Entry
  // ------------------------------------------------------------------
  const open = (): void => {
    if (!state?.creature) return
    // Standing snapshot for the results screen's ladder row.
    ladderBefore = { ...state.ladder }
    if (!session || session.bracket.day !== state.day) {
      const prepared = prepareCup(state)
      if (!prepared) return
      session = prepared
      handlers.onSession?.(prepared)
    }
    // A refresh can land inside the window between the fight resolving and
    // the rival bracket auto-completing (the stamp hold): the persisted
    // session is eliminated but has no champion yet, and the resumed walk
    // would stall on a rival match that has no verdict to show. Finish the
    // rival bracket now — the per-pairing seeds make it deterministic and
    // idempotent.
    if (session.status === "eliminated" && session.championName === null) {
      session = completeCup(session)
      handlers.onSession?.(session)
    }
    // A consumed cup (phase "day" — the entry commit already ran) must not
    // try to endCup again; derive the flag instead of trusting the closure.
    committed = state.phase === "day"
    cursor = 0
    pendingId = null
    picks = null
    inBattle = false
    fightNow = null
    headSub.textContent = `Day ${state.day} · single elimination`
    battleHud.hide()
    champ.classList.remove("crowned")
    champName.textContent = "—"
    // Reset the board, then start the strict-order reveal.
    for (const entry of PLAN) {
      const card = cards.get(entry.id)
      if (!card) continue
      card.el.className = `cup-match m-${entry.id}`
      colHeadEls[columnOf(entry.id)].classList.remove("in")
    }
    showScreen("bracket")
    overlay.style.display = ""
    setLine(`${playerName()} steps into the bracket!`)
    cursor = 0
    timer = setTimeout(walk, beat(WALK_SETTLE))
  }

  cupButton.addEventListener("click", open)

  return {
    update(next) {
      state = next
      // A session belongs to its cup day: if the day moved on (the walk
      // was abandoned and the save advanced), the bracket is over — drop
      // it so a stale session can never double-claim rewards.
      if (session && next.day !== session.bracket.day) {
        session = null
        handlers.onSession?.(null)
      }
      syncChip()
    },
  }
}
