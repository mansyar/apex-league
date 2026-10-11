/**
 * The client cup (spec FR4): an Enter Cup chip in the spar area on cup
 * days and a full-screen bracket panel that walks QF → SF → F with gentle
 * pacing before naming the champion. Battles resolve through the sim's
 * `enterCup` in one call — the panel only presents the already-committed
 * result, so HUD input is never blocked and nothing is queued.
 *
 * Announcer voice (product guidelines): short, punchy, present tense.
 * Reduced motion: the whole bracket dumps at once, no timers.
 */

import {
  type Creature,
  type CupResult,
  enterCup,
  type GameState,
  isCupDay,
} from "@apex/sim"
import { prefersReducedMotionOs } from "./motion"
import {
  PLAYBACK_SPEED_MS,
  type PlaybackSpeed,
  toggleSpeed,
} from "./playbackSpeed"

export interface CupHandlers {
  /**
   * Commit the resolved cup state through the main state flow (persist +
   * HUD refresh). Called exactly once per resolution, before pacing starts.
   */
  onResolved: (state: GameState, result: CupResult) => void
  /**
   * The player left the presentation before the bracket finished (spec FR4
   * "early exit"). The sim result stands; the ranch shows one droopy idle
   * window as the creature's reaction.
   */
  onEarlyExit: () => void
}

export interface Cup {
  /** Sync the chip and live state with the current sim state. */
  update(state: GameState): void
}

export function createCup(root: HTMLElement, handlers: CupHandlers): Cup {
  // The Enter Cup chip sits beside the Spar chip (top-right cluster).
  const cupButton = document.createElement("button")
  cupButton.className = "cup-button"
  cupButton.type = "button"
  const cupLabel = document.createElement("span")
  cupLabel.textContent = "Enter Cup"
  const cupHint = document.createElement("span")
  cupHint.textContent = "Cup day · free"
  cupButton.append(cupLabel, cupHint)
  root.append(cupButton)

  // Full-screen overlay, hidden until entry.
  const overlay = document.createElement("div")
  overlay.className = "cup-overlay"
  overlay.style.display = "none"

  const panel = document.createElement("div")
  panel.className = "cup-panel"

  const heading = document.createElement("div")
  heading.className = "cup-heading"
  heading.textContent = "Cup Day"

  // Pacing shares the spar arena's two-speed contract (no skipping — a
  // fast cup still plays every verdict in order). Reduced motion keeps
  // the instant dump regardless of this toggle.
  const pace = document.createElement("button")
  pace.className = "cup-pace"
  pace.type = "button"
  pace.setAttribute("aria-pressed", "false")
  let speed: PlaybackSpeed = "normal"
  const paceLabel = (): string => `Speed: ${speed}`
  pace.textContent = paceLabel()
  pace.addEventListener("click", () => {
    speed = toggleSpeed(speed)
    pace.setAttribute("aria-pressed", speed === "fast" ? "true" : "false")
    pace.textContent = paceLabel()
  })

  const intro = document.createElement("div")
  intro.className = "cup-intro"

  const bracket = document.createElement("div")
  bracket.className = "cup-bracket"

  const result = document.createElement("div")
  result.className = "cup-result"

  const close = document.createElement("button")
  close.className = "cup-close"
  close.type = "button"
  close.textContent = "Back to the ranch"
  close.style.display = "none"

  panel.append(heading, pace, intro, bracket, result, close)
  overlay.append(panel)
  root.append(overlay)

  let state: GameState | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let playing = false

  const reducedMotion = (): boolean => prefersReducedMotionOs()

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  /** One bracket-table row: the fighters and the verdict. */
  const showVerdict = (round: CupResult["rounds"][number]): void => {
    const row = document.createElement("div")
    row.className = "cup-round"
    const title = document.createElement("div")
    title.className = "cup-round-title"
    const label =
      round.round === 1
        ? "Quarterfinals"
        : round.round === 2
          ? "Semifinals"
          : "Final"
    title.textContent = label
    row.append(title)
    for (const v of round.verdicts) {
      const line = document.createElement("div")
      line.className = "cup-match"
      line.textContent = v.line
      row.append(line)
    }
    bracket.append(row)
  }

  const finish = (championName: string | null): void => {
    clearTimer()
    playing = false
    if (championName) {
      result.textContent = `${championName} takes the cup!`
      result.classList.add("cup-result-win")
      result.classList.remove("cup-result-loss")
    } else {
      result.textContent = "The cup ends without a champion."
      result.classList.add("cup-result-loss")
      result.classList.remove("cup-result-win")
    }
    close.style.display = ""
  }

  /** Walk the resolved rounds with pacing (or all at once, reduced motion). */
  const play = (cup: CupResult, index: number): void => {
    const round = cup.rounds[index]
    const paceMs = PLAYBACK_SPEED_MS[speed]
    if (!round) {
      timer = setTimeout(
        () => finish(cup.championName),
        reducedMotion() ? 0 : paceMs,
      )
      return
    }
    timer = setTimeout(
      () => {
        clearTimer()
        showVerdict(round)
        play(cup, index + 1)
      },
      reducedMotion() ? 0 : paceMs,
    )
  }

  const open = (current: GameState): void => {
    if (!current.creature) return
    clearTimer()
    bracket.replaceChildren()
    result.textContent = ""
    result.classList.remove("cup-result-win", "cup-result-loss")
    intro.textContent = `${current.creature.name} steps into the bracket!`
    overlay.style.display = ""
    // The way out is open the whole time (spec FR4): leaving before the
    // champion is crowned is an "early exit", after the finish it is just
    // going home.
    close.style.display = ""

    // Resolve everything through the sim in one call; the returned state
    // is already committed semantics-wise, the handler persists it.
    const entry = enterCup(current)
    const cup = entry.cup
    if (!entry.ok || !cup) {
      overlay.style.display = "none"
      return
    }
    handlers.onResolved(entry.state, cup)
    playing = true
    play(cup, 0)
  }

  cupButton.addEventListener("click", () => {
    if (state) open(state)
  })
  close.addEventListener("click", () => {
    // Leaving before the last round is shown is the spec's "early exit".
    if (playing) handlers.onEarlyExit()
    clearTimer()
    playing = false
    overlay.style.display = "none"
  })

  return {
    update(next) {
      state = next
      const creature: Creature | null = next.creature
      const cupToday =
        isCupDay(next.day) && next.phase === "cup" && creature !== null
      cupButton.style.display = cupToday ? "" : "none"
      cupButton.disabled = !cupToday || playing
    },
  }
}
