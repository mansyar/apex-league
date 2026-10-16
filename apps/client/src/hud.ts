import {
  ACTION_POINTS_PER_DAY,
  type CareAction,
  canGraduate,
  careAction,
  type GameState,
  lineagePrestige,
  previewTraining,
  type StatKey,
  TRAINING_CAP,
} from "@apex/sim"
import { focusTrap } from "./battleUI"
import { crestGlyph, elementHue } from "./element"
import {
  evolveCallout,
  familyName,
  graduationCallout,
  previewNote,
  REJECTION_COPY,
  STATS,
  saveFailureNotice,
  selectHint,
  stageLabel,
  statLabel,
  statusLine,
} from "./hud/copy"
import {
  apPipPlan,
  buildCreaturePlate,
  buildLineagePlate,
  buildScoreBug,
  conditionDelta,
  ladderRead,
  lineageMeta,
  promotionLine,
  statCell,
} from "./hud/plates"
import { icons } from "./ui/icons"
import { button, chip, cta, meter, plate, replay } from "./ui/kit"

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

const ACTIONS: Array<{ action: CareAction; label: string; glyph: string }> = [
  { action: "feed", label: "Feed", glyph: icons.feed },
  { action: "rest", label: "Rest", glyph: icons.rest },
  { action: "treat", label: "Treat", glyph: icons.treat },
  { action: "play", label: "Play", glyph: icons.play },
]

/** The command-dock elements the daily update writes into. */
export interface CommandDockRefs {
  root: HTMLElement
  dockHead: HTMLButtonElement
  dockRow: HTMLElement
  actionButtons: Array<{ button: HTMLButtonElement; action: CareAction }>
  dockTrain: HTMLElement
  trainButton: HTMLButtonElement
  trainTag: HTMLElement | null
  picker: HTMLElement
  pickerButtons: Array<{
    button: HTMLButtonElement
    note: HTMLElement
    key: StatKey
  }>
  advance: HTMLElement
  advanceLabel: HTMLElement | null
  /** Graduation send-off container + chip (shown only when eligible). */
  dockGraduate: HTMLElement
  graduateChip: HTMLButtonElement
}

/**
 * Bottom-right command dock (broadcast kit plate): care buttons, the
 * train control with its inline four-stat picker, and the Advance Day
 * CTA. Care/pick clicks call the given handlers; the train-toggle and
 * collapse interactions stay with createHud (they re-render).
 */
export function buildCommandDock(handlers: {
  onCare: (action: CareAction) => void
  /** A stat picked from the inline picker (closes it + spends 1 AP). */
  onTrain: (key: StatKey) => void
  onAdvanceDay: () => void
  /** Open the graduation send-off confirm (legacy track). */
  onGraduate: () => void
}): CommandDockRefs {
  // A slim header row doubles as the collapse toggle; collapsed, only
  // the "ACTIONS" label remains pinned to the corner.
  const root = plate({ className: "command-dock" })
  const dockHead = document.createElement("button")
  dockHead.className = "dock-head"
  dockHead.type = "button"
  dockHead.setAttribute("aria-expanded", "true")
  dockHead.title = "Collapse panel"
  const dockHeadLabel = document.createElement("span")
  dockHeadLabel.textContent = "Actions"
  const dockChev = document.createElement("span")
  dockChev.className = "collapse-chev"
  dockChev.innerHTML = icons.chevron
  dockHead.append(dockHeadLabel, dockChev)
  const dockRow = document.createElement("div")
  dockRow.className = "dock-row"
  const actionButtons = ACTIONS.map(({ action, label, glyph }) => {
    const btn = button({
      label,
      glyph,
      cost: "1 AP",
      onClick: () => handlers.onCare(action),
    })
    dockRow.append(btn)
    return { button: btn, action }
  })
  // Train control and its inline four-stat picker. Opening or closing
  // the picker spends nothing — only an assignment can.
  const dockTrain = document.createElement("div")
  dockTrain.className = "dock-train"
  const trainButton = button({
    label: "Train",
    glyph: icons.train,
    cost: "1 AP",
    tag: "",
  })
  const trainTag = trainButton.querySelector<HTMLElement>(".kit-button-tag")
  dockTrain.append(trainButton)

  const picker = document.createElement("div")
  picker.className = "train-picker"
  picker.style.display = "none"
  const pickerButtons = STATS.map(({ key, label }) => {
    const entry = document.createElement("button")
    entry.className = "train-entry"
    entry.type = "button"
    const name = document.createElement("span")
    name.className = "train-entry-name"
    name.textContent = label
    const note = document.createElement("span")
    note.className = "train-note"
    entry.append(name, note)
    entry.addEventListener("click", () => {
      handlers.onTrain(key)
    })
    picker.append(entry)
    return { button: entry, note, key }
  })
  const advance = cta("Advance Day", handlers.onAdvanceDay)
  const advanceLabel = advance.querySelector<HTMLElement>(".kit-cta-label")
  // Graduation send-off (legacy track): hidden until the sim reports the
  // champion eligible (canGraduate), so the dock never offers a dead end.
  const dockGraduate = document.createElement("div")
  dockGraduate.className = "dock-graduate"
  dockGraduate.style.display = "none"
  const graduateChip = button({
    label: "Graduate",
    tag: "",
    onClick: () => handlers.onGraduate(),
  })
  dockGraduate.append(graduateChip)
  root.append(dockHead, dockRow, dockTrain, dockGraduate, picker, advance)
  return {
    root,
    dockHead,
    dockRow,
    actionButtons,
    dockTrain,
    trainButton,
    trainTag,
    picker,
    pickerButtons,
    advance,
    advanceLabel,
    dockGraduate,
    graduateChip,
  }
}

