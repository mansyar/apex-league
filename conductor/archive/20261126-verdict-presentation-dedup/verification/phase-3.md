# Phase 3 Verification — Visual evidence and integrated gate

- **Track:** `20261126-verdict-presentation-dedup`
- **Phase:** 3 — Visual evidence and integrated gate
- **Date:** 2026-11-26
- **Branch:** `refactor/20261126-verdict-presentation-dedup`
- **Phase base:** `8db3f8242239a8a842f2a560d8e24ebeec28b85c`
- **Implementation head:** `8db3f8242239a8a842f2a560d8e24ebeec28b85c` (no production commits in this phase; Phase 3 is evidence-only)
- **Result:** verified

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify && bun run build` | 0 | Full stack green. Typecheck: `@apex/voxel`, `@apex/sim`, `@apex/server`, `@apex/client` all exit 0. Unit: `4581 pass`, `1 skip`, `0 fail`, `675842 expect()` calls, 4582 tests in 445 files (100.62 s). Biome: `Checked 1059 files in 1427ms. No fixes applied.` Determinism gate OK (byte-identical regeneration; e.g. draconic seed 42 baby, 233156 bytes, 3544 tris). Vite v8.3.4: 443 modules transformed; `dist/index.html` 2.13 kB, `dist/assets/lab-B2IkTbut.css` 1.05 kB, `dist/assets/index-D45x_3yC.css` 71.62 kB, `dist/assets/lab-Dah1iaAe.js` 6.80 kB, `dist/assets/index-BIKtLxEf.js` 1,109.29 kB (gzip 307.05 kB); built in 662 ms. Only the pre-existing >500 kB chunk-size warning. |
| `playwright-cli --version` | 0 | `0.1.22` |
| `bun run dev` (background, timeout `3600000`) | running | `VITE v8.3.4 ready in 381 ms`, `Local: http://localhost:5173/`. Left running for the primary (shell `sh_2161c297b001HAv4AvfWooLH5S`). |
| `playwright-cli open http://localhost:5173` | 0 | Browser `default` (pid 36844), page title `Apex League`. |
| `playwright-cli resize 1440 900` | 0 | `page.viewportSize()` = `{width:1440,height:900}` (done before `goto`/navigation). |
| `playwright-cli eval "(async () => { const m = await import('/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts'); let s = m.chooseStarter(m.createInitialState(), 'fire_drake', 42); s = { ...s, creature: m.evolveCreature(m.evolveCreature(s.creature)) }; m.saveGame(localStorage, s, Date.now()); return JSON.stringify({...}); })()"` | 0 | Champion `Ember Drake` (`stage: champion`, `archetypeId: draconic`, day 1) — real sim seams only. |
| `playwright-cli run-code "async page => { ... dismiss 'Got it', DOM-click Spar chip and 'Press' doctrine, DOM-click button.spar-fast, poll for .battle-stamp-show, read DOM ... }"` | 0 | Fight finished; spar HUD stamp visible with title `Victory — Ember Drake`, sub `A knockout finish.`, `role="status"`, `aria-live="polite"`. |
| `playwright-cli screenshot --filename=.conductor/evidence/20261126-verdict-presentation-dedup/spar-stamp-desktop.png` | 0 | Captured; vision-verified. |
| `playwright-cli console` (desktop, after all drives) | 0 | `Total messages: 2 (Errors: 0, Warnings: 0)`. |
| `playwright-cli -s=iphone open --device="iPhone 15"` | 0 | Preset reports `393×659`; forced resize required. |
| `playwright-cli -s=iphone resize 393 852` | 0 | `page.viewportSize()` = `{width:393,height:852}` before navigating/capturing. |
| `playwright-cli -s=iphone eval "(async () => { ... same champion seed ... })()"`, spar drive, `playwright-cli -s=iphone screenshot --filename=.../spar-stamp-iphone.png` | 0 | Same stamp copy/classes/ARIA as desktop; captured and vision-verified legible at 393 px. |
| `playwright-cli -s=iphone console` | 0 | `Total messages: 2 (Errors: 0, Warnings: 0)`. |
| `playwright-cli eval "(async () => { const m = await import('/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts'); let s = m.chooseStarter(m.createInitialState(), 'fire_drake', 42); while (s.day < 7) s = m.advanceDay(s); const session = m.forfeitCup(m.startCupSession(s.creature, s.day, 7)); m.saveGame(localStorage, s, Date.now(), session); return JSON.stringify({...}); })()"` | 0 | `{"day":7,"phase":"cup","name":"Ember Drake","status":"eliminated","championName":"Tidecaller Nibbles","bracketDay":7,"playerVerdicts":1,"completionVerdicts":2}` — real sim seam; `bracket.day === state.day` so `loadBoot` restores it. |
| `playwright-cli run-code "async page => { ... reload, DOM-click 'Enter Cup', read .cup-result-* DOM ... }"` | 0 | Results screen visible; flat-sibling stamp and copy recorded below. |
| `playwright-cli screenshot --filename=.../cup-results-stamp-desktop.png`, `playwright-cli -s=iphone screenshot --filename=.../cup-results-stamp-iphone.png` | 0 | Captured; vision-verified legible on both sizes. |
| `playwright-cli eval "(async () => { ... let session = m.startCupSession(s.creature, s.day, 7); m.saveGame(localStorage, s, Date.now(), session); ... })()"` + `playwright-cli run-code "async page => { ... getByRole('Enter Cup').click({force:true}); wait .cup-screen-bracket .cup-cta.show; bracket CTA click({force:true}); coach CTA click({force:true}); poll .battle-stamp-show; screenshot inside poll ... }"` | 0 | Cup battle HUD stamp visible during `cup-overlay cup-battling`: `Victory` / `A knockout finish.`, status/polite, four expected children. Captured at desktop and phone; vision-verified. |
| `playwright-cli close`, `playwright-cli -s=iphone close` | 0 | Both browser sessions closed. |
| `git diff --name-only 9209fcc926d564d0992d2e873059cdc2c585ca9c..HEAD` | 0 | 19 files — 11 client source/test, 8 Conductor state/evidence; no banned file class (see `integrated.md`). |
| `git status --short` | 0 | No output at check time (before the evidence files were written). Scratch screenshots are gitignored; both evidence files are intentionally left untracked/uncommitted for the primary. |

