# Rework mobile ranch hierarchy and make action state, costs, and disabled reasons explicit — Implementation Plan

> **Branch:** `refactor/20261128-ranch-hierarchy`
> **Base:** `main` @ `1629b813`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Dock inline state (care + train)

- **Goal:** every care button and the train control (button + picker rows) renders state, cost, and reason as visible inline text across all gating states.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-6, AC-1, AC-2
- **Touches:** `apps/client/src/hud/update.ts`, `apps/client/src/hud/dock.ts`, `apps/client/src/hud/programs.ts`, `apps/client/src/hud/copy-care.ts`, `apps/client/src/hud/*.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/hud/dock.test.ts apps/client/src/hud/programs.test.ts apps/client/src/hud/copy.test.ts apps/client/src/hud/plates.test.ts`
- **Status:** verified

- [x] **P1.T1: Inline care state** — covers: FR-1, AC-1
  - [x] **P1.T1.1:** Render cost + inline reason for each care button in every dry-run gating state.
  - [x] **P1.T1.2:** Regression tests pinning each state/reason rendering.
- [x] **P1.T2: Inline train state** — covers: FR-2, AC-2
  - [x] **P1.T2.1:** Train button state/cost/reason inline (including free re-point) + picker row lines.
  - [x] **P1.T2.2:** Regression tests across capped / 0-AP / assigned states.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-ranch-hierarchy/verification/phase-1.md
-->

## Phase 2: Chips, advance summary, grouping

- **Goal:** spar/cup/stable chips surface state + hint/reason inline, Advance Day carries an eve-of-advance summary, and dock grouping/emphasis clarifies hierarchy with order frozen.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, AC-3, AC-4
- **Touches:** `apps/client/src/spar/panel.ts`, `apps/client/src/cup/view-models.ts`, `apps/client/src/cup/entry.ts`, `apps/client/src/stable.ts`, `apps/client/src/app/hud-screen.ts`, `apps/client/src/hud/shell.ts`, `apps/client/src/ui/kit.css`, `apps/client/src/ranch.css`, `apps/client/src/spar.css`, `apps/client/src/cup.css`, related `*.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/cup/view-models.test.ts apps/client/src/spar/panel.test.ts apps/client/src/stable.test.ts apps/client/src/app/hud-screen.test.ts`
- **Status:** verified

- [x] **P2.T1: Inline chip state** — covers: FR-4, AC-4
  - [x] **P2.T1.1:** Spar/cup/stable chips render state + hint/reason inline (no partner, off-day, refusal paths).
  - [x] **P2.T1.2:** Regression tests for each chip gating state.
- [x] **P2.T2: Advance summary + grouping** — covers: FR-3, FR-5, AC-3
  - [x] **P2.T2.1:** Eve-of-advance summary (assigned training, AP reset, day effects) from HUD-available info.
  - [x] **P2.T2.2:** Grouping/emphasis pass, order frozen; short-landscape seats keep new text in-frame.

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

## Phase 3: Integrated gate + visual matrix

- **Goal:** full gate green and a committed browser matrix proving explicitness and layout at all viewports, including touch-viewport hover-independence.
- **Depends on:** Phase 2
- **Covers:** AC-5, AC-6, NFR-1, NFR-2, NFR-3
- **Touches:** `conductor/tracks/20261128-ranch-hierarchy/verification/*`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Gate + r-matrix evidence** — covers: AC-5, AC-6
  - [ ] **P3.T1.1:** Full gate green; stills at 393×852, 852×393, 1440×900 showing inline state/cost/reason with zero h-scroll and clean console.
  - [ ] **P3.T1.2:** Touch-viewport check that no state/cost/reason is hover-only.
