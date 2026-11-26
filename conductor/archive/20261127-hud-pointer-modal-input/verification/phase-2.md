# Phase 2 verification — HUD pointer ownership and spar modal adapter

- **Track:** `20261127-hud-pointer-modal-input`
- **Phase:** 2 (`HUD pointer ownership and spar modal adapter`)
- **Date:** 2026-11-27
- **Branch:** `fix/20261127-hud-pointer-modal-input`
- **Base:** `a47a539766591b84f74e9e59b800c6a298060fe6`
- **Head at verification:** `d3e2d0dd` (implementation commit; this evidence is committed separately afterwards)
- **Task commits:** `a3ec2b4f` (red test), `d3e2d0dd` (implementation)
- **Result:** **verified** for the scoped Phase 2 checks only. The full `bun run verify && bun run build` gate was **not** run by this phase (owned by the primary agent).

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` | 0 | `bun test v1.4.4 (38afee6c8) 4x PARALLEL`; `63 pass`, `0 fail`, `143 expect() calls` across 4 files (`493.00ms` on final state; `546.00ms` on first green run). Red at base: `TS2305 Module '"./panel"' has no exported member 'sparModalBackground'`. |
| `bunx biome check apps/client/src/ranch.css apps/client/src/spar.ts apps/client/src/spar/panel.ts apps/client/src/spar/panel.test.ts apps/client/src/spar.css` | denied | `{"error":{"type":"permission.rejected","message":"Permission denied: shell"}}` — see Blockers. Primary must re-run. |
| `playwright-cli open http://localhost:5173/`, `resize W H`, `snapshot --depth=N`, `click <ref>`, `press Escape`, `eval '<js>'`, `run-code '<js>'`, `screenshot --filename=...`, `close` | 0 | Real-browser proof below; all UI actions used normal Playwright clicks/keys, no synthetic JS click dispatch. Session closed at the end. |
| `git status --short`, `git diff --stat`, `git diff -- <touched files>`, `git add`, `git commit` | 0 | Only the five approved source/test files changed before this evidence file; `hud/shell.ts` needed no edit. |

## Changes verified in scope

- `apps/client/src/ranch.css`: `.hud-motion` and its phone/landscape variants pass hits through (`pointer-events: none`); `.hud-motion .kit-chip, .hud-motion .hud-overflow` re-enable hits; `.creature-plate` owns hits (`pointer-events: auto`, `z-index: var(--z-dock)`); `.rename-button` gets explicit stacking; `.creature-headrow .creature-head` gets `min-width: 0` so the pencil stays inside the plate clip.
- `apps/client/src/spar.css`: `.spar-overlay` moves to `var(--z-modal)` and gains `.is-hidden { display: none }`; `.spar-button` gains `z-index: var(--z-dock); pointer-events: auto`; stale phone comment updated.
- `apps/client/src/spar/panel.ts`: overlay starts as `spar-overlay is-hidden` with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="spar-heading"`; heading carries that id; new `sparModalBackground(root, overlay)` reads root children at open time.
- `apps/client/src/spar.ts`: `openModal`/`closeModal`/`isModalOpen` adapter, one `teardown()` for every exit, focus moved to `logToggle` at setup→fight, both close buttons funnel through `closeModal`, `update()` uses modal state.
- `apps/client/src/spar/panel.test.ts` (new): pins the hidden labelled-dialog seam and the background helper; fails at base, passes after implementation.
- `apps/client/src/hud/shell.ts` was **not** changed: it contains none of the HUD chip/plate selectors involved.

## Requirements mapping

| Requirement | How it is met | Evidence |
| --- | --- | --- |
| FR-1 / pointer ownership | Transparent `.hud-motion` wrappers pass through; chips, overflow panel and creature plate own their hits. No panel moved or resized. | Phone and landscape hit tests below; `git diff`. |
| FR-2 / SPAR reachable | `.spar-button` explicitly above the page and clickable in all three viewports. | Normal clicks at 1440×900, 393×852, 852×393. |
| FR-3 / dialog semantics | `role=dialog`, `aria-modal=true`, `aria-labelledby=spar-heading` resolving to “Sparring”; overlay `z-index: 70` (`--z-modal`), hidden via class not inline display. | Live DOM values below; `panel.test.ts`. |
| FR-4 / shared modal adapter | `openModal` with `background: sparModalBackground(...)`; `closeModal` on both buttons, Escape, scrim and creature disappearance; `isModalOpen` guards re-entry and `update()`. | Isolation/dismissal proof below; modal/focus suites green. |
| FR-5 / layout | No panel moved or resized by the pointer fix; page has no horizontal overflow at verified viewports. The portrait setup panel extends below the viewport but scrolls internally, as documented under Deviations. | `document.documentElement.scrollWidth <= innerWidth`, normal pointer clicks, and internal panel scrolling at portrait and landscape. |
| AC-1 | Desktop Rename normal click opens the inline editor and focuses `.creature-name-input`. | Pre: click timed out (`canvas intercepts pointer events`). Post: click succeeded, `activeElement = INPUT.creature-name-input.kit-surface`. |
| AC-2 | Portrait and landscape SPAR normal clicks open the dialog. | Center hit is inside `.spar-button`; clicks opened `spar-overlay`. |
| AC-3 | Dialog semantics plus inert background. | 18 `#app` siblings inert while open, `inertCount: 0` after close. |
| AC-4 | Focus trap, Escape/scrim/button dismissal, focus return, repeated and mid-fight cases. | 20 Tab presses trapped; fight phase re-anchored to `logToggle` and 12 more Tabs trapped; Escape, scrim and Close sparring all return focus to `.spar-button`; 3 repeated cycles clean. |
| NFR-1 | No per-frame work; the modal helper owns one keydown listener for the dialog lifetime and tears it down on close (code inspection). | `ui/modal.ts` + `spar.ts` diff; repeated cycles below. |
| NFR-2 | Clean app console during all UI flows. | Only two unrelated entries in `.playwright-cli/console-2026-11-26T21-40-53-503Z.log`: our earlier failed `/packages/sim/src/index.ts` import (404) and Vite restart notice; no app errors. |
| NFR-5 | No retained global modal state or listener leaks after repeated cycles. | 3 open/close cycles: every open `inert=18`, every close `is-hidden`, `active=spar-button kit-chip`, `inert=0`; idempotent `closeModal` covered by `ui/modal.test.ts`. |

