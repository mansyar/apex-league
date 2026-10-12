/**
 * The ranch spar (spec FR11): a free two-click exhibition with no stakes.
 * The panel pre-rolls the rival from the battle seed, a tactic click starts
 * the fight, and the announcer log plays back step by step with a
 * fast-forward. Nothing here touches GameState, AP, conditions, or the
 * save — the result lives only in this panel.
 */

import {
  type BattleResult,
  type Creature,
  defaultLoadout,
  effectiveStats,
  getMove,
  getSpecies,
  MOVE_TIER3_DAYS,
  makeExhibition,
  type PlaybackStep,
  requiredTierDays,
  resolveBattle,
  type SpeciesDef,
  type Tactic,
  unlockedKit,
} from "@apex/sim"
import { type BattleHudFighter, createBattleHud } from "./battleHud"
import { crestGlyph, elementHue } from "./element"
import { createPlaybackDriver, type PlaybackRun } from "./playbackDriver"
import type { FightCasting } from "./staging"
import { visualSeedOf } from "./staging"
import { icons } from "./ui/icons"
import { crest } from "./ui/kit"

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
  /**
   * The playback pacing changed (normal ⇄ fast): the arena should scale
   * its action animations to match (ms per playback step).
   */
  onPace?: (msPerStep: number) => void
  /**
   * Live read of the saved reduced-motion preference, so an in-app
   * "reduced" setting gates the playback even when the OS is motion-ok.
   */
  motionPref?: () => boolean
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

/** One-line previews shown on the tactic buttons before the whistle (FR11).
 * Copy describes the revised FR6 behavior: Balanced now also fires specials
 * whose sustained damage beats the innate Strike, and Favor Specials falls
 * back to the Strike only when the kit cannot out-damage it. */
const TACTIC_PREVIEWS: Record<Tactic, string> = {
  balanced:
    "Closes in and strikes. Saves specials for a type advantage, a finisher, or when the kit out-damages the Strike.",
  specials:
    "Fires the kit's best sustained special. Closes or Strikes only when nothing out-damages the Strike.",
}

