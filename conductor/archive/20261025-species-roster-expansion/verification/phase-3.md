# Phase 3 — Client presentation & lifecycle

- **Track**: 20261025-species-roster-expansion (Species Roster Expansion)
- **Phase**: 3 — Client presentation & lifecycle
- **Date**: 2026-10-26
- **Branch**: `feat/20261025-species-roster-expansion`
- **Base**: `70556e9a` · **Head**: `ef28f8ab` (commits `db7e339f`, `5b6aef32`, `ef28f8ab`)
- **Result**: **verified** — the three new lines render and play across every
  client surface (gift card, stable, ranch plate, creature detail, growth,
  moves, handbook chart/moves/paths, spar setup, battle staging, victory),
  the hatch and branch-evolution moments speak species copy, the phase
  verification command is green (2780 pass / 1 pre-existing skip / 0 fail),
  and the browser pass at 1440×900, 393×852 and 852×393 is clean with no
  console errors.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (targeted) | `bun test apps/client/src/species-roster.test.ts apps/client/src/hud/copy-hatch.test.ts apps/client/src/gift.test.ts apps/client/src/move-fx.test.ts apps/client/src/handbook.test.ts` | 0 | 45 pass / 0 fail, 438 expects |
| typecheck | `bun run check` (in `apps/client`) | 0 | No type errors in 389 files |
| unit | `bun test apps/client/src/module-size.test.ts` | 0 | 5 pass — every client module ≤ 12 KB (new `hud/copy-hatch.ts` is small; no split needed) |
| **verification (exact)** | `bun test --check --parallel=4 --timeout 120000` | **0** | **2780 pass / 1 skip (pre-existing) / 0 fail — 2781 tests, 237 files, 47 s** |
| visual | `bun run dev` + `playwright-cli` (Chrome) | 0 | 48 screenshots under `.conductor/evidence/20261025-species-roster-expansion/`; console 0 errors / 0 warnings |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-5 (client) | Hatch → stable → ranch → evolve → branch reveal works for the new lines, driven by real UI interactions | `p3-03/05` (gift card names Whistlefern), `p3-04/06` (hatch ticker `Whistlefern hatched — it waits in the stable for its turn. HP 84 · ATK 9 · DEF 11 · SPD 11.`), `p3-08` (stable lists all six reward pets with element-true crests), `p3-09` (Whistlefern brought to the ranch, plate shows its own stats), `p3-25` (Advance Day twice → `Evolution! Whistlefern grew into a Juvenile — +2 HP · +4 ATK · +1 DEF · +2 SPD. Frond Lasher — the lasher line, signature included.` with the `FROND LASHER · ATK + SPD` badge at `--hue: 140`), `p3-32` (`TIDE SENTINEL · HP + DEF` at `--hue: 230`), `p3-41` (champion spore warden). Unit coverage: `species-roster.test.ts` (crest hues, stable rows, six champion forms, evolve callout keeps stat names and two sentences). | ✅ |
| AC-7 | Plates, handbook, creature detail and battle staging render all three new lines at 1440×900 and 393×852 (plus 852×393 landscape), console clean | Desktop: `p3-26` Coral Claw champion, `p3-27` Moor Cinder champion, `p3-41` Whistlefern champion, `p3-08` stable, `p3-10/11/12` detail stats/growth/moves, `p3-13` handbook chart, `p3-14` handbook moves (all three new pools), `p3-15` spar setup, `p3-16/17` plant battle + victory, `p3-28/29/30` fire battle + victory, `p3-45` water battle, `p3-46` frond-lasher battle. Phone 393×852: `p3-18/22/31/32` ranch, `p3-21` detail, `p3-19/20` handbook, `p3-33/34` spar. Landscape 852×393: `p3-35/36` ranch, `p3-39` handbook, `p3-40` detail, `p3-47/48` spar + battle. Every capture: `documentElement.scrollWidth === innerWidth` (no horizontal scroll) and `playwright-cli console` → 0 errors / 0 warnings. | ✅ |
| AC-8 | Copy is single-sourced, ≤2 sentences, stat names always visible, product voice | New single source `apps/client/src/hud/copy-hatch.ts` (`hatchCallout` / `hatchStatLine`) pinned by `hud/copy-hatch.test.ts` for every `REWARD_SPECIES` (own name + "stable" + all four stat numbers, ≤2 sentences). Handbook population note is derived from `REWARD_SPECIES` + `TIER_NAME` (`handbook/chart.ts` `populationNote()`), replacing the hardcoded Storm-Hound line, pinned in `species-roster.test.ts` (all six names, ≤2 sentences, the three exact tier phrases). Cup reward row is species-aware (`bracket-model.ts` `giftName`, `cup/results.ts` passes `leagueRewardPreview(...)?.displayName`), pinned by `gift.test.ts`. Move-fx grammar pinned per new attack form. Rendered in `p3-13` (note text), `p3-06` (hatch ticker), `p3-25` (evolution callout). | ✅ |

## What changed

### P3.T1 — roster surfaces

