# Review: Main Push Path Filters

- **Track:** `20261117-main-push-path-filters`
- **Type:** `chore`
- **Branch:** `chore/20261117-main-push-path-filters`
- **Range:** `e2038303201049fb7e66daf8ca4f43a5caeb97dc..58b7db45`
- **Date:** 2026-11-17
- **Verdict:** `PASS WITH FINDINGS` (BLOCK-worthy findings: 0; all findings fixed in round 1)

## Summary

A small, correct change: the same six-entry `paths-ignore` block on the two `push: main` workflows,
a committed regression fence with two demonstrated mutation proofs, and one stale comment corrected
in `ci.yml`. The reviewer found no code defect. The only finding was a Conductor-documentation
inconsistency about which push satisfies the deliberately deferred AC-5; it is fixed below. `ci.yml`
itself remains unfiltered, so the required pull-request check is unaffected.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| diff / status | `git status --porcelain`, `git diff --name-status e2038303..HEAD`, `git diff --stat` | pass | clean tree; 4 non-Conductor files +95/−1, no `apps/`/`packages/` path |
| workflow contract | `bun test scripts/deploy/workflow.test.ts` | pass (reviewer shell denied; primary ran) | 26 pass / 0 fail, 82 expect() calls |
| full gate | `bun run verify` | pass (primary) | 4,167 pass / 1 skip / 0 fail, 4,168 tests / 375 files, Biome 939 files clean, determinism byte-identical |
| build | `bun run build` | pass (primary) | 418 modules, exit 0 |

Independent review checks: read both workflows' full diffs (14 insertions, 0 deletions each);
confirmed the six patterns, the written rule, the quoted `*.png` (unquoted `*` is a YAML alias
indicator), the surviving `workflow_dispatch`, Bun pin and steps; read the new test helper and its
six assertions; confirmed `ci.yml`'s single comment-only change; confirmed the sample is 42 fights
in the telemetry source, so the corrected wording is factual. `bun test` was denied to the reviewer
by its shell policy and was re-run by the primary with the expected 26/0 result.

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `deploy.yml`, `workflow.test.ts`, `phase-1.md` | covered |
| FR-2 | P1.T2 | `server-image.yml`, YAML parse in `phase-1.md` | covered |
| FR-3 | P1.T1.3 / P1.T2.2 | 0 deletions; `workflow.test.ts` dispatch assertions | covered |
| FR-4 | P2.T1 | mutation proofs in `phase-2.md` | covered |
| FR-5 | post-merge observation | `integrated.md` debt 1 | deferred by design, wording fixed (F1) |
| FR-6 | P2.T2 | `ci.yml` comment diff | covered |
| NFR-1 | P2.T1 | `ci.yml` diff is comment-only | covered |
| NFR-2 | P1.T1.2 / P1.T2.1 | rationale comments in both files | covered |
| NFR-3 | P2.T3 | primary `verify` + `build` | covered |
| NFR-4 | P1.T3 | `phase-1.md` before/after and GitHub union-of-files semantics | covered |
| AC-1 | P1.T1 / P1.T2 | new test assertion | covered |
| AC-2 | P1.T1 / P1.T2 | identical lists and rationale comments | covered |
| AC-3 | P1.T1 / P1.T2 | 0 deletions; dispatch assertions | covered |
| AC-4 | P2.T1.3 | two failing mutations then 26/0 restore | covered |
| AC-5 | post-merge observation | `integrated.md` | deferred by design, wording fixed (F1) |
| AC-6 | P2.T2 | `ci.yml` comment diff, telemetry source | covered |
| AC-7 | P2.T3 | diff name-status and primary gates | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — the named AC-5 probe did not exist under the documented workflow**
  - **File:** `conductor/tracks/20261117-main-push-path-filters/spec.md:103,117-118,130-132` and `plan.md:41-45`
  - **What:** AC-5 named "the metadata commit that records `pr_state: "merged"`" as the post-merge conductor-only probe, but `workflow.md` says there is nothing to commit after a merge and treats merge fields as optional historical notes.
  - **Why:** a reader could not identify which workflow-compliant push would satisfy a "must" requirement, making a legitimate deferral look permanently unverified.
  - **Fix:** name the first workflow-compliant conductor-only push after merge (in practice the next track's initialize or plan commit), and align the integrated record's AC-5 row and debt 1.
  - **Requirement:** AC-5 / FR-5
  - **Test gap:** none — documentation only
  - **Disposition:** **fixed** in round 1, no code changed

## Overrides

- <none>

## Plan compliance

Both phases are `verified` with accepted checkpoints (`d784ec81`, `e9d6d3c5`), evidence files and all
P1/P2 tasks checked. No change outside each phase's `Touches` except Conductor state. `metadata.json`
reports 2/2 phases and 6/6 tasks. Review fixes are recorded as Phase R1.

## Out of scope

None in code. The reviewer noted that the audit range's head is one documentation commit past the
briefing's SHA; that commit only added `verification/integrated.md`.

## Debt

1. AC-5 / FR-5 is inherently post-merge and stays open in the archived record until the first
   conductor-only push lands; observe `gh run list` and append the SHA to archived `phase-1.md`.
2. Filters are per-workflow; a future unfiltered `push: main` workflow reintroduces the cost. Already
   recorded in `integrated.md`.
3. `workflow.test.ts` reads workflow sources as text rather than parsing YAML — consistent with the
   existing contracts; YAML validity was confirmed directly with `Bun.YAML.parse`.

## Doc sync

`none` — no product roadmap, style-guide or learning file needed changing. This is CI housekeeping;
the only documentation touched is the track's own spec, plan and evidence, plus F1's wording fix.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 1 |
