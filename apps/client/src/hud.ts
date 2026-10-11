import {
  ACTION_POINTS_PER_DAY,
  type CareAction,
  type CareRejection,
  type Creature,
  type CreatureConditions,
  careAction,
  EVOLUTION_DAY,
  EVOLUTION_HINT_DAY,
  EVOLUTION_STAT_BOOST,
  EXHAUSTED_ENERGY,
  type GameState,
  getMove,
  getSpecies,
  MOVE_TIER3_DAYS,
  MOVE_TIER4_DAYS,
  previewTraining,
  requiredTierDays,
  SICK_HEALTH,
  type StatKey,
  TRAINING_CAP,
} from "@apex/sim"
import { crestGlyph, elementHue } from "./element"
import { icons } from "./ui/icons"
import {
  bar,
  button,
  crest,
  cta,
  meter,
  plate,
  replay,
  tab,
  ticker,
} from "./ui/kit"

export interface HudHandlers {
  onAdvanceDay: () => void
  onCare: (action: CareAction) => void
  onTrain: (stat: StatKey) => void
  /**
   * Flip the save v5 reduced-motion preference (persists like every other
   * sim change). The HUD only mirrors state; wiring stays in main.ts.
   */
  onToggleReducedMotion: () => void
}

export interface Hud {
  update(state: GameState): void
  /** Show the evolution-moment coach line (called once, right after the
   * ceremony starts; the next routine update replaces it). */
  announceEvolution(creature: NonNullable<GameState["creature"]>): void
}

/** Coach-voice copy for disabled actions (≤ 2 sentences, never punishing). */
const REJECTION_COPY: Record<CareRejection, string> = {
  "no-creature": "No partner yet.",
  "no-ap": "No AP left today.",
  "not-sick": "Not sick — save the medicine.",
  "too-sick": "Too sick to play today.",
  "too-tired": "Too tired to play.",
}

const CONDITIONS: Array<{
  key: keyof CreatureConditions
  label: string
  glyph: string
  color: string
}> = [
  {
    key: "hunger",
    label: "Hunger",
    glyph: icons.hunger,
    color: "var(--bar-hunger)",
  },
  {
    key: "energy",
    label: "Energy",
    glyph: icons.energy,
    color: "var(--bar-energy)",
  },
  {
    key: "health",
    label: "Health",
    glyph: icons.health,
    color: "var(--bar-health)",
  },
  { key: "mood", label: "Mood", glyph: icons.mood, color: "var(--bar-mood)" },
  { key: "bond", label: "Bond", glyph: icons.bond, color: "var(--bar-bond)" },
]

const ACTIONS: Array<{ action: CareAction; label: string; glyph: string }> = [
  { action: "feed", label: "Feed", glyph: icons.feed },
  { action: "rest", label: "Rest", glyph: icons.rest },
  { action: "treat", label: "Treat", glyph: icons.treat },
  { action: "play", label: "Play", glyph: icons.play },
]

const STATS: Array<{ key: StatKey; label: string }> = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
]

/** The display label for one of the four trainable stat keys. */
function statLabel(key: StatKey): string {
  return STATS.find((s) => s.key === key)?.label ?? key
}

/** What tonight would do, from the sim's own preview helper. */
function previewNote(preview: "gained" | "sick" | "hungry"): string {
  if (preview === "gained") return "+1 tonight"
  if (preview === "sick") return "no gain — unwell"
  return "no gain — hungry"
}

function coachVoice(conditions: CreatureConditions, name: string): string {
  if (conditions.health < SICK_HEALTH) {
    return `${name} seems unwell — medicine would help.`
  }
  if (conditions.energy <= EXHAUSTED_ENERGY) {
    return `${name} seems sluggish today…`
  }
  if (conditions.mood < 30) return `${name} seems a little down today.`
  if (conditions.hunger <= 20) return `${name} looks hungry.`
  return ""
}

/**
 * The element-flavored idle line: when nothing else needs saying, a water
 * partner gets a small water-flavored moment (echoing its catalog flavor).
 * Coach-voice, ≤ 2 sentences, never punishing. Empty for other elements.
 */
