/**
 * Design mock driver (broadcast_hud_20261011): rebuilds the approved mock
 * entirely from production code — the hud.ts cluster builders fed canned
 * values, the ui/kit primitives, and the real ranch.css surface styles.
 * Structural drift with the live HUD is impossible by construction: the
 * mock renders the same DOM the game does. mock.css holds only page
 * chrome, the stage scenery, and showcase layout.
 */

import "./ui/kit.css"
import "./ranch.css"
// spar.css owns the camera-chip visibility rule (ranch hides it; the
// arena shows it) — importing it keeps the pill row identical to live.
import "./spar.css"
import "./mock.css"
import type { CreatureConditions } from "@apex/sim"
import {
  buildCommandDock,
  buildCreaturePlate,
  buildScoreBug,
  buildSettingsChips,
} from "./hud"
import { icons } from "./ui/icons"
import { bar, button, chip, crest, meter, plate, stamp, tab } from "./ui/kit"

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

// Settings cluster — the real top-left pills. The motion chip drives the
// page's reduced-motion demo toggle; the camera/reset chips render for
// structural parity with the live HUD (no-ops on a static page).
const { motionWrap } = buildSettingsChips({
  onToggleReducedMotion: () => {
    motionBox.checked = !motionBox.checked
    document.body.classList.toggle("is-reduced", motionBox.checked)
  },
  onToggleArenaCamera: () => {},
  onNewGame: () => {},
})

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
rankPts.textContent = "40/60"

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
const cannedStats: Array<[string, number, number]> = [
  ["hp", 26, 4],
  ["atk", 18, 2],
  ["def", 15, 3],
  ["spd", 12, 6],
]
for (const [key, total, trained] of cannedStats) {
  const cell = statCells.find((c) => c.key === key)
  if (!cell) continue
  cell.total.textContent = String(total)
  if (trained > 0) cell.bonus.textContent = `+${trained}`
}
const cannedConditions: Array<[keyof CreatureConditions, number]> = [
  ["hunger", 72],
  ["energy", 58],
  ["health", 100],
  ["mood", 80],
  ["bond", 64],
]
for (const [key, value] of cannedConditions) {
  const entry = bars.find((b) => b.key === key)
  if (entry) entry.handle.set(value, 100)
}
statusTicker.say("A full night's rest will sharpen DEF.")

// Command dock — bottom-right, canned focus (DEF) with one capped stat.
const {
  root: dock,
  actionButtons,
  trainTag,
  pickerButtons,
} = buildCommandDock({
  onCare: () => {},
  onTrain: () => {},
  onAdvanceDay: () => {},
})
for (const { button: btn, action } of actionButtons) {
  if (action === "treat") {
    btn.disabled = true
    btn.title = "Not sick — save the medicine."
  }
}
if (trainTag) trainTag.textContent = "Focus: DEF"
for (const { button: btn, note, key } of pickerButtons) {
  if (key === "def") {
    btn.classList.add("is-focus")
    note.textContent = "focused · +1 tonight"
  } else if (key === "spd") {
    btn.classList.add("is-capped")
    btn.disabled = true
    note.textContent = "as sharp as it can get for now"
  } else {
    note.textContent = key === "hp" ? "26 → 27" : "18 → 19"
  }
}

stage.append(motionWrap, scoreBug, creaturePlate, dock)

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
// Responsive tiers (responsive_foundation_20261013)
// ---------------------------------------------------------------------------

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
for (const [tier, note] of [
  ["base", "phone portrait — HUD plates stack, dock collapsed by default"],
  ["≥480px", "large phone / small tablet — plates may expand"],
  ["≥768px", "tablet portrait — two-column arrangements"],
  ["≥1024px", "tablet landscape — near-full layouts"],
  ["≥1200px", "desktop — the pre-responsive corner-pinned layout"],
] as const) {
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
    onAdvanceDay: () => {},
  }).root,
)
phoneScene.append(
  buildSettingsChips({
    onToggleReducedMotion: () => {},
    onToggleArenaCamera: () => {},
    onNewGame: () => {},
  }).motionWrap,
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

document.body.append(header, stage, showcase, starterSection, responsive, notes)