## Per-viewport pre/post proof

Save state was seeded through real sim exports (`getSpecies("wind_falcon")`, `createCreatureFrom`, `evolveCreature` ×2, `saveGame(localStorage, ...)` via Vite `/@fs/` module URLs) — no hand-crafted save JSON.

### Desktop — 1440×900

- **Pre:** `playwright-cli click` on `Rename partner` timed out: `canvas intercepts pointer events`. Geometry: rename x337 w26 (right edge 363) while `.creature-plate` clipped at right 348; `.creature-head` had `min-width: auto` and `width: 100%`, pushing the pencil outside the clip.
- **Post:** `.creature-head min-width: 0px`; rename x277 w26 (right 303, inside plate right 348); hit test at center `(290, 609)` → `svg` whose closest `.rename-button` is true. Normal click succeeded and `activeElement` became `INPUT.creature-name-input.kit-surface` with the inline editor visible.
- **SPAR:** normal click opened dialog: `overlayClass: "spar-overlay"`, `display: flex`, `role: dialog`, `aria-modal=true`, `aria-labelledby=spar-heading` → text “Sparring”, `zIndex: 70`, focus on `spar-panel-close`, 17 visible focusables, 18 inert siblings.
- **Screenshots:** `desktop-rename-open.png`, `desktop-spar-open.png`, `desktop-spar-fight.png` in `.conductor/evidence/20261127-hud-pointer-modal-input/`.

### Portrait — 393×852

- **Pre (from brief):** SPAR center hit `.hud-motion` and a normal click timed out.
- **Post:** `.hud-motion` computed `pointer-events: none` (box x14 y14 w414.86 h94 still spans the chip area); SPAR button rect x229.47 y64 w149.53 h45, center `(304.23, 86.5)` hit `SPAN.battle-title` with `closestSpar: true`. Normal click opened the dialog (`display: flex`, `role: dialog`, focus inside, 18 inert siblings); Escape returned focus to `.spar-button` and cleared inert. `bodyScroll: 393×852`, no page overflow.
- **Screenshot:** `portrait-spar-open.png`.

### Landscape — 852×393

- **Earlier observation resolved:** the SPAR center hit `SPAN.battle-title`; that span is the icon/text inside `.spar-button` itself (`closestSpar: true`), not an intercepting ancestor. With `.hud-motion` pass-through, this is the expected target.
- **Post:** SPAR rect x684.47 y18 w149.53 h45, center `(759.23, 40.5)` hit `SPAN.battle-title` inside the chip; normal click opened the dialog (`role: dialog`, focus on `spar-panel-close`, 18 inert siblings); Escape returned focus to `.spar-button`. `bodyScroll: 852×393`, no page overflow.
- **Screenshot:** `landscape-spar-open.png`.

