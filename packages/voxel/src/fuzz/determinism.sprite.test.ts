import { expect, test } from "bun:test"
import { generate } from "../archetype"
import { exportGlb } from "../glb"
import { meshGrid } from "../mesher"
import { voxelize } from "../voxelizer"

const FULL_SEEDS = [3, 42, 99]
const SEEDS =
  process.env.APEX_FUZZ_SWEEP === "full" ? FULL_SEEDS : FULL_SEEDS.slice(0, 1)

function pipeline(seed: number) {
  const { dna, build, def } = generate("sprite", seed)
  const meshes = meshGrid(voxelize(build.fields, def.grid))
  return exportGlb({
    archetype: def.id,
    seed,
    dnaJson: JSON.stringify(dna),
    voxelSize: 0.045,
    colors: build.colors,
    palettes: build.palettes,
    pivots: build.pivots,
    parts: meshes,
  })
}

test("full sprite pipeline is byte-identical per seed (gate slice; full list via APEX_FUZZ_SWEEP=full)", () => {
  for (const seed of SEEDS) {
    const a = pipeline(seed)
    const b = pipeline(seed)
    expect(Buffer.from(a.glb).equals(Buffer.from(b.glb))).toBe(true)
    expect(a.manifest.glbHash).toBe(b.manifest.glbHash)
  }
}, 120000)
