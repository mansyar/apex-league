# Phase 4 evidence — ranch stack flow/grid (P4.T1, P4.T1.1, P4.T2)

## Files changed
- `apps/client/src/ranch.css` (in touches)
- `apps/client/src/hud/shell.ts` (in touches)
- `apps/client/src/hud/overflow.ts` (DEVIATION 1)
- `apps/client/src/hud/update.ts` (DEVIATION 2)
- `apps/client/src/hud/types.ts` (DEVIATION 3)
- `apps/client/src/hud.ts` (DEVIATION 4)

## Design (why this shape)
The phone/landscape clearance below the right-column chips (score/spar/cup)
is owned by other surfaces' absolute seats (out of scope), so no static CSS
can name it without reintroducing magic numbers. The responsive tiers therefore
use real flow/grid for everything whose geometry is self-contained, plus ONE
measured inline `margin-top` on the lineage row (same pattern as the existing
`seatOverflowBelow`): no px literals in source, no `:has()` nudges, follows
real chip geometry on every paint/resize/font-arrival/fold.

- Desktop (1280x800): `.hud-ranch` is `display: contents`; every absolute
  seat (score 16, motion 18, lineage 100, callout 146) is byte-identical.
- Phone (<=767.98px): `.hud-ranch` is an absolute inset-0 grid
  (motion / lineage / callout / stack rows, 8px gaps, 14px+safe padding);
  lineage margin-top is measured below score/spar/cup; callout and stack
  flow below lineage, so expansion pushes them by construction.
- Landscape (landscape + max-height 500px): `.hud-ranch` is an absolute
  inset-0 flow block; lineage margin-top is measured below motion and the
  visible callout; plates keep corner pins + height caps; callout rides the
  yard on a viewport-proportional seat (`top: calc(18% + safe)`, ~71px at
  393 tall, replacing the 72px device-pinned seat).

## Per-task summary
- P4.T1 (grid/flow areas): DONE — `.hud-ranch` wrapper (shell.ts, exposed as
  `refs.ranch`); callout appended into it (hud.ts 1 line); grid areas on
  phone, flow on landscape, `display: contents` on desktop.
- P4.T1.1 (remove absolute + `:has()` nudges + hardcoded tops): DONE —
  removed phone `top: 228/176/226px`, `:has()` 260/258px rules, landscape
  `top: 158/72px`, and stale gift-conditional comments. Remaining `top:`
  hits are desktop base seats, score margin, `%` seat, display-only rules.
- P4.T2 (gift-chip + callout safety sweep): DONE — gift chip untouched
  (still folds in the overflow panel, `is-hidden` class, no inline display);
  no gift-conditional seats exist anywhere; callout flows (phone) or rides
  a proportional seat (landscape), never overlapping by construction.

## Deviations from Touches (all minimal, justified)
1. `hud/overflow.ts`: hosts `seatRanchFlow()` — shell.ts is at
   11792/12288 B and cannot fit it; overflow.ts already owns measured
   seating (`seatOverflowBelow`) and its resize/font/rAF triggers.
2. `hud/update.ts`: +2 lines (import + per-paint `seatRanchFlow` call in the
   existing `reseatOverflow`) — covers chip appear/disappear, starter
   reveals, tier crossings, and hint visibility without new listeners.
3. `hud/types.ts`: +2 lines (`HudRefs.ranch`) — required by the wrapper.
4. `hud.ts`: 1 line (`shell.refs.ranch.append(hints.root)`) — the callout
   MUST share the flow parent; nothing else can give it flow siblings.

## Self-review
- AC-10 grep: no `:has()` positional rules left in ranch.css (kept: fold
  display rule, stable-pet layout rules — neither positional); no px `top:`
  in phone/landscape queries; no `[style*=`; no `:has(.gift-chip`.
- gift.test.ts gates hold by inspection (gift.ts untouched; CSS gates above).
- NFR-2: shell.ts delta ≈ +5 lines (~150 B, est. ~11942/12288 — primary to
  confirm via `bun run verify`); overflow/update/types/hud deltas tiny.
