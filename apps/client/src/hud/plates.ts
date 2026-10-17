import {
  ACTION_POINTS_PER_DAY,
  type CreatureConditions,
  type GameState,
  GOLD_THRESHOLDS,
  LADDER_THRESHOLDS,
  SILVER_THRESHOLDS,
  type StatKey,
} from "@apex/sim"
import { TIER_NAME } from "../tier-name"
import { icons } from "../ui/icons"
import { bar, chip, crest, meter, plate, tab, ticker } from "../ui/kit"
import { STATS, spendFlashIndex } from "./copy"

/**
 * The HUD's plates: the score bug, the lineage plate, and the creature
 * lower-third — plus the pure view-models that compute what the daily
 * update writes into them (state → data, unit-tested DOM-free). The mock
 * page (mock.ts) renders these same factories fed canned values, so the
 * mock can never drift from the live HUD's structure or class ownership.
 */

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

/** The score-bug's ladder standing, as the update writes it. */
export interface LadderRead {
  tierName: string
  rank: string
  points: string
  ariaLabel: string
  /** Tier accent class for the score-bug rank segment. */
  tierClass: "bronze" | "silver" | "gold" | "legend"
  /** Collected legend titles (plateau only, e.g. "★ 2"); null elsewhere. */
  titles: string | null
}

/**
 * Ladder standing (save v14): tier + sub-tier + points, matching the
 * trophy segment's one-fact-per-segment grammar. Below the top sub-tier
 * the read is progress-to-next; at the tier's top the points are banked
 * toward the next tier, so the raw total is the honest number (Bronze I
 * banks toward Silver, Silver I toward Gold, Gold I toward the Legend
 * gate). Legend is the plateau — its points are banked and its collected
 * titles ride along (gold_legend_ladder_20261017).
 */
export function ladderRead(
  ladder: GameState["ladder"],
  legendTitles = 0,
): LadderRead {
  const tierName = TIER_NAME[ladder.tier]
  const rank = `${tierName} ${ladder.subTier}`
  const nextThreshold =
    ladder.subTier === "III"
      ? ladder.tier === "silver"
        ? SILVER_THRESHOLDS.silverII
        : ladder.tier === "gold"
          ? GOLD_THRESHOLDS.goldII
          : LADDER_THRESHOLDS.bronzeII
      : ladder.tier === "silver"
        ? SILVER_THRESHOLDS.silverI
        : ladder.tier === "gold"
          ? GOLD_THRESHOLDS.goldI
          : LADDER_THRESHOLDS.bronzeI
  const nextTier = ladder.subTier === "III" ? "II" : "I"
  const titles =
    ladder.tier === "legend" && legendTitles > 0 ? `★ ${legendTitles}` : null
  const ariaTitles = titles === null ? "" : `, ${legendTitles} legend titles`
  if (ladder.subTier === "I") {
    return {
      tierName,
      rank,
      points: `${ladder.points} pts`,
      ariaLabel: `League standing: ${tierName} I, ${ladder.points} points banked${ariaTitles}`,
      tierClass: ladder.tier,
      titles,
    }
  }
  return {
    tierName,
    rank,
    points: `${ladder.points}/${nextThreshold}`,
    ariaLabel: `League standing: ${tierName} ${ladder.subTier}, ${ladder.points} of ${nextThreshold} points toward ${tierName} ${nextTier}`,
    tierClass: ladder.tier,
    titles,
  }
}

/** The one-update promotion callout (never repeats next update). */
export function promotionLine(tierName: string, subTier: string): string {
  return `Promotion — ${tierName} ${subTier}!`
}

/** How the AP segmented meter renders for one update. */
export interface ApPipPlan {
  /** Cup bonus points beyond the daily max (chevron-cut pips). */
  bonus: number
  /** Action points clamped to the daily meter body. */
  clamped: number
  /** Total pips the meter should show after this update. */
  wantPips: number
  /** Index of the pip that just drained (one-shot flash), or null. */
  flash: number | null
}

