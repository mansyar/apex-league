## Summary

This chore removes repository hygiene debt left after the D-3/D-4 doc-truth sweep: seven proof-backed stale local branches and 169 gitignored run/log/scratch/backup artifacts are removed, while the unproven `feat/20261110-battle-variance` branch, all remote refs, and all referenced evidence are preserved. No tracked source, config, game, product, tech-stack, or deployment file changed; the source diff against `main` is empty by design. The work is recorded entirely in Conductor evidence and verified with all configured checks green (hash `0xff6f3d62`).

## Track

- **ID:** `20261123-repo-hygiene-cleanup`
- **Type:** `chore`
- **Spec:** [`conductor/archive/20261123-repo-hygiene-cleanup/spec.md`](conductor/archive/20261123-repo-hygiene-cleanup/spec.md)
- **Plan:** [`conductor/archive/20261123-repo-hygiene-cleanup/plan.md`](conductor/archive/20261123-repo-hygiene-cleanup/plan.md)
- **Review:** [`conductor/archive/20261123-repo-hygiene-cleanup/review.md`](conductor/archive/20261123-repo-hygiene-cleanup/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Baseline inventory and branch safety classification | Record a read-only pre-cleanup inventory and classify every candidate branch with explicit deletion-safety proof | verified | `1f8ab49b` | 7 safe-to-delete, 1 preserve (`feat/20261110-battle-variance`); no deletion in this phase |
| 2: Proof-backed deletion and artifact pruning | Delete proven-stale local branches and prune stale gitignored artifacts | verified | `04d3d5a7` | 7 branches deleted (6 via `-d`, 1 `-D` with merged PR #64 head proof); 169 artifacts pruned; 3 protected branches remain |
| 3: Final verification and integrated evidence | Prove the cleanup left the repository clean and checks green | verified | `3e53fce5` | empty source diff, all 11 remote heads byte-identical, `integrated.md` committed |
| R1: Review findings F1/F2/F3 | Correct evidence-label/SHA inaccuracies from round-1 review | verified | `478bc388` | NFR-6/NFR-7 relabel, AC-4/AC-5 swap fix, stale pre-rewrite SHA pointers corrected |

## Requirements

- [x] `FR-1` — Committed pre-cleanup baseline inventory with exact source commands
- [x] `FR-2` — Every candidate branch classified with explicit deletion-safety proof
- [x] `FR-3` — Only proof-backed stale local branches deleted
- [x] `FR-4` — Stale gitignored artifacts pruned; referenced evidence preserved
- [x] `FR-5` — Final configured verification re-run with sim hash `0xff6f3d62`
- [x] `FR-6` — Integrated evidence committed at `verification/integrated.md`
- [x] `NFR-1` — No tracked source/config file changed (empty `packages apps` diff)
- [x] `NFR-2` — No remote branch list changed; no remote deletion/rewrite command executed
- [x] `NFR-3` — No force-push, reset, clean, rebase, or checkout outside narrow safe deletion
- [x] `NFR-4` — Archived evidence and current-run evidence preserved
- [x] `NFR-5` — No credential/passphrase/real player data in tracked artifacts
- [x] `NFR-6` — All five configured verification commands exit 0 with hash `0xff6f3d62`
- [x] `NFR-7` — Module caps (12,288 B client/sim/server, 24,576 B voxel, no allowlist) unchanged
- [x] `AC-1` — Committed baseline with counts and source commands
- [x] `AC-2` — Only proof-backed branches deleted
- [x] `AC-3` — Unproven branches preserved
- [x] `AC-4` — No remote branch list changed, no remote deletion/rewrite
- [x] `AC-5` — Final artifact inventory shows pruned counts and preserved evidence
- [x] `AC-6` — Configured checks exit 0 with hash `0xff6f3d62`
- [x] `AC-7` — `git diff --quiet <base>..HEAD -- packages apps` exit 0 and clean worktree
- [x] `AC-8` — Integrated verification committed
- [x] `AC-9` — Scope proof shows only this track's Conductor artifacts changed

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit/test | `bun test --timeout 120000` | pass — 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls | `conductor/archive/20261123-repo-hygiene-cleanup/verification/integrated.md` |
| verify | `bun run verify` | pass — hash `0xff6f3d62`, determinism gate OK | `conductor/archive/20261123-repo-hygiene-cleanup/verification/integrated.md` |
| lint | `bun x biome check` | pass — 1035 files, no fixes | |
| typecheck | `bun run check` | pass — no type errors | |
| build | `bun run build` | pass — 438 modules | |
| balance | `bun run balance` | pass — 1680 fights, capShare `370/1680 (22.0%)`, 34/34 gates | |
| determinism | `bun run gate:determinism` | pass — 21 species × 3 stages + 5 props byte-identical | |
| fuzz | `bun run test:fuzz` | pass — 139 pass / 0 fail, 129015 `expect()` calls | |
| scope | `git diff --quiet 1eee3011..HEAD -- packages apps` | pass — empty source diff | |

## Review

- **Verdict:** `PASS`
- **Rounds:** 2 (round 1 + round-2 delta review)
- **Fixed:** 6 findings — F1/F2/F3 (Phase R1) and N1/N2/N3 (review finalization)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Six stale branches deleted with `git branch -d`; only `feat/20261028-fire-move-identity` required `git branch -D` because its squash merge left no ancestor relationship — backed by merged PR #64 with matching head `81ec4af6`. No unproven escalation.
- Only `.log`/`.err`/run-metadata/scratch/backup artifact classes were pruned; no archived screenshot, probe, or report evidence was touched, and their evidential values remain in tracked reports.
- All deletions were local-only; no remote ref was added, deleted, or rewritten.

## Follow-ups

- none

## Rollback

```bash
# Squash commit (this PR)
git revert --no-edit <squash-commit>
```

Note: the deleted local branches and pruned gitignored artifacts are not restored by reverting the squash commit. To restore a deleted branch, recreate it from its merged PR head (e.g. `git branch <name> <pr-head-sha>`); pruned `.log`/run-metadata files were transient tool artifacts and are intentionally not recoverable. No tracked source, schema, config, or deployment state changed, so no data or feature-flag rollback is needed.
