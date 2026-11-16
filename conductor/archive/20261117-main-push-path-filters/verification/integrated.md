# Main Push Path Filters — Integrated Verification

- Track: `20261117-main-push-path-filters`
- Branch: `chore/20261117-main-push-path-filters`
- Base: `main` @ `e2038303`
- Range reviewed: `e2038303..HEAD` (11 files, +764/−2; 4 non-Conductor files, +95/−1)
- Date: 2026-11-17

## What shipped

**Part A — the two push filters.** `deploy.yml` and `server-image.yml` now carry the same six-entry
`paths-ignore` list under `push: main`: `conductor/**`, `docs/**`, `.opencode/**`, `README.md`,
`AGENTS.md`, `*.png`. A written rule beside each filter names every path and explains why it cannot
feed the Vite bundle / Pages upload or the API container. The last entry is quoted because an
unquoted leading `*` is a YAML alias indicator; `Bun.YAML.parse` confirms both files parse and yield
the exact six pattern values. Neither workflow gained a `paths:` allow-list, and no existing line was
removed: 14 insertions and 0 deletions in each. `workflow_dispatch`, permissions, concurrency, all
steps, the Bun pin and the production gate are byte-identical.

**Part B — the fence and the stale wording.** `scripts/deploy/workflow.test.ts` gained six assertions
(two per workflow) pinning the exact patterns in order, forbidding a `paths:` allow-list and requiring
the manual trigger. The pre-existing `ci.yml` assertions — no path filter, no push trigger, every
heavy step gated on the scope output — remain untouched. Two mutation proofs showed the new fence
fails when one pattern is removed and when one `workflow_dispatch` is removed, then both files were
restored. The stale telemetry comment in `ci.yml` was corrected from "14-matchup" to "42-fight";
its only diff is that one comment line, so no YAML key, condition or command changed.

This is safe **only** on `push`-triggered workflows that are not required checks. `ci.yml` remains
unfiltered on `pull_request` because a workflow-level path filter there creates no run at all, so the
required check never exists and a PR can only merge via the admin bypass this project forbids.

## Gate table

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Workflow contract | `bun test scripts/deploy/workflow.test.ts` | 0 | 26 pass / 0 fail, 26 tests across 1 file |
| Full local gate | `bun run verify` | 0 | 4,167 pass / 1 skip / 0 fail; 4,168 tests across 375 files in 60.56 s; four typechecks; Biome 939 files, no fixes; voxel determinism byte-identical |
| Build | `bun run build` | 0 | 418 modules transformed, client built in 379 ms; only the pre-existing >500 kB chunk warning |

No simulation, species, frame-data, resolver or version file changed. The whole-track diff contains
no path under `apps/` or `packages/`; the only `scripts/` change is the workflow contract test.
No bound, floor, tolerance or `SIM_VERSION` was touched, so the trace hash `0xb6cce858` and both
pacing gates are unchanged by construction. `git status --porcelain` is clean.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Both workflows carry the six entries under `push:` and neither uses a `paths:` allow-list | `phase-1.md` before/after; `Bun.YAML.parse` output; new test assertions | met |
| AC-2 | The two lists are identical and a written rule justifies every entry | `phase-1.md` comments; YAML parse returned the same six values for both | met |
| AC-3 | Both keep `workflow_dispatch`; no step, Bun pin or gate command changed | 14 insertions / 0 deletions per file; new test assertion | met |
| AC-4 | Workflow test green; both mutations shown failing then restored | `phase-2.md` mutation proofs (25 pass / 1 fail / exit 1 each) and final 26/0 | met |
| AC-5 | Post-merge conductor-only push starts zero Deploy and zero Server image runs | Observed after merge: conductor-only `d4485d44` produced `RUN_COUNT=0` from `gh run list --commit`; full transcript in archived `verification/phase-1.md` | met — post-merge |
| AC-6 | `ci.yml` no longer says "14-matchup" | One-line comment diff in `phase-2.md` | met |
| AC-7 | `verify` and `build` green; no `apps/`/`packages/` change | Gate table above; whole-track `git diff --name-only` | met |

## Debt and follow-ups

1. **AC-5 / FR-5 was structurally post-merge, and is now closed.** A conductor-only push to `main` could
   only be observed after the track's PR merged; `workflow.md` creates no post-merge metadata commit
   ("after a merge there is nothing to commit"). The probe was the immediate next conductor-only push,
   `d4485d44`, which recorded the merge state. `gh run list --commit d4485d44` returned `RUN_COUNT=0`
   — zero Deploy and zero Server image runs — and the observation is appended to archived
   `phase-1.md`. Review F1 corrected the earlier wording that named a nonexistent post-merge
   metadata commit.
2. **Path filters are per-workflow, not global.** A future workflow added on `push: main` with no
   filter will reintroduce the cost. The new test pins only the two named workflows; that is the
   intended scope.
3. **A manual `workflow_dispatch` still runs both workflows on any ref.** The filter applies to
   pushes only, by design; the test asserts the escape hatch survives.