/**
 * AP segmented meter plan. Cup bonus points extend past the daily max as
 * chevron-cut bonus pips; a fresh spend flashes the drained pip out.
 */
export function apPipPlan(
  actionPoints: number,
  prevAp: number | null,
): ApPipPlan {
  const bonus = Math.max(0, actionPoints - ACTION_POINTS_PER_DAY)
  const clamped = Math.min(actionPoints, ACTION_POINTS_PER_DAY)
  return {
    bonus,
    clamped,
    wantPips: ACTION_POINTS_PER_DAY + bonus,
    flash: prevAp === null ? null : spendFlashIndex(prevAp, actionPoints),
  }
}

/** The lineage plate's meta line: generation, prestige, cup tally. */
export function lineageMeta(
  generation: number,
  prestige: number,
  cupsWon: number,
): string {
  return `Gen ${generation} · Prestige ${prestige} · ${cupsWon} cup${cupsWon === 1 ? "" : "s"}`
}

/** One condition bar's transient change state. */
export interface ConditionDelta {
  swing: number
  /** Signed delta chip text, or null when the swing is too small to show. */
  text: string | null
}

/**
 * Condition-bar delta: the first observation never flashes (no baseline to
 * swing from); a meaningful swing (|Δ| ≥ 2) gets a transient signed chip.
 */
export function conditionDelta(
  prev: number | null,
  value: number,
): ConditionDelta {
  const swing = prev === null ? 0 : value - prev
  if (Math.abs(swing) >= 2) {
    return { swing, text: `${swing > 0 ? "+" : "−"}${Math.abs(swing)}` }
  }
  return { swing, text: null }
}

/** One stat cell's values: rolled base + trained, bonus when above 0. */
export function statCell(
  creature: NonNullable<GameState["creature"]>,
  key: StatKey,
): { total: number; bonus: string } {
  const base = creature.stats[key]
  const trained = creature.trained[key]
  return { total: base + trained, bonus: trained > 0 ? `+${trained}` : "" }
}

/** The score-bug elements the daily update writes into. */
export interface ScoreBugRefs {
  root: HTMLElement
  phaseTab: HTMLElement
  dayNum: HTMLElement
  apMeter: ReturnType<typeof meter>
  trophy: HTMLElement
  trophyCount: HTMLElement
  rank: HTMLElement
  rankRank: HTMLElement
  rankPts: HTMLElement
  rankTitles: HTMLElement
}

/**
 * Top-center score bug: phase tab, day, AP segmented meter, championship
 * tally, and the Bronze ladder standing (save v8). Pure DOM — values are
 * owned by createHud's update().
 */
export function buildScoreBug(): ScoreBugRefs {
  const root = plate({ className: "score-bug" })
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
  // Legend titles (save v14): a collected-titles tally that only shows on
  // the plateau — hidden for every other tier.
  const rankTitles = document.createElement("span")
  rankTitles.className = "score-ladder-titles"
  rankTitles.style.display = "none"
  rank.append(rankRank, rankPts, rankTitles)
  root.append(
    phaseTab,
    scoreDay,
    divider,
    scoreAp,
    divider2,
    trophy,
    divider3,
    rank,
  )
  return {
    root,
    phaseTab,
    dayNum,
    apMeter,
    trophy,
    trophyCount,
    rank,
    rankRank,
    rankPts,
    rankTitles,
  }
}

/** The lineage-plate elements the daily update writes into. */
export interface LineagePlateRefs {
  root: HTMLButtonElement
  familyEl: HTMLElement
  metaEl: HTMLElement
}

/**
 * Top-left lineage plate (legacy track): the family name with its
 * generation numeral and the bloodline's counters. Doubles as the Hall of
 * Fame opener — one surface, one story.
 */
export function buildLineagePlate(): LineagePlateRefs {
  const root = document.createElement("button")
  root.type = "button"
  root.className = "kit-plate hud-lineage"
  root.setAttribute("aria-label", "Lineage and Hall of Fame")
  const tagEl = tab("Lineage", "outline")
  const familyEl = document.createElement("span")
  familyEl.className = "lineage-family"
  const metaEl = document.createElement("span")
  metaEl.className = "lineage-meta"
  root.append(tagEl, familyEl, metaEl)
  return { root, familyEl, metaEl }
}

