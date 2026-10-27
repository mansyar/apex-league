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
- **Status:** pending

- [ ] **P1.T1: Shared openModal/closeModal helper** — covers: FR-1
  - [ ] **P1.T1.1:** Helper owns display class, focus trap, scrim-click, Escape, return-focus (incl. unmounted-target fallback)
  - [ ] **P1.T1.2:** Unit tests for open/close/Escape/return-focus incl. fallback
- [ ] **P1.T2: Migrate all ~14 overlays to the helper** — covers: FR-1, AC-1
  - [ ] **P1.T2.1:** Migrate ranch surfaces (creature-detail, stable, gift, handbook, settings, recovery, save-transfer, graduation/nursery)
  - [ ] **P1.T2.2:** Migrate cup + board + cloud surfaces (entry, giveup, cup overlay, board panel, cloud panel)
- [ ] **P1.T3: Centralize --z-* tokens** — covers: FR-2, AC-2
  - [ ] **P1.T3.1:** Define tokens in kit.css, replace literals (incl. gallery.ts/preview.ts inline values)

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261027-ui-cleanliness-clarity-pass/verification/phase-1.md
-->

## Phase 2: Kit consolidation (CSS + visibility)

- **Goal:** Kit is the single source for surface styling; one touch floor, one focus rule, class-based visibility.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, FR-6, AC-3, AC-4, AC-5, AC-6
- **Touches:** `apps/client/src/ui/kit.css`, `apps/client/src/base.css`, `apps/client/src/ranch.css`, `apps/client/src/cup.css`, `apps/client/src/spar.css`, `apps/client/src/battle-hud.css`, `apps/client/src/board/board.css`, `apps/client/src/mock.css`
- **Verification:** `bun run verify && bun run build` + screenshot diff set (ranch/cup/spar/board before-after)
- **Status:** pending

- [ ] **P2.T1: Extract chamfer/keyline/elevation utilities to kit** — covers: FR-3, AC-3
  - [ ] **P2.T1.1:** Add utilities; ranch/cup/spar/battle-hud/board keep layout only (est. 300–500 lines deleted)
  - [ ] **P2.T1.2:** Collapse duplicate `settle-down-centered` into kit motion set (reduced-motion intact)
- [ ] **P2.T2: Unify touch-target floor** — covers: FR-4, AC-4
- [ ] **P2.T3: Generic focus-visible rule** — covers: FR-5, AC-5
- [ ] **P2.T4: .is-hidden/[hidden] convention + dead-chrome removal** — covers: FR-6, AC-6
  - [ ] **P2.T4.1:** Replace inline `style.display` writes with class toggles on migrated surfaces
  - [ ] **P2.T4.2:** Prefer not-rendering/`hidden` over CSS-hidden (rankTitles, graduate row, gift-chip); drop mock-only overrides

## Phase 3: Ranch HUD declutter

- **Goal:** Ranch reads at a glance: secondary chips grouped, lineage detail-on-click, score-bug/dock hierarchy clear.
- **Depends on:** Phase 2
- **Covers:** FR-7, FR-8, FR-9, AC-7, AC-8, AC-9
- **Touches:** `apps/client/src/hud/*`, `apps/client/src/ranch.css`
- **Verification:** `bun run verify && bun run build` + Playwright screenshots (desktop + 393px, overflow open/closed, lineage collapsed/expanded)
- **Status:** pending

- [ ] **P3.T1: Grouped collapsible overflow for secondary chips** — covers: FR-7, AC-7
- [ ] **P3.T2: Lineage collapsible with detail-on-click** — covers: FR-8, AC-8
- [ ] **P3.T3: Score-bug + dock hierarchy pass** — covers: FR-9, AC-9

## Phase 4: Responsive ranch layout without magic numbers

- **Goal:** Ranch stack holds at every width with flow/grid areas; gift-chip never overlaps; no hardcoded tops.
- **Depends on:** Phase 3
- **Covers:** FR-10, FR-11, AC-10
- **Touches:** `apps/client/src/ranch.css`, `apps/client/src/hud/shell.ts`
- **Verification:** `bun run verify && bun run build` + Playwright 393px both orientations × gift-chip shown/hidden × lineage expanded/collapsed
- **Status:** pending

- [ ] **P4.T1: Grid/flow areas for ranch stack** — covers: FR-10, AC-10
  - [ ] **P4.T1.1:** Replace absolute + `:has()` nudges and hardcoded tops (228px/176px and siblings)
- [ ] **P4.T2: Gift-chip + callout safety sweep** — covers: FR-11, AC-10

## Phase 5: Board/Ghosts/Cloud clarity + copy pass

- **Goal:** New backend surfaces are honest and self-explanatory with a bounded kit-only restyle; copy voice is consistent everywhere.
- **Depends on:** Phase 4
- **Covers:** FR-12, FR-13, FR-14, FR-15, FR-16, AC-11, AC-12, AC-13
- **Touches:** `apps/client/src/board/*`, `apps/client/src/cloud/*`, `apps/client/src/hud/copy-*.ts`, `apps/client/src/hud/plates-*.ts`, `apps/client/src/hud/dock.ts`, `apps/client/src/detail/*`
- **Verification:** `bun run verify && bun run build` + Playwright state matrix (empty/loading/offline/error × board/ghosts/cloud) + ghost preview→Fight parity check
- **Status:** pending

- [ ] **P5.T1: Board explicit states (empty/loading/offline-snapshot/error)** — covers: FR-12, AC-11
- [ ] **P5.T2: Ghost preview-to-Fight continuity** — covers: FR-13, AC-12
- [ ] **P5.T3: Cloud actionable errors + offline queue honesty** — covers: FR-14, AC-11
- [ ] **P5.T4: Full copy pass (teaser template, period/jargon, title-to-inline)** — covers: FR-15, FR-16, AC-13
  - [ ] **P5.T4.1:** Bounded kit-only restyle of board/cloud tables within existing palette

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