- NFR-4/keyboard: DOM order (motion, lineage, stack, callout) matches visual
  order; focus order preserved; hidden states still `display:none`.
- Reduced motion: measured seats apply instantly; no transitions added.
- `is-hidden` stays `display:none`; callout keeps `style.display` toggling
  (pre-existing, untouched).
- Could NOT verify (no shell/browser): `bun run verify`, `bun run build`,
  all visual states. No commits made (per executor rules).

## Primary verification (2026-10-27, post-executor fix rounds)

Gate: `bun run verify` green (typecheck clean all packages, 3308 pass /
0 fail, Biome clean, determinism gate OK) + `bun run build` exit 0
(pre-existing chunk-size warning only). `gift.test.ts` zero-`:has(.gift-chip`
rule holds. Module caps hold (module-size suite green).

Three primary-side fix rounds (all inside the phase Touches + deviations):

1. **Squat-tier seat was body-flow garbage.** The executor's landscape
   "flow block" never set `display` on `.hud-ranch`, so the wrapper stayed
   `display: contents` and the static lineage fell into body flow after the
   yard canvas (measured top 379–482px — off-screen at 393 tall; expanding
   vs collapsing jumped 300px between runs). Fix: squat lineage pins with
   an absolute measured `top` below the lowest visible anchor
   (motion cluster / visible callout), `seatRanchFlow` squat branch sets
   `style.top` and clears `marginTop` (phone branch does the inverse).
   Seating is deterministic across runs now (144.73px in all four
   landscape states).
2. **Squat pointer-events blackout.** The full-viewport squat wrapper sets
   `pointer-events: none` but only the lineage re-enabled hits — the More
   toggle and Got-it button went dead under the yard canvas at 852x393
   (probe: `elementFromPoint` at the toggle center hit CANVAS).
   Fix: `.hud-ranch > .hud-motion, .hud-ranch > .hud-callout` re-enable
   `pointer-events: auto` in the squat tier.
3. **Seat measured before the callout appeared.** `reseatOverflow()` ran
   before `hints.sync(state)` in the paint pass, so the paint that first
   showed the day-one hint seated below a hidden callout (120px seat
   overlapping the 71–137px banner); the stale seat survived until the
   next paint. Fix: `reseatOverflow()` moved after `hints.sync(state)` —
   seats now measure after every visibility change in the same pass.

Design note (supersedes "flow on landscape" above): the transparent
wrapper leaves no flow to push with, so the squat tier pins instead of
flowing — same measured-seat pattern as the overflow panel, still zero
hardcoded tops (the `top: 18px` stylesheet origin is the pre-paint
fallback only; `seatRanchFlow` overwrites it on paint/rAF/font/resize/
fold-change).

Visual matrix (Playwright, `errors: []` — zero console/page errors):
8 shots + report `p4-matrix-report.json`.
- Portrait 393x844 x gift hidden/shown x lineage shut/open: lineage
  margin 65px / 51px (gift folds in the shut panel, moves nothing);
  lineage/callout/stack keep 8px+ gaps; expanding lineage pushes
  siblings by construction. PASS, no overlaps.
- Landscape 852x393 x gift hidden/shown x detail open/shut: lineage
  pins at 144.73px below the visible callout in all four states;
  plate + dock keep corner seats; no overlaps. PASS.
- Desktop 1280x800: chrome identical to P3-final (score bug, chips,
  open More panel, callout, creature plate, dock). PASS, no regression.
  (Desktop snaps need a 1.5s settle wait — earlier snaps caught the
  boot settle animation mid-flight, a capture artifact, not a bug.)

AC-10 verdict: no `:has()` positional nudges and no hardcoded ranch tops
remain. Residuals are out of scope or non-positional: desktop base seats
(unchanged by design), score-bug phone seat (out of scope), `100%+6px`
overflow-panel fallback (relative), `18%` landscape callout seat
(proportional, not device-pinned), `:has()` fold/stable rules
(visibility/layout, not seats).
