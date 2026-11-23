# Repository Hygiene Cleanup — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This chore closes the confirmation-gated follow-up recorded by
`20261123-doc-truth-sweep`: it verifies, records, and removes only stale local
Git branches and gitignored run/log artifacts that are demonstrably safe to
remove. The track makes deletion auditable and forbids touching tracked files,
remote refs, or evidence artifacts still referenced by archived verification
reports.

## Problem / Motivation

The repository is clean and fully merged, but local machine state still carries
stale branches and gitignored run/log files. `20261123-doc-truth-sweep`
inventoried them and explicitly deferred deletion pending owner confirmation.
Leaving them in place wastes disk space and makes branch/run status ambiguous;
deleting them indiscriminately risks losing unique work or breaking evidence
paths referenced by archived tracks.

## Goals & Success Metrics

- **Goal:** remove only proof-backed stale local branches and stale run/log artifacts, with a committed audit of what was kept and why.
- **Metric:** baseline and final inventories are committed; every deletion has recorded proof; zero tracked source/config/Conductor-state changes; all five configured verification commands remain green with sim hash `0xff6f3d62`.

## Scope

### In Scope

- Capture a read-only baseline of local branches and gitignored run/log artifacts.
- Classify each candidate local branch as safe-to-delete or preserve using:
  - tip is an ancestor of `main`,
  - `git diff --quiet main...<branch>` shows no content difference, or
  - a merged PR exists whose `headRefName` equals the branch.
- Delete only safe local branches; use `git branch -d` first and `git branch -D` only when a recorded squash-merge PR proves safety.
- Prune stale gitignored `.conductor/run` state (directories, `.json`, extra brief `.md`) and stale `.log`/`.err`/scratch artifacts.
- Preserve `.conductor/evidence/**` screenshots, probe logs, and other artifacts referenced by archived verification reports.
- Commit integrated evidence with before/after counts, deletion list, preserved list, and verification results.

### Out of Scope

- No remote branch, tag, ref, or PR deletion.
- No source, test, config, manifest, save schema, protocol, API, CORS, deploy, gate, fence, `SIM_VERSION`, ghost-pin, `product.md`, `tech-stack.md`, or other tracked-file change.
- No deletion of a branch with unique or unproven content.
- No deletion of the current track's run file, evidence, or any artifact needed by this track.
- No force-push, reset, rebase, branch switch outside this track, or writing outside Conductor state and gitignored cleanup targets.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Record a read-only baseline inventory of local branches and stale gitignored run/log artifacts before deletion. | must |
| FR-2 | Classify every candidate local branch with explicit proof: ancestor of `main`, empty diff against `main`, or merged PR with matching head branch. | must |
| FR-3 | Delete only proof-backed stale local branches; preserve every unproven or unique-content branch and record the reason. | must |
| FR-4 | Prune only stale gitignored run state and log/scratch artifacts, excluding the current track's artifacts and all archived evidence references. | must |
| FR-5 | Re-run configured verification after cleanup and record exact commands, exit codes, and counts. | must |
| FR-6 | Commit `verification/integrated.md` with baseline, deletions, preservations, final inventory, and verification proof. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No tracked file under `packages/`, `apps/`, `scripts/`, `.github/`, or `conductor/` may be modified by cleanup; only this track's Conductor evidence files are committed. |
| NFR-2 | No remote refs are deleted or rewritten; local and remote branch snapshots are recorded before and after. |
| NFR-3 | No force-push, reset, rebase, `git clean`, or destructive command outside narrowly scoped branch/artifact deletion. |
| NFR-4 | Archived evidence paths remain resolvable; screenshot/probe evidence under `.conductor/evidence/**` is preserved. |
| NFR-5 | No credentials, passphrases, or real player data are introduced into tracked artifacts. |
| NFR-6 | `bun run verify`, `bun run build`, `bun run balance`, `bun run gate:determinism`, and `bun run test:fuzz` all exit 0 with hash `0xff6f3d62`. |
| NFR-7 | Module caps (12,288 B client/sim/server, 24,576 B voxel, no allowlist) remain unchanged. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A committed baseline inventory enumerates all candidate branches and stale artifacts with counts and source commands. | FR-1 |
| AC-2 | Every deleted branch has recorded proof of merge/safety; no branch is deleted on assumption. | FR-2, FR-3 |
| AC-3 | Every preserved branch is listed with a reason; unique-content and unproven branches remain. | FR-3 |
| AC-4 | No remote branch list changed, and no remote deletion/rewrite command was executed. | FR-3, NFR-2 |
| AC-5 | Final artifact inventory shows the pruned counts and confirms current-track and archived evidence were preserved. | FR-4 |
| AC-6 | Configured verification commands all exit 0 with hash `0xff6f3d62`. | FR-5, NFR-6 |
| AC-7 | `git diff --quiet <base>..HEAD -- packages apps` exits 0 and `git status --porcelain` is clean after the completion commit. | NFR-1, NFR-7 |
| AC-8 | `verification/integrated.md` is committed with commands, before/after inventories, deletion proofs, preservations, and final verdict. | FR-6 |
| AC-9 | No product, tech-stack, workflow, style-guide, registry, or other Conductor-state file changes except this track's own artifacts and registry marker. | NFR-1 |

## Edge Cases

- A squash-merged branch has no ancestry relation to `main`; require a merged PR with matching head branch before deleting.
- A branch has unique commits from a blocked track; preserve it even if the branch name looks stale.
- A gitignored artifact belongs to the current track; preserve it.
- An archived verification report references an evidence path; preserve that path.
- A deletion command is permission-denied; report the exact command as a blocker and do not work around it.
- A branch proves both ancestor and merged PR; record the strongest proof available.

## Dependencies

- **Tracks:** `20261123-doc-truth-sweep` (merged; provides the confirmation-gated inventory).
- **External:** GitHub CLI for merged-PR proof; no credentials beyond existing authenticated `gh`.

## Open Questions & Assumptions

- **Assumption:** “stale branches” means local branches only; remote branches are out of scope unless a future owner decision changes the scope.
- **Assumption:** the active `.conductor/runs/20261123-repo-hygiene-cleanup.json` and this track's evidence are current and must never be pruned.
- **Assumption:** archived verification reports are authoritative; their referenced gitignored artifacts are preserved rather than pruned.
- **Assumption:** the archive count and stale counts may drift from the 2026-11-23 baseline; the track records fresh counts rather than assuming the old values.

## References

- `conductor/archive/20261123-doc-truth-sweep/verification/integrated.md` §8
- `conductor/archive/20261123-doc-truth-sweep/verification/phase-3.md`
- `.conductor/evidence/20261123-doc-truth-sweep/stale-inventory.md`
- `conductor/workflow.md`
