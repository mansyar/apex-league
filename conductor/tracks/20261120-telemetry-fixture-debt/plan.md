# Telemetry Fixture Debt Reconciliation — Implementation Plan

> **Branch:** `chore/20261120-telemetry-fixture-debt`
> **Base:** `main` @ `d5baa0abcd9b827e94d72ed31831c9a237a5ccf3`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Baseline evidence and debt disposition

- **Goal:** Record the unchanged-tree telemetry, balance, audit, and trace facts, and write the owner's D-3/D-4 disposition before any file repair.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, AC-1, NFR-1, NFR-2
- **Touches:** `conductor/tracks/20261120-telemetry-fixture-debt/verification/phase-1.md`, `conductor/tracks/20261120-telemetry-fixture-debt/verification/owner-decision.md`, `.conductor/evidence/20261120-telemetry-fixture-debt/**`
- **Verification:** `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`; `bun run telemetry`; `bun run fixture-audit`; `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check`
- **Status:** verified

- [x] **P1.T1: Capture the live telemetry and balance baseline** — covers: FR-1, AC-1
  - [x] **P1.T1.1:** Run `bun run telemetry`; record `11/42 (26.2%)`, all 14 bounds green, and stability readings.
  - [x] **P1.T1.2:** Run `bun run balance`; record `370/1680 (22.0%)`, 34/34 gates, and the diagnostic reference line `580/1680 (34.5%)`.
- [x] **P1.T2: Capture the audit and trace baseline** — covers: FR-1, FR-2, FR-3
  - [x] **P1.T2.1:** Run `bun run fixture-audit` and `bun run fixture-audit --json`; record cell A `11/42` and the stale `840/377/224`, `+18.2 points` line.
  - [x] **P1.T2.2:** Run the pinned trace; record hash `0x1d0cc2ed`, 5/5 invariants, and 45.00 s duration.
  - [x] **P1.T2.3:** Write `verification/owner-decision.md` with the resolved decisions: D-3 met by D-2 side effect, D-4 diagnosed/bounded, stale audit arithmetic repaired.
- [x] **P1.T3: Record phase evidence and scope proof** — covers: FR-1, NFR-1, NFR-2
  - [x] **P1.T3.1:** Prove source tree unchanged at baseline with `git diff <base>..HEAD -- packages apps` empty.
  - [x] **P1.T3.2:** Write `verification/phase-1.md` with commands, counts, hashes, disposition, deviations, and notes.

**Result:** verified
**Checkpoint:** 59ff750e
**Evidence:** conductor/tracks/20261120-telemetry-fixture-debt/verification/phase-1.md

## Phase 2: Failing-first fixture audit repair

- **Goal:** Make the diagnostic audit print the current matrix arithmetic without adding a gate or changing the telemetry fixture.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, AC-4, AC-5, NFR-1, NFR-2, NFR-3, NFR-4
- **Touches:** `packages/sim/scripts/fixture-audit.ts`, `packages/sim/src/battle/continuous/fixture-audit.test.ts`, `conductor/tracks/20261120-telemetry-fixture-debt/verification/phase-2.md`, `.conductor/evidence/20261120-telemetry-fixture-debt/**`
- **Verification:** `bun test packages/sim/src/battle/continuous/fixture-audit.test.ts --timeout 120000`; `bun run fixture-audit`; `bun run telemetry`; `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`
- **Status:** verified

- [x] **P2.T1: Prove the stale audit report with a failing test** — covers: FR-5, AC-5, NFR-2
  - [x] **P2.T1.1:** Add a pure test in `fixture-audit.test.ts` that pins `1680`, `580`, `370`, and `+12.5 points` in the report and rejects the stale `840`, `377`, `224`, and `+18.2 points` values as current claims.
  - [x] **P2.T1.2:** Run the focused test before the repair; record the failure as failing-first evidence, not as a CI gate.
- [x] **P2.T2: Repair the audit arithmetic and prose** — covers: FR-4, AC-4, NFR-3, NFR-4
  - [x] **P2.T2.1:** Change `RECORDED` to `fights: 1680`, `referencePress: 580`, `midpointPress: 370`; verify the derived stat effect is `+12.5 points`.
  - [x] **P2.T2.2:** Update current-tense script comments from `20/42` and the 840-fight figures to `11/42` and the 1,680-fight comparison; keep old figures only where explicitly historical.
- [x] **P2.T3: Verify the repaired diagnostic and record evidence** — covers: FR-4, FR-5, AC-4, AC-5, NFR-6
  - [x] **P2.T3.1:** Re-run the focused test, `bun run fixture-audit`, `bun run telemetry`, and the five configured commands; confirm cells A-D still read `11/42`, `8/42`, `7/42`, `5/42`.
  - [x] **P2.T3.2:** Write `verification/phase-2.md` with before/after output, scope proof, module caps, deviations, and notes.

**Result:** verified
**Checkpoint:** 2c31115f
**Evidence:** conductor/tracks/20261120-telemetry-fixture-debt/verification/phase-2.md

## Phase 3: Documentation truth and integrated evidence

- **Goal:** Land the dated product/tech-stack reconciliation and commit integrated evidence proving no game gate, fixture, fence, or replay contract changed.
- **Depends on:** Phase 2
- **Covers:** FR-2, FR-3, FR-6, FR-7, AC-2, AC-3, AC-6, AC-7, AC-8, AC-9, NFR-5, NFR-6
- **Touches:** `conductor/product.md`, `conductor/tech-stack.md`, `conductor/tracks/20261120-telemetry-fixture-debt/verification/integrated.md`, `conductor/tracks/20261120-telemetry-fixture-debt/verification/phase-3.md`, `.conductor/evidence/20261120-telemetry-fixture-debt/**`
- **Verification:** `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`; `bun run fixture-audit`; `bun run telemetry`; `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check`
- **Status:** in_progress

- [ ] **P3.T1: Close D-3 and D-4 in the product roadmap** — covers: FR-2, FR-3, FR-6, AC-2, AC-3
  - [ ] **P3.T1.1:** Add a dated 2026-11-20 note recording D-3 met by the D-2 cap side effect at `11/42 (26.2%)` and no new pacing change in this track.
  - [ ] **P3.T1.2:** Record D-4 diagnosed/bounded, the 42-pairing fixture unchanged, and re-stratification deferred to a future product-decision track; preserve historical `20/42` narrative.
- [ ] **P3.T2: Add the tech-stack reconciliation note** — covers: FR-6, AC-7
  - [ ] **P3.T2.1:** Add a dated note covering the repaired `1680/580/370` audit arithmetic, `+12.5 points`, unchanged telemetry bounds and fixture, `SIM_VERSION` 4, ghost pins 4/5, and hash `0xff6f3d62`.
- [ ] **P3.T3: Write integrated evidence and final scope proof** — covers: FR-7, AC-6, AC-8, AC-9, NFR-5, NFR-6
  - [ ] **P3.T3.1:** Run all final verification commands; record counts, hashes, module caps, and screenshot requirement as N/A (no user-facing change).
  - [ ] **P3.T3.2:** Write `verification/integrated.md` and `verification/phase-3.md` with the D-3/D-4 disposition, exact commands, scope proof, and verdict.

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261120-telemetry-fixture-debt/verification/integrated.md
-->