/** The settings-pill elements the preference capture mirrors into. */
export interface SettingsChipRefs {
  motionWrap: HTMLElement
  motionChip: HTMLButtonElement
  cameraChip: HTMLButtonElement
  resetChip: HTMLButtonElement
}

/**
 * Settings cluster (top-left): the reduced-motion toggle (save v5), the
 * arena camera toggle (save v9), and the New game chip (save v7 QoL —
 * the confirm modal does the scary part, one deliberate click).
 */
export function buildSettingsChips(opts: {
  onToggleReducedMotion: () => void
  onToggleArenaCamera: () => void
  /** Opens the reset-confirm modal (built by buildResetModal). */
  onNewGame: () => void
}): SettingsChipRefs {
  const motionChip = chip({
    label: "Motion: full",
    variant: "dim",
    onClick: opts.onToggleReducedMotion,
  })
  const motionWrap = document.createElement("div")
  motionWrap.className = "hud-motion"
  motionWrap.append(motionChip)

  const cameraChip = chip({
    label: "Camera: cinematic",
    variant: "dim",
    onClick: opts.onToggleArenaCamera,
  })
  cameraChip.classList.add("camera-chip")
  motionWrap.append(cameraChip)
  const resetChip = chip({
    label: "New game",
    variant: "dim",
    onClick: opts.onNewGame,
  })
  // Ranch-only: the arena hide-list targets this class.
  resetChip.classList.add("new-game-chip")
  motionWrap.append(resetChip)
  return { motionWrap, motionChip, cameraChip, resetChip }
}

/** The reset-confirm modal elements. */
export interface ResetModalRefs {
  resetModal: HTMLElement
  resetConfirm: HTMLButtonElement
}

/**
 * New game confirm modal: a deliberate two-step for a destructive action.
 * Escape backs out; a backdrop click means "not today". The focus trap
 * keeps Tab inside the dialog — the scrim hides the page, so focus
 * wandering into it would be invisible.
 */
export function buildResetModal(onReset: () => void): ResetModalRefs {
  const resetModal = document.createElement("div")
  resetModal.className = "kit-modal"
  resetModal.style.display = "none"
  resetModal.setAttribute("role", "dialog")
  resetModal.setAttribute("aria-modal", "true")
  const resetBox = document.createElement("div")
  resetBox.className = "kit-plate kit-modal-box"
  const resetTitle = document.createElement("h2")
  resetTitle.className = "kit-modal-title"
  resetTitle.textContent = "Start a fresh ranch?"
  const resetText = document.createElement("p")
  resetText.className = "kit-modal-text"
  resetText.textContent =
    "This partner, their training, and every cup win will be gone for good."
  const resetActions = document.createElement("div")
  resetActions.className = "kit-modal-actions"
  const resetCancel = chip({
    label: "Keep playing",
    variant: "dim",
    onClick: () => {
      resetModal.style.display = "none"
    },
  })
  const resetConfirm = document.createElement("button")
  resetConfirm.className = "kit-button kit-button-danger"
  resetConfirm.type = "button"
  resetConfirm.textContent = "Start over"
  resetActions.append(resetCancel, resetConfirm)
  resetBox.append(resetTitle, resetText, resetActions)
  resetModal.append(resetBox)
  resetConfirm.addEventListener("click", () => {
    resetModal.style.display = "none"
    onReset()
  })
  const trapFocus = focusTrap(resetBox)
  resetModal.addEventListener("keydown", (event) => {
    trapFocus(event)
    if (event.key === "Escape") resetModal.style.display = "none"
  })
  resetModal.addEventListener("click", (event) => {
    if (event.target === resetModal) resetModal.style.display = "none"
  })
  return { resetModal, resetConfirm }
}

