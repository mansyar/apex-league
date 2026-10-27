/**
 * Battle HUD (Phase D, broadcast rework): the arena fight plays full-bleed
 * and this module owns the broadcast chrome — one top-center placard whose
 * skewed plates drain toward the VS chip, a rangefinder with chevrons, the
 * announcer lower-third, and the verdict stamp. Read-only furniture:
 * pointer-events stay off, and everything derives from the same
 * `PlaybackStep` stream the arena staging consumes, so the HUD can never
 * contradict the resolver (hpAfter travels with every step, keyed by the
 * stable side id from the mirror-match fix).
 */
import type { PlaybackStep } from "@apex/sim"
import { crestGlyph, elementHue } from "./element"

/** The rangefinder's two states: bodies touching, or holding at range. */
export type RangeState = "close" | "hold"

/**
 * Range after a step: only an approach closes the distance (the clock's
 * `close` sets *both* fighters near); every other kind keeps the state.
 * The transition is therefore monotonic hold→close — correct while the
 * sim has no knockback; revisit if a step kind ever reopens distance.
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

/** Damage at or above this mark kicks the whole placard, not just the plate. */
const KICK_DAMAGE = 15

/**
 * Hit reaction for one step's damage: the victim's plate always jolts on a
 * landed hit, and heavy hits kick the entire placard for extra weight.
 */
export function hitReaction(damage: number | undefined): {
  jolt: boolean
  kick: boolean
} {
  if (damage === undefined || damage <= 0) return { jolt: false, kick: false }
  return { jolt: true, kick: damage >= KICK_DAMAGE }
}

/** How many rangefinder chevrons light up per state (broadcast field position). */
export function chevronsFor(range: RangeState): number {
  return range === "close" ? 3 : 1
}

const RANGE_LABELS: Record<RangeState, string> = {
  hold: "At range",
  close: "In close",
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
  /** Frame the fight: crests, names, full HP bars, hold range. */
  show(fight: { owned: BattleHudFighter; rival: BattleHudFighter }): void
  /** Sync bars, jolts, rangefinder, and lower-third to one playback step. */
  update(step: PlaybackStep): void
  /** Land the verdict as a broadcast stamp over the arena. */
  stamp(title: string, sub: string): void
  /** Clear the stamp (replay). */
  hideStamp(): void
  /** Strip the HUD (panel closed, back to the ranch). */
  hide(): void
}

/**
 * Restart a one-shot CSS animation on `el` by dropping `cls`, forcing a
 * reflow, and re-adding it — the same trick the lower-third already uses.
 */
const replayClass = (el: HTMLElement, cls: string): void => {
  el.classList.remove(cls)
  void el.offsetWidth
  el.classList.add(cls)
}

/** Build the broadcast HUD (placard, lower third, verdict stamp) and
 *  prepend it to the spar overlay; it derives everything from the
 *  PlaybackStep stream the spar panel already renders. */
