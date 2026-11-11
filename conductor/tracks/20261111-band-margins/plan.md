# Band Margins — Implementation Plan

> **Branch:** `chore/20261111-band-margins`
> **Base:** `main` @ `2ecb791f026e3172b8a188d04956e7dee10e89be`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Re-measure

- **Goal:** the gate's current state is on file — green (track closes) or a named red list.
- **Depends on:** none
- **Covers:** FR-1, AC-1
- **Touches:** `packages/sim/scripts/battle-balance-report.ts` (read-only run), `packages/sim/src/battle/continuous/balance-report.test.ts` (only if output format drifted)
- **Verification:** `bun run balance` and `bun run telemetry` as two separate commands
- **Status:** in_progress

- [ ] **P1.T1: Run the gate on the current tree** — covers: FR-1
  - [ ] **P1.T1.1: Record per-row rates, distinct counts, and pacing figures against the shipped bounds.**
- [ ] **P1.T2: Verdict** — covers: FR-1, AC-1
  - [ ] **P1.T2.1: Green → close track with evidence only; red → named row list for Phase 2.**

## Phase 2: Fix What Drifted

- **Goal:** every broken row back inside 45–55% by whole-band stat shifts; water resolved.
- **Depends on:** Phase 1 (executes only if the re-measure is red; otherwise closed with a no-op note)
- **Covers:** FR-2, FR-3, AC-2, AC-3
- **Touches:** `packages/sim/src/species/**`, co-located tests
- **Verification:** `bun run verify` and `bun run build` as two separate commands
- **Status:** pending

- [ ] **P2.T1: Shift broken rows** — covers: FR-2, AC-2
  - [ ] **P2.T1.1: Whole-band moves only, ceilings respected, pacing re-checked per candidate.**
- [ ] **P2.T2: Resolve water_axolotl** — covers: FR-3, AC-3
  - [ ] **P2.T2.1: Stats first; renewed waiver with blocking ceiling + re-check condition only if blocked (owner confirms).**

## Phase 3: Margin Guard

- **Goal:** the inset margin test covers every row this track moved; gate green.
- **Depends on:** Phase 2 (executes only if Phase 2 moved rows; otherwise closed with a no-op note)
- **Covers:** FR-4, AC-4
- **Touches:** `packages/sim/src/battle/continuous/balance-report.test.ts`
- **Verification:** `bun run verify` and `bun run build` as two separate commands
- **Status:** pending

- [ ] **P3.T1: Extend the inset test** — covers: FR-4, AC-4
  - [ ] **P3.T1.1: Touched rows assert inside the 0.46/0.54 inset; full `bun run balance` exit 0.**
