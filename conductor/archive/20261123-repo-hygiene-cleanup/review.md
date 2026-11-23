# Review: Repository Hygiene Cleanup

- **Track:** `20261123-repo-hygiene-cleanup`
- **Type:** `chore`
- **Branch:** `chore/20261123-repo-hygiene-cleanup`
- **Range:** `1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..9c0655630291bbeb19604eb42536dc0e39347b44`
- **Date:** `2026-11-24T02:45:00.0000000+11:00`
- **Verdict:** `PASS`

## Summary

The repository-hygiene chore is faithfully executed and documented: seven stale local branches were deleted with recorded proof (squash-merge commits for PRs #62/#63/#64/#83/#84, ancestry + empty diff for both `t3/*` branches), the unproven `feat/20261110-battle-variance` branch was preserved, 169 gitignored run/log/scratch/backup artifacts were pruned, all 11 remote heads are byte-identical to baseline, and the source diff is empty by design. All configured checks pass with sim hash `0xff6f3d62`. Round 1 found three Low documentation-accuracy findings (F1/F2/F3), all fixed in Phase R1 (checkpoint `478bc388`). The round-2 delta review confirmed F1/F2/F3 resolved and reported three further documentation/state-accuracy findings (N1 Medium, N2/N3 Low), all fixed during review finalization. No finding is deferred; strict mode is satisfied.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --timeout 120000` | pass | 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, 4460 tests / 437 files; expected `smoke: RESULT fail ... file:///tmp/x` diagnostic excluded |
| lint | `bun x biome check` | pass | 1035 files checked, no fixes |
| typecheck | `bun run check` | pass | no type errors across all workspaces |
| build | `bun run build` | pass | 438 modules; pre-existing >500 kB chunk warning excluded |
| verify | `bun run verify` | pass | 4459 pass / 1 skip / 0 fail, hash `0xff6f3d62`, determinism OK |
| balance | `bun run balance` | pass | 1680 fights, capShare `370/1680 (22.0%)`, 34/34 gates |
| determinism | `bun run gate:determinism` | pass | 21 species × 3 stages + 5 props byte-identical |
| fuzz | `bun run test:fuzz` | pass | 139 pass / 0 fail, 129015 `expect()` calls |
| scope | `git diff --quiet 1eee3011..HEAD -- packages apps` | pass | exit 0, empty source diff |
| whitespace | `git diff --check 1eee3011..HEAD` | pass | exit 0, no errors |
| worktree | `git status --porcelain` | pass | empty, clean tree |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P1.T3, P1.T4 | `phase-1.md`, `command-outputs.md` | covered |
| FR-2 | P1.T2 | `phase-1.md` branch classification table; gh PR proofs, ancestry, diff exit codes | covered |
| FR-3 | P2.T1 | `phase-2.md` §1-2, `integrated.md` §3, squash commits on `main` for #62/#63/#64/#83/#84 | covered |
| FR-4 | P2.T2 | `phase-2.md` §3, `integrated.md` §2.2, filesystem read of `.conductor/runs` and evidence | covered |
| FR-5 | P3.T1 | `integrated.md` §4, `phase-3.md` §1, primary verification sections | covered |
| FR-6 | P3.T2 | `integrated.md` committed in range diff, `Test-Path integrated.md` -> True | covered |
| NFR-1 | P2.T3, P3.T3 | empty source diff, clean worktree, `integrated.md` §6 | covered |
| NFR-2 | P1.T1, P2.T3 | `phase-2.md` §4, remote-head baseline, `ls-remote` 11 heads | covered |
| NFR-3 | P2.T1, P2.T2 | deletion commands (`-d` ×6, `-D` ×1 with PR #64 proof); no force-push/reset/rebase/clean | covered |
| NFR-4 | P1.T3, P2.T2 | archived evidence preserved; doc-truth-sweep 9 files and current-run evidence intact | covered |
| NFR-5 | P3.T3 | evidence contains only branch names/SHAs/counts/command output; no player data | covered |
| NFR-6 | P3.T1 | `integrated.md` §4 row 1c, primary verification, 4459 pass / 0 fail hash `0xff6f3d62` | covered |
| NFR-7 | P3.T3 | module caps 12,288 B client/sim/server and 24,576 B voxel, no allowlist; empty source diff | covered |
| AC-1 | P1.T1, P1.T3, P1.T4 | `phase-1.md` branch/artifact tables and commands table | covered |
| AC-2 | P1.T2, P2.T1 | `phase-2.md` §1 deletion proof table, squash commits on `main` | covered |
| AC-3 | P1.T2, P2.T1.2 | `phase-2.md` §2 preservation table, `integrated.md` §3, `git branch --list` | covered |
| AC-4 | P1.T1, P2.T3 | `phase-2.md` §4 remote proof, `command-outputs.md` remote-head list, `ls-remote` | covered |
| AC-5 | P2.T2 | `phase-2.md` §3 artifact counts, `integrated.md` §2.2, filesystem reads | covered |
| AC-6 | P3.T1 | `integrated.md` §4 row 1c, primary verification, raw `test.out` | covered |
| AC-7 | P3.T3 | empty source diff, clean worktree | covered |
| AC-8 | P3.T2 | `integrated.md` committed in range diff, `Test-Path True` | covered |
| AC-9 | P3.T2, P3.T3 | `integrated.md` §6 scope proof, range diff 9 files, no apps/packages | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — `phase-1.md` coverage row mislabeled NFR-7** — **Resolved (Phase R1, checkpoint `478bc388`)**
  - **File:** `conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-1.md:45`
  - **What:** The row describing "five configured verification commands exit 0 with sim hash `0xff6f3d62`" is labeled `NFR-7`, but that is spec NFR-6; spec NFR-7 is "module caps unchanged." Phase 1 has no NFR-6 row. The error is isolated to this file.
  - **Why:** In a documentation-truth track, requirement IDs are the audit trail; a mislabeled NFR row makes the coverage record self-inconsistent with the approved spec.
  - **Fix:** Relabel the row to `NFR-6`; optionally add a separate `NFR-7` row for module caps/allowlist unchanged.
  - **Requirement:** NFR-6/NFR-7
  - **Test gap:** none

- **F2 — `phase-2.md` AC table swaps AC-4 and AC-5** — **Resolved (Phase R1, checkpoint `478bc388`)**
  - **File:** `conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-2.md:116-117`
  - **What:** Line 116 labels artifact-pruning as `AC-4` (spec AC-5); line 117 labels the owner-confirmed/no-tracked-file criterion as `AC-5`. Spec AC-4 is "no remote branch list changed and no remote deletion/rewrite command executed." `integrated.md:128-129` maps them correctly.
  - **Why:** Swapped acceptance-criterion IDs in a committed phase record misstate which evidence satisfies each criterion.
  - **Fix:** Relabel line 116 to `AC-4` with the remote-head evidence (11 heads byte-identical, diff count 0) and line 117 to `AC-5` with the artifact-inventory evidence (169 removed, 0 remaining), moving the evidence cell text with each row.
  - **Requirement:** AC-4/AC-5
  - **Test gap:** none

- **F3 — stale pre-rewrite commit SHA cited as final tree** — **Resolved (Phase R1, checkpoint `478bc388`)**
  - **File:** `conductor/tracks/20261123-repo-hygiene-cleanup/verification/integrated.md:13-15,84,155` (also `phase-3.md:8,10,66,82` and `phase-3-command-outputs.md:207`)
  - **What:** Evidence cites `d2085e51ac04a469f1bb4187630ea6cc84867435` as the "final tree" / "Phase 3 evidence commit," but that SHA is not in the reviewed range; it was a pre-rewrite commit amended into checkpoint `3e53fce5` before final HEAD `9c065563`.
  - **Why:** A reader verifying the audit cannot find the cited "final" commit on the branch; the "Final checkpoints" row contradicts the plan's `3e53fce5` checkpoint.
  - **Fix:** Update final-tree SHA references to the actual Phase 3 checkpoint `3e53fce5` (and note final HEAD `9c065563`), or annotate `d2085e51` as the pre-rewrite verification SHA with the final committed checkpoint stated.
  - **Requirement:** FR-6/AC-8
  - **Test gap:** none

### Round-2 findings (delta review after Phase R1 — all resolved)

- **N1 — metadata `review_verdict` stuck at transitional `BLOCK`** (Medium; `metadata.json:22`)
  - **What:** After Phase R1 the metadata still carried `review_verdict: "BLOCK"` (the transitional state set when the fix phase was opened), while the recorded review verdict was non-blocking.
  - **Resolved:** Set to `PASS` with `review_rounds: 2` at review finalization. No deferral.
- **N2 — phase-R1.md cited off-branch `eed2de99` as final tree** (Low; `phase-R1.md:80,92`)
  - **What:** `eed2de99` was squashed into checkpoint `478bc388` and is not an ancestor of final HEAD (`git merge-base eed2de99 HEAD` = `be5a4448`; `--is-ancestor` exit 1).
  - **Resolved:** Citations relabeled to checkpoint `478bc388` with final HEAD `cb30b26a`; `eed2de99` now explicitly marked as the pre-squash verification SHA.
- **N3 — overbroad `d2085e51` claim** (Low; `phase-R1.md:96`)
  - **What:** The verdict claimed the SHA appeared "only inside this file," but it also survives in `review.md` (F3 record) and `plan.md` (task R1.T3.1).
  - **Resolved:** Reworded to state the SHA survives only in historical finding descriptions and never as a final-tree citation; the four verification evidence files contain zero occurrences.

## Overrides

- <none>

## Plan compliance

All three planned phases are verified with checkpoints: Phase 1 `1f8ab49b`, Phase 2 `04d3d5a7`, Phase 3 `3e53fce5`. Phase R1 (review fixes) is verified at checkpoint `478bc388`. All 14 tasks across 4 phases are complete and checked. No task was marked complete without verification. Reviewer `needs` (five denied reviewer-shell git commands in round 1, one `git merge-base` denial in the delta round) were resolved live by the primary and all matched the committed evidence; `needs` is now empty. No work was done outside the plan.

## Out of scope

- `feat/20261110-battle-variance` remains deliberately preserved (unproven: 33 unique files, `pr_state` null, PR #68 is distinct work).
- Remote branches and remote refs were never modified (out of scope by owner decision).
- The separate D-1 pacing debt and the hardware device-lab pass remain outside this track.

## Debt

- No deferrals: strict mode is on and this is a documentation-truth track, so round-1 findings F1/F2/F3 were fixed in Phase R1 and round-2 findings N1/N2/N3 were fixed at review finalization. No finding was recorded as accepted debt. `review.issues.enabled` is false, so no GitHub issues were opened.
- `feat/20261110-battle-variance` is deliberately preserved local state, not debt of this track (owner decision: preserve unproven branches).

## Doc sync

`synced` — fixes touched only this track's own Conductor artifacts: Phase R1 corrected evidence-label/SHA references in `phase-1.md`, `phase-2.md`, `phase-3.md`, `integrated.md` and added `phase-R1.md`; review finalization corrected `review.md`, `metadata.json` and `phase-R1.md`. No product, tech-stack, workflow, guideline, registry-other, style-guide or source change is required.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 3 | 3 (F1/F2/F3 in Phase R1, checkpoint `478bc388`) |
| 2 (delta) | PASS WITH FINDINGS | 0 | 0 | 1 | 2 | 3 (N1/N2/N3 at review finalization) |
| Final | PASS | 0 | 0 | 0 | 0 | — |
