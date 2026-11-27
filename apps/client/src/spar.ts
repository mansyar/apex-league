/**
 * The ranch spar (spec FR11): a free two-click exhibition with no stakes.
 * The panel pre-rolls the rival from the battle seed, a tactic click starts
 * the fight, and the bout resolves through the continuous engine — its
 * dense stream drives the arena and the announcer log rides its events —
 * with a fast-forward. Nothing here touches GameState, AP, conditions, or
 * the save — the result lives only in this panel.
 *
 * spar_modules split: the panel, its setup rows and the casting live in
 * ./spar/*; this file keeps the session wiring, the fight/start path, the
 * open/close handling and the app's surface (createSpar, Spar,
 * SparHandlers), which is re-exported unchanged.
 */

import {
  type Creature,
  type DoctrineId,
  makeExhibition,
  type RuleId,
  type SparSetup,
  tacticForDoctrine,
} from "@apex/sim"
import { createBattleSession, sparStampTitle } from "./battle-session"
import { createBattleHud } from "./battleHud"
import { renderSpeedButton } from "./battleUI"
import { castingFor, fightNowFor } from "./spar/casting"
import { ghostBoutIntro } from "./spar/copy"
import {
  type GhostContender,
  ghostSparSetup,
  readGhostContender,
} from "./spar/ghost"
import { logToggleLabel } from "./spar/log"
import { buildSparPanel, sparModalBackground } from "./spar/panel"
import { resolveSpar } from "./spar/resolve"
import { markArmedTactic, refreshPrep, renderRival } from "./spar/setup"
import type { Spar, SparHandlers } from "./spar/types"
import { closeModal, isModalOpen, openModal } from "./ui/modal"

export type { Spar, SparHandlers } from "./spar/types"

