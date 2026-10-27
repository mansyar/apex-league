# Phase 2 evidence — Kit CSS consolidation (visual layer)

- Status: **implemented, UNVERIFIED** (executor shell access denied mid-session;
  `bun run verify && bun run build`, screenshots, and commits are left to the primary).
- Phase base: `bad2f699` (Phase 1 verified).
- Goal: kit is the single source for surface styling; one touch floor, one focus
  rule, class-based visibility. Zero computed-style change (pure visual layer).

## P2.T1 — chamfer/keyline/elevation utilities (FR-3, AC-3)

New kit utilities (`apps/client/src/ui/kit.css`):
- `.kit-surface` — panel fill + keyline pair (same keyline trick as `.kit-plate`).
- `.kit-line` — border-only 1px keyline (fill-less twin for tinted/transparent grounds).
- `.kit-hex` — shared hexagon clip for crest glyphs.
- `@keyframes settle-down-centered` moved ranch.css → kit motion set (single
  consumer: `.score-bug`; reduced-motion handling is blanket `animation: none`,
  name-agnostic). T1.2 done.

Migration (builders gain the class; surface CSS drops the duplicated
declaration — the surface keeps layout/padding/clip-path/type):
- battle-hud.css: `.battle-plate`, `.battle-hud-center`, `.battle-hud-line`
  (pair); `.battle-crest` (hex). Builders: plate sides + center + line
  + crest (`battleHud.ts`).
- cup.css: `.cup-match`, `.cup-ticker-line`, `.cup-card`, `.cup-result-card`,
  `.cup-speed`, `.cup-boss-intro` (pair); `.cup-cta-ghost`, `.cup-kit-move`,
  `.cup-tactic`, `.cup-result-plate`, `.cup-reward-row`, `.cup-close` (line);
  `.cup-mini-crest` (hex, `cup/board.ts`). Builders: bracket, coach (cards +
  ghost), results (card + plate + reward rows), giveup (ghost), entry (match
  resets ×2), battle-chips (speed), cup.ts (close + boss-intro), arena
  (boss-intro reassignments preserve the class).
- spar.css: `.spar-kit-move`, `.spar-tactic`, `.spar-fast/.spar-replay`,
  `.spar-logbox` (line). Builders: setup (kit-move base), panel (tactic/fast/
  replay/logbox), coach-room (cup-tactic base).
- ranch.css: `.creature-name-input`, `.stable-pet-input` (pair);
  `.stat-cell` (line). Builders: plates-creature (input + cell),
  stable-rename (input).
- mock.css: `.stage`, `.show-item`, `.starter-dome`, `.starter-card` (line).
  Builders: mock data/sections.
- Intentionally NOT migrated (singletons or differing values): warm-border
  `.board-fight`, element-tinted `.spar-card`, layered/gradient grounds
  (`.cup-giveup-card` red danger border, starter-dome gradients, notice
  overlays), all elevation `box-shadow`/`drop-shadow` (values differ per
  surface), `.cup-pick` (unstyled player kit rows — gaining a border would be
  a computed change), structural `border-top` dividers, cloud.css (out of
  Touches; its `:focus-visible` duplicate stays).
- Line-count honesty: declaration-level dedup only (~60 declarations + ~15
  focus lines + ~5 mock lines ≈ 80 lines). The plan's 300–500 estimate
  assumed whole-rule consolidation, which is unreachable without computed
  changes (each rule carries unique layout/clip/ground). Zero-change
  constraint held throughout.

## P2.T2 — one touch floor (FR-4, AC-4)

- kit.css phone (≤767.98px) and tablet (768–1023.98px) blocks: 40px → 44px;
  header comment updated.
- ranch.css phone `.dock-head`: 40px → 44px.
- base.css ≤479.98px block already 44px — untouched. Remaining 40px sizes are
  glyph boxes (`.kit-crest`, `.battle-crest`), not touch floors. Single 44px
  value across all tiers now.

## P2.T3 — generic focus-visible (FR-5, AC-5)

- kit.css hand-maintained allowlist replaced with
  `button, a, input, select, textarea, summary, [tabindex]` generic rule
  (same accent 2px/2px). AC-5: new controls are covered by construction.
- Kept: danger color rule, inset-offset chamfer exceptions (reframed comment),
  all surface geometry specials (creature-head +4, dock-head +4, train-entry
  -2, name inputs +1, cloud-input — cloud.css out of Touches, untouched).
- `.cup-slot` dropped from the list: non-focusable div, never matched.
- board.css: deleted now-redundant `.board-fight:focus-visible` (generic rule
  is identical).

## P2.T4 — visibility convention + dead chrome (FR-6, AC-6)

- kit.css: `.kit-chip.is-hidden` (covers stable chip, sign-out row, cup chip).
- cup.css: `.cup-screen/.cup-close/.cup-battle-chips/.cup-boss-intro.is-hidden`
  block; stale inline-style comment on battle-chips replaced.