export function createBattleHud(overlay: HTMLElement): BattleHud {
  const root = document.createElement("div")
  root.className = "battle-hud"

  // --- placard ---------------------------------------------------------
  const top = document.createElement("div")
  top.className = "battle-hud-top"

  const center = document.createElement("div")
  center.className = "battle-hud-center kit-surface"
  const vs = document.createElement("span")
  vs.className = "battle-hud-vs"
  vs.textContent = "VS"
  const rangeChip = document.createElement("span")
  rangeChip.className = "battle-hud-range"
  const rangeLabel = document.createElement("span")
  rangeLabel.className = "battle-hud-range-label"
  const chevronRow = document.createElement("span")
  chevronRow.className = "battle-hud-chevrons"
  const chevrons: HTMLElement[] = []
  for (let i = 0; i < 3; i++) {
    const chevron = document.createElement("span")
    chevron.className = "battle-hud-chevron"
    chevron.textContent = "▲"
    chevrons.push(chevron)
    chevronRow.append(chevron)
  }
  rangeChip.append(rangeLabel, chevronRow)
  center.append(vs, rangeChip)

  // --- lower-third -----------------------------------------------------
  const lower = document.createElement("div")
  lower.className = "battle-hud-lower"
  const lowerTab = document.createElement("span")
  lowerTab.className = "battle-hud-lower-tab"
  lowerTab.textContent = "APEX FEED"
  const line = document.createElement("span")
  line.className = "battle-hud-line kit-surface"
  // Fight narration lives here while the log is collapsed, so keep it
  // audible to assistive tech too.
  line.setAttribute("aria-live", "polite")
  lower.append(lowerTab, line)

  // --- verdict stamp ---------------------------------------------------
  const stamp = document.createElement("div")
  stamp.className = "battle-stamp"
  // Announced as a status change: screen readers hear the verdict even
  // though the panel (and the log inside it) is hidden during fights.
  stamp.setAttribute("role", "status")
  stamp.setAttribute("aria-live", "polite")
  const stampTitle = document.createElement("div")
  stampTitle.className = "battle-stamp-title"
  const stampRule = document.createElement("div")
  stampRule.className = "battle-stamp-rule"
  const stampSub = document.createElement("div")
  stampSub.className = "battle-stamp-sub"
  stamp.append(stampTitle, stampRule, stampSub)

  root.append(top, lower, stamp)
  // Prepend so the panel (a later positioned sibling) paints above the
  // HUD where their boxes ever meet.
  overlay.prepend(root)

  interface Side {
    el: HTMLDivElement
    fill: HTMLDivElement
    lag: HTMLDivElement
    num: HTMLElement
    name: string
    key: string
    maxHp: number
    /** Previous fill fraction, so the lag chunk can restart its drain. */
    prevFraction: number
    /** Last known raw HP, so victims are detected by an actual drop. */
    lastHp: number
  }
  const sides: Record<"owned" | "rival", Side | null> = {
    owned: null,
    rival: null,
  }
  let rangeState: RangeState = "hold"

  const buildSide = (f: BattleHudFighter, mirror: boolean): Side => {
    const el = document.createElement("div")
    el.className = mirror
      ? "battle-plate battle-plate-right kit-surface"
      : "battle-plate battle-plate-left kit-surface"

    const crest = document.createElement("span")
    crest.className = "battle-crest kit-hex"
    crest.style.setProperty("--hue", String(elementHue(f.element)))
    crest.innerHTML = crestGlyph(f.element)

    const body = document.createElement("div")
    body.className = "battle-plate-body"

    const nameRow = document.createElement("div")
    nameRow.className = "battle-plate-head"
    const name = document.createElement("span")
    name.className = "battle-hud-name"
    name.textContent = f.name
    const num = document.createElement("span")
    num.className = "battle-hp-num"
    num.textContent = String(f.maxHp)
    nameRow.append(name, num)

    const bar = document.createElement("div")
    bar.className = "battle-hp-bar"
    const fill = document.createElement("div")
    fill.className = "battle-hp-fill"
    fill.style.setProperty("--hue", String(elementHue(f.element)))
    const lag = document.createElement("div")
    lag.className = "battle-hp-lag"
    fill.style.width = "100%"
    lag.style.width = "100%"
    bar.append(lag, fill)

    body.append(nameRow, bar)
    // Mirror plates hang their crest off the outside edge, like the mock.
    if (mirror) el.append(body, crest)
    else el.append(crest, body)
    return {
      el,
      fill,
      lag,
      num,
      name: f.name,
      key: f.key,
      maxHp: f.maxHp,
      prevFraction: 1,
      lastHp: f.maxHp,
    }
  }

  /** Damage-lag choreography: the main fill snaps down, the pale chunk
   *  restarts from the previous HP and drains away a beat later. */
  const applyHp = (side: Side, hp: number): void => {
    const fraction = hpFraction(hp, side.maxHp)
    // HP never heals, so an unchanged value means this side wasn't
    // involved in the event — keep the bar and its pop still.
    if (fraction === side.prevFraction) return
    side.fill.style.width = `${fraction * 100}%`
    side.fill.classList.toggle("battle-hud-low", fraction < LOW_HP_FRACTION)
    // The lag chunk restarts from the previous fill with its transition
    // suspended, then drains to the new value on its delayed easing.
    side.lag.style.transition = "none"
    side.lag.style.width = `${side.prevFraction * 100}%`
    void side.lag.offsetWidth
    side.lag.style.transition = ""
    side.lag.style.width = `${fraction * 100}%`
    side.lag.classList.toggle("battle-hud-low", fraction < LOW_HP_FRACTION)
    side.prevFraction = fraction
    side.lastHp = hp
    replayClass(side.num, "battle-hp-pop")
    side.num.textContent = String(Math.max(0, hp))
  }

  /** Jolt the plate(s) the step actually hit: the victim is whichever
   *  side's HP dropped this step — no display-name matching, so a mirror
   *  match jolts exactly one plate. */
  const joltVictims = (
    victims: readonly { side: Side; joltClass: string }[],
    reaction: { jolt: boolean; kick: boolean },
  ): void => {
    if (!reaction.jolt) return
    for (const { side, joltClass } of victims) {
      replayClass(side.el, joltClass)
    }
    if (reaction.kick) replayClass(top, "battle-hud-kick")
  }

  const applyRange = (): void => {
    const lit = chevronsFor(rangeState)
    chevrons.forEach((chevron, i) => {
      chevron.classList.toggle("battle-hud-chevron-lit", i < lit)
    })
    rangeLabel.textContent = RANGE_LABELS[rangeState]
  }

  /** Restart the lower-third's entrance animation on every new line. */
  const setLine = (text: string): void => {
    line.classList.remove("battle-hud-line-in")
    void line.offsetWidth // reflow so the animation genuinely restarts
    line.textContent = text
    line.classList.add("battle-hud-line-in")
  }

  return {
    show(fight) {
      top.replaceChildren()
      const ownedSide = buildSide(fight.owned, false)
      const rivalSide = buildSide(fight.rival, true)
      // Mock order: left plate, VS chip, right plate.
      top.append(ownedSide.el, center, rivalSide.el)
      center.replaceChildren(vs, rangeChip)
      sides.owned = ownedSide
      sides.rival = rivalSide
      rangeState = "hold"
      applyRange()
      line.textContent = ""
      stamp.classList.remove("battle-stamp-in")
      stamp.classList.remove("battle-stamp-show")
      root.style.display = ""
    },
    update(step) {
      const reaction = hitReaction(step.damage)
      const victims: { side: Side; joltClass: string }[] = []
      for (const [side, joltClass] of [
        [sides.owned, "battle-plate-jolt-left"],
        [sides.rival, "battle-plate-jolt-right"],
      ] as const) {
        if (!side) continue
        const hp = step.hpAfter[side.key]
        if (hp === undefined) continue
        if (hp < side.lastHp) victims.push({ side, joltClass })
        applyHp(side, hp)
      }
      joltVictims(victims, reaction)
      rangeState = rangeAfterStep(step.kind, rangeState)
      applyRange()
      setLine(step.line)
    },
    stamp(title, sub) {
      stampTitle.textContent = title
      stampSub.textContent = sub
      stamp.classList.add("battle-stamp-show")
      replayClass(stamp, "battle-stamp-in")
    },
    hideStamp() {
      stamp.classList.remove("battle-stamp-show")
      stamp.classList.remove("battle-stamp-in")
    },
    hide() {
      root.style.display = "none"
      sides.owned = null
      sides.rival = null
    },
  }
}
