# Review: Voxelize Performance Pass

- Track: `20261125-voxelize-performance-pass`
- Type: chore
- Branch: `chore/20261125-voxelize-performance-pass`
- Range: `10af88e843af49ce8ae5657093265a0f8fbf2432..fe36d113d38d206c6f13b78b6f7d17e8a9171672`
- Date: 2026-11-25T15:05:52.0633661+11:00
- Verdict: **PASS WITH FINDINGS**

## Summary

The fixed 63-case corpus and every committed artifact remain byte-identical, and
repeated measurements support both approved targets: 28.095% lower median
`voxelize()` time and 21.032% lower capped package-gate wall time. Review found two
Medium evidence/semantics issues and two Low traceability/evidence issues. Strict
mode requires all four to be fixed before the PR.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Benchmark | `bun packages/voxel/scripts/benchmark-voxelize.ts` ×2 | 142.3435 ms median; 28.095% reduction | `verification/phase-3.md` §1 |
| Package gate | `bun test --check --parallel=4 --timeout 120000 packages/voxel` | 640 pass / 0 fail; 103.2200 s; 21.032% reduction | `verification/phase-3.md` §1 |
| Serial tests | `bun test --timeout 120000` | 4480 pass / 1 skip / 0 fail; 670883 expects | `.conductor/evidence/20261125-voxelize-performance-pass/review/serial-test.txt` |
| Verify | `bun run verify` | 4480 pass / 1 skip / 0 fail; hash `0xff6f3d62` | `verification/integrated.md` §6 |
| Typecheck | `bun run check` | all workspaces clean | primary review check |
| Lint/format | `bunx biome check` | 1044 files clean | primary review check |
| Build | `bun run build` | exit 0 | `verification/integrated.md` §6 |
| Determinism | `bun run gate:determinism` | 63 GLBs + five props byte-identical | `verification/integrated.md` §6 |
| Fuzz | `bun run test:fuzz` | 139 pass / 0 fail | `verification/integrated.md` §6 |
| Telemetry | `bun run telemetry` | 14/14 bounds green | `verification/integrated.md` §6 |
| Balance | `bun run balance` | all gates green | `verification/integrated.md` §6 |
| Identity | exact characterization + ordinary no-index diff | byte-identical | `verification/integrated.md` §3 |
| Scope | quiet out-of-scope diff | exit 0 | `verification/integrated.md` §7 |
| Whitespace | `git diff --check <base>..HEAD` | exit 0 | primary check |
| Worktree | `git status --porcelain` | clean | primary check |

## Requirements

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 | covered | Fixed 63-case/315-sample harness and seven tests |
| FR-2 | covered | Untouched baseline and measured 83.118% mesher/AO profile |
| FR-3 | covered | Voxelizer/SDF/mesher changes tied to measured stages |
| FR-4 | covered | Cache/worker explicitly N/A |
| FR-5 | covered | Frozen characterization and artifact/hash identity |
| FR-6 | covered | Repeated 28.095% / 21.032% reductions |
| FR-7 | partial | F1 mutable-endpoint regression missing |
| FR-8 | covered | Dated tech-stack note and integrated evidence |
| NFR-1 | covered | No dependency/manifest/lockfile/CI change |
| NFR-2 | partial | F1 stale round-cone endpoint state for mutable inputs |
| NFR-3 | covered | Cache/worker N/A |
| NFR-4 | covered | Existing artifacts/baselines unchanged |
| NFR-5 | covered | Typecheck and Biome pass |
| NFR-6 | covered | All configured checks pass |
| NFR-7 | covered | Module caps/budgets unchanged |
| NFR-8 | covered | Benchmark-only timing/debug code |
| NFR-9 | partial | F2 baseline load context incomplete |
| AC-1 | covered | Corpus/order/stages/seed/schema pinned |
| AC-2 | covered | Baseline/profile evidence |
| AC-3 | partial | F2 comparable baseline load not fully auditable |
| AC-4 | covered | All deterministic outputs byte-identical |
| AC-5 | covered | Cache/worker N/A |
| AC-6 | covered | Focused and configured checks pass |
| AC-7 | covered | Allowed scope only |
| AC-8 | covered | One dated tech-stack note |
| AC-9 | covered | Integrated evidence committed; F4 wording correction pending |
| AC-10 | covered | Clean diff-check and worktree |

