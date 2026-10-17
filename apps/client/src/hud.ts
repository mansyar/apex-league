import {
  ACTION_POINTS_PER_DAY,
  type CareAction,
  canGraduate,
  careAction,
  type GameState,
  lineagePrestige,
  previewTraining,
  type StatKey,
} from "@apex/sim"
import { buildCreatureDetail } from "./creature-detail"
import { crestGlyph, elementHue } from "./element"
import { buildHandbook } from "./handbook"
import {
  evolveCallout,
  familyName,
  graduationCallout,
  REJECTION_COPY,
  saveFailureNotice,
  selectHint,
  stageLabel,
  statusLine,
} from "./hud/copy"
import { buildCommandDock, pickerEntry, trainButtonState } from "./hud/dock"
import {
  apPipPlan,
  buildCallout,
  buildCreaturePlate,
  buildLineagePlate,
  buildScoreBug,
  conditionDelta,
  ladderRead,
  lineageMeta,
  promotionLine,
  statCell,
} from "./hud/plates"
import { buildPrefCluster, buildSettingsModal } from "./settings-modal"

export { buildCommandDock, type CommandDockRefs } from "./hud/dock"

import { buildResetModal, capturePrefChips } from "./hud/settings"

export {
  buildResetModal,
  type ResetModalRefs,
} from "./hud/settings"

import { meter, replay } from "./ui/kit"

export {
  coachVoice,
  corruptSaveNotice,
  evolveCallout,
  familyName,
  flavorCallout,
  graduationCallout,
  graduationHint,
  growthHint,
  previewNote,
  REJECTION_COPY,
  romanNumeral,
  STATS,
  saveFailureNotice,
  selectHint,
  spendFlashIndex,
  stageLabel,
  statLabel,
  statusLine,
  trainingStatus,
  unlockCallout,
} from "./hud/copy"
export {
  buildCreaturePlate,
  buildLineagePlate,
  buildScoreBug,
  type CreaturePlateRefs,
  type LineagePlateRefs,
  type ScoreBugRefs,
} from "./hud/plates"

export interface HudHandlers {
  onAdvanceDay: () => void
  onCare: (action: CareAction) => void
  onTrain: (stat: StatKey) => void
  /**
   * Flip the save v5 reduced-motion preference (persists like every other
   * sim change). The HUD only mirrors state; wiring stays in main.ts.
   */
  onToggleReducedMotion: () => void
  /**
   * Flip the save v9 arena-camera preference (cinematic ↔ broadcast).
   * The HUD only mirrors state; wiring stays in main.ts.
   */
  onToggleArenaCamera: () => void
  /**
   * Flip the save v13 audio mute toggle (persists like every other sim
   * change). The HUD only mirrors state; wiring stays in main.ts.
   */
  onToggleMuted: () => void
  /** Rename the partner through the sim (save v7 QoL). Returns false when
   * the sim rejects (e.g. mid-cup) so the HUD can coach instead of acting.
   */
  onRename: (name: string) => boolean
  /** Wipe the save and boot back to the starter picker (main.ts owns the
   * clearSave + reload). Only called after the modal confirm. */
  onReset: () => void
  /** Persist a dismissed onboarding hint id into settings.seenHints. */
  onHintSeen: (hintId: string) => void
  /** Open the graduation confirm flow (the HUD only asks; main owns it). */
  onGraduate: () => void
  /** Open the Hall of Fame panel (main owns the modal). */
  onOpenHallOfFame: () => void
}

export interface Hud {
  update(state: GameState): void
  /** Show the evolution-moment coach line (called once, right after the
   * ceremony starts; the next routine update replaces it). */
  announceEvolution(creature: NonNullable<GameState["creature"]>): void
  /** Show the graduation send-off line (legacy track): the retiree, the
   * generation it starts, and the successor's name. */
  announceGraduation(
    retireeName: string,
    successorName: string,
    generation: number,
  ): void
  /** Show the save-failure coach line (called once per failed persist;
   * the next routine update replaces it). Non-blocking by design. */
  announceSaveFailure(): void
}

/**
 * The care HUD: broadcast-style overlays over the 3D ranch - a top-center
 * score bug, a bottom-left creature lower-third with condition bars, and a
 * bottom-right command dock. Built from the shared broadcast kit
 * (ui/kit.ts): warm keyline plates, chamfered corners, skewed AP pips.
 */
