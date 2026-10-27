import {
  canGraduate,
  careAction,
  type GameState,
  type TrainingProgram,
} from "@apex/sim"
import { replay } from "../ui/kit"
import {
  dockHeadTraining,
  hatchDayStatusLine,
  REJECTION_COPY,
  stageLabel,
} from "./copy"
import { trainButtonState } from "./dock"
import { seatOverflowBelow } from "./overflow"
import { conditionDelta, paintLineage, statCell } from "./plates"
import { paintBranchBadge, paintCrest, paintFormChip } from "./plates-creature"
import { paintScoreBug, type ScoreBugPaint } from "./plates-score"
import { programRows, rovingRow } from "./programs"
import { capturePrefChips } from "./settings"
import type { HudHints, HudShell } from "./types"

/**
 * The HUD's update pass: one routine paint of the current state into the
 * plates `shell` built. The one-update bookkeeping (the AP spend flash, the
 * climb announcement, the remembered training focus) lives in this closure,
 * exactly where it sat inside createHud, and the onboarding callout is
 * `hints`' business — a dismissal still persists through the sim.
 */
export function createHudUpdate(
  shell: HudShell,
  hints: HudHints,
): (state: GameState) => void {
  const { view, refs } = shell
  const {
    scoreBug,
    creaturePlate,
    dock,
    settings,
    lineage,
    motionWrap,
    creatureDetail,
    overflow,
  } = refs
  const { apMeter } = scoreBug
  const {
    root: lowerThird,
    creatureName,
    stageTab,
    formChip,
    branchBadge,
    crestEl,
    renameButton,
    statCells,
    bars,
    statusTicker,
  } = creaturePlate
  const {
    root: dockPlate,
    dockHeadMeta,
    dockRow,
    actionButtons,
    dockTrain,
    trainButton,
    trainName,
    trainCost,
    picker,
    pickerRows,
    advanceLabel,
    dockGraduate,
    graduateChip,
  } = dock
  const { motionChip, cameraChip, soundChip } = settings

  let lastProgram: TrainingProgram | null = null
  // Score-bug paint state: the AP flash, climb handoff, and pip list the
  // score owner module (hud/plates-score) carries between paints.
  const scorePaint: ScoreBugPaint = {
    prevAp: null,
    prevLadder: null,
    climbLine: null,
    apPips: apMeter.pips,
  }

  // The open overflow panel seats below the lineage plate, so every
  // primary stays visible behind it. Re-derived on every paint, when the
  // anchor's seat is real — boot seats off a hidden anchor (starter-pick
  // reveals it), and unhiding restarts the plate's settle animation, which
  // the plate's animationend re-seat follows (hud/plates-lineage).
  const reseatOverflow = (): void => {
    if (view.overflowOpen) seatOverflowBelow(overflow, motionWrap, lineage.root)
  }

  return (state: GameState): void => {
    view.current = state
    // Score bug paints through its owner module (hud/plates-score); the
    // climb handoff banks onto the shared paint state for the status line
    // to consume below.
    paintScoreBug(scoreBug, advanceLabel, state, scorePaint)

    const creature = state.creature
    if (!creature) {
      // Pre-starter: score bug + settings pill are the meaningful bits.
      lowerThird.style.display = "none"
      dockRow.style.display = "none"
      dockTrain.style.display = "none"
      dockGraduate.hidden = true
      picker.style.display = "none"
      dockHeadMeta.textContent = ""
      lineage.root.style.display = "none"
      statusTicker.say("")
      motionWrap.style.display = ""
      reseatOverflow()
      capturePrefChips({ motionChip, cameraChip, soundChip }, state.settings)
      settings.setVolumes({
        music: state.settings.musicVolume,
        sfx: state.settings.sfxVolume,
      })
      return
    }
    capturePrefChips({ motionChip, cameraChip, soundChip }, state.settings)
    settings.setVolumes({
      music: state.settings.musicVolume,
      sfx: state.settings.sfxVolume,
    })
    lowerThird.style.display = ""
    dockRow.style.display = ""
    dockTrain.style.display = ""
    lineage.root.style.display = ""

    // Legacy (v10): the lineage plate mirrors the bloodline, and the
    // graduate chip appears only when the sim says the champion is eligible.
    paintLineage(lineage, state, view.lineageOpen)
    reseatOverflow()
    const gradVerdict = canGraduate(state)
    dockGraduate.hidden = !gradVerdict.eligible
    graduateChip.disabled = !gradVerdict.eligible

    // The creature carries its own identity (the species catalog is only
    // for starter cards). FR-6: a drifted partner paints a dual crest.
    paintCrest(crestEl, creature.element, creature.affinity)
    creatureName.textContent = creature.name
    // Rename is a day-phase affordance; mid-cup the pencil hides and an
    // open editor folds away (the sim would reject anyway).
    renameButton.style.display = state.phase === "cup" ? "none" : ""
    if (view.renaming && state.phase === "cup") shell.closeRename()

    // Onboarding callout: the first unseen hint whose moment is now.
    // Dismissal persists through the sim, so a hint never asks twice.
    hints.sync(state)
    stageTab.textContent = stageLabel(creature.stage)
    stageTab.className = "kit-tab is-stage"
    // Form chip: the tier word in text, the ATK consequence in its title.
    paintFormChip(formChip, creature)
    // Branch badge (FR-10): the earned form's label, hidden until the first
    // gate has resolved. Hue reinforces the label, never replaces it.
    paintBranchBadge(branchBadge, creature)

    // Stat row: name, total (rolled base + trained), bonus when above 0.
    for (const cell of statCells) {
      const { total, bonus } = statCell(creature, cell.key)
      cell.total.textContent = String(total)
      cell.bonus.textContent = bonus
    }

    // Train control: disabled only when nothing is possible. Its label names
    // the assigned program, and its AP badge drops once a program is set —
    // a same-day re-point is free, so the button must not imply a cost.
    const train = trainButtonState(creature, state.actionPoints)
    trainButton.disabled = train.disabled
    trainButton.classList.toggle("is-disabled", train.disabled)
    if (train.reason === null) {
      delete trainButton.dataset.reason
    } else {
      trainButton.dataset.reason = train.reason
    }
    if (trainName) trainName.textContent = train.label
    if (trainCost) {
      trainCost.textContent = train.cost ?? ""
      trainCost.style.display = train.cost === null ? "none" : ""
    }
    trainButton.classList.toggle("is-focus", train.focus)
    dockHeadMeta.textContent = dockHeadTraining(creature.trainingProgram)

    // Program rows: the tradeoff in plain words, tonight's projection (or
    // the reason it will not pay), and the assigned check as text plus
    // `aria-checked` — never colour alone.
    const rows = programRows(creature)
    const rove = rovingRow(rows)
    picker.style.display = view.pickerOpen ? "" : "none"
    // The narrow layout turns an open picker into a program sheet: CSS hides
    // the care row and the two CTAs off this attribute so all four rows fit.
    dockPlate.dataset.picking = view.pickerOpen ? "true" : "false"
    for (const [index, row] of rows.entries()) {
      const ref = pickerRows.find((entry) => entry.id === row.id)
      if (!ref) continue
      ref.name.textContent = row.label
      ref.tradeoff.textContent = row.tradeoff
      ref.note.textContent = row.tonight
      ref.assigned.hidden = !row.assigned
      ref.button.disabled = row.disabled
      ref.button.classList.toggle("is-disabled", row.disabled)
      ref.button.classList.toggle("is-capped", row.capped)
      ref.button.classList.toggle("is-focus", row.assigned)
      ref.button.setAttribute("aria-checked", row.assigned ? "true" : "false")
      ref.button.tabIndex = index === rove ? 0 : -1
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
    const climb = scorePaint.climbLine
    scorePaint.climbLine = null
    // FR-6: on a drifted hatch day the drift statement leads this pass —
    // element-independent, so flavor can never bury it. The graduation
    // announcement then composes the send-off and the drift beat.
    const line = hatchDayStatusLine(creature, state, lastProgram, climb)
    statusTicker.say(line)

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

    // Remember the program across Advance Day so the morning result can
    // name the stat it sharpened.
    if (creature.trainingProgram) lastProgram = creature.trainingProgram

    // An open detail modal repaints its Growth section from this commit, so
    // a gate unlocked by the settlement lands without a reopen (FR-7).
    creatureDetail.sync(state)
  }
}
