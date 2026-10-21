/**
 * @apex/voxel — deterministic creature asset generator.
 *
 * Pure TypeScript only: no DOM, no Three.js, no I/O may be imported here.
 * Pipeline: archetype template + seed → DNA → SDF parts → voxel grid →
 * per-part greedy mesh → GLB with a rigid hierarchy contract.
 */

export {
  type ArchetypeDef,
  archetypes,
  type CreatureBuild,
  type Generated,
  generate,
} from "./archetype"
export {
  AXOLOTL_GRID,
  type AxolotlBuild,
  axolotlTemplate,
  buildAxolotl,
  sampleAxolotlDna,
} from "./axolotl"
export {
  BOVINE_GRID,
  type BovineBuild,
  bovineTemplate,
  buildBovine,
} from "./bovine"
export { buildDrake, DRAKE_GRID, type DrakeBuild, drakeTemplate } from "./drake"
export {
  type ExportInput,
  exportGlb,
  GENERATOR_VERSION,
  type GlbManifest,
  VOXEL_SIZE,
} from "./glb"
export { type MeshePart, meshGrid } from "./mesher"
export {
  generateProp,
  type PropBuild,
  type PropDef,
  type PropDna,
  type PropGenerated,
  props,
} from "./props"
export { makeRng, type Rng } from "./rng"
export { sampleDna } from "./sample"
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
export {
  type Sdf,
  sdBox,
  sdCapsule,
  sdSphere,
  smoothUnion,
  translate,
  union,
  type Vec3,
  vec3,
} from "./sdf"
export {
  CHAMPION_MATURITY,
  JUVENILE_MATURITY,
  matureProportions,
  parseStage,
  STAGES,
  type Stage,
} from "./stage"
export {
  buildStormHound,
  STORM_HOUND_GRID,
  type StormHoundBuild,
  sampleStormHoundDna,
  stormHoundTemplate,
} from "./storm_hound"
export { bakeVertexColors, type Palette } from "./vertex-color"
export {
  type PartField,
  type Voxel,
  type VoxeledPart,
  type VoxelGrid,
  voxelize,
} from "./voxelizer"
