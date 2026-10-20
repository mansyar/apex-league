# Implementation Plan: Detail Modal Tabs

## Phase 1: Shared tab controller

- **Goal:** One keyboard-complete tab controller in the client, with the
  Coach's Handbook migrated onto it and its content unchanged.
- **Depends on:** none
- **Covers:** FR-6, FR-10, NFR-2, AC-7
- **Touches:** `apps/client/src/ui/tabs.ts` (new), `apps/client/src/ui/tabs.test.ts`
  (new), `apps/client/src/handbook.ts`
- **Verification:** `bun test --timeout 120000`
- **Status:** pending

- [ ] **P1.T1: Pure tab-index math** — covers: FR-6
  - [ ] `nextTabIndex(current, key, count)` handling ArrowLeft/ArrowRight with
        wrap, Home, End, and an unchanged index for any other key
  - [ ] Unit tests for wrap at both ends, Home/End, single-tab lists, and
        non-navigation keys

- [ ] **P1.T2: The tab controller** — covers: FR-6, FR-7, NFR-2
  - [ ] `createTabs({ ariaLabel, idPrefix, tabs })` builds the `tablist`, one
        `button[role=tab]` and one `[role=tabpanel]` per entry, with
        `aria-controls`/`aria-labelledby`, `hidden` on inactive panels, and a
        single roving `tabIndex`
  - [ ] Selection via click and via keyboard, focus follows selection, and an
        `onSelect` hook lets callers repaint a page on entry
  - [ ] Fake-DOM tests covering ids, `aria-selected`, `hidden`, roving tabindex,
        click, and each navigation key

- [ ] **P1.T3: Migrate the handbook** — covers: FR-10, AC-7
  - [ ] Replace the inline tablist code in `handbook.ts` with `createTabs`,
        keeping `handbook-tabs`/`handbook-tab`/`handbook-panel` classes and the
        `handbook-tab-<n>` ids
  - [ ] Handbook page content and order unchanged; its existing tests stay green

## Phase 2: Tabbed detail modal

- **Goal:** The partner-details modal presents Stats, Growth and Moves as
  pinned-shell pages, defaulting to Stats on every open, with the Growth page
  keeping its live repaint behaviour.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-8, FR-9, NFR-1, NFR-3, NFR-5,
  NFR-6, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-8
- **Touches:** `apps/client/src/creature-detail.ts`,
  `apps/client/src/creature-detail.test.ts`, `apps/client/src/ui/kit.css`,
  `apps/client/src/size-probe.test.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P2.T1: Restructure the modal into a shell and three pages** — covers: FR-1, FR-3, FR-4, FR-5, FR-9
  - [ ] Header row keeps crest, name and stage chip; the tab strip sits under it
  - [ ] Stats page hosts the stat list and the context rows; Growth page hosts
        the existing growth slot; Moves page hosts the kit
  - [ ] `open` repaints all three pages from the passed state and selects Stats

- [ ] **P2.T2: Keep Growth live across tabs** — covers: FR-8, AC-5
  - [ ] Remember the last state painted so entering Growth repaints from it
  - [ ] `sync` keeps the Growth page current whether or not it is the active
        page, without disturbing the active page's scroll position

- [ ] **P2.T3: Style the shell** — covers: FR-9, NFR-2, NFR-3, NFR-5, NFR-6, AC-8
  - [ ] `.creature-detail-box` adopts the pinned-shell grid and the handbook's
        max-height rule; only `.detail-panel` scrolls
  - [ ] Selected tab carries weight plus a solid underline, not colour alone;
        no gradients, no transitions; strip stays one row at 390 px

- [ ] **P2.T4: Prove the modal** — covers: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
  - [ ] Fake-DOM tests: opens on Stats with one `aria-selected`, arrows/Home/End
        change page and focus, inactive panels hidden, Growth copy switches with
        discovery, returning to Growth shows current rows, Moves lists the kit,
        reopening after closing from Moves lands on Stats

- [ ] **P2.T5: Keep the size guard honest** — covers: NFR-1, AC-9
  - [ ] Update `size-probe.test.ts` pins if file boundaries move; every touched
        module stays at or under 12,288 B
  - [ ] `bun run verify && bun run build` green
