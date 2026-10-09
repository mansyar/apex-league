/**
 * Canonical artifact exporter: generates the committed starter creature GLB
 * and its integrity manifest. Run:
 * bun packages/voxel/scripts/export-artifact.ts [archetype] [seed]
 */
import { mkdirSync, writeFileSync } from "node:fs"
import {
  exportGlb,
  generate,
  meshGrid,
  VOXEL_SIZE,
  voxelize,
} from "@apex/voxel"

const archetype = process.argv[2] ?? "draconic"
const seed = Number.parseInt(process.argv[3] ?? "42", 10)
const { dna, build, def } = generate(archetype, seed)
const meshes = meshGrid(voxelize(build.fields, def.grid))
const { glb, manifest } = exportGlb({
  archetype: def.id,
  seed,
  dnaJson: JSON.stringify(dna),
  voxelSize: VOXEL_SIZE,
  colors: build.colors,
  pivots: build.pivots,
  parts: meshes,
})

mkdirSync("artifacts", { recursive: true })
const glbPath = `artifacts/${archetype}-${seed}.glb`
const manifestPath = `artifacts/${archetype}-${seed}.manifest.json`
writeFileSync(glbPath, glb)
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t"))
console.log(
  `wrote ${glbPath} (${glb.byteLength} bytes, tris ${manifest.triCount}) and ${manifestPath}`,
)
