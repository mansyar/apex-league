/**
 * Canonical artifact exporter: generates the committed starter drake GLB and
 * its integrity manifest. Run: bun packages/voxel/scripts/export-artifact.ts [seed]
 */
import { mkdirSync, writeFileSync } from "node:fs"
import {
  buildDrake,
  DRAKE_GRID,
  drakeTemplate,
  exportGlb,
  meshGrid,
  sampleDna,
  VOXEL_SIZE,
  voxelize,
} from "@apex/voxel"

const seed = Number.parseInt(process.argv[2] ?? "42", 10)
const dna = sampleDna(drakeTemplate, seed)
const build = buildDrake(dna)
const meshes = meshGrid(voxelize(build.fields, DRAKE_GRID))
const { glb, manifest } = exportGlb({
  archetype: "draconic",
  seed,
  dnaJson: JSON.stringify(dna),
  voxelSize: VOXEL_SIZE,
  colors: build.colors,
  pivots: build.pivots,
  parts: meshes,
})

mkdirSync("artifacts", { recursive: true })
const glbPath = `artifacts/drake-${seed}.glb`
const manifestPath = `artifacts/drake-${seed}.manifest.json`
writeFileSync(glbPath, glb)
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t"))
console.log(
  `wrote ${glbPath} (${glb.byteLength} bytes, tris ${manifest.triCount}) and ${manifestPath}`,
)