/** The creature lower-third elements the daily update writes into. */
export interface CreaturePlateRefs {
  root: HTMLElement
  creatureHead: HTMLButtonElement
  collapseButton: HTMLButtonElement
  headRow: HTMLElement
  creatureName: HTMLElement
  stageTab: HTMLElement
  crestEl: HTMLElement
  renameButton: HTMLButtonElement
  nameInput: HTMLInputElement
  renameConfirm: HTMLButtonElement
  renameCancel: HTMLButtonElement
  editRow: HTMLElement
  statCells: Array<{ total: HTMLElement; bonus: HTMLElement; key: StatKey }>
  bars: Array<{
    handle: ReturnType<typeof bar>
    delta: HTMLElement
    key: keyof CreatureConditions
    prev: number | null
  }>
  statusTicker: ReturnType<typeof ticker>
}

/**
 * Bottom-left creature lower-third (broadcast kit plate): head row with
 * collapse/rename affordances, stat cells, condition bars with transient
 * delta chips, and the live-region status ticker. Pure DOM — interaction
 * wiring and values stay with createHud.
 */
export function buildCreaturePlate(): CreaturePlateRefs {
  const root = plate({ className: "creature-plate" })
  // The creature head opens the partner-details modal (coach_knowledge_20261016):
  // crest + name + stage, one tap to the full stat breakdown.
  const creatureHead = document.createElement("button")
  creatureHead.className = "creature-head"
  creatureHead.type = "button"
  creatureHead.title = "Partner details"
  const crestEl = crest("fire")
  const creatureName = document.createElement("span")
  creatureName.className = "creature-name"
  const stageTab = tab("Baby", "stage")
  creatureHead.append(crestEl, creatureName, stageTab)

  // Rename affordance: a sibling button (never nested inside a button) that
  // swaps the head row for an inline edit form.
  const renameButton = document.createElement("button")
  renameButton.className = "rename-button"
  renameButton.type = "button"
  renameButton.title = "Rename partner"
  renameButton.setAttribute("aria-label", "Rename partner")
  renameButton.innerHTML = icons.pencil
  // Collapse affordance: its own button so the head stays free for the
  // details modal. The chevron points down expanded, right collapsed (CSS).
  const collapseButton = document.createElement("button")
  collapseButton.className = "collapse-toggle"
  collapseButton.type = "button"
  collapseButton.title = "Collapse panel"
  collapseButton.setAttribute("aria-label", "Collapse panel")
  collapseButton.setAttribute("aria-expanded", "true")
  const creatureChev = document.createElement("span")
  creatureChev.className = "collapse-chev"
  creatureChev.innerHTML = icons.chevron
  collapseButton.append(creatureChev)
  const headRow = document.createElement("div")
  headRow.className = "creature-headrow"
  headRow.append(creatureHead, renameButton, collapseButton)

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
  root.append(headRow, editRow, statRow, conditionList, statusTicker.root)
  return {
    root,
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
  }
}

/** The onboarding-callout elements the hint selection writes into. */
export interface CalloutRefs {
  root: HTMLElement
  text: HTMLElement
}

/**
 * The onboarding callout (kit plate, lower-center): a coach line with a
 * "Got it" chip. Dismissal is the caller's business — it owns the
 * seen-hints ledger.
 */
export function buildCallout(opts: { onDismiss: () => void }): CalloutRefs {
  const root = document.createElement("div")
  root.className = "kit-plate hud-callout"
  root.style.display = "none"
  const text = document.createElement("p")
  text.className = "hud-callout-text"
  const ok = chip({
    label: "Got it",
    variant: "accent",
    onClick: () => {
      opts.onDismiss()
      root.style.display = "none"
    },
  })
  root.append(text, ok)
  return { root, text }
}
