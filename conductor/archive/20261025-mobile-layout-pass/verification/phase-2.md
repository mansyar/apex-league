# Phase 2 — Landscape & dock adaptation

- **Track**: 20261025-mobile-layout-pass
- **Phase**: 2 (Landscape & dock adaptation)
- **Date**: 2026-10-25
- **Branch**: `feat/20261025-mobile-layout-pass`
- **Base**: `2885c268` (phase 1 in-progress marker; feature base of this phase's work: post-`9e4e7b12`/`663720a6`)
- **Head**: `1265b47f`
- **Commits**: `8698a7ef` (P2.T1 dock collapse), `ab05b643` (P2.T2 landscape ranch/hud), `1265b47f` (P2.T2 callout seat fix-up)

## Result

**Verified.** All Phase-2 acceptance criteria met with live measurements: the
ranch day view passes the measurable bar at 852×393 (no horizontal scroll, no
panel over an interactive element or the scene's action area, legible text,
clean console), the dock collapses by default on phone widths and stays open
on tablet/desktop, portrait (393×852) and the desktop/tablet guards show no
regression, and the console is clean at every audited viewport.

## How the bar was met

### P2.T1 — dock collapse (FR-7, AC-5)

- `hud/dock-collapse.test.ts` written **failing first** (`bun test` →
  `Cannot find module './dock-collapse'`, 0 pass / 1 fail) before any
  implementation existed. After implementing: 7 pass / 0 fail / 20 expects.
- `hud/dock-collapse.ts` is a **pure seam**: `viewportWidthClass(width)` uses
  the kit's exact boundaries (≤767.98 phone, ≤1023.98 tablet, else desktop);
  `dockCollapsedByDefault(widthClass)` returns true for phone only;
  `createDockCollapseSession(viewportWidth)` holds an `override: boolean|null`
  — `dockOpen()` = `override ?? !default(widthClass)`, `toggle()` sets the
  override, `onViewportChange(width)` re-derives the width class only. A held
  override wins over any later width change; a fresh session forgets the last
  session's toggle. Nothing touches the save, storage, or any persistence —
  the save stays v25 (NFR-1) and the choice is session-only by design.
- `hud/shell.ts` wiring: the dock session is created from
  `window.innerWidth` at shell build; `dockHead` click now routes through
  `dockCollapse.toggle()` keeping the existing picker-close, class toggle and
  aria-expanded behaviour (existing click/tap handlers otherwise unchanged;
  no gestures). `syncDockViewport` subscribes to the two matchMedia queries
  `(max-width: 767.98px)` / `(max-width: 1023.98px)` and re-applies the
  derived default only when no override is held.
- The creature plate gains the same landscape-aware default
  (`plateStartsFolded = startsCollapsed || (orientation: landscape) and
  (max-height: 500px)`); portrait and desktop defaults are unchanged.
- AC-5 measured live: 393×852 → dock `is-collapsed` **true** on fresh load
  (phone); 852×393 → dock **open** (tablet class); 1440×900 → dock **open**
  (desktop). Explicit toggles persist in-session: collapse → dock 38px tall
  head at y 337–375 with `aria-expanded="false"`; re-expand restores.
- Module cap: enforced by `module-size.test.ts` inside the phase gate
  (dock-collapse.ts + shell.ts both pass); the 12,288 B guard ran green in
  every gate execution.

### P2.T2 — landscape 852×393 (FR-3, AC-1 landscape)

Landscape block in `ranch.css` under
`@media (orientation: landscape) and (max-height: 500px)` — the two kit width
tiers are untouched (no third width breakpoint; orientation-gated, coherent
with FR-1):

- **Left column** (chips → lineage → plate): `.hud-motion` keeps the
  tablet-band stacked chips (18–127 × 18–150); `.hud-lineage` moves to
  `top: calc(158px + var(--kit-safe-top))` (158–195, 8px below the chips);
  the plate keeps its seat (18–348) and starts **collapsed** in landscape.
- **Panel caps** (content-box aware): `.creature-plate`
  `max-height: calc(100dvh - 246px)` (18 inset + lineage bottom 195 + 3
  slack − 30 plate padding/border) → the expanded plate tops out at
  **y 198 ≥ 195** and scrolls internally instead of clipping;
  `.command-dock` `max-height: calc(100dvh - 146px)` (18 + score-bug band 77
  + slack − 26 dock box) → the dock tops out at **y 126 > 77**.
- **Right column**: dock expanded 480–834 × 126–375; the score bug stays
  centered (213–639 × 16–77); the spar chip owns the top-right
  (684–834 × 18–63). The center corridor (x 348–480) is free — the scene's
  action area stays visible; the pet is fully visible in every capture.
- **Training picker** opens as a sheet in the dock: `[data-picking="true"]`
  hides the care row / train button / graduate / CTA and resets the picker's
  flex; the 4th program row sits below the dock's internal-scroll fold but
  stays reachable (scroll/focus bring it in — verified by scrolling the dock
  and re-hit-testing the row to SELF).
- **Teaching callout**: the base seat (top 146, full 560 width) would lie
  across the dock's head row at 393 tall, and every corner column is taken
  (chips top-left, spar chip top-right, only a 47px-tall band under the bug
  vs the ~62px card). First attempt seated it in the left column under the
  lineage — a real Playwright click then proved the card (z-60) **intercepted
  the expanded plate's collapse toggle** (actionability timeout), so the seat
  moved to the yard band: `top: calc(72px + safe)`, `left: calc(130px +
  safe)`, `max-width: none` → at 852 wide the day-one hint is one line
  (130–706 × 72–134), clearing the bug's content (ends ~69), the chips
  (x ≤ 127), the spar chip (y ≤ 63) and the dock head (starts 137). The card
  itself is `pointer-events: none` with only its Got-it button live, so a
  longer wrapped hint can never swallow a click beneath it.
- **Modals at 393 tall** (`kit.css`, landscape-short block): the
  creature-detail card was 3px past the glass (content-box: 86dvh cap + 38px
  chrome). `.kit-modal-box { max-height: 100%; overflow-y: auto }` +
  `.kit-modal { padding: 20px }` in the same orientation/height query → the
  detail card fits (header pinned, panel scrolls — long panels scroll, never
  clip). Measured: settings 15–378 ✓, handbook 9–384 ✓, stable 88–305 ✓.
- **Hit-test sweeps** (`elementFromPoint` at every interactive element's
  center, callout up): plate collapsed → **16/16 SELF**; plate expanded →
  **16/16 SELF** (dock head, 4 care buttons, train button, CTA, plate head,
  rename, collapse toggle, 3 chips, lineage, callout button, spar chip).
  Real taps drove: dock collapse/expand, picker open + Escape, plate
  expand/collapse, creature-detail modal open/Escape, GOT IT dismiss.
- **Portrait recheck 393×852**: `scrollWidth === innerWidth` (393); dock
  collapsed by default (phone width class ✓); Phase-1 stacked collapsed heads
  intact (dock head 776–838, plate head 700–768); `:has()` mutual exclusion
  re-verified with real taps (dock open → plate `display: none`; plate open →
  dock `display: none`; the dock-head click while the plate is open fails
  visibility — exclusion working); a real FEED tap spent an AP (pips 3→2 in
  the score-bug readout); full stat sheet screenshot clean.
- **Desktop guard 1440×900**: `scrollWidth === innerWidth` (1440); dock open
  (1068–1422 × 636–882), plate expanded (18–348 × 597–882), callout at its
  base seat (18–594 × 146–200), lineage at 100–137; 15/15 hit SELF — desktop
  is pixel-for-pixel the Phase-1 desktop.
- **Tablet guard 800×1000**: `scrollWidth === innerWidth` (800); dock open,
  plate expanded, all base seats (lineage 100–137, callout 146–208) — the
  orientation-gated landscape rules correctly do not fire inside the band.
- **Console**: 0 errors / 0 warnings at all four audited viewports
  (852×393, 393×852, 1440×900, 800×1000).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Unit (failing first) | `bun test apps/client/src/hud/dock-collapse.test.ts` | 1 | Before implementation: `Cannot find module './dock-collapse'` (0 pass / 1 fail) |
| Unit (green) | `bun test apps/client/src/hud/dock-collapse.test.ts` | 0 | 7 pass / 0 fail / 20 expects |
| Phase gate (after T1) | `bun test --check --parallel=4 --timeout 120000` | 0 | 2640 pass / 1 skip / 0 fail, 209 files, 28.66s |
| Phase gate (final) | `bun test --check --parallel=4 --timeout 120000` | 0 | 2640 pass / 1 skip / 0 fail, 209 files, 30.72s (module-size guard included) |
| Lint | `bunx biome check apps/client/src/ranch.css apps/client/src/ui/kit.css apps/client/src/hud/shell.ts apps/client/src/hud/dock-collapse.ts apps/client/src/hud/dock-collapse.test.ts` | 0 | Clean (one pre-final format fix on the T1 signature) |
| Typecheck | `bun run check` | 0 | No type errors (all three packages) |
| Visual | `bun run dev` (localhost:5175) + `playwright-cli` | 0 | 852×393, 393×852, 1440×900, 800×1000; console 0 errors / 0 warnings everywhere |

## How the states were reached

- Dev server via background `bun run dev` (Vite chose **5175**; 5173/5174
  were in use). `playwright-cli resize` **before** every `goto` (open resets
  the viewport to default).
- Fresh save via `localStorage.clear()` through `eval` + `reload` → draft
  screen → starter card picked by a **real tap** (`.starter-card >> nth=3`;
  the first three cards are hidden mock-preview duplicates — visible ones
  start at nth=3), then re-freshed the same way for the canonical day-1
  captures. No save hand-editing; `delete-data` reports "No user data found"
  (same as Phase 1).
- Interactions are real clicks/taps only: `.dock-head` (dock collapse
  toggle — the session override), `.collapse-toggle` (plate chevron;
  `.creature-head` opens the creature-detail modal by design, not the plate),
  `.dock-train .kit-button` (picker sheet), care buttons (real FEED taps in
  both orientations spent AP), GOT IT, modals via chips, Escape to close.
- Geometry via `getBoundingClientRect` evals; reachability via
  `elementFromPoint` center probes. Probe note: playwright `eval` wraps the
  script as an expression — `const` declarations must go inside an arrow
  IIFE.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-3 | 852×393 passes the bar | scrollW 852; 16/16 SELF sweeps (both plate states); pet + action corridor visible (screenshots) | Met |
| FR-7 | Dock collapses/condenses on phone widths; no gestures; handlers otherwise unchanged | Pure decision + session (dock-collapse.ts); dockHead click routed through toggle; no new gestures; save untouched | Met |
| NFR-1 | No sim/save-schema changes; save stays v25 | Only client CSS + hud TS touched; nothing persisted | Met |
| NFR-2 | Desktop + tablet non-regression | 1440×900 and 800×1000 guards measured unchanged (base seats, dock open, plate expanded) | Met |
| NFR-3 | prefers-reduced-motion unchanged | No motion queries touched | Met |
| NFR-4 | Touch targets not tiny; colour never sole carrier | 40px dock-head floor kept; collapsed heads are full-height rows; chips keep labels | Met |
| NFR-5 | Existing stylesheets + minimal TS within 12 KB cap | ranch.css/kit.css blocks + 1 small module; module-size guard green in the gate | Met |
| NFR-6 / AC-8 | Clean console at every audited viewport | 0 errors / 0 warnings at 852×393, 393×852, 1440×900, 800×1000 | Met |
| AC-1 | Ranch day view passes the bar at 393×852 **and** 852×393 | Both captured with live geometry + hit sweeps | Met |
| AC-5 | Dock collapse demonstrable on phone widths, absent on desktop | Phone: collapsed on load (measured); desktop: open (measured); toggle persists in-session | Met |
| AC-7 | Desktop + tablet non-regression proven at the phase gate | Guard captures + measurements above | Met |

## Screenshots

`.conductor/evidence/20261025-mobile-layout-pass/`:

- `p2-landscape-ranch-day.png` — 852×393 fresh day-1: stacked chips, lineage,
  one-line callout in the yard band, collapsed plate head, expanded dock.
- `p2-landscape-train-picker.png` — 852×393 picker sheet (care row/CTA
  hidden; program rows with tradeoff lines; 4th row at the documented fold).
- `p2-landscape-plate-expanded.png` — 852×393 expanded stat sheet under the
  live callout (the state that previously blocked its own collapse toggle).
- `p2-landscape-dock-collapsed.png` — 852×393 collapsed dock head
  (session override).
- `p2-portrait-dock-open.png` — 393×852 recheck: dock open after a real FEED
  tap (AP pips 3→2), plate hidden by mutual exclusion.
- `p2-portrait-plate-open.png` — 393×852 full stat sheet, dock hidden.
- `p2-desktop-guard.png` — 1440×900 unchanged desktop.
- `p2-tablet-guard.png` — 800×1000 unchanged tablet band.

## Deviations

- The brief lists `hud.ts` "(or co-located dock module)" — the collapse
  decision landed as `hud/dock-collapse.ts` (+ `dock-collapse.test.ts`) next
  to the dock builder, with wiring in `hud/shell.ts`; `hud.ts` itself is
  untouched.
- A file-size probe via `bun -e` (inline script) was abandoned as not a
  plain on-brief command; the 12 KB cap is enforced by
  `module-size.test.ts` inside the phase gate instead.
- `playwright-cli delete-data` reported "No user data found"; fresh saves
  used `localStorage.clear()` via eval + reload (same as Phase 1).
- `bunx biome check` narrowed to the touched files (same as Phase 1).
- The landscape callout seat needed one extra commit (`1265b47f`): the first
  left-column seat intercepted the expanded plate's collapse toggle (real
  click timeout); final seat is the yard band with pointer pass-through.
  CSS-only; no handler changes.

