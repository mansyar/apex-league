# Phase 3 verification — Visual evidence and integrated gate

- **Track:** `20261127-hud-pointer-modal-input`
- **Phase:** 3 (`Visual evidence and integrated gate`)
- **Date:** 2026-11-27
- **Branch:** `fix/20261127-hud-pointer-modal-input`
- **Base:** `b5b8919bd65c7cc5e2959899064e8ab7e04b5068`
- **Head at verification:** `b5b8919bd65c7cc5e2959899064e8ab7e04b5068`
- **Task commits:** none — this phase is evidence-only and its two evidence files are deliberately left uncommitted.
- **Result:** **verified** for P3.T1 (browser proof) and P3.T2 (integrated gate and scope audit). AC-7 terminal Conductor proof remains primary-owned and is not claimed here.

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Integrated gate | `bun run verify && bun run build` | 0 | Shell `sh_219fa5ef00013Z425VvNG5ruDD` completed; `bun run --filter @apex/client build: Exited with code 0`. Full result below and in `integrated.md`. |
| Module size | `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | 0 | `5 pass`, `0 fail`, `15 expect() calls`, `Ran 5 tests across 1 file. [341.00ms]` |
| Browser | `playwright-cli -s=<name> open / resize / goto / snapshot / click / press / run-code / screenshot / console / close` | 0 | Three named sessions (`p3`, `p3-port`, `p3-land`); viewport confirmed per session before seeded navigation; all closed at the end (`playwright-cli list` → `(no browsers)`). |
| Scope audit | `git diff --name-status 4f2e5de1b7d92e96ec2782b2541a608a1d2e9c68..HEAD`, `git status --short` | 0 | Only approved client UI/test files plus primary-owned Conductor docs. Evidence directory is gitignored; no production/test/copy changes by Phase 3. |

## Seed and interaction discipline

- The Vite dev server at `http://localhost:5173/` was **already running** when Phase 3 started; it was not started by this phase, so there is no Phase 3 shell id to report. It was left running for the primary.
- Each session was opened at `about:blank`, resized, then navigated to the app. A champion Zephyr Falcon was seeded **only** through real sim exports via Vite `/@fs/` module URLs:
  - `import("/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts")` → `getSpecies`, `createInitialState`, `evolveCreature`, `saveGame`.
  - `import("/@fs/D:/Projects/battle-pets/packages/sim/src/creature.ts")` → `createCreatureFrom`.
  - `createCreatureFrom(getSpecies("wind_falcon"), 12345)`, `evolveCreature` twice, `saveGame(localStorage, { ...createInitialState(), creature }, Date.now())`, reload.
  - Every session reported `saveGame ok=true`, `stage=champion`, `name="Zephyr Falcon"`, `#app` children `19`.
- No hand-crafted save JSON was used. The only DOM-mediated actions outside normal Playwright pointer/keyboard were the permitted onboarding `Got it` dismissal and the documented sim-export seeding above. Rename and SPAR interactions used real Playwright pointer clicks and key presses (`page.locator(...).click()` / `page.mouse.click()` / `page.keyboard.press()`), never DOM `.click()` dispatch.

## Per-viewport browser proof

### Desktop — `p3`, 1440×900

- `page.viewportSize()` → `{ width: 1440, height: 900 }`. Ranch: `documentElement.scrollWidth=1440`, `body.scrollWidth=1440`; plate rect `x18 y574.3 w330 h307.7`; rename rect `x277 y596.3 w26 h26`; rename center hit was its own SVG (`inside:true`), plate center hit `condition-track` inside the plate. Visual spot-check: partner plate, Spar and Rename controls fully visible and unobstructed.
- Rename: normal `.rename-button` click opened the editor; `activeElement = INPUT.creature-name-input.kit-surface`, value `Zephyr Falcon`, `selectionStart=0`, `selectionEnd=13`, edit row `display:flex`, head row `display:none`. Escape closed (edit `none`, head `""`); reopen + `.rename-cancel` click closed; reopen + `.rename-confirm` click with unchanged name closed and left `day=1`, `actionPoints=3`, `phase="day"`, `name="Zephyr Falcon"` before and after.
- SPAR pre: center `(1347, 40.5)` hit `SPAN.battle-title` inside `.spar-button` (`pointer-events:auto`). Normal click opened `spar-overlay`: `display:flex`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="spar-heading"` resolving to `Sparring`, `z-index:70`, focus `spar-panel-close`, 18 `#app` siblings inert and `aria-hidden="true"`. Snapshot at depth 10 exposed the dialog as the only interactive subtree; background appeared under `[aria-hidden]` groups.
- Trap: 14 visible focusables; 30 `Tab` presses and 30 `Shift+Tab` presses stayed inside the overlay (`escapes:0`), more than two full cycles.
- Keyboard-only: Escape closed to `spar-overlay is-hidden`, `display:none`, focus `spar-button kit-chip`, inert `0`, hidden `0`; `Enter` on the spar button reopened with focus inside; `Tab`, `Tab`, `Shift+Tab` stayed inside; Escape closed cleanly again.
- Dismissal: scrim hit at `(20,700)` was `DIV.spar-overlay`; scrim → close button → scrim each opened with 18 inert / 18 hidden / focus inside and each closed with `display:none`, focus on `.spar-button`, inert `0`, hidden `0`.
- Lifetime: normal doctrine `Press` click hid `.spar-panel` (`none`), showed `.spar-chips` (`flex`), moved focus to `spar-log-toggle`, and kept the overlay open with 18 inert / 18 hidden / focus inside. Escape mid-fight closed cleanly. A fresh fight reached a visible `Back to the ranch` button while isolation stayed active; clicking it closed to `is-hidden`, `display:none`, focus on `.spar-button`, inert `0`, hidden `0`.
- Reduced motion: Settings → `Motion: full` → `Motion: reduced` (saved `settings.reducedMotion=true`); Done; normal SPAR click opened a labelled modal with focus inside and 18 inert / 18 hidden; Tab and Shift+Tab trapped; Escape closed with focus restored and no isolation. Restored `reducedMotion=false` through the same Settings seam.
- Console: `Total messages: 2 (Errors: 0, Warnings: 0)`. No transient network errors observed.

