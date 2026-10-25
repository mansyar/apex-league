# Phase 3 — Cup, battle & spar

- **Track**: 20261025-mobile-layout-pass
- **Phase**: 3 (Cup, battle & spar)
- **Date**: 2026-10-25
- **Branch**: `feat/20261025-mobile-layout-pass`
- **Base**: `034e1018` (phase 3 in-progress marker)
- **Head**: `1651b0c4`
- **Commits**: `11f33e67` (P3.T1 cup flow layout), `fff10ae9` (P3.T2 battle & spar
  layout), `1651b0c4` (P3.T2 landscape stamp width cap follow-up)

## Result

**Verified.** Cup entry/bracket/coach room/board/results, the battle HUD and
the spar surfaces pass the measurable bar at 393×852 and 852×393: no occlusion
of interactive elements, long panels scroll internally instead of clipping,
modals/panels stay inside the viewport, and the console is clean at every
audited viewport. The 1440×900 desktop guard is unchanged (pixel-wise the
Phase-1/2 desktop). The phase gate is green. One cosmetic residual is
documented under Notes (landscape battle stamp behind the open log box).

## How the bar was met

### P3.T1 — cup flow both orientations (FR-4, AC-2)

- **Portrait 393×852** was already served by the existing
  `@media (max-width: 767.98px)` phone tier (`.cup-screen` becomes
  flex-start + `overflow-y: auto`, single-column bracket, stacked coach room)
  and needed no new rules: bracket, coach room (rival stats, kit, tactic row,
  commit footer), results modal all captured live and operable.
- **Landscape 852×393 had a real defect**: the coach room is ~700 px tall and
  `.cup-screen` had no overflow, so the head bar ("Coaching room") and the
  commit footer ("Step into the arena") were both off-screen and unreachable
  — the flow dead-ended (pre-fix capture `p3-cup-coach-852x393.png`).
  Fix in `cup.css`, mirroring the phone tier with the same orientation gate
  the kit/ranch blocks use:
  `@media (orientation: landscape) and (max-height: 500px)` →
  `.cup-screen { justify-content: flex-start; padding: 10px 0 14px;
  overflow-y: auto }` and `.cup-result-card { margin: auto }`. Width keeps
  the desktop multi-round grid (no third width breakpoint introduced).
  Post-fix: head bar visible at the top (`p3-cup-coach-top-852x393.png`), the
  footer is reachable by a real Playwright click (Playwright scrolled the
  screen to reach it — click succeeded), the whole SF + final route was played
  through real taps.
- Results modal fits the viewport in both orientations (portrait
  `p3-cup-results-393x852.png`, landscape `p3-cup-results-852x393.png`), with
  the real "Back to the ranch" dismissal used every time.
- Full real cup run played at landscape: Enter Cup → bracket → coach room →
  QF won → SF won → final lost → results dismissed (all real taps, cup
  Fast-forward used where offered).

### P3.T2 — battle & spar surfaces (FR-5, FR-8, AC-3)

- **Dead phone tier discovered and retargeted**: the only phone block in
  `battle-hud.css` (`@media (max-width: 767.98px)`, line ~368) still targeted
  pre-rework `.spar-hud*`/`.spar-plate`/`.spar-stamp*` classes that match
  nothing in the live markup (the broadcast HUD builds `.battle-hud`,
  `.battle-plate`, `.battle-stamp*` — verified by grep over `*.ts`). The
  battle HUD therefore rendered at desktop sizes on phones, which is why the
  plates ran under the ranch chip cluster. The block was retargeted to the
  live classes (same values: 52 px plates, 28 px crests, 13 px names, 9 px HP
  bars, rangefinder hidden, full-width announcer, 30 px stamp) — no restyle,
  a selector fix.
- **Chip-cluster dodge**: portrait `.battle-hud` top padding
  `calc(104px + var(--kit-safe-top))` parks the plates below the
  Settings/Stable stack; bottom `calc(96px + var(--kit-safe-bottom))` keeps
  the announcer clear of the corner Fast-forward/Battle-log chips.
