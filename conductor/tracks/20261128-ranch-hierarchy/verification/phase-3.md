# Phase 3 Verification — Integrated gate + visual matrix

- Track: `20261128-ranch-hierarchy` — Rework mobile ranch hierarchy and make action state, costs, and disabled reasons explicit
- Phase: 3 — Integrated gate + visual matrix (AC-5, AC-6, NFR-1, NFR-2, NFR-3)
- Date: 2026-11-28
- Branch: `refactor/20261128-ranch-hierarchy`
- Base commit: `93e8a927dda32d4eff6802498d72c11a0cd6ea61`
- Head commit: `93e8a927dda32d4eff6802498d72c11a0cd6ea61`
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | ---: | --- |
| Full gate | `bun run verify && bun run build` | 0 | 4671 pass, 1 skip, 0 fail (4672 tests / 447 files, 685446 `expect()` calls, 139.24s); Biome checked 1066 files clean with no fixes; determinism green for 18 creatures and 5 props; Vite transformed 443 modules and built in 493ms (`dist/index.html` 2.13 kB, CSS 73.48 kB, JS 1117.52 kB / gzip 310.27 kB). Only the non-fatal >500 kB chunk-size warning. |
| Phase 1 no-regression | `bun test --check --parallel=4 --timeout 120000 apps/client/src/hud/dock.test.ts apps/client/src/hud/programs.test.ts apps/client/src/hud/copy.test.ts apps/client/src/hud/plates.test.ts` | 0 | 162 pass, 0 fail, 388 `expect()` calls (401ms). |
| Phase 2 no-regression | `bun test --check --parallel=4 --timeout 120000 apps/client/src/cup/view-models.test.ts apps/client/src/spar/panel.test.ts apps/client/src/stable.test.ts apps/client/src/app/hud-screen.test.ts` | 0 | 82 pass, 0 fail, 244 `expect()` calls (1339ms). |
| Browser matrix | `playwright-cli -s=ranchmatrix resize <w> <h>` + `run-code --filename .conductor/evidence/phase3/probe.js` + `screenshot --filename conductor/tracks/20261128-ranch-hierarchy/verification/<still>.png` | 0 | At 393x852, 852x393 and 1440x900: `document.documentElement.scrollWidth === innerWidth`, `document.body.scrollWidth === innerWidth`, `offscreen: []` for visible interactive elements in the captured state, and `titleOnly: []`. Console: 0 errors, 0 warnings. |
| Touch viewport | `playwright-cli -s=ranchmatrix run-code --filename .conductor/evidence/phase3/touch-probe.js` | 0 | CDP touch emulation: `navigator.maxTouchPoints = 5`, `(hover: none)` and `(pointer: coarse)` both true. Every visible `--state` line (care, train, spar, stable, advance summary) reported `visible: true`, `hovered: false`, empty `title`; no state is hover-only. |
| Keyboard / ARIA | `playwright-cli -s=ranchmatrix run-code --filename .conductor/evidence/phase3/keyboard-aria.js` | 0 | Dock head `aria-expanded`: `true -> false -> true` on Enter/Enter; More toggle `aria-expanded: true` when its panel opens; Escape hides the panel and returns focus to the toggle. |
| Reduced motion | `playwright-cli -s=ranchmatrix set-reduced-motion reduce`, then `eval "() => ({...})"` | 0 | `(prefers-reduced-motion: reduce)` true; computed `animationName` on `.score-bug` is `none`. Emulation cleared afterward. |

