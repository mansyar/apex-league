# Test Suite Speedup — Specification

## Overview

Cut the wall-clock of the test gate that every Conductor phase, every verification pass, and every PR pays. Two levers: run `bun test` with parallel workers everywhere it is not already parallel (capped at 4 workers for interactive and phase runs so it plays nice with co-running projects), and rebalance the voxel fuzz suites so the PR gate runs a fixed, documented smoke seed slice while the full sweeps move to the existing nightly workflow.

Measured baseline on the dev machine (2026-10-23, 20 logical cores, post-merge of the earth/wind species line):

| Leg | Time |
|---|---|
| Whole suite, serial (`bun test --timeout 120000`) | 206 s |
| Whole suite, parallel (`bun test --check --parallel`) | 92 s |
| Voxel package alone, serial | 141 s (68% of the serial total, 12% of the tests) |
| Voxel package alone, parallel | 61 s |
| Full `bun run verify` | ~120 s |
| CI job (frozen install + verify) | ~1 m 20–40 s |

## Problem / Motivation

Every Conductor phase runs the full serial suite two to four times (subagent verification, rework retries, primary verification, reviewer), so a track burns 10–25 minutes of pure test wall-clock at the serial rate. The voxel package is the structural hotspot: its fuzz suites run the full `generate → voxelize → meshGrid → exportGlb` pipeline over dozens of seeds per archetype, and that cost grows linearly with every species line the game adds (6 archetypes today, more planned in Phase 3 of the roadmap). Finally, the dev laptop typically runs three projects at once, so a default parallel run (bun spawns one worker per core — 20 here) saturates the machine and makes the co-running projects laggy for the duration.

## Goals & Success Metrics (numeric, measured in phase evidence)

1. The full-suite phase test leg under the new capped command (`--parallel=4`) completes in ≤ 150 s on the dev machine.
2. The voxel PR-gate test leg (`bun test packages/voxel`, default mode, parallel) completes in ≤ 70 s (the measured per-file import-overhead floor of the 65-file voxel suite; revised 2026-10-23 against the originally-speculated 35 s — see Open Questions).
3. Full `bun run verify` completes in ≤ 120 s.
4. CI job duration unchanged or better (≤ ~1 m 40 s).
5. The module-size guards' negative controls are proven to still fire under `--parallel` worker isolation.

## Scope

**In:**
1. Workflow Config: new `test_phase` command (`bun test --check --parallel=4 --timeout 120000`); `commands.test` updated to note it is the parallel form (verify keeps its existing proven `--check --parallel` combination).
2. Root `test:fuzz` script running the full-seed voxel fuzz sweeps; one added command in `.github/workflows/nightly.yml` next to the determinism gate.
3. Voxel fuzz smoke slices: by default each fuzz suite runs a fixed, documented subset of its seed list (the first quarter, named in the suite header); the complete list is selected by a single sweep flag only `test:fuzz` sets.
4. Workflow Verification Strategy: a tiered phase-verification policy — phase test legs run the touched package's suite; full `bun run verify && bun run build` remains mandatory at every phase acceptance (already configured as `verify_phase`).
5. Phase evidence records measured before/after numbers against the metrics above.

**Out:**
- No test logic or semantics changes beyond seed-count slicing: every existing assertion keeps its meaning; nothing is weakened, skipped, or removed.
- No new dev dependency; no new test framework.
- No changes to production code (`apps/client`, `packages/sim`, and voxel production modules are untouched) — only test files, scripts, workflow config, package.json, and the nightly workflow file.
- The determinism gate itself is unchanged.
- No coverage-gate introduction, no a11y/E2E additions (separate candidates).

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | The Workflow Config gains `test_phase: "bun test --check --parallel=4 --timeout 120000"`, and phase plans' Verification test legs use `test_phase` instead of the serial form. | must |
| FR-2 | The full-suite test leg under `test_phase` completes in ≤ 150 s on the dev machine, measured and recorded in phase evidence. | must |
| FR-3 | Each voxel fuzz suite runs a fixed, documented smoke seed subset by default — the first quarter of that suite's seed list, named in the suite header — and the complete seed list when the sweep flag (`APEX_FUZZ_SWEEP=full`) is set. Plain `bun test` runs always get the same seeds, so gate failures reproduce locally byte-for-byte. | must |
| FR-4 | Root `package.json` gains `test:fuzz` (runs the voxel fuzz suites with the sweep flag set), and `.github/workflows/nightly.yml` invokes it alongside the determinism gate. | must |
| FR-5 | `conductor/workflow.md`'s Verification Strategy documents the tiered phase-verification policy (co-located → package suite → full verify at acceptance), and the plan-template guidance for phase Verification lines follows it. | must |
| FR-6 | All three module-size guards (client, sim, voxel) pass under `--parallel` workers with their negative controls demonstrably firing; the run is recorded in evidence. | must |
| FR-7 | The nightly full sweep is expected to complete comfortably within the nightly job; the evidence documents the expected duration on a ~4-core CI runner. | should |

## Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | No test semantics change: slicing reduces seed counts in gate mode only; full sweeps remain available and green. | must |
| NFR-2 | No new dependency in any workspace; no production-code change. | must |
| NFR-3 | The determinism gate is unchanged: 18 creature GLBs + prop digests stay byte-identical; nightly still runs the gate. | must |
| NFR-4 | Smoke slices are deterministic and documented: the same seeds every gate run, the slicing rule stated in each suite's header comment. | must |
| NFR-5 | Byte caps respected: touched `*.test.ts` files are exempt by the existing guards; no non-test module is touched. | must |

## Acceptance Criteria

| ID | Criterion | Verifies |
|----|-----------|----------|
| AC-1 | `test_phase` exists in the Workflow Config; the measured full-suite leg under it is ≤ 150 s, recorded in phase evidence. | FR-1, FR-2 |
| AC-2 | `bun test packages/voxel` (default mode) completes in ≤ 70 s and runs the documented smoke slice; with the sweep flag set, at least one suite demonstrably runs its full seed list again. | FR-3 |
| AC-3 | `bun run test:fuzz` is green locally, and the nightly workflow file invokes it next to the determinism gate. | FR-4 |
| AC-4 | `conductor/workflow.md` documents the tiered policy and the new command; the change is discoverable for the next track's planning. | FR-5 |
| AC-5 | All three guards pass with negative controls firing under `--parallel` workers, recorded in evidence. | FR-6 |
| AC-6 | `bun run gate:determinism` stays byte-identical (18 GLBs + props), and full `bun run verify` completes in ≤ 120 s, measured. | NFR-3, metric 3 |

## Edge Cases

- **Guards under worker isolation:** each guard's negative control writes an oversized fixture into a unique `mkdtemp` temp dir and removes it in a `finally`. This is expected to be worker-safe; the track must prove it with a green parallel run plus a deliberately triggered control, not assume it.
- **`--check` + `--parallel` combination:** `verify` already runs them together on every commit; `test_phase` mirrors that proven combination, only adding the worker cap.
- **Fuzz file structure:** each boundary/budget fuzz file carries its own seed list; slicing is per file, so every bucket file stays present in the gate (coverage breadth retained, depth trimmed).
- **CI runner profile:** GitHub-hosted runners have ~4 cores, so bun's default parallelism self-caps there; CI's `verify` command is unchanged.
- **Nightly duration:** the full sweep is serial-equivalent ~141 s today; on a ~4-core runner a few minutes is acceptable for a nightly cron.
- **The sweep flag default:** unset flag = smoke (the common case — local runs, phase runs, PR CI); only `test:fuzz` sets `full`. A developer running `bun test packages/voxel` locally gets exactly what PR CI gets.

## Dependencies

- **Tracks:** none.
- **External:** none.

## Open Questions & Assumptions

- **Decision (clarified in interview):** the smoke slice is a fixed, documented seed subset (first quarter per suite); the single sweep flag exists only so `test:fuzz` can restore the full list — it is not a general-purpose mode switch.
- Assumption: bun 1.4.x flags (`--parallel=<N>`, `--check`) behave as observed in this session's measurements; the track re-measures rather than trusting the baseline table.
- Assumption: the exact smoke-slice constant naming and per-suite header wording are chosen at implementation.
- Assumption: the ≤ 150 s and ≤ 70 s targets are set for this 20-core dev machine; CI is measured against its own current baseline.

## References

- Session measurements, 2026-10-23 (serial 206 s / parallel 92 s / voxel 141 s serial, 61 s parallel; `bun test --help` parallel/isolate documentation).
- `.github/workflows/nightly.yml` (currently runs only `bun run gate:determinism`).
- `conductor/workflow.md` — Verification Strategy and Workflow Config.
- `apps/client/src/module-size.test.ts`, `packages/sim/src/module-size.test.ts`, `packages/voxel/src/module-size.test.ts` — the guards whose negative controls must survive worker isolation.
