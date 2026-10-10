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
  buildPlaybackScript,
  type Creature,
  defaultLoadout,
  effectiveStats,
  getMove,
  getSpecies,
  makeExhibition,
  type PlaybackStep,
  requiredTierDays,
  resolveBattle,
  type SpeciesDef,
  type Tactic,
  unlockedKit,
} from "@apex/sim"
import type { FightCasting } from "./staging"
import { visualSeedOf } from "./staging"

export interface SparHandlers {
  /**
   * Persist a chosen kit (or reset it to null = default slicing) through
   * the state flow. main.ts wires this to setLoadout/clearLoadout and saves.
   */
  onSetLoadout?: (moveIds: readonly string[] | null) => void
  /**
   * A fight is starting: the arena swaps in behind the panel and the two
   * combatants are cast onto the broadcast stage.
   */
  onFightStart?: (casting: FightCasting) => void
  /** One playback step should now play in the arena. */
  onStep?: (step: PlaybackStep, instant: boolean) => void
  /** The sparring panel closes: the scene swaps back to the ranch. */
  onClose?: () => void
}

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

/** Bigger stat label for readability on the card line. */
const STAT_KEYS = ["hp", "atk", "def", "spd"] as const
function statLine(
  stats: Readonly<{ hp: number; atk: number; def: number; spd: number }>,
  trained?: Readonly<{ hp: number; atk: number; def: number; spd: number }>,
): string {
  const parts = STAT_KEYS.map((key) => {
    const bonus = trained?.[key] ?? 0
    const chip = bonus > 0 ? ` (+${bonus})` : ""
    return `${key.toUpperCase()} ${stats[key]}${chip}`
  })
  return parts.join(" · ")
}

type SparSetup = ReturnType<typeof makeExhibition>
/** Both fighters as arena casts: species-preserving seeds, ranch-stable. */
function castingFor(owned: Creature, setup: SparSetup): FightCasting {
  const ownedSpecies = getSpecies(owned.speciesId)
  const rivalSpecies = getSpecies(setup.rivalSpeciesId)
  if (!ownedSpecies || !rivalSpecies) {
    throw new Error("Unknown species: cannot cast the spar")
  }
  return {
    owned: {
      archetypeId: ownedSpecies.archetypeId,
      seed: visualSeedOf(owned.stats),
      name: owned.name,
    },
    rival: {
      archetypeId: rivalSpecies.archetypeId,
      seed: visualSeedOf(setup.rival.stats),
      name: setup.rival.name,
    },
  }
}

/** The verdict in announcer voice — never punishment, never death. */
function resultLine(verdict: Readonly<BattleResult>): string {
  if (verdict.winner === null) {
    return "Both fighters are down. The spar is a draw."
  }
  return `${verdict.winner} wins the spar!`
}

/** Lower-third subline: what the fight ended on, in announcer voice. */
function reasonLine(verdict: Readonly<BattleResult>): string {
  if (verdict.reason === "time") return "The clock ran out on this one."
  if (verdict.reason === "double_ko")
    return "A double down — both went out together."
  return "A knockout finish."
}

