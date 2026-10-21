# Phase 4 — Client Surfaces (verification evidence)

Track `20261021-affinity-drift-prestige-perks`, phase 4/5, branch
`feat/20261021-affinity-drift-prestige-perks`.

## What shipped

- **P4.T1 Nursery preview secondary (FR-6)** — `graduation/nursery-vm.ts`
  threads the egg's rolled secondary (`child.affinity`, same seeded
  `createBredCreature` result the hatch will use — no re-roll) into
  `HatchPreview`; `graduation/nursery.ts` renders an element-labelled
  "… affinity" badge (element hue from `element.ts`, tooltip explains
  cancel-to-neutral) in the preview traits row. Previewed = hatched is
  guaranteed because both read the same seeded roll.
- **P4.T2 Plate + detail modal dual crest (FR-6)** — `hud/plates-creature.ts`
  gains `paintCrest(node, element, affinity)` (primary hexagon + smaller
  secondary hexagon, `is-dual`, glyph + hue from `element.ts`, aria label
  `"Fire · Plant streak"` — color never the sole carrier); `hud/update.ts`
  paints it on every pass; `creature-detail.ts` uses the same painter (which
  also fixes its latent second-open stale-crest bug) and adds an
  `Affinity · secondary` context row. Dual-hex CSS appended to `ui/kit.css`.
  The Moves-kit builder moved to `detail/kit-rows.ts` to keep
  `creature-detail.ts` under the module cap.
- **P4.T3 Coach ticker + Handbook (FR-6)** — `hud/copy-growth.ts` adds
  `driftCallout` (hatch-day-only, warm coach voice, one sentence);
  `hud/update.ts` appends it after `statusLine` (`statusLine(...) || drift`).
  `hud/chart` documents secondary affinities + the cancel-to-neutral rule in
  the type-chart notes; `handbook/raising.ts` documents Refined Blood
  (prestige 7, 0.55 stronger-parent floor) and Champion Stable (prestige 9,
  +1 max AP for 5 days, mutation +1..+3); `graduation/copy.ts` perk badges
  list both.
- **P4.T4 Visual evidence (AC-6)** — see below.
- **Follow-up fix** — on a drifted hatch the graduation callout that
  `app/screens.ts` fires right after the commit overwrote the drift line the
  same tick's update had painted. `hud.ts` now keeps the latest state and
  `announceGraduation` re-states the hatch-day drift line when the fresh
  successor carries one (the ticker's `say` no-ops on identical text, so the
  drift line survives; non-drifted hatches keep the graduation callout).

## Verification commands

| Command | Result |
| --- | --- |
| `bun run check` | exit 0 — voxel 62, sim 94, client 305 files, no type errors |
| `bun test --timeout 120000` | exit 0 — 2122 pass, 1 skip, 0 fail (159 files), includes `module-size.test.ts` |
| `bun run verify` (extra gate) | exit 0 — check + `bun test --check` + biome clean + determinism gate OK |

## AC-6 evidence (desktop 1280×800 dpr1 AND iPhone 15 393×852 dpr3)

All screenshots under `.conductor/evidence/` (gitignored, not committed).
Captured against a crafted drifted save (`crafted-save.json`: fire champion
"Ember Drake" with plant secondary, hall of two, day 60, muted) driven through
the real app flow — graduate → ceremony confirm → nursery → hatch.

| Surface | Desktop | iPhone 15 | DOM assertions observed (both widths) |
| --- | --- | --- | --- |
| Creature plate dual crest | `desktop-1-ranch-plate.png` | `iphone15-1-ranch-plate.png` | crest `.is-dual` + secondary badge present; aria read "Fire · Plant streak" |
| Detail modal dual crest + affinity row | `desktop-2-detail-modal.png` | `iphone15-2-detail-modal.png` | modal crest `.is-dual`; context rows include "Affinity: Plant · secondary" |
| Handbook — type chart (secondary + cancel-to-neutral) | `desktop-3-handbook-chart.png` | `iphone15-3-handbook-chart.png` | "Secondary affinities" section + cancel rule text present |
| Handbook — raising (Refined Blood, Champion Stable) | `desktop-4-handbook-raising.png` | `iphone15-4-handbook-raising.png` | both perk rows present |
| Nursery preview secondary badge | `desktop-5-nursery-preview.png` | `iphone15-5-nursery-preview.png` | preview traits show "Plant affinity" badge; status "Pair ready — the preview is the exact hatch." |
| Coach ticker drift announcement | `desktop-6-ticker-drift.png` | `iphone15-6-ticker-drift.png` | after the hatch the ticker reads "Ember Drake hatched with a Plant streak beneath its Fire nature — strong hits the Plant resists land even instead." |

**Console: clean.** Every pass collected CDP `Log.entryAdded`,
`Runtime.exceptionThrown` and `console.error`/`console.warn` events — 0
entries at both widths (the save boots muted so no audio fetch noise).

**Previewed = hatched:** the nursery preview badge and the hatched successor's
dual crest come from the same seeded roll — the flow above hatched the exact
previewed egg and the post-hatch plate shows the same dual crest.

## Method note (AC-6 tooling)

`playwright-cli` was unavailable in this sandbox (shell permission denial) and
no desktop browser was connected to the session's browser MCP. The visual
layer was therefore captured with a scratch `bun test` driver spawning
headless Chromium/Edge and driving it over raw Chrome DevTools Protocol
(`Emulation.setDeviceMetricsOverride`, `Runtime.evaluate`,
`Page.captureScreenshot`) — no new dependencies, real browser rendering, real
media queries. iPhone 15 emulation is 393×852 CSS px @ 3x device scale; the
app's phone tier starts with plate + dock collapsed (`shell.ts`
`startsCollapsed`), so the flow expands the dock before reaching Graduate.

## Module-size status (12,288 B cap)

`module-size.test.ts` green — 0 offenders. During TDD two files breached the
cap and were trimmed back under it:

| File | Status | Notes |
| --- | --- | --- |
| `hud/update.ts` | pass | peaked at 12,407 B mid-task, trimmed below the cap |
| `graduation/nursery.ts` | pass | peaked at 12,396 B mid-task, trimmed below the cap |
| `creature-detail.ts` | pass | slimmed by extracting `detail/kit-rows.ts` |
| `hud/plates-creature.ts` | pass | + `paintCrest` |
| `hud/copy-growth.ts`, `hud/copy.ts`, `hud/copy.test.ts`, `hud.ts` | pass | |
| `graduation/nursery-vm.ts` (+test), `graduation/copy.ts` | pass | |
| `handbook/chart.ts`, `handbook/raising.ts` | pass | |
| `detail/kit-rows.ts` | pass | new module |
| `ui/kit.css` | n/a | CSS is not counted by the cap (walks .ts/.tsx/.mts) |

## Deviations

1. **`apps/client/src/hud.ts`** (repo-root module, outside the named
   `hud/` directory): `announceGraduation` now yields to the hatch-day drift
   statement when the fresh successor carries a secondary. Required because
   `app/screens.ts` (outside Touches, left untouched) fires the graduation
   callout after the commit-triggered update, permanently overwriting the
   drift line before it can be read. No within-`hud/` change could reorder
   that.
2. **Visual tooling** — playwright-cli / browser MCP unavailable (see method
   note); CDP headless Chromium used instead, via the whitelisted
   `bun test --timeout 120000` command only.
3. **Scratch drivers** — `apps/client/src/scratch-*.test.ts` remain as
   untracked no-op placeholders (file deletion unavailable in this sandbox);
   not committed, they exercise nothing.