The local probe scripts are kept under the gitignored `.conductor/evidence/phase3/` directory; the committed stills are listed below.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-5 | On touch viewports no state/cost/reason is available only via `:hover`. | `touch-probe.js` under emulated `hover: none`, `pointer: coarse`, 5 touch points: all care lines (`Ready · 1 AP`, `Unavailable · 1 AP · Not sick — save the medicine.`), train line, spar/stable chip states and the eve-of-advance summary are visible with `hovered: false` and no `title`; still `ranch-393x852-touch.png`. | Verified |
| AC-6 | Full gate (`verify` + `build`) green plus browser-matrix stills committed. | Gate command exit 0 with 4671 pass / 1 skip / 0 fail, Biome clean, determinism green, build success; seven PNGs under `verification/` shown as untracked by `git status --short` (not ignored) and staged for the state commit. | Verified |
| NFR-1 | 393px portrait + landscape and 1440px desktop: no h-scroll, no occluded interactives, clean console. | Per-viewport probes: `sw === innerWidth` (393/393, 852/852, 1440/1440), `offscreen: []` in the captured normal state; console 0 errors / 0 warnings. Short landscape keeps the CTA and summary inside the dock's intentional internal scroll (`scrollTop 91`, `scrollHeight 362`, `clientHeight 271`), proven by `ranch-852x393.png` and `ranch-852x393-summary.png`. See residual risk R1. | Verified with residual risk |
| NFR-2 | Reduced-motion honored; keyboard flows and aria state keep working. | Reduced-motion check (`animationName: none`), keyboard/ARIA check (`aria-expanded` toggles, Escape closes overflow and restores focus), plus the green full unit suite. | Verified |
| NFR-3 | No sim/dependency/save changes; client module-size caps stay green. | Phase 3 changed no source, tests, CSS, dependencies or save code (browser save fixture only for the cup-day screenshot); the full gate's module-size checks are green. | Verified |

## Evidence paths

- `conductor/tracks/20261128-ranch-hierarchy/verification/ranch-393x852.png` — phone portrait, dock open: care state/cost/reason, train state, spar chip and eve-of-advance summary.
- `conductor/tracks/20261128-ranch-hierarchy/verification/ranch-393x852-touch.png` — same viewport under touch emulation (`hover: none`, 5 touch points).
- `conductor/tracks/20261128-ranch-hierarchy/verification/ranch-393x852-cupday.png` — cup-day fixture (day 7, phase `cup`): spar + cup chip states and "Continue past cup" CTA with inline summary.
- `conductor/tracks/20261128-ranch-hierarchy/verification/ranch-393x852-chips.png` — overflow open showing the stable chip's inline state; the floating panel sits over the creature plate's non-interactive stats in this combination.
- `conductor/tracks/20261128-ranch-hierarchy/verification/ranch-852x393.png` — landscape top of dock: spar and stable chip states, care costs/reasons, train state.
- `conductor/tracks/20261128-ranch-hierarchy/verification/ranch-852x393-summary.png` — same viewport after the dock's internal scroll: Advance Day CTA and eve-of-advance summary fully in view.
- `conductor/tracks/20261128-ranch-hierarchy/verification/ranch-1440x900.png` — desktop: spar/stable chip states, all care lines, train state, Advance Day CTA and summary visible together.
- Local, gitignored probe scripts: `.conductor/evidence/phase3/probe.js`, `touch-probe.js`, `keyboard-aria.js`, `scroll-dock.js`, `cupday.js`, `day1.js`.

## Deviations

None. No source, test, CSS, dependency or save changes were needed; the gate was green on the first run.

## Notes

- R1 (residual): on a 393px phone, if the More overflow panel is left open while the Actions dock is expanded, the floating overflow panel paints over the top care buttons. The captured normal states open one bottom sheet at a time (`ranch-393x852.png` has More closed; `ranch-393x852-chips.png` has the dock hidden), so no interactive is occluded in the evidence states. Fixing the simultaneous-open case would require a source/CSS change and is out of scope for this evidence-only phase.
- R2 (residual): at 852x393 the dock deliberately scrolls internally (`overflow-y: auto`, `max-height: calc(100dvh - 146px)`); the CTA and summary are reachable by scrolling and are shown in the second still. No page-level horizontal scroll occurs.
- The dev server and browser session were local tooling only; no network or product decisions were made. Track-level roll-up is in `verification/integrated.md`.
