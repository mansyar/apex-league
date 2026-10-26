# Roster Wave 3 (Breeding Discovery) — Implementation Plan

> **Branch:** `feat/20261027-roster-wave-3`
> **Base:** `main` @ `9b6a72bb0df29bf133739a869a67e195b144ad5c`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Species data, kits & discovery lookup

- **Goal:** `ALL_SPECIES` holds 12 species; the three recipes resolve deterministically inside the existing breeding flow with no save change.
- **Depends on:** none
- **Covers:** FR-1, FR-3, FR-4, NFR-1, NFR-5 — AC-1, AC-3, AC-4
- **Touches:** `packages/sim/src/species.ts`, `packages/sim/src/breeding/**` (or current breeding flow files), `packages/sim/src/battle/**`, co-located `*.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P1.T1: Define the three SpeciesDefs + kits** — covers: FR-1, FR-3
  - [ ] **P1.T1.1: Voltfox / Galeheron / Shalemole defs (element, stats, six-move kits from existing vocabulary), excluded from starter/reward paths**
  - [ ] **P1.T1.2: Probe-tune kits into existing sustained-score bands**
- [ ] **P1.T2: Implement the recipe lookup in the breeding flow** — covers: FR-4
  - [ ] **P1.T2.1: Pure order-independent lookup (electric×wind, wind×water, earth×fire); unlisted/same-element pairs unchanged**
  - [ ] **P1.T2.2: Pin with unit tests (both orders, negatives, breed-true as parents, no persisted state)**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261027-roster-wave-3/verification/phase-1.md
-->

## Phase 2: Voxel archetypes

- **Goal:** Three distinct, determinism-gated voxel archetypes (Voltfox, Galeheron, Shalemole), all life stages pinned.
- **Depends on:** Phase 1 (species ids fixed)
- **Covers:** FR-2, NFR-2, NFR-3, NFR-4 — AC-2
- **Touches:** `packages/voxel/src/**` (archetype recipes, gilded gate, manifests), generated GLB artifacts
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P2.T1: Author the three archetype recipes** — covers: FR-2
  - [ ] **P2.T1.1: Spark-tailed fox / storm-wading heron / slate-scaled mole recipes honoring surface ramp + hue contract**
  - [ ] **P2.T1.2: Generate GLBs, pin digests, tripwire ≤320 KiB, gilded weight 32**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261027-roster-wave-3/verification/phase-2.md
-->

## Phase 3: Client presentation, lifecycle & handbook

- **Goal:** The new species are fully rendered and playable client-side; the handbook openly lists the three recipes.
- **Depends on:** Phase 1, Phase 2
- **Covers:** FR-5 (client half), FR-7, FR-8, NFR-6 — AC-5 (client), AC-7, AC-8
- **Touches:** `apps/client/src/**` (plates, handbook incl. recipe hints, creature detail, growth, battle staging, copy)
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P3.T1: Render all surfaces + lifecycle parity** — covers: FR-5, FR-7
  - [ ] **P3.T1.1: Plates / stable / detail / growth / battle staging with element-true crests (50° / 165° / 28°)**
  - [ ] **P3.T1.2: Hatch → train → two branch forms per line, same mechanism as existing species**
- [ ] **P3.T2: Handbook recipes + copy** — covers: FR-7, FR-8
  - [ ] **P3.T2.1: Open recipe listings; single-sourced voice copy (≤2 sentences per string)**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261027-roster-wave-3/verification/phase-3.md
-->

## Phase 4: Rivals, bosses & integrated evidence

- **Goal:** The rival field uses the 12-species roster; all six boss pairings refreshed and played end-to-end in the browser.
- **Depends on:** Phase 3
- **Covers:** FR-6, NFR-5 — AC-6, plus full-sweep AC re-check
- **Touches:** `packages/sim/src/**` (rival pools, authored boss pairings), visual evidence
- **Verification:** `bun test --check --parallel=4 --timeout 120000`; visual layer per Verification Strategy
- **Status:** pending

- [ ] **P4.T1: Widen rival pools + refresh bosses** — covers: FR-6
  - [ ] **P4.T1.1: New species in generated fields; six pairings refreshed within row discipline**
  - [ ] **P4.T1.2: Play every refreshed pairing end-to-end in the browser (desktop + phone, console clean)**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261027-roster-wave-3/verification/phase-4.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 4
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
