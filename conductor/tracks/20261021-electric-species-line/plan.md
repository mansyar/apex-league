# Implementation Plan — Electric Species Line

**Branch:** `feat/20261021-electric-species-line`
**Base:** `main` @ `461e779`

Phase states: `pending` → `in_progress` → `verified` / `failed` / `blocked`.
Only the primary agent writes this file; subagents report back.

## Phase 0 — Conductor Housekeeping

- **Goal:** `.conductor/runs/` contains no files for completed tracks and the early `conductor/tracks.md` entries are free of mojibake.
- **Depends on:** none
- **Covers:** FR-10, AC-10
- **Touches:** `.conductor/runs/*`, `conductor/tracks.md`
- **Verification:** `bun run check && bun test --timeout 120000` (sanity only; state-only change)
- **Status:** verified

### Tasks

- [x] **P0.T1: Delete stale `.conductor/runs/*` files for completed tracks** — covers: FR-10
- [x] **P0.T2: Fix mojibake (`ΓÇö`) in early `conductor/tracks.md` entries** — covers: FR-10

**Result:** verified
**Checkpoint:** 5771e1f
**Evidence:** conductor/tracks/20261021-electric-species-line/verification/phase-0.md

## Phase 1 — Species Data & Balance Probe

- **Goal:** `electric_hound` is fully defined in the sim — species record with fast-striker stats and a 3-stage line, a 6-move pool on the existing effect vocabulary, and a passing balance probe with all existing goldens untouched.
- **Depends on:** Phase 0
- **Covers:** FR-3, FR-4, AC-3, AC-4, NFR-3, NFR-4
- **Touches:** `packages/sim/src/` species registry module + co-located tests, `packages/sim/src/breeding.ts` (`speciesOptions`), `packages/sim/src/index.ts` (barrel exports)
- **Verification:** `bun run check && bun test --timeout 120000`
- **Status:** verified

### Tasks

- [x] **P1.T1: Define the electric_hound species record (stats, stages, champion branching config)** — covers: FR-3
  - [x] **P1.T1.1: Failing test first — stat profile is SPD/ATK-tilted and distinct from all existing species** — covers: FR-3
- [x] **P1.T2: Author the 8 Electric specials (6 kit + 2 branch signatures) on existing effect vocabulary with learn/equip wiring** — covers: FR-4
- [x] **P1.T3: New-species balance probe + guardrails (boss bands, existing goldens)** — covers: AC-3, NFR-4

**Result:** verified
**Checkpoint:** c33482d
**Evidence:** conductor/tracks/20261021-electric-species-line/verification/phase-1.md

## Phase 2 — Silver Reward & Gift Egg

- **Goal:** the Silver tier-reward grant fires exactly once on non-forfeit cup finalize, the pure gift egg hatches fixed-Electric with no drift roll, and the claim/egg state persists through save v21 with migration and schema docs.
- **Depends on:** Phase 1
- **Covers:** FR-5, FR-6, FR-8, AC-5, AC-6, AC-8, NFR-3
- **Touches:** `packages/sim/src/cup/` (finalize seam), `packages/sim/src/save/{schema,migrate,storage,transfer}.ts`, `packages/sim/src/breeding.ts` (egg creation seam), `docs/save-schema.md`, co-located tests
- **Verification:** `bun run check && bun test --timeout 120000`
- **Status:** verified

### Tasks

- [x] **P2.T1: Tier-reward grant at cup finalize (once, persists, forfeit-exempt, tier ≥ Silver check)** — covers: FR-5
  - [x] **P2.T1.1: Failing test first — grant, duplicate, and below-Silver paths** — covers: FR-5
- [x] **P2.T2: Pure gift egg — fixed Electric element, guaranteed affinity null, no drift RNG draw, previewed = hatched** — covers: FR-6, AC-6, NFR-3
- [x] **P2.T3: Save v21 bump + v20→v21 migration + `docs/save-schema.md` rows** — covers: FR-8, AC-8

**Result:** verified
**Checkpoint:** 8486942
**Evidence:** conductor/tracks/20261021-electric-species-line/verification/phase-2.md

## Phase 3 — Voxel Archetype & GLBs

- **Goal:** the storm-hound archetype is authored (sculpt-later-friendly), 3 stage GLBs are generated and registered in the determinism gate.
- **Depends on:** Phase 1
- **Covers:** FR-2, AC-2, NFR-2, NFR-5
- **Touches:** `packages/voxel/src/**` (archetype), generator scripts/config, determinism gate artifact list
- **Verification:** `bun run gate:determinism` plus `bun run verify`
- **Status:** verified

### Tasks

- [x] **P3.T1: Author the storm-hound archetype following palette/eyes/AO product guidelines** — covers: FR-2, NFR-5
- [x] **P3.T2: Generate the three stage GLBs and register them in the determinism gate** — covers: FR-2, AC-2, NFR-2

**Result:** verified
**Checkpoint:** abcd400
**Evidence:** conductor/tracks/20261021-electric-species-line/verification/phase-3.md

## Phase 4 — Rivals, UI & Client Integration

- **Goal:** the species is visible and playable across the client — generated rival rosters field it, the handbook documents it, and nursery/plate/detail render it — with visual evidence at two widths.
- **Depends on:** Phase 2, Phase 3
- **Covers:** FR-7, FR-9, AC-7, AC-9, NFR-1
- **Touches:** `packages/sim/src/cup/` (roster generation), `apps/client/src/handbook/`, `apps/client/src/graduation/`, `apps/client/src/hud/`, `apps/client/src/detail/`, surface CSS under `apps/client/src/ui/`, co-located pure-module tests
- **Verification:** `bun run check && bun test --timeout 120000` plus the visual layer (desktop + iPhone 15 screenshots, clean console)
- **Status:** verified

### Tasks

- [x] **P4.T1: Generated rival rosters may field electric_hound post-obtainability; boss sides unchanged** - covers: FR-7
- [x] **P4.T2: Handbook entries for the species and its move pool** - covers: FR-9
- [x] **P4.T3: Client surfaces render the species (nursery, plate, detail modal) within the module cap** - covers: FR-9, NFR-1
- [x] **P4.T4: Visual-layer evidence via playwright-cli (desktop + iPhone 15), console check** - covers: AC-9

**Result:** verified
**Checkpoint:** d3c05ad
**Evidence:** conductor/tracks/20261021-electric-species-line/verification/phase-4.md

## Phase 5 — Docs Sync & Integrated Verification

- **Goal:** roadmap and stack truth recorded, full-lifecycle AC-1 evidence captured, and the full gate green on the branch.
- **Depends on:** Phase 1, Phase 2, Phase 3, Phase 4
- **Covers:** FR-8, AC-1, AC-2, NFR-2
- **Touches:** `conductor/product.md`, `conductor/tech-stack.md`, `README.md` (only where it repeats affected truth)
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

### Tasks

- [x] **P5.T1: Docs sync - product.md Phase 3 note, tech-stack dated entry, README truth check** - covers: FR-8
- [x] **P5.T2: Integrated verification - full gate + AC-1 lifecycle evidence** - covers: AC-1, AC-2, NFR-2

**Result:** verified
**Checkpoint:** f873b66
**Evidence:** conductor/tracks/20261021-electric-species-line/verification/phase-5.md
