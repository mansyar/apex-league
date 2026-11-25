# Phase 1 Verification — Baseline and benchmark harness

- Track: `20261125-voxelize-performance-pass` — Voxelize Performance Pass
- Phase: 1 — Baseline and benchmark harness
- Date: 2026-11-25
- Branch: `chore/20261125-voxelize-performance-pass`
- Phase base: `558e06eac2956dd0b58de62da64937cc949bc9b6`
- Implementation head: `9b052c36` (final primary formatting fix)
- Result: **VERIFIED**

## Summary

Phase 1 is complete. The deterministic benchmark harness is committed, the
untouched production-source baseline and independently timed capped package gate
are retained, and scratch-only stage profiling identifies the mesher/AO stage as
the dominant measured bottleneck. All primary checks pass, including Biome after
its formatting diagnostics were resolved. Production source remains unchanged.

The scratch profiler's hardcoded `hotspot` field still names `voxelize`; that
label is incorrect and is superseded by the measured stage totals below. The
authoritative dominant stage is `mesherIncludingAo`.

## Task status

| Task | Status | Evidence |
| --- | --- | --- |
| P1.T1 — deterministic benchmark harness | Done | Fixed-corpus harness/tests committed; final Biome check exits 0 |
| P1.T2 — untouched baseline timings | Done | Primary benchmark and independently timed capped gate retained |
| P1.T3 — measured bottleneck | Done | Corrected scratch profile run exits 0; mesher/AO dominates |
| P1.T4 — baseline evidence commit | Done | Benchmark, gate, profile, and verification evidence retained |

## Command results

All commands were invoked separately without pipes or `&&` chains. The subagent
did not rerun the capped package gate; the primary independently timed it.

| Command | Exit | Result |
| --- | --- | --- |
| `bun packages/voxel/scripts/benchmark-voxelize.ts` | 0 | Primary run; raw JSON retained |
| `bun test --timeout 120000 packages/voxel/scripts/benchmark-voxelize.test.ts` | 0 | 7 passed, 0 failed; 321 expect() calls |
| `bun test --check --parallel=4 --timeout 120000 packages/voxel` | 0 | Primary timed run; 635 passed, 0 failed |
| `bun run check` | 0 | Voxel, sim, server, and client type checks passed |
| `bunx biome check packages/voxel/scripts/benchmark-voxelize.ts packages/voxel/scripts/benchmark-voxelize.test.ts` | 1 then 0 | Initial diagnostics fixed; final primary rerun exits 0 |
| `git diff --quiet 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD -- packages/voxel/src` | 0 | No production-source diff |
| `git diff --check 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD` | 0 | No whitespace errors |
| `git status --porcelain` | 0 | Empty at the primary's final check head |
| `bun .conductor/evidence/20261125-voxelize-performance-pass/baseline/profile-voxelize.ts` | failed, then 0 | Scratch reference typo fixed; corrected run retained |

Initial subagent invocations of the benchmark, Biome, and profile commands were
denied by the shell permission layer. The primary fallback runs above supersede
those denials and provide the authoritative evidence.

## Baseline numbers

### Fixed-corpus `voxelize()` benchmark

| Metric | Value |
| --- | --- |
| Timestamp | `2026-11-25T02:31:07.957Z` |
| Runtime | Bun 1.4.4, win32, x64 |
| Machine | 20 logical CPUs, 12th Gen Intel Core i9-12900HK, 34,045,304,832 bytes RAM |
| Fixed corpus | 21 archetypes × 3 stages = 63 cases |
| Seed | 42 |
| Warm-up runs per case | 1 |
| Measured samples per case | 5 |
| Raw samples | 315 |
| Aggregate raw-sample median | 197.9614999999976 ms |
| Median of per-case medians | 200.20379999999932 ms |
| Total sample time | 73,305.5831 ms |

Raw evidence:
`.conductor/evidence/20261125-voxelize-performance-pass/baseline/benchmark-primary.txt`.

### Capped voxel-package gate

| Metric | Value |
| --- | --- |
| Exact command | `bun test --check --parallel=4 --timeout 120000 packages/voxel` |
| Exit | 0 |
| Tests | 635 passed, 0 failed |
| Expect calls | 525,887 |
| Files | 174 |
| Bun runner duration | 130.38 s |
| Independent wall time | 130.7116318 s |

The independent wall time is the Phase 1 timed-gate baseline for Phase 3.
Raw evidence:
`.conductor/evidence/20261125-voxelize-performance-pass/baseline/package-gate-primary.txt`.