## Notes

- The dock's landscape default follows the pure width-class decision
  (collapsed only on phone); the plate additionally starts folded in short
  landscape viewports so the day-1 screen reads: chips → lineage → plate
  head on the left, dock on the right, pet centered.
- The expanded plate and the dock both scroll internally at 393 tall (long
  panels scroll, never clip — spec edge case); the picker's 4th row sits
  below the dock's scroll fold but is reachable by scroll/focus (documented
  in the CSS comment).
- The training picker's hidden care buttons use `display: none`, dropping
  them from tab order while the sheet is open — carried over from Phase 1's
  phone tier and reused in landscape.
- Pre-existing, out of contract: at 800×1000 the stacked motion chips
  (18–150) overlap the lineage plate (100–137) — base seats unchanged by
  both Phase 1 and Phase 2 (NFR-2 keeps the tablet band as-is); noted for a
  future phase if ever in scope.
- Known Phase-4 item untouched: the STABLE chip / DRAFT DAY stamp overlap on
  the 393px draft screen (starter.css) — Phase 4 surface.

## Primary verification

Independent verification by the Conductor primary (2026-10-25):

- `git status --porcelain` → clean (evidence committed by phase).
- `git log --oneline 2885c268..HEAD` → exactly the 4 reported commits
  (8698a7ef, ab05b643, 1265b47f, f963984b) — squash guard passed.