## Findings

### Medium

#### F1 — Round-cone endpoint invariants are stale for mutable inputs

- File: `packages/voxel/src/sdf.ts:115-128`
- What: `sdRoundCone` hoists endpoint-derived `bax/bay/baz`, `l2`, `a2`,
  `useFallback`, `signRr`, and `il2` outside the returned callback. Mutating `a`
  or `b` after construction leaves the distance field and fallback decision stale.
- Why: The previous implementation recomputed these values on each evaluation.
  Mutable `Vec3` endpoints therefore change behavior, contradicting the
  semantics-preserving claim. No current production mutation path was found, so
  this is Medium rather than High.
- Fix: Move endpoint-derived invariant calculations inside the callback while
  retaining scalar arithmetic. Add a regression that mutates endpoints across
  the fallback boundary and compares against a freshly constructed SDF.
- Requirement: NFR-2, FR-7
- Test gap: mutable-endpoint/fallback regression.

#### F2 — Baseline load context is incomplete

- File: `conductor/tracks/20261125-voxelize-performance-pass/verification/phase-1.md:53-69`
- What: The baseline records machine/runtime/corpus but no load snapshot or
  explicit active-process/CPU-load narrative comparable to the final runs.
- Why: NFR-9 and AC-3 require comparable conditions with load context recorded.
  The measured margins are large, but the before/after comparison is not fully
  auditable.
- Fix: Repeat the untouched production baseline and final measurements under the
  same recorded low-load conditions, retaining process/load context and updating
  Phase 1, Phase 3, and integrated tables.
- Requirement: NFR-9, AC-3
- Test gap: none.

### Low

#### F3 — Phase 2 checkpoint SHA is invalid

- File: `conductor/tracks/20261125-voxelize-performance-pass/plan.md:80`
- What: The plan records `e95a1552`; that revision does not exist. The actual
  Phase 2 checkpoint is `e85a1552`.
- Why: The invalid SHA breaks phase-range traceability.
- Fix: Correct the checkpoint and all phase-range references.
- Requirement: none
- Test gap: none.

#### F4 — Package test-count explanation is imprecise

- File: `conductor/tracks/20261125-voxelize-performance-pass/verification/phase-3.md:39-40`
- What: Evidence says five added package tests are benchmark/characterization
  coverage. The seven benchmark tests already existed in the 635-test baseline;
  the net five additions are characterization tests.
- Why: The count explanation weakens evidence accuracy.
- Fix: State that benchmark tests were present in both runs and the net five
  additions are voxelizer/SDF/mesher characterization coverage. Correct
  `integrated.md` too.
- Requirement: AC-9
- Test gap: none.

## Overrides

None.

## Plan compliance

All three phases are verified, all 13 top-level tasks and 32 nested subtasks are
checked, and conditional cache/worker/blocked-target paths are explicitly N/A.
No task was dropped. The final diff stays within allowed pipeline/tests/benchmark,
documentation, and Conductor artifacts. F3 is the only checkpoint defect.

## Out of scope

No artifact, dependency, manifest, anatomy, resolution, gameplay, save schema,
API, or deployment change was found.

## Debt

None. Strict mode requires F1–F4 to be fixed in Phase R1.

## Doc sync

Updated — dated 2026-11-25 `conductor/tech-stack.md` note exists; review-fix
measurement changes may require a follow-up wording update.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 2 | 2 | 0 (Phase R1 pending) |
