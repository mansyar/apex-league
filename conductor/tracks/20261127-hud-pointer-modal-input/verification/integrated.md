# Integrated verification — HUD pointer ownership and spar modal input

- **Track:** `20261127-hud-pointer-modal-input`
- **Phase:** 3 (final integrated record; evidence-only)
- **Date:** 2026-11-27
- **Branch:** `fix/20261127-hud-pointer-modal-input`
- **Base:** `b5b8919bd65c7cc5e2959899064e8ab7e04b5068`
- **Head at verification:** `b5b8919bd65c7cc5e2959899064e8ab7e04b5068`
- **Scope baseline for audit:** `4f2e5de1b7d92e96ec2782b2541a608a1d2e9c68`
- **Result:** **verified** for all implementation-level requirements. The AC-7 terminal Conductor proof (registry `[x]`, archived metadata `complete` with `pr_url`, review PASS, PR open) is primary-owned at completion and is not claimed in this phase.

## Gate commands and exact results

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Typecheck | `bun run check` (inside `bun run verify`) | 0 | `@apex/voxel` 214 files, `@apex/sim` 253 files, `@apex/server` 185 files, `@apex/client` 561 files; all `✓ No type errors`. |
| Unit suite | `bun test --check --parallel --timeout 120000` (inside `bun run verify`) | 0 | `4598 pass`, `1 skip`, `0 fail`, `676383 expect() calls`, `Ran 4599 tests across 446 files. [283.77s]`. |
| Lint/format | `biome check` (inside `bun run verify`) | 0 | `Checked 1062 files in 1827ms. No fixes applied.` |
| Determinism | `bun run gate:determinism` (inside `bun run verify`) | 0 | Voxel determinism gate OK: every species/stage regeneration byte-identical; 5 props' digests match. |
| Build | `bun run build` (after `&&`) | 0 | `vite v8.3.4`, `✓ 443 modules transformed`; `dist/index.html` 2.13 kB; `dist/assets/lab-B2IkTbut.css` 1.05 kB; `dist/assets/index-DMcOw_Ij.css` 71.87 kB; `dist/assets/lab-BdKeOICf.js` 6.80 kB; `dist/assets/index-5rZgz-vy.js` 1,110.51 kB (gzip 307.51 kB); `✓ built in 700ms`. Pre-existing >500 kB chunk advisory only. |
| Full chain | `bun run verify && bun run build` | 0 | Shell id `sh_219fa5ef00013Z425VvNG5ruDD`; final line `@apex/client build: Exited with code 0`. Full output at `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_219fa5ef00013Z425VvNG5ruDD.out`. |
| Module cap | `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | 0 | `5 pass`, `0 fail`, `15 expect() calls`, `Ran 5 tests across 1 file. [341.00ms]` — 12 KB per-module caps hold. |

## Red/green regression evidence (Phases 1–2)

| Phase | Command | Red at base | Green after fix |
| --- | --- | --- | --- |
| 1 | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts` | Exit `1`; `Found 10 errors in 1 file, checked 4 files [148.54ms]`; ten `TS2353: ... 'background' does not exist in type 'OpenModalOptions'` errors at `modal.test.ts` lines 267, 280, 294, 311, 327, 336, 360, 366, 394, 408. | Exit `0`; `bun test v1.4.4 (38afee6c8) 4x PARALLEL`; `23 pass`, `0 fail`, `64 expect() calls`, `Ran 23 tests across 2 files. [339.00ms]`. |
| 2 | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` | Exit `1`; `TS2305: Module '"./panel"' has no exported member 'sparModalBackground'`. | Exit `0`; `bun test v1.4.4 (38afee6c8) 4x PARALLEL`; `63 pass`, `0 fail`, `143 expect() calls` across 4 files (`493.00ms` final green; `546.00ms` first green; `499.00ms` after rework). |

Additional primary verification during Phases 1–2: scoped Biome on the touched files was clean (`3 files` in Phase 1; `Checked 5 files in 28ms. No fixes applied.` in Phase 2), `bun run check` was clean across all workspaces, and `(bun run verify && bun run build)` exited `0`. See `verification/phase-1.md` and `verification/phase-2.md` for full detail.

## Real-browser evidence (Phase 3)

All three sessions used the live Vite app at `http://localhost:5173/`, were resized before navigation, and were seeded with a champion Zephyr Falcon exclusively through real sim exports (`getSpecies("wind_falcon")`, `createCreatureFrom`, `evolveCreature` ×2, `saveGame(localStorage, { ...createInitialState(), creature }, Date.now())` via `/@fs/` module URLs). No hand-crafted save JSON. Rename/SPAR interactions used normal Playwright pointer clicks and keys, never DOM `.click()` dispatch; the only DOM-mediated actions were permitted onboarding `Got it` dismissal and sim-export seeding, both disclosed.

