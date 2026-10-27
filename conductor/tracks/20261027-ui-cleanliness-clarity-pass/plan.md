# UI Cleanliness & Clarity Pass — Implementation Plan

> **Branch:** `refactor/20261027-ui-cleanliness-clarity-pass`
> **Base:** `main` @ `6ba33421e29e35bd1d5fe7f3fde5d5042dfa43bc`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Modal system + z-index tokens

- **Goal:** All ~14 overlays open/close through one helper with consistent scrim/Escape/return-focus, and z-index is token-driven.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1, AC-2
- **Touches:** `apps/client/src/ui/modal.ts`, `apps/client/src/ui/focus.ts`, `apps/client/src/ui/kit.css`, `apps/client/src/**/(*modal*|*panel*|*dialog*|gift.ts|stable.ts|handbook.ts|gallery.ts)`
- **Verification:** `bun run verify && bun run build` + Playwright open/close screenshots per overlay class
- **Status:** verified

- [x] **P1.T1: Shared openModal/closeModal helper** — covers: FR-1
  - [x] **P1.T1.1:** Helper owns display class, focus trap, scrim-click, Escape, return-focus (incl. unmounted-target fallback)
  - [x] **P1.T1.2:** Unit tests for open/close/Escape/return-focus incl. fallback
- [x] **P1.T2: Migrate all ~14 overlays to the helper** — covers: FR-1, AC-1
  - [x] **P1.T2.1:** Migrate ranch surfaces (creature-detail, stable, gift, handbook, settings, recovery, save-transfer, graduation/nursery)
  - [x] **P1.T2.2:** Migrate cup + board + cloud surfaces (entry, giveup, cup overlay, board panel, cloud panel)
- [x] **P1.T3: Centralize --z-* tokens** — covers: FR-2, AC-2
  - [x] **P1.T3.1:** Define tokens in kit.css, replace literals (incl. gallery.ts/preview.ts inline values)

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261027-ui-cleanliness-clarity-pass/verification/phase-1.md
-->

**Result:** verified (primary, 2026-10-27) — gates green + Playwright 6 classes × 2 viewports, 0 console/page errors
**Checkpoint:** phase-1 commits (refactor ×4 + fix ×1, below) + state commit
**Evidence:** conductor/tracks/20261027-ui-cleanliness-clarity-pass/verification/phase-1.md

## Phase 2: Kit consolidation (CSS + visibility)

- **Goal:** Kit is the single source for surface styling; one touch floor, one focus rule, class-based visibility.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, FR-6, AC-3, AC-4, AC-5, AC-6
- **Touches:** `apps/client/src/ui/kit.css`, `apps/client/src/base.css`, `apps/client/src/ranch.css`, `apps/client/src/cup.css`, `apps/client/src/spar.css`, `apps/client/src/battle-hud.css`, `apps/client/src/board/board.css`, `apps/client/src/mock.css`
- **Verification:** `bun run verify && bun run build` + screenshot diff set (ranch/cup/spar/board before-after)
- **Status:** verified (commits `6980699b` P2.T1, `c2e40ccf` P2.T2+T3, `94cc830b` P2.T4; gate + visual diff in `verification/phase-2.md`)

- [x] **P2.T1: Extract chamfer/keyline/elevation utilities to kit** — covers: FR-3, AC-3
  - [x] **P2.T1.1:** Add utilities; ranch/cup/spar/battle-hud/board keep layout only (~80 declarations deduped; 300–500-line whole-rule consolidation unreachable without computed changes — recorded in evidence)
  - [x] **P2.T1.2:** Collapse duplicate `settle-down-centered` into kit motion set (reduced-motion intact)
- [x] **P2.T2: Unify touch-target floor** — covers: FR-4, AC-4
- [x] **P2.T3: Generic focus-visible rule** — covers: FR-5, AC-5
- [x] **P2.T4: .is-hidden/[hidden] convention + dead-chrome removal** — covers: FR-6, AC-6
  - [x] **P2.T4.1:** Replace inline `style.display` writes with class toggles on migrated surfaces
  - [x] **P2.T4.2:** Prefer not-rendering/`hidden` over CSS-hidden (rankTitles, graduate row, gift-chip); drop mock-only overrides (load-bearing resp-phone divider/trophy + train-picker rules kept — rationale in evidence)

## Phase 3: Ranch HUD declutter

