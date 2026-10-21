# Phase R1 Report — Review Fixes

- **Track:** 20261021-electric-species-line — Electric Species Line
- **Phase:** R1 (review round 1 fix round)
- **Date:** 2026-10-22
- **Branch:** `feat/20261021-electric-species-line`
- **Base commit:** `31fbbbe`
- **Result:** ✅ **verified**

## What landed

Every finding from review round 1 is closed. No finding was deferred
(`review.strict: true`).

| Finding | Fix | Where |
| --- | --- | --- |
| **F1** (High) — the grant stamped a flag; the egg never reached the player | The grant now creates a persisted pending egg (`pendingGift`: species + roll seed, save v22). The cup results screen shows a Storm Gift reward row, a ranch chip appears while an egg waits, and the Storm Gift card previews the rolled stats and commits the hatch through the store. The preview and the hatch share the egg's stored seed, so they cannot drift. | `packages/sim/src/{state,cupRewards,breeding}.ts`, `packages/sim/src/save/*`, `apps/client/src/gift.ts`, `apps/client/src/hud/*`, `apps/client/src/cup/*` |
| **F2** (High) — the nursery offered a species the sim refused to create | Breeding creates any *known* species through the unchecked seam (`createCreatureFrom`); the pair gate (both parents' species) is the acquisition rule. The starter seam (`createCreature`) still refuses the hound, so it is not a fourth starter. | `packages/sim/src/breeding.ts`, `packages/sim/src/species.test.ts` |
| **F3** (Medium) — the gift hatch silently dropped the player's career | The hatch archives the outgoing creature in the Hall of Fame before the hound takes the ranch, exactly like every other succession. | `packages/sim/src/breeding.ts` |
| **F4** (Medium) — the handbook contradicted itself | The type-chart page's population note now names the storm hound and keeps Earth/Wind as the waiting types. | `apps/client/src/handbook/chart.ts` |
| **F5** (Medium) — the new archetype had no fuzz coverage | `storm_hound` gained the same boundary (40 seeds), budget (8 seeds) and determinism partitions as the other three archetypes. A pre-check over 40 seeds × 3 stages found 0 boundary violations and a 195 KB maximum GLB (budget 320 KB), so the suites are assertions, not archaeology. | `packages/voxel/src/fuzz/` (7 new files) |
| **F6** (Low) — the rival pool came from the locked-species array | Each species carries an explicit `rewardFromTier`; `obtainableSpecies(tier)` derives the pool from that contract, so a future teaser species cannot leak into every Silver+ bracket. | `packages/sim/src/{species,ladder,machine}.ts` |
| **F7** (Low) — the unchecked creation seam was public | `createCreatureFrom` is no longer exported from the package barrel. | `packages/sim/src/index.ts` |
| **F8** (Low) — two heavy face tests had 6× budgets | Both loops are split per archetype (one archetype per test) and their budgets are back at 20 s; the file runs 6.9 s for 15 tests. | `packages/voxel/src/face.test.ts` |

### Save version

The track's own save moved from v21 to **v22**: `pendingGift` is a new
persisted field, so the granted egg survives a reload and the preview can be
exact. The migration is linear:

- a v21 save that never claimed the gift waits for its next non-forfeit
  finalize (unchanged retroactive rule);
- a v21 save that claimed the gift but never hatched one — the v21 grant only
  stamped the flag — receives the egg it was promised;
- a v21 save whose gift career is already in the lineage gets nothing.

`docs/save-schema.md` documents the field, the migration step and the new
validation rule.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| typecheck | `bun run check` | 0 | voxel 71 files, sim 99 files, client 305 files |
| unit | `bun test --timeout 120000` | 0 | 2,235 pass / 1 skip / 0 fail across 170 files (+22) |
| module size | `bun test apps/client/src/module-size.test.ts` | 0 | 5 pass — the HUD update module keeps its headroom |
| full gate | `bun run verify` | 0 | types + biome (496 files) + parallel tests + determinism gate (12 GLBs + 5 props byte-identical) |
| build | `bun run build` | 0 | all packages built |
| gift visual pass | `bun .conductor/evidence/phase-r1/gift-visual-pass.ts` | 0 | chip → card → hatch at 1440×900 and 393×852, 0 console/page errors |
| phase 4 visual pass | `bun .conductor/evidence/phase-4/visual-pass.ts` | 0 | re-run after the R1 changes; 0 console/page errors |

## Visual verification — the reward reaches the player

Harness: `.conductor/evidence/phase-r1/gift-visual-pass.ts` injects a v22
fixture save (Silver III, gift claimed and waiting, an Ember Drake in the
ranch) into `localStorage["apex.save"]`, drives the real HUD, and fails on
any console or page error.

| Capture | Shows |
| --- | --- |
| `desktop-ranch-with-gift.png`, `iphone15-ranch-with-gift.png` | the ranch with the GIFT chip folded into the chip cluster |
| `desktop-gift-card.png`, `iphone15-gift-card.png` | the Storm Gift card: Electric crest, name, GIFT tab, flavor, the four previewed stats (HP 78 · ATK 11 · DEF 8 · SPD 14), and the line that says what the hatch does to the current partner |
| `desktop-after-hatch.png`, `iphone15-after-hatch.png` | the hound on the ranch (partner plate: STORM HOUND · BABY · STEADY) and the chip gone |

Assertions the harness makes at both widths: the chip is visible while a gift
waits; the card opens and names the Storm Hound with its stat rows; after the
hatch the partner plate reads the hound; the chip is hidden again.

## Deviations

- **Save version bumped twice in one track** (v21 in Phase 2, v22 in R1).
  The review found the granted egg had to persist, and a pending egg is a
  persisted value; the alternative (deriving it from existing fields) would
  have made the preview's seed unstable across restarts. The migration is
  linear and covered by four new tests.
- **The gift is a card, not a nursery screen.** The nursery is only reachable
  at graduation, so a gift granted mid-run had no surface. The card lives in
  the HUD next to the other ranch chips, and the results screen names the
  grant where the player looks for rewards.
- **The hatch replaces the active partner.** The game holds one active
  creature, so the Storm Gift takes the ranch when it hatches — the outgoing
  partner is archived, not discarded (F3). The card says so before the
  player commits.
- **Executed by the primary agent** — the `conductor-phase` subagent remains
  unavailable (provider rate limit), as it was for Phases 3–5.