- `git diff --name-only 2885c268..HEAD` → `hud/dock-collapse.ts` +
  `dock-collapse.test.ts` + `hud/shell.ts` + `ranch.css` + `ui/kit.css` +
  evidence — all within Touches (co-located dock module is the brief's
  sanctioned alternative to `hud.ts`).
- `bun run test:phase` → exit 0: 2640 pass / 1 skip / 0 fail, 130,575
  expect() calls, 209 files, 29.46s (module-size guard included).
- `bun run verify` → exit 0: typechecks clean, Biome clean, determinism
  gate OK.
- `bun run build` → exit 0 (pre-existing >500 kB chunk advisory only).
- Evidence file read in full: failing-first TDD recorded for the collapse
  decision (module-not-found → 7 pass); pure session seam with no
  persistence (save stays v25); orientation-gated landscape block (no third
  width breakpoint, FR-1 coherent); 16/16 hit-test sweeps in both plate
  states; real-tap interaction proofs in both orientations; portrait
  mutual exclusion re-verified; desktop/tablet guards measured unchanged;
  console 0/0 at all four viewports; stray dev server (port 5175) killed
  by the primary after the phase.
- Pre-existing tablet-band chip/lineage overlap correctly kept out of
  scope (NFR-2 preserves base seats) and recorded as a note.

**Result: phase accepted.**
