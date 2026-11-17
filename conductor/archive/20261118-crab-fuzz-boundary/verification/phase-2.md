# Phase 2 Verification — Gate-visible regression coverage and scope proof

- **Track:** 20261118-crab-fuzz-boundary
- **Phase:** 2
- **Date:** 2026-11-18
- **Branch:** `fix/20261118-crab-fuzz-boundary`
- **Phase base:** `9c0fe00413734079749db40d3b7cf16671e1d88f`
- **Plan/track base:** `b7fcaf47fad9810396b13c3776589448423d4fda`
- **Head:** `145e797bb2c3db6a229855478b4dde56b7c5b863` (format-rework commit; phase test commit `bdfb0097cc49e00ac064ca0291e8c80b8c07cc24`; evidence file left uncommitted for the primary state commit)
- **Result:** **verified** — the primary re-ran the exact verification command after the Biome format rework and it exited 0. Both task-level changes are complete and git scope proof passes; all Phase 2 acceptance criteria are satisfied.

## Summary

The two nightly-failing seeds are now explicit, always-on PR-visible boundary assertions. In each shard the existing three-seed smoke prefix is retained and the failing seed is added to the PR-visible chunk (`[20, 21, 22, 24]` and `[30, 31, 32, 37]`), while `FULL_CHUNK` and the `APEX_FUZZ_SWEEP=full` branch are unchanged — the full sweep still covers all ten seeds per shard. A dedicated, env-independent `test(...)` per shard names the seed and asserts the original invariant: no voxel coordinate equals `0` or `CRAB_GRID - 1` (55). The existing chunk assertion body is byte-for-byte unchanged. No UI, `aria-live`, or other code was touched.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Baseline | `git status --short --branch` | 0 | On `fix/20261118-crab-fuzz-boundary`, ahead 6, clean tree at phase start. |
| Baseline | `git log --oneline --max-count=10` | 0 | Head `9c0fe00` = phase base. Phase 1 fix commit `d2c9f679` present. |
| Scope (baseline) | `git diff --name-only 9c0fe00413734079749db40d3b7cf16671e1d88f..HEAD` | 0 | Empty at phase start (HEAD still at phase base). |
| Commit | `git add packages/voxel/src/fuzz/boundary.crab.{20-29,30-39}.test.ts` | 0 | Both shards staged. |
| Commit | `git commit -m "test(voxel): make crab boundary seeds 24 and 37 PR-visible"` | 0 | `bdfb0097cc49e00ac064ca0291e8c80b8c07cc24`; 2 files changed, 42 insertions(+), 2 deletions(-). |
| Diff proof | `git show --stat HEAD` | 0 | Only the two crab fuzz shards in the phase commit. |
| Scope (phase) | `git diff --name-only 9c0fe00413734079749db40d3b7cf16671e1d88f..HEAD` | 0 | Exactly `boundary.crab.20-29.test.ts` and `boundary.crab.30-39.test.ts` — both in Phase 2 Touches. |
| Scope (track) | `git diff --name-only b7fcaf47fad9810396b13c3776589448423d4fda..HEAD` | 0 | Six `artifacts/crab-42*` fixtures, `crab.ts`, six Conductor state/evidence files, and the two fuzz shards — all within FR-6 approved paths. |
| Scope counts | `git diff --stat 9c0fe00413734079749db40d3b7cf16671e1d88f..HEAD` | 0 | 2 files changed, 42 insertions(+), 2 deletions(-). |
| Whitespace | `git diff --check 9c0fe00413734079749db40d3b7cf16671e1d88f..HEAD` | 0 | Clean; no whitespace errors. |
| Hash | `git hash-object packages/voxel/src/fuzz/boundary.crab.20-29.test.ts` | denied | `Permission denied: shell`; per-file blob hashes unavailable. Commit hashes below recorded instead. |
| Hash | `git hash-object packages/voxel/src/fuzz/boundary.crab.30-39.test.ts` | denied | Same denial; not retried or worked around. |
| Verification | `bun run verify && bun run build && bun run test:fuzz` | denied | `Permission denied: shell`; exact command could not be run by this subagent. Primary to re-run. |

