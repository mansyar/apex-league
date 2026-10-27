# Phase 1 Evidence — Modal system + z-index tokens

- Track: 20261027-ui-cleanliness-clarity-pass — UI Cleanliness & Clarity Pass
- Phase: 1 (FR-1, FR-2; AC-1, AC-2; NFR-4 keyboard, NFR-5 screenshots, NFR-6 kit language)
- Date: 2026-10-27
- Branch: refactor/20261027-ui-cleanliness-clarity-pass
- Base: 12234b93870cb411bb0ff142c518f14dd639996b
- Head: primary-verified green (see Verification); commits below
- Result: complete — all layers green, evidence captured, no deviations beyond
  those listed (all recorded)

## What was built

**P1.T1 — Shared helper (`apps/client/src/ui/modal.ts`, new) + unit tests
(`apps/client/src/ui/modal.test.ts`, new).** `openModal(root, opts)` owns:
revealing via the `is-hidden` class, one-shot wiring of focus-trap (reuses
`ui/focus.ts`), scrim-click close (default on), Escape close with
`stopPropagation` (default on; blocking dialogs pass `false`), opener capture,
and `initialFocus` (else first focusable in box). `closeModal(root, opts)`
is idempotent (no-op when already hidden: no notify, no focus move), runs the
stored `onClose` cleanup, then returns focus to the opener when still
connected, else falls back to `document.body` (made focusable). `isModalOpen`
reads the class for cup Escape mirrors.

**P1.T2 — All ~14 overlays migrated** (no `style.display` writes remain on any
migrated modal path; no per-overlay trap/scrim/Escape/opener code remains):
creature-detail, stable (+`bring` commit uses `returnFocus:false`),
gift, handbook, settings-modal, hud/settings reset modal (new `open()`; shell
calls it), recovery (blocking: both dismisses off), save-transfer, graduation
confirm + Hall (`graduation/modal.ts` shell only; `wireModal`/`openerElement`
removed, `flow.ts` uses the helper), nursery (box = root; commit `close()`
skips focus handoff), board panel (close invalidates the fetch generation via
`onClose`), cloud panel, cup overlay (`cup.ts` + `cup/entry.ts`; trap via
helper, Escape stays on the Back mirror, no scrim-out), give-up (`cup/screens/
giveup.ts` builder is DOM-only; `cup.ts` opens via helper with
`dismissOnScrim:false`, Escape returns to the opener). `cup/arena.ts` hides
the give-up through the helper on arena entry.

**P1.T3 — `--z-*` tokens in `ui/kit.css` `:root`** (`--z-battle:1`,
`--z-cup-inner:2`, `--z-bar:10`, `--z-tip:20`, `--z-sheet:30`, `--z-veil:40`,
`--z-dock:45`, `--z-cup:50`, `--z-notice:60`, `--z-grad:65`, `--z-modal:70`,
`--z-failure:80`); all 15 `z-index` declarations (base, battle-hud ×2, cup
×3, graduation, nursery, ranch ×2, spar, kit ×3, gallery inline) read tokens.
`grep -rn "z-index" apps/client/src` shows only `var(--z-*)` usages plus the
token-definition comment and one prose comment in `main.ts`. Kit also hides
every overlay root wearing `is-hidden` (kit-modal, cup-overlay, cup-giveup,
starter-overlay).

