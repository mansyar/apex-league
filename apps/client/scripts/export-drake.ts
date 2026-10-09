/**
 * Build-time preview exporter: generates a drake GLB from a seed for the
 * Blender visual-iteration loop. Run: bun apps/client/scripts/export-drake.ts [seed]
 */
import { mkdirSync, writeFileSync } from "node:fs"
import {
  buildDrake,
  DRAKE_GRID,
  drakeTemplate,
  exportGlb,
  meshGrid,
  sampleDna,
  voxelize,
} from "@apex/voxel"

const seed = Number.parseInt(process.argv[2] ?? "42", 10)
const dna = sampleDna(drakeTemplate, seed)
const build = buildDrake(dna)
const grid = voxelize(build.fields, DRAKE_GRID)
const meshes = meshGrid(grid)
const { glb, manifest } = exportGlb({
  archetype: "draconic",
  seed,
  dnaJson: JSON.stringify(dna),
  voxelSize: 0.045,
  colors: build.colors,
  pivots: build.pivots,
  parts: meshes,
})

mkdirSync("artifacts", { recursive: true })
const out = `artifacts/drake-preview-${seed}.glb`
writeFileSync(out, glb)
console.log(`wrote ${out} (${glb.byteLength} bytes, tris ${manifest.triCount})`)
console.log(`dna: ${JSON.stringify(dna)}`)