- **Landscape block added**
  (`@media (orientation: landscape) and (max-height: 500px)`): the same
  104 px top dodge (the two-chip stack is ~100 px tall in landscape too) with
  desktop placard sizes kept (the wide frame reads well at 852 px), stamp
  bottom bias dropped and the stamp title capped (24 px / 0.16 em / max-width
  60 %) because the corner log box sits over the right side at this height.
- **Arena-mode lineage plate**: `.hud-lineage` (the mid-bowl floating
  "LINEAGE / EMBER DRAKE / Gen 0…" plate, pointer-events furniture from
  `hud/plates-lineage.ts`) is now hidden with the rest of the ranch HUD in
  the existing `.app-in-arena` block of `spar.css` — same broadcast-clarity
  rule as the handbook chip two lines below. `hud/update.ts` toggles it with
  an inline `style.display` that resets to `""`, so a class rule wins exactly
  when the plate is shown on the ranch and untouched otherwise.
- **Spar setup panel**:
  - portrait: the panel (six-move picker) parks below the chip cluster —
    the overlay top padding went 116 → 164 px (cluster stacks to ~152 px) and
    the panel cap grew accordingly (`100dvh − 176px`); pre-fix the "SPARRING"
    heading was painted over by the STABLE chip (`p3-spar-setup-393x852.png`),
    post-fix the heading and the panel close button are clear
    (`p3-spar-setup-fixed-393x852.png`).
  - landscape had a **flow dead-end**: the 460 px × ~700 px panel was centered
    in a 393 px viewport, clipping its heading and close button off the top
    and the tactic buttons off the bottom, with no scroll
    (`p3-spar-setup-852x393.png`). New landscape-short block in `spar.css`:
    `.spar-overlay { align-items: flex-start; padding: 12px }` +
    `.spar-panel { max-height: 100%; overflow-y: auto }` — the same treatment
    the kit modal already gets from Phase 1 (`ui/kit.css`). Tactics are then
    reachable by a real tap (the Favor Specials tap that started each battle).
- **Battle operability proven by real interactions**: tactic choice started
  every battle; `Battle log ▸` toggled open in both orientations; cup
  Fast-forward tapped; "Back to the ranch" used to exit. No move buttons
  exist in this build (battles are auto-simmed; the HUD is broadcast-style
  read-only furniture) — so "move buttons hit-testable" reduces to the corner
  chips and the CTA/tactic buttons, all tapped for real.
- **NFR-3**: no `prefers-reduced-motion` block touched (cup.css ~911 and the
  battle-hud comment block left byte-identical; no animations added).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Phase gate (mid) | `bun test --check --parallel=4 --timeout 120000` | 0 | 2640 pass / 1 skip / 0 fail, 209 files, 30.88 s |
| Phase gate (final) | `bun test --check --parallel=4 --timeout 120000` | 0 | 2640 pass / 1 skip / 0 fail, 209 files, 32.86 s |
| Lint | `bunx biome check apps/client/src/cup.css apps/client/src/battle-hud.css apps/client/src/spar.css` | 0 | Clean |
| Visual | `bun run dev` (Vite chose **5175**) + `playwright-cli` | 0 | 393×852, 852×393, 1440×900; console 0 errors / 0 warnings at all three |

## How the states were reached

- Background `bun run dev` → Vite picked **5175** (5173/5174 busy).
  `playwright-cli resize` **before** every `goto` (open resets the viewport).
- Session inherited from this run's own fresh save (`localStorage.clear()` +
  reload → draft → Ember Drake picked by a real tap). Days advanced only via
  real Advance-Day taps: day 7 cup (portrait run), day 14 cup (landscape run),
  day 21 (portrait re-checks with fixes applied), day 28 (desktop guard).
