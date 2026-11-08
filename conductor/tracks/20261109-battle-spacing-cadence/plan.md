# Battle Spacing and Cadence — Implementation Plan

> **Branch:** feat/20261109-battle-spacing-cadence
> **Base:** feat/20261108-continuous-arena-battle
> **Status values:** pending | in_progress | verified | failed | blocked
> Only the primary agent writes this file.

## Phase 1: Measure the Clinch

- **Goal:** a baseline table that makes spacing, cadence and stamina pressure measurable.
- **Depends on:** none
- **Covers:** FR-1, FR-3, FR-4, AC-1, AC-2, AC-4
- **Touches:** `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/src/battle/continuous/telemetry.test.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 7ed4dcd9
- **Evidence:** `conductor/tracks/20261109-battle-spacing-cadence/verification/phase-1.md`

- [x] **P1.T1: Add the missing metrics** — covers: AC-1, AC-2, AC-4 — contact share (time inside the sum of radii), attack rate per side, retreat count, median engagement distance
- [x] **P1.T2: Record the baseline** — covers: FR-1 — run the harness and record every metric before any tuning

## Phase 2: Spacing

- **Goal:** fighters stand at the edge of reach and give ground when crowded.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, AC-1, AC-2, AC-3
- **Touches:** `packages/sim/src/battle/continuous/controller-profile.ts`, `controller.ts`, `controller-threat.ts`, `resolve.ts` (tactic overlays), co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 9b8423be
- **Evidence:** `conductor/tracks/20261109-battle-spacing-cadence/verification/phase-2.md`

- [x] **P2.T1: Preferred ranges out to reach** — covers: FR-1 — derive each archetype's preferred range from the reach edge rather than a fixed millimetre value
- [x] **P2.T2: A retreat that fires** — covers: FR-2 — retreat inside 0.6× preferred range, no oscillation at the fence, observable order

## Phase 3: Cadence, Stamina and Attack Speed

- **Goal:** attacking costs something, and `spd` buys recovery.
- **Depends on:** Phase 2
- **Covers:** FR-3, FR-4, FR-5, AC-4, AC-5, AC-6
- **Touches:** `packages/sim/src/battle/continuous/controller.ts`, `stamina.ts`, `strike.ts`, `frames.ts` (read-only unless a scale factor is needed), co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 6d03b841
- **Evidence:** `conductor/tracks/20261109-battle-spacing-cadence/verification/phase-3.md`

- [x] **P3.T1: Slower decisions** — covers: FR-3 — 200–240 ms cadence, cadence still observable and deterministic
- [x] **P3.T2: A binding stamina pool** — covers: FR-4 — costs and regen set so sustained output is at most one attack per 1.5 s
- [x] **P3.T3: Recovery scaled by spd** — covers: FR-5 — one exported tunable, validation rejects a non-positive recovery

## Phase 4: Re-measure and Re-pin

- **Goal:** the tuned engine is measured against the same table, and the suites it moves are re-pinned.
- **Depends on:** Phase 3
- **Covers:** FR-6, AC-7
- **Touches:** telemetry bounds, `*.balance.test.ts` re-pins, cup goldens, `conductor/product.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 2a4e348c
- **Evidence:** `conductor/tracks/20261109-battle-spacing-cadence/verification/phase-4.md`

- [x] **P4.T1: Compare against the baseline** — covers: AC-1, AC-2, AC-4, AC-5 — every metric before and after, with the bound it now meets
- [x] **P4.T2: Bound the pacing honestly** — covers: AC-7 — band and cap share, reported separately
- [x] **P4.T3: Re-pin what moved** — covers: FR-6 — every balance and cup row re-pinned, listed one by one