## Pre-fix failure / post-fix pass evidence (P2.T1.2)

The new assertions reproduce the original failing check verbatim (`expect(violations).toBe(0)` with the same boundary predicate). Recorded evidence that they fail on the pre-fix generator and pass after Phase 1:

- **Pre-fix (fail):** `spec.md` Bug Details — local `bun run test:fuzz` on the unfixed generator was 93 pass / 2 fail; shards `boundary.crab.20-29` and `boundary.crab.30-39` failed at `expect(violations).toBe(0)` with `Received: 4`. Seed 24 leg voxels at `[19,0,33]`, `[36,0,33]`, `[19,0,22]`, `[36,0,22]`; seed 37 at `[18,0,34]`, `[37,0,34]`, `[18,0,21]`, `[37,0,21]` — four leg voxels on `y = 0` each. Against the pre-fix generator each new named assertion would therefore count `violations = 4` and fail.
- **Post-fix (pass):** `phase-1.md` primary verification — the full sweep after the `footY` fix was 95 pass / 0 fail, 1005 `expect()` calls, "previously failing seeds 24 and 37 now clean"; full `bun run verify && bun run build && bun run test:fuzz` exit 0. The new assertions reuse that fixed generator path unchanged.
- **Subagent execution:** the exact verification command was shell-denied, so this phase records the pre/post evidence rather than claiming an independently re-run pass; the primary resolves this blocker as in Phase 1.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-2 | Explicit regression coverage for seeds 24 and 37 | Named always-on tests in both shards; PR chunk now includes seed 24 / seed 37. | done |
| AC-1 | Regression test fails before fix, passes after | Pre-fix `Received: 4` reproduction (spec + Phase 1 baseline); post-fix 95 pass / 0 fail (Phase 1 primary) and 97 pass / 0 fail with the two new named tests (Phase 2 primary). | verified |
| NFR-4 | PR smoke slice unchanged; full sweep exclusive to `test:fuzz` | Three-seed prefix kept; `FULL_CHUNK` and the `APEX_FUZZ_SWEEP=full` branch untouched; named regression tests are env-independent. | done |
| FR-6 / AC-6 | Change set confined to approved paths | Phase scope: 2 fuzz shards only. Full-track scope: `artifacts/crab-42*`, `crab.ts`, Conductor state/evidence, 2 fuzz shards — all FR-6 paths. | verified |
| NFR-5 | Evidence records exact commands, counts, hashes | Commands table above; counts from `git diff --stat`; commit hashes in header/notes. | done |

## Hashes

| Object | Hash |
| --- | --- |
| Phase base commit | `9c0fe00413734079749db40d3b7cf16671e1d88f` |
| Plan/track base commit | `b7fcaf47fad9810396b13c3776589448423d4fda` |
| Phase 1 fix commit | `d2c9f679` (short) |
| Phase 2 commit (this phase) | `bdfb0097cc49e00ac064ca0291e8c80b8c07cc24` |
| Format rework commit | `145e797bb2c3db6a229855478b4dde56b7c5b863` |
| Blob `boundary.crab.20-29.test.ts` | `5e09bb3d0b15ed0b1a4751c9b037aa2bde4ad336` |
| Blob `boundary.crab.30-39.test.ts` | `f7bbdaaeedccf2c60d688c1f07cc74e712ea60bf` |

The primary obtained the two blob hashes with `git hash-object` after the format rework.

## Evidence paths

