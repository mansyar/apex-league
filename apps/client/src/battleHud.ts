/**
 * Battle HUD (Phase D): the broadcast overlays that ride the spar
 * overlay's margins while a fight plays — dual HP bars with names up
 * top, a rangefinder chip between them, and the announcer lower-third
 * at the bottom edge. Read-only broadcast furniture: pointer-events
 * stay off, and everything derives from the same `PlaybackStep` stream
 * the arena staging consumes, so the HUD can never contradict the
 * resolver (hpAfter travels with every step).
 */
import type { PlaybackStep } from "@apex/sim"
import { ELEMENT_HUE } from "./staging"

/** The rangefinder's two states: bodies touching, or holding at range. */
export type RangeState = "close" | "hold"

/**
 * Range after a step: only an approach closes the distance (the clock's
 * `close` sets *both* fighters near); every other kind keeps the state.
 */
export function rangeAfterStep(
  kind: PlaybackStep["kind"],
  prev: RangeState,
): RangeState {
  return kind === "approach" ? "close" : prev
}

/** HP bar fill 0..1; floored at 0 (overkill) and safe against a max of 0. */
export function hpFraction(hp: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(1, Math.max(0, hp / max))
}

const RANGE_LABELS: Record<RangeState, string> = {
  hold: "Holding range",
  close: "Close quarters",
}

/** Below this fill fraction the bar reads danger. */
const LOW_HP_FRACTION = 0.25

export interface BattleHudFighter {
  /** Display name for the bar label. */
  name: string
  /** Stable hpAfter key (BattleSide.id); names collide in mirror matches. */
  key: string
  element: string
  maxHp: number
}

export interface BattleHud {
  /** Frame the fight: names, element badges, full HP bars, hold range. */
  show(fight: { owned: BattleHudFighter; rival: BattleHudFighter }): void
  /** Sync bars, rangefinder, and lower-third to one playback step. */
  update(step: PlaybackStep): void
  /** Strip the HUD (panel closed, back to the ranch). */
  hide(): void
}

export function createBattleHud(overlay: HTMLElement): BattleHud {
  const root = document.createElement("div")
  root.className = "spar-hud"

  const top = document.createElement("div")
  top.className = "spar-hud-top"

  const range = document.createElement("span")
  range.className = "spar-hud-range"

  const lower = document.createElement("div")
  lower.className = "spar-hud-lower"
  const line = document.createElement("span")
  line.className = "spar-hud-line"
  lower.append(line)

  root.append(top, lower)
  // Prepend so the panel (a later positioned sibling) paints above the
  // HUD where their boxes ever meet.
  overlay.prepend(root)

  interface Side {
    el: HTMLDivElement
    fill: HTMLDivElement
    key: string
    maxHp: number
  }
  const sides: Record<"owned" | "rival", Side | null> = {
    owned: null,
    rival: null,
  }
  let rangeState: RangeState = "hold"

  const buildSide = (f: BattleHudFighter, mirror: boolean): Side => {
    const el = document.createElement("div")
    el.className = mirror ? "spar-hud-side spar-hud-right" : "spar-hud-side"

    const nameRow = document.createElement("div")
    nameRow.className = "spar-hud-name-row"
    const name = document.createElement("span")
    name.className = "spar-hud-name"
    name.textContent = f.name
    const badge = document.createElement("span")
    badge.className = `element-badge el-${f.element}`
    badge.textContent = f.element
    nameRow.append(name, badge)

    const hp = document.createElement("div")
    hp.className = "spar-hud-hp"
    const fill = document.createElement("div")
    const hue = ELEMENT_HUE[f.element] ?? 200
    fill.className = "spar-hud-hp-fill"
    fill.style.setProperty("--hue", String(hue))
    fill.style.width = "100%"
    hp.append(fill)

    el.append(nameRow, hp)
    top.append(el)
    return { el, fill, key: f.key, maxHp: f.maxHp }
  }

  /** Restart the lower-third's entrance animation on every new line. */
  const setLine = (text: string): void => {
    line.classList.remove("spar-hud-line-in")
    void line.offsetWidth // reflow so the animation genuinely restarts
    line.textContent = text
    line.classList.add("spar-hud-line-in")
  }

  return {
    show(fight) {
      top.replaceChildren()
      const ownedSide = buildSide(fight.owned, false)
      const rivalSide = buildSide(fight.rival, true)
      // The rangefinder chip sits between the two bars.
      top.insertBefore(range, rivalSide.el)
      sides.owned = ownedSide
      sides.rival = rivalSide
      rangeState = "hold"
      range.textContent = RANGE_LABELS.hold
      line.textContent = ""
      root.style.display = ""
    },
    update(step) {
      for (const side of [sides.owned, sides.rival]) {
        if (!side) continue
        const hp = step.hpAfter[side.key]
        if (hp === undefined) continue
        const fraction = hpFraction(hp, side.maxHp)
        side.fill.style.width = `${fraction * 100}%`
        side.fill.classList.toggle("spar-hud-low", fraction < LOW_HP_FRACTION)
      }
      rangeState = rangeAfterStep(step.kind, rangeState)
      range.textContent = RANGE_LABELS[rangeState]
      setLine(step.line)
    },
    hide() {
      root.style.display = "none"
      sides.owned = null
      sides.rival = null
    },
  }
}
