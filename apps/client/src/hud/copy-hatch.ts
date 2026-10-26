/**
 * The league-reward hatch moment (species roster FR-7/FR-8): the one coach
 * line that names the partner that just hatched and the numbers it came with.
 *
 * Single-sourced like the rest of the HUD copy: the species name comes from
 * the sim's catalog (never a literal per line), and the four stat names are
 * spelled out so the reading never rides a colour or an icon.
 */
import { type Creature, getSpecies, type StatKey } from "@apex/sim"

/** The stat names, in the plate's order — the same four every surface shows. */
const STAT_ORDER: ReadonlyArray<{ key: StatKey; label: string }> = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
]

/** `HP 78 · ATK 10 · DEF 9 · SPD 12` — the hatched pet's own numbers. */
export function hatchStatLine(creature: Creature): string {
  return STAT_ORDER.map(
    ({ key, label }) => `${label} ${creature.stats[key]}`,
  ).join(" · ")
}

/**
 * The hatch callout: two sentences at most. The first names the partner and
 * where it went (the stable — the ranch pet is untouched), the second reads
 * out its four stats.
 */
export function hatchCallout(creature: Creature): string {
  const species = getSpecies(creature.speciesId)
  const name = species?.displayName ?? creature.name
  return `${name} hatched — it waits in the stable for its turn. ${hatchStatLine(creature)}.`
}