## Verification

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static+unit+determinism | `bun run verify && bun run build` | 0 (primary re-run) | check clean all packages (446 client files); 3308 pass, 1 skip, 0 fail; Biome clean (786 files); determinism gate OK (12 species × 3 stages + 5 props); build succeeds (353 modules). The primary fixed 3 migration leftovers the subagent could not verify: stray `return`+brace in `hud/settings.ts`, unused `close` param in `cup/screens/giveup.ts`, assignment-in-expression in `ui/modal.ts`, plus pretty-printed track `metadata.json` and a trailing newline in `p1-visual-report.json`. |
| visual | Playwright (primary): real local stack — server :3002 (fresh sqlite), client dev :5175 with `VITE_API_ORIGIN`, Chromium 1248 headless, desktop 1280×800 + mobile 393×844 | 0 errors | Draft → pick Ember Drake → all six ranch overlay classes opened via chips/plate (settings, handbook, stable, board, cloud, creature-detail), each screenshot open, each closed via Escape with 0 `.kit-modal:not(.is-hidden)` remaining; console + pageerror clean on both viewports. PNGs: `p1-{desktop,mobile}-{starter,ranch,settings,handbook,stable,board,cloud,creature-detail}-open.png`; machine report `p1-visual-report.json`. |
| grep AC-1 | `grep -rn "\.style\.display" <migrated modal files>` | — | Remaining writes are all non-modal paths deferred to Phase 2 P2.T4 (stable-chip visibility, sign-out row, cup screens/chips/chrome, boss-intro) — none on migrated open/close paths. |
| grep AC-2 | `grep -rn "z-index" apps/client/src` | — | Only `var(--z-*)` usages plus the token-definition comment and one prose comment in `main.ts`. |

`ui/modal.test.ts` (8 tests: open class+focus, close class+return-focus,
Escape, scrim vs inside click, unmounted-opener fallback to body, blocking
dialog ignores Escape+scrim, onClose exactly-once, commit close skips
handoff) and updated `board/panel.test.ts` (class assertions) plus
`creature-detail.test.ts` (fake `fire` injects `stopPropagation`) all pass
in the suite above.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Each overlay opens/closes via the helper; Escape, scrim-click, return-focus work; no `style.display` on migrated paths | code + Playwright run (6 classes × 2 viewports: openModals 1, afterEscape 0, 0 console/page errors) + grep as above | pass |
| AC-2 | `grep z-index` shows only token usages + definitions | grep as above | pass |

## Primary visual observations (carried forward, not Phase 1 findings)

- At 1280×800 the day-phase score bug (`DAY PHASE / DAY 1 / AP / BRONZE III`)
  sits behind the `BOARDS` chip row — chips and the score bug overlap. This is
  the pre-existing absolute-positioning sprawl Phase 4 (P4.T1, grid/flow
  areas) is scoped to fix; no action in Phase 1.
- The graduation egg and nursery screens reuse `.starter-overlay` /
  `.starter-grid` / `.starter-card` classes (hidden until used). Any future
  test automation must scope starter selectors to
  `.starter-overlay:not(.graduation-overlay)` — the Phase 1 capture script
  learned this the hard way.

## Deviations (required by the phase goal)

- Files outside the `Touches` glob but named in P1.T2.1/P1.T2.2 were migrated
  with the smallest change: `creature-detail.ts`, `recovery.ts`,
  `save-transfer.ts`, `graduation/flow.ts`, `graduation/egg.ts` (untouched:
  screen, not dialog), `graduation/nursery.ts`, `graduation/hall.ts`
  (untouched), `cup.ts`, `cup/entry.ts`, `cup/arena.ts`, `hud/settings.ts`,
  `hud/shell.ts` (one-line: reset `open()`), `spar`-adjacent `battleUI.ts`
  re-export kept (spar out of scope), `base.css`, `battle-hud.css`, `cup.css`,
  `graduation.css`, `nursery.css`, `ranch.css`, `spar.css` (z tokens only),
  `creature-detail.test.ts` (fake `fire` stopPropagation).
- Deferred to Phase 2 (P2.T4 visibility work), still `style.display`: spar
  overlay + panel, cup screens/close/chips/boss-intro, HUD plates/dock/
  hints/callout/rename rows, sign-out row, cup-button chip, stable/gift chips,
  ghost-section inline states, graduation egg screen.
- No commits created: `git` via shell is denied to this executor.

## Notes

- `openModal` captures the opener itself; call sites dropped their locals.
- Cup overlay keeps manual focus restore in `closeFree` (opener → else chip)
  because it is richer than the body fallback; the helper is called with
  `returnFocus:false` there.
- Import order normalized to Biome organize-imports in every touched file;
  formatting kept to the 80-col, no-semicolon style by hand — the primary
  must run the real gates.
