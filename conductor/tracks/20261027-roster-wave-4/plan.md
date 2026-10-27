# Roster Wave 4 (Fire/Plant/Water Discovery) — Implementation Plan

> **Branch:** `feat/20261027-roster-wave-4`
> **Base:** `main` @ `4cd2d52a4cde39fa10346efe64ee563005a117fd`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Species data, kits & discovery lookup

- **Goal:** `ALL_SPECIES` holds 15 species; the three fire-triangle recipes resolve deterministically inside the existing breeding flow with no save change.
- **Depends on:** none
- **Covers:** FR-1, FR-3, FR-4, NFR-1, NFR-5 — AC-1, AC-3, AC-4
- **Touches:** `packages/sim/src/species/**`, `packages/sim/src/breeding/**`, `packages/sim/src/battle/**`, co-located `*.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

**Result:** verified
**Checkpoint:** 1d249352
**Evidence:** conductor/tracks/20261027-roster-wave-4/verification/phase-1.md

- [x] **P1.T1: Define the three SpeciesDefs + kits** — covers: FR-1, FR-3
  - [x] **P1.T1.1: Embercub / Mossboar / Mistkit defs (fire/plant/water, stats, six-move kits from existing vocabulary), excluded from starter/reward paths**
  - [x] **P1.T1.2: Probe-tune kits into existing sustained-score bands**
- [x] **P1.T2: Implement the recipe lookup in the breeding flow** — covers: FR-4
  - [x] **P1.T2.1: Pure order-independent lookup (fire×plant→Embercub, plant×water→Mossboar, fire×water→Mistkit); unlisted/same-element pairs unchanged; Wave 3 pairs untouched**
  - [x] **P1.T2.2: Pin with unit tests (both orders, negatives, breed-true as parents, no persisted state, save stays v25)**

## Phase 2: Voxel archetypes

- **Goal:** Three distinct, determinism-gated voxel archetypes (cub, boar, otter), all life stages pinned.
- **Depends on:** Phase 1 (species ids fixed)
- **Covers:** FR-2, NFR-2, NFR-3, NFR-4 — AC-2
- **Touches:** `packages/voxel/src/cub.ts`, `packages/voxel/src/boar.ts`, `packages/voxel/src/otter.ts`, `packages/voxel/src/*.test.ts`, `artifacts/**`, generated GLB manifests
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

**Result:** verified
**Checkpoint:** 030cd383
**Evidence:** conductor/tracks/20261027-roster-wave-4/verification/phase-2.md

- [x] **P2.T1: Author the three archetype recipes** — covers: FR-2
  - [x] **P2.T1.1: Ember-maned cub / moss-backed boar / mist-diving otter-kit recipes honoring surface ramp + hue contract (Fire 18° / Plant 110° / Water 205°)**
  - [x] **P2.T1.2: Generate GLBs, pin digests, tripwire ≤320 KiB, gilded weight 32**

## Phase 3: Client presentation, lifecycle & handbook

- **Goal:** The new species are fully rendered and playable client-side; the handbook openly lists the three fire-triangle recipes.
- **Depends on:** Phase 1, Phase 2
- **Covers:** FR-5 (client half), FR-7, FR-8, NFR-6 — AC-5 (client), AC-7, AC-8
- **Touches:** `apps/client/src/handbook/**`, `apps/client/src/plates/**`, `apps/client/src/creature-detail/**`, `apps/client/src/growth/**`, `apps/client/src/battle-staging/**`, client copy + co-located `*.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

**Result:** verified
**Checkpoint:** 9ed5c037
**Evidence:** conductor/tracks/20261027-roster-wave-4/verification/phase-3.md

- [x] **P3.T1: Render all surfaces + lifecycle parity** — covers: FR-5, FR-7
  - [x] **P3.T1.1: Plates / stable / detail / growth / battle staging with element-true crests (Fire 18° / Plant 110° / Water 205°)**
  - [x] **P3.T1.2: Hatch → train → two branch forms per line, same mechanism as existing species**
- [x] **P3.T2: Handbook recipes + copy** — covers: FR-7, FR-8
  - [x] **P3.T2.1: Open recipe listings (fire×plant, plant×water, fire×water); single-sourced voice copy (≤2 sentences per string)**

## Phase 4: Rivals, bosses & integrated evidence

- **Goal:** The rival field uses the 15-species roster; all six boss pairings validated (refreshed where probe gates fire, otherwise kept with probe evidence) and the cup surfaced end-to-end in the browser.
- **Depends on:** Phase 3
- **Covers:** FR-6, NFR-5 — AC-6, plus full-sweep AC re-check
- **Touches:** `packages/sim/src/cup/**`, `packages/sim/src/bosses.ts`, co-located `*.test.ts`, visual evidence
- **Verification:** `bun test --check --parallel=4 --timeout 120000`; visual layer per Verification Strategy
- **Status:** verified

**Result:** verified
**Checkpoint:** 02a524b6
**Evidence:** conductor/tracks/20261027-roster-wave-4/verification/phase-4.md

- [x] **P4.T1: Widen rival pools + refresh bosses** — covers: FR-6
  - [x] **P4.T1.1: New species in generated fields; six pairings validated within row discipline (refresh on probe failure, keep with rationale otherwise)**
  - [x] **P4.T1.2: Surface the cup end-to-end in the browser (desktop + phone, console clean): discovery recipes, branch forms, and a full spar on the new build**

## Phase R1: Review Fixes

- **Goal:** Resolve review findings R1, R2.
- **Depends on:** Phase 4
- **Covers:** R1, R2
- **Touches:** `conductor/tracks/20261027-roster-wave-4/spec.md`, `conductor/tracks/20261027-roster-wave-4/plan.md`, `conductor/tracks/20261027-roster-wave-4/verification/phase-R1.md`, `.conductor/evidence/20261027-roster-wave-4/phase-R1-landscape.png`
- **Verification:** `bun run verify && bun run build`; landscape browser pass with console check
- **Status:** in_progress

- [ ] **R1.T1: Resolve R1** — covers: R1
- [ ] **R1.T2: Resolve R2** — covers: R2
