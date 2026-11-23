# Battle Variance Branch Resolution — Implementation Plan

> **Branch:** `chore/20261124-battle-variance-branch-resolution`
> **Base:** `main` @ `13172e387b633142f888f6eaba93feb944e80f0f`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Baseline and supersession proof

- **Goal:** A committed pre-action record proves (or disproves) that the preserved branch's content is already on `main`, with explicit source commands and zero repository mutations.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1, AC-2, AC-5, NFR-2, NFR-4
- **Touches:** `conductor/tracks/20261124-battle-variance-branch-resolution/verification/phase-1.md`, `.conductor/evidence/20261124-battle-variance-branch-resolution/**`
- **Verification:** `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`; plus `git log main..feat/20261110-battle-variance`, `git diff --stat <merge-base> feat/20261110-battle-variance`, `git show feat/20261110-battle-variance:conductor/tracks/20261110-battle-variance/frontier.md`, `git cat-file -e main:packages/sim/src/battle/continuous/controller-noise.ts`, `gh pr view 68 --json mergeCommit,body,state`.
- **Status:** pending

- [ ] **P1.T1: Capture the pre-action baseline** — covers: FR-1
  - [ ] **P1.T1.1:** Record branch HEAD `7a08d427`, merge base `d7e5af3c`, the 20 unique commits, the 33-file diff stat, branch metadata status (`in_progress`, 0 of 4 phases green), and the `frontier.md` handoff via explicit source commands.
  - [ ] **P1.T1.2:** Record the 11 remote heads byte-identical baseline (`git ls-remote --heads origin`) and a clean `git status --porcelain` (ignoring gitignored `.conductor/` artifacts).
- [ ] **P1.T2: Prove or disprove supersession** — covers: FR-2
  - [ ] **P1.T2.1:** Prove PR #68 merge `e3b9d48c` is an ancestor of `main` and that distinctive branch files (`controller-noise.ts`, `controller-noise.test.ts`) exist on `main`.
  - [ ] **P1.T2.2:** Quote PR #68's body declaring the variance base stacked and "the variance track closes as superseded"; record the disposition verdict (superseded → delete candidate; unique value → preserve + follow-up).
- [ ] **P1.T3: Record evidence and verification** — covers: FR-1, FR-2
  - [ ] **P1.T3.1:** Write `verification/phase-1.md` with the command table, AC-1/AC-2/AC-5 mapping, disposition verdict, scope proof (empty source diff), and blockers if any.
  - [ ] **P1.T3.2:** Run all five configured verification commands separately (no `&&`), record exact exit codes and battle hash `0xff6f3d62`; if the known load-induced `gatekeeper-reach` timeout occurs, isolate that single test once and record the result without retrying the full sweep.
  - [ ] **P1.T3.3:** Commit the evidence with one conventional commit; no branch, file, or ref mutation in this phase.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-battle-variance-branch-resolution/verification/phase-1.md
-->

## Phase 2: Proof-backed disposition and stale artifact cleanup

- **Goal:** Apply the Phase 1 disposition rule — delete the single named local branch only with recorded proof, and remove the single named stale gitignored run file — while leaving remote refs and all other artifacts untouched.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, AC-3, AC-4, NFR-2, NFR-3, NFR-4
- **Touches:** `conductor/tracks/20261124-battle-variance-branch-resolution/verification/phase-2.md`, `.conductor/evidence/20261124-battle-variance-branch-resolution/**`
- **Verification:** `git branch --list` (before/after), `git ls-remote --heads origin` (byte-identical before/after), `Test-Path .conductor/runs/20261123-repo-hygiene-cleanup.json` (false), `Test-Path .conductor/runs/20261124-battle-variance-branch-resolution.json` (true), `git diff --quiet <base>..HEAD -- packages apps`; plus `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`.
- **Status:** pending

- [ ] **P2.T1: Apply the branch disposition** — covers: FR-3
  - [ ] **P2.T1.1:** If Phase 1 proves supersession, delete `feat/20261110-battle-variance` locally with `git branch -d`; if `-d` fails with "not fully merged", use `-D` only with a recorded rationale citing the supersession proof that no content is lost.
  - [ ] **P2.T1.2:** If Phase 1 does not prove supersession, preserve the branch and record the unique content plus a named follow-up recommendation; no deletion.
  - [ ] **P2.T1.3:** Record the before/after local branch list and the exact deletion method with its safety proof (or the preserve decision).
- [ ] **P2.T2: Remove the single stale run file** — covers: FR-4
  - [ ] **P2.T2.1:** Delete exactly `.conductor/runs/20261123-repo-hygiene-cleanup.json` with an exact-path removal (no wildcards); leave the active `.conductor/runs/20261124-battle-variance-branch-resolution.json` and all other gitignored evidence intact.
  - [ ] **P2.T2.2:** Record before/after `Test-Path` results for both files and the preserved artifact inventory.
- [ ] **P2.T3: Prove boundaries and record evidence** — covers: NFR-2, NFR-3
  - [ ] **P2.T3.1:** Prove the 11 remote heads are byte-identical to the Phase 1 baseline and that no push/force-push/reset/rebase/clean was executed.
  - [ ] **P2.T3.2:** Write `verification/phase-2.md` with the disposition action, deletion proof, artifact cleanup, remote proof, command table, AC-3/AC-4/AC-5 mapping, and final verdict.
  - [ ] **P2.T3.3:** Run all five configured verification commands separately and commit the evidence with one conventional commit.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-battle-variance-branch-resolution/verification/phase-2.md
-->

## Phase 3: Final verification and integrated evidence

- **Goal:** Prove the final tree is clean, all configured checks are green with unchanged battle hash, the source diff is empty, and a committed integrated record covers the full disposition.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, AC-6, AC-7, AC-8, NFR-1, NFR-5, NFR-6, NFR-7
- **Touches:** `conductor/tracks/20261124-battle-variance-branch-resolution/verification/integrated.md`, `conductor/tracks/20261124-battle-variance-branch-resolution/verification/phase-3.md`, `.conductor/evidence/20261124-battle-variance-branch-resolution/**`
- **Verification:** `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`; `git diff --check <base>..HEAD`; `git diff --quiet <base>..HEAD -- packages apps`; `git status --porcelain`; `Test-Path .../verification/integrated.md`.
- **Status:** pending

- [ ] **P3.T1: Re-run final verification** — covers: FR-5
  - [ ] **P3.T1.1:** Run all five configured commands separately, capture exit codes and battle hash `0xff6f3d62`; isolate the known `gatekeeper-reach` timeout once if it recurs.
  - [ ] **P3.T1.2:** Prove `git diff --quiet <base>..HEAD -- packages apps` exits 0, `git diff --check <base>..HEAD` exits 0, and the working tree is clean.
- [ ] **P3.T2: Write integrated evidence** — covers: FR-6
  - [ ] **P3.T2.1:** Write `verification/integrated.md` with the baseline, supersession proof, disposition, stale-file cleanup, remote proof, module caps, command table, AC-1..AC-8 mapping, scope proof, and final verdict.
  - [ ] **P3.T2.2:** Write `verification/phase-3.md` with the standard phase header, command table, AC table, and verdict.
- [ ] **P3.T3: Confirm scope boundaries** — covers: NFR-1, NFR-5, NFR-7
  - [ ] **P3.T3.1:** Confirm only this track's Conductor artifacts changed versus the base; no product/tech-stack/workflow/style-guide/source change, no new dependency or allowlist, no credential or player data in tracked artifacts.
  - [ ] **P3.T3.2:** Commit the evidence with one conventional commit.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-battle-variance-branch-resolution/verification/integrated.md
-->
