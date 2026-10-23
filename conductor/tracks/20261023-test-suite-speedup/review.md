# Review — Test Suite Speedup

- **Track:** `20261023-test-suite-speedup` (type chore)
- **Branch:** `chore/20261023-test-suite-speedup`
- **Range:** `18eebd04065dc971c38e5e16c8dfa721f55ea277..2740f38`
- **Date:** 2026-10-24
- **Verdict:** **PASS WITH FINDINGS** (round 1 → Phase R1)

## Summary

A pure-optimization track verified end to end: deterministic first-quarter smoke slices in all 41 voxel fuzz suites with assertion bodies untouched, a runtime-proven sweep flag restoring the full lists (+92 expects at equal test counts), minimal nightly wiring beside the determinism gate, and honest documented numbers across workflow, tech-stack and the four evidence files. The reviewer re-derived the diff surface, re-inspected the slice pattern per file, and cross-checked every numeric claim. Only three Low doc/traceability findings remain.

## Verification

| Check | Command | Result |
|---|---|---|
| Static (types) | `bun run check` | ✅ exit 0 — voxel 90 / sim 147 / client 352 files |
| Static (lint+format) | `bunx biome check` | ✅ 570 files clean (the one CRLF metadata defect the integrated pass caught was Conductor state, fixed pre-review in `74c5baa`) |
| Unit | `bun test --check --parallel --timeout 120000` (in verify) | ✅ 2,452 pass / 1 skip / 0 fail, 126,720 expect(), 194 files |
| Determinism | `bun run gate:determinism` (in verify) | ✅ 18 GLBs + 5 props byte-identical |
| Fuzz sweep | `bun run test:fuzz` | ✅ 44 tests / 765 expect() / 42 files / 41 s, exit 0 (primary-supplied; reviewer run denied — see Needs) |
| Phase runner | `bun run test:phase` | ✅ 53–58 s vs ≤ 150 s |
| Integrated | `bun run verify && bun run build` | ✅ verify 77–80 s (≤ 120 s), build exit 0 |
| Guards under workers | `bun test --check --parallel=4 … module-size` | ✅ 15 pass / 0 fail incl. negative controls firing |
| Coverage | — | n/a (`coverage.gate: "none"`) |

## Volume strategy

SMALL: full pass over the code diff `18eebd0..2740f38 -- . ':!conductor'` — package.json (+2 scripts), `.github/workflows/nightly.yml` (+3), 41 voxel fuzz test files. Conductor prose and evidence excluded from code review; docs cross-checked for honesty instead.

## Requirements

| Req | Implemented by (plan) | Verified by | Status |
|---|---|---|---|
| FR-1 `test_phase` command | P1.T1.1, P1.T2.1 | package.json L13; workflow.md L43; all three phase legs | covered |
| FR-2 phase leg ≤ 150 s | P1.T1, P2 slices, P3.T3.2 | 210 s pre-slice → 73 s → **53–58 s** | covered |
| FR-3 smoke slice + sweep flag | P2.T1–T3, P2.T4.3 | per-file diff inspection; 673→765 expect at equal counts; spot-checks | covered |
| FR-4 `test:fuzz` + nightly | P3.T1.1, P3.T2.1 | package.json L14; nightly.yml one step after the gate | covered |
| FR-5 tiered policy documented | P1.T2.2, P1.T2.3 | workflow.md Phase Test Tiers (L205–220) | covered |
| FR-6 guards fire under workers | P1.T1.3 | 15/0 incl. negative controls | covered |
| FR-7 sweep completes comfortably | P3.T1.2 | 41 s — but the ~4-core-runner expectation is undocumented | **partial** → F3 |
| NFR-1 no test semantics change | P2.T1–T3 | per-file inspection: assertion bodies byte-identical; only seed consts + loop headers | covered |
| NFR-2 no dependency/production change | whole track | diff surface: no prod module, no dep, no lockfile | covered |
| NFR-3 gate unchanged | P3.T3.1 | 18-GLB byte-identity on every verify leg | covered |
| NFR-4 slices deterministic + documented | P2.T1–T3 | literal FULL consts with fixed slice(0,N); headers state the split | covered |
| NFR-5 byte caps respected | whole track | touched .ts files all test-exempt; guards green | covered |
| AC-1 config + ≤ 150 s | P1.T1, P3.T3.2 | 53–58 s measured | covered |
| AC-2 voxel gate ≤ 70 s | P2.T1–T4 | 69 s capped-4 (35→70 revision user-approved) | covered |
| AC-3 script green + nightly invokes | P3.T1, P3.T2 | 41 s run + nightly step | covered |
| AC-4 policy documented | P1.T2.2 | workflow.md | covered |
| AC-5 guards under workers | P1.T1.3 | 15/0 | covered |
| AC-6 gate byte-identical + verify ≤ 120 s | P3.T3.1 | verify 77–80 s | covered |

