import { describe, expect, test } from "bun:test"
import { archetypes } from "../src/archetype"
import type { Stage } from "../src/stage"
import {
  BENCHMARK_SCHEMA_VERSION,
  BENCHMARK_SEED,
  type BenchmarkContext,
  type BenchmarkCorpus,
  type BenchmarkMeasurement,
  buildBenchmarkCorpus,
  createBenchmarkReport,
  median,
  SAMPLE_RUNS,
  summarizeSamples,
  WARMUP_RUNS,
} from "./benchmark-voxelize"

const EXPECTED_ARCHETYPES = [
  "draconic",
  "bovine",
  "axolotl",
  "storm_hound",
  "falcon",
  "tortoise",
  "frond",
  "crab",
  "smolder",
  "fox",
  "heron",
  "mole",
  "cub",
  "boar",
  "otter",
  "jerboa",
  "ray",
  "moth",
  "sprite",
  "golem",
  "wing",
]

const EXPECTED_STAGES: Stage[] = ["baby", "juvenile", "champion"]

const CONTEXT: BenchmarkContext = {
  timestamp: "2026-11-25T00:00:00.000Z",
  runtime: {
    bunVersion: "1.4.4",
    platform: "win32",
    arch: "x64",
  },
  machine: {
    cpuCount: 8,
    cpuModel: "test cpu",
    totalMemoryBytes: 16_000_000_000,
  },
}

function measurementsFor(corpus: BenchmarkCorpus): BenchmarkMeasurement[] {
  return corpus.cases.map((benchmarkCase) => ({
    ...benchmarkCase,
    partCount: 0,
    samplesMs: [4, 1, 3, 2, 5],
  }))
}

describe("voxelize benchmark corpus", () => {
  test("pins all 21 archetypes in registry order across all three stages", () => {
    const corpus = buildBenchmarkCorpus()

    expect(Object.keys(archetypes)).toEqual(EXPECTED_ARCHETYPES)
    expect(corpus.archetypeIds).toEqual(EXPECTED_ARCHETYPES)
    expect(corpus.stages).toEqual(EXPECTED_STAGES)
    expect(corpus.cases).toHaveLength(63)

    for (const [archetypeIndex, archetypeId] of EXPECTED_ARCHETYPES.entries()) {
      const definition = archetypes[archetypeId]
      if (!definition) throw new Error(`missing archetype ${archetypeId}`)
      const cases = corpus.cases.slice(
        archetypeIndex * 3,
        archetypeIndex * 3 + 3,
      )
      expect(cases.map((benchmarkCase) => benchmarkCase.stage)).toEqual(
        EXPECTED_STAGES,
      )
      expect(cases.map((benchmarkCase) => benchmarkCase.key)).toEqual(
        EXPECTED_STAGES.map((stage) => `${archetypeId}:${stage}`),
      )
      for (const benchmarkCase of cases) {
        expect(benchmarkCase.archetypeId).toBe(archetypeId)
        expect(benchmarkCase.archetypeIndex).toBe(archetypeIndex)
        expect(benchmarkCase.seed).toBe(BENCHMARK_SEED)
        expect(benchmarkCase.resolution).toBe(definition.grid)
      }
    }
  })

  test("pins one warm-up and five measured samples per case", () => {
    expect(BENCHMARK_SEED).toBe(42)
    expect(WARMUP_RUNS).toBe(1)
    expect(SAMPLE_RUNS).toBe(5)
  })
})

describe("voxelize benchmark report", () => {
  test("emits a stable schema with raw samples and per-case summaries", () => {
    const corpus = buildBenchmarkCorpus()
    const draconic = archetypes.draconic
    if (!draconic) throw new Error("missing draconic archetype")
    const report = createBenchmarkReport(
      corpus,
      measurementsFor(corpus),
      CONTEXT,
    )

    expect(Object.keys(report)).toEqual([
      "schemaVersion",
      "benchmark",
      "timestamp",
      "runtime",
      "machine",
      "seed",
      "corpus",
      "measurement",
      "cases",
      "aggregate",
    ])
    expect(report.schemaVersion).toBe(BENCHMARK_SCHEMA_VERSION)
    expect(report.benchmark).toBe("voxelize-fixed-corpus")
    expect(report.timestamp).toBe(CONTEXT.timestamp)
    expect(report.runtime).toEqual(CONTEXT.runtime)
    expect(report.machine).toEqual(CONTEXT.machine)
    expect(report.seed).toBe(42)
    expect(report.corpus).toEqual({
      id: "voxelize-21x3-seed42-v1",
      archetypeCount: 21,
      stageCount: 3,
      caseCount: 63,
      archetypeIds: EXPECTED_ARCHETYPES,
      stages: EXPECTED_STAGES,
    })
    expect(report.measurement).toEqual({
      warmupRuns: 1,
      sampleRuns: 5,
      timer: "performance.now",
      unit: "ms",
    })
    expect(report.cases).toHaveLength(63)
    expect(report.cases[0]).toEqual({
      key: "draconic:baby",
      archetypeId: "draconic",
      archetypeIndex: 0,
      stage: "baby",
      stageIndex: 0,
      seed: 42,
      resolution: draconic.grid,
      partCount: 0,
      samplesMs: [4, 1, 3, 2, 5],
      summary: {
        sampleCount: 5,
        medianMs: 3,
        minMs: 1,
        maxMs: 5,
        meanMs: 3,
      },
    })
    expect(report.aggregate).toEqual({
      caseCount: 63,
      sampleCount: 315,
      medianMs: 3,
      medianCaseMedianMs: 3,
      totalSampleMs: 945,
    })
    expect(JSON.parse(JSON.stringify(report))).toEqual(report)
  })

  test("rejects incomplete or reordered measurement sets", () => {
    const corpus = buildBenchmarkCorpus()
    const measurements = measurementsFor(corpus)

    expect(() =>
      createBenchmarkReport(corpus, measurements.slice(1), CONTEXT),
    ).toThrow("measurement count")
    expect(() =>
      createBenchmarkReport(corpus, [...measurements].reverse(), CONTEXT),
    ).toThrow("measurement order")
  })

  test("rejects a measurement set with the wrong sample count", () => {
    const corpus = buildBenchmarkCorpus()
    const measurements = measurementsFor(corpus)
    const first = measurements[0]
    if (!first) throw new Error("missing first measurement")
    measurements[0] = { ...first, samplesMs: [1, 2, 3, 4] }

    expect(() => createBenchmarkReport(corpus, measurements, CONTEXT)).toThrow(
      "sample count",
    )
  })
})

describe("benchmark timing summaries", () => {
  test("uses the standard median for odd and even sample counts", () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(summarizeSamples([4, 1, 3, 2, 5])).toEqual({
      sampleCount: 5,
      medianMs: 3,
      minMs: 1,
      maxMs: 5,
      meanMs: 3,
    })
  })

  test("rejects empty, non-finite, and negative samples", () => {
    expect(() => median([])).toThrow("at least one sample")
    expect(() =>
      summarizeSamples([1, Number.NaN, 3]).toThrow("finite non-negative"),
    )
    expect(() => summarizeSamples([1, -1, 3]).toThrow("finite non-negative"))
  })
})
