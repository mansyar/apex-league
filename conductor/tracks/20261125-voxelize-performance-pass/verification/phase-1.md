# Phase 1 Verification — Baseline and benchmark harness

- Track: `20261125-voxelize-performance-pass` — Voxelize Performance Pass
- Phase: 1 — Baseline and benchmark harness
- Date: 2026-11-25
- Branch: `chore/20261125-voxelize-performance-pass`
- Phase base: `558e06eac2956dd0b58de62da64937cc949bc9b6`
- Implementation head: `999341e5948e72b700b448e513f0555d95aa2cb9`
- Result: **BLOCKED**

## Summary

The deterministic benchmark harness and focused tests were added without
changing `packages/voxel/src`. The harness enumerates the public registry in
order, covers all 21 archetypes across baby/juvenile/champion at seed 42, warms
each case once, records five `voxelize()` samples, and emits the required stable
JSON schema.

Execution of the benchmark and the required Biome check was denied by the tool
permission layer before either command ran. Consequently, no untouched
baseline timings, timed package-gate baseline, or measured bottleneck can be
claimed. Phase 1 must resume after the primary agent runs or authorizes those
commands.

## Task status

| Task | Status | Evidence |
| --- | --- | --- |
| P1.T1 — deterministic benchmark harness | Partial | Harness and seven tests pass; Biome verification blocked |
| P1.T2 — untouched baseline timings | Partial | Correctness gate passed; benchmark and independent wall timing blocked |
| P1.T3 — measured bottleneck | Blocked | No profiling run; code inspection is not accepted as measurement |
| P1.T4 — baseline evidence commit | Partial | Harness committed; this blocked-phase report records the remaining work |

## Command results

All commands were invoked separately without pipes or `&&` chains.

| Command | Exit | Result |
| --- | --- | --- |
| `bun packages/voxel/scripts/benchmark-voxelize.ts` | n/a | Permission denied before execution |
| `bun test --timeout 120000 packages/voxel/scripts/benchmark-voxelize.test.ts` | 0 | 7 passed, 0 failed |
| `bun test --check --parallel=4 --timeout 120000 packages/voxel` | 0 | 635 passed, 0 failed; runner reported 107.17 s |
| `bun run check` | 0 | All workspace type checks passed |
| `bunx biome check packages/voxel/scripts/benchmark-voxelize.ts packages/voxel/scripts/benchmark-voxelize.test.ts` | n/a | Permission denied before execution |
| `git diff --quiet 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD -- packages/voxel/src` | 0 | No production-source diff |
| `git diff --check 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD` | 0 | No whitespace errors |
| `git status --porcelain` | 0 | Clean at implementation head `999341e5` before this report was added |

The 107.17 s package-test duration is the Bun runner's reported test time, not
an independently measured wall-clock baseline. It must not be used as the
P1.T2 timed-gate result.

## Baseline numbers

| Metric | Value |
| --- | --- |
| Fixed corpus | 21 archetypes × 3 stages = 63 cases |
| Seed | 42 |
| Warm-up runs per case | 1 |
| Measured samples per case | 5 |
| Expected raw sample count | 315 |
| Aggregate `voxelize()` median | Not captured — benchmark command denied |
| Median of per-case medians | Not captured — benchmark command denied |
| Timed capped package gate | Not captured — no independent wall-clock timing |

## Profile findings

No measured hotspot is available. The required benchmark invocation was denied,
so scratch stage instrumentation was not run and no CPU/stage timing evidence
was produced. The production pipeline was inspected only to design the harness;
those observations are deliberately not reported as a profiling result.

## Harness contract

`packages/voxel/scripts/benchmark-voxelize.ts` emits schema version 1 with:

- Bun version, platform, architecture, CPU count/model, and total memory
- UTC timestamp and fixed seed
- Corpus identity, ordered archetype IDs, ordered stages, and case count
- Warm-up/sample counts, timer, and unit
- Per-case resolution, part count, five raw samples, and min/median/max/mean
- Aggregate raw-sample median, median of case medians, and total sample time

Generation and report construction are outside the timed region. The harness
has no production imports beyond the public generator/voxelizer surface and
adds no logging to shipped generator code.

`packages/voxel/scripts/benchmark-voxelize.test.ts` pins the exact registry order,
all three stages, seed 42, the 63-case corpus, five samples, report keys,
per-case summaries, aggregate summaries, JSON round-tripping, and rejection of
incomplete, reordered, or invalid measurements. It makes no wall-clock timing
assertions.

## Evidence paths

Raw scratch evidence is ignored by Git and retained under
`.conductor/evidence/20261125-voxelize-performance-pass/baseline/`:

- `blocked-commands.json`
- `benchmark-command.log`
- `biome-command.log`
- `harness-tests.log`
- `package-gate.log`
- `check.log`
- `source-unchanged.log`
- `diff-check.log`

The final post-commit source/diff/status checks are also retained there.

## Deviations

None. All tracked changes stay within the Phase 1 `Touches` paths. No production
source, dependencies, manifests, lockfiles, CI configuration, artifacts, GLBs,
baselines, or prop digests were changed.

## Acceptance criteria mapping

| Criterion | Status | Mapping |
| --- | --- | --- |
| AC-1 — repeatable baseline and before/after measurement | Partial | Harness/schema/tests exist, but the benchmark could not execute and no baseline JSON was captured |
| AC-2 — profiling-backed bottleneck record | Not met | No measured profile or stage timing was produced |

FR-1 and FR-2 are likewise only partially satisfied: the measurement mechanism
is implemented, but the baseline and measured hotspot records are absent.
NFR-9 comparability cannot be established until same-machine repeated baseline
runs are retained.

## Resume notes

1. Run or authorize `bun packages/voxel/scripts/benchmark-voxelize.ts`; retain
   the complete JSON as raw baseline evidence. The harness also supports
   `--output <path>` for an exact raw capture.
2. Run or authorize the exact Biome command and resolve any diagnostics.
3. Time the exact capped package gate under comparable load and retain stdout
   plus elapsed wall time.
4. Add scratch-only stage/CPU profiling under the baseline evidence directory
   and record at least one measured hotspot.
5. Update this report with the baseline numbers, profile finding, final head,
   and AC-1/AC-2 results before marking Phase 1 complete.
