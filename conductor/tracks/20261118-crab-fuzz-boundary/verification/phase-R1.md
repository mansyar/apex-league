# Phase R1 Verification — Review Fixes

- **Track:** 20261118-crab-fuzz-boundary
- **Phase:** R1 — Review Fixes
- **Date:** 2026-11-18
- **Branch:** `fix/20261118-crab-fuzz-boundary`
- **Phase base:** `752ec0286afcd3f4110d414ac282b71ff0c7d29e`
- **Head:** `534191bb793e2d0be37acab2b932803067bc1811` (fix commit; this evidence file left uncommitted for the primary state commit)
- **Result:** **verified** — the F1/F2 code fix is complete, scoped, and committed. The subagent's verification command was `Permission denied: shell`; the primary re-ran the exact command and recorded exit 0 below.

## Summary

F1 and F2 are resolved. Both crab boundary shards now restore the original, unchanged three-seed PR smoke slice (`FULL_CHUNK.slice(0, 3)`) via `const CHUNK = process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)`, with `SMOKE_CHUNK` removed. `FULL_CHUNK`, the `APEX_FUZZ_SWEEP=full` branch, the gate-slice test body, the named seed-24 / seed-37 regression tests, all assertions, imports, and every other file are byte-for-byte untouched. The `CHUNK` statement was written in the exact Biome-clean two-line form taken from the pre-Phase-2 revision (`git show 9c0fe004:...`), which satisfies the repo's 80-character `lineWidth`; no split ternary was left in a Biome-rejected shape.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Baseline | `git status --short --branch` | 0 | On `fix/20261118-crab-fuzz-boundary`, ahead 13, clean tree at phase start. |
| Baseline | `git log --oneline --max-count=8` | 0 | Head `752ec028` = phase base. |
| Format reference | `git show 9c0fe00413734079749db40d3b7cf16671e1d88f:packages/voxel/src/fuzz/boundary.crab.20-29.test.ts` | 0 | Confirmed original Biome-clean `CHUNK` form (assignment on one line, indented ternary on the next). |
| Diff proof | `git diff -- packages/voxel/src/fuzz/boundary.crab.20-29.test.ts packages/voxel/src/fuzz/boundary.crab.30-39.test.ts` | 0 | Only the two intended `CHUNK`/comment/`SMOKE_CHUNK` blocks changed; no other hunk. |
| Whitespace | `git diff --check` | 0 | Clean; no whitespace errors. |
| Commit | `git add packages/voxel/src/fuzz/boundary.crab.20-29.test.ts packages/voxel/src/fuzz/boundary.crab.30-39.test.ts` | 0 | Both shards staged. |
| Commit | `git commit -m "fix(voxel): restore three-seed PR fuzz smoke slice"` | 0 | `534191bb793e2d0be37acab2b932803067bc1811`; 2 files changed, 10 insertions(+), 8 deletions(-). |
| Diff proof | `git show --stat HEAD` | 0 | Only the two crab fuzz shards in the phase commit. |
| Scope (phase) | `git diff --name-only 752ec0286afcd3f4110d414ac282b71ff0c7d29e..HEAD` | 0 | Exactly `boundary.crab.20-29.test.ts` and `boundary.crab.30-39.test.ts` — both in Phase R1 Touches. |
| **Verification (subagent)** | `bun run verify && bun run build && bun run test:fuzz` | denied | `Permission denied: shell`; not retried, rephrased, or worked around. |
| **Verification (primary)** | `bun run verify && bun run build && bun run test:fuzz` | 0 | 4207 pass / 1 skip / 0 fail, Biome 946 files clean, determinism gate OK (`0xff6f3d62`), build 420 modules, full fuzz 97 pass / 0 fail. |

## F1 / F2 resolution

| Finding | File | Before | After | Requirement |
| --- | --- | --- | --- | --- |
| F1 | `packages/voxel/src/fuzz/boundary.crab.20-29.test.ts` | `SMOKE_CHUNK = [20, 21, 22, 24]`; `CHUNK = ... ? FULL_CHUNK : SMOKE_CHUNK` (four PR-visible seeds) | `SMOKE_CHUNK` removed; `CHUNK = ... ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)` → PR slice `[20, 21, 22]` only; comment names seed 24 | NFR-4 |
| F2 | `packages/voxel/src/fuzz/boundary.crab.30-39.test.ts` | `SMOKE_CHUNK = [30, 31, 32, 37]`; `CHUNK = ... ? FULL_CHUNK : SMOKE_CHUNK` (four PR-visible seeds) | `SMOKE_CHUNK` removed; `CHUNK = ... ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)` → PR slice `[30, 31, 32]` only; comment names seed 37 | NFR-4 |

