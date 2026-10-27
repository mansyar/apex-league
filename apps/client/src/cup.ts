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
 *
 * cup_module_refactor_20261018: this file is the orchestration entrypoint
 * only — DOM builders live in cup-screens.ts, the screen flows in
 * cup/{board,arena,coach-room,results,entry}.ts, the decisions in
 * cup/view-models.ts, the shared context in cup/shared.ts. The public
 * surface (createCup, CupHandlers, Cup) is unchanged.
 */
import type { CupSession, GameState, RoundVerdict } from "@apex/sim"
import { forfeitCup } from "@apex/sim"
import { createBattleHud } from "./battleHud"
import type { BracketMatch } from "./bracket-model"
import { buildBracketModel } from "./bracket-model"
import { createArena } from "./cup/arena"
import { createBoard } from "./cup/board"
import { createCoachRoom } from "./cup/coach-room"
import { createEntry } from "./cup/entry"
import { createResults } from "./cup/results"
import type { CupHandlers, CupMemory, CupShared } from "./cup/shared"
import { closeIntent, giveupLine } from "./cup/view-models"
import {
  buildBattleChips,
  buildBracketScreen,
  buildCoachScreen,
  buildGiveupModal,
  buildResultsScreen,
} from "./cup-screens"
import { resolveMotionPref } from "./motion"
import { icons } from "./ui/icons"
import { chipButton } from "./ui/kit"
import { closeModal, isModalOpen, openModal } from "./ui/modal"

export type { CupHandlers } from "./cup/shared"

export interface Cup {
  /** Sync the chip and live state with the current sim state. */
  update(state: GameState): void
  /** Hold the bracket playback while the tab is away (F5). */
  setPaused(paused: boolean): void
}

