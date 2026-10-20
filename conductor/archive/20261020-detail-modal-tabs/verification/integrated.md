# Integrated verification — 20261020-detail-modal-tabs

Range: `3f930f8` (base, merge of PR #40) → `45f3d93` (final plan commit).
Branch: `feat/20261020-detail-modal-tabs`.

## Commands (final tree)

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Unit + integration | `bun test --timeout 120000` | 0 | 1787 pass, 1 skip, 0 fail, 84,592 expect() calls, 143 files, 70.04 s |
| CI mode | `bun test --check --parallel --timeout 120000` | 0 | same counts, 16.94 s |
| Typecheck | `bun run check` (inside verify) | 0 | sim / voxel / client clean |
| Lint + format | `biome check` (inside verify) | 0 | 398 files, 0 errors, 7 pre-existing warnings |
| Determinism | `bun run gate:determinism` (inside verify) | 0 | nine creature artifacts + five prop digests byte-identical |
| Build | `bun run build` | 0 | Vite client build, chunk-size warning only (pre-existing) |
| Aggregate | `bun run verify` | 0 | all four legs above |

## Acceptance criteria

| AC | Verdict | Evidence |
| --- | --- | --- |
| AC-1 Open selects Stats, exactly one `aria-selected` | pass | `creature-detail.test.ts` "opens on Stats with one selected tab and every page painted"; live DOM check printed `sel: ["true","false","false"]` |
| AC-2 Arrows wrap, Home/End jump, focus follows | pass | `ui/tabs.test.ts` wrap/Home/End/clamp tests; `creature-detail.test.ts` "arrows, Home/End and clicks switch pages and take focus"; live check: Home → Stats, ArrowLeft → last tab |
| AC-3 Only the active panel is visible | pass | `creature-detail.test.ts` navigation test asserts `hidden`; live check `hidden: [false,true,true]` |
| AC-4 Growth page copy: digit-free → `current / target` | pass | `creature-detail.test.ts` "Growth shows digit-free copy until discovery, then current / target"; live DOM text "still a few days off / all clear / in good spirits" |
| AC-5 Repaint while Growth is active, no stale rows on return | pass | `creature-detail.test.ts` "leaving and returning to Growth paints the latest state"; `growth-panel.test.ts` host contract |
| AC-6 Moves lists the kit | pass | `creature-detail.test.ts` "Moves lists the creature's kit"; live DOM shows six rows with in-kit / days hints |
| AC-7 Handbook still switches pages and keeps content | pass | `handbook.test.ts` four tests over the migrated modal; `ui/tabs.test.ts` controller contract |
| AC-8 One-row strip, shell inside viewport, no horizontal scroll | pass | Playwright at 390×844: box 283×565 within 844, strip height 23 px with all three tabs sharing one `top`, `overflowX: false` on every page, no panel scrolling; screenshot `.conductor/detail-tabs-390.png` (inspected). Desktop (1083×766 via the running dev server): box 558 px, `overflowX: false` |
| AC-9 Size probe, suite, typecheck, biome, determinism, build | pass | table above; `size-probe.test.ts` unchanged and green (`creature-detail.ts` 10,818 B ≤ 12,288 B) |

## Requirements

- FR-1–FR-11: implemented in `apps/client/src/creature-detail.ts` (+ `ui/tabs.ts` from Phase 1).
- NFR-1 (12 KB cap): `creature-detail.ts` 10,818 B, `ui/tabs.ts` 3,845 B, `growth-panel.ts` 4,826 B, `growth.ts` 6,492 B.
- NFR-2 (selection not colour-only): filled plate + `font-weight: 900` + inset bottom bar, all driven off `aria-selected`.
- NFR-3 (no animation): no transitions or keyframes added.
- NFR-4 (fake DOM, no new dependency): tests extend the existing hand-rolled harness.
- NFR-5 (kit styling): `kit-tab`, `kit-plate`, `kit-modal-box`, existing tokens only.
- NFR-6 (single row at every tier): measured at both widths above.

## Deviations

- None from Phase 2's contract. Phase 1 reported a `metadata.json` newline failure that it could not fix; the primary corrected it in a separate commit.

## Notes

- Box height is content-driven per page (565 px Stats, ~330 px Growth/Moves at phone width), exactly like the handbook shell; only the panel is a scroll surface.
- The handbook migration removed its bespoke tab block; its labels, order and panel content are unchanged.
