/**
 * The ranch spar (spec FR11): a free two-click exhibition with no stakes.
 * The panel pre-rolls the rival from the battle seed, a tactic click starts
 * the fight, and the announcer log plays back step by step with a
 * fast-forward. Nothing here touches GameState, AP, conditions, or the
 * save — the result lives only in this panel.
 *
 * spar_modules split: the panel, its setup rows and the casting live in
 * ./spar/*; this file keeps the session wiring, the fight/start path, the
 * open/close handling and the app's surface (createSpar, Spar,
 * SparHandlers), which is re-exported unchanged.
 */

import {
  type Creature,
  makeExhibition,
  resolveBattle,
  type Tactic,
} from "@apex/sim"
import { createBattleSession, sparStampTitle } from "./battle-session"
import { createBattleHud } from "./battleHud"
import { renderSpeedButton } from "./battleUI"
import { castingFor, fightNowFor } from "./spar/casting"
import { logToggleLabel } from "./spar/log"
import { buildSparPanel } from "./spar/panel"
import { refreshPrep, renderRival } from "./spar/setup"
import type { Spar, SparHandlers } from "./spar/types"

export type { Spar, SparHandlers } from "./spar/types"

export function createSpar(
  root: HTMLElement,
  handlers: SparHandlers = {},
): Spar {
  const refs = buildSparPanel(root, (tactic) => runBattle(tactic))
  const {
    sparButton,
    overlay,
    panel,
    intro,
    kitHint,
    resetPill,
    tacticButtons,
    fastButton,
    replayButton,
    logToggle,
    log,
    close,
    panelClose,
    chips,
  } = refs

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
    const fightNow = fightNowFor(setup)
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

  const open = (creature: Creature | null): void => {
    if (!creature) return
    session.stop()
    // A fresh seed per spar, shown in the panel so the rival is honest.
    battleSeed = Date.now() % 2 ** 31
    const setup = makeExhibition(creature, "balanced", battleSeed)

    renderRival(refs, setup, battleSeed)
    refreshPrep(refs, creature, handlers.onSetLoadout)

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
        refreshPrep(refs, creature, handlers.onSetLoadout)
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
