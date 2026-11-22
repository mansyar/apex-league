# Documentation Truth Sweep — Implementation Plan

> **Branch:** `chore/20261123-doc-truth-sweep`
> **Base:** `main` @ `059809f36ff8b0bc7ee51ebf66b68a8ad82345ba`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Baseline evidence and drift inventory

- **Goal:** Record exact stale doc passages, live production probe results, workflow history, and stale local artifacts from an unchanged source tree.
- **Depends on:** none
- **Covers:** FR-1, AC-1, NFR-5
- **Touches:** `conductor/tracks/20261123-doc-truth-sweep/verification/phase-1.md`, `.conductor/evidence/20261123-doc-truth-sweep/**`
- **Verification:**
  ```
  bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz
  git status --porcelain
  git diff --quiet origin/main..HEAD -- packages apps
  curl.exe -s -o NUL -w "%{http_code}" https://apex-league.pages.dev/
  curl.exe -s https://apex-api.ansyar-world.top/health
  gh run list --limit 8 --json databaseId,name,status,conclusion,headBranch,createdAt
  git branch --format='%(refname:short)'
  ```
  plus a bundle-marker probe that resolves the deployed `/assets/index-*.js` path
  from the client HTML and asserts it contains `Live PvP`, `Room code`, `/live`,
  and `apex-api.ansyar-world.top`.
- **Status:** verified

- [x] **P1.T1: Capture exact doc drift anchors** — covers: FR-1
  - [x] **P1.T1.1: Record `conductor/product.md:368-376` verbatim, including “and both debt pins remain in place.”**
  - [x] **P1.T1.2: Record `conductor/tech-stack.md:394-402` and `:808-826` verbatim, including the “has not run yet / does not resolve today” claims.**
- [x] **P1.T2: Capture live evidence** — covers: FR-1
  - [x] **P1.T2.1: Record client HTTP status, bundle asset path and markers, API health payload, and `/live` plain-GET response.**
  - [x] **P1.T2.2: Record workflow run IDs for Deploy, Server image, and recent Nightly determinism, plus the exact stale branch and run-file inventory.**
- [x] **P1.T3: Write phase-1 evidence** — covers: FR-1
  - [x] **P1.T3.1: Write `verification/phase-1.md` with command table, observed outputs, AC-1 mapping, and empty source-diff proof.**
  - [x] **P1.T3.2: Commit evidence only; no source, doc, gate, or Conductor state change.**

**Result:** verified
**Checkpoint:** c8653920
**Evidence:** conductor/tracks/20261123-doc-truth-sweep/verification/phase-1.md

## Phase 2: Approved documentation reconciliation

- **Goal:** Correct the two owner-approved doc passages and record the post-merge production spot-check against the observed evidence.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, AC-2, AC-3, AC-4, AC-6, NFR-1, NFR-2
- **Touches:** `conductor/product.md`, `conductor/tech-stack.md`, `conductor/tracks/20261123-doc-truth-sweep/verification/phase-2.md`, `.conductor/evidence/20261123-doc-truth-sweep/**`
- **Verification:**
  ```
  bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz
  git diff --quiet 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD -- packages apps
  ```
  plus assertions that `conductor/product.md` no longer contains
  “both debt pins remain in place”; that it states D-3/D-4 closed on 2026-11-20
  and D-1 as accepted standing debt; that `conductor/tech-stack.md` contains a
  dated 2026-11-23 note with the observed 200s and workflow run IDs; and that the
  historical “has not run yet / stays deferred” wording is explicitly labelled
  superseded.
- **Status:** verified

**Result:** verified
**Checkpoint:** f927ec1c
**Evidence:** conductor/tracks/20261123-doc-truth-sweep/verification/phase-2.md

- [x] **P2.T1: Reconcile the product debt paragraph** — covers: FR-2
  - [x] **P2.T1.1: Remove the contradictory “both debt pins remain in place” sentence.**
  - [x] **P2.T1.2: State D-3 and D-4 closed on 2026-11-20, D-2 closed, and D-1 retained as accepted standing debt; preserve the historical narrative.**
- [x] **P2.T2: Reconcile the tech-stack deploy paragraphs** — covers: FR-3
  - [x] **P2.T2.1: Replace the stale client-deploy claim with a dated 2026-11-23 note recording observed 200s, bundle markers, and workflow run IDs.**
  - [x] **P2.T2.2: Mark the 2026-10-26 “has not run yet / stays deferred” wording superseded for both client and server.**
