/**
 * The Moves page's six pool rows for the creature-detail modal (moved out of
 * creature-detail.ts to keep that module under the 12,288 B cap): equipped
 * moves read "In kit", known moves read "Learned", and locked ones carry
 * their gate. The gate copy is the same language the picker uses so a coach
 * can map one to the other.
 */
import {
  type Creature,
  defaultLoadout,
  getMove,
  getSpecies,
  knownMoves,
  requiredTierDays,
} from "@apex/sim"

export function kitRows(creature: Creature): HTMLElement[] {
  const species = getSpecies(creature.speciesId)
  if (!species) return []
  const known = new Set(knownMoves(creature, species))
  const equipped = new Set(
    creature.loadout ?? defaultLoadout(creature, species),
  )
  return species.kit.map((id, index) => {
    const row = document.createElement("div")
    row.className = "detail-kit-row"
    const name = document.createElement("span")
    name.className = "detail-kit-name"
    name.textContent = getMove(id)?.displayName ?? id
    const state = document.createElement("span")
    state.className = "detail-kit-state"
    if (equipped.has(id)) {
      state.textContent = "In kit"
      state.dataset.state = "equipped"
    } else if (known.has(id)) {
      state.textContent = "Learned"
      state.dataset.state = "known"
    } else {
      const remaining =
        requiredTierDays(index, creature.stage) - creature.trainingDays
      const spell = remaining === 1 ? "day" : "days"
      state.textContent =
        index === 2 && creature.stage === "baby"
          ? `${remaining} ${spell}, or evolve`
          : `${remaining} ${spell}`
      state.dataset.state = "locked"
    }
    row.append(name, state)
    return row
  })
}
