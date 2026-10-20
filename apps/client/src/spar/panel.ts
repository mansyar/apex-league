/**
 * The spar screen build (spar_modules split): the chip, the panel and its
 * rows, the fight chrome. Moved verbatim out of createSpar — same elements,
 * same classes, same append order. The behaviour (session wiring, the fight
 * and the open/close path) stays in spar.ts.
 */

import type { Tactic } from "@apex/sim"
import { buildTacticRow, renderSpeedButton } from "../battleUI"
import { icons } from "../ui/icons"
import { chipButton, crest } from "../ui/kit"
import { TACTIC_LABELS, TACTIC_PREVIEWS } from "./copy"
import type { SparPanelRefs } from "./types"

/** Build the spar's DOM and hand back its writable surfaces. */
export function buildSparPanel(
  root: HTMLElement,
  onPickTactic: (tactic: Tactic) => void,
): SparPanelRefs {
  // Top-right spar chip: its own control, separate from the care cluster.
  // Kit chip with the mock's title/sub text stack.
  const { button: sparButton } = chipButton({
    glyph: icons.spar,
    title: "Spar",
    sub: "Free match · no AP",
  })
  sparButton.className = "spar-button kit-chip"
  root.append(sparButton)

  // Center overlay panel, hidden until the whistle.
  const overlay = document.createElement("div")
  overlay.className = "spar-overlay"
  overlay.style.display = "none"

  const panel = document.createElement("div")
  panel.className = "spar-panel kit-plate"

  const heading = document.createElement("div")
  heading.className = "spar-heading"
  heading.textContent = "Sparring"

  const intro = document.createElement("div")
  intro.className = "spar-intro"

  const rivalRow = document.createElement("div")
  rivalRow.className = "spar-rival"
  const rivalName = document.createElement("span")
  rivalName.className = "spar-rival-name"
  const rivalCrest = crest("fire")
  rivalRow.append(rivalName, rivalCrest)

  const rivalDetail = document.createElement("div")
  rivalDetail.className = "spar-detail"

  // Kit-gate progress (FR5): the next locked tier and its remaining days.
  const progress = document.createElement("div")
  progress.className = "spar-progress"

  const cards = document.createElement("div")
  cards.className = "spar-cards"
  const ownedCard = document.createElement("div")
  ownedCard.className = "spar-card"
  const rivalCard = document.createElement("div")
  rivalCard.className = "spar-card"
  cards.append(ownedCard, rivalCard)

  // Loadout row (FR5): the kit picker feeding this spar through setLoadout.
  const loadoutRow = document.createElement("div")
  loadoutRow.className = "spar-loadout-row"
  const loadoutLabel = document.createElement("span")
  loadoutLabel.className = "spar-loadout-label"
  loadoutLabel.textContent = "Kit"
  const kitStrip = document.createElement("div")
  kitStrip.className = "spar-kit"
  const kitHint = document.createElement("span")
  kitHint.className = "spar-loadout-hint"
  const resetPill = document.createElement("button")
  resetPill.className = "spar-kit-reset"
  resetPill.type = "button"
  resetPill.textContent = "Reset kit"
  loadoutRow.append(loadoutLabel, kitStrip, resetPill, kitHint)

  const { row: tactics, buttons: tacticButtons } = buildTacticRow({
    rowClass: "spar-tactics",
    describe: (tactic) => ({
      label: TACTIC_LABELS[tactic],
      preview: TACTIC_PREVIEWS[tactic],
      labelClass: "spar-tactic-label",
      previewClass: "spar-preview",
    }),
    classes: { base: "spar-tactic" },
    onPick: (tactic) => onPickTactic(tactic),
  })

  const fastButton = document.createElement("button")
  fastButton.className = "spar-fast"
  fastButton.type = "button"
  renderSpeedButton(fastButton, "paced")
  fastButton.style.display = "none"

  // Reduced-motion pill: replays the finished fight as a text-only stepped
  // log so those users get agency instead of a wall of text (2026-10-10).
  const replayButton = document.createElement("button")
  replayButton.className = "spar-replay"
  replayButton.type = "button"
  replayButton.textContent = "Replay slowly"
  replayButton.style.display = "none"

  // Secondary log (Phase D): the battle-HUD announcer carries the live
  // line, so the full log demotes to a compact collapsible box — closed
  // by default, opens on demand, still records every event.
  const logBox = document.createElement("div")
  logBox.className = "spar-logbox"
  const logToggle = document.createElement("button")
  logToggle.className = "spar-log-toggle"
  logToggle.type = "button"
  logToggle.textContent = "Battle log"
  logToggle.setAttribute("aria-expanded", "false")
  const log = document.createElement("div")
  log.className = "spar-log"
  log.hidden = true
  logBox.append(logToggle, log)

  const close = document.createElement("button")
  close.className = "spar-close kit-chip is-accent"
  close.type = "button"
  close.textContent = "Back to the ranch"
  close.style.display = "none"

  // Always-available exit on the pre-fight panel: a compact X chip pinned
  // to the panel's top-right corner. Hiding the panel (battle start)
  // hides it with the rest of the panel contents.
  const panelClose = document.createElement("button")
  panelClose.className = "spar-panel-close kit-chip is-dim"
  panelClose.type = "button"
  panelClose.setAttribute("aria-label", "Close sparring")
  panelClose.innerHTML = icons.close

  panel.append(
    panelClose,
    heading,
    intro,
    rivalRow,
    rivalDetail,
    progress,
    cards,
    loadoutRow,
    tactics,
  )
  overlay.append(panel)

  // Fight chrome (Phase D broadcast rework): while the panel is hidden the
  // arena plays full-bleed and these chips are the only controls left.
  const chips = document.createElement("div")
  chips.className = "spar-chips"
  chips.style.display = "none"
  chips.append(fastButton, replayButton, logBox, close)
  overlay.append(chips)
  root.append(overlay)

  return {
    sparButton,
    overlay,
    panel,
    heading,
    intro,
    rivalName,
    rivalCrest,
    rivalDetail,
    progress,
    ownedCard,
    rivalCard,
    loadoutRow,
    kitStrip,
    kitHint,
    resetPill,
    tactics,
    tacticButtons,
    fastButton,
    replayButton,
    logBox,
    logToggle,
    log,
    close,
    panelClose,
    chips,
  }
}
