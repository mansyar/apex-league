# Phase 3 verification — Ranch HUD declutter

Track `20261027-ui-cleanliness-clarity-pass`, Phase 3 (FR-7/FR-8/FR-9,
AC-7/AC-8/AC-9). Executor subagent returned `blocked` (code-complete,
shell/git/Playwright denied in its environment); the primary ran every gate,
capture, and commit below.

## What changed

- **P3.T1 — grouped collapsible overflow** (`apps/client/src/hud/overflow.ts`
  new): one More toggle + floating kit-plate panel. Handbook, Gift, Stable,
  and the composition root's extras (Cloud, Boards) fold inside; Settings
  stays primary beside it. The open seat is measured below the lineage plate
  at open time (`seatOverflowBelow`); shut, the panel leaves the tab order
  via `.is-hidden`. Gift's stale `:has(.gift-chip)` seat rules are gone from
  `ranch.css` (`gift.test.ts` now asserts zero).
- **P3.T2 — lineage collapsible** (`hud/plates-lineage.ts` rewrite,
  `paintLineage`/`wireLineage` re-exported via `hud/plates.ts`): family-name
  summary row stays visible; counters + Hall of Fame opener fold behind it.
  `ranch.css` converts the plate to a column with summary/detail rows.
- **P3.T3 — score-bug paint through its owner module**
  (`hud/plates-score.ts` gains `paintScoreBug` + `ScoreBugPaint`):
  `hud/update.ts` drops ~60 lines of inline score painting for one call.
  The AP flash, climb handoff, and pip list ride on the shared paint state.
  `ranch.css` quiets trophy/ladder to 0.72 so phase/day/AP lead.
- Viewport defaults (`hud/shell.ts`, `hud/types.ts`): the More panel and the
  lineage detail start **open where the ranch has room, shut on the phone
  tier**; an explicit click holds for the session either way.

## Gate (primary, final code)

- `bun run verify` exit 0: typecheck clean (447 client files), 3308 pass /
  1 skip / 0 fail, Biome clean, determinism gate OK (12 species × 3 stages
  byte-identical + 5 props digests).
- `bun run build` exit 0 (pre-existing chunk-size warning only).
- Module-size cap: `hud/shell.ts` 11792 B, `hud/update.ts` ~10059 B,
  `hud/plates-score.ts` 6320 B — all under the 12288 B cap. The cap forced
  the T3 owner-module move (update.ts peaked at 12580 B mid-phase).

## Visual evidence (primary, final code, zero console/page errors)

All in `verification/p3-final-*` (report: `p3-final-report.json`):

| Shot | State proven |
|---|---|
| desktop-ranch | Default desktop: panel OPEN by design, seated below the lineage plate, every primary visible |
| desktop-overflow-toggled-shut | One More click shuts the panel (session-held) |
| desktop-overflow-shut | Escape with panel shut: no-op, focus stays on toggle |
| desktop-lineage-folded | Detail folds to the single family row; stack/callout step back up |
| mobile-ranch | Default phone: panel shut, lineage folded, two primaries visible |
| mobile-overflow-open | Panel open below the lineage plate (measured seat, no overlap) |
| mobile-overflow-shut | Escape inside the open panel: closes AND returns focus to More |
| mobile-lineage-open | Detail opens on the phone tier: counters + Hall of Fame opener |

## Two investigation arcs (both closed, no code smell left)

1. **Mid-flight seat race.** A mid-fix capture looked like the open panel
   overlapping the lineage plate. Root cause: pre-starter
   `lineage.root.style.display="none"` restarts the plate's settle animation
   at starter pick, and seats measured mid-flight inherited the ~14px
   translated rect. Fix: hidden-anchor guard in `seatOverflowBelow`, reseat
   on every update paint + font-ready + first paint + resize, and a
   lineage-root `animationend` reseat via `wireLineage`'s fold-change
   callback. Final probe: inline seat exactly the settled 165px.
2. **Starts-open design vs capture assumption.** A later probe "proved" the
   desktop panel never opens — wrong instrument reading: desktop starts
   OPEN, so the script's click was *closing* it. The panel-open evidence is
   the default desktop ranch shot; the toggle screenshot pair proves
   shut/open both directions. Report JSON names every shot's true state.

## Commit partition (one per task; shared glue documented)

- P3.T1 `overflow.ts` (new), `gift.test.ts`, `types.ts`, `shell.ts`,
  `ranch.css` — the assembly commit. `types`/`shell` also carry T2's
  `lineageOpen` field + `wireLineage` call (the seat anchors on the plate
  T2 rewires); `ranch.css` also carries T2's plate rows + T3's 6-line
  score-quiet rule.
- P3.T2 `plates-lineage.ts`, `plates.ts` — pure lineage owner.
- P3.T3 `plates-score.ts`, `update.ts` — the score owner + its call site;
  `update.ts` also carries T1's three reseat calls and T2's `paintLineage`
  wiring (the pass that consumes both owners).

## Deviations

- The score-bug owner-module move is a plan-task-external refactor *inside*
  the phase's files, forced by the module-size gate the phase's own work
  tripped. It follows the seam the codebase already had (`paintLineage`
  precedent), changes zero behavior (verify + visual diff clean), and is
  recorded here instead of silently absorbed.
- No new systems, endpoints, sim/save-schema/voxel changes. Reduced-motion,
  keyboard (Escape + focus restoration + `.is-hidden` tab-order), and the
  393px tier gates all hold.

## AC verdict

- AC-7 (secondaries fold behind one toggle; Settings primary; Escape +
  focus discipline; gift reachable while pending): PASS.
- AC-8 (family row always visible; detail on click incl. Hall of Fame;
  folded on phones): PASS.
- AC-9 (score hierarchy reads phase/day/AP first; dock unchanged in
  behavior): PASS — desktop/mobile shots show the quieted tallies; dock,
  advance, and trainer flows untouched.
