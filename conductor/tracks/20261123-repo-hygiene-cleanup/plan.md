# Repository Hygiene Cleanup — Implementation Plan

> **Branch:** `chore/20261123-repo-hygiene-cleanup`
> **Base:** `main` @ `1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Baseline inventory and branch safety classification

- **Goal:** Record a read-only, committed pre-cleanup inventory of local branches and stale gitignored run/log artifacts, and classify every candidate branch with explicit deletion-safety proof.
- **Depends on:** none
- **Covers:** FR-1, FR-2, NFR-2, NFR-4, AC-1
- **Touches:** `conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-1.md`, `.conductor/evidence/20261123-repo-hygiene-cleanup/**`
- **Verification:** `git for-each-ref --format='%(refname:short)' refs/heads`; `git ls-remote --heads origin`; `git status --porcelain`; `git merge-base --is-ancestor <branch> main`; `git diff --quiet main...<branch>`; `gh pr list --state merged --head <branch> --json number,url`; `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`
- **Status:** pending

- [ ] **P1.T1: Capture branch and remote baseline** — covers: FR-1
  - [ ] **P1.T1.1: Record all local branches, excluding `main` and the current track branch.**
  - [ ] **P1.T1.2: Record all remote heads and confirm no deletion is planned for remotes.**
- [ ] **P1.T2: Classify each candidate branch with proof** — covers: FR-2
  - [ ] **P1.T2.1: Check ancestry, empty diff, and merged PR with matching head for every candidate.**
  - [ ] **P1.T2.2: Mark each branch safe-to-delete or preserve with the exact proof or reason.**
- [ ] **P1.T3: Capture gitignored artifact baseline and exclusions** — covers: FR-1
  - [ ] **P1.T3.1: Enumerate stale `.conductor/runs` directories, JSON, brief files, `.log`, `.err`, and scratch artifacts.**
  - [ ] **P1.T3.2: Exclude the current run, current evidence, and archived evidence paths referenced by verification docs.**
- [ ] **P1.T4: Record phase evidence and verification results** — covers: FR-1, FR-2
  - [ ] **P1.T4.1: Run the five configured verification commands separately and record exit codes.**
  - [ ] **P1.T4.2: Write `verification/phase-1.md` with baseline tables, proof classification, and no deletions.**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-1.md
-->

## Phase 2: Proof-backed deletion and artifact pruning

- **Goal:** Delete only proof-backed stale local branches and prune only stale gitignored run/log/scratch artifacts, preserving every unproven branch and all evidence references.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, NFR-1, NFR-2, NFR-3, NFR-4, AC-2, AC-3, AC-4, AC-5
- **Touches:** local `refs/heads`; `.conductor/runs/**` excluding the current run; `.conductor/*.log`; `.conductor/evidence/**/*.log`; `.conductor/evidence/*.err`; stale scratch artifacts under `.conductor/evidence/` and `.conductor/backups/`; `conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-2.md`; `.conductor/evidence/20261123-repo-hygiene-cleanup/**`
- **Verification:** `git branch --list`; `git ls-remote --heads origin`; `git status --porcelain`; `git diff --quiet 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD -- packages apps`; `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`
- **Status:** pending

- [ ] **P2.T1: Delete proof-backed stale local branches** — covers: FR-3
  - [ ] **P2.T1.1: Use `git branch -d` first; use `git branch -D` only when Phase 1 records a merged PR with matching head.**
  - [ ] **P2.T1.2: Confirm preserved branches remain and record any deletion denial as a blocker.**
- [ ] **P2.T2: Prune stale gitignored run/log artifacts** — covers: FR-4
  - [ ] **P2.T2.1: Remove stale run directories, JSON metadata, and extra brief files excluding the current run.**
  - [ ] **P2.T2.2: Remove stale log/err/scratch artifacts while preserving referenced evidence paths.**
- [ ] **P2.T3: Verify cleanup boundary and record phase evidence** — covers: FR-3, FR-4
  - [ ] **P2.T3.1: Confirm remote head list is unchanged and no tracked source file changed.**
  - [ ] **P2.T3.2: Run the five configured verification commands and write `verification/phase-2.md`.**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-2.md
-->

## Phase 3: Final verification and integrated evidence

- **Goal:** Prove the cleanup left the repository clean, the configured checks green, and the audit complete.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, NFR-5, NFR-6, NFR-7, AC-6, AC-7, AC-8, AC-9
- **Touches:** `conductor/tracks/20261123-repo-hygiene-cleanup/verification/integrated.md`, `conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-3.md`, `.conductor/evidence/20261123-repo-hygiene-cleanup/**`
- **Verification:** `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`; `git diff --check 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD`; `git diff --quiet 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD -- packages apps`; `git status --porcelain`; `Test-Path conductor/tracks/20261123-repo-hygiene-cleanup/verification/integrated.md`
- **Status:** pending

- [ ] **P3.T1: Re-run final configured verification** — covers: FR-5
  - [ ] **P3.T1.1: Run the five commands separately on the final cleanup tree.**
  - [ ] **P3.T1.2: Record sim hash `0xff6f3d62` and all exit codes.**
- [ ] **P3.T2: Write integrated evidence** — covers: FR-6
  - [ ] **P3.T2.1: Record before/after inventories, deletion proofs, preserved branches, and preserved evidence paths.**
  - [ ] **P3.T2.2: Record scope proof, command results, and final verdict.**
- [ ] **P3.T3: Confirm scope boundaries** — covers: NFR-5, NFR-7, AC-9
  - [ ] **P3.T3.1: Confirm no product, tech-stack, workflow, style-guide, registry, or other Conductor-state change beyond this track.**
  - [ ] **P3.T3.2: Confirm module caps and no-allowlist invariants remain untouched.**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261123-repo-hygiene-cleanup/verification/integrated.md
-->
