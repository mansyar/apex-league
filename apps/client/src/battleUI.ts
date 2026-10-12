import type { BattleResult } from "@apex/sim"

/** Lower-third subline: what the fight ended on, in announcer voice.
 * Shared verbatim by the spar results screen and the cup results screen. */
export function reasonLine(verdict: Readonly<BattleResult>): string {
  if (verdict.reason === "time") return "The clock ran out on this one."
  if (verdict.reason === "double_ko")
    return "A double down - both went out together."
  return "A knockout finish."
}

/**
 * The side key with the most remaining hp, resolved by the same strict-
 * greater scan both flows used inline (an exact tie falls to the first
 * entry of `finalHp`). Returns null when the record is empty — every-hp-
 * zero still resolves, matching the tie rule.
 */
export function winningSideKey(verdict: Readonly<BattleResult>): string | null {
  let best = -Infinity
  let key: string | null = null
  for (const [side, hp] of Object.entries(verdict.finalHp)) {
    if (hp > best) {
      best = hp
      key = side
    }
  }
  return key
}

import {
  type Creature,
  getMove,
  getSpecies,
  requiredTierDays,
  type SpeciesDef,
  type Tactic,
} from "@apex/sim"
import type { FightCasting } from "./staging"

/** One arena fighter: species-resolved archetype plus the visual seed. */
export type CastFighter = FightCasting["owned"]

/**
 * Resolve one side of a fight into an arena cast. Throws when the species
 * is unknown - the message names the flow so each screen keeps its own
 * wording (cannot cast the spar / cannot cast the cup match).
 */
export function castFighter(input: {
  speciesId: string
  name: string
  seed: number
  key?: string
  context: string
}): CastFighter {
  const species = getSpecies(input.speciesId)
  if (!species) {
    throw new Error(`Unknown species: cannot cast ${input.context}`)
  }
  return {
    archetypeId: species.archetypeId,
    seed: input.seed,
    name: input.name,
    key: input.key,
  }
}

/**
 * The min-2/max-4 kit toggle both pickers enforce (directly in the cup's
 * local picks; through sim validation in the spar). Returns the next
 * selection, or null when the move would break the bounds.
 */
export function toggleKitChoice(
  chosen: readonly string[],
  id: string,
  min: number,
  max: number,
): string[] | null {
  if (chosen.includes(id)) {
    if (chosen.length <= min) return null
    return chosen.filter((m) => m !== id)
  }
  if (chosen.length >= max) return null
  return [...chosen, id]
}

export interface KitPickerClasses {
  /** Unselected move class, e.g. spar-kit-move or cup-pick. */
  base: string
  /** Suffix class for a locked (untrained) move. */
  locked: string
  /** Suffix class for a chosen move. */
  chosen: string
}

/**
 * Build the kit picker rows for one creature's species kit. Pure DOM
 * assembly - the caller owns state: read the selection through chosen
 * and commit changes in onToggle (spar delegates to sim validation and
 * surfaces a rejection hint; cup clamps locally via toggleKitChoice and
 * re-renders). Returns a fragment so the caller decides placement
 * (spar replaceChildren on a bare strip; cup appends into a shared card).
 */
export function buildKitPicker(options: {
  species: SpeciesDef
  creature: Creature
  chosen: () => readonly string[]
  classes: KitPickerClasses
  lockedText: (name: string, remaining: number) => string
  onToggle: (id: string) => void
}): { fragment: DocumentFragment; rows: HTMLButtonElement[] } {
  const { species, creature } = options
  const chosen = options.chosen()
  const fragment = document.createDocumentFragment()
  const rows: HTMLButtonElement[] = []
  species.kit.forEach((id, index) => {
    const name = getMove(id)?.displayName ?? id
    const required = requiredTierDays(index, creature.stage)
    const locked = creature.trainingDays < required
    const row = document.createElement("button")
    row.type = "button"
    row.className = locked
      ? options.classes.base + " " + options.classes.locked
      : chosen.includes(id)
        ? options.classes.base + " " + options.classes.chosen
        : options.classes.base
    row.textContent = locked
      ? options.lockedText(name, required - creature.trainingDays)
      : name
    row.disabled = locked
    if (!locked) {
      row.addEventListener("click", () => options.onToggle(id))
    }
    rows.push(row)
    fragment.append(row)
  })
  return { fragment, rows }
}

export interface TacticButton {
  button: HTMLButtonElement
  tactic: Tactic
}

/**
 * Build the two-button tactic row shared by the spar (label + preview,
 * click starts the fight) and the cup (plain labels, select-then-go).
 * When onClass is given the factory owns the .on selection state;
 * without it buttons stay stateless and every click goes to onPick.
 */
export function buildTacticRow(options: {
  /** Class for the row container itself (`spar-tactics` / `cup-tactic-row`). */
  rowClass: string
  describe: (tactic: Tactic) => {
    label: string
    preview?: string
    labelClass?: string
    previewClass?: string
  }
  classes: { base: string; on?: string }
  initialOn?: Tactic
  onPick: (tactic: Tactic) => void
}): { row: HTMLDivElement; buttons: TacticButton[] } {
  const row = document.createElement("div")
  row.className = options.rowClass
  const buttons: TacticButton[] = []
  for (const tactic of ["balanced", "specials"] as const) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = options.classes.base
    const described = options.describe(tactic)
    if (described.preview !== undefined) {
      const label = document.createElement("span")
      label.className = described.labelClass ?? ""
      label.textContent = described.label
      const preview = document.createElement("span")
      preview.className = described.previewClass ?? ""
      preview.textContent = described.preview
      button.append(label, preview)
    } else {
      button.textContent = described.label
    }
    button.addEventListener("click", () => {
      if (options.classes.on) {
        for (const { button: selected } of buttons) {
          selected.classList.toggle(options.classes.on, selected === button)
        }
      }
      options.onPick(tactic)
    })
    buttons.push({ button, tactic })
    row.append(button)
  }
  if (options.initialOn && options.classes.on) {
    const first = buttons.find((b) => b.tactic === options.initialOn)
    first?.button.classList.add(options.classes.on)
  }
  return { row, buttons }
}
