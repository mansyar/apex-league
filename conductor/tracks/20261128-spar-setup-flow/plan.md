# Streamline Spar Setup — Implementation Plan

> **Branch:** `refactor/20261128-spar-setup-flow`
> **Base:** `main` @ `000d64d3c0cca05ab362e4eafa9af987bce324ba`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Arm-then-start selection logic

- **Goal:** Tactic taps arm a selection (Press pre-armed) and never launch the battle; ghost setup shares the behavior.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-5, AC-1, AC-2, AC-5
- **Touches:** `apps/client/src/spar/panel.ts`, `apps/client/src/spar.ts`, `apps/client/src/spar/setup.ts`, `apps/client/src/spar/*.test.ts`
- **Verification:** `bun test --check apps/client/src/spar/panel.test.ts apps/client/src/spar/ghost.test.ts apps/client/src/spar/casting.test.ts` (0 fail) + `biome check` on touched files
- **Status:** in_progress

- [ ] **P1.T1: Decouple tactic pick from battle launch** — covers: FR-1
  - [ ] **P1.T1.1: Add armed-tactic state with Press default; taps update highlight only**
  - [ ] **P1.T1.2: Regression tests — tactic/rule/kit taps never call runBattle or enter arena**
- [ ] **P1.T2: Route ghost setup through the same arm state** — covers: FR-5
  - [ ] **P1.T2.1: Ghost contender arm-then-start parity test**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-spar-setup-flow/verification/phase-1.md
-->

## Phase 2: Sticky Start footer + scroll stability

- **Goal:** Start footer pinned with armed tactic + rule summary; panel scrolls internally, page locked, footer in-frame at 393px both orientations.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, AC-3, AC-4
- **Touches:** `apps/client/src/spar/panel.ts`, `apps/client/src/spar.css`, `apps/client/src/spar/panel.test.ts`
- **Verification:** `bun test --check apps/client/src/spar/panel.test.ts` + `playwright-cli` visual (393×852, 852×393, 1440×900, console clean) + `biome check` on touched files
- **Status:** pending

- [ ] **P2.T1: Build sticky Start footer** — covers: FR-3
  - [ ] **P2.T1.1: Footer shows armed tactic + active rule; Start launches existing runBattle path**
  - [ ] **P2.T1.2: Focus-trap/Escape/scrim/returnFocus include the Start control (modal tests)**
- [ ] **P2.T2: Lock page scroll, stabilize panel scroll** — covers: FR-4
  - [ ] **P2.T2.1: Footer in-frame on open at 393×852, 852×393, short-landscape; no page-level scroll**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-spar-setup-flow/verification/phase-2.md
-->

## Phase 3: Integrated gate + browser proof

- **Goal:** Full gate green with visual evidence committed for both spar and ghost setups.
- **Depends on:** Phase 2
- **Covers:** AC-6, NFR-1..4
- **Touches:** `conductor/tracks/20261128-spar-setup-flow/verification/*`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Full gate + evidence** — covers: AC-6
  - [ ] **P3.T1.1: `bun run verify && bun run build` green; r-matrix stills (spar + ghost, 3 viewports) committed under verification/**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-spar-setup-flow/verification/phase-3.md
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
