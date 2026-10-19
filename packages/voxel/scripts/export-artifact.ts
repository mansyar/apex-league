/**
 * Canonical artifact exporter: generates the committed starter creature GLB
 * and its integrity manifest. Run:
 * bun packages/voxel/scripts/export-artifact.ts [archetype] [seed] [stage]
 *
 * Baby artifacts keep the bare filename (`{archetype}-{seed}.glb`); any
 * other stage is suffixed (`{archetype}-{seed}-{stage}.glb`).
 */
import { mkdirSync, writeFileSync } from "node:fs"
import {
  exportGlb,
  generate,
  meshGrid,
  parseStage,
  VOXEL_SIZE,
  voxelize,
} from "@apex/voxel"

const archetype = process.argv[2] ?? "draconic"
const seed = Number.parseInt(process.argv[3] ?? "42", 10)
const stage = parseStage(process.argv[4] ?? "baby")
const { dna, build, def } = generate(archetype, seed, stage)
const meshes = meshGrid(voxelize(build.fields, def.grid))
const { glb, manifest } = exportGlb({
  archetype: def.id,
  seed,
  dnaJson: JSON.stringify(dna),
  voxelSize: VOXEL_SIZE,
  colors: build.colors,
  palettes: build.palettes,
  pivots: build.pivots,
  parts: meshes,
})

mkdirSync("artifacts", { recursive: true })
const suffix = stage === "baby" ? "" : `-${stage}`
const glbPath = `artifacts/${archetype}-${seed}${suffix}.glb`
const manifestPath = `artifacts/${archetype}-${seed}${suffix}.manifest.json`
writeFileSync(glbPath, glb)
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t"))
console.log(
  `wrote ${glbPath} (${glb.byteLength} bytes, tris ${manifest.triCount}) and ${manifestPath}`,
)