## Acceptance

| ID | Status | Evidence |
| --- | --- | --- |
| FR-6 | verified | Three required visual surfaces (spar stamp, cup results stamp, battle HUD stamp) captured at desktop `1440×900` and forced phone `393×852`; console clean in both sessions. |
| AC-5 | verified | Six screenshots exist under `.conductor/evidence/20261126-verdict-presentation-dedup/`; exact observed copy/DOM recorded below; `playwright-cli console` and `-s=iphone console` each `0 errors / 0 warnings`. |
| AC-6 | verified | `bun run verify && bun run build` exit 0; module-size guard green inside the unit suite (5 pass / 0 fail in Phase 2 evidence, still covered by the full suite); final diff has no banned file class. |
| NFR-1 | verified | Final diff touches only the 11 declared client source/test files plus Conductor state/evidence; no sim/cup-result computation, save/schema, voxel/determinism hash, dependency, lockfile, generated file, or audio cue-id change. |
| NFR-2 | verified | Client module-size cap (12,288 B) enforced by `apps/client/src/module-size.test.ts` stayed green in the full suite; no new module exceeds the cap. |
| NFR-4 | verified | Typecheck, Biome (1059 files), unit suite (4581 pass / 1 skip / 0 fail), determinism gate and Vite build all passed in the single integrated gate command. |

## Visual evidence — exact observed copy and DOM

### Spar / battle HUD stamp, desktop 1440×900

- Root: `.battle-stamp battle-stamp-show battle-stamp-in`; `role="status"`, `aria-live="polite"`; HUD `display: flex`.
- Children in order: `.battle-stamp-title`, `.battle-stamp-rule` (empty), `.battle-stamp-sub`.
- Title: `Victory — Ember Drake`; subline: `A knockout finish.` (`reasonLine`, knockout path).
- Screenshot: `.conductor/evidence/20261126-verdict-presentation-dedup/spar-stamp-desktop.png`.
- Reached by DOM `.click()` on the Spar chip and `Press` doctrine, then DOM `.click()` on `button.spar-fast`; the stamp persists after the fight (no auto-close), so no hold race.

### Spar / battle HUD stamp, phone 393×852

- Same classes, ARIA, child order, title `Victory — Ember Drake` and subline `A knockout finish.`; legible on-screen.
- Screenshot: `.conductor/evidence/20261126-verdict-presentation-dedup/spar-stamp-iphone.png`.

### Cup results stamp, desktop 1440×900

- Stamp root: `.cup-result-stamp lost`, **zero children** — title/rule/sub are FLAT SIBLINGS of `.cup-result-card kit-surface play`.
- Sibling order: `cup-result-stamp lost`, `cup-result-title`, `cup-result-rule`, `cup-result-sub`, `cup-result-plate kit-line`, `cup-result-rewards`, `cup-cta-go`.
- Card layout preserved: computed `flex-direction: column`, `gap: 14.4px` (= `1cqw` of the 1440 px container).
- Title: `Eliminated`; subline: `Tidecaller Nibbles takes the Bronze Cup.`; no `role`/`aria-live` on the stamp root.
- Placement tab: `4th`; plate line: `Ember Drake · out in the quarterfinal`.
- Rewards: `Consolation: mood +2`; `Forfeit — no ladder points`.
- Single combined announcement: `.ui-announcer` = `Eliminated! Tidecaller Nibbles takes the Bronze Cup. Ember Drake, out in the quarterfinal.`; `document.activeElement` = `Back to the ranch`.
- Screenshot: `.conductor/evidence/20261126-verdict-presentation-dedup/cup-results-stamp-desktop.png`.

