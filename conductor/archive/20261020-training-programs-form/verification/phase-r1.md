# Phase R1 Verification — Review Fixes

- **Track:** 20261020-training-programs-form (Raising Depth: Training Programs & Form)
- **Phase:** R1 — Review Fixes
- **Date:** 2026-10-20
- **Branch:** feat/20261020-training-programs-form
- **Base:** a43553c (review record)
- **Head:** see `**Checkpoint:**` in `plan.md`

## Result

verified — every finding in `review.md` (F1–F6) is fixed, the full gate is green, and the
two behavioural fixes were re-checked in a live browser.

## Commands

| Layer | Command | Result |
| --- | --- | --- |
| unit | `bun test --timeout 120000 packages/sim/src apps/client/src` | exit 0 |
| static | `bun run check` | exit 0 — 62 / 86 / 297 files, no type errors |
| lint/format | `bunx --bun biome check` (via `bun run verify`) | exit 0 — 0 errors, 7 pre-existing `noNonNullAssertion` warnings |
| integrated | `bun run verify` | exit 0 — 1924 pass / 1 skip / 0 fail across 149 files |
| determinism | `bun run gate:determinism` (inside verify) | OK — nine creature GLBs and the 5-prop digest byte-identical |
| build | `bun run build` | exit 0 — 241 modules, JS 835.25 kB / 228.32 kB gzip, CSS 59.97 kB / 11.67 kB gzip |
| visual | `playwright`-less browser pass against `bun run dev` | pass — see below |

## Findings closed

| ID | Severity | Fix |
| --- | --- | --- |
| F1 | High | `previewProgram(creature, program)` in `packages/sim/src/settlement.ts` reads a program as if picked tonight (bumping `trainingDays` only when the pick would spend the AP), exported from `@apex/sim`; `hud/programs.ts` projects through it. Tests: `programs.test.ts` projects the trickle on a counter of 2 and no trickle on 3; a new test pins that an already assigned counter is not counted twice. |
| F2 | Medium | `breakthroughLine(trainingDays, assigned)` counts tonight as a trained night when a program is set, so a multiple of three reads "Breakthrough tonight"; `detail/training-tab.ts` passes the assigned flag. Tests in `copy.test.ts` and `training-tab.test.ts`. |
| F3 | Medium | `hud/shell.ts` moves focus to the first program row after the train button opens the sheet (required at narrow widths, where the button is hidden while picking). Live check: `document.activeElement` is the Power Lifting radio after opening. |
| F4 | Low | `ranch.css` narrow-band comment corrected: the sheet is appended to the dock root as `.dock-train`'s sibling, and hiding the wrapper would take the dock's border and head spacing with it. |
| F5 | Low | `artifacts/phase3-seed.ts` writes `trainingProgram: null`, so the generated save loads under v18. |
| F6 | Low | Shared `formRead` / `formReadout` in `hud/copy-care.ts` (single source for the spar card, coach room and Training tab) with tests in `copy.test.ts`, plus `plates.test.ts` coverage for `formChipTitle` / `paintFormChip`. |

## Live checks

- **Projection (F1):** with `trainingDays: 2` and no program assigned, the Power Lifting row
  projects `+1 ATK, +1 DEF` (the breakthrough night); it previously showed `+1 ATK`.
- **Focus (F3):** opening the picker leaves focus on the `Power Lifting` radio
  (`role="radio"`, `checked=false`), not on `<body>` or the hidden train button.
- **Coach room / spar / Training tab:** unchanged wording, now built from `formRead`; the
  Training tab's breakthrough line reports "Breakthrough tonight" for an assigned counter on
  a multiple of three.

## Deviations

- `packages/sim/src/settlement.ts` and `packages/sim/src/index.ts` were added to the phase's
  Touches: the projection fix belongs in the sim so the client cannot drift from the payout.
- Biome rewrote four files for formatting (`coach-room.ts`, `training-tab.test.ts`,
  `copy-care.ts`, `spar/setup.ts`); no behavioural change.

## Notes

- No save-shape change: `previewProgram` is a pure read and `docs/save-schema.md` is untouched.
- The boss-calibration gap recorded during phase 3 remains open and out of scope.
