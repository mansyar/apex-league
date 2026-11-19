# Roster Wave 2 — Implementation Plan

> **Branch:** `feat/20261118-roster-wave-2`
> **Base:** `main` @ `7dd56544a10a203621e522bedaa15ee047b300b3`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Species data, voxel archetypes, and deterministic artifacts

- **Goal:** three new discovery species, three recipes, six branch forms, and three voxel archetypes ship with byte-identical seed-42 artifacts; the unchanged balance gate is green at 21/21 with full verify, determinism, and fuzz green.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-9, NFR-1, NFR-2, NFR-3, NFR-4, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-9, AC-10
- **Touches:** `packages/sim/src/species/**`, `packages/sim/src/species.ts`, `packages/sim/src/breeding/discovery.ts`, `packages/sim/src/breeding/discovery.test.ts`, `packages/sim/src/branch-catalog/**`, `packages/sim/src/branches.test.ts`, `packages/sim/src/bosses.test.ts`, `packages/sim/src/battle/**`, `packages/sim/src/cup/**`, `packages/sim/src/roster-wave-*.test.ts`, `packages/sim/scripts/battle-telemetry.ts`, `packages/voxel/src/**`, `artifacts/{sprite,golem,wing}-42*`, `apps/client/src/choreo.ts`, `apps/client/src/choreo.test.ts`, `conductor/tracks/20261118-roster-wave-2/verification/phase-1.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`
- **Status:** verified

- [x] **P1.T1: Add sim species, recipes, and branch forms** — covers: FR-1, FR-2, FR-3
  - [x] **P1.T1.1: Add thornvolt, siltback, and emberwing discovery definitions with fixed kits, roles, and authored stat envelopes**
  - [x] **P1.T1.2: Add the three order-independent recipes and collision/coverage tests**
  - [x] **P1.T1.3: Add two branch forms per species with globally unique, element-true signatures**
- [x] **P1.T2: Author voxel archetypes and fuzz coverage** — covers: FR-4, NFR-2
  - [x] **P1.T2.1: Add sprite, golem, and wing templates, grids, builds, budgets, BodyProfile rows, and choreography entries**
  - [x] **P1.T2.2: Add archetype tests and boundary/budget/determinism fuzz shards**
- [x] **P1.T3: Author artifacts and clear the hard balance gate** — covers: FR-5, FR-6, FR-9, NFR-1, NFR-3, NFR-4
  - [x] **P1.T3.1: Generate nine seed-42 artifact pairs through the determinism writer and confirm the existing 54 pairs are byte-identical**
  - [x] **P1.T3.2: Tune the three new species within their authored envelopes, apply the owner-approved minimal voltfox/embercub bound adjustment, refresh diagnostic pins, keep the pacing debt pin and baseline-15 diagnostic population, and run the full verification chain**

<!--
**Result:** verified
**Checkpoint:** 64b28e1c
**Evidence:** conductor/tracks/20261118-roster-wave-2/verification/phase-1.md
-->

## Phase 2: Client discoverability and visual evidence

- **Goal:** the three new species and recipes are discoverable through the existing handbook and gallery seams and proven at desktop, portrait, and landscape sizes with a clean console; all invariants remain green.
- **Depends on:** Phase 1
- **Covers:** FR-7, FR-8, FR-9, NFR-5, NFR-6, AC-7, AC-8, AC-9, AC-10
- **Touches:** `apps/client/src/handbook/**`, `apps/client/src/handbook.test.ts`, `apps/client/src/gallery.ts`, `apps/client/src/gallery.test.ts`, `conductor/tracks/20261118-roster-wave-2/verification/phase-2.md`, `.conductor/evidence/20261118-roster-wave-2/**`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` plus the visual layer per `workflow.md` (`playwright-cli` against `bun run dev`, desktop 1440×900, portrait iPhone 393×852, landscape 852×393, console check)
- **Status:** pending

- [ ] **P2.T1: Wire client discoverability** — covers: FR-7
  - [ ] **P2.T1.1: Prove the handbook derives the three new recipe rows without a duplicated client recipe table**
  - [ ] **P2.T1.2: Prove gallery reachability for sprite, golem, and wing without a hardcoded species list**
- [ ] **P2.T2: Capture visual evidence** — covers: FR-8, NFR-5, NFR-6
  - [ ] **P2.T2.1: Capture desktop, 393×852, and 852×393 screenshots of the changed surfaces with zero console errors/warnings**
  - [ ] **P2.T2.2: Record screenshot paths, console results, and layout observations in the phase evidence report**
- [ ] **P2.T3: Re-prove final invariants** — covers: FR-9, NFR-6, AC-9, AC-10
  - [ ] **P2.T3.1: Re-run the full verification chain at the final phase head and record scope proof**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261118-roster-wave-2/verification/phase-2.md
-->

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
