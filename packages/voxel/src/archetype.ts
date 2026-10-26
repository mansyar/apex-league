/**
 * Archetype registry: the any-seed API entry point. Every creature archetype
 * registers its template, grid resolution, and SDF assembly function here, so
 * `generate(archetypeId, seed)` works uniformly for all species.
 */

import { AXOLOTL_GRID, axolotlTemplate, buildAxolotl } from "./axolotl"
import { BOVINE_GRID, bovineTemplate, buildBovine } from "./bovine"
import type { CreatureBuild } from "./build"
import { buildCrab, CRAB_GRID, crabTemplate } from "./crab"
import { buildDrake, DRAKE_GRID, drakeTemplate } from "./drake"
import { buildFalcon, FALCON_GRID, falconTemplate } from "./falcon"
import { buildFrond, FROND_GRID, frondTemplate } from "./frond"
import { sampleDna } from "./sample"
import type { Dna, Template } from "./schema"
import { buildSmolder, SMOLDER_GRID, smolderTemplate } from "./smolder"
import { parseStage, type Stage } from "./stage"
import {
  buildStormHound,
  STORM_HOUND_GRID,
  stormHoundTemplate,
} from "./storm_hound"
import { buildTortoise, TORTOISE_GRID, tortoiseTemplate } from "./tortoise"

export type { CreatureBuild } from "./build"

export interface ArchetypeDef {
  id: string
  template: Template
  grid: number
  build: (dna: Dna, stage?: Stage) => CreatureBuild
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
  axolotl: {
    id: "axolotl",
    template: axolotlTemplate,
    grid: AXOLOTL_GRID,
    build: buildAxolotl,
  },
  storm_hound: {
    id: "storm_hound",
    template: stormHoundTemplate,
    grid: STORM_HOUND_GRID,
    build: buildStormHound,
  },
  falcon: {
    id: "falcon",
    template: falconTemplate,
    grid: FALCON_GRID,
    build: buildFalcon,
  },
  tortoise: {
    id: "tortoise",
    template: tortoiseTemplate,
    grid: TORTOISE_GRID,
    build: buildTortoise,
  },
  frond: {
    id: "frond",
    template: frondTemplate,
    grid: FROND_GRID,
    build: buildFrond,
  },
  crab: {
    id: "crab",
    template: crabTemplate,
    grid: CRAB_GRID,
    build: buildCrab,
  },
  smolder: {
    id: "smolder",
    template: smolderTemplate,
    grid: SMOLDER_GRID,
    build: buildSmolder,
  },
}

export interface Generated {
  dna: Dna
  build: CreatureBuild
  def: ArchetypeDef
}

/**
 * Sample DNA for the archetype at `seed` and assemble its SDF parts.
 * `stage` selects the life-stage variant (default "baby" — byte-identical
 * to the committed artifacts). The DNA itself is stage-independent: the
 * same seed always describes the same individual, only its maturity
 * presentation changes.
 */
export function generate(
  archetypeId: string,
  seed: number,
  stage: Stage = "baby",
): Generated {
  const def = archetypes[archetypeId]
  if (!def) {
    throw new Error(
      `unknown archetype "${archetypeId}" - known: ${Object.keys(archetypes).join(", ")}`,
    )
  }
  const validated = parseStage(stage)
  const dna = sampleDna(def.template, seed)
  return { dna, build: def.build(dna, validated), def }
}
