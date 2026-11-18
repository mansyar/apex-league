# Roster Wave 1 — Implementation Plan

> **Branch:** `feat/20261118-roster-wave-1`
> **Base:** `main` @ `99c07b35bb01fc658cf646f9e89bb67c4d81eaad`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Species data, voxel archetypes, and deterministic artifacts

- **Goal:** Three new species, three recipes, six branch forms, and three new voxel archetypes ship with byte-identical seed-42 artifacts; balance, fuzz, determinism, and full verify are green at 18 species.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-9, NFR-1, NFR-2, NFR-3, NFR-6, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-9, AC-10
- **Touches:** `packages/sim/src/species/**`, `packages/sim/src/breeding/discovery.ts`, `packages/sim/src/breeding/discovery.test.ts`, `packages/sim/src/branch-catalog/**`, `packages/voxel/src/**`, `packages/voxel/scripts/**`, `artifacts/<new-archetype>-42*`, `conductor/tracks/20261118-roster-wave-1/verification/phase-1.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`
- **Status:** verified

- [x] **P1.T1: Add species, recipes, and branch forms** — covers: FR-1, FR-2, FR-3, AC-1, AC-2, AC-3
  - [x] **P1.T1.1:** Add `dune_jerboa`, `spark_ray`, and `gale_moth` catalog rows with distinct kits, valid stat bounds, flavors, and temperaments.
  - [x] **P1.T1.2:** Add earth+wind, fire+electric, and plant+wind discovery recipes with order-independent and collision tests.
  - [x] **P1.T1.3:** Add two champion branch forms per new species with equal budgets and one signature special each; run branch-balance tests.
- [x] **P1.T2: Author three voxel archetypes and artifacts** — covers: FR-4, FR-5, AC-4, AC-5, NFR-1, NFR-6
  - [x] **P1.T2.1:** Author `jerboa`, `ray`, and `moth` templates/builders and register them in archetype, budget, body-profile, and choreography tables.
  - [x] **P1.T2.2:** Add template, proportion, boundary, and registry tests for each new archetype.
  - [x] **P1.T2.3:** Export seed-42 baby/juvenile/champion GLB+manifest pairs via the documented exporter; record hashes and prove the 45 existing artifacts are unchanged.
- [x] **P1.T3: Prove invariants and scope** — covers: FR-6, FR-9, NFR-2, NFR-3, AC-6, AC-9, AC-10
  - [x] **P1.T3.1:** Run the full verification command and record balance at 18/18 with no waivers.
  - [x] **P1.T3.2:** Prove no change to save schema, `SIM_VERSION`, balance fences, pacing pins, or dependency manifests; check module-size caps.

<!--
**Result:** verified
**Checkpoint:** 0dc9995c
**Evidence:** conductor/tracks/20261118-roster-wave-1/verification/phase-1.md
-->

## Phase 2: Client discoverability and visual evidence

- **Goal:** The three new species and their recipes are discoverable in the handbook/gallery and proven at desktop and 393px with a clean console; all invariants remain green.
- **Depends on:** Phase 1
- **Covers:** FR-7, FR-8, NFR-4, NFR-5, AC-7, AC-8, AC-9, AC-10
- **Touches:** `apps/client/src/gallery.ts`, `apps/client/src/gallery.test.ts`, `apps/client/src/handbook/**`, `apps/client/src/handbook.test.ts`, `conductor/tracks/20261118-roster-wave-1/verification/phase-2.md`, `.conductor/evidence/20261118-roster-wave-1/**`
- **Verification:** `bun run verify && bun run build` plus the visual layer per `workflow.md` (`playwright-cli` against `bun run dev`, desktop 1440×900 and iPhone 15 393×852, console check)
- **Status:** verified

- [x] **P2.T1: Wire client discoverability** - covers: FR-7, AC-7
  - [x] **P2.T1.1:** Show the three new species in the dev gallery and keep existing gallery tests green.
  - [x] **P2.T1.2:** Expose the three new recipes in the handbook discovery page from the sim recipe seam and cover with client tests.
- [x] **P2.T2: Capture visual evidence** - covers: FR-8, NFR-4, NFR-5, AC-8
  - [x] **P2.T2.1:** Capture desktop and iPhone 15 screenshots of the gallery and handbook recipe page; confirm no horizontal scroll and a clean console.
  - [x] **P2.T2.2:** Write the phase evidence report with commands, counts, screenshot paths, and console result.
- [x] **P2.T3: Re-prove final invariants** - covers: AC-9, AC-10
  - [x] **P2.T3.1:** Re-run full verify, build, balance, determinism, and fuzz after client wiring.
  - [x] **P2.T3.2:** Re-check scope proof for no contract, schema, or fence changes.

<!--
**Result:** verified
**Checkpoint:** 51b03182
**Evidence:** conductor/tracks/20261118-roster-wave-1/verification/phase-2.md
-->

## Phase R1: Review Fixes

- **Goal:** Correct the stale telemetry pairing documentation so it matches the 18-species implementation; no behavior changes.
- **Depends on:** Phase 2
- **Covers:** F1
- **Touches:** `packages/sim/scripts/battle-telemetry.ts`, `conductor/tracks/20261118-roster-wave-1/verification/phase-R1.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`
- **Status:** pending

- [ ] **R1.T1: Resolve F1** - covers: F1
  - [ ] **R1.T1.1:** Update the matchup doc block to `gcd(11, 18)`, 18-species modulo/lap formulas, and `below 42`; mention mirror-hop start 9.

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261118-roster-wave-1/verification/phase-R1.md
-->
