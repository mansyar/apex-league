/**
 * The bracket board (cup_module_refactor_20261018 FR3): slot filling,
 * match rendering, winner stamps, the champion crown and the strict-order
 * reveal walk. Relocated verbatim from `createCup` — the decisions live
 * in `view-models.ts` (walkStep), this module only touches the DOM.
 */
import type { CupSlot } from "@apex/sim"
import { getSpecies, type RoundVerdict } from "@apex/sim"
import { crestGlyph, elementHue } from "../element"
import type { CupShared, MatchId } from "./shared"
import { walkStep } from "./view-models"

/** The reveal-walk pacing (ms), muted to 0 under reduced motion. */
export const WALK_SETTLE = 600
export const WALK_STAGGER = 700
export const WALK_STEP = 500
export const WALK_CROWN = 1800

const crest = (element: string): string => crestGlyph(element)

/** Element hues: ui/element.ts re-derives from the sim's canonical
 * ELEMENT_HUE contract (single source of truth next to the matchup math). */
const hueColor = (element: string): string =>
  `hsl(${elementHue(element)} 70% 60%)`

const speciesElement = (speciesId: string): string =>
  getSpecies(speciesId)?.element ?? "fire"

/** Create the board renderer + reveal walk over the shared cup context. */
export function createBoard(shared: CupShared): {
  fillSlot(el: HTMLElement, slot: CupSlot | null): void
  renderMatch(id: MatchId): void
  stampWinner(id: MatchId, verdict: RoundVerdict): void
  crown(): void
  walk(): void
  ctaShow(): void
  ctaHide(): void
} {
  const { mem, bracket } = shared
  const { cards, colHeadEls, champ, champName, cta } = bracket

  const ctaShow = (): void => cta.classList.add("show")
  const ctaHide = (): void => cta.classList.remove("show")

  const fillSlot = (el: HTMLElement, slot: CupSlot | null): void => {
    el.replaceChildren()
    if (!slot) {
      el.classList.add("tbd")
      const dash = document.createElement("span")
      dash.className = "cup-dash"
      dash.textContent = "— — —"
      el.append(dash)
      return
    }
    el.classList.remove("tbd")
    const element = speciesElement(slot.speciesId)
    const ic = document.createElement("span")
    ic.className = "cup-mini-crest kit-hex"
    ic.style.color = hueColor(element)
    ic.innerHTML = crest(element)
    const name = document.createElement("span")
    name.className = "cup-s-name"
    name.textContent = slot.name
    el.append(ic, name)
    if (slot.isPlayer) {
      const tag = document.createElement("span")
      tag.className = "cup-you-tag"
      tag.textContent = "You"
      el.append(tag)
    }
  }

  /** Fill both slots of a card; stamps winner/loser when a verdict exists. */
  const renderMatch = (id: MatchId): void => {
    const card = cards.get(id)
    if (!card) return
    const { a, b } = shared.slotsOf(id)
    fillSlot(card.slots.a, a)
    fillSlot(card.slots.b, b)
    const v = shared.verdictOf(id)
    card.el.classList.toggle("resolved", v !== null)
    if (v) stampWinner(id, v)
  }

  /** Gold winner, struck-out loser, ribbon down. */
  const stampWinner = (id: MatchId, verdict: RoundVerdict): void => {
    const card = cards.get(id)
    if (!card) return
    card.el.classList.add("resolved")
    card.el.classList.remove("yours")
    card.ribbon.classList.remove("show")
    const { a, b } = shared.slotsOf(id)
    card.slots.a.classList.toggle("won", a?.name === verdict.winner)
    card.slots.a.classList.toggle(
      "lost",
      a !== null && a.name !== verdict.winner,
    )
    card.slots.b.classList.toggle("won", b?.name === verdict.winner)
    card.slots.b.classList.toggle(
      "lost",
      b !== null && b.name !== verdict.winner,
    )
  }

  const crown = (): void => {
    const name = mem.session?.championName ?? null
    if (!name) return
    champName.textContent = name
    champ.classList.add("crowned")
  }

  const walk = (): void => {
    shared.clearTimer()
    ctaHide()
    const step = mem.session ? walkStep(mem.session, mem.cursor) : undefined
    if (!step || step.kind === "done") {
      shared.conclude()
      return
    }
    const card = cards.get(step.id)
    if (!card) return
    renderMatch(step.id)
    card.el.classList.add("in")
    colHeadEls[card.column].classList.add("in")

    if (step.kind === "playerTurn") {
      // The player's match: highlight, CTA, and pause the walk.
      mem.pendingId = step.id
      card.el.classList.add("yours")
      card.ribbon.classList.add("show")
      shared.setLine(step.line)
      ctaShow()
      return
    }
    mem.pendingId = null
    if (step.kind === "stall") return // defensive: nothing resolved to show
    shared.setLine(step.line)
    const advance = (): void => {
      stampWinner(step.id, step.verdict)
      if (step.after === "crown") {
        crown()
        shared.clearTimer()
        shared.schedule(() => shared.conclude(), WALK_CROWN)
        return
      }
      mem.cursor += 1
      shared.schedule(walk, WALK_STEP)
    }
    // Rival verdicts land one beat after the names appear (staggered reveal).
    shared.schedule(advance, WALK_STAGGER)
  }

  return { fillSlot, renderMatch, stampWinner, crown, walk, ctaShow, ctaHide }
}
