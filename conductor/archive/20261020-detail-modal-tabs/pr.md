# feat(ranch): page the partner details modal into Stats, Growth and Moves

## Summary

The partner-details modal was one long column — four stat blocks, six context
rows, the growth gate and six kit rows all stacked, so the kit sat below the
fold and the gate competed with the numbers for attention. It is now three pages
behind a tab strip: **Stats**, **Growth**, **Moves**, with Stats always first.

## What changed

- **`apps/client/src/ui/tabs.ts`** — one shared tab controller: `role=tablist` /
  `tab` / `tabpanel`, ids `<prefix>-tab-<i>` / `<prefix>-panel-<i>`,
  `aria-controls` / `aria-labelledby`, roving tabindex, ArrowLeft/Right with
  wrap, Home/End, `tabindex="0"` on panels so a scrolling page stays reachable
  by keyboard, and key handling scoped to the strip so Escape and the focus trap
  are untouched.
- **`apps/client/src/handbook.ts`** — the Coach's Handbook was migrated onto the
  same controller; its bespoke tab block is gone, labels/order/content unchanged,
  and it gains `aria-controls` and Home/End.
- **`apps/client/src/creature-detail.ts`** — pinned shell (header, strip and the
  close action stay put; only the active page scrolls, same four-row grid and
  `min(86dvh, 720px)` cap as the handbook). `open` lands on Stats every time,
  `sync` keeps Growth current without touching the visible page, and re-entering
  Growth repaints from the remembered state.
- **`apps/client/src/ranch.css`** — the detail shell rules now live beside the
  rest of the `.detail-*` surface instead of in the shared kit.
- Selection is never colour-only: filled plate, heavier weight and an inset bar.

## Verification

- `bun run verify` exit 0 — 1787 pass / 1 skip / 0 fail across 143 files, biome
  398 files 0 errors (7 pre-existing warnings), determinism gate byte-identical.
- `bun run build` exit 0.
- New tests: 15 for the controller, 4 for the migrated handbook, 6 fake-DOM tests
  for the tabbed modal (open-on-Stats, keyboard/click navigation, hidden panels,
  Growth copy in both discovery states, stale-free return, reopen after closing
  from Moves).
- Visual: Playwright at 390×844 and the live dev server at 1083×766 — one-row
  strip, no horizontal overflow, shell inside the viewport.
- Review: two rounds, final verdict PASS
  (`conductor/archive/20261020-detail-modal-tabs/review.md`).

## Notes

- No save change, no new dependency, no animation, and the discovery logic in
  `growth.ts` / `growth-panel.ts` is untouched.
- `size-probe.test.ts` now also pins `ui/tabs.ts`, since `module-size.test.ts`
  still scans only `scene-logic/` and `ranch/`.
