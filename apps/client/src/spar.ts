/**
 * The ranch spar (spec FR11): a free two-click exhibition with no stakes.
 * The panel pre-rolls the rival from the battle seed, a tactic click starts
 * the fight, and the announcer log plays back step by step with a
 * fast-forward. Nothing here touches GameState, AP, conditions, or the
 * save — the result lives only in this panel.
 */

import {
  type Creature,
  effectiveStats,
  getSpecies,
  makeExhibition,
  type PlaybackStep,
  resolveBattle,
  type SpeciesDef,
  type Tactic,
} from "@apex/sim"
import { createBattleSession, sparStampTitle } from "./battle-session"
import { createBattleHud } from "./battleHud"
import {
  buildKitPicker,
  buildTacticRow,
  castFighter,
  renderSpeedButton,
} from "./battleUI"
import { crestGlyph, elementHue } from "./element"
import {
  kitHintMessage,
  kitProgress,
  loadoutOf,
  statLine,
  toggleKit,
} from "./spar/loadout-vm"
import { logToggleLabel } from "./spar/log"
import type { FightCasting } from "./staging"
import { visualSeedOf } from "./staging-seed"
import { icons } from "./ui/icons"
import { chipButton, crest } from "./ui/kit"

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
  /** Hold a live fight's playback while the tab is away (F5). */
  setPaused(paused: boolean): void
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

type SparSetup = ReturnType<typeof makeExhibition>
/** Both fighters as arena casts: species-preserving seeds, ranch-stable. */
function castingFor(owned: Creature, setup: SparSetup): FightCasting {
  return {
    owned: castFighter({
      speciesId: owned.speciesId,
      name: owned.name,
      seed: visualSeedOf(owned.stats, owned.stage),
      // The stage rides along: a champion casts its grander arena build.
      stage: owned.stage,
      // Mirror matches share a display name; the side key disambiguates.
      key: setup.ownedSide.id ?? owned.name,
      context: "the spar",
    }),
    rival: castFighter({
      speciesId: setup.rivalSpeciesId,
      name: setup.rival.name,
      seed: visualSeedOf(setup.rival.stats, setup.rival.stage),
      key: setup.rivalSide.id ?? setup.rival.name,
      context: "the spar",
    }),
  }
}

export function createSpar(
  root: HTMLElement,
  handlers: SparHandlers = {},
): Spar {
  // Top-right spar chip: its own control, separate from the care cluster.
  // Kit chip with the mock's title/sub text stack.
  const { button: sparButton } = chipButton({
    glyph: icons.spar,
    title: "Spar",
    sub: "Free match · no AP",
  })
  sparButton.className = "spar-button kit-chip"
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

  const { row: tactics, buttons: tacticButtons } = buildTacticRow({
    rowClass: "spar-tactics",
    describe: (tactic) => ({
      label: TACTIC_LABELS[tactic],
      preview: TACTIC_PREVIEWS[tactic],
      labelClass: "spar-tactic-label",
      previewClass: "spar-preview",
    }),
    classes: { base: "spar-tactic" },
    onPick: (tactic) => runBattle(tactic),
  })

  const fastButton = document.createElement("button")
  fastButton.className = "spar-fast"
  fastButton.type = "button"
  renderSpeedButton(fastButton, "paced")
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

  // The shared battle-session shell: driver wiring, HUD updates, the
  // speed pill, and the verdict stamp live there; spar owns its chrome.
  const session = createBattleSession({
    hud: battleHud,
    speedButton: fastButton,
    onStep: (step, instant) => {
      handlers.onStep?.(step, instant)
    },
    onLine: (text) => showLine(text),
    onReplayStart: (run) => {
      log.replaceChildren()
      log.hidden = true
      logToggle.textContent = logToggleLabel(true)
      logToggle.setAttribute("aria-expanded", "false")
      battleHud.hideStamp()
      replayButton.disabled = true
      battleHud.show(run.fight)
    },
    onFightStart: (casting) => handlers.onFightStart?.(casting),
    onPace: (msPerStep) => handlers.onPace?.(msPerStep),
    motionPref: handlers.motionPref,
    stampTitle: sparStampTitle,
    onFinish: ({ replayed, instant }) => {
      close.style.display = ""
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
  })

  const showLine = (text: string): void => {
    const line = document.createElement("div")
    line.className = "spar-line"
    line.textContent = text
    log.append(line)
    if (!log.hidden) log.scrollTop = log.scrollHeight
  }

  const runBattle = (playerTactic: Tactic): void => {
    if (!owned) return
    session.stop()
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
    // Broadcast rework: the panel exits, the arena plays full-bleed, and
    // the chips row is the only control surface left.
    panel.style.display = "none"
    chips.style.display = ""
    showLine(intro.textContent ?? "")
    // The shell shows the HUD fighters, casts the combatants, starts the
    // playback (honoring the reduced-motion preference), and arms the
    // fast-forward pill on the paced path only.
    session.begin(fightNow, verdict, castingFor(owned, setup))
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

    progress.textContent = kitProgress(creature, species)

    const chosen = loadoutOf(creature, species)
    const picker = buildKitPicker({
      species,
      creature,
      chosen: () => chosen,
      classes: {
        base: "spar-kit-move",
        locked: "spar-kit-locked",
        chosen: "spar-kit-chosen",
      },
      lockedText: (name, remaining) => `${name} - train ${remaining} more days`,
      onToggle: (id) => {
        kitHint.textContent = ""
        const next = toggleKit(chosen, id)
        try {
          handlers.onSetLoadout?.(next)
        } catch (error) {
          kitHint.textContent = kitHintMessage(error)
        }
      },
    })
    kitStrip.replaceChildren(picker.fragment)
  }

  const open = (creature: Creature | null): void => {
    if (!creature) return
    session.stop()
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
    logToggle.textContent = logToggleLabel(true)
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

  close.addEventListener("click", () => {
    session.stop()
    overlay.style.display = "none"
    battleHud.hide()
    sparButton.style.display = ""
    sparButton.focus()
    handlers.onClose?.()
  })
  panelClose.addEventListener("click", () => {
    // Same teardown as the post-fight exit; safe before any fight since
    // stopping an idle driver is a no-op.
    session.stop()
    overlay.style.display = "none"
    battleHud.hide()
    sparButton.style.display = ""
    sparButton.focus()
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
    logToggle.textContent = logToggleLabel(log.hidden)
    if (!log.hidden) log.scrollTop = log.scrollHeight
  })

  replayButton.addEventListener("click", () => {
    renderSpeedButton(fastButton, "paced")
    session.replay()
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
        session.stop()
        overlay.style.display = "none"
        battleHud.hide()
        sparButton.style.display = ""
        // Same teardown as a manual close — main.ts must drop
        // app-in-arena and re-show the ranch creature, or the app
        // strands itself in arena mode.
        handlers.onClose?.()
      }
    },
    setPaused: (paused) => {
      session.setPaused(paused)
    },
  }
}
