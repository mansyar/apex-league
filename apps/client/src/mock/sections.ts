/**
 * The mock's page sections (mock_modules split): header, the ranch stage money
 * shot, the starter treatment, the responsive tiers and the motion notes.
 * Moved verbatim out of mock.ts.
 */

import { buildHandbook } from "../handbook"
import { buildCommandDock, buildCreaturePlate, buildScoreBug } from "../hud"
import { buildPrefCluster, buildSettingsModal } from "../settings-modal"
import { crest, meter, tab } from "../ui/kit"
import {
  cannedConditions,
  cannedStats,
  el,
  MOTION_NOTES,
  STARTER_CARDS,
  TIER_ROWS,
} from "./data"

/** The reduced-motion demo toggle is owned by the header, read by the stage. */
export interface MockHeader {
  root: HTMLElement
  motionBox: HTMLInputElement
}

/** The mock's page header and its reduced-motion demo toggle. */
export function buildHeader(): MockHeader {
  const header = el("header", "mock-header")
  header.append(
    el("span", "mock-tag", "DESIGN MOCK · BROADCAST_HUD_20261011 · APPROVED"),
  )
  header.append(el("h1", undefined, "Broadcast HUD Overhaul"))
  header.append(
    el(
      "p",
      undefined,
      "Rebuilt from the production kit (ui/kit.ts + kit.css). Ranch clusters are the money shot; the showcase below lists every primitive the kit ships. Toggle reduced motion to preview the muted state.",
    ),
  )

  const motionToggle = document.createElement("label")
  motionToggle.className = "mock-toggle"
  const motionBox = document.createElement("input")
  motionBox.type = "checkbox"
  motionToggle.append(motionBox, document.createTextNode("Reduced motion"))
  header.append(motionToggle)
  motionBox.addEventListener("change", () => {
    document.body.classList.toggle("is-reduced", motionBox.checked)
  })
  return { root: header, motionBox }
}

/** The ranch stage: the money shot, built from the live HUD clusters. */
export function buildStage(motionBox: HTMLInputElement): HTMLElement {
  const stage = el("section", "stage kit-line")
  stage.append(
    el("div", "stage-scene"),
    el("div", "stage-sun"),
    el("div", "stage-ground"),
  )

  // Settings cluster — the real top-left pills in the live HUD's order
  // (Settings, then Handbook). The settings modal's motion row drives the
  // page's reduced-motion demo toggle; the handbook opens its real modal.
  const settings = buildSettingsModal({
    onToggleReducedMotion: () => {
      motionBox.checked = !motionBox.checked
      document.body.classList.toggle("is-reduced", motionBox.checked)
    },
    // The design mock has no real audio: the sound chip just flips its own
    // label so the modal's four-row layout stays honest in the gallery.
    onToggleMuted: () => {
      mockMuted = !mockMuted
      const label =
        settings.soundChip.querySelector<HTMLElement>(".kit-chip-label")
      if (label) label.textContent = mockMuted ? "Sound: muted" : "Sound: on"
      settings.soundChip.setAttribute(
        "aria-pressed",
        mockMuted ? "true" : "false",
      )
    },
  })
  let mockMuted = false
  const handbook = buildHandbook()
  const motionWrap = buildPrefCluster(
    () => settings.open(),
    () => handbook.open(),
  )

  // Score bug — top-center, canned day 12 with a full AP meter, two
  // championships and a Bronze III standing.
  const {
    root: scoreBug,
    dayNum,
    apMeter,
    trophy,
    trophyCount,
    rankRank,
    rankPts,
  } = buildScoreBug()
  dayNum.textContent = "12"
  // The meter handle is immutable in the kit (hud rebuilds it on AP
  // changes); a static mock simply swaps in a full meter.
  apMeter.root.replaceWith(meter(3, 3).root)
  trophyCount.textContent = "× 2"
  trophy.style.display = ""
  rankRank.textContent = "Bronze III"
  rankPts.textContent = "2/6"

  // Creature lower-third — bottom-left, canned juvenile Ember Drake with
  // trained stats, condition values and a ticker line.
  const {
    root: creaturePlate,
    creatureName,
    stageTab,
    statCells,
    bars,
    statusTicker,
  } = buildCreaturePlate()
  creatureName.textContent = "Ember"
  stageTab.textContent = "Juvenile"
  for (const [key, total, trained] of cannedStats) {
    const cell = statCells.find((c) => c.key === key)
    if (!cell) continue
    cell.total.textContent = String(total)
    if (trained > 0) cell.bonus.textContent = `+${trained}`
  }
  for (const [key, value] of cannedConditions) {
    const entry = bars.find((b) => b.key === key)
    if (entry) entry.handle.set(value, 100)
  }
  statusTicker.say("A full night's rest will sharpen DEF.")

  // Command dock — bottom-right, canned program (Power Lifting) with the
  // picker folded out and one capped stat.
  const {
    root: dock,
    dockHeadMeta,
    actionButtons,
    trainName,
    picker,
    pickerRows,
  } = buildCommandDock({
    onCare: () => {},
    onTrain: () => {},
    onClosePicker: () => {},
    onAdvanceDay: () => {},
    onGraduate: () => {},
  })
  for (const { button: btn, action } of actionButtons) {
    if (action === "treat") {
      btn.disabled = true
      btn.title = "Not sick — save the medicine."
    }
  }
  dockHeadMeta.textContent = "Power Lifting"
  if (trainName) trainName.textContent = "Training: Power Lifting"
  picker.style.display = ""
  dock.dataset.picking = "true"
  for (const { button: btn, note, assigned, id } of pickerRows) {
    if (id === "power") {
      btn.classList.add("is-focus")
      btn.setAttribute("aria-checked", "true")
      btn.tabIndex = 0
      assigned.hidden = false
      note.textContent = "+1 ATK"
    } else if (id === "sprint") {
      btn.classList.add("is-capped")
      btn.disabled = true
      note.textContent = "SPD capped"
    } else {
      note.textContent = id === "endurance" ? "+1 HP" : "+1 ATK"
    }
  }

  stage.append(
    motionWrap,
    settings.root,
    handbook.root,
    scoreBug,
    creaturePlate,
    dock,
  )
  return stage
}

