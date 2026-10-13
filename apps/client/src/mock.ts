/**
 * Design mock driver (broadcast_hud_20261011): rebuilds the approved
 * mock entirely from the production kit — ui/kit factories + ui/kit.css
 * — so the approved look is reproduced from real code, not a static
 * drawing. mock.css holds only page chrome and cluster layout, which the
 * surface rebuilds in Phases C/D absorb into their own files.
 */

import "./ui/kit.css"
import "./mock.css"
import { icons } from "./ui/icons"
import {
  bar,
  button,
  chip,
  crest,
  cta,
  meter,
  plate,
  stamp,
  tab,
  ticker,
} from "./ui/kit"

const el = (tag: string, className?: string, text?: string): HTMLElement => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const figure = (caption: string, ...nodes: Node[]): HTMLElement => {
  const item = el("figure", "show-item")
  const row = el("div", "show-row")
  row.append(...nodes)
  item.append(row, el("figcaption", undefined, caption))
  return item
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Ranch stage — the money shot
// ---------------------------------------------------------------------------

const stage = el("section", "stage")
stage.append(
  el("div", "stage-scene"),
  el("div", "stage-sun"),
  el("div", "stage-ground"),
)

// Motion chip — top-left, out of the gameplay path.
const hudMotion = el("div", "hud-motion")
hudMotion.append(
  chip({
    label: "Motion · full",
    variant: "dim",
    onClick: () => {
      motionBox.checked = !motionBox.checked
      document.body.classList.toggle("is-reduced", motionBox.checked)
    },
  }),
)

// Score bug — top-center.
const scoreBug = plate({ className: "score-bug" })
const scorePhase = el("div", "score-phase")
scorePhase.append(tab("Day phase"))
const scoreDay = el("div", "score-day")
scoreDay.append(
  el("span", "score-day-label", "Day"),
  el("span", "score-day-num", "12"),
)
const scoreAp = el("div", "score-ap")
scoreAp.append(el("span", "score-ap-label", "AP"), meter(3, 3).root)
const scoreTrophy = el("div", "score-trophy")
scoreTrophy.innerHTML = `${icons.trophy}<span class="score-trophy-count">× 2</span>`
scoreBug.append(
  scorePhase,
  scoreDay,
  el("div", "score-divider"),
  scoreAp,
  el("div", "score-divider"),
  scoreTrophy,
)

// Creature lower-third — bottom-left.
const creaturePlate = plate({ className: "creature-plate" })
const creatureHead = el("div", "creature-head")
const creatureId = el("div", "creature-id")
creatureId.append(
  crest("fire"),
  el("span", "creature-name", "Ember"),
  tab("Juvenile", "stage"),
)
creatureHead.append(creatureId)

const statRow = el("div", "stat-row")
for (const [label, total, bonus] of [
  ["HP", "26", "+4"],
  ["ATK", "18", "+2"],
  ["DEF", "15", "+3"],
  ["SPD", "12", "+6"],
] as const) {
  const cell = el("div", "stat-cell")
  cell.append(el("span", "stat-label", label), el("span", "stat-total", total))
  if (bonus) cell.append(el("span", "stat-chip", bonus))
  statRow.append(cell)
}

const conditionList = el("div", "condition-list")
const bars = [
  bar({
    label: "Hunger",
    glyph: icons.hunger,
    value: 72,
    max: 100,
    color: "var(--bar-hunger)",
  }),
  bar({
    label: "Energy",
    glyph: icons.energy,
    value: 58,
    max: 100,
    color: "var(--bar-energy)",
  }),
  bar({
    label: "Health",
    glyph: icons.health,
    value: 100,
    max: 100,
    color: "var(--bar-health)",
  }),
  bar({
    label: "Mood",
    glyph: icons.mood,
    value: 80,
    max: 100,
    color: "var(--bar-mood)",
  }),
  bar({
    label: "Bond",
    glyph: icons.bond,
    value: 64,
    max: 100,
    color: "var(--bar-bond)",
  }),
]
conditionList.append(...bars.map((b) => b.root))

const announce = ticker()
announce.say("A full night's rest will sharpen DEF.")
creaturePlate.append(creatureHead, statRow, conditionList, announce.root)

// Command dock — bottom-right.
const dock = plate({ className: "command-dock" })
const dockRow = el("div", "dock-row")
dockRow.append(
  button({ label: "Feed", glyph: icons.feed, cost: "1 AP" }),
  button({ label: "Rest", glyph: icons.rest, cost: "1 AP" }),
  button({
    label: "Treat",
    glyph: icons.treat,
    cost: "1 AP",
    disabled: true,
    reason: "Not sick — save the medicine.",
  }),
  button({ label: "Play", glyph: icons.play, cost: "1 AP" }),
)
const dockTrain = el("div", "dock-train")
dockTrain.append(
  button({
    label: "Train",
    glyph: icons.train,
    cost: "1 AP",
    tag: "Focus: DEF",
  }),
)
const trainPicker = el("div", "train-picker")
for (const [name, note, cls] of [
  ["HP", "26 → 27", ""],
  ["ATK", "18 → 19", ""],
  ["DEF", "focused · +1 tonight", "is-focus"],
  ["SPD", "as sharp as it can get for now", "is-capped"],
] as const) {
  const entry = el("div", `train-entry ${cls}`.trim())
  entry.append(
    el("span", "train-entry-name", name),
    el("span", "train-note", note),
  )
  trainPicker.append(entry)
}
dock.append(dockRow, dockTrain, trainPicker, cta("Advance Day"))

// Chip family — top-right.
const hudChips = el("div", "hud-chips")
const sparChip = document.createElement("button")
sparChip.type = "button"
sparChip.className = "kit-chip"
const sparGlyph = el("span", "kit-chip-glyph")
sparGlyph.innerHTML = icons.spar
sparGlyph.style.color = "var(--accent)"
const sparText = el("span", "battle-text")
sparText.append(
  el("span", "battle-title", "Spar"),
  el("span", "battle-sub", "Free match · no AP"),
)
sparChip.append(sparGlyph, sparText)
hudChips.append(sparChip)

stage.append(hudMotion, scoreBug, creaturePlate, dock, hudChips)

// ---------------------------------------------------------------------------
// Kit showcase
// ---------------------------------------------------------------------------

const showcase = el("section", "showcase")
showcase.append(el("h2", undefined, "Kit primitives"))
const grid = el("div", "show-grid")

const plateRow = el("div", "show-plates")
const p1 = plate({ className: "show-plate" })
p1.append(el("span", undefined, "Plate"))
const p2 = plate({ chamfer: "left", className: "show-plate" })
p2.append(el("span", undefined, "Chamfer L"))
const p3 = plate({ chamfer: "right", className: "show-plate" })
p3.append(el("span", undefined, "Chamfer R"))
plateRow.append(p1, p2, p3)
grid.append(
  figure("plate — blurred dark base, warm keyline, angular cuts", plateRow),
)

const chipRow = el("div", "show-row")
chipRow.append(
  chip({ label: "Chip" }),
  chip({ label: "Accent", variant: "accent" }),
  chip({ label: "Dim", variant: "dim" }),
)
grid.append(figure("chip — top-right family, glyph + label", chipRow))

const tabRow = el("div", "show-row")
tabRow.append(
  tab("Cup day"),
  tab("Day phase", "outline"),
  tab("Stage", "stage"),
)
grid.append(
  figure(
    "tab — phase flips accent on cup day; outline badge / stage badge",
    tabRow,
  ),
)

const buttonCol = el("div", "show-row is-tall")
buttonCol.append(
  button({ label: "Button", cost: "1 AP" }),
  button({
    label: "Disabled",
    cost: "1 AP",
    disabled: true,
    reason: "No AP left today.",
  }),
)
grid.append(
  figure(
    "button — glyph slot, name, AP badge; disabled reasons explain on hover (tooltip)",
    buttonCol,
  ),
)

const shapeCol = el("div", "show-row is-tall shape-row")
for (const [label, cls] of [
  ["Rect", ""],
  ["Slant", "is-slant"],
  ["Notch", "is-notch"],
  ["Shard", "is-shard"],
] as const) {
  const b = button({ label })
  if (cls) b.classList.add(cls)
  shapeCol.append(b)
}
grid.append(
  figure(
    "button shape — rect (the dock wears rect); slant / notch / shard held for kit tuning",
    shapeCol,
  ),
)

const meterFig = el("div", "show-row")
meterFig.append(meter(3, 4, 1).root)
grid.append(
  figure(
    "meter — AP pips: full · spent (flashes) · cup bonus (chevron cut)",
    meterFig,
  ),
)

const barRow = el("div", "show-row is-tall show-bars")
const barHealthy = bar({
  label: "Health",
  glyph: icons.health,
  value: 100,
  max: 100,
  color: "var(--bar-health)",
})
const barLow = bar({
  label: "Energy",
  glyph: icons.energy,
  value: 18,
  max: 100,
  color: "var(--bar-energy)",
})
barLow.fill.classList.add("is-low")
barRow.append(barHealthy.root, barLow.root)
grid.append(figure("bar — healthy and low states (low pulses)", barRow))

const barChange = el("div", "show-row is-tall show-bars")
const barFlash = bar({
  label: "Mood",
  glyph: icons.mood,
  value: 80,
  max: 100,
  color: "var(--bar-mood)",
})
barFlash.fill.classList.add("is-flashing")
const delta = el("em", "condition-delta", "+2")
barFlash.value.append(delta)
barChange.append(barFlash.root)
grid.append(
  figure(
    "bar change feedback — a transient +N/−N pin (shown ~1.2s when a condition moves); not a permanent HUD element",
    barChange,
  ),
)

const crestRow = el("div", "show-row is-tall show-crests")
for (const element of ["fire", "water", "plant", "electric", "earth", "wind"]) {
  crestRow.append(crest(element))
}
grid.append(
  figure("crest — all 6 elements, hex cut, currentColor glyph", crestRow),
)

const stampRow = el("div", "show-row is-tall show-stamps")
stampRow.append(stamp("Victory"), stamp("Defeat", { loss: true }))
grid.append(
  figure("stamp — verdict over the arena (existing language)", stampRow),
)

showcase.append(grid)

// ---------------------------------------------------------------------------
// Starter treatment
// ---------------------------------------------------------------------------

const starterSection = el("section", "starter-mock")
starterSection.append(el("h2", undefined, "Starter overlay"))
const starterFrame = el("div", "starter-frame")
const starterDome = el("div", "starter-dome")
const starterHead = el("div", "starter-head")
starterHead.append(
  tab("Draft day"),
  el("span", "starter-title", "Choose your first partner"),
)
const starterCards = el("div", "starter-cards")
for (const [element, name, flavor] of [
  ["fire", "Fire Drake", "Runs hot on the gauge."],
  ["plant", "Plant Ox", "Grows on the routine."],
  ["water", "Water Axolotl", "Keeps it cool."],
] as const) {
  const card = document.createElement("button")
  card.type = "button"
  card.className = "starter-card"
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

// ---------------------------------------------------------------------------
// Motion notes
// ---------------------------------------------------------------------------

const notes = el("section", "notes")
notes.append(el("h2", undefined, "Motion notes"))
const list = el("ul")
for (const [term, rest] of [
  [
    "Entrance settle",
    " — clusters slide in from their anchor edge with a slight overshoot, staggered ~60ms (score bug → lower-third → dock), on load and screen returns.",
  ],
  [
    "AP spend",
    " — the spent pip flashes out (scale + fade), the remainder re-seat. Bonus pips (cup win) cut in with a chevron notch and glow once.",
  ],
  [
    "Bar change feedback",
    " — a delta ≥ 2 flashes the fill and pins a small +N/−N chip on the value for ~1.2s; low bars (≤ 25) pulse their label.",
  ],
  [
    "Ticker",
    " — status lines swap in with a short slide-settle; priority chain unchanged (training → condition → unlock → growth hint → flavor).",
  ],
  [
    "Hover / press",
    " — buttons lift 1px with a warm keyline brighten on hover; press squashes 0.98. CTA idles with a soft glow when AP is unspent late in the day.",
  ],
  [
    "Reduced motion",
    " — every animation collapses to an opacity crossfade or nothing, honoring the saved setting and prefers-reduced-motion.",
  ],
] as const) {
  const li = el("li")
  li.append(el("strong", undefined, term), document.createTextNode(rest))
  list.append(li)
}
notes.append(list)

document.body.append(header, stage, showcase, starterSection, notes)
