# Phase 1 Verification — Baseline and benchmark harness

- Track: `20261125-voxelize-performance-pass` — Voxelize Performance Pass
- Phase: 1 — Baseline and benchmark harness
- Date: 2026-11-25
- Branch: `chore/20261125-voxelize-performance-pass`
- Phase base: `558e06eac2956dd0b58de62da64937cc949bc9b6`
- Implementation head: `51bc45074d03a83aa52125041da1d48abfe9ed4a`
- Result: **BLOCKED — baseline captured; Biome verification and measured profile await primary execution**

## Summary

The deterministic benchmark harness and focused tests are committed. The
primary ran the exact benchmark and exact capped package gate successfully on
the untouched production source, retaining both raw outputs and the independent
gate wall time. The three Biome diagnostics were applied as formatting/import-
only changes, and the focused tests plus workspace typecheck pass.

Two required commands remain denied to this subagent's shell: the exact Biome
check and the scratch stage-timing script. The profile script is prepared under
the baseline evidence directory, but it has not executed. Phase 1 therefore
cannot yet be marked VERIFIED or claim a measured bottleneck.

## Task status

| Task | Status | Evidence |
| --- | --- | --- |
| P1.T1 — deterministic benchmark harness | Partial | Harness/tests pass; formatting fixes applied; Biome rerun denied |
| P1.T2 — untouched baseline timings | Done | Primary benchmark and independently timed capped gate retained |
| P1.T3 — measured bottleneck | Blocked | Scratch profile script prepared; execution denied |
| P1.T4 — baseline evidence commit | Partial | Harness, formatting, and this reconciliation committed; final verification pending |

## Command results

All commands were invoked separately without pipes or `&&` chains. The capped
package gate was not rerun by this subagent.

| Command | Exit | Result |
| --- | --- | --- |
| `bun packages/voxel/scripts/benchmark-voxelize.ts` | 0 | Primary run; raw JSON retained |
| `bun test --timeout 120000 packages/voxel/scripts/benchmark-voxelize.test.ts` | 0 | 7 passed, 0 failed |
| `bun test --check --parallel=4 --timeout 120000 packages/voxel` | 0 | Primary timed run; 635 passed, 0 failed |
| `bun run check` | 0 | All workspace type checks passed |
| `bunx biome check packages/voxel/scripts/benchmark-voxelize.ts packages/voxel/scripts/benchmark-voxelize.test.ts` | n/a | Subagent rerun denied; primary's pre-fix run found three formatting/import diagnostics |
| `git diff --quiet 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD -- packages/voxel/src` | 0 | No production-source diff |
| `git diff --check 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD` | 0 | No whitespace errors |
| `git status --porcelain` | 0 | Clean at implementation head `51bc4507` before this report was added |
| `bun .conductor/evidence/20261125-voxelize-performance-pass/baseline/profile-voxelize.ts` | n/a | Permission denied before execution |

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

## Profile findings

No measured profile is available yet. The scratch script
`.conductor/evidence/20261125-voxelize-performance-pass/baseline/profile-voxelize.ts`
is ready to time generation, `voxelize()`, and mesher/AO across the same 63-case
corpus with one warm-up and three samples per case. It also wraps each part SDF
with a call counter. Its output target is `profile-voxelize.json`.

The script invocation was denied before execution, so no stage medians, stage
shares, SDF call counts, or measured hotspot can be reported. Code inspection
and the benchmark's overall `voxelize()` timing are not substituted for the
required scratch profile.

## Formatting reconciliation

The primary's three diagnostics were addressed without semantic changes:

1. Benchmark test imports now place `BENCHMARK_SCHEMA_VERSION` and
   `BENCHMARK_SEED` before the imported benchmark types.
2. The `createBenchmarkReport(...)` call and both long `toThrow(...)` calls are
   wrapped across lines.
3. The empty-sample `median()` throw and `cases.map(...)` callback block are
   reformatted.

Focused tests and workspace typecheck pass after these changes. A successful
exact Biome rerun is still required before Phase 1 can be VERIFIED.

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
baselines, or prop digests were changed.

## Acceptance criteria mapping

| Criterion | Status | Mapping |
| --- | --- | --- |
| AC-1 — repeatable baseline and before/after measurement | Met | Fixed-corpus raw benchmark and independently timed capped gate are retained |
| AC-2 — profiling-backed bottleneck record | Not met | Scratch profile execution is blocked; no measured hotspot is available |

FR-1 and FR-2 are satisfied for baseline capture. NFR-9 has the required runtime,
machine, corpus, command, and wall-time identity recorded for future comparison.

## Remaining work

1. Primary runs `bunx biome check packages/voxel/scripts/benchmark-voxelize.ts packages/voxel/scripts/benchmark-voxelize.test.ts` and confirms exit 0.
2. Primary runs `bun .conductor/evidence/20261125-voxelize-performance-pass/baseline/profile-voxelize.ts` and retains `profile-voxelize.json`.
3. Record the measured stage hotspot, successful Biome result, and final head;
   then change this report's result to VERIFIED.