## Measured profile

The corrected scratch profiler measured all 63 cases with one warm-up and three
samples per stage. Totals below cover 63 cases × 3 samples.

| Stage | Total | Median | Pipeline share |
| --- | --- | --- | --- |
| Generation | 226.1432 ms | 0.1219 ms | 0.070% |
| `voxelize()` | 54,236.0640 ms | 197.5587 ms | 16.805% |
| Mesher including AO | 268,269.4181 ms | 1,057.5832 ms | 83.118% |
| Pipeline total | 322,731.6253 ms | — | 100% |

Additional measurement:

- SDF calls: 503,257,599 total
- Mean SDF calls per `voxelize()`: 2,662,738.619

The measured dominant bottleneck is **mesher/AO**, not generation or the
voxelizer/SDF path. The scratch script's `hotspot` object is hardcoded to
`voxelize`; this report intentionally uses the measured totals and identifies
`mesherIncludingAo` as authoritative. Phase 2 may optimize the voxelizer/SDF path
for the explicit 20% `voxelize()` target, but it must also address the measured
mesher/AO bottleneck to achieve the package-gate target.

The first scratch run completed computation but failed while emitting its output
with `ReferenceError: mesherIncludingAoTotalMs is not defined`. The primary fixed
the scratch-only field reference to `mesherTotalMs` and reran it successfully.
No tracked source changed.

Raw profile evidence:

- `.conductor/evidence/20261125-voxelize-performance-pass/baseline/profile-voxelize.ts`
- `.conductor/evidence/20261125-voxelize-performance-pass/baseline/profile-voxelize.json`
- `.conductor/evidence/20261125-voxelize-performance-pass/baseline/profile-run.txt`

## Formatting reconciliation

The primary's three Biome diagnostics were resolved without semantic changes:

1. Benchmark test imports now place `BENCHMARK_SCHEMA_VERSION` and
   `BENCHMARK_SEED` before the imported benchmark types.
2. The `createBenchmarkReport(...)` call and both long `toThrow(...)` calls are
   wrapped across lines.
3. The empty-sample `median()` throw and `cases.map(...)` callback block are
   reformatted.

The primary applied the remaining safe formatting fix in commit `9b052c36`.
The exact Biome command subsequently exited 0. Focused tests and workspace
typecheck also pass after the final formatting change.

## Harness contract

`packages/voxel/scripts/benchmark-voxelize.ts` emits schema version 1 with:

- Bun version, platform, architecture, CPU count/model, and total memory
- UTC timestamp and fixed seed
- Corpus identity, ordered archetype IDs, ordered stages, and case count
- Warm-up/sample counts, timer, and unit
- Per-case resolution, part count, five raw samples, and min/median/max/mean
- Aggregate raw-sample median, median of case medians, and total sample time

Generation and report construction are outside the timed region. The harness
adds no logging to shipped generator code.

`packages/voxel/scripts/benchmark-voxelize.test.ts` pins the exact registry order,
all three stages, seed 42, the 63-case corpus, five samples, report keys,
per-case summaries, aggregate summaries, JSON round-tripping, and rejection of
incomplete, reordered, or invalid measurements. It makes no wall-clock timing
assertions.

## Evidence paths

Raw scratch evidence is ignored by Git and retained under
`.conductor/evidence/20261125-voxelize-performance-pass/baseline/`:

- `benchmark-primary.txt`
- `package-gate-primary.txt`
- `profile-voxelize.ts`
- `profile-voxelize.json`
- `profile-run.txt`
- `profile-command.log`
- `blocked-commands.json`
- `biome-command.log`
- `harness-tests.log`
- `check.log`
- `source-unchanged.log`
- `diff-check.log`
- `git-status.log`
- `final-verification.json`

## Deviations

None. All tracked changes stay within the Phase 1 `Touches` paths. No production
source, dependencies, manifests, lockfiles, CI configuration, artifacts, GLBs,
baselines, or prop digests were changed. The failed profiler output and its
field-reference repair were scratch-only.

## Acceptance criteria mapping

| Criterion | Status | Mapping |
| --- | --- | --- |
| AC-1 — repeatable baseline and before/after measurement | Met | Fixed-corpus raw benchmark and independently timed capped gate are retained |
| AC-2 — profiling-backed bottleneck record | Met | Corrected scratch profile measured all 63 cases and identified mesher/AO as dominant |

FR-1 and FR-2 are satisfied. NFR-9 has the required runtime, machine, corpus,
command, sample counts, and wall-time identity recorded for future comparison.