## Modal isolation, focus and dismissal

- Open: overlay no longer has inline `display: none`; `.is-hidden` is CSS-only. Background children are inert at open time (18 siblings, including the SPAR chip), and the opener (`spar-button`) is restored as focus target by the helper.
- Setup focus trap: 20 consecutive `Tab` presses never left the overlay (`trapped: true`).
- Fight phase: selecting `Press` hid the panel (`display: none`), showed `.spar-chips` (`display: flex`), and moved focus to `BUTTON.spar-log-toggle`; a further 12 `Tab` presses stayed inside the overlay even though the panel had no visible focusables. This is why the trap box is the overlay.
- Dismissal: Escape in setup and mid-fight, scrim click at `(20, 700)` (hit test `spar-overlay`), and `Close sparring` all produced `overlayClass: "spar-overlay is-hidden"`, `display: none`, `active: "spar-button kit-chip"`, `sparButtonDisplay: ""`, `inertCount: 0`.
- Repeated cycles: 3 landscape open/Escape cycles each produced `open {cls: spar-overlay, inert: 18}` and `closed {cls: spar-overlay is-hidden, active: spar-button kit-chip, inert: 0}`.

## Deviations

1. `openModal(overlay, { background, onClose })` uses the **2-argument API** actually present in `ui/modal.ts` (`opts.box` defaults to the root). The brief's illustrative 3-argument form does not exist in this codebase.
2. The trap box is the **overlay**, not the panel: the panel is hidden during the fight, so trapping inside it would leave no focusable anchors. Documented in `spar.ts`.
3. Added `min-width: 0` to `.creature-headrow .creature-head` (not in the initial pointer CSS list) because desktop Rename was genuinely reproducible and the pencil sat outside the plate's `clip-path`; without it AC-1 fails.
4. `apps/client/src/hud/shell.ts` was not touched — no `kit-chip`/`hud-motion`/plate selectors live there.
5. No save version bump: persisted shape is unchanged.
6. Pre-existing portrait panel sizing left alone: a later `.spar-panel` rule in `spar.css` overrides the phone `max-height`, so the panel's bottom extends below the viewport while remaining internally scrollable. No page overflow results. This is outside Phase 2 (AC-1..AC-4) and was not changed here; flagged for the primary.

## Blockers

- **Command:** `bunx biome check apps/client/src/ranch.css apps/client/src/spar.ts apps/client/src/spar/panel.ts apps/client/src/spar/panel.test.ts apps/client/src/spar.css`
- **Why:** scoped style/lint verification of all Phase 2 touched files.
- **Result:** `permission.rejected` (`Permission denied: shell`). Not retried or worked around per agent rules.
- **Expected:** primary re-runs the same command; if Biome objects to declaration order in the new CSS blocks, fix only those diagnostics.

## Notes

- Red test commit `a3ec2b4f` was made before implementation; implementation commit `d3e2d0dd` followed. This evidence file is committed separately so the head recorded above is the verified code state.
- The primary restarted `bun run dev` mid-session; the page reloaded once, which closed an open dialog. The focus-trap check was repeated after reopening and passed; the reload is reflected in the Vite console entry only.
- Browser session was closed with `playwright-cli close`. Screenshots and the scratch proof log are under the gitignored `.conductor/evidence/20261127-hud-pointer-modal-input/`.
- No full-gate claim: `bun run verify && bun run build` was not executed by this phase.

## Rework 1

Primary verification of the scoped checks found two non-behavioral diagnostics. Rework attempt 1 of 2 applied only those fixes; no behavior, layout values, or other files were changed.

### Diagnostics from primary

1. `apps/client/src/spar/panel.test.ts` around line 108: Biome requires the `buildSparPanel` call in `build()` to be wrapped across multiple lines, one argument per line, with a trailing comma.
2. `apps/client/src/ranch.css`: `lint/style/noDescendingSpecificity` — the two-selector `.hud-motion .kit-chip, .hud-motion .hud-overflow` rule sat before the lower-specificity `.hud-overflow` / `.hud-overflow.is-hidden` rules.

### Exact edits

- `apps/client/src/spar/panel.test.ts`: replaced
  `const refs = buildSparPanel(of(root), () => {}, () => {})`
  with
  ```ts
  const refs = buildSparPanel(
    of(root),
    () => {},
    () => {},
  )
  ```