- `apps/client/src/handbook/chart.ts`: the type-chart population note is now
  derived (`populationNote()` over `REWARD_SPECIES` by `rewardFromTier` +
  `TIER_NAME`), so the three new lines and every future tier line appear
  without touching copy.
- `apps/client/src/species-roster.test.ts` (new): pins crest identity for the
  three lines (110°/205°/18° via `elementHue`, distinct glyphs), stable rows,
  the six new champion forms' id/hue/species, the handbook note, and the
  evolution callout shape.
- Plates, stable, creature detail and growth panel needed **no code change** —
  they resolve `speciesId`/`archetypeId` generically; verified in the browser
  instead (`p3-08`, `p3-10`, `p3-11`, `p3-12`, `p3-32`, `p3-40`).

### P3.T2 — battle choreography

- `apps/client/src/move-fx/moves/{plant,water,fire}.ts`: authored the three new
  attack forms in each element's existing grammar — `thorn_charge` (plant),
  `riptide_rush` (water), `cinder_dive` (fire). The three guard signatures
  (`bramble_guard`, `tide_aegis`, `pyre_wall`) deliberately stay on
  `DEFAULT_FX` with their element's shot look, matching `basalt_guard` /
  `zephyr_veil`.
- `apps/client/src/move-fx.test.ts`: new pins — each new attack form is
  authored (hold windup, `coilX > 0.2`, `kick < -0.5`, one shot, puffs > 0,
  `shove ≤ -0.5`); the three guard signatures ride the default body with an
  element-true look; every row of each new kit resolves to its species'
  element look. No new barrel export (the export-surface pin is untouched).
- `apps/client/src/scene-logic/morning-after-poses.ts`: `frond`, `crab`,
  `smolder` added to `MORNING_AFTER_ARCHETYPES` with their own tempers
  (frond tall/alert, crab wide/low, smolder heavy head-down); existing pins
  (draconic max tail, axolotl max prance, tortoise deepest sag, falcon least)
  still hold.
- `apps/client/src/battle-timing.test.ts`: the reaction-timing sweep now
  covers all nine archetypes.
- `apps/client/src/choreo.test.ts`: added the "reward lines read as their own
  body language" pin over the three Phase-2 `BodyProfile`s (extended, not
  duplicated).
- `apps/client/src/ranch.css`: two mobile-bar fixes found by the landscape and
  phone passes. The gift chip makes the top-left cluster a fourth row, which
  put the Stable chip on top of the lineage plate at 852×393 and 393×852.
  Both tiers now step the lineage plate, the panel stack and the teaching
  callout down only while an egg is pending (`:has(.gift-chip:not([style*="none"]))`),
  leaving the compact seats untouched for a save with no reward waiting.

### P3.T3 — lifecycle moments

- `apps/client/src/hud/copy-hatch.ts` (new): `hatchCallout(creature)` /
  `hatchStatLine(creature)` — `${species} hatched — it waits in the stable for
  its turn. HP n · ATK n · DEF n · SPD n.` Species name from `getSpecies`, so
  all six reward lines read correctly.
- `apps/client/src/hud.ts`: `Hud.announceHatch(creature)` speaking the line on
  the creature-plate ticker.
- `apps/client/src/app/hud-screen.ts`: `onHatchGift` calls `announceHatch` with
  the pet that just landed in the stable.
- `apps/client/src/hud/copy-hatch.test.ts` (new): every reward species, the
  three new names, the stat-name contract, the ≤2-sentence rule.
- Branch reveal: `evolveCallout` + `branchRevealLine` already compose the form
  line from `getBranch`; verified live (`p3-25`) and pinned in
  `species-roster.test.ts`.

## Evidence paths

Screenshots (`.conductor/evidence/20261025-species-roster-expansion/`):

- Roster/lifecycle desktop: `p3-01` boot, `p3-02` gift chip, `p3-03`/`p3-05`
  gift card (Storm Hound → Whistlefern), `p3-04`/`p3-06` hatch callouts,
  `p3-07` gift cleared, `p3-08` stable six pets, `p3-09` ranch Whistlefern,
  `p3-10` detail stats, `p3-11` growth, `p3-12` moves, `p3-41` champion
  Whistlefern, `p3-26` champion Coral Claw, `p3-27` champion Moor Cinder.
- Handbook: `p3-13` type chart + derived population note, `p3-14` moves (all
  three new pools), `p3-19`/`p3-20` phone chart + moves, `p3-39` landscape chart.
- Battle: `p3-15`/`p3-16`/`p3-17` plant spar → victory, `p3-28`/`p3-29`/`p3-30`
  fire spar → victory, `p3-45` water spar, `p3-46` frond-lasher spar,
  `p3-33`/`p3-34` phone spar, `p3-47`/`p3-48` landscape spar + battle.
- Mobile: `p3-18`/`p3-22`/`p3-31`/`p3-32` ranch, `p3-21` detail, `p3-23` dock
  open, `p3-24`/`p3-25` evolution reveal, `p3-35`/`p3-36` landscape ranch,
  `p3-40` landscape detail, `p3-42`/`p3-43` landscape gift chip (no overlap),
  `p3-44` phone gift chip (no overlap).
