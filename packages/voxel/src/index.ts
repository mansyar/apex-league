/**
 * @apex/voxel — deterministic creature asset generator.
 *
 * Pure TypeScript only: no DOM, no Three.js, no I/O may be imported here.
 * Pipeline: archetype template + seed → DNA → SDF parts → voxel grid →
 * per-part greedy mesh → GLB with a rigid hierarchy contract.
 */

export { buildDrake, DRAKE_GRID, type DrakeBuild, drakeTemplate } from "./drake"
export {
  type ExportInput,
  exportGlb,
  GENERATOR_VERSION,
  type GlbManifest,
  VOXEL_SIZE,
} from "./glb"
export { type MeshePart, meshGrid } from "./mesher"
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
  type PartField,
  type Voxel,
  type VoxeledPart,
  type VoxelGrid,
  voxelize,
} from "./voxelizer"
