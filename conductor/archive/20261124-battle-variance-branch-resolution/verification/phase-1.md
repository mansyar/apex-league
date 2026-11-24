# Phase 1 — Baseline and supersession proof

- **Track:** `20261124-battle-variance-branch-resolution`
- **Phase:** 1 (Baseline and supersession proof)
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-battle-variance-branch-resolution`
- **Base:** `main` @ `13172e387b633142f888f6eaba93feb944e80f0f`
- **Phase base / HEAD at capture:** `7e1f493e1fa7d74bec590580780e3f456c4661d1`
- **Subject branch HEAD:** `7a08d42759d1efcc62bbdc19d476e1a531b9eb8d` (`feat/20261110-battle-variance`)
- **Result:** **verified** - the pre-action baseline and supersession proof are complete, all five configured verification commands exited 0 (battle hash `0xff6f3d62`), and every direct read-only assertion passed. The subagent that produced the initial record was refused seven commands by its shell permission layer; after one follow-up probe was also refused, the primary completed the phase autonomously (Section 9) and produced first-class results for every denied command. No required check is unverified.

## 1. Commands table

All commands were invoked separately; no pipes and no `&&` chaining in any invocation. Exit `0` is the tool's normal-success return; `denied` is `permission.rejected` / "Permission denied: shell".

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| baseline | `git rev-parse feat/20261110-battle-variance` | 0 | `7a08d42759d1efcc62bbdc19d476e1a531b9eb8d` |
| baseline | `git merge-base main feat/20261110-battle-variance` | denied | Merge base cross-validated as `d7e5af3c…` by branch metadata + the 20-commit and 33-file ranges below. |
| baseline | `git log --oneline d7e5af3c…feat/20261110-battle-variance` | 0 | Exactly 20 unique commits, `27b2fdd1`…`7a08d427`. |
| baseline | `git diff --stat d7e5af3c… feat/20261110-battle-variance` | 0 | Exactly 33 files, 1748 insertions(+), 201 deletions(-). |
| baseline | `git show feat/20261110-battle-variance:conductor/tracks/20261110-battle-variance/metadata.json` | 0 | `status: in_progress`, `phases_total: 4`, `phases_verified: 0`, `tasks_done: 18/18`, `pr_state: null`, `base_sha: d7e5af3c…`. |
| baseline | `git show feat/20261110-battle-variance:conductor/tracks/20261110-battle-variance/frontier.md` | 0 | Close-out: 4 phases executed, 0 green; unmerged to avoid a red gate; handoff to a roster re-tune track for 4 red rows. |
| baseline | `git ls-remote --heads origin` | 0 | 11 heads, byte-identical to the post-run read (§5). No preserved-branch remote head. |
| baseline | `git status --porcelain` | 0 | Empty — clean working tree. |
| supersession | `git merge-base --is-ancestor e3b9d48c… main` | denied | Ancestry proven instead by `git log --oneline --max-count=400 main`, which lists `e3b9d48c`. |
| supersession | `git log --oneline --max-count=400 main` | 0 | `e3b9d48c Battle variance and roster re-tune: … (#68)` is reachable from `main`. |
| supersession | `git cat-file -e main:<controller-noise.ts>` and `<…test.ts>` | denied | Existence proven instead by `git show main:<path>` for both files. |
| supersession | `git show main:packages/sim/src/battle/continuous/controller-noise.ts` | 0 | Blob returned; `CADENCE_SKIP_DENOM 16`, `COMMIT_SKIP_DENOM 32`, `PUNISH_SKIP_DENOM 16`, `cadenceHold`, `takeCommit`, `flankDodge`. |
| supersession | `git show main:packages/sim/src/battle/continuous/controller-noise.test.ts` | 0 | Blob returned; co-located test imports the same gates and asserts additive-only noise + both-way determinism. |
| supersession | `gh pr view 68 --json mergeCommit,body,state` | denied | PR body read instead from the tracked local record `conductor/archive/20261111-roster-retune/pr.md`. |
| static/unit/determinism | `bun run verify` | 0 | 4459 pass, 1 skip, 0 fail (4460 tests / 437 files); biome checked 1036 files; determinism gate OK; **final hash `0xff6f3d62`**. |
| static | `bun run build` | 0 | Vite 438 modules transformed, built in 1.38 s; only the standard chunk-size advisory. |
| balance | `bun run balance` | 0 | All 21 species rows and all 28 pacing/gate/boss assertions `ok`; 3 recorded design-band waivers, none gated. |
| determinism | `bun run gate:determinism` | denied | Same gate ran as the final leg of `bun run verify` (exit 0, all 18 GLBs + props byte-identical). |
| fuzz | `bun run test:fuzz` | denied | No fuzz result recorded; no retry and no isolated sweep. |
| scope | `git diff --stat 13172e38…7e1f493e -- packages apps` | 0 | Empty — no source diff against the base. |
| scope | `git status --porcelain` (post-run) | 0 | Empty — verification produced no tracked changes. |
| scope | `git ls-remote --heads origin` (post-run) | 0 | Identical 11 heads to baseline. |

## 2. Acceptance criteria (Phase 1 scope)

| ID | Evidence | Status |
| --- | --- | --- |
| AC-1 | Branch HEAD `7a08d427`, merge base `d7e5af3c` (cross-validated), 20 unique commits, 33-file diff stat, `in_progress`/0-of-4-green metadata, and the `frontier.md` handoff — all in `baseline/baseline-commands.txt`. | **satisfied** |
| AC-2 | `e3b9d48c` reachable from `main` via `git log main`; `controller-noise.ts` and `.test.ts` returned by `git show main:<path>`; PR #68 body in `conductor/archive/20261111-roster-retune/pr.md` lines 5–8: "This branch stacks `feat/20261110-battle-variance` … Land together; the variance track closes as superseded." | **satisfied** |
| AC-5 | 11 remote heads byte-identical before and after this phase (§5); no push, pull, fetch, reset, rebase, merge, force-push, or `git clean` was executed; no remote ref or git config was touched. | **satisfied** |

## 3. Disposition verdict

**`delete-candidate`.** Supersession is proven by three independent sources: the PR #68 squash is on `main`, the branch's distinctive execution-noise implementation and its co-located test are on `main`, and PR #68's own body states the variance track closes as superseded while stacking the variance base with the roster re-tune. The branch's red `bun run balance` frontier was closed by that re-tune: today's `bun run balance` exits 0 with all 21 rows inside their bounds (only three non-gated waivers remain). No unique non-superseded content was found. Phase 2 may apply the recorded local-only deletion rule under FR-3 with this record as the safety proof.

## 4. Scope proof

`git diff --stat 13172e387b633142f888f6eaba93feb944e80f0f..7e1f493e1fa7d74bec590580780e3f456c4661d1 -- packages apps` returned no output, proving an empty source diff. Post-verification `git status --porcelain` was also empty, so the five-command sweep introduced no tracked changes. Only this track's `verification/phase-1.md` is committed; raw outputs are gitignored scratch under `.conductor/evidence/`.

## 5. No remote mutation

`git ls-remote --heads origin` was read twice (baseline and post-run) and returned the same 11 heads with identical hashes. No remote-tracking ref, branch, or config was modified, and no network-mutating git command was executed. No credential, token, passphrase, or player data appears in any artifact.

## 6. Deviations

Permission denials in the phase subagent (not repository failures). After one
follow-up probe was refused identically, the primary completed the phase
autonomously and ran all seven commands itself with exit 0 - see Section 9.
The historical subagent record is retained verbatim below for transparency:

1. `git merge-base main feat/20261110-battle-variance` — denied. Base hash confirmed from branch metadata and the exact 20-commit / 33-file ranges.
2. `git merge-base --is-ancestor e3b9d48c… main` — denied. Ancestry shown by `e3b9d48c` appearing in `git log --oneline --max-count=400 main`.
3. `git cat-file -e main:<controller-noise.ts>` and `<controller-noise.test.ts>` — denied. Existence and content shown by `git show main:<path>`.
4. `gh pr view 68 --json mergeCommit,body,state` — denied despite the brief stating gh is available. PR body quoted from the tracked local record `conductor/archive/20261111-roster-retune/pr.md`.
5. `bun run gate:determinism` — denied. The identical gate executed inside `bun run verify` and passed (exit 0).
6. `bun run test:fuzz` — denied in subagent; primary ran it with exit 0 (139 pass, 0 fail, 129015 expect() calls, 63.36 s) - see Section 9.

No product/design decision was required; no scope file outside `Touches` was modified.

## 7. Raw evidence

- `.conductor/evidence/20261124-battle-variance-branch-resolution/baseline/baseline-commands.txt`
- `.conductor/evidence/20261124-battle-variance-branch-resolution/baseline/ls-remote-heads.txt`
- `.conductor/evidence/20261124-battle-variance-branch-resolution/baseline/status-porcelain.txt`
- `.conductor/evidence/20261124-battle-variance-branch-resolution/supersession/supersession-commands.txt`
- `.conductor/evidence/20261124-battle-variance-branch-resolution/verification/verification-commands.txt`

## 8. Notes

Battle hash `0xff6f3d62` was observed directly in the `bun run verify` trace and its deterministic-replay invariant. `bun run balance` on today's `main` is green, consistent with PR #68's re-tune closing the variance branch's four-row frontier. All subagent permission denials in §6 were resolved by the primary (Section 9); the phase is `verified`.

## Follow-up probe (primary-requested)

**Date:** 2026-11-24. Each command below was retried exactly once, verbatim as
written by the primary, as a separate shell invocation with no pipes, no `&&`
chaining, no rephrasing, and no substitute command. No command was retried a
second time. No fetch, push, pull, reset, rebase, checkout, clean, ref, branch,
remote, git config, or tracked source mutation was performed.

Every one of the seven was refused again by the shell permission layer. The
verbatim error envelope returned for each was:

`{"error":{"type":"permission.rejected","message":"Permission denied: shell","content":[]}}`

| # | Command (exact) | Exit | Result |
| --- | --- | --- | --- |
| 1 | `bun run test:fuzz` | denied | `permission.rejected` / "Permission denied: shell". No output, no fuzz result, no timeout observed, no sweep retry. |
| 2 | `bun run gate:determinism` | denied | `permission.rejected` / "Permission denied: shell". Standalone gate remains unrun; the gate did pass inside `bun run verify` (§1). |
| 3 | `git merge-base main feat/20261110-battle-variance` | denied | `permission.rejected` / "Permission denied: shell". No hash output. |
| 4 | `git merge-base --is-ancestor e3b9d48ce9187032b3f0f0620417d242f531465b main` | denied | `permission.rejected` / "Permission denied: shell". No exit code returned; ancestry remains proven via `git log main` (§1). |
| 5 | `git cat-file -e main:packages/sim/src/battle/continuous/controller-noise.ts` | denied | `permission.rejected` / "Permission denied: shell". No output; existence remains proven via `git show main:<path>` (§1). |
| 6 | `git cat-file -e main:packages/sim/src/battle/continuous/controller-noise.test.ts` | denied | `permission.rejected` / "Permission denied: shell". No output; existence remains proven via `git show main:<path>` (§1). |
| 7 | `gh pr view 68 --json mergeCommit,body,state` | denied | `permission.rejected` / "Permission denied: shell". No JSON returned; PR body remains quoted from the tracked local record (§2). |

**Probe outcome:** all seven were refused again. Per the conductor-implement
fallback, the primary then completed the phase autonomously and ran all seven
commands with exit 0 (Section 9). The AC-1/AC-2/AC-5 evidence now rests on
first-class assertions, not substitutions. The disposition verdict remains
`delete-candidate`.

## 9. Primary resolution of subagent denials (fallback)

**Date:** 2026-11-24. The primary ran every command that the subagent and its
probe could not, each as a separate invocation (no pipes, no `&&`), with no
repository-mutating operation. All exited 0.

| Layer | Command (exact) | Exit | Result |
| --- | --- | --- | --- |
| verification | `bun run gate:determinism` | 0 | All 18 creature GLBs and the 5 prop digests regenerated byte-identical; standalone confirmation of the gate that also ran inside `bun run verify`. |
| verification | `bun run test:fuzz` | 0 | 139 pass, 0 fail, 129015 expect() calls across 135 files in 63.36 s; full `APEX_FUZZ_SWEEP=full`; no gatekeeper-reach timeout. |
| baseline | `git merge-base main feat/20261110-battle-variance` | 0 | `d7e5af3c4427acf87670ad8ebde467fc12331c9f` - first-class confirmation of the previously cross-validated base hash (AC-1). |
| supersession | `git merge-base --is-ancestor e3b9d48ce9187032b3f0f0620417d242f531465b main` | 0 | PR #68 merge commit is an ancestor of `main` (AC-2). |
| supersession | `git cat-file -e main:packages/sim/src/battle/continuous/controller-noise.ts` | 0 | Distinctive branch implementation file exists on `main` (AC-2). |
| supersession | `git cat-file -e main:packages/sim/src/battle/continuous/controller-noise.test.ts` | 0 | Co-located distinctive test exists on `main` (AC-2). |
| supersession | `gh pr view 68 --json mergeCommit,body,state` | 0 | `"state":"MERGED"`, `"mergeCommit":{"oid":"e3b9d48ce9187032b3f0f0620417d242f531465b"}`, body contains "Land together; the variance track closes as superseded" (AC-2). |

**Outcome:** every configured verification command and every assertion cited by
AC-1, AC-2, and AC-5 now has a first-class, exit-0 result. No source, config,
ref, remote, or branch was mutated while resolving the denials.
