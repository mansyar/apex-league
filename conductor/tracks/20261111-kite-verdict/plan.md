# Kite Verdict — Implementation Plan

> **Branch:** `feat/20261111-kite-verdict`
> **Base:** `main` @ `16fae61e77468c6d9d0e7e7a62e17b008d2266a0`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Diagnose

- **Goal:** the evidence names, with traces, where Kite's fight is lost.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1, AC-2
- **Touches:** `packages/sim/scripts/battle-trace.ts`, `packages/sim/src/battle/continuous/balance-report.test.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** ef6ee61d
- **Evidence:** conductor/tracks/20261111-kite-verdict/verification/phase-1.md

- [x] **P1.T1: Baseline the probe** — covers: FR-1
  - [x] **P1.T1.1: Record wins and paid dodges per fight on pinned seeds.**
- [x] **P1.T2: Name the mechanism** — covers: FR-2
  - [x] **P1.T2.1: Cite gap, timing, and fence traces for the loss.**
  - [x] **P1.T2.2: Rule dodge volume in or out as the cause.**

## Phase 2: Lever Experiments

- **Goal:** each range/strafe move scored on the probe; only winners kept, bounds green.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-6, AC-3, AC-6
- **Touches:** `packages/sim/src/battle/continuous/controller-profile.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** e238d2a9
- **Evidence:** conductor/tracks/20261111-kite-verdict/verification/phase-2.md

- [x] **P2.T1: Move range band and strafe one at a time** — covers: FR-3
  - [x] **P2.T1.1: Score each move on the 6-fight probe with pacing re-check.**
  - [x] **P2.T1.2: Revert every move that breaks a bound or silences dodges.**
- [x] **P2.T2: Hold the gate** — covers: FR-6
  - [x] **P2.T2.1: Probe dodge rate non-zero; balance and telemetry green.**

## Phase 3: Verdict

- **Goal:** the tool ships (Kite at least 2/6) or the trap is labelled; spec records it.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-5, AC-4, AC-5
- **Touches:** `packages/sim/src/battle/continuous/controller*.ts`, `apps/client/src/spar/*`, `apps/client/src/cup/coach-room.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** in_progress

- [ ] **P3.T1: Ship the missing tool** — covers: FR-4
  - [ ] **P3.T1.1: Probe at least 2/6 with dodges firing and bounds green.**
- [ ] **P3.T2: Or label the trap** — covers: FR-5
  - [ ] **P3.T2.1: Situational copy in spar picker and coach room; spec records the verdict.**
