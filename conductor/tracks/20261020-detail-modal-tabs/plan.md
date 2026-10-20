# Implementation Plan: Detail Modal Tabs

## Phase 1: Shared tab controller

- **Goal:** One keyboard-complete tab controller in the client, with the
  Coach's Handbook migrated onto it and its content unchanged.
- **Depends on:** none
- **Covers:** FR-6, FR-10, NFR-2, AC-7
- **Touches:** `apps/client/src/ui/tabs.ts` (new), `apps/client/src/ui/tabs.test.ts`
  (new), `apps/client/src/handbook.ts`, `apps/client/src/handbook.test.ts` (new)
- **Verification:** `bun test --timeout 120000`
- **Status:** verified

- [x] **P1.T1: Pure tab-index math** — covers: FR-6
  - [x] `nextTabIndex(current, key, count)` handling ArrowLeft/ArrowRight with
        wrap, Home, End, and an unchanged index for any other key
  - [x] Unit tests for wrap at both ends, Home/End, single-tab lists, and
        non-navigation keys

- [x] **P1.T2: The tab controller** — covers: FR-6, FR-7, NFR-2
  - [x] `createTabs({ ariaLabel, idPrefix, tabs })` builds the `tablist`, one
        `button[role=tab]` and one `[role=tabpanel]` per entry, with
        `aria-controls`/`aria-labelledby`, `hidden` on inactive panels, and a
        single roving `tabIndex`
  - [x] Selection via click and via keyboard, focus follows selection, and an
        `onSelect` hook lets callers repaint a page on entry
  - [x] Fake-DOM tests covering ids, `aria-selected`, `hidden`, roving tabindex,
        click, and each navigation key

- [x] **P1.T3: Migrate the handbook** — covers: FR-10, AC-7
  - [x] Replace the inline tablist code in `handbook.ts` with `createTabs`,
        keeping `handbook-tabs`/`handbook-tab`/`handbook-panel` classes and the
        `handbook-tab-<n>` ids
  - [x] Add `handbook.test.ts` (fake DOM): four tabs, first selected, exactly
        one visible panel, arrow keys switch pages — the handbook had no test
        before this migration
  - [x] Handbook page content and order unchanged

**Result:** verified
**Checkpoint:** 28c68f0
**Evidence:** conductor/tracks/20261020-detail-modal-tabs/verification/phase-1.md

## Phase 2: Tabbed detail modal

- **Goal:** The partner-details modal presents Stats, Growth and Moves as
  pinned-shell pages, defaulting to Stats on every open, with the Growth page
  keeping its live repaint behaviour.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-8, FR-9, NFR-1, NFR-3, NFR-5,
  NFR-6, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-8
- **Touches:** `apps/client/src/creature-detail.ts`,
  `apps/client/src/creature-detail.test.ts`, `apps/client/src/ui/kit.css`,
  `apps/client/src/size-probe.test.ts`; `apps/client/src/detail-pages.ts` and
  `apps/client/src/detail-pages.test.ts` only if `creature-detail.ts` would go
  over the cap
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **P2.T1: Restructure the modal into a shell and three pages** — covers: FR-1, FR-3, FR-4, FR-5, FR-9
  - [x] Header row keeps crest, name and stage chip; the tab strip sits under it
  - [x] Stats page hosts the stat list and the context rows; Growth page hosts
        the existing growth slot; Moves page hosts the kit
  - [x] `open` repaints all three pages from the passed state and selects Stats

- [x] **P2.T2: Keep Growth live across tabs** — covers: FR-8, AC-5
  - [x] Remember the last state painted so entering Growth repaints from it
  - [x] `sync` keeps the Growth page current whether or not it is the active
        page, without disturbing the active page's scroll position

- [x] **P2.T3: Style the shell** — covers: FR-9, NFR-2, NFR-3, NFR-5, NFR-6, AC-8
  - [x] `.creature-detail-box` adopts the pinned-shell grid and the handbook's
        max-height rule; only `.detail-panel` scrolls
  - [x] Selected tab carries weight plus a solid underline, not colour alone;
        no gradients, no transitions; strip stays one row at 390 px

- [x] **P2.T4: Prove the modal** — covers: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
  - [x] Fake-DOM tests: opens on Stats with one `aria-selected`, arrows/Home/End
        change page and focus, inactive panels hidden, Growth copy switches with
        discovery, returning to Growth shows current rows, Moves lists the kit,
        reopening after closing from Moves lands on Stats

- [x] **P2.T5: Keep the size guard honest** — covers: NFR-1, AC-9
  - [x] Update `size-probe.test.ts` pins if file boundaries move; every touched
        module stays at or under 12,288 B
  - [x] `bun run verify && bun run build` green

**Result:** verified
**Checkpoint:** c0f3491
**Evidence:** conductor/tracks/20261020-detail-modal-tabs/verification/phase-2.md
## Phase R1: Review Fixes

- **Goal:** Resolve review findings F1-F6 (F3 resolved as a documentation correction: `sync`'s write is load-bearing).
- **Depends on:** Phase 2
- **Covers:** F1, F2, F3, F4, F5, F6
- **Touches:** `apps/client/src/size-probe.test.ts`, `apps/client/src/ui/tabs.ts`, `apps/client/src/ui/tabs.test.ts`, `apps/client/src/creature-detail.ts`, `apps/client/src/ui/kit.css`, `apps/client/src/ranch.css`, `conductor/tracks/20261020-detail-modal-tabs/plan.md`, `conductor/tracks/20261020-detail-modal-tabs/verification/phase-2.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** in_progress

- [ ] **R1.T1: Pin the shared tab controller** - covers: F1, NFR-1
  - [ ] Add `ui/tabs.ts` to the size probe's module list
- [ ] **R1.T2: Give the panels a keyboard scroll path** - covers: F6, NFR-2
  - [ ] `tabindex="0"` on every panel, asserted in the wiring test
- [ ] **R1.T3: Tell the truth about `sync` and the shell** - covers: F3, F4, F5, F2
  - [ ] Reword the `sync` contract: the write is what keeps a later Growth entry fresh
  - [ ] Move the detail shell rules out of `kit.css` into `ranch.css` beside the other `.detail-*` rules
  - [ ] Correct the Phase 2 evidence head commit and the Phase 2 status line