### Portrait — `p3-port`, 393×852

- Resized before navigation; `page.viewportSize()` → `{ width: 393, height: 852 }`; seeded as above; onboarding dismissed with normal `Got it` click. Ranch `scrollWidth=393`, `bodyScrollWidth=393`; plate `x-7 y183 w414.86 h68`, visible and in viewport; Spar and Rename present. Visual spot-check: partner plate and controls visible with no page overflow.
- SPAR pre: center `(283.23, 86.5)` hit `SPAN.battle-title` inside `.spar-button`; `.spar-button` `pointer-events:auto`; `.hud-motion` `pointer-events:none`. Normal click opened `spar-overlay` with `role=dialog`, `aria-modal=true`, `aria-labelledby=spar-heading` → `Sparring`, focus `spar-panel-close`, 18 inert / 18 hidden. Panel `y164 h850` in an 852-high viewport, `scrollHeight=1024`, `clientHeight=848`, `overflowY:auto`; page `scrollWidth=393`, `clientWidth=393` — the known pre-existing portrait sizing behavior, no page overflow.
- Trap: 30 `Tab` and 30 `Shift+Tab` presses, `escapes:0` each. Escape → `is-hidden`, `display:none`, focus `.spar-button`, inert `0`, hidden `0`. Keyboard-only Enter reopened, Tab/Tab/Shift+Tab stayed inside, Escape closed cleanly.
- Dismissal: scrim at `(20,120)` hit `DIV.spar-overlay`; scrim → close button → scrim cycles each opened 18/18 focus inside and each closed hidden, focus `.spar-button`, 0/0.
- Lifetime: normal `Press` click → panel `none`, chips `flex`, focus `spar-log-toggle`, overlay open 18/18 focus inside; Escape mid-fight closed cleanly. Second fight reached visible `Back to the ranch` with 18/18 and focus inside; click closed to hidden, focus `.spar-button`, 0/0.
- Reduced motion: Settings toggle saved `true`, dialog reopened with role/aria-modal/focus/18/18 intact, 8 alternating Tab/Shift+Tab → `0` escapes, Escape closed with focus back and 0/0; preference restored to `false`.
- Console: `Total messages: 2 (Errors: 0, Warnings: 0)`.

### Landscape — `p3-land`, 852×393

- Resized before navigation; `page.viewportSize()` → `{ width: 852, height: 393 }`; seeded as above; onboarding dismissed. Ranch `scrollWidth=852`, `bodyScrollWidth=852`; plate `x18 y305 w330 h70`, visible and in viewport; Spar and Rename present. Visual spot-check: no overflow or occlusion.
- SPAR pre: center `(759.23, 40.5)` hit `SPAN.battle-title` inside `.spar-button`, `pointer-events:auto`. Normal click opened `spar-overlay`, flex, `role=dialog`, `aria-modal=true`, `aria-labelledby=spar-heading` → `Sparring`, focus `spar-panel-close`, 18 inert / 18 hidden. Panel `x151 y12 w550 h387` in a 393-high viewport, `scrollHeight=701`, `clientHeight=385`, `overflowY:auto`; page `852/852` no overflow.
- Trap: 30 `Tab` and 30 `Shift+Tab` presses, `escapes:0` each. Escape → hidden, display none, focus `.spar-button`, 0/0. Keyboard-only Enter reopened, Tab/Tab/Shift+Tab stayed inside, Escape closed cleanly.
- Dismissal: scrim hit at `(5,200)` was `DIV.spar-overlay`; scrim → close button → scrim cycles each opened 18/18 focus inside and each closed hidden, focus `.spar-button`, 0/0.
- Lifetime: normal `Press` click → panel `none`, chips `flex`, focus `spar-log-toggle`, overlay 18/18 focus inside; Escape mid-fight closed cleanly. Second fight reached visible `Back to the ranch` with 18/18 and focus inside; click closed hidden, focus `.spar-button`, 0/0. Visual spot-check of the fight capture: battle HUD visible, setup panel hidden, controls unobstructed.
- Reduced motion: Settings toggle saved `true`, dialog reopened with role/aria-modal/focus/18/18 intact, 8 alternating Tab/Shift+Tab → `0` escapes, Escape closed cleanly; preference restored to `false`.
- Console: `Total messages: 2 (Errors: 0, Warnings: 0)`.

