/**
 * The kit showcase (mock_modules split): every ui/kit primitive in one grid,
 * fed canned labels. Moved verbatim out of mock.ts.
 */

import { icons } from "../ui/icons"
import { bar, button, chip, crest, meter, plate, stamp, tab } from "../ui/kit"
import { CREST_ELEMENTS, el, figure } from "./data"

/** Build the "Kit primitives" section. */
export function buildShowcase(): HTMLElement {
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
  for (const element of CREST_ELEMENTS) {
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
  return showcase
}
