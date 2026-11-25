/**
 * Fixed-corpus voxelize benchmark.
 *
 * Runs every registered archetype through baby, juvenile, and champion at seed
 * 42. Generation is outside the timer: each case gets one warm-up followed by
 * five voxelize() samples. The JSON report is the before/after measurement
 * contract for the voxelize performance track.
 *
 * Run: bun packages/voxel/scripts/benchmark-voxelize.ts
 * Optional raw capture: bun packages/voxel/scripts/benchmark-voxelize.ts --output <path>
 */

import { cpus, totalmem } from "node:os"
import { archetypes, generate } from "../src/archetype"
import { STAGES, type Stage } from "../src/stage"
import { voxelize } from "../src/voxelizer"

export const BENCHMARK_SCHEMA_VERSION = 1
export const BENCHMARK_SEED = 42
export const WARMUP_RUNS = 1
export const SAMPLE_RUNS = 5

const EXPECTED_ARCHETYPE_COUNT = 21
const EXPECTED_STAGES: readonly Stage[] = ["baby", "juvenile", "champion"]
const CORPUS_ID = "voxelize-21x3-seed42-v1"

export interface BenchmarkCase {
  key: string
  archetypeId: string
  archetypeIndex: number
  stage: Stage
  stageIndex: number
  seed: number
  resolution: number
}

export interface BenchmarkCorpus {
  id: string
  archetypeIds: string[]
  stages: Stage[]
  cases: BenchmarkCase[]
}

export interface BenchmarkMeasurement extends BenchmarkCase {
  partCount: number
  samplesMs: number[]
}

export interface TimingSummary {
  sampleCount: number
  medianMs: number
  minMs: number
  maxMs: number
  meanMs: number
}

export interface BenchmarkCaseResult extends BenchmarkCase {
  partCount: number
  samplesMs: number[]
  summary: TimingSummary
}

export interface BenchmarkContext {
  timestamp: string
  runtime: {
    bunVersion: string
    platform: string
    arch: string
  }
  machine: {
    cpuCount: number
    cpuModel: string
    totalMemoryBytes: number
  }
}

export interface BenchmarkReport {
  schemaVersion: number
  benchmark: "voxelize-fixed-corpus"
  timestamp: string
  runtime: BenchmarkContext["runtime"]
  machine: BenchmarkContext["machine"]
  seed: number
  corpus: {
    id: string
    archetypeCount: number
    stageCount: number
    caseCount: number
    archetypeIds: string[]
    stages: Stage[]
  }
  measurement: {
    warmupRuns: number
    sampleRuns: number
    timer: "performance.now"
    unit: "ms"
  }
  cases: BenchmarkCaseResult[]
  aggregate: {
    caseCount: number
    sampleCount: number
    medianMs: number
    medianCaseMedianMs: number
    totalSampleMs: number
  }
}

/** Enumerate the frozen corpus without sorting or reordering the registry. */
export function buildBenchmarkCorpus(): BenchmarkCorpus {
  const archetypeIds = Object.keys(archetypes)
  if (archetypeIds.length !== EXPECTED_ARCHETYPE_COUNT) {
    throw new Error(
      `benchmark requires ${EXPECTED_ARCHETYPE_COUNT} archetypes, found ${archetypeIds.length}`,
    )
  }
  if (
    STAGES.length !== EXPECTED_STAGES.length ||
    STAGES.some((stage, index) => stage !== EXPECTED_STAGES[index])
  ) {
    throw new Error("benchmark stage order must be baby, juvenile, champion")
  }

  const cases: BenchmarkCase[] = []
  for (const [archetypeIndex, archetypeId] of archetypeIds.entries()) {
    const definition = archetypes[archetypeId]
    if (!definition) throw new Error(`missing archetype ${archetypeId}`)
    for (const [stageIndex, stage] of STAGES.entries()) {
      cases.push({
        key: `${archetypeId}:${stage}`,
        archetypeId,
        archetypeIndex,
        stage,
        stageIndex,
        seed: BENCHMARK_SEED,
        resolution: definition.grid,
      })
    }
  }

  return {
    id: CORPUS_ID,
    archetypeIds,
    stages: [...STAGES],
    cases,
  }
}

