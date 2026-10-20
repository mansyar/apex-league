# Phase 1 — Shared tab controller

- **Track:** `20261020-detail-modal-tabs`
- **Phase:** 1 of 2 (Shared tab controller)
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-detail-modal-tabs`
- **Phase start commit:** `8fb0093`
- **Head commit:** `3947722`
- **Covers:** FR-6, FR-10, NFR-2, AC-7
- **Result:** code verified — the phase's own verification command is green; the aggregate
  `bun run verify` stops on one pre-existing formatting error in conductor state that this
  phase is forbidden to edit (see Notes).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (phase verification) | `bun test --timeout 120000` | 0 | 1782 tests across 143 files: 1781 pass, 1 skip, 0 fail, 84,556 `expect()` calls (69.5 s) |
| static — types | `bun run check` | 0 | `@apex/voxel` 62, `@apex/sim` 79, `@apex/client` 237 files; no type errors |
| unit + types (CI leg) | `bun test --check --parallel --timeout 120000` | 0 | same 1782 tests, 0 fail (17.5 s) |
| lint/format | `biome check` (inside `verify`) | 1 | touched files clean; the only error is `conductor/tracks/20261020-detail-modal-tabs/metadata.json` (missing final newline — file unmodified by this phase). 7 pre-existing `noNonNullAssertion` warnings in unrelated tests |
| determinism | `bun run gate:determinism` | 0 | nine creature GLBs byte-identical; 5-prop digest manifest matches |
| aggregate | `bun run verify` | 1 | typecheck + typed parallel tests green; aborts at `biome check` on the metadata file above (determinism re-run standalone, exit 0) |

## Files changed

| File | Change |
| --- | --- |
| `apps/client/src/ui/tabs.ts` | new — `nextTabIndex` + `createTabs` (roving tabindex, `aria-selected`, `hidden`, arrows/Home/End, click, focus-follows-selection, `onSelect`) |
| `apps/client/src/ui/tabs.test.ts` | new — 15 fake-DOM tests for the pure movement rules and the controller |
| `apps/client/src/handbook.ts` | migrated off the inline tablist onto `createTabs`; `handbook-tabs` / `kit-tab handbook-tab` / `handbook-panel` kept, `TABS` copy and order untouched, 12 insertions / 56 deletions |
| `apps/client/src/handbook.test.ts` | new — 4 fake-DOM tests pinning the handbook pages, order, skin and arrow-key switching |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-7 | The handbook's tabs still switch pages after the migration, and its panels keep their content | `handbook.test.ts`: "keep four pages in order with the handbook skin", "open on the type chart, with one page visible" (type chart still rendered), "ArrowRight opens the second page and hides the first" (5 ladder rows), "ArrowLeft wraps to the last page and Home returns to the first" | pass |
| FR-6 | Click/tap and keyboard operate the tabs: arrows move and wrap, Home/End jump, focus follows selection | `tabs.test.ts`: "arrows wrap, Home/End jump, and focus follows selection", "a click selects the tab and calls onSelect with its index", "every other key is left to the modal's focus trap"; handbook: the two arrow-key tests | pass |
| FR-10 | The handbook uses the same shared controller with its behaviour and content preserved | `handbook.ts` builds via `createTabs({ ariaLabel: "Handbook sections", idPrefix: "handbook", tabs: TABS })`; `handbook.test.ts` is the regression net (the handbook had none before) | pass |
| NFR-2 | The selected tab is not carried by colour alone; `aria-selected` is authoritative | `tabs.test.ts`: "starts on the first tab with one selected and one visible panel", "is-outline tracks the inactive tabs"; `handbook.test.ts` asserts exactly one `aria-selected="true"` and the roving tabindex | pass |
| (phase) | Movement math is pure and total | `nextTabIndex` tests: wrap both ends, Home/End, single tab, non-navigation keys, empty list, out-of-range current | pass |

## Deviations

None from `Touches`. `handbook.ts` shrank from 366 to 322 lines; nothing outside the
four listed paths was edited.

## Notes

1. **Aggregate `verify` is red for a conductor-state formatting error, not for phase code.**
   `biome check` reports `conductor/tracks/20261020-detail-modal-tabs/metadata.json` would
   gain a trailing newline. `git status` shows the file unmodified by this phase, so the
   error pre-exists at the phase start commit. It is Conductor state the phase agent must
   not edit; the fix is the primary's (`biome check --write`, or append a newline).
   Every other leg (`check`, typed tests, determinism) passes, and every file this phase
   touched passes `biome check`.
2. **Brief label mismatch (no action taken).** The brief's P1.T3 parenthetical lists the
   handbook labels as "Move pool" / "Raising guidance"; the shipped handbook says
   "Moves" / "Raising". The brief also forbids changing copy, and `plan.md` requires the
   content and order unchanged, so the shipped labels were kept and pinned by
   `handbook.test.ts`.
3. `bun run build` is not part of Phase 1's verification (Phase 2 carries it); it was not
   run.
4. No visual layer: this phase changes no CSS, no copy and no pixel geometry — the tab
   markup and classes are identical to what shipped.
