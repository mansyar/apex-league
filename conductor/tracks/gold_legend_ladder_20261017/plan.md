# Plan: Gold & Legend Ladder Extension

**Track ID:** `gold_legend_ladder_20261017` · **Type:** Feature
**Workflow:** `conductor/workflow.md` — TDD scoped to logic-bearing code;
`bun run verify` before every commit; git note per task; plan checkbox
updates in separate `conductor(plan):` commits.

## Phase 1 — Gold tier in the ladder (sim, TDD)

- [x] Task: Write failing tests for Gold thresholds/climbs (30/36, Gold
      III→II→I) in `ladder.tier.test.ts` `[3b09b92]`
- [x] Task: Implement `LadderTier` extension + `GOLD_THRESHOLDS` in
      `ladder.ts` `[3b09b92]`
- [x] Task: Write failing tests for Legend eligibility (Gold I + points
      past 36) and plateau behavior (no sub-tiers, no demotion)
      `[f477292]`
- [x] Task: Implement Legend promotion-eligibility + `legendTitles` tally
      logic `[f477292]`
- [x] Task: Re-pin the "no Gold tier" negative tests to the new truth
      (`subTierFor` clamp + `promotionEligible` Silver/Gold cases)
      `[f477292]`
      *(the Silver-teaser → real-progression copy and the new Legend teaser
      are client-side coach lines — folded into the Phase 5 handbook task,
      per the juvenile track's layering precedent)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verified: RED→GREEN per task; sim suite 674 pass / 0 fail; `bun run
    check` clean across all 3 packages; `bun run verify` green incl.
    determinism gate (byte-identical GLB regeneration); coverage diff
    4574aef..HEAD touches only `packages/sim/src/ladder.{ts,tier.test.ts}` +
    conductor docs — golden draw-stream and save tests untouched.
    *[checkpoint: f477292]*

## Phase 2 — Authored gatekeepers (sim, TDD)

- [ ] Task: Write failing tests for `bossForCup` substitution rules
      (Silver→Gold gate final; Gold III checkpoint; Gold I apex
      non-blocking; Legend gate blocking when eligible)
- [ ] Task: Write failing tests for scalp ledger updates on the new bosses
- [ ] Task: Author 3 boss definitions (frozen data: pinned stats, kit,
      tactic, persona copy) + extend substitution logic post-draw
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Tier rewards (sim, TDD)

- [ ] Task: Write failing tests for tier-gated champion bonuses (Gold +1 AP,
      Legend +2 AP + legendTitles; loss/forfeit unchanged)
- [ ] Task: Implement in `cupRewards.ts` on the live cup path
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Save v14 (sim, TDD)

- [ ] Task: Write failing tests for v13→v14 additive migration + load
      validation accepting gold/legend + `legendTitles` default
- [ ] Task: Bump `SAVE_VERSION` to 14, extend `save/schema.ts` +
      `save/migrate.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Client surfaces (manual-verify tier) + wrap-up

- [ ] Task: Rank plate/score bug: Gold/Legend standings + Legend titles
      display
- [ ] Task: Cup entry chip, results rows, coach ticker: promotion/climb
      announcements
- [ ] Task: Coach's Handbook ladder copy → four-tier truth; retire stale
      teaser copy; Silver-teaser → real-progression line + new Legend teaser
      through the hint ledger (hud/copy.ts + plates.ts)
- [ ] Task: Manual browser verification (ranch + full cup run to Legend) &
      Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

- The load-bearing discarded RNG draw in `makeBracket` (cup.ts) and the
  golden draw-stream contract tests are untouched — boss substitution stays
  post-draw.
- Bosses reuse the 3 existing species (`fire_drake`, `plant_ox`,
  `water_axolotl`) with distinct personas/kits; new species content is a
  separate track.
- Save pins: several test titles say "SAVE_VERSION is 12" while asserting 13;
  update stale pins touched by this work (do not drive-by refactor the rest).