export function createSpar(
  root: HTMLElement,
  handlers: SparHandlers = {},
): Spar {
  // The setup selection lives here so the one launch entry can read it.
  // Press is pre-armed on every fresh setup (FR-2); a tactic tap only re-arms.
  let armedDoctrine: DoctrineId = "press"
  let playerRule: RuleId | null = null
  const refs = buildSparPanel(root, {
    arm: (doctrine) => {
      armedDoctrine = doctrine
    },
    pickRule: (rule) => {
      playerRule = rule
    },
    launch: () => runBattle(armedDoctrine, playerRule),
    armed: () => armedDoctrine,
    rule: () => playerRule,
  })
  const {
    sparButton,
    overlay,
    panel,
    intro,
    kitHint,
    resetPill,
    doctrineButtons,
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
  // The ghost champion a board Fight button opened, if the panel is showing
  // a ghost bout. Cleared on every normal open and close, so a ghost kit can
  // never leak into a later spar — and a ghost bout always re-resolves from
  // the bundle, never from a stale setup.
  let pendingGhost: GhostContender | null = null

  // The shared battle-session shell: driver wiring, HUD updates, the
  // speed pill, and the verdict stamp live there; spar owns its chrome.
  const session = createBattleSession({
    hud: battleHud,
    speedButton: fastButton,
    onStep: (step, instant) => {
      handlers.onStep?.(step, instant)
    },
    onFrame: (stream, step) => handlers.onFrame?.(stream, step),
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
      for (const { button } of doctrineButtons) button.style.display = "none"
    },
  })

  const showLine = (text: string): void => {
    const line = document.createElement("div")
    line.className = "spar-line"
    line.textContent = text
    log.append(line)
    if (!log.hidden) log.scrollTop = log.scrollHeight
  }

  // One teardown for every exit path (close buttons, Escape, scrim, and the
  // creature going away). The modal helper runs it before the focus handoff,
  // so the spar chip is visible again by the time focus lands back on it.
  const teardown = (): void => {
    session.stop()
    pendingGhost = null
    battleHud.hide()
    sparButton.style.display = ""
    handlers.onClose?.()
  }

  const runBattle = (
    playerDoctrine: DoctrineId,
    playerRule: RuleId | null,
  ): void => {
    if (!owned) return
    session.stop()
    // A ghost bout re-resolves from the bundle with the same seed, so the
    // rival the player previewed is the rival they fight; only the player's
    // doctrine and note change. The verdict still lives only in this panel.
    const ghost = pendingGhost
    const seed = ghost ? ghost.seed : battleSeed
    const setup = ghost
      ? ghostSparSetup(owned, ghost, playerDoctrine, playerRule ?? undefined)
      : makeExhibition(
          owned,
          tacticForDoctrine(playerDoctrine),
          battleSeed,
          playerDoctrine,
          playerRule ?? undefined,
        )
    const verdict = resolveSpar(setup, seed)

    intro.textContent = `${setup.rival.name} accepts the spar!`
    for (const { button } of doctrineButtons) button.style.display = "none"
    const fightNow = fightNowFor(setup)
    // Broadcast rework: the panel exits, the arena plays full-bleed, and
    // the chips row is the only control surface left.
    panel.style.display = "none"
    chips.style.display = ""
    // The focused setup button disappears with the panel; move focus to the
    // first visible fight control so the dialog's trap keeps its anchor.
    logToggle.focus()
    showLine(intro.textContent ?? "")
    // The shell shows the HUD fighters, casts the combatants, starts the
    // playback (honoring the reduced-motion preference), and arms the
    // fast-forward pill on the paced path only.
    session.begin(fightNow, verdict, castingFor(owned, setup))
  }

  const presentSetup = (
    creature: Creature,
    setup: SparSetup,
    introLine: string,
  ): void => {
    renderRival(refs, setup, battleSeed)
    refreshPrep(refs, creature, handlers.onSetLoadout)
    // Both entry points (Spar chip and Fight Ghost) share this setup path, so
    // a tactic armed in an earlier bout never leaks: Press is lit again.
    armedDoctrine = "press"
    markArmedTactic(refs, "press")

    intro.textContent = introLine
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
    for (const { button } of doctrineButtons) button.style.display = ""
    // The Spar chip would collide with the placard's right plate.
    sparButton.style.display = "none"
    // The dialog owns the whole spar lifetime. Trap box stays the overlay
    // (not the panel), because the fight chrome replaces the hidden panel.
    if (!isModalOpen(overlay)) {
      openModal(overlay, {
        background: sparModalBackground(root, overlay),
        onClose: teardown,
        // A ghost spar opens from the board's Fight button, which is hidden
        // by the time this closes. Name the visible SPAR chip explicitly.
        returnFocusTo: sparButton,
      })
    }
  }

  const open = (creature: Creature | null): void => {
    if (!creature) return
    session.stop()
    pendingGhost = null
    // A fresh seed per spar, shown in the panel so the rival is honest.
    battleSeed = Date.now() % 2 ** 31
    presentSetup(
      creature,
      makeExhibition(creature, "balanced", battleSeed, "press"),
      "Pick how your partner fights. No AP, nothing saved.",
    )
  }

  const fightGhost = (bundle: unknown): boolean => {
    const creature = owned
    if (!creature) return false
    const contender = readGhostContender(bundle)
    if (!contender) return false
    session.stop()
    pendingGhost = contender
    // The bundle's seed keeps the ghost bout deterministic: the same ghost
    // and creature always preview — and fight — the same rival.
    battleSeed = contender.seed
    presentSetup(
      creature,
      ghostSparSetup(creature, contender, "press"),
      ghostBoutIntro(contender.name),
    )
    return true
  }

  // Both exits, plus Escape/scrim, converge on the modal's teardown and
  // focus return; no handler owns its own copy of the cleanup.
  close.addEventListener("click", () => closeModal(overlay))
  panelClose.addEventListener("click", () => closeModal(overlay))
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
      if (creature && isModalOpen(overlay)) {
        refreshPrep(refs, creature, handlers.onSetLoadout)
      }
      if (!creature && isModalOpen(overlay)) {
        // Same teardown as a manual close (session, ghost, HUD, chip,
        // onClose) plus focus return — main.ts must drop app-in-arena and
        // re-show the ranch creature, or the app strands itself in arena mode.
        closeModal(overlay)
      }
    },
    setPaused: (paused) => {
      session.setPaused(paused)
    },
    fightGhost,
  }
}