export function flavorCallout(creature: Creature): string {
  if (creature.element !== "water") return ""
  return `${creature.name} hums a contented bubble song.`
}

/**
 * The fresh-unlock coach line: while the trained-days counter sits exactly
 * on a tier threshold, the coach names the move that just became legal.
 * Under training and condition copy in precedence — a quiet morning only.
 */
export function unlockCallout(creature: Creature): string {
  const days = creature.trainingDays
  if (days !== MOVE_TIER3_DAYS && days !== MOVE_TIER4_DAYS) {
    return ""
  }
  const species = getSpecies(creature.speciesId)
  if (!species) return ""
  const moveIndex = species.kit.findIndex(
    (_, index) => requiredTierDays(index, creature.stage) === days,
  )
  const moveId = species.kit[moveIndex]
  if (moveId === undefined) return ""
  const move = getMove(moveId)
  if (!move) return ""
  const tail =
    days === MOVE_TIER3_DAYS
      ? ` Train ${MOVE_TIER4_DAYS - days} more days for the next tier.`
      : ""
  return `New move available: ${move.displayName}.${tail}`
}

/**
 * Life-stage display name for the nameplate badge.
 */
export function stageLabel(stage: Creature["stage"]): string {
  if (stage === "juvenile") return "Juvenile"
  if (stage === "champion") return "Champion"
  return "Baby"
}

/**
 * The growth hint (evolution track): from a hinted day on, the coach
 * occasionally teases that the baby is maturing — without disclosing the
 * threshold. Priority sits below unlock news and condition coach lines,
 * above flavor: raising is the game, but urgent care still leads.
 * Requires the current day, so the caller passes it in.
 */
export function growthHint(day: number, creature: Creature): string {
  if (creature.stage !== "baby") return ""
  if (day < EVOLUTION_HINT_DAY || day >= EVOLUTION_DAY) return ""
  return `${creature.name} is filling out — keep the routine steady and one morning soon it will surprise you.`
}

/**
 * The evolution-moment coach line: what changed, in stat numbers. Shown
 * once by the HUD right after the ceremony, ahead of the routine status.
 */
export function evolveCallout(creature: Creature): string {
  const b = EVOLUTION_STAT_BOOST
  return `Evolution! ${creature.name} grew into a ${stageLabel(creature.stage)} — +${b.hp} HP · +${b.atk} ATK · +${b.def} DEF · +${b.spd} SPD. The ranch just got livelier.`
}

/**
 * The status line leads with training: the preview while a focus is set,
 * the morning result after Advance Day, and the condition coach line only
 * when training has nothing to say.
 */
function trainingStatus(
  creature: NonNullable<GameState["creature"]>,
  lastFocus: StatKey | null,
): string {
  if (creature.trainingFocus) {
    const stat = statLabel(creature.trainingFocus)
    const preview = previewTraining(creature)
    if (preview === "gained") {
      return `A full night's rest will sharpen ${stat}.`
    }
    if (preview === "sick") {
      return "Too unwell to gain from training — medicine would help."
    }
    return "Too hungry to gain from tonight's training."
  }
  switch (creature.trainingResult) {
    case "gained":
      return lastFocus
        ? `Last night's rest sharpened ${statLabel(lastFocus)}.`
        : "A night of rest paid off in training."
    case "sick":
      return `${creature.name} was too unwell to gain from training.`
    case "hungry":
      return `${creature.name} was too hungry to gain from training.`
    default:
      return ""
  }
}

/**
 * Index of the AP pip that just drained when the spend total goes down
 * (drives the one-shot spend flash), or null when nothing was spent.
 */
export const spendFlashIndex = (prev: number, next: number): number | null =>
  next < prev ? next : null

/**
 * The care HUD: broadcast-style overlays over the 3D ranch — a top-center
 * score bug, a bottom-left creature lower-third with condition bars, and a
 * bottom-right command dock. Built from the shared broadcast kit
 * (ui/kit.ts): warm keyline plates, chamfered corners, skewed AP pips.
 */
