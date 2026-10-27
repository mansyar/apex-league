# Prod API Wiring — Implementation Plan

> **Branch:** `chore/20261027-prod-api-wiring`
> **Base:** `main` @ `3336f0b82e8878bbc96201afe023c6312fe840fc`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Deploy wiring

- **Goal:** Prod builds inject the API origin; previews stay offline; missing var fails fast
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, AC-1, AC-2, AC-3
- **Touches:** `.github/workflows/deploy.yml`, `scripts/deploy/workflow.test.ts`
- **Verification:** `bun test scripts/deploy/workflow.test.ts --check`
- **Status:** verified

- [x] **P1.T1: Wire `APEX_API_ORIGIN` into `deploy.yml`** — covers: FR-1
  - [x] **P1.T1.1: Export `VITE_API_ORIGIN` from vars at build on prod** — covers: FR-1
  - [x] **P1.T1.2: Fail fast naming `APEX_API_ORIGIN` when missing on `main`** — covers: FR-3
  - [x] **P1.T1.3: Leave previews without `VITE_API_ORIGIN` (offline)** — covers: FR-2
- [x] **P1.T2: Extend workflow tests** — covers: FR-1
  - [x] **P1.T2.1: Prod job exports the origin** — covers: FR-1
  - [x] **P1.T2.2: Missing var fails before upload** — covers: FR-3
  - [x] **P1.T2.3: Preview job has no origin** — covers: FR-2

<!--
**Result:** verified
**Checkpoint:** 660932b3
**Evidence:** conductor/tracks/20261027-prod-api-wiring/verification/phase-1.md
-->

## Phase 2: Docs truth pass

- **Goal:** Stale "no backend" notes corrected across workflow, stack, README, and env example
- **Depends on:** Phase 1
- **Covers:** FR-4, AC-4
- **Touches:** `conductor/workflow.md`, `conductor/tech-stack.md`, `README.md`, `.env.example`
- **Verification:** `bun run check`
- **Status:** verified
- **Resolution:** unblocked by user-approved direct application; work commit `3e1f5d0f`, evidence recorded.

- [x] **P2.T1: Update `workflow.md` services/database/env/emergency for the live server** — covers: FR-4
- [x] **P2.T2: Update `tech-stack.md` note, `README.md` deploy section, `.env.example` vars** — covers: FR-4

<!--
**Result:** verified
**Checkpoint:** 3e1f5d0f
**Evidence:** conductor/tracks/20261027-prod-api-wiring/verification/phase-2.md
-->

## Phase 3: Integrated verification

- **Goal:** Full gate green with prod origin injected and offline fallback preserved
- **Depends on:** Phase 2
- **Covers:** FR-5, NFR-1, NFR-2, NFR-3, AC-5, AC-6
- **Touches:** `.github/workflows/deploy.yml`, `apps/client/src/cloud/config.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Resolution:** subagent proved prod + offline builds; primary fixed a Phase 1 biome escapee (`f917ff33`) and reran the full gate green. Evidence recorded.

- [x] **P3.T1: Prove prod + offline builds** — covers: FR-5
  - [x] **P3.T1.1: Build with `VITE_API_ORIGIN=https://apex-api.ansyar-world.top` contains the origin** — covers: FR-5
  - [x] **P3.T1.2: Build without origin keeps offline behavior (no cloud object)** — covers: FR-5

<!--
**Result:** verified
**Checkpoint:** f917ff33
**Evidence:** conductor/tracks/20261027-prod-api-wiring/verification/phase-3.md
-->

## Phase R1: Review Fixes

- **Goal:** Resolve review findings F1, F2 (Low comment nits)
- **Depends on:** Phase 3
- **Covers:** F1, F2
- **Touches:** `scripts/deploy/workflow.test.ts`
- **Verification:** `bun test scripts/deploy/workflow.test.ts && bunx biome check scripts/deploy/workflow.test.ts`
- **Status:** verified
- **Resolution:** header names both contracts; phantom NFR-5 dropped. 17 pass, biome clean.

- [x] **R1.T1: Resolve F1 (stale header)** — covers: F1
- [x] **R1.T2: Resolve F2 (phantom NFR-5)** — covers: F2

<!--
**Result:** verified
**Checkpoint:** cc824209
**Evidence:** conductor/tracks/20261027-prod-api-wiring/review.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