- Cup entered from the real "Enter Cup" chip each time; bracket → coach room
  (tactic "Specials" / "Favor Specials" chosen by tap) → arena → Fast-forward
  where still visible → results dismissed via the real button. My sick
  starter (Sluggish, form-pinned) lost QF on day 7 and day 21 and won SF on
  day 14 — captures include a loss, a win and both result variants.
- Spar opened from the real Spar chip; sessions started by tapping the
  "Favor Specials" tactic; log opened via the real `Battle log ▸` toggle.
  One landscape rotation was simulated mid-battle (viewport resize during an
  active fight, no reload).
- No save hand-editing; no state files; the only writes were real UI taps.
- Console audited at 1440×900, 393×852 and 852×393 after the fixes:
  `playwright-cli console` → 0 errors / 0 warnings each.

## AC table

| AC | Bar | Evidence |
| --- | --- | --- |
| AC-2 / FR-4 | Cup entry, bracket, coach room, board, results legible + operable at 393×852 and 852×393 | `p3-cup-bracket-fixed-393x852.png`, `p3-cup-battle-fixed2-393x852.png`, `p3-cup-results-393x852.png`, `p3-cup-bracket-852x393.png`, `p3-cup-coach-top-852x393.png`, `p3-cup-battle-852x393.png`, `p3-cup-results-852x393.png`; real full cup run at landscape (QF+SF won, final lost, results dismissed) |
| AC-3 / FR-5 | Spar setup, panel, log operable at both orientations | `p3-spar-setup-fixed-393x852.png`, `p3-spar-setup-852x393.png` (post-fix panel scrolls; tactics tapped), `p3-spar-log-fixed-393x852.png`, `p3-spar-log-fixed2-852x393.png` |
| AC-3 / FR-8 | Battle HUD + arena overlays readable mid-battle, both orientations; no occlusion of the action | `p3-cup-battle-fixed2-393x852.png`, `p3-cup-battle-852x393.png`, `p3-cup-sf-battle-852x393.png`, `p3-cup-final-battle-852x393.png`, `p3-spar-battle-fixed-393x852.png`, `p3-spar-battle-fixed-852x393.png` — plates clear of the chip cluster, lineage plate hidden, announcer clear of corner chips, both creatures visible |
| NFR-2 / AC-7 | Desktop + tablet non-regression | Desktop guard 1440×900: `p3-spar-setup-1440x900.png`, `p3-spar-battle-1440x900.png` (rangefinder visible, desktop sizes), `p3-cup-bracket-1440x900.png` (unchanged desktop bracket). Phone/landscape blocks are additive media queries; the existing `1023.98px`, `767.98px` and `479.98px` blocks untouched |
| AC-8 | Console clean | 0 errors / 0 warnings at 1440×900, 393×852, 852×393 (post-fix) |
| NFR-3 | Reduced-motion untouched | No `prefers-reduced-motion` rule modified; verified by `git diff` scope (only the three listed additions/retargets) |

## Screenshots

All under `.conductor/evidence/20261025-mobile-layout-pass/` (gitignored).

Pre-fix defect evidence: `p3-cup-coach-852x393.png` (landscape coach room
clipped top+bottom), `p3-spar-setup-393x852.png` (STABLE over "SPARRING"),
`p3-spar-setup-852x393.png` (landscape panel clipped both ends),
`p3-cup-qf-battle-393x852.png` + `p3-spar-battle-393x852.png` (desktop-sized
plates under the chips, lineage plate mid-bowl), `p3-spar-log-393x852.png`
(5-line stamp) and `p3-spar-log-852x393.png` (44 px stamp behind the log box).

Post-fix captures: portrait — `p3-cup-bracket-fixed-393x852.png`,
`p3-cup-battle-fixed2-393x852.png`, `p3-cup-results-393x852.png`,
`p3-spar-setup-fixed-393x852.png`, `p3-spar-battle-fixed-393x852.png`,
`p3-spar-log-fixed-393x852.png`; landscape — `p3-cup-bracket-852x393.png`,
`p3-cup-coach-top-852x393.png`, `p3-cup-battle-852x393.png`,
`p3-cup-sf-battle-852x393.png`, `p3-cup-final-battle-852x393.png`,
`p3-cup-results-852x393.png`, `p3-spar-battle-fixed-852x393.png`,
`p3-spar-log-fixed2-852x393.png`; desktop guard —
`p3-cup-bracket-1440x900.png`, `p3-spar-setup-1440x900.png`,
`p3-spar-battle-1440x900.png`.

