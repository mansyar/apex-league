# Battle Variance Branch Resolution — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This chore resolves the last preserved local branch, `feat/20261110-battle-variance`, by verifying with recorded evidence whether its unique work is already superseded on `main` and, if so, deleting the branch locally with a proof-backed audit trail. It also removes the single stale gitignored run file left by the repository-hygiene track. No tracked source, config, product, or deployment file changes; no remote ref is touched.

## Problem / Motivation

The repository-hygiene track (PR #89) deleted seven proof-backed stale branches but deliberately preserved `feat/20261110-battle-variance` because it had no matching merged PR and carried 20 unique commits / 33 changed files. That leaves one loose end: an unmerged branch on a clean repository where every one of its own four phases is recorded as `blocked` and its close-out (`frontier.md`) explicitly hands off to a follow-up roster re-tune track. Merged PR #68 ("Battle variance and roster re-tune", head `feat/20261111-roster-retune`, merge commit `e3b9d48c`, already an ancestor of `main`) states it stacks this branch with that follow-up and that "the variance track closes as superseded". Without a recorded resolution, a future maintainer cannot tell whether the branch is valuable unmerged work or a safe-to-delete leftover. If left unresolved, it invites needless re-investigation and risks an accidental force-merge of a red gate.

## Goals & Success Metrics

- **Goal:** Reach a documented, evidence-backed disposition for the preserved branch — delete locally only when supersession/closed-blocked status is proven, otherwise preserve and recommend a follow-up.
- **Metric:** (1) A committed verification record cites the exact commits/PR proving the branch's content is on `main` (or the exact unique content that blocks deletion); (2) the branch exists or does not exist exactly as the recorded verdict states; (3) the stale run file is removed and gitignored artifacts are otherwise untouched; (4) all configured checks remain green with battle hash `0xff6f3d62` and the source diff against `main` is empty.

## Scope

### In Scope

- Read-only investigation of `feat/20261110-battle-variance`: unique commit list, diff against merge base, branch metadata status, `frontier.md` handoff, and comparison of its distinctive files/content against `main` (notably PR #68's merge commit `e3b9d48c` and `controller-noise.ts`).
- Evidence-only committed record of the investigation and the resulting disposition verdict in this track's `verification/` directory.
- Conditional local deletion of `feat/20261110-battle-variance` **only** when supersession/closed-blocked status is proven by cited evidence; recorded with the safety proof (`git branch -d` preferred; `-D` only with an explicit, recorded rationale that no content is lost).
- Deletion of the single stale gitignored run file `.conductor/runs/20261123-repo-hygiene-cleanup.json` (and its empty brief subdirectory only if it becomes empty and contains no other evidence).
- Final verification that the working tree is clean, all configured commands pass, the source diff against `main` is empty, and remote heads are unchanged.

### Out of Scope

- Any tracked source, config, schema, product, tech-stack, workflow, style-guide, or deployment change.
- Any remote ref creation, deletion, rewrite, force-push, reset, rebase, or `git clean`.
- Deleting any branch other than the single named preserved branch, and only under the proven condition.
- Deleting any archived evidence, screenshot, probe, or report; only the named stale run file is in scope.
- Landing, cherry-picking, or salvaging the branch's code into `main` — if unique non-superseded value is found, recommend a separate follow-up track instead.
- Reopening the D-1 accepted debt, D-4 deferred re-stratification, or the hardware device-lab pass.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Produce a committed pre-action baseline record of the preserved branch (HEAD, merge base, unique commits, changed-file list, branch metadata status, frontier handoff) using explicit source commands. | must |
| FR-2 | Prove or disprove supersession by citing exact evidence: PR #68 merge commit `e3b9d48c` is an ancestor of `main`, distinctive branch files (e.g. `controller-noise.ts`) exist on `main`, and PR #68's body declares the variance track superseded. | must |
| FR-3 | Apply the decision rule: if supersession/closed-blocked status is proven, delete the single local branch with a recorded safety proof; otherwise preserve it and record a follow-up recommendation. | must |
| FR-4 | Remove the single stale gitignored run file while preserving the current run file and all other gitignored evidence. | must |
| FR-5 | Re-run all configured verification commands on the final tree with battle hash `0xff6f3d62` and an empty source diff against `main`. | must |
| FR-6 | Commit integrated evidence at `verification/integrated.md` covering the baseline, proof, disposition, cleanup, and final verification. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No tracked source/config/document change: `git diff --quiet <base>..HEAD -- packages apps conductor/product.md conductor/tech-stack.md conductor/workflow.md` exits 0. |
| NFR-2 | No remote ref modified; `git ls-remote --heads origin` is byte-identical before and after; no push, force-push, reset, rebase, or `git clean`. |
| NFR-3 | Deletion is local-only, scoped to exactly one named branch plus one named stale run file; no wildcard or recursive deletion of tracked or archived evidence. |
| NFR-4 | The branch is deleted only with cited proof; if any unique non-superseded content is found, the branch is preserved and a follow-up track is recommended — never silently discarded. |
| NFR-5 | No credential, passphrase, or real player data is introduced into any tracked artifact. |
| NFR-6 | All five configured verification commands exit 0 (`bun run verify`, `bun run build`, `bun run balance`, `bun run gate:determinism`, `bun run test:fuzz`) with hash `0xff6f3d62`; module caps (12,288 B client/sim/server, 24,576 B voxel, no allowlist) unchanged. |
| NFR-7 | Google TypeScript style and module caps remain authoritative for any test touched; no new dependency or allowlist. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A committed baseline record lists the branch HEAD `7a08d427`, merge base `d7e5af3c`, 20 unique commits, the 33-file diff stat, its `in_progress`/0-of-4-green status, and the `frontier.md` handoff. | FR-1 |
| AC-2 | Evidence cites PR #68 merge `e3b9d48c` as an ancestor of `main`, the presence of `controller-noise.ts`/`.test.ts` on `main`, and PR #68's "closes as superseded" declaration. | FR-2 |
| AC-3 | The disposition verdict matches the proof: with supersession proven, `feat/20261110-battle-variance` is absent locally and the deletion method with its safety rationale is recorded; if not proven, the branch remains and a follow-up is named. | FR-3 |
| AC-4 | `.conductor/runs/20261123-repo-hygiene-cleanup.json` is absent; the current run file and all other gitignored evidence remain. | FR-4 |
| AC-5 | All 11 remote heads are byte-identical to baseline; no remote deletion/rewrite command executed. | FR-2, FR-3 |
| AC-6 | All five configured commands exit 0 with hash `0xff6f3d62`; `git diff --quiet <base>..HEAD -- packages apps` exits 0 and the working tree is clean. | FR-5 |
| AC-7 | `verification/integrated.md` is committed with the baseline, proof, disposition, cleanup, and final verification sections. | FR-6 |
| AC-8 | Only this track's Conductor artifacts changed versus the base; no product/tech-stack/workflow/style-guide/source change. | FR-6 |

## Edge Cases

- **Branch recreated externally:** if the branch reappears after deletion, the baseline proof still documents the disposition; no remote ref exists to recreate it from automatically.
- **Supersession ambiguous:** if distinctive files are absent on `main` or PR #68 does not actually carry the variance mechanism, supersession is not proven → preserve the branch, record unique content, and recommend a follow-up track.
- **`-d` fails with "not fully merged":** prefer no deletion; use `-D` only with an explicit recorded rationale citing the supersession proof that no content is lost (squash-merged branches commonly trigger this).
- **Current run file accidentally matched:** only the exact named stale run file is removed; the active `.conductor/runs/20261124-battle-variance-branch-resolution.json` must remain.
- **Dirty tree from tool artifacts:** gitignored `.conductor/` artifacts do not count as dirty; any tracked change halts the phase.
- **Load-induced `gatekeeper-reach` timeout:** isolate that single test once; do not retry the full sweep; if still red under low load, stop and report as blocked.

## Dependencies

- **Tracks:** `20261123-repo-hygiene-cleanup` (complete, PR #89 merged, ancestor of `main`) created the preserved-branch decision; `20261110-battle-variance` (never merged; closed as blocked/superseded) is the subject of this track. No open prerequisite.
- **External:** none. PR #68 and the git history are the evidence sources; `gh` must be authenticated.

## Open Questions & Assumptions

- **Assumption:** "The branch's content is superseded on main" is a hypothesis to be proven, not a precondition; the deletion is conditional on the evidence in FR-2.
- **Assumption:** The stale run file is a transient gitignored artifact; its removal has no tracked-file or workflow impact.
- **Assumption:** The preserved branch has no remote counterpart (verified during hygiene: only local branches remain; no `origin/feat/20261110-battle-variance`).
- **Decision (owner, 2026-11-24):** classify as `chore`, priority `low`; delete the branch only with recorded proof; preserve + open a follow-up if genuinely unique non-superseded value is found; clean the stale run file in scope.

## References

- Archived hygiene track: `conductor/archive/20261123-repo-hygiene-cleanup/verification/integrated.md` (preserved-branch inventory, artifact counts).
- Preserved branch close-out: `git show feat/20261110-battle-variance:conductor/tracks/20261110-battle-variance/frontier.md`.
- Supersession proof: PR #68 https://github.com/mansyar/apex-league/pull/68, merge `e3b9d48ce9187032b3f0f0620417d242f531465b`.
- `conductor/product.md`, `conductor/tech-stack.md`, `conductor/workflow.md`.
