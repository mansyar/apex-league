# Main Push Path Filters - Implementation Plan

> **Branch:** `chore/20261117-main-push-path-filters`
> **Base:** `main` @ `e2038303`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: The filters and the written rule

- **Goal:** both `push: main` workflows ignore the six documented non-build paths, keep every
  code-push and manual-dispatch path byte-identical, and carry the rationale beside the filter.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, NFR-2, NFR-4, AC-1, AC-2, AC-3
- **Touches:** `.github/workflows/deploy.yml`, `.github/workflows/server-image.yml`,
  `conductor/tracks/20261117-main-push-path-filters/verification/phase-1.md`
- **Verification:** `bun run verify`
- **Status:** verified
- **Result:** verified — both push workflows ignore the six non-build paths with the written rule; YAML parses and no existing line changed
- **Checkpoint:** d784ec81
- **Evidence:** conductor/tracks/20261117-main-push-path-filters/verification/phase-1.md

- [x] **P1.T1: Filter the Deploy push trigger** - covers: FR-1, NFR-2, AC-1, AC-2
  - [x] **P1.T1.1: Add exactly `conductor/**`, `docs/**`, `.opencode/**`, `README.md`, `AGENTS.md`, `*.png` under `push:`**
  - [x] **P1.T1.2: Write the rule beside it — what each path is and why it cannot feed the Vite bundle or the Pages upload**
  - [x] **P1.T1.3: Leave `workflow_dispatch`, `permissions`, `concurrency`, the production `bun run verify` gate and the Bun pin untouched**
- [x] **P1.T2: Filter the Server image push trigger** - covers: FR-2, FR-3, AC-1, AC-2, AC-3
  - [x] **P1.T2.1: Add the same six entries, character for character, under `push:`**
  - [x] **P1.T2.2: Keep `workflow_dispatch`, the GHCR tag/promotion steps and the container build unchanged**
- [x] **P1.T3: Record the before/after** - covers: NFR-4, AC-3
  - [x] **P1.T3.1: Show the two `on:` blocks before and after, and list the runs that the doc-only commit `e2038303` started (43178773457, 43178773306)**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-main-push-path-filters/verification/phase-1.md
-->

**Primary note:** AC-5 cannot be executed inside the track. The live conductor-only push to `main` is
the commit that records this track's merge, so it is observed immediately after merge against a `main`
that already carries the filters, then appended to `verification/phase-1.md` and
`verification/integrated.md` in the archived copy. Do not open a second throwaway PR for it — the
metadata commit is the probe.

## Phase 2: The fence and the stale comment

- **Goal:** the committed workflow test fails if either filter or either manual trigger regresses,
  and the retired sample-size wording is gone from `ci.yml`.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-6, NFR-1, NFR-3, AC-4, AC-5, AC-6, AC-7
- **Touches:** `scripts/deploy/workflow.test.ts`, `.github/workflows/ci.yml`,
  `conductor/tracks/20261117-main-push-path-filters/verification/phase-2.md`
- **Verification:** `bun test scripts/deploy/workflow.test.ts`, then `bun run verify`, then `bun run build`
  (three separate commands)
- **Status:** in_progress

- [ ] **P2.T1: Pin the workflow contract** - covers: FR-4, NFR-1, AC-4
  - [ ] **P2.T1.1: Assert both workflows declare exactly the six `paths-ignore` entries under `push:` and neither uses a `paths:` allow-list**
  - [ ] **P2.T1.2: Assert both still declare `workflow_dispatch`, and re-use the existing assertions that `ci.yml` has no path filter and no `push` trigger**
  - [ ] **P2.T1.3: Prove the fence bites: temporarily remove one pattern and one `workflow_dispatch`, show each fails the suite, then restore both**
- [ ] **P2.T2: Correct the stale comment** - covers: FR-6, AC-6
  - [ ] **P2.T2.1: Change `ci.yml:100` from "The same 14-matchup sample" to the current 42-fight wording; change no YAML**
- [ ] **P2.T3: Record the verification** - covers: NFR-3, AC-7
  - [ ] **P2.T3.1: Paste the test, verify and build results, and show that no file under `apps/` or `packages/` changed**

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** - covers: <finding ID>
-->
