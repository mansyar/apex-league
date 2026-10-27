# Ghost Data & Async Rivals — Implementation Plan

> **Branch:** `feat/20261027-ghost-data-async-rivals`
> **Base:** `main` @ `b88f211fd0813f5114454a61bf6cca78d3c3bb2c`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Ghost bundle + deterministic replay

- **Goal:** Cup win yields a byte-identical replay bundle
- **Depends on:** none
- **Covers:** FR-1, NFR-1, AC-1
- **Touches:** `packages/sim/src/cup/*`, `packages/sim/src/battle/*`
- **Verification:** `bun test packages/sim --parallel=4` + `bun run check`
- **Status:** verified

- [x] **P1.T1: Ghost bundle builder + version pin** — covers: FR-1
  - [x] **P1.T1.1: Define bundle shape (seed, kits, log, sim version)**
  - [x] **P1.T1.2: Capture on cup win path**
- [x] **P1.T2: Deterministic replay verifier** — covers: FR-1, AC-1
  - [x] **P1.T2.1: Byte-identical playback test with fixed seeds**

**Result:** verified
**Checkpoint:** 4df6be67
**Evidence:** conductor/tracks/20261027-ghost-data-async-rivals/verification/phase-1.md
**Tests:** bun test packages/sim --parallel=4 → 1387 pass / 1 skip / 0 fail; bun run check → clean (sim 167 / client 432 / server 36 / voxel 145 files)
**AC:** AC-1 verified (bundle on cup win + identical playback)

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261027-ghost-data-async-rivals/verification/phase-1.md
-->

## Phase 2: Server ghost store + listing

- **Goal:** Per-trainer best upload/download + top-100 listing
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-7, NFR-4, AC-3, AC-7
- **Touches:** `apps/server/src/ghost/*`, `apps/server/src/db/*`
- **Verification:** `bun test apps/server --parallel=4` + `bun run check`
- **Status:** in_progress

- [ ] **P2.T1: Ghost store + plausibility caps** — covers: FR-3, FR-7
  - [ ] **P2.T1.1: Upload/download routes with per-trainer best semantics**
  - [ ] **P2.T1.2: Caps reject oversize/foreign quietly**
- [ ] **P2.T2: Top-100 listing reusing leaderboard plumbing** — covers: FR-3, AC-3

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->

## Phase 3: Auto-submit + fetch + offline snapshot

- **Goal:** Ghost syncs alongside save push, offline-safe
- **Depends on:** Phase 2
- **Covers:** FR-2, FR-6, NFR-2, NFR-5, AC-2, AC-6
- **Touches:** `apps/client/src/cloud/*`
- **Verification:** `bun test apps/client/src/cloud --parallel=4` + `bun run check`
- **Status:** pending

- [ ] **P3.T1: Push-queue hook for auto-submit** — covers: FR-2, AC-2
  - [ ] **P3.T1.1: Quiet non-blocking submit with flush ordering**
- [ ] **P3.T2: Fetch-on-open + snapshot** — covers: FR-6, AC-6
  - [ ] **P3.T2.1: Offline snapshot fallback test**

## Phase 4: Board UI + spar-vs-ghost

- **Goal:** Board preview + Fight launches local-only spar
- **Depends on:** Phase 3
- **Covers:** FR-4, FR-5, NFR-3, AC-4, AC-5
- **Touches:** `apps/client/src/board/*`, `apps/client/src/spar/*`
- **Verification:** `bun run check` + `bun run build` + visual screenshots desktop + 393px mobile clean console
- **Status:** pending

- [ ] **P4.T1: Board badge + preview + Fight action** — covers: FR-4, AC-4
  - [ ] **P4.T1.1: Empty-state + stale copy**
- [ ] **P4.T2: Spar-vs-ghost wiring, local-only result** — covers: FR-5, AC-5
  - [ ] **P4.T2.1: No cups/ladder mutation test**
