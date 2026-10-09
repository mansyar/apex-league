/**
 * Archetype registry: the any-seed API entry point. Every creature archetype
 * registers its template, grid resolution, and SDF assembly function here, so
 * `generate(archetypeId, seed)` works uniformly for all species.
 */
import { BOVINE_GRID, bovineTemplate, buildBovine } from "./bovine"
import { buildDrake, DRAKE_GRID, drakeTemplate } from "./drake"
import { sampleDna } from "./sample"
import type { Dna, Template } from "./schema"
import type { PartField } from "./voxelizer"

/** Shape shared by every archetype's SDF assembly output. */
export interface CreatureBuild {
  fields: PartField[]
  pivots: Record<string, [number, number, number]>
  colors: Record<string, [number, number, number]>
  parents: Record<string, string>
}

export interface ArchetypeDef {
  id: string
  template: Template
  grid: number
  build: (dna: Dna) => CreatureBuild
}

export const archetypes: Record<string, ArchetypeDef> = {
  draconic: {
    id: "draconic",
    template: drakeTemplate,
    grid: DRAKE_GRID,
    build: buildDrake,
  },
  bovine: {
    id: "bovine",
    template: bovineTemplate,
    grid: BOVINE_GRID,
    build: buildBovine,
  },
}

export interface Generated {
  dna: Dna
  build: CreatureBuild
  def: ArchetypeDef
}

/** Sample DNA for the archetype at `seed` and assemble its SDF parts. */
export function generate(archetypeId: string, seed: number): Generated {
  const def = archetypes[archetypeId]
  if (!def) {
    throw new Error(
      `unknown archetype "${archetypeId}" - known: ${Object.keys(archetypes).join(", ")}`,
    )
  }
  const dna = sampleDna(def.template, seed)
  return { dna, build: def.build(dna), def }
}