- `packages/voxel/src/fuzz/boundary.crab.20-29.test.ts` — seed 24 added to PR chunk; explicit seed-24 regression test (committed as `bdfb0097`).
- `packages/voxel/src/fuzz/boundary.crab.30-39.test.ts` — seed 37 added to PR chunk; explicit seed-37 regression test (committed as `bdfb0097`).
- `conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-1.md` — pre-fix baseline (93 pass / 2 fail, `Received: 4`) and post-fix sweep (95 pass / 0 fail).
- `conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-2.md` — this file; left uncommitted for the primary state commit.

## Deviations

- None. All edits stayed inside the two test shards in Phase 2 Touches plus this evidence file. No product or design decision was required.

## Notes

- The verification command `bun run verify && bun run build && bun run test:fuzz` returned `Permission denied: shell`. Per the phase rules it was not retried, rephrased, or worked around; the primary should re-run the exact command and record the result here/on acceptance (Phase 1 used the same resolution).
- `git hash-object` (both invocations) also returned `Permission denied: shell`; commit hashes are recorded instead.
- The new named tests run in both the PR gate and the full sweep; in the full sweep seeds 24 and 37 are consequently asserted twice (once via `FULL_CHUNK`, once via the named test). This adds an assertion but does not change full-sweep coverage: all ten seeds per shard remain covered.
- No UI code or second `aria-live` region was added — this is a voxel-only track.

## Rework note (Biome format only)

The primary ran the exact verification command after the phase test commit: the unit layer passed (4207 pass / 1 skip / 0 fail) but Biome reported 2 format errors — both shards' `const CHUNK =` ternary had to be on one line (`const CHUNK = process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : SMOKE_CHUNK`). Applied exactly that formatting to both shards and nothing else (no logic, seed lists, assertions, comments, or other files changed), committed as `145e797bb2c3db6a229855478b4dde56b7c5b863` (`style(voxel): format crab fuzz CHUNK assignment for Biome`, 2 files changed, 2 insertions(+), 4 deletions(-)). Re-running `bun run verify && bun run build && bun run test:fuzz` from the subagent shell again returned `Permission denied: shell`; not retried or worked around. The primary re-ran the exact command and confirmed exit 0 below.

## Primary verification

| Layer | Command | Result |
| --- | --- | --- |
| Static/unit/determinism | `bun run verify` | exit 0 — `4207 pass / 1 skip / 0 fail`, `491,341 expect()` calls, 4,208 tests across 377 files; Biome checked 946 files, no fixes; determinism gate OK for all 15 species GLBs (including regenerated crab baby/juvenile/champion) and 5 prop seed-42 digests; final sim hash `0xff6f3d62`, cap share `224/840 (26.7%)`. |
| Build | `bun run build` | exit 0 — Vite 8.3.4, 420 modules, built in 326 ms (chunk-size warning only). |
| Full fuzz | `bun run test:fuzz` | exit 0 — `97 pass / 0 fail`, `1,007 expect()` calls, 97 tests across 93 files; both new named seed-24/seed-37 boundary tests pass and all ten seeds per shard remain covered. |
| Combined | `bun run verify && bun run build && bun run test:fuzz` | exit 0. |
| Scope | `git status --porcelain`; `git diff --name-only 9c0fe00413734079749db40d3b7cf16671e1d88f..HEAD`; `git log --oneline --max-count=5 9c0fe004..HEAD` | exit 0 — only untracked evidence file; diff contains exactly the two fuzz shards; commits `145e797b` and `bdfb0097` match the subagent report. |
| Blob hashes | `git hash-object packages/voxel/src/fuzz/boundary.crab.20-29.test.ts packages/voxel/src/fuzz/boundary.crab.30-39.test.ts` | exit 0 — `5e09bb3d0b15ed0b1a4751c9b037aa2bde4ad336`, `f7bbdaaeedccf2c60d688c1f07cc74e712ea60bf`. |

Conclusion: the two new named regressions are gate-visible, the full fuzz sweep is green, and the Biome format rework is clean. F1-style evidence gap from the earlier blocked state is closed. Result: **verified**.
