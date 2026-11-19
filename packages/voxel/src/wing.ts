import type { CreatureBuild } from "./build"
import type { Dna, Template } from "./schema"
import type { Stage } from "./stage"
import { buildWaveBody, type WaveBodySpec } from "./wave_body"

// Emberwing archetype: a lean fire skirmisher with a high fan of flame
// feathers, long tail plumes and a light fast stance. Authored on a 56^3 grid
// (y up, +z forward); the shared wave body plan owns the SDF assembly and the
// per-stage invariants, this module owns the silhouette and template.

export { sampleDna as sampleWingDna } from "./sample"

export const WING_GRID = 56

export const wingTemplate: Template = {
  id: "wing",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.2 },
    bodyGirth: { min: 0.75, max: 1.05 },
    legLength: { min: 0.85, max: 1.25 },
    neckLength: { min: 0.8, max: 1.3 },
    neckThickness: { min: 0.75, max: 1.1 },
    headSize: { min: 0.9, max: 1.25 },
  },
  styles: {
    crest: [
      { id: "fan", params: { crestSpread: { min: 0.8, max: 1.35 } } },
      { id: "tucked", params: { crestSpread: { min: 0.8, max: 1.35 } } },
    ],
    tail: [
      { id: "plume", params: { tailFlare: { min: 0.8, max: 1.3 } } },
      { id: "spike", params: { tailFlare: { min: 0.8, max: 1.3 } } },
    ],
  },
  palette: { hue: 20, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

const SPEC: WaveBodySpec = {
  id: "wing",
  grid: WING_GRID,
  hue: wingTemplate.palette.hue,
  saturation: 0.82,
  bodyY: 12.5,
  bodyFront: 3.4,
  bodyBack: -3.4,
  bodyRadius: 4.3,
  hipY: 8.6,
  legSpread: 2.8,
  legFront: 3.2,
  legBack: -3.4,
  legRadius: 1.2,
  headScale: 1.05,
  neckRise: 2.8,
  tailReach: 8,
  tailRise: 6,
  wingSpan: 10,
  appendage: "feather",
  appendageNames: ["emberWingLeft", "emberWingRight"],
  juvenileNames: ["cinderTuftLeft", "cinderTuftRight"],
  championNames: ["flameCrestLeft", "flameCrestRight"],
}

export interface WingBuild extends CreatureBuild {}

export function buildWing(dna: Dna, stage: Stage = "baby"): WingBuild {
  return buildWaveBody(SPEC, dna, stage)
}