const TACTIC_LABELS: Record<Tactic, string> = {
  balanced: "Balanced",
  specials: "Favor Specials",
}

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
      seed: visualSeedOf(owned.stats, owned.stage),
      name: owned.name,
      // Mirror matches share a display name; the side key disambiguates.
      key: setup.ownedSide.id ?? owned.name,
    },
    rival: {
      archetypeId: rivalSpecies.archetypeId,
      seed: visualSeedOf(setup.rival.stats, setup.rival.stage),
      name: setup.rival.name,
      key: setup.rivalSide.id ?? setup.rival.name,
    },
  }
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
  // Kit chip with the mock's title/sub text stack.
  const sparButton = document.createElement("button")
  sparButton.className = "spar-button kit-chip"
  sparButton.type = "button"
  const sparGlyph = document.createElement("span")
  sparGlyph.className = "kit-chip-glyph"
  sparGlyph.innerHTML = icons.spar
  const sparText = document.createElement("span")
  sparText.className = "spar-text"
  const sparLabel = document.createElement("span")
  sparLabel.className = "spar-title"
  sparLabel.textContent = "Spar"
  const sparHint = document.createElement("span")
  sparHint.className = "spar-sub"
  sparHint.textContent = "Free match · no AP"
  sparText.append(sparLabel, sparHint)
  sparButton.append(sparGlyph, sparText)
  root.append(sparButton)

  // Center overlay panel, hidden until the whistle.
  const overlay = document.createElement("div")
  overlay.className = "spar-overlay"
  overlay.style.display = "none"

  const panel = document.createElement("div")
  panel.className = "spar-panel kit-plate"

  const heading = document.createElement("div")
  heading.className = "spar-heading"
  heading.textContent = "Sparring"

  const intro = document.createElement("div")
  intro.className = "spar-intro"

  const rivalRow = document.createElement("div")
  rivalRow.className = "spar-rival"
  const rivalName = document.createElement("span")
  rivalName.className = "spar-rival-name"
  const rivalCrest = crest("fire")
  rivalRow.append(rivalName, rivalCrest)

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

  // Secondary log (Phase D): the battle-HUD announcer carries the live
  // line, so the full log demotes to a compact collapsible box — closed
  // by default, opens on demand, still records every event.
  const logBox = document.createElement("div")
  logBox.className = "spar-logbox"
  const logToggle = document.createElement("button")
  logToggle.className = "spar-log-toggle"
  logToggle.type = "button"
  logToggle.textContent = "Battle log"
  logToggle.setAttribute("aria-expanded", "false")
  const log = document.createElement("div")
  log.className = "spar-log"
  log.hidden = true
  logBox.append(logToggle, log)

  const close = document.createElement("button")
  close.className = "spar-close kit-chip is-accent"
  close.type = "button"
  close.textContent = "Back to the ranch"
  close.style.display = "none"

  // Always-available exit on the pre-fight panel: a compact X chip pinned
  // to the panel's top-right corner. Hiding the panel (battle start)
  // hides it with the rest of the panel contents.
  const panelClose = document.createElement("button")
  panelClose.className = "spar-panel-close kit-chip is-dim"
  panelClose.type = "button"
  panelClose.setAttribute("aria-label", "Close sparring")
  panelClose.innerHTML = icons.close

  panel.append(
    panelClose,
    heading,
    intro,
    rivalRow,
    rivalDetail,
    progress,
    cards,
    loadoutRow,
    tactics,
  )
  overlay.append(panel)

  // Fight chrome (Phase D broadcast rework): while the panel is hidden the
  // arena plays full-bleed and these chips are the only controls left.
  const chips = document.createElement("div")
  chips.className = "spar-chips"
  chips.style.display = "none"
  chips.append(fastButton, replayButton, logBox, close)
  overlay.append(chips)
  root.append(overlay)
  // Broadcast HUD riding the overlay's margins (Phase D): created after
  // the overlay exists; createBattleHud prepends itself so the panel
  // paints above it.
  const battleHud = createBattleHud(overlay)

  let battleSeed = 0
  let owned: Creature | null = null
  // The current fight's HUD fighters (mirror-match stamp wording reads it).
  let fight: { owned: BattleHudFighter; rival: BattleHudFighter } | null = null

  // The shared playback driver (live-cup Phase C): pacing, speed toggle,
  // reduced-motion dump, and slow replay all live here now; spar wires
  // its chrome onto the callbacks.
  const driver = createPlaybackDriver({
    onStep: (step, instant) => {
      handlers.onStep?.(step, instant)
      battleHud.update(step)
    },
    onLine: (text) => showLine(text),
    onReplayStart: (run: PlaybackRun) => {
      log.replaceChildren()
      log.hidden = true
      logToggle.textContent = "Battle log ▸"
      logToggle.setAttribute("aria-expanded", "false")
      battleHud.hideStamp()
      replayButton.disabled = true
      battleHud.show(run.fight)
    },
    onFinish: ({ verdict, replayed, instant }) => {
      // Verdict as a broadcast stamp over the full-bleed arena (the panel
      // stays out of the way); the subline carries the ending reason.
      battleHud.stamp(winnerTitle(verdict), reasonLine(verdict))
      close.style.display = ""
      fastButton.style.display = "none"
      if (replayed) {
        replayButton.disabled = false
        replayButton.style.display = ""
      } else if (instant) {
        // A reduced-motion dump offers the text-only slow replay.
        replayButton.style.display = ""
      } else {
        replayButton.style.display = "none"
      }
      for (const { button } of tacticButtons) button.style.display = "none"
    },
    onPace: (msPerStep) => handlers.onPace?.(msPerStep),
    motionPref: handlers.motionPref,
  })

  const showLine = (text: string): void => {
    const line = document.createElement("div")
    line.className = "spar-line"
    line.textContent = text
    log.append(line)
    if (!log.hidden) log.scrollTop = log.scrollHeight
  }

  /**
   * The stamp title names the winner; in a mirror match both plates read
   * the same display name, so the label is qualified by side (the sim
   * reports hpAfter/finalHp under stable side keys, not names).
   */
  const winnerTitle = (verdict: Readonly<BattleResult>): string => {
    if (verdict.winner === null) return "A drawn spar"
    const fightNow = fight
    if (!fightNow) return `Victory — ${verdict.winner}`
    let key: string | null = null
    let best = -Infinity
    for (const [side, hp] of Object.entries(verdict.finalHp)) {
      if (hp > best) {
        best = hp
        key = side
      }
    }
    const mirror = fightNow.owned.name === fightNow.rival.name
    if (key === fightNow.owned.key) {
      return mirror
        ? `Victory — your ${verdict.winner}`
        : `Victory — ${verdict.winner}`
    }
    if (key === fightNow.rival.key) {
      return mirror
        ? `Victory — rival ${verdict.winner}`
        : `Victory — ${verdict.winner}`
    }
    return `Victory — ${verdict.winner}`
  }

  const runBattle = (playerTactic: Tactic): void => {
    if (!owned) return
    driver.stop()
    // Same seed re-rolls the exact rival the player just previewed; only
    // the player's tactic changes.
    const setup = makeExhibition(owned, playerTactic, battleSeed)
    const verdict = resolveBattle(setup.ownedSide, setup.rivalSide, battleSeed)

    intro.textContent = `${setup.rival.name} accepts the spar!`
    for (const { button } of tacticButtons) button.style.display = "none"
    const fightNow = {
      owned: {
        name: setup.ownedSide.name,
        key: setup.ownedSide.id ?? setup.ownedSide.name,
        element: setup.ownedSide.element,
        maxHp: setup.ownedSide.stats.hp,
      },
      rival: {
        name: setup.rivalSide.name,
        key: setup.rivalSide.id ?? setup.rivalSide.name,
        element: setup.rivalSide.element,
        maxHp: setup.rivalSide.stats.hp,
      },
    }
    fight = fightNow
    battleHud.show(fightNow)
    handlers.onFightStart?.(castingFor(owned, setup))
    // Broadcast rework: the panel exits, the arena plays full-bleed, and
    // the chips row is the only control surface left.
    panel.style.display = "none"
    chips.style.display = ""
    showLine(intro.textContent ?? "")
    // The driver builds the playback script, honors the reduced-motion
    // preference (instant dump + finish), and paces the timer chain. The
    // fast-forward pill only belongs to a paced run.
    if (driver.start(fightNow, verdict) === "paced") {
      fastButton.textContent = "Fast-forward"
      fastButton.style.display = ""
    }
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
      const required = requiredTierDays(nextIndex, creature.stage)
      const remaining = required - creature.trainingDays
      const displayName = getMove(nextId)?.displayName ?? nextId
      const plural = remaining === 1 ? "day" : "days"
      // A freshly evolved juvenile woke up with the third move unlocked —
      // say so instead of the generic count (spec R3 presentation).
      const evolvedUnlock =
        creature.stage !== "baby" && creature.trainingDays < MOVE_TIER3_DAYS
      progress.textContent = evolvedUnlock
        ? `Evolution unlocked move 3 — train ${remaining} more ${plural} for ${displayName}.`
        : `Unlocked ${nextIndex} of 4 moves — train ${remaining} more ${plural} for ${displayName}.`
    }

    const chosen = creature.loadout ?? defaultLoadout(creature, species)
    kitStrip.replaceChildren()
    species.kit.forEach((id, index) => {
      const name = getMove(id)?.displayName ?? id
      const required = requiredTierDays(index, creature.stage)
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
    driver.stop()
    // A fresh seed per spar, shown in the panel so the rival is honest.
    battleSeed = Date.now() % 2 ** 31
    const setup = makeExhibition(creature, "balanced", battleSeed)

    rivalName.textContent = setup.rival.name
    rivalCrest.innerHTML = crestGlyph(setup.rival.element)
    rivalCrest.style.setProperty(
      "--hue",
      String(elementHue(setup.rival.element)),
    )
    rivalDetail.textContent = `Rival tactic: ${
      TACTIC_LABELS[setup.rivalTactic]
    } · ${TEMPERAMENT_LINES[setup.rivalSide.temperament]} · Seed ${battleSeed}`
    ownedCard.className = `spar-card el-border-${setup.ownedSide.element}`
    rivalCard.className = `spar-card el-border-${setup.rivalSide.element}`
    rivalCard.textContent = `${setup.rivalSide.name} — ${statLine(setup.rivalSide.stats)}`
    refreshPrep(creature)

    intro.textContent = "Pick how your partner fights. No AP, nothing saved."
    log.replaceChildren()
    log.hidden = true
    logToggle.textContent = "Battle log ▸"
    logToggle.setAttribute("aria-expanded", "false")
    battleHud.hide()
    panel.style.display = ""
    chips.style.display = "none"
    close.style.display = "none"
    fastButton.style.display = "none"
    replayButton.style.display = "none"
    // A close mid-replay leaves the pill disabled; re-arm it here or a
    // reduced-motion spar after that stays permanently dead.
    replayButton.disabled = false
    for (const { button } of tacticButtons) button.style.display = ""
    // The Spar chip would collide with the placard's right plate.
    sparButton.style.display = "none"
    overlay.style.display = ""
  }

  for (const { button, tactic } of tacticButtons) {
    button.addEventListener("click", () => runBattle(tactic))
  }
  close.addEventListener("click", () => {
    driver.stop()
    overlay.style.display = "none"
    battleHud.hide()
    sparButton.style.display = ""
    handlers.onClose?.()
  })
  panelClose.addEventListener("click", () => {
    // Same teardown as the post-fight exit; safe before any fight since
    // stopping an idle driver is a no-op.
    driver.stop()
    overlay.style.display = "none"
    battleHud.hide()
    sparButton.style.display = ""
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
  logToggle.addEventListener("click", () => {
    log.hidden = !log.hidden
    logToggle.setAttribute("aria-expanded", String(!log.hidden))
    logToggle.textContent = log.hidden ? "Battle log ▸" : "Battle log ▴"
    if (!log.hidden) log.scrollTop = log.scrollHeight
  })

  fastButton.addEventListener("click", () => {
    const next = driver.speedToggle()
    fastButton.textContent = next === "fast" ? "Normal speed" : "Fast-forward"
  })
  replayButton.addEventListener("click", () => {
    fastButton.textContent = "Fast-forward"
    driver.replay()
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
        driver.stop()
        overlay.style.display = "none"
        battleHud.hide()
        sparButton.style.display = ""
        // Same teardown as a manual close — main.ts must drop
        // app-in-arena and re-show the ranch creature, or the app
        // strands itself in arena mode.
        handlers.onClose?.()
      }
    },
  }
}