/** Standard median: the middle value, or the mean of the two middle values. */
export function median(samples: number[]): number {
  if (samples.length === 0) {
    throw new Error("median requires at least one sample")
  }
  if (samples.some((sample) => !Number.isFinite(sample) || sample < 0)) {
    throw new Error("samples must be finite non-negative numbers")
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function summarizeSamples(samplesMs: number[]): TimingSummary {
  const sampleCount = samplesMs.length
  const total = samplesMs.reduce((sum, sample) => sum + sample, 0)
  return {
    sampleCount,
    medianMs: median(samplesMs),
    minMs: Math.min(...samplesMs),
    maxMs: Math.max(...samplesMs),
    meanMs: total / sampleCount,
  }
}

/** Build the stable report shape and reject corpus/sample drift. */
export function createBenchmarkReport(
  corpus: BenchmarkCorpus,
  measurements: BenchmarkMeasurement[],
  context: BenchmarkContext,
): BenchmarkReport {
  if (measurements.length !== corpus.cases.length) {
    throw new Error(
      `measurement count ${measurements.length} does not match corpus count ${corpus.cases.length}`,
    )
  }

  const cases = corpus.cases.map(
    (benchmarkCase, index): BenchmarkCaseResult => {
      const measurement = measurements[index]
      if (!measurement) throw new Error(`missing measurement at index ${index}`)
      if (measurement.key !== benchmarkCase.key) {
        throw new Error(
          `measurement order mismatch at index ${index}: expected ${benchmarkCase.key}, found ${measurement.key}`,
        )
      }
      if (measurement.samplesMs.length !== SAMPLE_RUNS) {
        throw new Error(
          `${benchmarkCase.key} sample count ${measurement.samplesMs.length} does not match ${SAMPLE_RUNS}`,
        )
      }
      return {
        ...benchmarkCase,
        partCount: measurement.partCount,
        samplesMs: [...measurement.samplesMs],
        summary: summarizeSamples(measurement.samplesMs),
      }
    },
  )

  const allSamples = cases.flatMap((benchmarkCase) => benchmarkCase.samplesMs)
  return {
    schemaVersion: BENCHMARK_SCHEMA_VERSION,
    benchmark: "voxelize-fixed-corpus",
    timestamp: context.timestamp,
    runtime: { ...context.runtime },
    machine: { ...context.machine },
    seed: BENCHMARK_SEED,
    corpus: {
      id: corpus.id,
      archetypeCount: corpus.archetypeIds.length,
      stageCount: corpus.stages.length,
      caseCount: corpus.cases.length,
      archetypeIds: [...corpus.archetypeIds],
      stages: [...corpus.stages],
    },
    measurement: {
      warmupRuns: WARMUP_RUNS,
      sampleRuns: SAMPLE_RUNS,
      timer: "performance.now",
      unit: "ms",
    },
    cases,
    aggregate: {
      caseCount: cases.length,
      sampleCount: allSamples.length,
      medianMs: median(allSamples),
      medianCaseMedianMs: median(
        cases.map((benchmarkCase) => benchmarkCase.summary.medianMs),
      ),
      totalSampleMs: allSamples.reduce((sum, sample) => sum + sample, 0),
    },
  }
}

function captureContext(): BenchmarkContext {
  return {
    timestamp: new Date().toISOString(),
    runtime: {
      bunVersion: Bun.version,
      platform: process.platform,
      arch: process.arch,
    },
    machine: {
      cpuCount: cpus().length,
      cpuModel: cpus()[0]?.model ?? "unknown",
      totalMemoryBytes: totalmem(),
    },
  }
}

function timedVoxelize(
  fields: Parameters<typeof voxelize>[0],
  resolution: number,
): number {
  const startedAt = performance.now()
  const grid = voxelize(fields, resolution)
  const elapsedMs = performance.now() - startedAt
  if (grid.resolution !== resolution) {
    throw new Error(`voxelize returned resolution ${grid.resolution}`)
  }
  return elapsedMs
}

/** Run the complete corpus sequentially, timing only voxelize(). */
export function runBenchmark(): BenchmarkReport {
  const context = captureContext()
  const corpus = buildBenchmarkCorpus()
  const measurements: BenchmarkMeasurement[] = []

  for (const benchmarkCase of corpus.cases) {
    const definition = archetypes[benchmarkCase.archetypeId]
    if (!definition) {
      throw new Error(`missing archetype ${benchmarkCase.archetypeId}`)
    }
    const { build } = generate(
      benchmarkCase.archetypeId,
      benchmarkCase.seed,
      benchmarkCase.stage,
    )

    for (let warmup = 0; warmup < WARMUP_RUNS; warmup++) {
      timedVoxelize(build.fields, benchmarkCase.resolution)
    }
    const samplesMs: number[] = []
    for (let sample = 0; sample < SAMPLE_RUNS; sample++) {
      samplesMs.push(timedVoxelize(build.fields, benchmarkCase.resolution))
    }

    measurements.push({
      ...benchmarkCase,
      partCount: build.fields.length,
      samplesMs,
    })
  }

  return createBenchmarkReport(corpus, measurements, context)
}

function outputPathFromArgs(): string | undefined {
  const index = process.argv.indexOf("--output")
  if (index === -1) return undefined
  const outputPath = process.argv[index + 1]
  if (!outputPath) throw new Error("--output requires a file path")
  return outputPath
}

if (import.meta.main) {
  const report = runBenchmark()
  const serialized = `${JSON.stringify(report, null, 2)}\n`
  const outputPath = outputPathFromArgs()
  if (outputPath) await Bun.write(outputPath, serialized)
  process.stdout.write(serialized)
}
