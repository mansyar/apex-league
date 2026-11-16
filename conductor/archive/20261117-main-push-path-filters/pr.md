## Summary

Both `push: main` workflows now ignore the six non-build paths (`conductor/**`, `docs/**`, `.opencode/**`, `README.md`, `AGENTS.md`, `*.png`) with a written rule beside each filter, so a documentation-only merge no longer starts a Deploy and a Server image run. A committed contract test pins the exact patterns, forbids a `paths:` allow-list and requires `workflow_dispatch`, with two demonstrated mutation proofs. `ci.yml` stays unfiltered — a path filter there would suppress the required pull-request check — and only its stale "14-matchup" comment was corrected to the current 42-fight sample.

## Track

- **ID:** `20261117-main-push-path-filters`
- **Type:** chore
- **Spec:** [`conductor/archive/20261117-main-push-path-filters/spec.md`](conductor/archive/20261117-main-push-path-filters/spec.md)
- **Plan:** [`conductor/archive/20261117-main-push-path-filters/plan.md`](conductor/archive/20261117-main-push-path-filters/plan.md)
- **Review:** [`conductor/archive/20261117-main-push-path-filters/review.md`](conductor/archive/20261117-main-push-path-filters/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: The filters and the written rule | Both push workflows ignore the six non-build paths with the written rule | verified | `d784ec81` | 14 insertions / 0 deletions each; `'*.png'` quoted because unquoted `*` is a YAML alias indicator; `Bun.YAML.parse` confirms both files |
| 2: The fence and the stale comment | Pin the filters in the workflow contract test and correct the sample comment | verified | `e9d6d3c5` | 6 new assertions; two mutation proofs failed as intended and were restored; `ci.yml` diff is one comment line |
| R1: Review fixes | Align the post-merge AC-5 probe wording with `workflow.md` | verified | see review.md | Documentation only; no code changed |

The two path filters are safe **only** because these are `push`-triggered workflows that are not required checks. `ci.yml` deliberately remains unfiltered on `pull_request`: a workflow-level path filter creates no run, so the required check never exists and a PR can only merge via the admin bypass this project forbids.

## Requirements

- [x] `FR-1` — Deploy push trigger ignores the six paths (test: `scripts/deploy/workflow.test.ts`)
- [x] `FR-2` — Server image push trigger ignores the same six paths (test: `scripts/deploy/workflow.test.ts`)
- [x] `FR-3` — `workflow_dispatch`, steps, Bun pin and production gate unchanged (test: `scripts/deploy/workflow.test.ts`)
- [x] `FR-4` — workflow contract fence with mutation proofs (test: `scripts/deploy/workflow.test.ts`)
- [x] `FR-5` — live post-merge conductor-only push observation (deferred by construction; AC-5 in `integrated.md`)
- [x] `FR-6` — stale `ci.yml` comment corrected to 42 fights (test: workflow source diff)
- [x] `NFR-1` — `ci.yml` YAML untouched
- [x] `NFR-2` — written rule justifies every ignored path
- [x] `NFR-3` — full gate green and no `apps/`/`packages/` change
- [x] `NFR-4` — before/after recorded with the runs removed by doc-only commit `e2038303`
- [x] `AC-1` — six entries under `push:` on both files, no `paths:` allow-list
- [x] `AC-2` — identical lists plus written rationale
- [x] `AC-3` — manual dispatch and all existing lines survive
- [x] `AC-4` — two failing mutations then green restore
- [x] `AC-5` — post-merge observation, wording aligned with `workflow.md`
- [x] `AC-6` — "14-matchup" no longer present
- [x] `AC-7` — `verify` + `build` green, no product code change

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| workflow contract | `bun test scripts/deploy/workflow.test.ts` | pass — 26 pass / 0 fail, 82 expect() calls | `conductor/archive/20261117-main-push-path-filters/verification/integrated.md` |
| full gate | `bun run verify` | pass — 4,167 pass / 1 skip / 0 fail, 4,168 tests / 375 files, Biome 939 files clean, voxel determinism byte-identical | same |
| build | `bun run build` | pass — 418 modules, only the pre-existing chunk-size warning | same |
| YAML | `Bun.YAML.parse` on both workflow files | pass — exact six patterns and `workflow_dispatch` | `verification/phase-1.md` |

## Review

- **Verdict:** `PASS WITH FINDINGS` (no code defects)
- **Rounds:** 1
- **Fixed:** 1 Low finding (F1 — the post-merge probe named in AC-5 did not exist under `workflow.md`; the criterion now names the first workflow-compliant conductor-only push after merge)
- **Accepted/deferred:** 0

## Deviations and risks

- `*.png` is written as `'*.png'` in both files: a bare leading `*` is a YAML alias indicator and GitHub rejects the workflow. The pattern value is character-for-character `*.png`.
- AC-5 cannot be executed before merge; the probe is the first conductor-only push to `main` after merge, observed in the archived evidence. No throwaway PR is needed — a `pull_request` run would not exercise a `push` trigger.
- The filter is per-workflow; a future unfiltered `push: main` workflow reintroduces the cost. The committed test pins only these two workflows by design.
- `workflow.test.ts` matches the workflow sources as text, consistent with the existing contracts; YAML validity was checked directly with `Bun.YAML.parse`.

## Follow-ups

- Observe the first conductor-only push after merge and append `gh run list` plus the commit SHA to the archived `verification/phase-1.md` (AC-5 / FR-5).
- none (issues are disabled for this project).

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

No migration, flag or data changes. Reverting restores documentation-only Deploy and Server image runs on `main`.