- **Goal:** Ranch reads at a glance: secondary chips grouped, lineage detail-on-click, score-bug/dock hierarchy clear.
- **Depends on:** Phase 2
- **Covers:** FR-7, FR-8, FR-9, AC-7, AC-8, AC-9
- **Touches:** `apps/client/src/hud/*`, `apps/client/src/ranch.css`
- **Verification:** `bun run verify && bun run build` + Playwright screenshots (desktop + 393px, overflow open/closed, lineage collapsed/expanded)
- **Status:** verified (commits `6136edbe` P3.T1, `f78f39db` P3.T2, `eabfe5a6` P3.T3; gate + 8-shot visual in `verification/phase-3.md`)

- [x] **P3.T1: Grouped collapsible overflow for secondary chips** — covers: FR-7, AC-7
- [x] **P3.T2: Lineage collapsible with detail-on-click** — covers: FR-8, AC-8
- [x] **P3.T3: Score-bug + dock hierarchy pass** — covers: FR-9, AC-9

## Phase 4: Responsive ranch layout without magic numbers

- **Goal:** Ranch stack holds at every width with flow/grid areas; gift-chip never overlaps; no hardcoded tops.
- **Depends on:** Phase 3
- **Covers:** FR-10, FR-11, AC-10
- **Touches:** `apps/client/src/ranch.css`, `apps/client/src/hud/shell.ts`
- **Verification:** `bun run verify && bun run build` + Playwright 393px both orientations × gift-chip shown/hidden × lineage expanded/collapsed
- **Status:** verified (code `8965e7d3`; evidence `verification/phase-4.md`
  + 9 shots + `p4-matrix-report.json`; gate green, matrix 0 console/page
  errors, portrait + landscape + desktop verdicts in evidence doc)

- [x] **P4.T1: Grid/flow areas for ranch stack** — covers: FR-10, AC-10
  - [x] **P4.T1.1:** Replace absolute + `:has()` nudges and hardcoded tops (228px/176px and siblings)
- [x] **P4.T2: Gift-chip + callout safety sweep** — covers: FR-11, AC-10

**Result:** Ranch chrome holds at 393px portrait/landscape with gift
shown/hidden and lineage open/shut; desktop byte-identical to Phase 3.
AC-10 passes (see evidence doc for the residual-seat audit).
**Checkpoint:** `8965e7d3`
**Evidence:** `verification/phase-4.md`, `verification/p4-*.png`,
`verification/p4-matrix-report.json`

## Phase 5: Board/Ghosts/Cloud clarity + copy pass

- **Goal:** New backend surfaces are honest and self-explanatory with a bounded kit-only restyle; copy voice is consistent everywhere.
- **Depends on:** Phase 4
- **Covers:** FR-12, FR-13, FR-14, FR-15, FR-16, AC-11, AC-12, AC-13
- **Touches:** `apps/client/src/board/*`, `apps/client/src/cloud/*`, `apps/client/src/hud/copy-*.ts`, `apps/client/src/hud/plates-*.ts`, `apps/client/src/hud/dock.ts`, `apps/client/src/detail/*`
- **Verification:** `bun run verify && bun run build` + Playwright state matrix (empty/loading/offline/error × board/ghosts/cloud) + ghost preview→Fight parity check
- **Status:** verified (commits `34f1ed63` P5.T1, `042f3753` P5.T2, `86c66a7c` P5.T3, `3c2b7b1c` P5.T4+T4.1, `da696dd9` dock-aria fix; gate + 12-shot matrix in `verification/phase-5.md`)

- [x] **P5.T1: Board explicit states (empty/loading/offline-snapshot/error)** — covers: FR-12, AC-11
- [x] **P5.T2: Ghost preview-to-Fight continuity** — covers: FR-13, AC-12
- [x] **P5.T3: Cloud actionable errors + offline queue honesty** — covers: FR-14, AC-11
- [x] **P5.T4: Full copy pass (teaser template, period/jargon, title-to-inline)** — covers: FR-15, FR-16, AC-13
  - [x] **P5.T4.1:** Bounded kit-only restyle of board/cloud tables within existing palette

- **Result:** every Board/Cloud state says what it is and what to do next; ghost previews fight with the shown kit; copy facts live inline
- **Checkpoint:** `da696dd9`
- **Evidence:** `verification/phase-5.md`, `verification/p5-*.png`, `verification/p5-matrix-report.json`

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 5
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->

## Phase R1: Review Fixes

- **Goal:** Resolve review finding F1 (trophy accessible name).
- **Depends on:** Phase 5
- **Covers:** F1
- **Touches:** `apps/client/src/hud/plates-score.ts`, `apps/client/src/hud/plates.test.ts`
- **Verification:** `bun run verify && bun run build` + focused plates test
- **Status:** pending

- [ ] **R1.T1: Resolve F1 (trophy role="img" + test)** — covers: F1