### Cup results stamp, phone 393×852

- Identical title/sub/placement/reward copy and flat-sibling DOM; card `flex-direction: column`, `gap: 8px` (= `1cqw` of the scaled 800 px container), announcer unchanged; legible at 393 px.
- Screenshot: `.conductor/evidence/20261126-verdict-presentation-dedup/cup-results-stamp-iphone.png`.

### Cup battle HUD stamp, desktop 1440×900

- Captured during `cup-overlay cup-battling`: root `.battle-stamp battle-stamp-show battle-stamp-in`, `role="status"`, `aria-live="polite"`, children `.battle-stamp-title`, `.battle-stamp-rule`, `.battle-stamp-sub`.
- Title: `Victory` (rendered uppercase `VICTORY` by existing CSS); subline: `A knockout finish.` — the flow-specific cup title from shared copy, with unchanged `reasonLine` subline.
- Screenshot: `.conductor/evidence/20261126-verdict-presentation-dedup/cup-battle-stamp-desktop.png`.

### Cup battle HUD stamp, phone 393×852

- Same classes, ARIA, child order, title `Victory` / `VICTORY` and subline `A knockout finish.`; legible at phone width.
- Screenshot: `.conductor/evidence/20261126-verdict-presentation-dedup/cup-battle-stamp-iphone.png`.

## Deviations

- **Scratch artifacts:** gitignored `.conductor/evidence/20261126-verdict-presentation-dedup/` holds `README.md` plus the six PNGs above; no production, test or CSS file was touched in this phase.
- **DOM `.click()`:** used to dismiss the `Got it` onboarding tip and to open Spar / select `Press` / click `button.spar-fast`, where HUD/onboarding tips intercept pointer input. Cup drives used Playwright `locator.click({ force: true })` / `getByRole(...).click({ force: true })` after the bracket CTA visibly settled; all drive actions are recorded above.
- **Seeding:** no hand-crafted JSON. Every save was produced only through real sim exports imported from `/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts`: `chooseStarter`, `createInitialState`, `evolveCreature`, `advanceDay`, `startCupSession`, `forfeitCup`, `saveGame` (key `apex.save`, version 26). Exact seams are quoted in the commands table.
- **Cup results path:** the UI give-up route was attempted first, but the bracket `Back to the ranch` button took the `"free"` close intent (`mem.committed` false) instead of opening the give-up modal, so a finalized session was seeded via `forfeitCup` and restored through `loadBoot`; `Enter Cup` then walked straight to results.
- **Viewport forcing:** the iPhone 15 device preset reports `393×659`; `resize 393 852` was issued before navigation/capture and `page.viewportSize()` confirmed `{width:393,height:852}`.
- **Camera:** no `setArenaCamera` override was used; the arena's default presentation was captured.
- **Dev-server state:** `bun run dev` remains running in the background for the primary at `http://localhost:5173/`; both `playwright-cli` sessions were closed. An earlier 120 s-timeout dev-server run was killed by SIGTERM (exit 143) and superseded by the current long-running one.
- **Intermediate capture retries:** one `run-code` failed with `ReferenceError: page is not defined` because `page.viewportSize()` was called inside `page.evaluate`; corrected by reading the viewport in the outer `run-code` scope. An early cup-battle screenshot landed after the stamp hold expired and was overwritten by an in-poll screenshot; the final PNGs were vision-verified.
- **Commits:** none in this phase. Both evidence files are left uncommitted for the primary to append primary verification and squash.

## Notes

- `bun run verify && bun run build` is the single gate authority for AC-6/NFR-4; the module-size guard runs inside its unit suite.
- The stamp root for cup results intentionally carries no ARIA attributes; the existing combined `.ui-announcer` line remains the single announcement path and is unchanged.
- `## Primary verification` is reserved for the primary after its own gate run and review.

## Primary verification

Phase 3 made no commits; `git diff --name-status 8db3f8242239a8a842f2a560d8e24ebeec28b85c..HEAD` was empty and the only tracked changes were the two untracked evidence files. The primary re-ran `(bun run verify && bun run build)` → exit 0, with determinism green for all archetype GLBs and 5 props and the Vite build emitting `index-BIKtLxEf.js` with only the pre-existing chunk warning. Independent image analysis of all six PNGs confirmed the spar title/sub `VICTORY — EMBER DRAKE` / `A knockout finish.`, the cup battle HUD stamp `VICTORY` / `A knockout finish.`, and cup results `Eliminated` / `Tidecaller Nibbles takes the Bronze Cup.` on desktop and forced iPhone 15. The cup result rows remain visibly separated by the original card gap, consistent with the flat-sibling DOM pinned in Phase 2. See `verification/integrated.md` for the full track-level conclusion.