export function createSpar(
  root: HTMLElement,
  handlers: SparHandlers = {},
): Spar {
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

  // Kit-gate progress (FR5): the next locked tier and its remaining days.
  const progress = document.createElement("div")
  progress.className = "spar-progress"

  const cards = document.createElement("div")
  cards.className = "spar-cards"
  const ownedCard = document.createElement("div")
  ownedCard.className = "spar-card"
  const rivalCard = document.createElement("div")
  rivalCard.className = "spar-card"
  cards.append(ownedCard, rivalCard)

  // Loadout row (FR5): the kit picker feeding this spar through setLoadout.
  const loadoutRow = document.createElement("div")
  loadoutRow.className = "spar-loadout-row"
  const loadoutLabel = document.createElement("span")
  loadoutLabel.className = "spar-loadout-label"
  loadoutLabel.textContent = "Kit"
  const kitStrip = document.createElement("div")
  kitStrip.className = "spar-kit"
  const kitHint = document.createElement("span")
  kitHint.className = "spar-loadout-hint"
  const resetPill = document.createElement("button")
  resetPill.className = "spar-kit-reset"
  resetPill.type = "button"
  resetPill.textContent = "Reset kit"
  loadoutRow.append(loadoutLabel, kitStrip, resetPill, kitHint)

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

  // Reduced-motion pill: replays the finished fight as a text-only stepped
  // log so those users get agency instead of a wall of text (2026-10-10).
  const replayButton = document.createElement("button")
  replayButton.className = "spar-replay"
  replayButton.type = "button"
  replayButton.textContent = "Replay slowly"
  replayButton.style.display = "none"

  const log = document.createElement("div")
  log.className = "spar-log"

  const result = document.createElement("div")
  result.className = "spar-result"

  // Result banner (Phase C): a big-moment stamp over the arena holding the
  // verdict + ending reason while the finisher plays out beneath it.
  const banner = document.createElement("div")
  banner.className = "spar-banner"
  banner.style.display = "none"
  const bannerSub = document.createElement("span")
  bannerSub.className = "spar-banner-sub"
  banner.append(bannerSub)

  const close = document.createElement("button")
  close.className = "spar-close"
  close.type = "button"
  close.textContent = "Back to the ranch"
  close.style.display = "none"

  panel.append(
    banner,
    heading,
    intro,
    rivalRow,
    rivalDetail,
    progress,
    cards,
    loadoutRow,
    tactics,
    fastButton,
    replayButton,
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
  let lastRun: {
    steps: readonly PlaybackStep[]
    events: readonly BattleEvent[]
    verdict: Readonly<BattleResult>
  } | null = null
  // True while a Replay slowly pass is in flight; finish() keeps the pill
  // visible so the user can replay again.
  let replaying = false
  // Both comparisons must be evaluated every call; calling matchMedia inside
  // the function keeps a live read (deferred widget, standards mode).
  const reducedMotion = (): boolean =>
    // Hardened per the 2026-10-10 spec revision: environments that report
    // BOTH `reduce` and `no-preference` (seen in an embedded Chromium) must
    // not collapse the playback into an instant dump.
    window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(prefers-reduced-motion: no-preference)").matches

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

  const finish = (
    text: string,
    isDraw: boolean,
    verdict: Readonly<BattleResult>,
  ): void => {
    clearTimer()
    result.textContent = text
    // Result banner (Phase C): the verdict gets a reason subline in
    // announcer voice. No stale banners: hidden again on open.
    bannerSub.textContent = reasonLine(verdict)
    banner.style.display = ""
    if (isDraw) {
      result.classList.add("spar-result-draw")
      result.classList.remove("spar-result-win")
    } else {
      result.classList.add("spar-result-win")
      result.classList.remove("spar-result-draw")
    }
    close.style.display = ""
    fastButton.style.display = "none"
    if (replaying) {
      replaying = false
      replayButton.disabled = false
      replayButton.style.display = ""
    } else {
      replayButton.style.display = "none"
    }
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
    steps: readonly PlaybackStep[],
  ): void => {
    const event = events[index]
    if (!event) {
      timer = setTimeout(
        () => finish(resultLine(verdict), verdict.winner === null, verdict),
        speed,
      )
      return
    }
    timer = setTimeout(() => {
      clearTimer()
      showLine(event.line)
      const step = steps[index]
      if (step) handlers.onStep?.(step, false)
      play(events, index + 1, verdict, steps)
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
    const steps = buildPlaybackScript(verdict.events)
    lastRun = { events: verdict.events, verdict, steps }
    handlers.onFightStart?.(castingFor(owned, setup))
    if (reducedMotion()) {
      // Full log at once, no timers (FR11); Replay slowly gives a text-only
      // stepped path for those who want the build-up anyway. The staging
      // jumps straight to its final posture (post-step of the last event).
      let i = 0
      for (const event of verdict.events) {
        showLine(event.line)
        const step = steps[i] ?? steps[steps.length - 1]
        if (step) handlers.onStep?.(step, true)
        i++
      }
      finish(resultLine(verdict), verdict.winner === null, verdict)
      replayButton.style.display = ""
      return
    }
    speed = STEP_MS

    fastButton.textContent = "Fast-forward"
    fastButton.disabled = false
    fastButton.style.display = ""
    play(verdict.events, 0, verdict, steps)
  }

  /**
   * The combat-prep readout: effective stat card with trained chips, the
   * kit-gate progress line, and the picker row (FR5). Called on open and
   * whenever the creature reference changes while the panel is up.
   */
  const refreshPrep = (creature: Creature): void => {
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error(`Unknown species: ${creature.speciesId}`)

    ownedCard.textContent = `${creature.name} — ${statLine(
      effectiveStats(creature),
      creature.trained,
    )}`

    const unlocked = unlockedKit(creature, species)
    const nextIndex = unlocked.length
    const nextId = species.kit[nextIndex]
    if (nextId === undefined) {
      progress.textContent = ""
    } else {
      const required = requiredTierDays(nextIndex)
      const remaining = required - creature.trainingDays
      const displayName = getMove(nextId)?.displayName ?? nextId
      const plural = remaining === 1 ? "day" : "days"
      progress.textContent = `Unlocked ${nextIndex} of 4 moves — train ${remaining} more ${plural} for ${displayName}.`
    }

    const chosen = creature.loadout ?? defaultLoadout(creature, species)
    kitStrip.replaceChildren()
    species.kit.forEach((id, index) => {
      const name = getMove(id)?.displayName ?? id
      const required = requiredTierDays(index)
      const locked = creature.trainingDays < required
      const chip = document.createElement("button")
      chip.type = "button"
      chip.className = locked
        ? "spar-kit-move spar-kit-locked"
        : chosen.includes(id)
          ? "spar-kit-move spar-kit-chosen"
          : "spar-kit-move"
      chip.textContent = locked
        ? `${name} — train ${required - creature.trainingDays} more days`
        : name
      chip.disabled = locked
      if (!locked) {
        chip.addEventListener("click", () => {
          const next = chosen.includes(id)
            ? chosen.filter((m) => m !== id)
            : [...chosen, id]
          kitHint.textContent = ""
          try {
            handlers.onSetLoadout?.(next)
          } catch (error) {
            kitHint.textContent =
              error instanceof Error ? error.message : "That kit is not allowed"
          }
        })
      }
      kitStrip.append(chip)
    })
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
    rivalCard.className = `spar-card el-border-${setup.rivalSide.element}`
    rivalCard.textContent = `${setup.rivalSide.name} — ${statLine(setup.rivalSide.stats)}`
    refreshPrep(creature)

    intro.textContent = "Pick how your partner fights. No AP, nothing saved."
    result.textContent = ""
    result.classList.remove("spar-result-draw", "spar-result-win")
    banner.style.display = "none"
    bannerSub.textContent = ""
    log.replaceChildren()
    close.style.display = "none"
    fastButton.style.display = "none"
    replayButton.style.display = "none"
    replaying = false
    lastRun = null
    for (const { button } of tacticButtons) button.style.display = ""
    overlay.style.display = ""
  }

  for (const { button, tactic } of tacticButtons) {
    button.addEventListener("click", () => runBattle(tactic))
  }
  close.addEventListener("click", () => {
    clearTimer()
    overlay.style.display = "none"
    handlers.onClose?.()
  })
  sparButton.addEventListener("click", () => open(owned))
  resetPill.addEventListener("click", () => {
    kitHint.textContent = ""
    try {
      // null = back to the default slicing (clearLoadout in the sim).
      handlers.onSetLoadout?.(null)
    } catch (error) {
      kitHint.textContent =
        error instanceof Error ? error.message : "That kit is not allowed"
    }
  })
  fastButton.addEventListener("click", () => {
    speed = FAST_MS
    fastButton.disabled = true
  })
  replayButton.addEventListener("click", () => {
    if (!lastRun) return
    clearTimer()
    log.replaceChildren()
    result.textContent = ""
    result.classList.remove("spar-result-draw", "spar-result-win")
    replaying = true
    replayButton.disabled = true
    speed = STEP_MS
    play(lastRun.events, 0, lastRun.verdict, lastRun.steps)
  })

  return {
    update: (creature) => {
      // The live creature reference stays current, so the fight always
      // reads the partner as they are right now.
      owned = creature
      sparButton.disabled = creature === null
      if (creature && overlay.style.display !== "none") {
        refreshPrep(creature)
      }
      if (!creature && overlay.style.display !== "none") {
        clearTimer()
        overlay.style.display = "none"
      }
    },
  }
}