- `apps/client/src/ranch.css`: moved the unchanged rule
  ```css
  .hud-motion .kit-chip,
  .hud-motion .hud-overflow {
    pointer-events: auto;
  }
  ```
  from its position between `.hud-motion` and the `.hud-overflow` comment to immediately after `.hud-overflow.is-hidden { display: none; }` (former line 1171). No declarations changed.

### Re-run output

| Command | Exit | Result |
| --- | --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` | 0 | `bun test v1.4.4 (38afee6c8) 4x PARALLEL`; `63 pass`, `0 fail`, `143 expect() calls` across 4 files (`499.00ms`). |
| `bunx biome check apps/client/src/ranch.css apps/client/src/spar.ts apps/client/src/spar/panel.ts apps/client/src/spar/panel.test.ts apps/client/src/spar.css` | denied | Again `{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}`. Not retried or worked around; the primary's scoped result remains the authority for the two fixed diagnostics. |

- **Commit:** `b5c05509` — `style(hud): resolve phase 2 Biome diagnostics` (only `apps/client/src/ranch.css` and `apps/client/src/spar/panel.test.ts`).
- This evidence section is intentionally left uncommitted for the primary to collect. No full-gate command was run; no other behavior changed.

## Primary verification

The primary independently re-ran the scoped checks, inspected the final source delta, and exercised the UI through normal browser pointer/keyboard input before accepting Phase 2.

### Scope and static checks

- Clean tree before the checks; `git diff --name-only a47a539766591b84f74e9e59b800c6a298060fe6..HEAD` contained exactly the five approved source/test files plus this evidence file. No merge or user commit was present in the phase range.
- `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` → exit 0, **63 pass / 0 fail / 143 expect() calls**.
- `bunx biome check apps/client/src/ranch.css apps/client/src/spar.ts apps/client/src/spar/panel.ts apps/client/src/spar/panel.test.ts apps/client/src/spar.css` → exit 0, `Checked 5 files in 28ms. No fixes applied.`
- `(bun run verify && bun run build)` → exit 0: typecheck clean across all four workspaces, full unit suite green, Biome clean, voxel determinism green for every archetype stage and all five prop digests, and Vite build succeeded with only the pre-existing chunk-size advisory.

### Independent browser proof

A fresh `playwright-cli` session (`rm13-primary`) used the real Vite app and a save seeded through real sim exports.

- **Desktop Rename, 1440×900:** normal pointer click opened the inline editor and `document.activeElement` became `INPUT.creature-name-input`; Cancel restored the plate.
- **Desktop SPAR:** normal click opened `role="dialog"`, `aria-modal="true"`, `aria-labelledby="spar-heading"` resolving to “Sparring”, at `z-index: 70`. All 18 background siblings became both `inert` and `aria-hidden="true"`, and focus started inside the dialog.
- **Focus trap:** 24 consecutive Tab presses remained inside `.spar-overlay`; Escape closed the dialog, restored focus to `.spar-button`, and cleared all inert/aria-hidden state.
- **Portrait SPAR, 393×852:** the center hit was `SPAN.battle-title` inside `.spar-button` (`closest(".spar-button")` true), and a normal click opened the isolated dialog. No horizontal page overflow occurred. The panel extends below the viewport but scrolls internally, matching the recorded pre-existing sizing deviation.
- **Landscape SPAR, 852×393:** the same normal-click hit test and dialog opening passed; no page overflow occurred. The close button returned focus to SPAR and cleared isolation.
- **Scrim dismissal:** a real pointer click on the overlay outside the panel closed the dialog, restored SPAR focus, and cleared inert/aria-hidden state.
- **Full lifetime:** selecting Press hid the setup panel, showed the battle HUD, moved focus to `.spar-log-toggle`, and kept the dialog open with all 18 background siblings isolated. The battle completed through the result state while isolation remained active. “Back to the ranch” closed the dialog and restored SPAR focus with zero isolated siblings.
- **Console:** final warning-or-worse read returned `Total messages: 2 (Errors: 0, Warnings: 0)`.
- **Primary captures:** `primary-portrait-spar.png`, `primary-landscape-spar.png`, and `primary-desktop-result.png` under `.conductor/evidence/20261127-hud-pointer-modal-input/`. The browser session was closed.

### Corrections made during primary review

- Corrected the evidence’s source-file count from four to five.
- Corrected the layout claim: there is no horizontal page overflow, but the portrait panel itself extends below the viewport and scrolls internally; the evidence no longer claims the whole document fits within the viewport.

**Conclusion:** Phase 2 scope, automated checks, and real-browser interaction proof are green. FR-1–FR-5, AC-1–AC-4, NFR-1/NFR-2/NFR-5 are satisfied for this phase; ready for squash and acceptance.
