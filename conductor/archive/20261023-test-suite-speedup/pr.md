# refactor(build): test-suite speedup — capped parallel runner, fuzz smoke slices, nightly sweep

## Summary

The test suite stopped being the bottleneck. The phase test leg drops **206 s → 53 s (~4×)** via two levers that keep every assertion intact: a worker-capped parallel runner for interactive/phase runs, and deterministic smoke slices for the voxel fuzz suites whose full seed lists move to the nightly. No behavior change, no dependency change, no production code touched.

| Metric | Before | After | Target |
|---|---|---|---|
| Whole-suite phase leg (capped 4 workers) | 210 s (was 206 s serial) | **53–58 s** | ≤ 150 s ✅ |
| `bun run verify` | ~120–157 s | **77–80 s** | ≤ 120 s ✅ |
| Voxel-alone PR-gate leg | 141 s serial | **69 s** capped-4 | ≤ 70 s ✅ |
| Full fuzz sweep (nightly) | n/a — always full, everywhere | **41 s**, 303 seeds | "completes comfortably" ✅ |
| CI | ~1m20–1m40s | unchanged by design | no regression ✅ |

## Track

- Spec: [conductor/archive/20261023-test-suite-speedup/spec.md](conductor/archive/20261023-test-suite-speedup/spec.md)
- Plan: [conductor/archive/20261023-test-suite-speedup/plan.md](conductor/archive/20261023-test-suite-speedup/plan.md)
- Verification: [integrated.md](conductor/archive/20261023-test-suite-speedup/verification/integrated.md) + per-phase evidence
- Track registry: archived as complete in [conductor/tracks.md](conductor/tracks.md)

## What happened

| Phase | Goal | Checkpoint |
|---|---|---|
| Phase 1 | Capped parallel runner (`test:phase`, `--parallel=4`) + the tiered verification policy | `e17e5a3` |
| Phase 2 | Smoke slices in all 41 voxel fuzz suites (first-quarter gate seeds; full lists behind `APEX_FUZZ_SWEEP=full`) | `3f26097` |
| Phase 3 | `test:fuzz` script + the nightly "Fuzz sweep" step + final end-to-end measurements | `a454fb14` |
| Phase R1 | Review fixes: revised plan target (70 s), count-neutral gate titles (41 files), the ~4-core runner expectation | `98f27e0` |

## Requirements

- [x] FR-1 — `test_phase` in the Workflow Config (`bun test --check --parallel=4 --timeout 120000`)
- [x] FR-2 — phase test leg ≤ 150 s (measured 53–58 s)
- [x] FR-3 — fixed, documented first-quarter smoke slice by default; full lists under the sweep flag (89 gate seeds vs 303 full; +92 expects restored on sweep)
- [x] FR-4 — root `test:fuzz` script + one `Fuzz sweep` step in nightly.yml beside the determinism gate
- [x] FR-5 — the tiered policy documented (workflow.md Phase Test Tiers)
- [x] FR-6 — all three module-size guards proven under workers incl. negative controls (15/0)
- [x] FR-7 — nightly sweep completes comfortably (41 s dev; 35–60 s derived for the ~4-core runner)
- [x] NFR-1/2/3/4/5 — no test semantics change, no production/dep change, determinism gate unchanged (18 GLBs + 5 props byte-identical), slices deterministic + documented, byte caps respected

## Verification

| Layer | Command | Result |
|---|---|---|
| Static | `bun run check` | ✅ voxel 90 / sim 147 / client 352 files |
| Static | `biome check` | ✅ 570 files clean |
| Unit | `bun test --check --parallel --timeout 120000` | ✅ 2,452 pass / 1 skip / 0 fail, 126,720 expect(), 194 files |
| Determinism | `bun run gate:determinism` | ✅ 18 GLBs + 5 props byte-identical |
| Fuzz sweep | `bun run test:fuzz` | ✅ 44 tests / 765 expect() / 41 s |
| Phase runner | `bun run test:phase` | ✅ 53–58 s |
| Integrated | `bun run verify && bun run build` | ✅ exit 0 / 0; verify 77 s |

## Review

**PASS** after 2 rounds — round 1 found 3 Low doc/traceability findings (all fixed in Phase R1: revised plan target, 41 count-neutral gate titles, the derived ~4-core runner expectation); round 2 confirmed all fixes and surfaced one residual traceability nit (the integrated.md echo), landed at resolution. No Critical/High/Medium findings across both rounds.

## Deviations and risks

- The `test:fuzz` script value landed as the POSIX-prefix env form (`APEX_FUZZ_SWEEP=full bun test …`) instead of the brief's first suggestion — runtime-proven cross-platform (bun's script shell on Windows; native bash in the nightly).
- The voxel-alone spec target was revised 35 s → 70 s with user approval after measurement showed a per-file import-overhead floor unreachable by any seed count (69 s achieved).
- Phase 1's plan covers were amended for honest traceability: the ≤ 150 s numeric target is claimed at Phase 3 (after the slices), not at Phase 1 (210 s at that point).
- Risk: none functional. The PR-gate now deliberately runs fewer fuzz seeds than were run before this track — the full lists still run nightly, and gate failures carry the exact slice bounds for local reproduction. This is the trade the track exists to make.
- Rollback: plain `git revert`; no save-schema implications (no game-code change at all).

## Follow-ups

- The old "voxelize-perf follow-up" note (tech-stack 2026-10-10) is partly addressed by the slice work; a dedicated voxelize-perf pass could lower the 60–70 s voxel import-overhead floor if the nightly or the gate ever needs to shrink further.

## Rollback

Plain `git revert`; no user data touched (the track changes no gameplay code and no save schema).
