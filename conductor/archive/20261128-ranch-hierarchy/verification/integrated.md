# Integrated Verification — Track 20261128-ranch-hierarchy

- Track: rework mobile ranch hierarchy and make action state, costs, and disabled reasons explicit
- Branch: `refactor/20261128-ranch-hierarchy`
- Date: 2026-11-28
- Final phase head: `93e8a927dda32d4eff6802498d72c11a0cd6ea61`
- Overall result: **verified** (full gate green, browser matrix captured, no source changes in phase 3)

## Full gate

`bun run verify && bun run build` exited 0:

- Unit suite: 4671 pass, 1 skip, 0 fail (4672 tests across 447 files, 685446 `expect()` calls, 139.24s; re-run at the final evidence head: 138.71s).
- Static: `bun run check` and Biome clean (1066 files, no fixes applied).
- Determinism: green for all 18 creatures and 5 props.
- Build: Vite transformed 443 modules in 493ms (441ms on the final re-run); `dist/index.html` 2.13 kB, CSS 73.48 kB, JS 1117.52 kB (gzip 310.27 kB). The >500 kB chunk-size notice is non-fatal.
- Module-size caps and all phase-level named checks remain green.

## Cross-phase regression summary

| Phase | Scope | Named check | Result |
| --- | --- | --- | --- |
| 1 — Dock inline state | Care/train inline state, cost and reason; traceability; metadata-format rework | `bun test --check --parallel=4 --timeout 120000 apps/client/src/hud/dock.test.ts apps/client/src/hud/programs.test.ts apps/client/src/hud/copy.test.ts apps/client/src/hud/plates.test.ts` | 162 pass, 0 fail, 388 `expect()` calls. |
| 2 — Chips, summary, grouping | Chip state/reasons on every gating path; eve-of-advance facts; dock emphasis grouping | `bun test --check --parallel=4 --timeout 120000 apps/client/src/cup/view-models.test.ts apps/client/src/spar/panel.test.ts apps/client/src/stable.test.ts apps/client/src/app/hud-screen.test.ts` | 82 pass, 0 fail, 244 `expect()` calls. |
| 3 — Integrated gate | Full gate plus browser matrix | `bun run verify && bun run build` | 4671 pass, 1 skip, 0 fail; Biome and determinism green; build green. |

Both prior named checks were re-run during phase 3 with the same results, so no cross-phase regression was observed. Phase 1's earlier full-`verify` Biome block on a one-line `metadata.json` was superseded by the later green gate; no outstanding failure remains.

## Browser matrix summary

Browser: `playwright-cli` session `ranchmatrix` against `bun run dev` at `http://localhost:5173`. Console for the session: 0 errors, 0 warnings.

| Viewport | Still(s) | h-scroll | Interactive geometry | Explicitness |
| --- | --- | --- | --- | --- |
| 393x852 portrait | `ranch-393x852.png`, `ranch-393x852-touch.png`, `ranch-393x852-cupday.png`, `ranch-393x852-chips.png` | `scrollWidth === 393` on document and body | `offscreen: []` in captured normal states | Feed/Rest/Play `Ready · 1 AP`, Treat `Unavailable · 1 AP · Not sick — save the medicine.`, train `Ready · 1 AP`, spar `Ready`, cup day `Ready · Cup day`, stable `Open · Empty`, eve-of-advance summary — all as visible DOM text, not `title` tooltips. Touch emulation (`hover: none`, `pointer: coarse`, 5 touch points) reported every state line `visible: true`, `hovered: false`. |
| 852x393 landscape | `ranch-852x393.png`, `ranch-852x393-summary.png` | `scrollWidth === 852` on document and body | `offscreen: []` after the dock's internal scroll; CTA/summary fully in view in the second still | Spar and stable chip states, all care lines and train line visible; short-landscape dock scrolls internally to reveal Advance Day and summary. |
| 1440x900 desktop | `ranch-1440x900.png` | `scrollWidth === 1440` on document and body | `offscreen: []` | Spar `Ready`, stable `Open · Empty`, all care states, train `Ready · 1 AP`, Advance Day CTA and eve-of-advance summary visible together. |

Additional checks: dock `aria-expanded` toggles `true -> false -> true` by keyboard, More overflow opens with `aria-expanded: true` and Escape closes it and returns focus to the toggle; with `prefers-reduced-motion: reduce`, computed `animationName` on `.score-bug` is `none`.

## Residual risks

1. **Phone overflow + dock simultaneously open (R1).** At 393px, leaving the floating More overflow panel open while expanding the Actions dock paints the overflow panel over the top care buttons. The captured evidence states open one panel at a time, so no interactive is occluded there; correcting the simultaneous-open case needs a source/CSS change and belongs in a follow-up, not this evidence-only phase.
2. **Short-landscape dock scroll (R2).** At 852x393 the dock content exceeds its deliberate `max-height` and scrolls internally; the CTA and summary are reachable by scrolling and are shown in a second still. This is existing design behavior, not a new regression.
3. **Browser fixture (R3).** The cup-day still uses a temporary localStorage fixture (`state.day = 7`, `state.phase = "cup"`) in the browser session only; no save code or persisted project data was changed, and the session was returned to day 1 afterward.
4. **Chunk size (R4).** The production JS bundle exceeds Vite's 500 kB warning threshold. This is non-fatal and unchanged by this track.

## Conclusion

All five acceptance criteria and three non-functional requirements have evidence in `phase-3.md`. The full gate is green, the committed stills cover the required viewports and explicitness, and touch-viewport checks confirm no state, cost or reason is hover-only. No phase-3 deviations occurred.