| Viewport | Ranch / pointer | Dialog / isolation | Keyboard / dismissal | Lifetime / reduced motion | Console |
| --- | --- | --- | --- | --- | --- |
| 1440×900 (`p3`) | `scrollWidth=1440`; plate at `x18 y574.3 w330 h307.7`; rename center hit own SVG; plate center hit `condition-track`. | SPAR center `(1347,40.5)` hit `SPAN.battle-title` inside `.spar-button`; normal click opened `role=dialog`, `aria-modal=true`, `aria-labelledby=spar-heading` → `Sparring`, `z-index:70`, focus `spar-panel-close`, 18 inert / 18 hidden siblings. Snapshot exposed only the dialog as interactive. | 14 focusables; 30 `Tab` + 30 `Shift+Tab`, 0 escapes. Escape, scrim `(20,700)` and close button all returned focus to `.spar-button` with 0 inert / 0 hidden; scrim/close/scrim cycles clean. | Normal `Press` click hid panel, showed chips, focused `.spar-log-toggle`, kept 18/18 isolation; Escape mid-fight restored cleanly. Fresh fight reached `Back to the ranch` with isolation active; click restored cleanly. Reduced-motion toggle kept all behavior; preference restored. | `Total messages: 2 (Errors: 0, Warnings: 0)` |
| 393×852 (`p3-port`) | `scrollWidth=393`; plate `x-7 y183 w414.86 h68` visible; no page overflow. | SPAR center `(283.23,86.5)` hit `SPAN.battle-title` inside button (`.hud-motion` `pointer-events:none`); normal click opened labelled modal, focus inside, 18/18 isolation. Panel `h850` in 852 viewport, `scrollHeight=1024`, `clientHeight=848`, `overflowY:auto` (known pre-existing sizing). | 30 `Tab` and 30 `Shift+Tab`, 0 escapes each; keyboard-only Enter reopened; Escape, scrim `(20,120)` and close button restored focus with 0/0; three cycles clean. | Normal `Press` click → chips visible, focus on log toggle, 18/18; Escape mid-fight and `Back to the ranch` both restored focus with 0/0. Reduced-motion: 8 alternating Tab/Shift+Tab, 0 escapes; preference restored. | `Total messages: 2 (Errors: 0, Warnings: 0)` |
| 852×393 (`p3-land`) | `scrollWidth=852`; plate `x18 y305 w330 h70` visible; no overflow. | SPAR center `(759.23,40.5)` hit `SPAN.battle-title` inside button; normal click opened labelled modal, focus inside, 18/18 isolation. Panel `x151 y12 w550 h387`, `scrollHeight=701`, `clientHeight=385`, `overflowY:auto`; page `852/852`. | 30 `Tab` + 30 `Shift+Tab`, 0 escapes each; keyboard-only reopen/close clean; scrim `(5,200)`, close button and Escape restored focus with 0/0 across three cycles. | Normal `Press` click and mid-fight Escape clean; fight reached `Back to the ranch` with 18/18 isolation; click restored focus with 0/0. Reduced-motion: 8 alternating Tab/Shift+Tab, 0 escapes; preference restored. | `Total messages: 2 (Errors: 0, Warnings: 0)` |

Rename proof (desktop): normal `.rename-button` click opened editor with `activeElement = INPUT.creature-name-input.kit-surface`, value `Zephyr Falcon`, `selectionStart=0`, `selectionEnd=13`; Escape and Cancel closed it; Save with unchanged name left `day=1`, `actionPoints=3`, `phase="day"`, `name="Zephyr Falcon"`.

