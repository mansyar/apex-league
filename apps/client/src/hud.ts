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
  LADDER_THRESHOLDS,
  MOVE_TIER3_DAYS,
  MOVE_TIER4_DAYS,
  previewTraining,
  requiredTierDays,
  SICK_HEALTH,
  type StatKey,
  TRAINING_CAP,
} from "@apex/sim"
import { focusTrap } from "./battleUI"
import { crestGlyph, elementHue } from "./element"
import { icons } from "./ui/icons"
import {
  bar,
  button,
  chip,
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
}

export interface Hud {
  update(state: GameState): void
  /** Show the evolution-moment coach line (called once, right after the
   * ceremony starts; the next routine update replaces it). */
  announceEvolution(creature: NonNullable<GameState["creature"]>): void
  /** Show the save-failure coach line (called once per failed persist;
   * the next routine update replaces it). Non-blocking by design. */
  announceSaveFailure(): void
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
 * The save-failure coach line: calm, blame-free, non-blocking. Shown once
 * when a persist fails (quota, private mode) — the day carries on.
 */
export function saveFailureNotice(): string {
  return "Heads up — that progress didn't save. Your partner's day carries on anyway."
}

/**
 * The corrupt-save coach line: calm, blame-free, non-blocking. Shown once
 * at boot when an existing save cannot be read — the game starts fresh,
 * and the player deserves to know why.
 */
export function corruptSaveNotice(): string {
  return "That old save couldn't be read — starting fresh. Sorry about that."
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
  // Bronze ladder standing (save v8): sub-tier tab + points, mirroring
  // the trophy's one-segment-one-fact grammar.
  const divider3 = divider.cloneNode() as HTMLElement
  const rank = document.createElement("span")
  rank.className = "score-ladder"
  rank.title = "League standing"
  const rankRank = document.createElement("span")
  rankRank.className = "score-ladder-rank"
  const rankPts = document.createElement("span")
  rankPts.className = "score-ladder-pts"
  rank.append(rankRank, rankPts)
  scoreBug.append(
    phaseTab,
    scoreDay,
    divider,
    scoreAp,
    divider2,
    trophy,
    divider3,
    rank,
  )

  // Bottom-left creature lower-third (broadcast kit plate).
  const lowerThird = plate({ className: "creature-plate" })
  // The creature head doubles as the collapse toggle: clicking it folds
  // the plate down to just the head row (crest + name + stage), leaving
  // the briefest useful readout pinned to the corner.
  const creatureHead = document.createElement("button")
  creatureHead.className = "creature-head"
  creatureHead.type = "button"
  creatureHead.setAttribute("aria-expanded", "true")
  creatureHead.title = "Collapse panel"
  const crestEl = crest("fire")
  const creatureName = document.createElement("span")
  creatureName.className = "creature-name"
  const stageTab = tab("Baby", "stage")
  const creatureChev = document.createElement("span")
  creatureChev.className = "collapse-chev"
  creatureChev.innerHTML = icons.chevron
  creatureHead.append(crestEl, creatureName, stageTab, creatureChev)

  // Rename affordance: a sibling button (never nested inside the collapse
  // toggle) that swaps the head row for an inline edit form.
  const renameButton = document.createElement("button")
  renameButton.className = "rename-button"
  renameButton.type = "button"
  renameButton.title = "Rename partner"
  renameButton.setAttribute("aria-label", "Rename partner")
  renameButton.innerHTML = icons.pencil
  const headRow = document.createElement("div")
  headRow.className = "creature-headrow"
  headRow.append(creatureHead, renameButton)

  // Inline edit form: name input + confirm/cancel. Hidden until the
  // pencil is pressed; Enter confirms, Escape cancels.
  const nameInput = document.createElement("input")
  nameInput.className = "creature-name-input"
  nameInput.type = "text"
  nameInput.maxLength = 16
  nameInput.setAttribute("aria-label", "Creature name")
  const renameConfirm = document.createElement("button")
  renameConfirm.className = "kit-button rename-confirm"
  renameConfirm.type = "button"
  renameConfirm.textContent = "Save"
  renameConfirm.setAttribute("aria-label", "Save name")
  const renameCancel = document.createElement("button")
  renameCancel.className = "kit-button rename-cancel"
  renameCancel.type = "button"
  renameCancel.textContent = "Cancel"
  renameCancel.setAttribute("aria-label", "Cancel rename")
  const editRow = document.createElement("div")
  editRow.className = "creature-name-edit"
  editRow.style.display = "none"
  editRow.append(nameInput, renameConfirm, renameCancel)

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
  // Hardening: the announcer strip is live region (screen readers hear
  // routine callouts without focus).
  statusTicker.root.setAttribute("aria-live", "polite")
  lowerThird.append(headRow, editRow, statRow, conditionList, statusTicker.root)

  // Bottom-right command dock (broadcast kit plate). A slim header row
  // doubles as the collapse toggle; collapsed, only the "ACTIONS" label
  // remains pinned to the corner.
  const cluster = plate({ className: "command-dock" })
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
      pickerOpen = false
      handlers.onTrain(key)
    })
    picker.append(entry)
    return { button: entry, note, key }
  })
  const advance = cta("Advance Day", handlers.onAdvanceDay)
  const advanceLabel = advance.querySelector<HTMLElement>(".kit-cta-label")
  cluster.append(dockHead, dockRow, dockTrain, picker, advance)

  // Settings chip (save v5): one toggle mirrors the reduced-motion
  // preference. Persists through the main.ts handler like every other
  // sim change; the arena and ranch scene read it live.
  const motionChip = chip({
    label: "Motion: full",
    variant: "dim",
    onClick: handlers.onToggleReducedMotion,
  })
  const motionWrap = document.createElement("div")
  motionWrap.className = "hud-motion"
  motionWrap.append(motionChip)

  // Camera chip (save v9): the arena presentation toggle - cinematic
  // director or fixed broadcast framing.
  const cameraChip = chip({
    label: "Camera: cinematic",
    variant: "dim",
    onClick: handlers.onToggleArenaCamera,
  })
  cameraChip.classList.add("camera-chip")
  motionWrap.append(cameraChip)
  // New game (save v7 QoL): a quiet chip beside the motion toggle. The
  // confirm modal does the scary part — one deliberate click, not a misclick.
  // Ranch-only: the arena hide-list targets this class.
  const resetChip = chip({
    label: "New game",
    variant: "dim",
    onClick: () => {
      resetModal.style.display = ""
      resetConfirm.focus()
    },
  })
  resetChip.classList.add("new-game-chip")
  motionWrap.append(resetChip)

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
    handlers.onReset()
  })
  // Escape backs out; a backdrop click means "not today". The focus trap
  // keeps Tab inside the dialog — the scrim hides the page, so focus
  // wandering into it would be invisible.
  const trapFocus = focusTrap(resetBox)
  resetModal.addEventListener("keydown", (event) => {
    trapFocus(event)
    if (event.key === "Escape") resetModal.style.display = "none"
  })
  resetModal.addEventListener("click", (event) => {
    if (event.target === resetModal) resetModal.style.display = "none"
  })

  // Onboarding callouts (save v7): coach-voice nudges that appear once at
  // the moment they matter, then never again — dismissal persists in
  // settings.seenHints. First match wins (the precedence order below is
  // the teaching order: AP first, kit depth second, cup last).
  let shownHintId: string | null = null
  const HINTS: Array<{
    id: string
    when: (state: GameState) => boolean
    text: string
  }> = [
    {
      id: "ap-basics",
      when: (s) => s.phase === "day" && s.day === 1 && s.creature !== null,
      text: "Three action points a day — feed, rest, treat, play. Spend them like they matter.",
    },
    {
      id: "training-tier",
      when: (s) => s.phase === "day" && s.day === 5 && s.creature !== null,
      text: "Training focus sticks between days, and the kit keeps growing — one more move unlocks tomorrow.",
    },
    {
      id: "cup-eve",
      when: (s) => s.phase === "day" && s.day % 7 === 6 && s.creature !== null,
      text: "Cup day is tomorrow. The bracket takes your partner as they are — spend today wisely.",
    },
    {
      // Bronze ladder top (save v8): one-time coach line setting up the
      // Silver division (Phase 2) without shipping it.
      id: "silver-awaits",
      when: (s) =>
        s.creature !== null && s.ladder.subTier === "I" && s.ladder.points > 0,
      text: "You've topped Bronze — the Silver division awaits. Keep banking cup wins; the climb continues soon.",
    },
  ]
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
  root.append(scoreBug, lowerThird, cluster, motionWrap, resetModal, callout)

  let pickerOpen = false
  let lastFocus: StatKey | null = null
  let current: GameState | null = null
  // Corner clusters collapse by clicking their headers (session-only:
  // always expanded on load).
  let creatureOpen = true
  let dockOpen = true
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

    // Bronze ladder standing (save v8). Below the top the read is
    // progress-to-next (4/6); at Bronze I the points are banked toward
    // Silver (Phase 2), so the raw total is the honest number.
    const ladder = state.ladder
    rankRank.textContent = `Bronze ${ladder.subTier}`
    const nextThreshold =
      ladder.subTier === "III"
        ? LADDER_THRESHOLDS.bronzeII
        : LADDER_THRESHOLDS.bronzeI
    const nextTier = ladder.subTier === "III" ? "II" : "I"
    if (ladder.subTier === "I") {
      rankPts.textContent = `${ladder.points} pts`
      rank.setAttribute(
        "aria-label",
        `League standing: Bronze I, ${ladder.points} points banked`,
      )
    } else {
      rankPts.textContent = `${ladder.points}/${nextThreshold}`
      rank.setAttribute(
        "aria-label",
        `League standing: Bronze ${ladder.subTier}, ${ladder.points} of ${nextThreshold} points toward Bronze ${nextTier}`,
      )
    }
    if (prevLadderSubTier !== null && ladder.subTier !== prevLadderSubTier) {
      climbLine = `Promotion — Bronze ${ladder.subTier}!`
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
      picker.style.display = "none"
      statusTicker.say("")
      motionWrap.style.display = ""
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
    // Rename is a day-phase affordance; mid-cup the pencil hides and an
    // open editor folds away (the sim would reject anyway).
    renameButton.style.display = state.phase === "cup" ? "none" : ""
    if (renaming && state.phase === "cup") closeRename()

    // Onboarding callout: the first unseen hint whose moment is now.
    // Dismissal persists through the sim, so a hint never asks twice.
    const seen = new Set(state.settings.seenHints)
    const active = HINTS.find((h) => h.when(state) && !seen.has(h.id))
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
    // A ladder promotion outranks routine chatter for one update —
    // consumed here so the next routine line resumes the chain. (The
    // ticker holds its last line until the next update, so the promotion
    // stays visible after the cup overlay closes.)
    const climb = climbLine
    climbLine = null
    statusTicker.say(
      climb ||
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
    announceSaveFailure() {
      statusTicker.say(saveFailureNotice())
    },
  }
}