/** The starter overlay treatment. */
export function buildStarterSection(): HTMLElement {
  const starterSection = el("section", "starter-mock")
  starterSection.append(el("h2", undefined, "Starter overlay"))
  const starterFrame = el("div", "starter-frame")
  const starterDome = el("div", "starter-dome kit-line")
  const starterHead = el("div", "starter-head")
  starterHead.append(
    tab("Draft day"),
    el("span", "starter-title", "Choose your first partner"),
  )
  const starterCards = el("div", "starter-cards")
  for (const [element, name, flavor] of STARTER_CARDS) {
    const card = document.createElement("button")
    card.type = "button"
    card.className = "starter-card kit-line"
    card.append(
      crest(element),
      el("span", "starter-name", name),
      el("span", "starter-flavor", flavor),
    )
    starterCards.append(card)
  }
  starterDome.append(starterHead, starterCards)
  starterFrame.append(starterDome)
  starterSection.append(starterFrame)
  return starterSection
}

/** The responsive tiers section, including the 390px phone island. */
export function buildResponsiveSection(): HTMLElement {
  const responsive = el("section", "resp")
  responsive.append(el("h2", undefined, "Responsive tiers"))
  responsive.append(
    el(
      "p",
      undefined,
      "Mobile-first breakpoint tiers — the base styles target a phone and each tier restores density and full layouts. Surfaces write their own media queries against these exact widths.",
    ),
  )
  const tierList = el("ul", "resp-tiers")
  for (const [tier, note] of TIER_ROWS) {
    const li = el("li")
    li.append(el("span", "resp-tier-tag", tier), document.createTextNode(note))
    tierList.append(li)
  }
  responsive.append(tierList)

  /* Phone frame — a 390px container-query island showing the base-tier
     ranch HUD arrangement with the same cluster factories as the stage. */
  /* Phone frame — a 390px container-query island showing the base-tier
     ranch HUD arrangement. The clusters are re-mounted from the same real
     hud.ts builders as the stage (each call builds fresh DOM), so the
     responsive preview cannot drift from the live HUD either. */
  const phoneFrame = el("div", "resp-phone")
  const phoneScene = el("div", "resp-scene")
  const phoneStack = el("div", "resp-dock-stack")
  const phonePlate = buildCreaturePlate().root
  phonePlate.classList.add("is-collapsed")
  phoneStack.append(
    phonePlate,
    buildCommandDock({
      onCare: () => {},
      onTrain: () => {},
      onClosePicker: () => {},
      onAdvanceDay: () => {},
      onGraduate: () => {},
    }).root,
  )
  phoneScene.append(
    buildPrefCluster(
      () => {},
      () => {},
    ),
    buildScoreBug().root,
    phoneStack,
  )
  phoneFrame.append(phoneScene)
  responsive.append(
    el(
      "p",
      "resp-caption",
      "The 390px frame previews the base (phone) tier: stacked bottom plates, collapsed lower-third, compacted score bug. Container-query driven, so it renders the phone arrangement at any window width.",
    ),
  )
  responsive.append(phoneFrame)
  return responsive
}

/** The motion notes section. */
export function buildNotes(): HTMLElement {
  const notes = el("section", "notes")
  notes.append(el("h2", undefined, "Motion notes"))
  const list = el("ul")
  for (const [term, rest] of MOTION_NOTES) {
    const li = el("li")
    li.append(el("strong", undefined, term), document.createTextNode(rest))
    list.append(li)
  }
  notes.append(list)
  return notes
}
