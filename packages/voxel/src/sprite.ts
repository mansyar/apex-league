import type { CreatureBuild } from "./build"
import type { Dna, Template } from "./schema"
import type { Stage } from "./stage"
import { buildWaveBody, type WaveBodySpec } from "./wave_body"

// Thornvolt archetype: a compact leaf sprite with a springy stance, broad
// leaf-blade "wings" and a high bramble tail. Authored on a 56^3 grid (y up,
// +z forward); the shared wave body plan owns the SDF assembly and the
// per-stage invariants, this module owns the silhouette and template.

export { sampleDna as sampleSpriteDna } from "./sample"

export const SPRITE_GRID = 56

export const spriteTemplate: Template = {
  id: "sprite",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.15 },
    bodyGirth: { min: 0.8, max: 1.1 },
    legLength: { min: 0.8, max: 1.2 },
    neckLength: { min: 0.75, max: 1.25 },
    neckThickness: { min: 0.8, max: 1.2 },
    headSize: { min: 0.85, max: 1.2 },
  },
  styles: {
    crest: [
      { id: "fan", params: { crestSpread: { min: 0.75, max: 1.3 } } },
      { id: "tucked", params: { crestSpread: { min: 0.75, max: 1.3 } } },
    ],
    tail: [
      { id: "blade", params: { tailFlare: { min: 0.75, max: 1.25 } } },
      { id: "curl", params: { tailFlare: { min: 0.75, max: 1.25 } } },
    ],
  },
  palette: { hue: 112, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

const SPEC: WaveBodySpec = {
  id: "sprite",
  grid: SPRITE_GRID,
  hue: spriteTemplate.palette.hue,
  saturation: 0.76,
  bodyY: 13,
  bodyFront: 3,
  bodyBack: -3,
  bodyRadius: 4.6,
  hipY: 9,
  legSpread: 3.2,
  legFront: 3.4,
  legBack: -3.6,
  legRadius: 1.4,
  headScale: 1,
  neckRise: 2.4,
  tailReach: 7,
  tailRise: 5,
  wingSpan: 9,
  appendage: "leaf",
  appendageNames: ["leafWingLeft", "leafWingRight"],
  juvenileNames: ["thornBudLeft", "thornBudRight"],
  championNames: ["brambleCrownLeft", "brambleCrownRight"],
}

export interface SpriteBuild extends CreatureBuild {}

export function buildSprite(dna: Dna, stage: Stage = "baby"): SpriteBuild {
  return buildWaveBody(SPEC, dna, stage)
}
