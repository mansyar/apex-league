# Roster Re-tune — Implementation Plan

> **Branch:** `feat/20261111-roster-retune`
> **Base:** `feat/20261110-battle-variance` @ `7a08d42759d1efcc62bbdc19d476e1a531b9eb8d`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Cool the Hot Rows

- **Goal:** plant_ox and cindermoor both measure inside 45–55% with no other row regressing to red.
- **Depends on:** none
- **Covers:** FR-1, FR-3, AC-1, AC-3
- **Touches:** `packages/sim/src/species/**` (+ co-located species tests only)
- **Verification:** `bun run verify && bun run build`
- **Status:** in_progress

- [ ] **P1.T1: plant_ox into the band** — covers: FR-1
  - [ ] **P1.T1.1: Whole-band downshift scored by measureSpecies, accepted only past its se**
  - [ ] **P1.T1.2: Kit reorder if stats alone cannot reach without identity break; full-matrix confirm**
- [ ] **P1.T2: cindermoor into the band** — covers: FR-3
  - [ ] **P1.T2.1: Smallest downshift that clears +5.5 pts with margin, not oscillation**
  - [ ] **P1.T2.2: Confirm no green row flips to red; gate pins left red for Phase 3 (no interim re-baseline)**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261111-roster-retune/verification/phase-1.md
-->

## Phase 2: Warm the Cold Rows

- **Goal:** earth_tortoise and galeheron both measure inside 45–55% with identity, swing, and telemetry intact.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-4, AC-2, AC-4
- **Touches:** `packages/sim/src/species/**` (+ co-located species tests only)
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P2.T1: earth_tortoise into the band** — covers: FR-2
  - [ ] **P2.T1.1: Upshift keeping the slowest record and a defensible attack ceiling; startup-512 row untouched**
  - [ ] **P2.T1.2: Telemetry re-run per candidate (cap at bound with zero headroom); distinct stays ≥ floor**
- [ ] **P2.T2: galeheron into the band** — covers: FR-4
  - [ ] **P2.T2.1: Upshift past −6.7 pts with margin, accepted only past its se**
  - [ ] **P2.T2.2: Kit option if stats alone force an identity break; full-matrix confirm**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261111-roster-retune/verification/phase-2.md
-->

## Phase 3: Green Gate and Guardrails

- **Goal:** `bun run balance` exits 0 with KNOWN_MISSES empty and every suite, bound, and guardrail green.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, FR-7, AC-5, AC-6, AC-7
- **Touches:** `packages/sim/src/battle/continuous/balance-report.test.ts` (+ forced golden re-pins only)
- **Verification:** `bun run verify`, `bun run build`, `bun run balance`, `bun run telemetry` (four separate runs)
- **Status:** pending

- [ ] **P3.T1: Gate green on measured rows** — covers: FR-6, AC-6
  - [ ] **P3.T1.1: Re-baseline distinct pins, design-band list, and KNOWN_MISSES to measured values; empty the misses**
  - [ ] **P3.T1.2: Prove `bun run balance` exits 0 with no widened bound, floor, or tolerance**
- [ ] **P3.T2: Guardrails hold** — covers: FR-5, FR-7, AC-5, AC-7
  - [ ] **P3.T2.1: Verify/build/telemetry green; all 11 other rows gate-green; no `test.failing` conversion anywhere**
  - [ ] **P3.T2.2: Check the out-of-band assumption (no outside-band row worsened by more than its se)**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261111-roster-retune/verification/phase-3.md
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
