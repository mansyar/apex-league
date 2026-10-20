# Specification: Detail Modal Tabs

## Overview

Split the partner-details modal into three tabs — Stats, Growth, Moves — so a
coach can read the part they came for without scrolling past the rest. The tab
behaviour is extracted from the Coach's Handbook into one shared controller and
both modals use it.

## Problem / Motivation

The detail modal is one long column: four stat rows with their breakdown chips,
six context rows, the evolution gate, the whole kit, then the close button. On
a laptop the kit is already below the fold, and on a phone the modal is roughly
two screens long. The information is fine; the delivery is a scroll. The
Handbook solved exactly this problem with a tabbed shell that pins the title,
tab strip and footer while the active page scrolls, and its tabs never drift
out of sync because the pattern lives in one place.

## Goals & Success Metrics

- No page requires scrolling to reach its primary content at 1024×768 or
  larger, and each page's first row is visible without scrolling at 390×844.
- All information currently in the modal stays available, one tab away.
- Exactly one tab implementation exists in the client, exercised by both the
  handbook and the detail modal.
- Zero save/schema change and no new dependency.

## Scope

**In scope**

- Tab strip and pinned modal shell for the partner-details modal.
- Three pages: Stats (stat rows + context rows), Growth (existing gate
  section), Moves (existing kit list).
- Shared tab controller extracted from `apps/client/src/handbook.ts` into a
  reusable module, with the handbook migrated onto it.
- Tab semantics: `tablist`/`tab`/`tabpanel`, roving tabindex, ArrowLeft,
  ArrowRight, Home, End, activation on focus, click/tap.
- Tests for the shared controller and for the detail modal's page wiring.

**Out of scope**

- Remembering the active tab between opens or sessions (always Stats).
- Auto-switching tabs when an evolution lands.
- An indicator/badge on the Growth tab when a gate is ready.
- Any change to the evolution discovery logic, copy, or save shape.
- Animating panel transitions.
- Changes to the handbook's content or page order.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The detail modal renders a `tablist` with exactly three tabs: Stats, Growth, Moves | must |
| FR-2 | Stats is the active tab on every open, including after closing from another tab | must |
| FR-3 | The Stats page contains the four stat rows (HP, ATK, DEF, SPD) with their rolled/trained/evolved/floor chips, followed by the six context rows (Stage, Lineage, Traits, Cups won, Bond, Mood) | must |
| FR-4 | The Growth page contains the current evolution gate section with unchanged content: qualitative copy before discovery, `current / target` after, and the final-stage note for champions | must |
| FR-5 | The Moves page contains the kit list with unchanged rows and "in kit / N days, or evolve" state | must |
| FR-6 | Tabs are operable by click/tap and keyboard: ArrowLeft/ArrowRight move and wrap, Home/End jump to the ends, and selecting a tab moves focus to it | must |
| FR-7 | Inactive panels are hidden, not merely scrolled past; the active panel is the only scroll surface | must |
| FR-8 | Switching to Growth paints it from the latest committed state, and `hud.update` while Growth is open still repaints it live | must |
| FR-9 | The header (crest, name, stage chip), tab strip, and close action stay pinned; the active page scrolls inside the modal | must |
| FR-10 | The handbook uses the same shared controller, with its existing behaviour and content preserved | must |
| FR-11 | No save/schema change and no new runtime dependency | must |

## Non-Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-1 | Every touched or new client module stays at or under 12,288 B, pinned by `size-probe.test.ts` | must |
| NFR-2 | The selected tab is not communicated by colour alone: a filled plate, heavier weight and a bottom bar accompany the tint, and `aria-selected` is authoritative | must |
| NFR-3 | No transition or animation is added; behaviour under reduced motion is unchanged | must |
| NFR-4 | Tests run under `bun:test` only, with the existing fake-DOM approach; no jsdom, happy-dom, or new test dependency | must |
| NFR-5 | Visual language matches the house kit: `kit-tab` typography, chamfered plates, no gradients on panels | must |
| NFR-6 | The tab strip stays on one row at the narrowest supported width | should |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Opening the modal selects Stats and exactly one tab has `aria-selected="true"` | FR-1, FR-2 |
| AC-2 | ArrowLeft/ArrowRight cycle with wrap, Home/End jump to first/last, and focus follows selection | FR-6 |
| AC-3 | Only the active panel is visible; the other two carry `hidden` | FR-7 |
| AC-4 | The Growth page shows digit-free copy for an undiscovered gate and `current / target` once the gate is known | FR-4 |
| AC-5 | A state change while Growth is active repaints it, and leaving and returning to Growth never shows stale rows | FR-8 |
| AC-6 | The Moves page lists the creature's kit rows | FR-5 |
| AC-7 | The handbook's tabs still switch pages after the migration, and its panels keep their content | FR-10 |
| AC-8 | At 390×844 and at desktop, the strip is one row, the shell does not exceed the viewport, and no page scrolls horizontally | FR-9, NFR-6 |
| AC-9 | The size probe and full suite, typecheck, biome, determinism gate, and build all pass | NFR-1, NFR-4 |

## Edge Cases

- Creature is null when `open` is called: the modal does not open (unchanged).
- Champion creature: Growth shows the final-stage note and zero rows.
- Modal closed while on Moves, then reopened: Stats again.
- Escape, backdrop click, and the footer button close from any tab and restore
  focus to the opener.
- Keyboard events on a panel must not move tab selection.
- Shift+Arrow is treated as the plain arrow key; no range selection exists.
- The last kit move row missing or the kit shorter than six rows: the Moves page
  renders what exists.

## Dependencies

- **Tracks:** none active. Builds on `20261020-evolution-discovery-ui` (the
  Growth section) and `coach_knowledge_20261016` (the handbook tab shell).
- **External:** none.

## Open Questions & Assumptions

- Assumes the shared controller can be extracted without changing handbook
  copy or order; verified by the existing handbook tests plus new controller
  tests.
- Assumes the detail modal can adopt the handbook's 4-row shell grid
  (`auto auto minmax(0, 1fr) auto`) with the stage chip in the header row.
- Assumes no tab badge is wanted yet; the HUD's existing growth hint already
  announces a ready evolution.

## References

- `apps/client/src/handbook.ts` — existing tablist implementation.
- `apps/client/src/creature-detail.ts` — current modal.
- `apps/client/src/growth-panel.ts` — growth repaint seam.
- `conductor/archive/coach_knowledge_20261016/` — handbook origin.
- `conductor/archive/20261020-evolution-discovery-ui/` — Growth section origin.