## Screenshots

All under `.conductor/evidence/20261127-hud-pointer-modal-input/` (gitignored):

- `desktop-ranch.png`, `desktop-rename-open.png`, `desktop-spar-open.png`, `desktop-spar-fight.png`, `desktop-spar-result.png`
- `portrait-ranch.png`, `portrait-spar-open.png`, `portrait-spar-fight.png`, `portrait-spar-result.png`
- `landscape-ranch.png`, `landscape-spar-open.png`, `landscape-spar-fight.png`, `landscape-spar-result.png`
- Primary-phase reference captures retained: `primary-portrait-spar.png`, `primary-landscape-spar.png`, `primary-desktop-result.png`

A visual spot-check of `desktop-ranch.png`, `portrait-spar-open.png` and `landscape-spar-fight.png` confirmed the partner plate/controls are visible, the dialog is focused over a dimmed background, and the battle HUD is unobstructed.

## Verification commands (integrated)

- `bun run verify && bun run build` → exit `0`.
  - Typechecks: `@apex/voxel` 214 files, `@apex/sim` 253 files, `@apex/server` 185 files, `@apex/client` 561 files; all `✓ No type errors`, all exit `0`.
  - Full suite: `4598 pass`, `1 skip`, `0 fail`, `676383 expect() calls`, `Ran 4599 tests across 446 files. [283.77s]`.
  - Biome: `Checked 1062 files in 1827ms. No fixes applied.`
  - Voxel determinism gate: every species/stage regeneration byte-identical plus 5 props digests match.
  - Vite build: `✓ 443 modules transformed`; `dist/assets/index-5rZgz-vy.js` `1,110.51 kB` (gzip `307.51 kB`); `✓ built in 700ms`; pre-existing chunk-size advisory only.
- Explicit module-size test: `5 pass / 0 fail / 15 expect() calls`, `341.00ms`.

## Deviations

1. Known pre-existing portrait (and landscape) `.spar-panel` sizing: the panel extends below the viewport but scrolls internally (`overflowY:auto`), with no page overflow. Not fixed in this track.
2. No Phase 3 shell id for the dev server: it was already running when this phase began and was left running.
3. This phase made no production, CSS, test, plan, metadata, roadmap, product-doc, review or PR edits; both evidence files are intentionally uncommitted.

## Blockers

None. No command was denied in Phase 3.

## Notes

- All three Playwright sessions were closed; `playwright-cli list` reported `(no browsers)`.
- Console totals are exact: 2 messages, 0 errors, 0 warnings in each of `p3`, `p3-port`, `p3-land`.
- Scope audit: `git diff --name-status 4f2e5de1b7d92e96ec2782b2541a608a1d2e9c68..HEAD` contains only approved client UI/test files and primary-owned Conductor docs; no sim/state/save/balance/audio/voxel/dependency/generated-file or copy changes. `git status --short` is empty; Phase 3 artifacts live only in the gitignored evidence directory plus these two uncommitted evidence files.
- Seed details, exact per-check outputs and the verification gate numbers are also preserved in `.conductor/evidence/20261127-hud-pointer-modal-input/phase-3-notes.md` for the primary.

## Primary verification

- Scope check: `git diff --name-only b5b8919bd65c7cc5e2959899064e8ab7e04b5068..HEAD` was empty before the two uncommitted evidence files; full track scope remains seven approved client UI/test files plus primary-owned Conductor state. No production, CSS, test or copy changes were made by Phase 3.
- Primary full gate: `(bun run verify && bun run build)` in shell `sh_21a00eb58001ERheZCGD4Nx56F` → exit 0; clean typechecks in all four workspaces; `4598 pass / 1 skip / 0 fail`, `676383 expect() calls`, 4599 tests across 446 files; Biome clean on 1062 files; determinism green for every archetype stage and 5 prop digests; Vite `index-5rZgz-vy.js` 1,110.51 kB with only the pre-existing chunk advisory.
- Explicit module-size command: `5 pass / 0 fail / 15 expect() calls [2.23s]`, exit 0.
- Independent `agent-vision` review of seven desktop/portrait/landscape captures confirmed visible, unobstructed Rename/SPAR controls, labelled spar dialog over a dimmed background, no ranch page overflow, and visible battle controls with the setup panel hidden.
- Fresh live Playwright spot-check: normal Rename click focused and selected the complete `Zephyr Falcon` value. The existing narrow input's selected-text horizontal scrolling is not caused by the new head shrink rule because the head is hidden while editing.
- Conclusion: P3.T1/P3.T2 and AC-1–AC-7 implementation evidence are verified. Terminal Conductor proof for AC-7 is reserved for completion.