- TS classList/`hidden` migrations (all classList-or-`hidden` only):
  cup.ts (showScreen ×3 + close + Escape-mirror read + boss-intro create),
  cup/entry.ts (chip + 2 match resets), cup/arena.ts (chips + boss-intro ×4),
  cup/screens/battle-chips.ts (create), stable.ts (stableChip),
  cloud/panel.ts (signOut), hud/update.ts (rankTitles + dockGraduate →
  `hidden`), hud/dock.ts (dockGraduate init → `hidden`), hud/plates-score.ts
  (rankTitles init → `hidden` — both inits REQUIRED, else inline
  `display:none` would shadow the `hidden` property).
- Gift chip already class-based — no change. Spar/**/*.style.display,
  battle/HUD/dock/hints/trophy/ghost/graduation-egg paths untouched (pending
  own phases / out of scope per brief).
- mock.css T4.2: deleted the collapsed-plate copy (duplicates the GLOBAL
  real rule; mock plate carries `is-collapsed` → zero change). KEPT the
  divider/trophy + train-picker resp-phone rules: they simulate
  viewport-gated tiers that do not fire in the desktop-viewport showcase, so
  they are load-bearing, not dead. Deviates from the terse plan line;
  rationale recorded here.

## Specificity audits (all pass by inspection)

- `.cup-screen.is-hidden` (0,2,0) beats `display:flex` (0,1,0); media tiers
  never set display.
- `.kit-chip.is-hidden` (0,2,0): `.cup-button` sets no display;
  `.app-in-arena .cup-button` (0,2,0, later file) agrees (hidden ∧ hidden);
  no `.stable-chip` rule exists; kit loads first so ties resolve to later
  surface files, and no surface display rule ties against these.
- State overrides keep working: `.cup-match.yours`, `.on`/`:hover`
  border-colors (0,2,0); `.spar-kit-chosen`, `.command-dock.is-collapsed`
  descendants (later file wins ties).

## Deviations (TS files outside Touches — classList/`hidden` only, no logic)

cup.ts, cup/entry.ts, cup/arena.ts, cup/screens/battle-chips.ts,
cup/screens/bracket.ts, cup/screens/coach.ts, cup/screens/results.ts,
cup/results.ts, cup/board.ts, cup/coach-room.ts, battleHud.ts, battleUI.ts
(untouched — per-caller bases instead), spar/panel.ts, spar/setup.ts,
stable.ts, stable-rename.ts, cloud/panel.ts, hud/update.ts, hud/dock.ts,
hud/plates-score.ts, hud/plates-creature.ts, mock/data.ts, mock/sections.ts.
mock/sections.ts + mock/data.ts builders: mock-only showcase wiring.

## Primary verification (2026-10-27, post-partition)

- `bun run verify` — exit 0: typecheck clean, 3308+ tests pass, Biome clean,
  determinism gate OK (12 species × 3 stages + 5 props byte-identical).
  (One Biome format fix was needed on the temporary capture script; applied
  and the script has since been deleted.)
- `bun run build` — exit 0 (only the pre-existing chunk-size warning).
- Partition check: the three task commits reconstruct the implemented tree
  losslessly — per-file changed-line counts match the pre-split diff exactly
  (the ±1 vs the working-tree stat is `plan.md`'s own status line, committed
  separately below).
- Visual diff (before = code at `bad2f699` on :5176, after = this tree on
  :5175; fresh saves, day 1 except cup-day-7 flow; zero console/page errors
  on all eight captures):
  - ranch desktop/mobile: identical chrome — chips, lineage plate, onboarding
    callout, creature plate, dock, score bug. Only procedural differences
    (starter stats, 3D scatter placement).
  - spar desktop/mobile, cup desktop/mobile, board desktop/mobile: identical
    layout, type, keylines, motion chrome.
  - Verdict: zero computed-style change holds (AC-3, AC-4, AC-5, AC-6).
- Captures: `p2-before-*.png` (4: spar/cup × desktop/mobile) +
  `p2-after-*.png` (8: ranch/spar/cup/board × desktop/mobile) +
  `p2-after-report.json`. Ranch/board befores are the Phase 1 `p1-*` set
  (unchanged surfaces since `bad2f699`).

## Blockers (shell denied — left to primary)

- `bun run verify && bun run build` NOT run (expected green: types/tests/
  Biome/build; no logic changed, but gift.test.ts asserts `style.display`
  stays `""` on the gift button — unaffected path, still should pass).
- AFTER screenshots NOT captured: re-run `bun scripts/p2-before.mts` against
  the dev server, save as `p2-after-*.png` + `p2-after-report.json` in this
  directory; capture notes in the phase brief apply.
- Commits NOT created (conventional `refactor:` per task expected).
