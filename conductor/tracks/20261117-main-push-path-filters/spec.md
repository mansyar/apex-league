# Main Push Path Filters - Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

A conductor-only commit to `main` still starts two full workflows: **Deploy**, which re-runs
`bun run verify` and then builds and uploads the client to Cloudflare Pages, and **Server image**,
which builds the API container and pushes it to GHCR. Neither can be affected by a change under
`conductor/`, `docs/`, `.opencode/`, or a root Markdown/screenshot file. This track adds an explicit
`paths-ignore` list to those two `push: main` triggers only, fences the list in the committed workflow
test, corrects a stale sample-size comment in `ci.yml`, and proves the skip live with the doc-only
commit that records the merge.

The earlier track (`20261112-gate-cost-and-fixture-audit`) removed `paths-ignore` from the **pull
request** gate because a workflow-level filter there creates no run, so a required check never exists
and the only merge path is an admin bypass. This track does the opposite in the one place where it is
safe: Deploy and Server image are not required checks, so "no run" is the desired outcome.

## Problem / Motivation

On 2026-11-13, the conductor-only commit recording the previous merge (`e2038303`) started three
runs: Deploy, Server image, and a re-verification of code that had not changed. The measured cost of
one documentation push is a full `bun run verify` (roughly 75 s locally, ~3 min on the runner), a Vite
build and Pages upload, and a container build plus registry push. That is the second half of the CI
cost complaint: the required check now reports cheaply for conductor-only PRs, but merging those PRs
still pays twice on `main`.

If left alone, every small documentation correction spends runner minutes and publishes a new
deployment whose content cannot have changed. There is also a trust cost: a doc commit appears in the
deployment history indistinguishably from a real release.

## Goals & Success Metrics

- **Goal:** a push to `main` that changes only documentation and agent/conductor state starts no
  Deploy or Server image run, while every code push starts both exactly as before.
- **Metric:** on the first conductor-only push after merge, `gh run list --branch main` shows **zero**
  new Deploy or Server image runs for that commit; on the same branch, a code push still starts both.
- **Goal:** the filter cannot silently regress, and the reason for every ignored path is written down
  beside it.
- **Metric:** a committed test fails if any of the six patterns is removed or if either
  `workflow_dispatch` trigger disappears; the rule comment names and justifies each pattern.
- **Goal:** close the stale comment left by the previous track.
- **Metric:** `ci.yml:100` describes the 42-fight telemetry sample, not the retired 14-matchup one.

## Scope

### In Scope

- Add the same `paths-ignore` list to the `push: branches: [main]` trigger of `.github/workflows/deploy.yml`
  and `.github/workflows/server-image.yml`: `conductor/**`, `docs/**`, `.opencode/**`, `README.md`,
  `AGENTS.md`, `*.png`.
- Write the rule next to each filter: what the paths are and why none is an input to the client bundle
  or the API image, so a later editor does not add a path that actually affects the build.
- Add assertions to `scripts/deploy/workflow.test.ts` pinning the exact list on both workflows, the
  absence of a `paths:` allow-list, and the presence of `workflow_dispatch` on both.
- Correct the stale "14-matchup" wording in `ci.yml:100` to the current 42-fight sample.
- Record the before/after in evidence and perform the live post-merge proof in the archived evidence.

### Out of Scope

- Any change to `ci.yml`'s **triggers**, scope step, job name or regression assertions — the required
  check must keep reporting on every PR.
- Adding step-level gating or a scope step to Deploy or Server image; a workflow-level filter is safe
  here precisely because no required check depends on these runs.
- Changing what Deploy or Server image actually does: the `bun run verify` production gate, the Pages
  upload, the GHCR tag/promotion rules and the Bun pin all stay as they are.
- Ignoring code-bearing paths: `apps/**`, `packages/**`, `scripts/**`, `bun.lock`, `package.json`,
  `tsconfig.base.json`, `biome.json`, `wrangler.jsonc` and `.github/**` must keep triggering.