Screenshots under `.conductor/evidence/20261127-hud-pointer-modal-input/`: `desktop-ranch.png`, `desktop-rename-open.png`, `desktop-spar-open.png`, `desktop-spar-fight.png`, `desktop-spar-result.png`, `portrait-ranch.png`, `portrait-spar-open.png`, `portrait-spar-fight.png`, `portrait-spar-result.png`, `landscape-ranch.png`, `landscape-spar-open.png`, `landscape-spar-fight.png`, `landscape-spar-result.png`. All three Playwright sessions were closed (`playwright-cli list` → `(no browsers)`); the pre-existing dev server was left running.

## Requirement coverage

| Requirement | Covered by | Result |
| --- | --- | --- |
| FR-1 / visible controls own pointer hits | Phase 2 phone/landscape hit tests; Phase 3 per-viewport hit tests | PASS — `.hud-motion` passes through; `.spar-button`, `.rename-button`, `.creature-plate` own hits at all three viewports. |
| FR-2 / Rename behavior preserved | Phase 3 desktop Rename proof | PASS — normal click, focused/selected input, Escape/Cancel/Save unchanged, no state change. |
| FR-3 / labelled modal + background isolation | Phase 1 unit contract; Phase 2 panel seam; Phase 3 dialog/snapshot proof | PASS — `role=dialog`, `aria-modal=true`, `aria-labelledby=spar-heading` → `Sparring`, 18 siblings inert + `aria-hidden`. |
| FR-4 / focus trap and dismissal | Phase 1 focus tests; Phase 3 per-viewport keyboard/dismissal proof | PASS — focus enters dialog, 30 Tab + 30 Shift+Tab per viewport never escape, Escape/scrim/close restore focus to `.spar-button`, no leaks. |
| FR-5 / minimal layout, no overflow | Phase 2 CSS diff; Phase 3 geometry and screenshots | PASS — no page overflow at any viewport; controls visible/unobstructed; portrait panel internally scrollable (known pre-existing sizing, not fixed). |
| FR-6 / unit + real-browser regression proof | Red/green table above; Phase 3 browser table and screenshots | PASS — 10 base compile errors → 23/63 green tests; real Playwright pointer/key proof at three viewports with clean consoles. |
| NFR-1 / presentation-only | Scope audit below | PASS — no sim/state/save/balance/audio/voxel/dependency/generated-file or copy changes. |
| NFR-2 / preserve styling and animation | Phase 2 CSS diff; Phase 3 visual spot-check and clean consoles | PASS — only structural pointer/modal CSS changes; no layout regression observed. |
| NFR-3 / keyboard + AT | Phase 3 dialog snapshot and focus proof | PASS — focus visible/contained, background absent from exposed tree, no exposed background controls. |
| NFR-4 / caps and full gates | Full chain and module-size rows above | PASS — `bun run verify && bun run build` exit 0; 12 KB module cap test 5/5 green. |
| NFR-5 / no per-frame work or leaks | Modal helper code inspection in Phase 2; repeated Phase 3 cycles | PASS — one listener per dialog lifetime; 3 open/close cycles per viewport with 0 inert / 0 hidden after close. |
| AC-1 | Desktop Rename proof | PASS |
| AC-2 | Portrait and landscape SPAR normal clicks | PASS |
| AC-3 | Dialog semantics + inert background | PASS |
| AC-4 | Focus trap, Escape/scrim/button dismissal, repeat + mid-fight | PASS |
| AC-5 | Three viewport captures with no overflow/occlusion, clean consoles | PASS |
| AC-6 | Exact red/green commands above | PASS |
| AC-7 | Full gates, module caps, approved diff | PASS for implementation evidence; terminal registry/metadata/review/PR proof is primary-owned and not claimed here. |

## Scope audit

`git diff --name-status 4f2e5de1b7d92e96ec2782b2541a608a1d2e9c68..HEAD` lists only:

- Client UI/test: `apps/client/src/ranch.css`, `apps/client/src/spar.css`, `apps/client/src/spar.ts`, `apps/client/src/spar/panel.ts`, new `apps/client/src/spar/panel.test.ts`, `apps/client/src/ui/modal.ts`, `apps/client/src/ui/modal.test.ts`.
- Primary-owned Conductor docs/state: `conductor/roadmap.md`, `conductor/tracks.md`, and new files under `conductor/tracks/20261127-hud-pointer-modal-input/` (`index.md`, `metadata.json`, `plan.md`, `spec.md`, `verification/phase-1.md`, `verification/phase-2.md`).