Both `FULL_CHUNK` arrays and the `process.env.APEX_FUZZ_SWEEP === "full"` branch are unchanged, so the full sweep still covers all ten seeds per shard and `APEX_FUZZ_SWEEP=full` remains exclusive to `bun run test:fuzz`.

## Always-on regression coverage (unchanged)

The named, env-independent regression tests remain in both shards and are gate-visible in **both** the PR gate and the full sweep:

- `crab boundary regression: seed 24 keeps every voxel off 0 and CRAB_GRID - 1` (shard 20-29)
- `crab boundary regression: seed 37 keeps every voxel off 0 and CRAB_GRID - 1` (shard 30-39)

Their bodies, boundary predicates, assertions, and `120000` timeouts were not modified. Restoring the three-seed smoke slice therefore removes only the redundant fourth PR-visible seed; the fix remains gate-visible through these two always-on tests.

## Final full gate counts (primary-observed)

The primary re-ran the exact command after the fix; all values below are observed, not expected:

| Layer | Observed result |
| --- | --- |
| `bun run verify` | exit 0 — 4207 pass / 1 skip / 0 fail, 491,341 `expect()` calls, 4208 tests across 377 files; Biome checked 946 files, no fixes applied; determinism gate OK for all 15 species GLBs and 5 prop seed-42 digests, final sim hash `0xff6f3d62`, cap share 224/840 (26.7%). |
| `bun run build` | exit 0 — Vite 420 modules, built in 396 ms, chunk-size warning only. |
| `bun run test:fuzz` | exit 0 — 97 pass / 0 fail, 1007 `expect()` calls, 97 tests across 93 files; named seed-24/seed-37 regressions pass, all ten seeds per shard covered. |
| Combined | `bun run verify && bun run build && bun run test:fuzz` exit 0. |

The expected non-gating diagnostic in `scripts/smoke/smoke.test.ts`
(`smoke: RESULT fail ... not an http(s) URL: file:///tmp/x`) remains unchanged.

## Evidence paths

- `packages/voxel/src/fuzz/boundary.crab.20-29.test.ts` — three-seed PR slice restored; seed-24 named regression untouched (committed as `534191bb`).
- `packages/voxel/src/fuzz/boundary.crab.30-39.test.ts` — three-seed PR slice restored; seed-37 named regression untouched (committed as `534191bb`).
- `conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-R1.md` — this file; left uncommitted for the primary state commit.

## Deviations

- None. All edits stayed inside the two test shards in Phase R1 Touches plus this evidence file. No product or design decision was required.

## Notes

- The verification command `bun run verify && bun run build && bun run test:fuzz` returned `Permission denied: shell`. Per the phase rules it was not retried, rephrased, or worked around; the primary must re-run the exact command and record the observed result.
- The `CHUNK` expression is 90 characters on one line and would exceed Biome's `lineWidth: 80`. The committed form matches the exact original pre-Phase-2 formatting retrieved from git (`const CHUNK =` on one line, the ternary indented on the next), which was previously Biome-clean. This avoids repeating the Phase 2 format failure without requiring a local Biome run.
- No artifact was generated, regenerated, or modified in this phase. The six `artifacts/crab-42*` files (three `.glb` / three `.manifest.json` pairs) were confirmed present via glob and remain untouched; no determinism baseline change was made.
- No UI, sim, save, or dependency code was touched. The diff against the phase base contains exactly the two fuzz shards.

## Primary verification

| Check | Command | Result |
| --- | --- | --- |
| Scope | `git status --porcelain` | only untracked evidence file (now committed with this state) |
| Scope | `git diff --name-only 752ec0286afcd3f4110d414ac282b71ff0c7d29e..HEAD` | exactly the two crab fuzz shards, both in Phase R1 Touches |
| Whitespace | `git diff --check` | clean |
| Commits | `git log --oneline --max-count=3 752ec028..HEAD` | `534191bb fix(voxel): restore three-seed PR fuzz smoke slice` |
| Full gate | `bun run verify && bun run build && bun run test:fuzz` | exit 0 — 4207 pass / 1 skip / 0 fail, Biome 946 clean, gate OK (`0xff6f3d62`), build 420 modules, fuzz 97 pass / 0 fail |

F1 and F2 are resolved: the PR-visible smoke slice is back to the original
three-seed prefix in both shards (NFR-4 covered), while the always-on named
seed-24 and seed-37 regressions remain unchanged and gate-visible. Result: verified.
