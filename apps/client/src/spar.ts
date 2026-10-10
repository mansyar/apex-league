/**
 * The ranch spar (spec FR11): a free two-click exhibition with no stakes.
 * The panel pre-rolls the rival from the battle seed, a tactic click starts
 * the fight, and the announcer log plays back step by step with a
 * fast-forward. Nothing here touches GameState, AP, conditions, or the
 * save — the result lives only in this panel.
 */

import {
  type BattleEvent,
  type BattleResult,
  type Creature,
  makeExhibition,
  resolveBattle,
  type SpeciesDef,
  type Tactic,
} from "@apex/sim"

export interface Spar {
  /** Sync the button and live creature reference with the current state. */
  update(creature: Creature | null): void
}

/** FR6 temperament lines, coach-side. */
const TEMPERAMENT_LINES: Record<SpeciesDef["temperament"], string> = {
  rush: "Rushes in. May ignore a cautious plan.",
  slow: "Slow to start.",
  obedient: "Follows the tactic.",
}

/** One-line previews shown on the tactic buttons before the whistle (FR11). */
const TACTIC_PREVIEWS: Record<Tactic, string> = {
  balanced:
    "Closes in and strikes. Saves specials for a type advantage or a finisher.",
  specials:
    "Fires specials whenever they are ready. Closes only when the kit is cooling down.",
}

const TACTIC_LABELS: Record<Tactic, string> = {
  balanced: "Balanced",
  specials: "Favor Specials",
}

const STEP_MS = 900
const FAST_MS = 140

function statLine(
  stats: Readonly<{ hp: number; atk: number; def: number; spd: number }>,
): string {
  return `HP ${stats.hp} · ATK ${stats.atk} · DEF ${stats.def} · SPD ${stats.spd}`
}

/** The verdict in announcer voice — never punishment, never death. */
function resultLine(verdict: Readonly<BattleResult>): string {
  if (verdict.winner === null) {
    return "Both fighters are down. The spar is a draw."
  }
  return `${verdict.winner} wins the spar!`
}