/**
 * The care HUD: broadcast-style overlays over the 3D ranch — a top-center
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

  // Settings cluster (top-left) + reset modal — the shared builders. The
  // modal is built first so the New game chip can open it.
  const { resetModal, resetConfirm } = buildResetModal(() => handlers.onReset())
  const { motionWrap, motionChip, cameraChip } = buildSettingsChips({
    onToggleReducedMotion: () => handlers.onToggleReducedMotion(),
    onToggleArenaCamera: () => handlers.onToggleArenaCamera(),
    onNewGame: () => {
      resetModal.style.display = ""
      resetConfirm.focus()
    },
  })

  // Lineage plate (top-left, under the settings pill): the family name +
  // generation, and the Hall of Fame opener.
  const { root: lineagePlate, familyEl, metaEl } = buildLineagePlate()
  lineagePlate.addEventListener("click", () => handlers.onOpenHallOfFame())

  // Onboarding callouts (save v7): coach-voice nudges that appear once at
  // the moment they matter, then never again — dismissal persists in
  // settings.seenHints. First match wins (the precedence order below is
  // the teaching order: AP first, kit depth second, cup last).
  let shownHintId: string | null = null
  const callout = document.createElement("div")
  callout.className = "kit-plate hud-callout"
  callout.style.display = "none"
  const calloutText = document.createElement("p")
  calloutText.className = "hud-callout-text"
  const calloutOk = chip({
    label: "Got it",
    variant: "accent",
    onClick: () => {
      if (shownHintId) handlers.onHintSeen(shownHintId)
      shownHintId = null
      callout.style.display = "none"
    },
  })
  callout.append(calloutText, calloutOk)
  // The two bottom plates live in a stack wrapper so the phone tier can
  // lay them out as a column; display:contents keeps the desktop
  // corner-pinned layout untouched (children position against the root).
  const hudStack = document.createElement("div")
  hudStack.className = "hud-stack"
  hudStack.append(lowerThird, cluster)
  root.append(scoreBug, motionWrap, lineagePlate, hudStack, resetModal, callout)

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

  creatureHead.addEventListener("click", () => {
    creatureOpen = !creatureOpen
    lowerThird.classList.toggle("is-collapsed", !creatureOpen)
    creatureHead.setAttribute("aria-expanded", creatureOpen ? "true" : "false")
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

  /** Mirror the motion and camera preferences onto the settings chips. */
  function capturePrefUpdate(state: GameState): void {
    motionChip.setAttribute(
      "aria-pressed",
      state.settings.reducedMotion ? "true" : "false",
    )
    const label = motionChip.querySelector<HTMLElement>(".kit-chip-label")
    if (label) {
      label.textContent = state.settings.reducedMotion
        ? "Motion: reduced"
        : "Motion: full"
    }
    const cinematic = state.settings.arenaCamera === "cinematic"
    cameraChip.setAttribute("aria-pressed", cinematic ? "true" : "false")
    const cameraLabel = cameraChip.querySelector<HTMLElement>(".kit-chip-label")
    if (cameraLabel) {
      cameraLabel.textContent = cinematic
        ? "Camera: cinematic"
        : "Camera: broadcast"
    }
  }

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
      capturePrefUpdate(state)
      return
    }
    capturePrefUpdate(state)
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
    const allCapped = STATS.every(
      ({ key }) => creature.trained[key] >= TRAINING_CAP,
    )
    if (allCapped) {
      trainButton.disabled = true
      trainButton.classList.add("is-disabled")
      trainButton.dataset.reason = "Nothing left to train for now."
      if (trainTag) trainTag.textContent = ""
    } else if (state.actionPoints === 0 && !creature.trainingFocus) {
      trainButton.disabled = true
      trainButton.classList.add("is-disabled")
      trainButton.dataset.reason = REJECTION_COPY["no-ap"]
      if (trainTag) trainTag.textContent = ""
    } else {
      trainButton.disabled = false
      trainButton.classList.remove("is-disabled")
      delete trainButton.dataset.reason
      if (trainTag) {
        trainTag.textContent = creature.trainingFocus
          ? `Focus: ${statLabel(creature.trainingFocus)}`
          : ""
      }
    }
    trainButton.classList.toggle("is-focus", Boolean(creature.trainingFocus))

    // Picker entries: tonight's delta, or the waste reason. Capped stats
    // are disabled; the current focus is marked.
    picker.style.display = pickerOpen ? "" : "none"
    for (const entry of pickerButtons) {
      const capped = creature.trained[entry.key] >= TRAINING_CAP
      entry.button.disabled = capped
      entry.button.classList.toggle("is-capped", capped)
      entry.button.classList.toggle(
        "is-focus",
        creature.trainingFocus === entry.key,
      )
      if (capped) {
        entry.note.textContent = "as sharp as it can get for now"
      } else if (creature.trainingFocus === entry.key) {
        entry.note.textContent = preview
          ? `focused · ${previewNote(preview)}`
          : "focused"
      } else if (preview === "gained") {
        const total = creature.stats[entry.key] + creature.trained[entry.key]
        entry.note.textContent = `${statLabel(entry.key)} ${total} → ${total + 1}`
      } else {
        entry.note.textContent = preview ? previewNote(preview) : "costs 1 AP"
      }
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
