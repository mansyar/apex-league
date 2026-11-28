# Review Fix Round 1 — verification evidence

- Track: `20261128-ranch-hierarchy` — rework mobile ranch hierarchy and make action state, costs, and disabled reasons explicit (FR-3 summary, FR-4 chips; labels unchanged)
- Branch: `refactor/20261128-ranch-hierarchy` — base `c10766ae`
- Scope: exactly the two Low findings from Round 1. No sim, save, dependency, lockfile, CSS, layout, plan/spec/metadata, or Conductor-state changes. No push/PR.

## Changes

### F1 — badge cost literals diverge from the shared constant

- `apps/client/src/hud/dock.ts:221` — care buttons: `cost: "1 AP"` → `cost: AP_COST_LINE`.
- `apps/client/src/hud/dock.ts:236` — train button: `cost: "1 AP"` → `cost: AP_COST_LINE`.
- Why: `careButtonLine` derives its inline cost from `AP_COST_LINE` (which interpolates `CARE_AP_COST`); the two badges were literals, so a future sim cost change could make a badge disagree with its own line. The train free-re-point paint (`cost === null` → `display: none`) is untouched, as are all other dock handlers and labels. No behavior change today (`CARE_AP_COST === 1`).
- `apps/client/src/hud/dock.test.ts` — added a hand-rolled DOM stub (`FakeElement`; no DOM dependency exists in this repo) and a test that builds the dock and asserts every care badge and the train badge equal the `·`-separated cost segment of `careButtonLine(...)`, without exporting internals. The stub implements only the element surface `buildCommandDock` actually uses (class-based `querySelector`, `append`, `setAttribute`, `dataset`, `style`, etc.).
- Commit: `c104671e` (`review-fix-1: share the AP cost constant with dock badges`).

### F2 — unconditional live-region writes in `withAdvanceSummary`

- `apps/client/src/app/hud-screen.ts:99-103` — replaced `if (line) line.textContent = advanceSummaryLine(state)` with a compare-before-assign guard: compute `next`, write only when `line.textContent !== next`.
- Why: `.advance-summary` is a `role="status"` live region; reassigning identical text on every HUD update risks repeat screen-reader announcements. The wrapper, its routine-update ordering, and its DOM guard are otherwise unchanged.
- `apps/client/src/app/hud-screen.ts:89-92` — condensed the wrapper's existing doc comment (same meaning, terser). Required because `bun test --check apps/client/src/module-size.test.ts` caught the guard pushing this module to 12,319 B (31 B over the 12,288 B cap); the trimmed comment brings it under cap. No code behavior or FR wording changed.
- `apps/client/src/app/hud-screen.test.ts` — added a test that pins the summary node with an `Object.defineProperty` `textContent` getter/setter spy, updates with identical state (`0` writes), then updates with a changed `actionPoints` (`1` write). Uses the file's existing fake-`document` seam and `withAdvanceSummary` wrapper; no refactor.
- Commit: `ac9d9f57` (`review-fix-1: skip unchanged advance summary writes`).

## Checks

| Check | Command | Result |
| --- | --- | --- |
| Named check A | `bun test --check --parallel=4 --timeout 120000 apps/client/src/hud/dock.test.ts apps/client/src/hud/programs.test.ts apps/client/src/hud/copy.test.ts apps/client/src/hud/plates.test.ts` | **0 fail** — 163 pass, 393 `expect()` calls, 4 files (503 ms). |
| Named check B | `bun test --check --parallel=4 --timeout 120000 apps/client/src/cup/view-models.test.ts apps/client/src/spar/panel.test.ts apps/client/src/stable.test.ts apps/client/src/app/hud-screen.test.ts` | **0 fail** — 83 pass, 246 `expect()` calls, 4 files (1392 ms). Re-run after the cap fix; first run was 83 pass / 0 fail in 1397 ms. |
| Module-size | `bun test --check apps/client/src/module-size.test.ts` | **pass** — 5 pass, 0 fail, 15 `expect()` calls (379 ms). First run failed: `app/hud-screen.ts — 12319 B (31 B over the 12288 B cap)`; resolved by the terse comment trim above, then re-run passed. |
| Biome | `bunx biome check apps/client/src/hud/dock.ts apps/client/src/hud/dock.test.ts apps/client/src/app/hud-screen.ts apps/client/src/app/hud-screen.test.ts` | **blocked** — shell returned `Permission denied: shell` (`permission.rejected`). No lint result obtained; the command was not retried or substituted per executor rules. Needs a primary-run rerun. |

`bun run verify`, `bun run build` and `bun run dev` were not run — the full gate belongs to the primary at acceptance.

## Visual / mobile-guideline continuity

No new browser probe was taken in this evidence-only fix round. The fix touches only badge string sources and a conditional text assignment: no CSS, layout, element structure, or breakpoint changes. The previously captured 393x852 portrait / 852x393 landscape / 1440x900 stills and probes therefore still stand: `scrollWidth === innerWidth` at each viewport, `offscreen: []`, `titleOnly: []`, and all state/cost/reason text visible (including under touch emulation with `hover: none`, `pointer: coarse`). The 393px More-overflow-over-dock residual (R1) and the short-landscape dock's intentional internal scroll (R2) are unchanged by this round.

## Artifacts / commits

- Evidence: `conductor/tracks/20261128-ranch-hierarchy/verification/review-fix-1.md`
- Code commits: `c104671e` (F1), `ac9d9f57` (F2)
- Files changed: `apps/client/src/hud/dock.ts`, `apps/client/src/hud/dock.test.ts`, `apps/client/src/app/hud-screen.ts`, `apps/client/src/app/hud-screen.test.ts`