export function createSpar(root: HTMLElement): Spar {
  // Top-right spar chip: its own control, separate from the care cluster.
  const sparButton = document.createElement("button")
  sparButton.className = "spar-button"
  sparButton.type = "button"
  const sparLabel = document.createElement("span")
  sparLabel.textContent = "Spar"
  const sparHint = document.createElement("span")
  sparHint.textContent = "Free match · no AP"
  sparButton.append(sparLabel, sparHint)
  root.append(sparButton)

  // Center overlay panel, hidden until the whistle.
  const overlay = document.createElement("div")
  overlay.className = "spar-overlay"
  overlay.style.display = "none"

  const panel = document.createElement("div")
  panel.className = "spar-panel"

  const heading = document.createElement("div")
  heading.className = "spar-heading"
  heading.textContent = "Sparring"

  const intro = document.createElement("div")
  intro.className = "spar-intro"

  const rivalRow = document.createElement("div")
  rivalRow.className = "spar-rival"
  const rivalName = document.createElement("span")
  rivalName.className = "spar-rival-name"
  const rivalElement = document.createElement("span")
  rivalElement.className = "element-badge"
  rivalRow.append(rivalName, rivalElement)

  const rivalDetail = document.createElement("div")
  rivalDetail.className = "spar-detail"

  const cards = document.createElement("div")
  cards.className = "spar-cards"
  const ownedCard = document.createElement("div")
  ownedCard.className = "spar-card"
  const rivalCard = document.createElement("div")
  rivalCard.className = "spar-card"
  cards.append(ownedCard, rivalCard)

  const tactics = document.createElement("div")
  tactics.className = "spar-tactics"
  const tacticButtons: Array<{ button: HTMLButtonElement; tactic: Tactic }> = []
  for (const tactic of ["balanced", "specials"] as const) {
    const button = document.createElement("button")
    button.className = "spar-tactic"
    button.type = "button"
    const label = document.createElement("span")
    label.className = "spar-tactic-label"
    label.textContent = TACTIC_LABELS[tactic]
    const preview = document.createElement("span")
    preview.className = "spar-preview"
    preview.textContent = TACTIC_PREVIEWS[tactic]
    button.append(label, preview)
    tactics.append(button)
    tacticButtons.push({ button, tactic })
  }

  const fastButton = document.createElement("button")
  fastButton.className = "spar-fast"
  fastButton.type = "button"
  fastButton.textContent = "Fast-forward"
  fastButton.style.display = "none"

  const log = document.createElement("div")
  log.className = "spar-log"

  const result = document.createElement("div")
  result.className = "spar-result"

  const close = document.createElement("button")
  close.className = "spar-close"
  close.type = "button"
  close.textContent = "Back to the ranch"
  close.style.display = "none"

  panel.append(
    heading,
    intro,
    rivalRow,
    rivalDetail,
    cards,
    tactics,
    fastButton,
    log,
    result,
    close,
  )
  overlay.append(panel)
  root.append(overlay)

  let battleSeed = 0
  let owned: Creature | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let speed = STEP_MS
  const reducedMotion = (): boolean =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const showLine = (text: string): void => {
    const line = document.createElement("div")
    line.className = "spar-line"
    line.textContent = text
    log.append(line)
    log.scrollTop = log.scrollHeight
  }

  const finish = (text: string, isDraw: boolean): void => {
    clearTimer()
    result.textContent = text
    if (isDraw) {
      result.classList.add("spar-result-draw")
      result.classList.remove("spar-result-win")
    } else {
      result.classList.add("spar-result-win")
      result.classList.remove("spar-result-draw")
    }
    close.style.display = ""
    fastButton.style.display = "none"
    for (const { button } of tacticButtons) button.style.display = "none"
  }

  /**
   * Step the log with a delay. Reduced motion already showed everything;
   * fast-forward only shortens the delay — there is no skip-to-end (FR11).
   */
  const play = (
    events: readonly BattleEvent[],
    index: number,
    verdict: Readonly<BattleResult>,
  ): void => {
    const event = events[index]
    if (!event) {
      timer = setTimeout(
        () => finish(resultLine(verdict), verdict.winner === null),
        speed,
      )
      return
    }
    timer = setTimeout(() => {
      clearTimer()
      showLine(event.line)
      play(events, index + 1, verdict)
    }, speed)
  }

  const runBattle = (playerTactic: Tactic): void => {
    if (!owned) return
    clearTimer()
    // Same seed re-rolls the exact rival the player just previewed; only
    // the player's tactic changes.
    const setup = makeExhibition(owned, playerTactic, battleSeed)
    const verdict = resolveBattle(setup.ownedSide, setup.rivalSide, battleSeed)

    intro.textContent = `${setup.rival.name} accepts the spar!`
    for (const { button } of tacticButtons) button.style.display = "none"
    if (reducedMotion()) {
      // Full log at once, no timers, no fast-forward (FR11).
      for (const event of verdict.events) showLine(event.line)
      finish(resultLine(verdict), verdict.winner === null)
      return
    }
    speed = STEP_MS
    fastButton.textContent = "Fast-forward"
    fastButton.disabled = false
    fastButton.style.display = ""
    play(verdict.events, 0, verdict)
  }

  const open = (creature: Creature | null): void => {
    if (!creature) return
    clearTimer()
    // A fresh seed per spar, shown in the panel so the rival is honest.
    battleSeed = Date.now() % 2 ** 31
    const setup = makeExhibition(creature, "balanced", battleSeed)

    rivalName.textContent = setup.rival.name
    rivalElement.textContent = setup.rival.element
    rivalElement.className = `element-badge el-${setup.rival.element}`
    rivalDetail.textContent = `Rival tactic: ${
      TACTIC_LABELS[setup.rivalTactic]
    } · ${TEMPERAMENT_LINES[setup.rivalSide.temperament]} · Seed ${battleSeed}`
    ownedCard.className = `spar-card el-border-${setup.ownedSide.element}`
    ownedCard.textContent = `${setup.ownedSide.name} — ${statLine(setup.ownedSide.stats)}`
    rivalCard.className = `spar-card el-border-${setup.rivalSide.element}`
    rivalCard.textContent = `${setup.rivalSide.name} — ${statLine(setup.rivalSide.stats)}`

    intro.textContent = "Pick how your partner fights. No AP, nothing saved."
    result.textContent = ""
    result.classList.remove("spar-result-draw", "spar-result-win")
    log.replaceChildren()
    close.style.display = "none"
    fastButton.style.display = "none"
    for (const { button } of tacticButtons) button.style.display = ""
    overlay.style.display = ""
  }

  for (const { button, tactic } of tacticButtons) {
    button.addEventListener("click", () => runBattle(tactic))
  }
  close.addEventListener("click", () => {
    clearTimer()
    overlay.style.display = "none"
  })
  sparButton.addEventListener("click", () => open(owned))
  fastButton.addEventListener("click", () => {
    speed = FAST_MS
    fastButton.disabled = true
  })

  return {
    update: (creature) => {
      // The live creature reference stays current, so the fight always
      // reads the partner as they are right now.
      owned = creature
      sparButton.disabled = creature === null
      if (!creature && overlay.style.display !== "none") {
        clearTimer()
        overlay.style.display = "none"
      }
    },
  }
}
