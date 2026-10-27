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
- **Status:** verified

- [x] **P2.T1: Ghost store + plausibility caps** — covers: FR-3, FR-7
  - [x] **P2.T1.1: Upload/download routes with per-trainer best semantics**
  - [x] **P2.T1.2: Caps reject oversize/foreign quietly**
- [x] **P2.T2: Top-100 listing reusing leaderboard plumbing** — covers: FR-3, AC-3

**Result:** verified
**Checkpoint:** 291f1b98
**Evidence:** conductor/tracks/20261027-ghost-data-async-rivals/verification/phase-2.md
**Tests:** bun test apps/server --parallel=4 → 164 pass / 0 fail; bun run check → clean (server 44 files)
**AC:** AC-3 verified (top-100 listing), AC-7 verified (oversize/foreign rejected quietly)
**Deviations:** schema.ts used instead of src/db/* (Drizzle tables live there); app.ts one import + .use() mount; migration at apps/server/migrations/0003_ghost.sql per committed-SQL pattern; app/db/migrate test expectations pinned to new head migration

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
- **Status:** verified

- [x] **P3.T1: Push-queue hook for auto-submit** — covers: FR-2, AC-2
  - [x] **P3.T1.1: Quiet non-blocking submit with flush ordering**
- [x] **P3.T2: Fetch-on-open + snapshot** — covers: FR-6, AC-6
  - [x] **P3.T2.1: Offline snapshot fallback test**

**Result:** verified
**Checkpoint:** 1d433395
**Evidence:** conductor/tracks/20261027-ghost-data-async-rivals/verification/phase-3.md
**Tests:** bun test apps/client/src/cloud --parallel=4 → 107 pass / 0 fail; bun run check → clean (client 435 files)
**AC:** AC-2 verified (auto-submit quiet non-blocking), AC-6 verified (offline snapshot fallback)
**Deviations:** save-payload.ts additive extraction (sync.ts was at 12KB cap); sync.test.ts fake-API stubs for extended CloudApi; malformed-wire stubs mirror board/fetch.test.ts precedent

## Phase 4: Board UI + spar-vs-ghost

- **Goal:** Board preview + Fight launches local-only spar
- **Depends on:** Phase 3
- **Covers:** FR-4, FR-5, NFR-3, AC-4, AC-5
- **Touches:** `apps/client/src/board/*`, `apps/client/src/spar/*`
- **Verification:** `bun run check` + `bun run build` + visual screenshots desktop + 393px mobile clean console
- **Status:** verified

- [x] **P4.T1: Board badge + preview + Fight action** — covers: FR-4, AC-4
  - [x] **P4.T1.1: Empty-state + stale copy**
- [x] **P4.T2: Spar-vs-ghost wiring, local-only result** — covers: FR-5, AC-5
  - [x] **P4.T2.1: No cups/ladder mutation test**

**Result:** verified
**Checkpoint:** d0a36e77
**Evidence:** conductor/tracks/20261027-ghost-data-async-rivals/verification/phase-4.md (+ ghost-board-desktop.png, ghost-spar-desktop.png, ghost-board-mobile.png)
**Tests:** board+spar suites → 66 pass / 0 fail; check clean (client 442 files); build exit 0; module-size guard 5 pass (main.ts 12222 B); biome clean
**AC:** AC-4 verified (badge + preview + Fight, empty/stale/offline copy, real local stack); AC-5 verified (ghost bout in-panel, no-mutation test, no save/cloud touch)
**Deviations:** D1 sim SIM_VERSION re-export; D2 Spar.fightGhost member; D3 spar.ts session wiring; D4 main.ts boot wiring; D5 ghostBoutIntro copy; D6 board/boot.ts extraction (main.ts was 563 B over cap); D7 ghost-section.test.ts harness assertions; D8 migrate.test.ts format wrap

## Phase R1: Review Fixes

- **Goal:** Resolve review findings F1–F5 (round 1 BLOCK → re-review)
- **Depends on:** Phase 4
- **Covers:** F1, F2, F3, F4, F5
- **Touches:** `apps/client/src/cup/*`, `apps/client/src/cloud/*`, `packages/sim/src/cup/*`, `apps/server/src/ghost/*`, `apps/client/src/spar.ts`, `apps/client/src/board/*`
- **Verification:** `bun test apps/client/src/cup apps/client/src/cloud apps/client/src/spar apps/client/src/board packages/sim apps/server --parallel=4` + `bun run check` + `bun run build`
- **Status:** in_progress

- [x] **R1.T1: Wire cup-win ghost capture + queue (F1)** — covers: F1
  - [x] **R1.T1.1: Cup→cloud integration test (champion queues, flush after push)**
- [x] **R1.T2: Copy-on-capture + caps/reader alignment + teardown/copy nits (F2–F5)** — covers: F2, F3, F4, F5

**Result:** verified
**Checkpoint:** c1f8cc71
**Evidence:** conductor/tracks/20261027-ghost-data-async-rivals/verification/phase-r1.md
**Tests:** cup/cloud/spar/board + sim + server suites → 1754 pass / 1 skip / 0 fail; check clean (sim 167 / client 444 / server 44 / voxel 145); build exit 0; module-size guard pass (main.ts 12256 B); biome clean
**AC:** AC-1 verified (champion finalize captures + queues through the one production finalize site; integration test queues a real bundle and flushes it after the push); AC-2 verified (flush ordering unchanged — submitPending rides the save push; offline/reject behavior untouched)
**Findings resolved:** F1 cup→queue wiring (captureCupGhost at onFinalize, cloudSync through ScreenDeps); F2 copy-on-capture (sides + events copied, mutation test); F3 caps require element (fixture already had it, rejection test added); F4 pendingGhost cleared on creature-loss teardown; F5 version copy is direction-neutral
