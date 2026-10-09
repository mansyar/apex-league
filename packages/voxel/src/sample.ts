import { makeRng } from "./rng"
import type { Dna, Template } from "./schema"

/**
 * Derive an individual's DNA from an arbitrary seed, sampled uniformly inside
 * the archetype template's declared bounds. Same seed -> same DNA, always.
 */
export function sampleDna(template: Template, seed: number): Dna {
  const rng = makeRng(seed)

  const proportions: Record<string, number> = {}
  for (const [key, range] of Object.entries(template.proportions)) {
    proportions[key] = range.min + rng.next() * (range.max - range.min)
  }

  const styles: Record<string, string> = {}
  const styleParams: Record<string, number> = {}
  for (const [slot, defs] of Object.entries(template.styles)) {
    const def = defs[rng.int(defs.length)]
    if (!def) throw new Error(`style slot "${slot}" has no styles`)
    styles[slot] = def.id
    for (const [param, range] of Object.entries(def.params)) {
      styleParams[param] = range.min + rng.next() * (range.max - range.min)
    }
  }

  const rarity: string[] = []
  for (const gate of template.rarity) {
    if (rng.next() < 1 / gate.weight) rarity.push(gate.id)
  }

  return {
    archetype: template.id,
    archetypeVersion: template.version,
    seed,
    proportions,
    styles,
    styleParams,
    rarity,
  }
}
