/**
 * The broadcast kit (broadcast_hud_20261011): shared DOM primitives that
 * every HUD surface is rebuilt on. Factories are plain imperative DOM —
 * no framework, no virtual tree — and run at screen-build time, never
 * per frame. Surfaces own state and wiring; the kit only stamps out
 * structure and classes.
 *
 * Language: warm keyline plates, chamfered corners, skewed AP pips, gold
 * accent CTA. Motion lives in kit.css and collapses under reduced motion
 * (both the saved setting and `prefers-reduced-motion`, see motion.ts).
 * Rejection reasons ride on `data-reason` so every button keeps one size
 * and explains itself on hover instead of growing a reason row.
 */

import { crestGlyph, elementHue } from "../element"
import { icons } from "./icons"

/**
 * The AP meter's static states. A pip is `full` while its action point is
 * unspent, `empty` once spent, and `bonus` for cup-granted extras beyond
 * the daily cap (chevron-cut in CSS). The transient `is-spent` flash is a
 * surface concern: it marks the pip that was just consumed this turn.
 */
export type PipState = "full" | "empty" | "bonus"

/** Pure pip layout: `ap` full pips, then empties to `max`, then bonuses. */
export function pipStates(ap: number, max: number, bonus = 0): PipState[] {
  const pips: PipState[] = []
  for (let i = 0; i < max; i++) pips.push(i < ap ? "full" : "empty")
  for (let i = 0; i < bonus; i++) pips.push("bonus")
  return pips
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** Restart a one-shot CSS animation (remove → reflow → re-add). */
export const replay = (node: HTMLElement, animation: string): void => {
  node.classList.remove(animation)
  void node.offsetWidth
  node.classList.add(animation)
}

export interface PlateOptions {
  chamfer?: "left" | "right"
  className?: string
}

/**
 * A keyline panel: translucent warm fill, 1px keyline, backdrop blur.
 * Chamfers cut a corner diagonally; pass `className` for surface layout.
 */
export function plate(opts: PlateOptions = {}): HTMLDivElement {
  const node = el("div", "kit-plate")
  if (opts.className) node.classList.add(...opts.className.split(" "))
  if (opts.chamfer === "left") node.classList.add("is-chamfer-left")
  if (opts.chamfer === "right") node.classList.add("is-chamfer-right")
  return node
}

export type TabVariant = "accent" | "outline" | "stage"

/** A slanted label tab: accent header, outline badge, or small stage tag. */
export function tab(
  label: string,
  variant: TabVariant = "accent",
): HTMLElement {
  const node = el("span", "kit-tab", label)
  if (variant === "outline") node.classList.add("is-outline")
  if (variant === "stage") node.classList.add("is-stage")
  return node
}

export interface ChipOptions {
  label: string
  glyph?: string
  variant?: "accent" | "dim"
  onClick?: () => void
}

/** A top-right family chip (Spar, Cup, Motion): glyph + short label. */
export function chip(opts: ChipOptions): HTMLButtonElement {
  const node = el("button", "kit-chip")
  node.type = "button"
  if (opts.glyph) node.innerHTML = opts.glyph
  node.append(el("span", "kit-chip-label", opts.label))
  if (opts.variant === "accent") node.classList.add("is-accent")
  if (opts.variant === "dim") node.classList.add("is-dim")
  if (opts.onClick) node.addEventListener("click", opts.onClick)
  return node
}

export interface ButtonOptions {
  label: string
  glyph?: string
  /** AP badge text, e.g. "1 AP". */
  cost?: string
  /** Small accent tag, e.g. "Focus: DEF". */
  tag?: string
  /** Disabled explanation, shown as a hover/focus tooltip. */
  reason?: string
  focus?: boolean
  disabled?: boolean
  onClick?: () => void
}

/**
 * A chamfered action plate: glyph, name, AP badge, optional tag. The
 * disabled state dims the content spans (never the button itself, so the
 * tooltip stays opaque) and explains why on hover/focus.
 */
export function button(opts: ButtonOptions): HTMLButtonElement {
  const node = el("button", "kit-button")
  node.type = "button"
  if (opts.glyph) {
    const glyph = el("span", "kit-button-glyph")
    glyph.innerHTML = opts.glyph
    node.append(glyph)
  }
  node.append(el("span", "kit-button-name", opts.label))
  if (opts.cost) node.append(el("span", "kit-button-cost", opts.cost))
  if (opts.tag) node.append(el("span", "kit-button-tag", opts.tag))
  if (opts.reason) node.dataset.reason = opts.reason
  if (opts.focus) node.classList.add("is-focus")
  node.disabled = opts.disabled === true
  if (node.disabled) node.classList.add("is-disabled")
  if (opts.onClick) node.addEventListener("click", opts.onClick)
  return node
}

/** The gold Advance Day CTA: label left, arrow right, 12px chamfer. */
export function cta(label: string, onClick?: () => void): HTMLButtonElement {
  const node = el("button", "kit-cta")
  node.type = "button"
  node.append(el("span", "kit-cta-label", label))
  const arrow = el("span", "kit-cta-arrow")
  arrow.innerHTML = icons.arrow
  node.append(arrow)
  if (onClick) node.addEventListener("click", onClick)
  return node
}

/**
 * The element crest: a hexagon washed in the element's hue with the
 * shared glyph knocked out dark. Single source of truth via element.ts.
 */
export function crest(element: string): HTMLElement {
  const node = el("span", "kit-crest")
  node.style.setProperty("--hue", String(elementHue(element)))
  node.innerHTML = crestGlyph(element)
  return node
}

export interface MeterHandle {
  root: HTMLElement
  /** Live pip elements, in order — surfaces toggle is-spent/is-empty. */
  pips: HTMLSpanElement[]
}

/** The AP meter: skewed pips; `bonus` pips arrive chevron-cut. */
export function meter(ap: number, max: number, bonus = 0): MeterHandle {
  const root = el("span", "ap-pips")
  const pips = pipStates(ap, max, bonus).map((state) => {
    const pip = el("span", "ap-pip")
    if (state === "empty") pip.classList.add("is-empty")
    if (state === "bonus") pip.classList.add("is-bonus")
    root.append(pip)
    return pip
  })
  return { root, pips }
}

export interface BarHandle {
  root: HTMLElement
  fill: HTMLElement
  value: HTMLElement
  /** Width fraction 0..1 from a value/max pair, clamped. */
  set(value: number, max: number): void
}

export interface BarOptions {
  label: string
  glyph?: string
  value: number
  max: number
  /** CSS color for the fill, e.g. "var(--bar-hunger)". */
  color: string
}

/** One condition row: glyph, label, track, value. */
export function bar(opts: BarOptions): BarHandle {
  const root = el("div", "condition-row")
  if (opts.glyph) {
    const glyph = el("span", "condition-glyph")
    glyph.innerHTML = opts.glyph
    root.append(glyph)
  }
  root.append(el("span", "condition-label", opts.label))
  const track = el("span", "condition-track")
  const fill = el("span", "condition-fill")
  fill.style.background = opts.color
  track.append(fill)
  const value = el("span", "condition-value", String(opts.value))
  root.append(track, value)
  const handle: BarHandle = {
    root,
    fill,
    value,
    set(next, max) {
      const pct = max > 0 ? Math.max(0, Math.min(1, next / max)) : 0
      fill.style.width = `${pct * 100}%`
      value.textContent = String(next)
    },
  }
  handle.set(opts.value, opts.max)
  return handle
}

export interface TickerHandle {
  root: HTMLElement
  /** Announce a line; repeated text is a no-op, new text slide-settles. */
  say(text: string): void
}

/** The announcer line: accent tick + one sentence that settles in. */
export function ticker(): TickerHandle {
  const root = el("div", "kit-ticker")
  const tick = el("span", "kit-ticker-tick")
  const line = el("span", "kit-ticker-line")
  root.append(tick, line)
  return {
    root,
    say(text) {
      if (line.textContent === text) return
      line.textContent = text
      replay(line, "is-settling")
    },
  }
}

export interface StampOptions {
  loss?: boolean
}

/** The verdict stamp carried over from the arena's broadcast language. */
export function stamp(title: string, opts: StampOptions = {}): HTMLElement {
  const node = el("div", "kit-stamp", title)
  if (opts.loss) node.classList.add("is-loss")
  return node
}