export function createHud(root: HTMLElement, handlers: HudHandlers): Hud {
  // Top-center score bug.
  const scoreBug = plate({ className: "score-bug" })
  const phaseTab = tab("Day phase", "outline")
  const dayNum = document.createElement("span")
  dayNum.className = "score-day-num"
  const dayLabel = document.createElement("span")
  dayLabel.className = "score-day-label"
  dayLabel.textContent = "Day"
  const scoreDay = document.createElement("span")
  scoreDay.className = "score-day"
  scoreDay.append(dayLabel, dayNum)
  const divider = document.createElement("span")
  divider.className = "score-divider"
  const divider2 = divider.cloneNode() as HTMLElement
  const apLabel = document.createElement("span")
  apLabel.className = "score-ap-label"
  apLabel.textContent = "AP"
  const scoreAp = document.createElement("span")
  scoreAp.className = "score-ap"
  const apMeter = meter(0, ACTION_POINTS_PER_DAY)
  scoreAp.append(apLabel, apMeter.root)
  // Lifetime championships (save v5): one gold tally, no silent cap.
  const trophy = document.createElement("span")
  trophy.className = "score-trophy"
  trophy.title = "Cup championships"
  const trophyCount = document.createElement("span")
  trophyCount.className = "score-trophy-count"
  trophy.innerHTML = icons.trophy
  trophy.append(trophyCount)
  scoreBug.append(phaseTab, scoreDay, divider, scoreAp, divider2, trophy)

  // Bottom-left creature lower-third (broadcast kit plate).
  const lowerThird = plate({ className: "creature-plate" })
  const creatureHead = document.createElement("div")
  creatureHead.className = "creature-head"
  const crestEl = crest("fire")
  const creatureName = document.createElement("span")
  creatureName.className = "creature-name"
  const stageTab = tab("Baby", "stage")
  creatureHead.append(crestEl, creatureName, stageTab)

  const statRow = document.createElement("div")
  statRow.className = "stat-row"
  const statCells = STATS.map(({ key, label }) => {
    const cell = document.createElement("span")
    cell.className = "stat-cell"
    const statLabel = document.createElement("span")
    statLabel.className = "stat-label"
    statLabel.textContent = label
    const total = document.createElement("span")
    total.className = "stat-total"
    const bonus = document.createElement("span")
    bonus.className = "stat-chip"
    cell.append(statLabel, total, bonus)
    statRow.append(cell)
    return { total, bonus, key }
  })
  const conditionList = document.createElement("div")
  conditionList.className = "condition-list"
  const bars: Array<{
    handle: ReturnType<typeof bar>
    delta: HTMLElement
    key: keyof CreatureConditions
    prev: number | null
  }> = CONDITIONS.map((def) => {
    const handle = bar({
      label: def.label,
      glyph: def.glyph,
      value: 0,
      max: 100,
      color: def.color,
    })
    // Transient change chip: pinned next to the value for ~1.2s on a
    // meaningful swing, then hidden again (mock "bar change feedback").
    const delta = document.createElement("em")
    delta.className = "condition-delta"
    delta.style.display = "none"
    handle.value.append(delta)
    conditionList.append(handle.root)
    return { handle, delta, key: def.key, prev: null }
  })
  const statusTicker = ticker()
  lowerThird.append(creatureHead, statRow, conditionList, statusTicker.root)

  // Bottom-right command dock (broadcast kit plate).
  const cluster = plate({ className: "command-dock" })
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
      pickerOpen = false
      handlers.onTrain(key)
    })
    picker.append(entry)
    return { button: entry, note, key }
  })
  const advance = cta("Advance Day", handlers.onAdvanceDay)
  const advanceLabel = advance.querySelector<HTMLElement>(".kit-cta-label")
  cluster.append(dockRow, dockTrain, picker, advance)

  // Settings pill (save v5): one toggle mirrors the reduced-motion
  // preference. Persists through the main.ts handler like every other
  // sim change; the arena and ranch scene read it live.
  const motionPill = document.createElement("button")
  motionPill.className = "motion-pill"
  motionPill.type = "button"
  const motionState = document.createElement("span")
  motionState.className = "motion-pill-state"
  motionPill.addEventListener("click", handlers.onToggleReducedMotion)
  motionPill.append(motionState)

  root.append(scoreBug, lowerThird, cluster, motionPill)

  let pickerOpen = false
  let lastFocus: StatKey | null = null
  let current: GameState | null = null
  // Previous AP total — drives the one-shot spend flash on the meter.
  let prevAp: number | null = null
  let apPips = apMeter.pips

  // Toggling the picker spends nothing — render only.
  trainButton.addEventListener("click", () => {
    pickerOpen = !pickerOpen
    if (current) update(current)
  })

  /** Mirror the motion preference onto the settings pill. */
  function capturePrefUpdate(state: GameState): void {
    motionPill.setAttribute(
      "aria-pressed",
      state.settings.reducedMotion ? "true" : "false",
    )
    motionPill.classList.toggle("is-on", state.settings.reducedMotion)
    motionState.textContent = state.settings.reducedMotion
      ? "Motion: reduced"
      : "Motion: full"
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
    const bonus = Math.max(0, state.actionPoints - ACTION_POINTS_PER_DAY)
    const clamped = Math.min(state.actionPoints, ACTION_POINTS_PER_DAY)
    const wantPips = ACTION_POINTS_PER_DAY + bonus
    if (apPips.length !== wantPips) {
      const rebuilt = meter(clamped, ACTION_POINTS_PER_DAY, bonus)
      apMeter.root.replaceChildren(...rebuilt.pips)
      apPips = rebuilt.pips
    }
    const flash =
      prevAp === null ? null : spendFlashIndex(prevAp, state.actionPoints)
    apPips.forEach((pip, i) => {
      pip.classList.toggle("is-bonus", i >= ACTION_POINTS_PER_DAY)
      pip.classList.toggle("is-empty", i >= clamped)
      pip.classList.toggle("is-spent", i === flash)
    })
    prevAp = state.actionPoints

    // Championship tally: designed overflow — "× N" scales to any count.
    trophyCount.textContent = `× ${state.cupsWon}`
    trophy.style.display = state.cupsWon > 0 ? "" : "none"
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
      picker.style.display = "none"
      statusTicker.say("")
      motionPill.style.display = ""
      capturePrefUpdate(state)
      return
    }
    capturePrefUpdate(state)
    lowerThird.style.display = ""
    dockRow.style.display = ""
    dockTrain.style.display = ""

    // The creature carries its own identity; the species catalog is only
    // needed for starter-card display.
    crestEl.innerHTML = crestGlyph(creature.element)
    crestEl.style.setProperty("--hue", String(elementHue(creature.element)))
    creatureName.textContent = creature.name
    stageTab.textContent = stageLabel(creature.stage)
    stageTab.className = "kit-tab is-stage"

    // Stat row: name, total (rolled base + trained), bonus when above 0.
    for (const cell of statCells) {
      const base = creature.stats[cell.key]
      const trained = creature.trained[cell.key]
      cell.total.textContent = String(base + trained)
      cell.bonus.textContent = trained > 0 ? `+${trained}` : ""
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
      const swing = bar.prev === null ? 0 : v - bar.prev
      if (Math.abs(swing) >= 2) {
        replay(bar.handle.fill, "is-flashing")
        bar.delta.textContent = `${swing > 0 ? "+" : "−"}${Math.abs(swing)}`
        bar.delta.style.display = ""
        replay(bar.delta, "chip-pop")
      } else {
        bar.delta.style.display = "none"
      }
      bar.prev = v
      bar.handle.fill.classList.toggle("is-low", v <= 25)
    }
    statusTicker.say(
      trainingStatus(creature, lastFocus) ||
        coachVoice(creature.conditions, creature.name) ||
        unlockCallout(creature) ||
        growthHint(state.day, creature) ||
        flavorCallout(creature),
    )

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
  }
}
