/**
 * The spar's setup rows (spar_modules split): the rival read-out (name, crest,
 * tactic/temperament/seed line, cards) and the combat-prep readout (stat card,
 * kit-gate progress, the kit picker). Moved verbatim out of spar.ts.
 */

import { battleStats, type Creature, formTier, getSpecies } from "@apex/sim"
import { buildKitPicker } from "../battleUI"
import { crestGlyph, elementHue } from "../element"
import { formReadout } from "../hud/copy-care"
import { TACTIC_LABELS, TEMPERAMENT_LINES } from "./copy"
import {
  kitHintMessage,
  kitProgress,
  loadoutOf,
  statLine,
  toggleKit,
} from "./loadout-vm"
import type { SparHandlers, SparPanelRefs, SparSetup } from "./types"

/** Write the rival's row and both fighters' cards for one setup. */
export function renderRival(
  refs: SparPanelRefs,
  setup: SparSetup,
  battleSeed: number,
): void {
  const { rivalName, rivalCrest, rivalDetail, ownedCard, rivalCard } = refs
  rivalName.textContent = setup.rival.name
  rivalCrest.innerHTML = crestGlyph(setup.rival.element)
  rivalCrest.style.setProperty("--hue", String(elementHue(setup.rival.element)))
  rivalDetail.textContent = `Rival tactic: ${
    TACTIC_LABELS[setup.rivalTactic]
  } · ${TEMPERAMENT_LINES[setup.rivalSide.temperament]} · Seed ${battleSeed}`
  ownedCard.className = `spar-card el-border-${setup.ownedSide.element}`
  rivalCard.className = `spar-card el-border-${setup.rivalSide.element}`
  rivalCard.textContent = `${setup.rivalSide.name} — ${statLine(setup.rivalSide.stats)}`
}

/**
 * The combat-prep readout: effective stat card with trained chips, the
 * kit-gate progress line, and the picker row (FR5). Called on open and
 * whenever the creature reference changes while the panel is up.
 */
export function refreshPrep(
  refs: SparPanelRefs,
  creature: Creature,
  onSetLoadout: SparHandlers["onSetLoadout"],
): void {
  const { ownedCard, progress, kitStrip, kitHint } = refs
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error(`Unknown species: ${creature.speciesId}`)

  // The owned card reads the fight's own stat line — `battleStats` is the seam
  // the spar's owned side resolves with — plus one form line under it. The
  // rival card stays form-neutral on purpose: rivals are generated fresh, so
  // they have no care history to read.
  ownedCard.textContent = `${creature.name} — ${statLine(
    battleStats(creature),
    creature.trained,
  )}`
  const form = document.createElement("div")
  form.className = "spar-form"
  form.textContent = formReadout(formTier(creature))
  ownedCard.append(form)

  progress.textContent = kitProgress(creature, species)

  const chosen = loadoutOf(creature, species)
  const picker = buildKitPicker({
    species,
    creature,
    chosen: () => chosen,
    classes: {
      base: "spar-kit-move",
      locked: "spar-kit-locked",
      chosen: "spar-kit-chosen",
    },
    onToggle: (id) => {
      kitHint.textContent = ""
      const next = toggleKit(chosen, id)
      try {
        onSetLoadout?.(next)
      } catch (error) {
        kitHint.textContent = kitHintMessage(error)
      }
    },
  })
  kitStrip.replaceChildren(picker.fragment)
}