- [x] **P2.T3: Record the post-merge spot-check** — covers: FR-4
  - [x] **P2.T3.1: Capture final probe outputs after the doc edits.**
  - [x] **P2.T3.2: Write `verification/phase-2.md` with command table, AC-2/AC-3/AC-4 mapping, scope proof, and verdict.**

## Phase 3: Integrated evidence and confirmation-gated hygiene inventory

- **Goal:** Commit integrated evidence with all commands, counts, hashes, probes and scope proof, and record stale branch/run artifacts as a follow-up that requires separate owner confirmation.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, AC-5, AC-7, AC-8, AC-9, NFR-3, NFR-4, NFR-6, NFR-7
- **Touches:** `conductor/tracks/20261123-doc-truth-sweep/verification/integrated.md`, `conductor/tracks/20261123-doc-truth-sweep/verification/phase-3.md`, `.conductor/evidence/20261123-doc-truth-sweep/**`
- **Verification:**
  ```
  bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz
  git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD
  git status --porcelain
  Test-Path conductor/tracks/20261123-doc-truth-sweep/verification/integrated.md
  ```
- **Status:** verified

**Result:** verified
**Checkpoint:** 61a5275d
**Evidence:** conductor/tracks/20261123-doc-truth-sweep/verification/phase-3.md

- [x] **P3.T1: Write integrated evidence** — covers: FR-6
  - [x] **P3.T1.1: Record the five-command table with counts and hash `0xff6f3d62`, plus the probe and workflow evidence.**
  - [x] **P3.T1.2: Record scope proof, module caps, AC-1..AC-9 table, and final verdict.**
- [x] **P3.T2: Record the stale inventory as confirmation-gated** — covers: FR-5
  - [x] **P3.T2.1: List exact stale branch names and run-file names/counts from the final tree.**
  - [x] **P3.T2.2: State that deletion requires separate owner confirmation and was not performed in this track.**
- [x] **P3.T3: Finalize phase-3 evidence** — covers: FR-6
  - [x] **P3.T3.1: Re-run the five configured commands on the final tree and record exact outputs.**
  - [x] **P3.T3.2: Write `verification/phase-3.md` with verdict and no open blockers.**

## Phase R1: Review Fixes

- **Goal:** Resolve review finding F1 by removing the trailing blank line in this plan and correcting the integrated/phase-3 evidence to record the actual final-tree `git diff --check` result.
- **Depends on:** Phase 3
- **Covers:** F1 (NFR-5, AC-8)
- **Touches:** `conductor/tracks/20261123-doc-truth-sweep/plan.md`, `conductor/tracks/20261123-doc-truth-sweep/verification/integrated.md`, `conductor/tracks/20261123-doc-truth-sweep/verification/phase-3.md`, `verification/phase-R1.md`
- **Verification:**
  ```
  git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD
  bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz
  ```
- **Status:** verified

**Result:** verified
**Checkpoint:** aacae0f3
**Evidence:** conductor/tracks/20261123-doc-truth-sweep/verification/phase-R1.md

- [x] **R1.T1: Remove the trailing blank line from `plan.md`** — covers: F1
  - [x] **R1.T1.1: Ensure the file ends with the final task line plus one newline.**
- [x] **R1.T2: Correct evidence `git diff --check` claims** — covers: F1
  - [x] **R1.T2.1: Record the actual exit code from the final tree in `integrated.md` and `phase-3.md`.**
- [x] **R1.T3: Write Phase R1 evidence** — covers: F1
  - [x] **R1.T3.1: Re-run the five configured commands and `git diff --check`, then write `verification/phase-R1.md` with verdict and no open blockers.**

## Phase R2: Review Findings F2 and F3

- **Goal:** Correct the two Low documentation-accuracy findings in `review.md` (non-existent FR-7 and stale Range) and record final evidence.
- **Depends on:** Phase R1
- **Covers:** F2, F3 (NFR-5)
- **Touches:** `conductor/tracks/20261123-doc-truth-sweep/review.md`, `verification/phase-R2.md`
- **Verification:** `git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD`; five configured commands on the final tree
- **Status:** verified

**Result:** verified
**Checkpoint:** 43a5bfc1
**Evidence:** conductor/tracks/20261123-doc-truth-sweep/verification/phase-R2.md

- [x] **R2.T1: Fix F2 and F3 in `review.md`** — covers: F2, F3
- [x] **R2.T2: Write Phase R2 evidence** — covers: F2, F3
  - [x] **R2.T2.1: Re-run `git diff --check` and the five configured commands, then write `verification/phase-R2.md` with final verdict.**