## Findings

### Low (3)

**F1** — `conductor/tracks/20261023-test-suite-speedup/plan.md` (Phase-2 Goal, P2.T4.1)
- **What:** both still state the pre-revision target "≤ 35 s", contradicting the user-approved spec revision to ≤ 70 s (revised 2026-10-23) and the measured 69 s.
- **Why:** spec/plan traceability inconsistency — plan.md shows a target the spec and evidence say was unreachable.
- **Fix:** update both lines to the revised "≤ 70 s (revised 2026-10-23 from 35 s after the measured import-overhead floor)" wording matching the spec.
- **Requirement:** AC-2. **Test gap:** none.
- **Disposition: fix** (plan.md is primary-owned; mechanical one-line edits).

**F2** — `packages/voxel/src/fuzz/budget.axolotl.00-03.test.ts:41` (and the other 40 sliced suites' titles)
- **What:** test titles still name the full seed range while the gate slice executes fewer — e.g. "seeds 0-3" runs 1 seed in gate mode. Titles were deliberately kept byte-identical in Phase 2; header comments carry the split.
- **Why:** in a gate-mode failure the reported test name claims a larger seed set than was exercised, which can mislead before the header is read.
- **Fix:** retitle count-neutral (title-only, no assertion impact) — e.g. "axolotl seeds run the full pipeline within the GLB budget (gate: first-quarter slice; full list via APEX_FUZZ_SWEEP=full)" — or record a user-approved decision to keep byte-identical titles.
- **Requirement:** FR-3. **Test gap:** none.
- **Disposition: fix** via count-neutral retitling (mechanical, honest; supersedes Phase 2's diff-noise-minimizing choice).

**F3** — `verification/phase-3.md`
- **What:** FR-7's evidence requirement — the expected duration on a ~4-core CI runner — is never stated; the evidence records only the 41 s dev-machine (20 workers) run.
- **Why:** without it the nightly fit is asserted from local numbers alone.
- **Fix:** add one derived sentence to the FR-7 row or integrated.md: on a ~4-core runner bun self-caps to ~4 workers; the serial-equivalent full sweep (~141 s pre-slicing serial baseline for the same pipeline family) implies roughly 35–60 s plus per-file import overhead — comfortable for the nightly cron.
- **Requirement:** FR-7. **Test gap:** none.
- **Disposition: fix** (one sentence; verification files are phase-agent-editable).

## Overrides

None.

## Plan compliance

| Phase | Status | Checkpoint | Evidence |
|---|---|---|---|
| Phase 1 — The Parallel Runner & the Tiered Policy | verified | `e17e5a3` | verification/phase-1.md |
| Phase 2 — The Voxel Smoke Slices | verified | `3f26097` | verification/phase-2.md |
| Phase 3 — The Nightly Sweep & the Full Gate | verified | `a454fb14` | verification/phase-3.md |

9/9 top-level tasks `[x]`. Final diff within the union of the phases' Touches (package.json, nightly.yml, 41 fuzz files, workflow.md, plus the track's own evidence/conductor files), except the reported deviations (test:fuzz script value landed as the POSIX-prefix form, runtime-proven; plan covers-amendment; phase-2 rival test files untouched). No Review Fixes phase pending.

## Out of scope

- `dna.test.ts` left unsliced — it is a DNA-schema property suite, not a pipeline fuzz pass; consistent with the plan's enumerated Phase-2 scope and disclosed in evidence.
- CI (`ci.yml`) untouched by design; its leg keeps the smoke slices, which is the point of the split.
- The pre-existing control-character oddity in 3 storm_hound fuzz files — pre-existing, documented in phase-2 evidence, untouched.

## Debt

None — `review.strict` is `true`, so all three Low findings are fixed in the review-fix phase rather than deferred; `review.issues.enabled` is `false`, so no issues are filed. (Proposals would have been: none beyond the three findings.)

## Doc sync

updated — pre-review sync committed as `2740f38` (tech-stack dated entry + workflow measured-numbers refinement); the review-fix changes touch no contract documented there (title strings + a derived sentence in the track's own evidence).

## History

| Round | Verdict | Critical | High | Medium | Low | Notes |
|---|---|---|---|---|---|---|
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 3 | → Phase R1 (98f27e02, verified; all three fixed: F1 plan target, F2 41 titles, F3 runner expectation) |
