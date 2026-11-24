## Summary

This chore closes the last preserved local branch from the battle-variance work by
proving that its content already landed on `main` through PR #68, deleting the local
branch with a cited, recorded rationale, and removing one stale gitignored run file.
No tracked source, config, product, tech-stack, workflow, dependency, or remote ref
changed; all five configured verification commands pass with the unchanged battle hash
`0xff6f3d62`.

## Track

- **ID:** `20261124-battle-variance-branch-resolution`
- **Type:** `chore`
- **Spec:** [`conductor/archive/20261124-battle-variance-branch-resolution/spec.md`](conductor/archive/20261124-battle-variance-branch-resolution/spec.md)
- **Plan:** [`conductor/archive/20261124-battle-variance-branch-resolution/plan.md`](conductor/archive/20261124-battle-variance-branch-resolution/plan.md)
- **Review:** [`conductor/archive/20261124-battle-variance-branch-resolution/review.md`](conductor/archive/20261124-battle-variance-branch-resolution/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Baseline and supersession proof | Record the pre-action baseline and prove the preserved branch is superseded on `main` | verified | `69c151d8` | Baseline HEAD `7a08d427`, merge base `d7e5af3c`, 20 unique commits, 33 files. PR #68 squash `e3b9d48c` is an ancestor of `main`; both `controller-noise.ts` and `.test.ts` exist on `main`; PR body says "the variance track closes as superseded". Verdict: `delete-candidate`. |
| 2: Proof-backed disposition and stale artifact cleanup | Delete the branch with proof and remove one stale run file | verified | `e89b1ddc` | `git branch -d` failed with the expected squash "not fully merged" artifact; `git branch -D` succeeded with the Phase 1 rationale recorded. `.conductor/runs/20261123-repo-hygiene-cleanup.json` removed; active run file and all evidence preserved. |
| 3: Final verification and integrated evidence | Prove a clean final tree, green checks with unchanged hash, and an empty source diff | verified | `0b08fe4c` | Five commands exit 0 with hash `0xff6f3d62`; empty source diff, clean `diff --check` and worktree, 11 remote heads byte-identical. |

## Requirements

- [x] `FR-1` — committed pre-action baseline record
- [x] `FR-2` — supersession proof from PR #68, distinctive files, and PR body
- [x] `FR-3` — conditional local deletion rule with recorded disposition
- [x] `FR-4` — removal of the single stale gitignored run file
- [x] `FR-5` — all configured checks re-run with hash `0xff6f3d62` and empty source diff
- [x] `FR-6` — committed `verification/integrated.md`
- [x] `NFR-1` — no tracked source/config/product/tech-stack/workflow change
- [x] `NFR-2` — no remote ref touched; 11 heads byte-identical
- [x] `NFR-3` — deletion scoped to one local branch and one stale file
- [x] `NFR-4` — delete only with cited proof, else preserve and open a follow-up
- [x] `NFR-5` — no credentials or player data in artifacts
- [x] `NFR-6` — five checks exit 0 with unchanged hash and unchanged module caps
- [x] `NFR-7` — Google TS style authoritative; no new dependency or allowlist
- [x] `AC-1` — baseline evidence committed
- [x] `AC-2` — supersession evidence committed
- [x] `AC-3` — branch absent with method and rationale
- [x] `AC-4` — stale file absent, other artifacts preserved
- [x] `AC-5` — remote heads byte-identical
- [x] `AC-6` — five checks green, empty diff, clean tree
- [x] `AC-7` — integrated evidence committed
- [x] `AC-8` — only this track's Conductor artifacts changed

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit + lint + static + determinism | `bun run verify` | pass — 4459 pass / 1 skip / 0 fail, hash `0xff6f3d62` | `conductor/archive/20261124-battle-variance-branch-resolution/verification/integrated.md` §7 |
| build | `bun run build` | pass — 438 modules | `conductor/archive/20261124-battle-variance-branch-resolution/verification/integrated.md` §7 |
| balance | `bun run balance` | pass — 21 species + pacing/gate/boss assertions | `conductor/archive/20261124-battle-variance-branch-resolution/verification/integrated.md` §7 |
| determinism | `bun run gate:determinism` | pass — 18 GLBs + 5 props byte-identical | `conductor/archive/20261124-battle-variance-branch-resolution/verification/integrated.md` §13 |
| fuzz | `bun run test:fuzz` | pass — 139 pass / 0 fail | `conductor/archive/20261124-battle-variance-branch-resolution/verification/integrated.md` §13 |
| scope | `git diff --quiet 13172e38..HEAD -- packages apps` | pass — empty source diff | `conductor/archive/20261124-battle-variance-branch-resolution/verification/integrated.md` §8 |
| worktree | `git status --porcelain` | pass — clean | `conductor/archive/20261124-battle-variance-branch-resolution/verification/integrated.md` §7 |

## Review

- **Verdict:** PASS
- **Rounds:** 2
- **Fixed:** 2 Low findings (F1 evidence wording, F2 historical-state wording)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- The preserved branch was deleted with `git branch -D` because `git branch -d` reported
  "not fully merged" — the expected artifact of PR #68 being squash-merged rather than
  replayed. Supersession was proven with first-class assertions before the force deletion,
  so no unique content was lost.
- Subagent shell permissions refused several read-only and verification commands in all
  three phases. The primary re-ran each refused command separately; none was rephrased or
  worked around, and all eventually returned exit 0.
- A duplicate primary `bun run verify` sweep overlapped the authoritative sweep and hit the
  documented load-induced `gatekeeper-reach` timeout. Isolated once under low load, that
  test passed 8/8; the authoritative sweep passed 4459 pass / 0 fail with the required hash.

## Follow-ups

- none

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

This change only deletes a local branch and a gitignored scratch file; no code, config,
or deployment artifact is reverted. The deleted branch content is preserved in git history
and superseded by PR #68.
