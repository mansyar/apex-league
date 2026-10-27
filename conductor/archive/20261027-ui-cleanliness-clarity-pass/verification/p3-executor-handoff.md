# Phase 3 executor handoff (shell-denied environment)

All P3.T1–T3 code changes are complete in the working tree. Verification
(`bun run verify && bun run build`), Playwright screenshots, and commits
were impossible here — `shell` returns "permission denied" — so the
primary must run them.

## What changed (all inside Touches: `apps/client/src/hud/*`, `ranch.css`)

- `hud/overflow.ts` (NEW, tiny): `buildOverflow()` — More toggle
  (`aria-expanded` + `aria-controls="hud-overflow-panel"`) + `plate()`
  panel starting `is-hidden`. Kit-styled, no new tokens.
- `hud/plates-lineage.ts` (rewrite): root is now a `section.hud-lineage`
  with `summary` button (`aria-expanded` + `aria-controls`), `familyEl`,
  `detail` (`metaEl` + Hall of Fame `chip()`), `hallButton`.
- `hud/types.ts`: `HudViewState` gains `overflowOpen`, `lineageOpen`.
- `hud/shell.ts`: overflow assembly (Handbook/Gift/Stable/extras move into
  the panel; Settings stays primary), toggle wiring (open moves focus to
  first chip; Escape shuts + returns focus), lineage wiring (summary
  toggles; Escape in detail collapses + refocuses; Hall button opens HoF).
  Defaults: shut on phones (`matchMedia 767.98px`, house tier), open on
  desktop — same viewport-derived pattern as the creature plate.
- `hud/update.ts`: paints `familyEl`/`metaEl` as before; syncs summary
  `aria-expanded` + detail `is-hidden` from `view.lineageOpen` so a
  re-render never pops shut detail.
- `ranch.css`:
  - `.hud-overflow` floats below the toggle (no reflow); `.is-hidden` fold.
  - Lineage column layout + `.lineage-summary` reset/hover/chevron rotation
    + `.lineage-detail` row + `is-hidden` fold.
  - P3.T3: `.score-trophy, .score-ladder { opacity: 0.72 }` (day/AP lead;
    phone tier already drops those segments). Dock untouched — gold CTA vs
    dim head already carries the hierarchy; presentation-only, no copy.
  - Removed stale gift `:has()` step-downs (cluster no longer grows; gift
    folds in the panel). Added phone-tier step-down for *expanded* lineage
    (`:has(.lineage-summary[aria-expanded="true"])`), mirroring the old
    260/258 geometry.

## Deliberate non-moves (justify in review)

- Spar/cup chips stay top-right, untouched (primary battle actions in
  their own column; grouping them would bury the most-tapped actions and
  break the phone top-right seat math). AC-7's list is the overflow set.
- No unit tests: no pure logic was extracted (state lives on the HUD view
  next to the other collapse states; builders are DOM factories like the
  rest of hud/). Screenshot-gated per brief.
- No kit changes (kit is outside Touches) — composed from `chip`/`plate`.

## Watch items for verification

- Module-size cap (12,288 B): `shell.ts` grew ~60 lines; `overflow.ts`
  keeps the builder out of it, but `bun run verify` must confirm.
- `syncGiftChip`/`syncStableChip` toggle `is-hidden` on chips now inside
  the panel — behavior preserved, confirm in overflow-open shot.
- Arena CSS (`.app-in-arena .handbook-chip/.hud-lineage`) still applies
  (descendant selectors, unaffected by the move).
- Screenshots needed: desktop + 393px × overflow open/closed × lineage
  collapsed/expanded, saved as `p3-after-*.png` + `p3-after-report.json`.
