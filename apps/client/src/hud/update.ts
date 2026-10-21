import {
  ACTION_POINTS_PER_DAY,
  canGraduate,
  careAction,
  type GameState,
  lineagePrestige,
  type TrainingProgram,
} from "@apex/sim"
import { meter, replay } from "../ui/kit"
import {
  dockHeadTraining,
  driftCallout,
  familyName,
  REJECTION_COPY,
  stageLabel,
  statusLine,
} from "./copy"
import { trainButtonState } from "./dock"
import {
  apPipPlan,
  climbAnnouncement,
  conditionDelta,
  ladderRead,
  lineageMeta,
  statCell,
} from "./plates"
import { paintBranchBadge, paintCrest, paintFormChip } from "./plates-creature"
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
  } = refs
  const {
    phaseTab,
    dayNum,
    apMeter,
    trophy,
    trophyCount,
    rank,
    rankRank,
    rankPts,
    rankTitles,
  } = scoreBug
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
  const { familyEl, metaEl } = lineage
  const { motionChip, cameraChip, soundChip } = settings

  let lastProgram: TrainingProgram | null = null
  // Previous AP total — drives the one-shot spend flash on the meter.
  let prevAp: number | null = null
  // Ladder climb detection: the ticker announces a sub-tier promotion or
  // cross-tier promotion exactly once, the update after the cup finalize
  // that caused it (a Gold I → Legend I flip keeps subTier "I", so the
  // full standing is compared).
  let prevLadder: GameState["ladder"] | null = null
  let climbLine: string | null = null
  let apPips = apMeter.pips

  return (state: GameState): void => {
    view.current = state
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

    // Ladder standing (save v14): tier + sub-tier tab + points, matching
    // the trophy segment's one-fact-per-segment grammar. Below the top
    // sub-tier the read is progress-to-next; at the tier's top the points
    // are banked toward the next tier, so the raw total is the honest
    // number (Bronze I banks toward Silver, Silver I toward Gold, Gold I
    // toward the Legend gate). Legend titles ride along on the plateau.
    const ladder = state.ladder
    const read = ladderRead(ladder, state.legendTitles)
    rankRank.textContent = read.rank
    rank.classList.remove(
      "score-ladder--silver",
      "score-ladder--gold",
      "score-ladder--legend",
    )
    if (read.tierClass !== "bronze") {
      rank.classList.add(`score-ladder--${read.tierClass}`)
    }
    rankPts.textContent = read.points
    rankTitles.textContent = read.titles ?? ""
    rankTitles.style.display = read.titles === null ? "none" : ""
    rank.setAttribute("aria-label", read.ariaLabel)
    const announcement = climbAnnouncement(prevLadder, ladder)
    if (announcement !== null) {
      climbLine = announcement
      replay(rank, "chip-pop")
    }
    prevLadder = ladder
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
      dockHeadMeta.textContent = ""
      lineage.root.style.display = "none"
      statusTicker.say("")
      motionWrap.style.display = ""
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
    familyEl.textContent = familyName(creature.name, state.lineage.generation)
    metaEl.textContent = lineageMeta(
      state.lineage.generation,
      lineagePrestige(state),
      state.cupsWon,
    )
    const gradVerdict = canGraduate(state)
    dockGraduate.style.display = gradVerdict.eligible ? "" : "none"
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
    paintBranchBadge(branchBadge, creature, state.day)

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
    const climb = climbLine
    climbLine = null
    // FR-6: on a drifted hatch day the plain drift statement backs this line.
    const drift = driftCallout(creature, state.lineage, state.day)
    const line = statusLine(creature, state.day, lastProgram, climb) || drift
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