- Seed helper used for the browser pass: `p3-seed.ts` (sim seams only —
  `chooseStarter` / `grantLeagueRewards` / `hatchGiftEgg` / `bringToRanch`;
  no hand-edited save).

## Deviations

| File | Reason |
| --- | --- |
| `apps/client/src/ranch.css` | Outside the "ui/scene-logic/ranch/battle-animation/copy" list, but the Phase 3 mobile bar (NFR-6, UX Principle 8) is enforced there and the landscape + phone passes found the pending gift chip overlapping the lineage plate. Smallest necessary change: three `:has()` rules gated on a pending egg; nothing changes for a save with no reward waiting. |
| `apps/client/src/bracket-model.ts`, `apps/client/src/cup/results.ts`, `apps/client/src/cup/view-models.ts`, `apps/client/src/gift.test.ts` | FR-8 single-sourcing: the cup results row was the last hardcoded species line (`⚡ Storm Gift — a Storm Hound egg waits in the nursery`). `resultRows` now takes the pending species name; the three call sites and the test follow. |
| `apps/client/src/choreo.test.ts`, `apps/client/src/battle-timing.test.ts` | Existing test tables enumerated only the six original archetypes; both are registry-coverage pins, so they extend to the three Phase-2 archetypes. No assertion weakened. |

## Notes

- **No branch-variant assets were needed.** The branch accent is applied at the
  client material layer (`creature.ts` `branchTint()`), confirmed live: the
  `Frond Lasher` badge carries `--hue: 140`, `Tide Sentinel` `--hue: 230`.
- **Gift chip is a fourth chip.** It only appears while a reward egg waits, so
  the pre-existing compact seats stayed correct for the common save; the new
  `:has()` rules are inert when the chip is `display: none` (verified: with no
  egg, Stable bottom 150 → lineage top 158, unchanged from before).
- **Phone dock/plate exclusivity** is by design (`dockCollapsedByDefault("phone")`
  + the `:has()` rule); the reveal ticker was confirmed present in the DOM
  while the plate was folded, and read correctly once the plate was expanded.
- **Seeded saves must respect `TRAINING_CAP = 6`** — a hand-built champion with
  `trained` values of 10 is rejected by the save validator (learned while
  seeding the browser pass; not a product bug).
- `bun run dev` is still running on port 5175 (background shell). Two plain
  `bun …p3-seed.ts` invocations were denied by the shell sandbox; the seeding
  was done in-page through the same sim seams instead, so no acceptance
  criterion was weakened.

## Primary verification

- **Date**: 2026-10-26 · **By**: Conductor primary (independent of the subagent report)
- **Tree**: clean before acceptance; `git log 70556e9a..HEAD` = exactly the 4 reported commits (`db7e339f`, `5b6aef32`, `ef28f8ab`, `e8cbe7b1`) plus the primary's lint fix (`de37cc13`) — squash guard passed, no unreported or foreign commits.
- **Diff vs Touches**: 21 changed paths, all within the client tree (`ui`/`scene-logic`/`ranch`/`move-fx`/`hud`/copy) plus the evidence file. Deviations all reviewed and accepted: `ranch.css` (mobile-bar occlusion fix gated on a pending egg — smallest necessary, inert when no egg waits), the cup results single-sourcing chain (`bracket-model.ts`/`cup/results.ts`/`cup/view-models.ts`/`gift.test.ts` — required by FR-8), and the two registry-coverage pins extended to the Phase-2 archetypes (no assertion weakened).
- **Primary fix attempt 1**: `bun run verify` → exit 1 (biome: 2 format errors in `choreo.test.ts`/`ranch.css` + 6 `noNonNullAssertion` errors in `move-fx.test.ts`/`species-roster.test.ts`). Fixed by `biome check --write` on the two format files and hand-replacing the six non-null assertions with explicit missing-species/missing-branch guards (stronger, not weaker) → committed as `de37cc13`.
- **Gates on the final tree**: `bun run test:phase` → exit 0, 2781 tests / 237 files / 0 fail (1 pre-existing skip, 178,274 expect calls, 37.42 s); `bun run verify` → exit 0 (typecheck clean across voxel 117 / sim 150 / client 389 files, Biome clean with one pre-existing `noDescendingSpecificity` warning, determinism gate OK — 27 creature GLBs byte-identical + 5 props); `bun run build` → exit 0 (pre-existing >500 kB chunk advisory only).
- **AC evidence check**: AC-5 (client) driven by real UI interactions across hatch → stable → ranch → evolve → branch reveal with 48 screenshots and unit pins; AC-7 verified at 1440×900, 393×852 and 852×393 with `scrollWidth === innerWidth` and console 0 errors / 0 warnings at every capture; AC-8 single-sourced copy pinned by `hud/copy-hatch.test.ts`, `species-roster.test.ts` and `gift.test.ts`.
- **Stray process**: dev server on port 5175 (pid 48748) killed by the primary; tree clean after the lint commit.
- **Result**: **phase accepted**.