No sim/state/save/balance/audio/voxel/dependency/generated-file changes and no copy changes. `git status --short` is empty because the evidence directory is gitignored; `verification/phase-3.md` and this file are intentionally left uncommitted for the primary to append `## Primary verification` and squash. Phase 3 evidence files and screenshots are the only new artifacts.

## Deviations and notes

1. Known pre-existing portrait/landscape `.spar-panel` sizing: panel extends below the viewport but scrolls internally with no page overflow. Not fixed in this track.
2. The dev server was pre-existing; Phase 3 has no dev-server shell id and left it running.
3. Seed through real sim exports is the only save-writing seam used; onboarding dismissal with a normal `Got it` click is the only non-test UI action outside the documented proof path.
4. Full red/green test outputs are preserved in `verification/phase-1.md`/`phase-2.md`; Phase 3 exact browser/gate values are also preserved in `.conductor/evidence/20261127-hud-pointer-modal-input/phase-3-notes.md`.

## Primary verification

- **Scope:** the phase range `b5b8919bd65c7cc5e2959899064e8ab7e04b5068..HEAD` is empty before the two evidence files; the full track diff contains exactly the seven approved client UI/test files plus primary-owned Conductor state. No sim/state/save/balance/audio/voxel/dependency/generated-file or copy changes.
- **Full gate:** primary re-ran `(bun run verify && bun run build)` in shell `sh_21a00eb58001ERheZCGD4Nx56F` → `gate_exit=0`. Typechecks were clean in voxel 214, sim 253, server 185 and client 561 files; `4598 pass`, `1 skip`, `0 fail`, `676383 expect() calls`, `Ran 4599 tests across 446 files [146.44s]`; Biome `Checked 1062 files ... No fixes applied.`; all archetype stage regenerations and 5 prop digests matched; Vite emitted `index-5rZgz-vy.js` 1,110.51 kB and built in 2.57s with only the pre-existing chunk advisory.
- **Module cap:** primary re-ran `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` → `5 pass / 0 fail / 15 expect() calls [2.23s]`, exit 0.
- **Independent visual inspection:** `agent-vision` reviewed seven Phase 3 captures (`desktop-ranch`, `desktop-rename-open`, `desktop-spar-open`, `portrait-ranch`, `portrait-spar-open`, `landscape-ranch`, `landscape-spar-fight`). Rename and SPAR controls were visible and unobstructed; the desktop spar dialog was labelled over a dimmed background; portrait/landscape ranch controls had no page overflow; landscape battle framing showed the setup hidden and the battle controls visible.
- **Live DOM spot-check:** a fresh normal-click Playwright probe at 1440×900 opened Rename, focused `.creature-name-input`, selected `Zephyr Falcon` (`selectionStart=0`, `selectionEnd=13`), and preserved the value. The narrow existing inline input scrolls its selected text (`scrollLeft=24`, width `130.47px`); the head row is hidden during editing, so the new head `min-width:0` rule does not affect this input width. This is existing inline-edit sizing, not pointer interception or control occlusion.
- **Source review:** confirmed the shared modal API is two-argument `openModal(root, options)` / `closeModal(root)` / `isModalOpen(root)`; spar computes background children at open time, uses `--z-modal`, traps focus on the overlay through setup/fight/result, and restores isolation before focus return. CSS changes are limited to pointer ownership, hit stacking and minimal shrink behavior.
- **Conclusion:** FR-1–FR-6, NFR-1–NFR-5 and implementation evidence for AC-1–AC-7 are independently confirmed. AC-7's terminal registry/archive/review/PR proof remains primary-owned at completion.

## Doc sync

- Added the dated `2026-11-27 — HUD pointer ownership and spar modal input` note in `conductor/tech-stack.md` under Client, recording the opt-in background isolation contract, transparent-wrapper hit ownership, spar's shared modal lifetime/focus handoff, and the three verified viewports.
- `conductor/product.md`, `conductor/product-guidelines.md` and `conductor/workflow.md` need no change: the existing mobile playability and non-occlusion requirements already cover this bug fix.
- RM-13 remains linked to this track until the completion commit retires it. The known pre-existing spar-panel internal-scroll sizing and narrow inline Rename input text scrolling are documented, not redesigned.