export function createHud(root: HTMLElement, handlers: HudHandlers): Hud {
  // Top-center score bug — the shared builder; update() owns the values.
  const {
    root: scoreBug,
    phaseTab,
    dayNum,
    apMeter,
    trophy,
    trophyCount,
    rank,
    rankRank,
    rankPts,
  } = buildScoreBug()

  // Bottom-left creature lower-third — the shared builder; createHud
  // wires its interactions and update() owns the values.
  const {
    root: lowerThird,
    creatureHead,
    collapseButton,
    headRow,
    creatureName,
    stageTab,
    crestEl,
    renameButton,
    nameInput,
    renameConfirm,
    renameCancel,
    editRow,
    statCells,
    bars,
    statusTicker,
  } = buildCreaturePlate()

  // Bottom-right command dock — the shared builder. Care/pick clicks go
  // straight to the handlers; the train-toggle and collapse interactions
  // stay local (they re-render through update()).
  const {
    root: cluster,
    dockHead,
    dockRow,
    actionButtons,
    dockTrain,
    trainButton,
    trainTag,
    picker,
    pickerButtons,
    advanceLabel,
    dockGraduate,
    graduateChip,
  } = buildCommandDock({
    onCare: (action) => handlers.onCare(action),
    onTrain: (key) => {
      pickerOpen = false
      handlers.onTrain(key)
    },
    onAdvanceDay: () => handlers.onAdvanceDay(),
    onGraduate: () => handlers.onGraduate(),
  })

  // Settings cluster (top-left) + reset modal — the modal owns the three
  // settings chips now; the HUD cluster keeps only the entry chip.
  const { resetModal, resetConfirm } = buildResetModal(() => handlers.onReset())
  const settings = buildSettingsModal({
    onToggleReducedMotion: () => handlers.onToggleReducedMotion(),
    onToggleArenaCamera: () => handlers.onToggleArenaCamera(),
    onToggleMuted: () => handlers.onToggleMuted(),
    onNewGame: () => {
      resetModal.style.display = ""
      resetConfirm.focus()
    },
  })
  const { motionChip, cameraChip, soundChip } = settings
  // Coach's Handbook: type chart, ladder rules, raising guidance — one
  // persistent ranch chip (Phase 5 moved the settings chips into their
  // own modal behind the Settings chip).
  const handbook = buildHandbook()
  const motionWrap = buildPrefCluster(
    () => settings.open(),
    () => handbook.open(),
  )
  // Partner-details modal: opened by tapping the creature plate head; it
  // reads state fresh on every open.
  const creatureDetail = buildCreatureDetail()

  // Lineage plate (top-left, under the settings pill): the family name +
  // generation, and the Hall of Fame opener.
  const { root: lineagePlate, familyEl, metaEl } = buildLineagePlate()
  lineagePlate.addEventListener("click", () => handlers.onOpenHallOfFame())

  // Onboarding callouts (save v7): coach-voice nudges that appear once at
  // the moment they matter, then never again — dismissal persists in
  // settings.seenHints. First match wins (the precedence order below is
  // the teaching order: AP first, kit depth second, cup last).
  let shownHintId: string | null = null
  const { root: callout, text: calloutText } = buildCallout({
    onDismiss: () => {
      if (shownHintId) handlers.onHintSeen(shownHintId)
      shownHintId = null
    },
  })
  // The two bottom plates live in a stack wrapper so the phone tier can
  // lay them out as a column; display:contents keeps the desktop
  // corner-pinned layout untouched (children position against the root).
  const hudStack = document.createElement("div")
  hudStack.className = "hud-stack"
  hudStack.append(lowerThird, cluster)
  root.append(
    scoreBug,
    motionWrap,
    lineagePlate,
    hudStack,
    resetModal,
    creatureDetail.root,
    handbook.root,
    settings.root,
    callout,
  )

  let pickerOpen = false
  let lastFocus: StatKey | null = null
  let current: GameState | null = null
  // Corner clusters collapse by clicking their headers (session-only:
  // always expanded on load). Narrow viewports start collapsed — the
  // stacked plates would otherwise eat the whole scene.
  const startsCollapsed = window.matchMedia("(max-width: 767.98px)").matches
  let creatureOpen = !startsCollapsed
  let dockOpen = !startsCollapsed
  lowerThird.classList.toggle("is-collapsed", !creatureOpen)
  cluster.classList.toggle("is-collapsed", !dockOpen)
  // Previous AP total — drives the one-shot spend flash on the meter.
  let prevAp: number | null = null
  // Ladder climb detection: the ticker announces a sub-tier promotion
  // exactly once, the update after the cup finalize that caused it.
  let prevLadderSubTier: string | null = null
  let climbLine: string | null = null
  let apPips = apMeter.pips

  // Toggling the picker spends nothing — render only.
  trainButton.addEventListener("click", () => {
    pickerOpen = !pickerOpen
    if (current) update(current)
  })

  // Tapping the plate head opens the partner-details modal. The scrim
  // covers the HUD while it shows, so the readout is fresh for the visit.
  creatureHead.addEventListener("click", () => {
    if (current?.creature) creatureDetail.open(current)
  })

  collapseButton.addEventListener("click", () => {
    creatureOpen = !creatureOpen
    lowerThird.classList.toggle("is-collapsed", !creatureOpen)
    collapseButton.setAttribute(
      "aria-expanded",
      creatureOpen ? "true" : "false",
    )
  })

  // Rename flow: pencil opens the inline edit, Enter/click confirms,
  // Escape/cancel backs out. A sim rejection (mid-cup) coaches and stays.
  let renaming = false
  const openRename = () => {
    if (!current?.creature || current.phase === "cup") return
    renaming = true
    nameInput.value = current.creature.name
    headRow.style.display = "none"
    editRow.style.display = ""
    nameInput.focus()
    nameInput.select()
  }
  const closeRename = () => {
    renaming = false
    editRow.style.display = "none"
    headRow.style.display = ""
  }
  const confirmRename = () => {
    if (!current) return
    if (handlers.onRename(nameInput.value)) closeRename()
    else statusTicker.say("Renaming waits until the cup is done.")
  }
  renameButton.addEventListener("click", openRename)
  renameCancel.addEventListener("click", closeRename)
  renameConfirm.addEventListener("click", confirmRename)
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") confirmRename()
    if (event.key === "Escape") closeRename()
  })

  dockHead.addEventListener("click", () => {
    dockOpen = !dockOpen
    if (!dockOpen) pickerOpen = false
    cluster.classList.toggle("is-collapsed", !dockOpen)
    dockHead.setAttribute("aria-expanded", dockOpen ? "true" : "false")
    if (current) update(current)
  })

  const update = (state: GameState): void => {
    current = state
    // Score bug: the phase tab flips to accent gold on cup day.
    const cupDay = state.phase === "cup"
    phaseTab.textContent = cupDay ? "Cup day" : "Day phase"
    phaseTab.className = cupDay ? "kit-tab" : "kit-tab is-outline"
    dayNum.textContent = String(state.day)

    // AP segmented meter. Cup bonus points extend past the daily max as
    // chevron-cut bonus pips; a fresh spend flashes the drained pip out.
    const { bonus, clamped, wantPips, flash } = apPipPlan(
      state.actionPoints,
      prevAp,
    )
    if (apPips.length !== wantPips) {
      const rebuilt = meter(clamped, ACTION_POINTS_PER_DAY, bonus)
      apMeter.root.replaceChildren(...rebuilt.pips)
      apPips = rebuilt.pips
    }
    apPips.forEach((pip, i) => {
      pip.classList.toggle("is-bonus", i >= ACTION_POINTS_PER_DAY)
      pip.classList.toggle("is-empty", i >= clamped)
      pip.classList.toggle("is-spent", i === flash)
    })
    prevAp = state.actionPoints

    // Championship tally: designed overflow — "× N" scales to any count.
    trophyCount.textContent = `× ${state.cupsWon}`
    trophy.style.display = state.cupsWon > 0 ? "" : "none"

    // Ladder standing (save v11): tier + sub-tier tab + points, matching
    // the trophy segment's one-fact-per-segment grammar. Below the top
    // sub-tier the read is progress-to-next; at the tier's top the points
    // are banked toward the next tier, so the raw total is the honest
    // number (Bronze I banks toward Silver, Silver I toward Gold).
    const ladder = state.ladder
    const read = ladderRead(ladder)
    rankRank.textContent = read.rank
    rank.classList.toggle("score-ladder--silver", read.isSilver)
    rankPts.textContent = read.points
    rank.setAttribute("aria-label", read.ariaLabel)
    if (prevLadderSubTier !== null && ladder.subTier !== prevLadderSubTier) {
      climbLine = promotionLine(read.tierName, ladder.subTier)
      replay(rank, "chip-pop")
    }
    prevLadderSubTier = ladder.subTier
    if (advanceLabel) {
      advanceLabel.textContent =
        state.phase === "cup" ? "Continue past cup" : "Advance Day"
    }

    const creature = state.creature
    if (!creature) {
      // Pre-starter: score bug + settings pill are the meaningful bits.
      lowerThird.style.display = "none"
      dockRow.style.display = "none"
      dockTrain.style.display = "none"
      dockGraduate.style.display = "none"
      picker.style.display = "none"
      lineagePlate.style.display = "none"
      statusTicker.say("")
      motionWrap.style.display = ""
      capturePrefChips({ motionChip, cameraChip, soundChip }, state.settings)
      return
    }
    capturePrefChips({ motionChip, cameraChip, soundChip }, state.settings)
    lowerThird.style.display = ""
    dockRow.style.display = ""
    dockTrain.style.display = ""
    lineagePlate.style.display = ""

    // Legacy (v10): the lineage plate mirrors the bloodline, and the
    // graduate chip appears only when the sim says the champion is eligible.
    familyEl.textContent = familyName(creature.name, state.lineage.generation)
    metaEl.textContent = lineageMeta(
      state.lineage.generation,
      lineagePrestige(state),
      state.cupsWon,
    )
    const gradVerdict = canGraduate(state)
    dockGraduate.style.display = gradVerdict.eligible ? "" : "none"
    graduateChip.disabled = !gradVerdict.eligible

    // The creature carries its own identity; the species catalog is only
    // needed for starter-card display.
    crestEl.innerHTML = crestGlyph(creature.element)
    crestEl.style.setProperty("--hue", String(elementHue(creature.element)))
    creatureName.textContent = creature.name
    // Rename is a day-phase affordance; mid-cup the pencil hides and an
    // open editor folds away (the sim would reject anyway).
    renameButton.style.display = state.phase === "cup" ? "none" : ""
    if (renaming && state.phase === "cup") closeRename()

    // Onboarding callout: the first unseen hint whose moment is now.
    // Dismissal persists through the sim, so a hint never asks twice.
    const seen = new Set(state.settings.seenHints)
    const active = selectHint(state, seen)
    if (active && active.id !== shownHintId) {
      shownHintId = active.id
      calloutText.textContent = active.text
      callout.style.display = ""
    } else if (!active && shownHintId !== null) {
      shownHintId = null
      callout.style.display = "none"
    }
    stageTab.textContent = stageLabel(creature.stage)
    stageTab.className = "kit-tab is-stage"

    // Stat row: name, total (rolled base + trained), bonus when above 0.
    for (const cell of statCells) {
      const { total, bonus } = statCell(creature, cell.key)
      cell.total.textContent = String(total)
      cell.bonus.textContent = bonus
    }

    // Train button: disabled only when nothing is possible. A focus set
    // keeps it enabled at 0 AP, because a same-day swap is free.
    const preview = previewTraining(creature)
    const train = trainButtonState(creature, state.actionPoints)
    trainButton.disabled = train.disabled
    trainButton.classList.toggle("is-disabled", train.disabled)
    if (train.reason === null) {
      delete trainButton.dataset.reason
    } else {
      trainButton.dataset.reason = train.reason
    }
    if (trainTag) trainTag.textContent = train.tag
    trainButton.classList.toggle("is-focus", train.focus)

    // Picker entries: tonight's delta, or the waste reason. Capped stats
    // are disabled; the current focus is marked.
    picker.style.display = pickerOpen ? "" : "none"
    for (const entry of pickerButtons) {
      const view = pickerEntry(creature, entry.key, preview)
      entry.button.disabled = view.capped
      entry.button.classList.toggle("is-capped", view.capped)
      entry.button.classList.toggle("is-focus", view.isFocus)
      entry.note.textContent = view.note
    }

    for (const bar of bars) {
      const v = creature.conditions[bar.key]
      bar.handle.set(v, 100)
      const { text } = conditionDelta(bar.prev, v)
      if (text !== null) {
        replay(bar.handle.fill, "is-flashing")
        bar.delta.textContent = text
        bar.delta.style.display = ""
        replay(bar.delta, "chip-pop")
      } else {
        bar.delta.style.display = "none"
      }
      bar.prev = v
      bar.handle.fill.classList.toggle("is-low", v <= 25)
    }
    // A ladder promotion outranks routine chatter for one update —
    // consumed here so the next routine line resumes the chain. (The
    // ticker holds its last line until the next update, so the promotion
    // stays visible after the cup overlay closes.)
    const climb = climbLine
    climbLine = null
    statusTicker.say(statusLine(creature, state.day, lastFocus, climb))

    // Disabled states come from the sim itself — a dry-run careAction is
    // the single source of truth for why an action can't happen. The
    // reason explains on hover (kit tooltip), never inside the plate.
    for (const entry of actionButtons) {
      const result = careAction(state, entry.action)
      if (result.ok) {
        entry.button.disabled = false
        entry.button.classList.remove("is-disabled")
        delete entry.button.dataset.reason
      } else {
        entry.button.disabled = true
        entry.button.classList.add("is-disabled")
        entry.button.dataset.reason = REJECTION_COPY[result.reason]
      }
    }

    // (The motion pill was already mirrored by capturePrefUpdate above —
    // it runs on every update path.)

    // Remember the focus across Advance Day so the morning result can
    // name the stat it sharpened.
    if (creature.trainingFocus) lastFocus = creature.trainingFocus
  }

  return {
    update,
    announceEvolution(creature) {
      statusTicker.say(evolveCallout(creature))
    },
    announceGraduation(retireeName, successorName, generation) {
      statusTicker.say(
        graduationCallout(retireeName, successorName, generation),
      )
    },
    announceSaveFailure() {
      statusTicker.say(saveFailureNotice())
    },
  }
}
