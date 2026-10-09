/**
 * Proportion report: measures the standard ratio set for every registered
 * archetype across a seed range and prints per-archetype min/max/median.
 *
 * Usage: bun packages/voxel/scripts/proportion-report.ts [seeds]
 * Defaults: 200 seeds. Ratios are measured on the shared audit lattice in
 * creature-space units (see proportions.ts) — grid-size independent.
 *
 * Used during silhouette tuning to see where a template's ratio distribution
 * sits before/after rebalancing bounds.
 */

import { archetypes, generate } from "../src/archetype"
import { measureRatiosFromFields } from "../src/proportions"

const seedArg = Number(process.argv[2] ?? "200")

interface Stats {
  min: number
  max: number
  median: number
}

function stats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
  }
}

const ratioNames: Array<keyof MeasuredRatios> = [
  "legLength/bodyHeight",
  "neckLength/bodyLength",
  "headHeight/bodyHeight",
  "bodyLength/bodyHeight",
]

for (const id of Object.keys(archetypes)) {
  const samples: Record<string, number[]> = {}
  for (const ratio of ratioNames) samples[ratio] = []
  for (let seed = 1; seed <= seedArg; seed++) {
    const { build, def } = generate(id, seed)
    const measured = measureRatiosFromFields(build.fields, def.grid)
    for (const ratio of ratioNames) samples[ratio].push(measured[ratio])
  }
  console.log(`\n${id} (${seedArg} seeds, audit lattice):`)
  for (const ratio of ratioNames) {
    const s = stats(samples[ratio] ?? [])
    console.log(
      `  ${ratio}: min ${s.min.toFixed(3)}  median ${s.median.toFixed(3)}  max ${s.max.toFixed(3)}`,
    )
  }
}