Naming note: `p3-cup-battle-fixed-393x852.png` actually shows the coach-room
footer (taken one click before the arena opened); the real portrait cup
battle capture is `p3-cup-battle-fixed2-393x852.png`.

## Deviations

- `apps/client/src/spar.css` contains the `.app-in-arena` gating block that
  also hides ranch HUD furniture (score bug, creature plate, dock) — it is
  the spar surface's own block in a Touches file, but the added
  `.hud-lineage` selector affects the ranch-side lineage plate's visibility
  in arena mode only (it keeps rendering on the ranch exactly as before).

## Notes

- **Known cosmetic residual (documented, not fixed)**: at 852×393 with the
  battle-log box opened over a finished battle, the centered verdict stamp
  text ("VICTORY — RIVAL …") still passes ~60 px behind the log panel's left
  edge (`p3-spar-log-fixed2-852x393.png`). The log box itself is fully
  interactive and paints on top; the stamp is transient, non-interactive
  overlay text and its glyphs remain readable size — the strict bar clauses
  (no occlusion of interactive elements / action area, text size) hold.
  Two fix attempts were spent (24 px + padding-bottom 0; max-width 60 %);
  a further shrink was left for Phase 4 polish rather than a third attempt.
- `p3-spar-battle-852x393.png` was captured by resizing mid-battle (real
  rotation scenario). Post-fix landscape battle captures exist for both the
  spar (`p3-spar-battle-fixed-852x393.png`) and cup HUD
  (`p3-cup-battle-852x393.png`); both use the same `.battle-*` classes.
- The cup chip's phone seat (`cup.css` ≤767.98 block, top 120 px) was not
  changed and matches the spar chip's 64 px slot with a real gap, as inherited
  from the pre-track inventory.
- Dev server (background `bun run dev`, Vite port **5175**) was left running
  for the primary agent; kill it with the shell ID shown in the session log
  if still alive at review time.

## Primary verification

Independent verification by the Conductor primary (2026-10-25):

- `git status --porcelain` → clean (evidence committed by phase).
- `git log --oneline 034e1018..HEAD` → exactly the 4 reported commits
  (11f33e67, fff10ae9, 1651b0c4, 4bbb29ef) — squash guard passed.
- `git diff --name-only 034e1018..HEAD` → `cup.css`, `battle-hud.css`,
  `spar.css` + evidence — within Touches; the `spar.css` deviation
  (`.hud-lineage` added to the existing `.app-in-arena` block) is the
  smallest necessary and properly recorded.
- `bun run test:phase` → exit 0: 2640 pass / 1 skip / 0 fail, 130,575
  expect() calls, 209 files, 31.64s.
- `bun run verify` → exit 0: typechecks, Biome, determinism gate OK.
- `bun run build` → exit 0 (pre-existing >500 kB chunk advisory only).
- Evidence file read in full: real pre-fix defect captures (landscape coach
  room was a flow dead-end; battle-hud phone tier targeted dead pre-rework
  `.spar-hud*` selectors; spar panel clipped both ends) with post-fix
  proofs; full real cup runs (days 7/14) and spar sessions by real taps at
  both orientations; desktop guard unchanged; console 0/0 at all three
  viewports; NFR-3 reduced-motion untouched (diff-scoped).
- The cosmetic residual (landscape verdict stamp ~60 px behind the open
  log box; transient, non-interactive, log paints on top) is documented
  with two fix attempts spent — the strict bar clauses hold; left for
  Phase 4 polish / review visibility.
- Stray dev server (port 5175) killed by the primary after the phase.

**Result: phase accepted.**