- Touching `nightly.yml` (cron, no push cost) or adding new dynamic path-matching logic.
- Any game code, bound, species value, frame datum or `SIM_VERSION` change.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | `deploy.yml`'s `push: main` trigger ignores exactly `conductor/**`, `docs/**`, `.opencode/**`, `README.md`, `AGENTS.md`, `*.png`. | must |
| FR-2 | `server-image.yml`'s `push: main` trigger ignores the same six entries, character for character. | must |
| FR-3 | Both workflows keep `workflow_dispatch` and their code-push path unchanged: no `paths:` allow-list, no new step gating, no changed steps. | must |
| FR-4 | `scripts/deploy/workflow.test.ts` asserts both filters, the absence of a `paths:` allow-list, and the manual trigger on both workflows. | must |
| FR-5 | The track records a live post-merge conductor-only push to `main` that starts zero Deploy and zero Server image runs, with run lists and the commit SHA. | must |
| FR-6 | The stale "14-matchup" comment in `ci.yml` is corrected to the 42-fight sample, with the sample's composition unchanged. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No required check is affected: `ci.yml`'s trigger, job name and scope logic are untouched. |
| NFR-2 | Each ignored path is justified in a written rule beside the filter, naming why it cannot feed the client bundle or the API image. |
| NFR-3 | Build outputs are unchanged: `bun run verify` and `bun run build` stay green with the same 4,1xx passing tests and 418 modules. |
| NFR-4 | A mixed diff (one code path plus ignored paths) still triggers both workflows — GitHub evaluates all changed files, and the test records the rule. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Both workflow files carry the six `paths-ignore` entries under `push:` and neither has a `paths:` allow-list. | FR-1, FR-2 |
| AC-2 | The two lists are identical, and a written rule next to each names and justifies every entry. | FR-1, FR-2, NFR-2 |
| AC-3 | Both workflows still declare `workflow_dispatch`; no step, Bun pin, or gate command changed in either file. | FR-3 |
| AC-4 | `bun test scripts/deploy/workflow.test.ts` is green, and a temporary local removal of one pattern or one `workflow_dispatch` is shown to fail it before being restored. | FR-4 |
| AC-5 | After merge, the conductor-only metadata commit produces no new Deploy or Server image run; the observed `gh run list` and SHA are appended to the archived `verification/phase-1.md`. | FR-5 |
| AC-6 | `ci.yml` no longer says "14-matchup"; it names the 42-fight sample. | FR-6 |
| AC-7 | `bun run verify` and `bun run build` are green, and no file under `apps/`, `packages/` or `scripts/` (other than the test) changed. | NFR-1, NFR-3 |

## Edge Cases

- **Mixed diff.** A push containing one code path and five documentation paths still runs both
  workflows. Path filters match "all changed files are ignored", not "any".
- **Deletion-only doc push.** Removing a file under an ignored path is still an ignored path; no run.
- **Manual dispatch.** `workflow_dispatch` is not subject to `paths:` filters, so a doc-only change can
  still be followed by an explicit Deploy or Server image run.
- **A new non-build path appears.** A future root-level `.md` outside the named entries, or a new
  docs-like directory, will trigger both workflows. That is the conservative direction; the written
  rule says to add a pattern only with a reason, never by inference.
- **The live proof is post-merge.** A push to `main` can only be observed after this track's squash
  lands. The commit that records `pr_state: "merged"` is itself conductor-only and is the probe.
- **A run still starts.** If a filtered push does start a run, the phase reports blocked with the run
  ID and the actual file list; no pattern is widened or the assertion softened to make it pass.

## Dependencies

- **Tracks:** none. Base `main` at `e2038303` already carries the merged
  `20261112-gate-cost-and-fixture-audit` gate fix.
- **External:** GitHub Actions on `mansyar/apex-league` and `gh` for the post-merge observation.

## Open Questions & Assumptions

- **Decided 2026-11-17:** type `chore`, priority `medium`; ignore exactly the six patterns on both
  main-push workflows; pin the filters and the manual trigger in the committed workflow test; fix the
  stale `ci.yml` comment here; prove the skip with the post-merge metadata commit.
- **Assumption:** `docs/`, the root `.png` screenshots, `README.md`, `AGENTS.md` and `.opencode/**`
  are not inputs to the Vite client build or the API container image. Verified by the build's own
  dependency graph at planning time and recorded in the written rule.
- **Assumption:** GitHub evaluates `paths-ignore` on the union of changed files for a push, and does
  not apply it to `workflow_dispatch`. The live proof falsifies this if wrong.

## References

- `conductor/archive/20261112-gate-cost-and-fixture-audit/verification/phase-1.md` — the required-check
  fix and the reason a path filter is forbidden there but safe here.
- `conductor/archive/20261112-gate-cost-and-fixture-audit/verification/integrated.md` — the 13 s skip
  proof versus 2m57s for a code PR.
- `scripts/deploy/workflow.test.ts` — the existing workflow contract suite.
- `.github/workflows/{ci,deploy,server-image,nightly}.yml` — the automation surface.
- Run `43178773457` / `43178773306` — Deploy and Server image started by the doc-only commit
  `e2038303`.
