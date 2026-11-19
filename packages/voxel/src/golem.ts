import type { CreatureBuild } from "./build"
import type { Dna, Template } from "./schema"
import type { Stage } from "./stage"
import { buildWaveBody, type WaveBodySpec } from "./wave_body"

// Siltback archetype: a heavy silt-caked golem with a broad barrel torso,
// pillar legs, slab shoulders and a short stone tail. Authored on a 56^3 grid
// (y up, +z forward); the shared wave body plan owns the SDF assembly and the
// per-stage invariants, this module owns the silhouette and template.

export { sampleDna as sampleGolemDna } from "./sample"

export const GOLEM_GRID = 56

export const golemTemplate: Template = {
  id: "golem",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.15 },
    bodyGirth: { min: 0.85, max: 1.1 },
    legLength: { min: 0.8, max: 1.15 },
    neckLength: { min: 0.7, max: 1.1 },
    neckThickness: { min: 0.85, max: 1.2 },
    headSize: { min: 0.85, max: 1.15 },
  },
  styles: {
    crest: [
      { id: "ridge", params: { crestSpread: { min: 0.8, max: 1.25 } } },
      { id: "tucked", params: { crestSpread: { min: 0.8, max: 1.25 } } },
    ],
    tail: [
      { id: "slab", params: { tailFlare: { min: 0.8, max: 1.2 } } },
      { id: "stub", params: { tailFlare: { min: 0.8, max: 1.2 } } },
    ],
  },
  palette: { hue: 205, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

const SPEC: WaveBodySpec = {
  id: "golem",
  grid: GOLEM_GRID,
  hue: golemTemplate.palette.hue,
  saturation: 0.68,
  bodyY: 14,
  bodyFront: 3.2,
  bodyBack: -3.2,
  bodyRadius: 5.5,
  hipY: 10,
  legSpread: 4,
  legFront: 3.6,
  legBack: -3.8,
  legRadius: 2,
  headScale: 0.95,
  neckRise: 1.2,
  tailReach: 5,
  tailRise: 2,
  wingSpan: 8,
  appendage: "plate",
  appendageNames: ["slateShoulderLeft", "slateShoulderRight"],
  juvenileNames: ["siltPearlLeft", "siltPearlRight"],
  championNames: ["tideCrownLeft", "tideCrownRight"],
}

export interface GolemBuild extends CreatureBuild {}

export function buildGolem(dna: Dna, stage: Stage = "baby"): GolemBuild {
  return buildWaveBody(SPEC, dna, stage)
}
