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

- [x] Task: Write failing tests for `bossForCup` substitution rules
      (Silver→Gold gate final; Gold III checkpoint; Gold I apex
      non-blocking; Legend gate blocking when eligible) `[c284b06]`
- [x] Task: Write failing tests for scalp ledger updates on the new bosses
      `[c284b06]`
- [x] Task: Author 3 boss definitions (frozen data: pinned stats, kit,
      tactic, persona copy) + extend substitution logic post-draw
      `[c284b06]`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verified: RED→GREEN (11 fail → 0); full sim suite 686 pass / 0 fail;
    `bun run verify` green incl. determinism gate; balance probe retuned all
    three pins (delmar 93/12/9/11 spd-bound fix, fenn 92/13/10/12,
    thessa 100/11/13/8) — fresh/even = 0%, disadvantaged below cap = 0%,
    every cell ≥35% at cap; coverage diff scoped to `bosses*` +
    `cup.boss.test.ts`; golden draw-stream tests untouched (substitution
    stays post-draw). *[checkpoint: c284b06]*

## Phase 3 — Tier rewards (sim, TDD)

- [x] Task: Write failing tests for tier-gated champion bonuses (Gold +1 AP,
      Legend +2 AP + legendTitles; loss/forfeit unchanged) `[8999f70]`
- [x] Task: Implement in `cupRewards.ts` on the live cup path `[8999f70]`
  - Note: implementation spans `ticker.ts` (`TIER_AP_BONUS` stacking),
    `cupRewards.ts` (legendTitles tally), `machine.ts` (placement runs
    before rewards so the gate cup pays the NEW tier's bundle; also passes
    the session's bracket kind to `applyCupPlacement` — a latent live-path
    fix), and `state.ts`/`save/migrate.ts` (legendTitles field + literals,
    v14 prep).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verified: RED (7 fail incl. machine-ordering pin) → GREEN; full suite
    1357 pass / 0 fail / 1 skip; `bun run verify` green (check + biome +
    determinism gate byte-identical); coverage diff scoped to
    `cupRewards*` + `ticker.ts` + `machine.ts` + `state.ts` +
    `save/migrate.ts` + conductor docs. Sim-only phase — no browser
    verification; client AP display already derives from actionPoints.
    *[checkpoint: 8999f70]*

## Phase 4 — Save v14 (sim, TDD)

- [x] Task: Write failing tests for v13→v14 additive migration + load
      validation accepting gold/legend + `legendTitles` default `[7c3cea1]`
- [x] Task: Bump `SAVE_VERSION` to 14, extend `save/schema.ts` +
      `save/migrate.ts` `[7c3cea1]`
  - Note: also widens `save/storage.ts` load validation (four-tier ladder +
    strict legendTitles) and re-pins six stale version pins across
    `save.test.ts` / `cupSave.test.ts` / `legacySave.test.ts` ("platinum"
    replaces "gold" as the rejected tier in the v11 negative test).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verified: RED (9 fail) → GREEN; full suite 1367 pass / 0 fail / 1
    skip; `bun run verify` green incl. determinism gate; coverage diff
    scoped to `save/*` + conductor docs. Sim-only phase — no browser
    verification. *[checkpoint: 7c3cea1]*

## Phase 5 — Client surfaces (manual-verify tier) + wrap-up

- [x] Task: Rank plate/score bug: Gold/Legend standings + Legend titles
      display [0aecb5f]
  - Note: `ladderRead` reworked — `isSilver` → `tierClass` (four-tier
    accent) + `titles` segment (★ N on the plateau, aria copy updated);
    `TIER_NAME` shared module (`tier-name.ts`) replaces the three
    "silver ? Silver : Bronze" hardcodes (score bug, entry chip, results
    rows); results AP row is tier-stacked (`TIER_AP_BONUS`) and a Legend
    win appends `★ Legend title N`; gold/legend CSS tokens in kit.css;
    sim barrel now exports `GOLD_THRESHOLDS` + `TIER_AP_BONUS`. Also
    ignores `.playwright/` scratch screenshots.
- [x] Task: Cup entry chip, results rows, coach ticker: promotion/climb
      announcements [7bd2bc0]
  - Note: entry chip + results rows were made tier-generic by task 1's
    `TIER_NAME`; this task adds the pure `climbAnnouncement(prev, next)`
    (plates.ts) keyed on the full standing so the Gold I → Legend I flip
    (same subTier "I") still announces "Promotion — Legend I!" — the old
    subTier-only detection missed it. hud.ts swaps `prevLadderSubTier`
    for `prevLadder`. Five golden tests.
- [x] Task: Coach's Handbook ladder copy → four-tier truth; retire stale
      teaser copy; Silver-teaser → real-progression line + new Legend teaser
      [39f091c]
  - Note: hints are the teaser mechanism (`selectHint`, no `topReached`
    client consumer) — added `gold-awaits` / `legend-awaits`, one-time
    scalp callouts for delmar/fenn/thessa, retired Marlow's "horizon"
    promise, handbook LADDER_RULES now four tiers with the Legend plateau.
- [x] Task: Manual browser verification (ranch + tier surfaces) &
      Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification: fresh ranch boots clean (0 console errors); doctored
    v14 save exercises the real load → validate → render path for both
    new tiers (a live 40+ day cup run is impractical in-session; the
    climb sequence is pinned by sim + client unit tests):
    - Legend plateau: score bug `score-ladder--legend` renders
      "Legend I · 40 pts · ★ 2", aria "League standing: Legend I,
      40 points banked, 2 legend titles"; entry chip "Legend I · 40 pts".
    - Gold: `score-ladder--gold` renders "Gold II · 33/36" (progress
      grammar), titles segment hidden at 0 titles.
    - Handbook ladder rules tab shows all four tiers + "The plateau"
      row; type chart untouched.
    Coverage since 6cca07c scoped to client HUD/cup/handbook files + copy
    tests + conductor docs; full suite 1388 pass / 0 fail / 1 skip;
    `bun run check` clean (3 packages); biome clean.
      *[checkpoint: 39f091c]*

## Phase: Review Fixes

- [x] Task: Apply review suggestions [2dd6342]
  - Biome gate restored: formatter drift fixed in `sim/src/index.ts`
    (export-block join) + `hud/copy.test.ts` (helper wrapping, trailing
    CRLF); import ordering fixed in `hud.ts` + `hud/plates.test.ts`.
  - `topReached` no longer fires on Legend championships — the capstone
    has no "next tier awaits" to announce (harmless-in-practice, now
    semantically honest).
  - `bun run verify` fully green after fixes (check ✓ ×3, 1388 pass /
    0 fail, biome clean, determinism gate OK).

## Notes

- The load-bearing discarded RNG draw in `makeBracket` (cup.ts) and the
  golden draw-stream contract tests are untouched — boss substitution stays
  post-draw.
- Bosses reuse the 3 existing species (`fire_drake`, `plant_ox`,
  `water_axolotl`) with distinct personas/kits; new species content is a
  separate track.
- Save pins: several test titles say "SAVE_VERSION is 12" while asserting 13;
  update stale pins touched by this work (do not drive-by refactor the rest).