/** Display id of a bracket match ("qf1".."f1"), derived by the model. */
type MatchId = string

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
  const { button: cupButton, sub: cupHint } = chipButton({
    glyph: icons.trophy,
    title: "Enter Cup",
    sub: "Cup day · free",
  })
  cupButton.className = "cup-button kit-chip"
  root.append(cupButton)

  // Full-screen overlay, hidden until entry.
  const overlay = document.createElement("div")
  overlay.className = "cup-overlay"
  overlay.classList.add("is-hidden")

  // Broadcast backdrop: the navy dome from the approved mock owns the
  // screen while a cup screen is up; it steps aside for arena battles.
  const backdrop = document.createElement("div")
  backdrop.className = "cup-backdrop"
  overlay.append(backdrop)

  const battleHud = createBattleHud(overlay)

  // ------------------------------------------------------------------
  // Screens — the DOM builders live in cup-screens.ts; the flows that
  // touch them live in cup/. cup.ts owns the shared context and the
  // listeners.
  // ------------------------------------------------------------------
  const shared = {} as CupShared
  shared.bracket = buildBracketScreen()

  // The bracket's global close button is declared before the give-up
  // modal because that modal's Escape/Stay handlers hand focus back to
  // it — declaring it later left a latent TDZ trap in those listeners.
  const close = document.createElement("button")
  close.className = "cup-close kit-line"
  close.type = "button"
  close.textContent = "Back to the ranch"
  shared.close = close

  shared.giveup = buildGiveupModal()
  shared.results = buildResultsScreen()
  shared.coach = buildCoachScreen()
  shared.battleChips = buildBattleChips()

  // The boss lower-third (FR11): a broadcast chyron carrying the boss'
  // arena intro for the length of the boss fight. Shown only for boss
  // slots; reduced motion mutes the entrance animation.
  const bossIntro = document.createElement("div")
  bossIntro.className = "cup-boss-intro kit-surface is-hidden"
  shared.bossIntro = bossIntro
  shared.battleHud = battleHud
  shared.overlay = overlay
  shared.cupButton = cupButton
  shared.cupHint = cupHint
  overlay.append(
    shared.bracket.screen,
    shared.coach.screen,
    shared.results.screen,
    shared.giveup.root,
    shared.battleChips.battleChips,
    bossIntro,
  )
  root.append(overlay)

  // ------------------------------------------------------------------
  // Shared context: the former closure, now explicit (cup/shared.ts).
  // ------------------------------------------------------------------
  const mem: CupMemory = {
    state: null,
    session: options?.restoredSession ?? null,
    ladderBefore: null,
    committed: false,
    cursor: 0,
    timer: null,
    inBattle: false,
    pendingId: null,
    picks: null,
    fightNow: null,
    bossQuip: null,
  }
  shared.mem = mem
  shared.handlers = handlers

  shared.playerName = (): string => mem.session?.bracket.slots[0]?.name ?? ""
  shared.matchOf = (id: MatchId): BracketMatch | null =>
    mem.session
      ? (buildBracketModel(mem.session).find((m) => m.id === id) ?? null)
      : null
  shared.verdictOf = (id: MatchId): RoundVerdict | null =>
    shared.matchOf(id)?.verdict ?? null
  shared.slotsOf = (id: MatchId) => {
    const match = shared.matchOf(id)
    return { a: match?.a ?? null, b: match?.b ?? null }
  }

  shared.setLine = (text: string): void => {
    const tickerLine = shared.bracket.tickerLine
    tickerLine.textContent = text
    // Restart the swap animation for each new line.
    tickerLine.classList.remove("swap")
    void tickerLine.offsetWidth
    tickerLine.classList.add("swap")
  }

  shared.showScreen = (name): void => {
    shared.bracket.screen.classList.toggle("is-hidden", name !== "bracket")
    shared.coach.screen.classList.toggle("is-hidden", name !== "coach")
    shared.results.screen.classList.toggle("is-hidden", name !== "results")
    // The global close belongs to the bracket only; the coach and the
    // results have their own exits.
    close.classList.toggle("is-hidden", name !== "bracket")
  }

  const reducedMotion = (): boolean =>
    resolveMotionPref(mem.state?.settings.reducedMotion)
  const beat = (ms: number): number => (reducedMotion() ? 0 : ms)
  shared.beat = beat
  shared.schedule = (fn, ms) => {
    mem.timer = setTimeout(fn, beat(ms))
  }

  // The submodules come up in dependency order; cross-calls resolve
  // through the shared object at call time.
  const board = createBoard(shared)
  shared.walk = board.walk

  const resultsFlow = createResults(shared)
  shared.conclude = resultsFlow.conclude

  const arena = createArena(shared)

  shared.clearTimer = (): void => {
    if (mem.timer !== null) {
      clearTimeout(mem.timer)
      mem.timer = null
    }
    // The battle shell's stamp-hold pends under the same "nothing may
    // fire while we reset" contract.
    shared.battle.hold.cancel()
  }

  const coachRoom = createCoachRoom(shared)
  const entry = createEntry(shared)

  // ------------------------------------------------------------------
  // Listeners — the wiring that binds the flows together.
  // ------------------------------------------------------------------
  shared.coach.coachBack.addEventListener("click", () => {
    // Free back-out: nothing commits here.
    coachRoom.closeCoach()
  })
  shared.coach.coachGo.addEventListener("click", arena.fight)
  shared.bracket.ctaGhost.addEventListener("click", coachRoom.openCoach)
  shared.bracket.ctaGo.addEventListener("click", coachRoom.openCoach)

  shared.giveup.giveupStay.addEventListener("click", () => {
    // Stay is the explicit way back: the helper hands focus to the opener.
    closeModal(shared.giveup.root)
  })
  shared.giveup.giveupQuit.addEventListener("click", () => {
    if (!mem.session) return
    closeModal(shared.giveup.root, { returnFocus: false })
    close.focus()
    board.ctaHide()
    // Forfeit the current round: the opponent advances without a fight,
    // then the bracket auto-completes to a champion.
    mem.session = forfeitCup(mem.session)
    handlers.onSession?.(mem.session)
    shared.setLine(giveupLine(shared.playerName()))
    board.walk()
  })

  // In-flow bottom furniture of the bracket screen (between the CTA row and
  // the feed) — absolutely positioning it over the grid made it overlap the
  // semifinal cards on shorter viewports.
  shared.bracket.cta.after(close)
  close.addEventListener("click", () => {
    const intent = closeIntent({
      inBattle: mem.inBattle,
      committed: mem.committed,
      status: mem.session?.status ?? null,
    })
    if (intent === "dismiss") return
    if (intent === "free") {
      // Free look: nothing consumed, the chip returns.
      entry.closeFree()
      return
    }
    // The give-up is a deliberate two-step: no scrim-out, Stay backs out.
    openModal(shared.giveup.root, {
      initialFocus: shared.giveup.giveupStay,
      dismissOnScrim: false,
    })
  })

  shared.results.resultBack.addEventListener("click", entry.closeFree)

  // The cup owns the whole screen: the helper traps Tab inside it while it
  // is open; Escape mirrors Back.
  overlay.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return
    if (isModalOpen(shared.giveup.root)) return
    if (shared.bracket.screen.classList.contains("is-hidden")) return
    close.click()
  })

  // ------------------------------------------------------------------
  // Entry
  // ------------------------------------------------------------------
  cupButton.addEventListener("click", entry.open)

  return {
    update(next) {
      mem.state = next
      // A session belongs to its cup day: if the day moved on (the walk
      // was abandoned and the save advanced), the bracket is over — drop
      // it so a stale session can never double-claim rewards.
      if (mem.session && next.day !== mem.session.bracket.day) {
        mem.session = null
        handlers.onSession?.(null)
      }
      entry.syncChip()
    },
    setPaused: (paused) => {
      shared.battle.setPaused(paused)
    },
  }
}
