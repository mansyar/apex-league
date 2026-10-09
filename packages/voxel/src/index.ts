/**
 * @apex/voxel — deterministic creature asset generator.
 *
 * Pure TypeScript only: no DOM, no Three.js, no I/O may be imported here.
 * Pipeline: archetype template + seed → DNA → SDF parts → voxel grid →
 * per-part greedy mesh → GLB with a rigid hierarchy contract.
 */
export {
  assertDnaInBounds,
  type Dna,
  type PaletteSpec,
  type ParamRange,
  type RaritySpec,
  type StyleDef,
  type Template,
  validateTemplate,
} from "./schema"
