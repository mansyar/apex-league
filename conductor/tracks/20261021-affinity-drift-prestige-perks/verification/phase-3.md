# Phase 3 Verification — Prestige Milestones 7 & 9

**Track:** 20261021-affinity-drift-prestige-perks
**Phase:** 3 of 5
**Date:** 2026-10-21
**Branch:** `feat/20261021-affinity-drift-prestige-perks`
**Phase base:** `fab83ac` · **Head:** `a3a2a2d`
**Result:** `verified`

## What landed

- **P3.T1 — milestone constants and perks** (`packages/sim/src/legacy.ts`):
  `PRESTIGE_REFINED_BLOOD = 7` and `PRESTIGE_CHAMPION_STABLE = 9` (both
  distinct from 1 / 3 / 5); `LineagePerks` extended with `refinedBlood` /
  `championStable`, resolved cumulatively by `lineagePerks(prestige)` exactly
  like the existing three perks. `packages/sim/src/index.ts` re-exports the
  two constants (see deviations).
- **P3.T2 — Refined Blood floor** (`legacy.ts` + `breeding.ts`):
  `REFINED_INHERITANCE_FRACTION = 0.55` in `legacy.ts`;
  `inheritedFloorFromPair` reads `lineagePerks(prestige).refinedBlood` through
  the existing prestige seam (no global state) and uses `0.55` for the
  stronger parent at prestige ≥ 7, `0.5` below. The single-parent
  `inheritedFloor` keeps the plain `INHERITANCE_FRACTION = 0.5` at every
  prestige (FR-4 is scoped to the dual-parent floor).
- **P3.T3.1 — Champion Stable head-start AP**:
  `packages/sim/src/ap.ts` gains the pure budget primitive
  `headStartAp(hatchDay, day, championStable)` with `HEAD_START_DAYS = 5` /
  `HEAD_START_AP_BONUS = 1`: +1 for in-game life days 1–5, 0 from day 6,
  0 without the perk. **Fully derived — no additive v20 field was needed**
  (and `docs/save-schema.md` is untouched):
  - `hatchDayOf(lineage)` (`legacy.ts`) derives the active creature's hatch
    day from the last Hall of Fame record's `retiredOnDay` (a successor
    hatches on its predecessor's graduation day); a founder is day 1.
  - `ticker.ts` `advanceDay` adds the bonus to the day budget (alongside the
    existing `CUP_WIN_AP_BONUS`/`TIER_AP_BONUS` precedent) whenever a
    creature is owned — so a cup spanning life day 6 resolves correctly at
    match-prep time: the cup day's budget is computed once, from the same
    rule, before the fight.
  - The graduation seams (`legacy.ts` `graduate`, `breeding.ts`
    `graduateWithPair`) reset `actionPoints` to
    `ACTION_POINTS_PER_DAY + headStartAp(state.day, state.day, …)` so the
    hatch day itself pays the bonus (hatchDay = graduation day).
- **P3.T3.2 — mutation band widening** (`breeding.ts`
  `createBredCreature`): at prestige ≥ 9 the seeded mutation amount extends
  from +1..+2 to +1..+3 by **extending the top of the band**: the original
  draws (`rng.int(STAT_KEYS.length)` for the key, `rng.int(2)` for the
  amount) are consumed unchanged, and one extra `rng.next() >= 0.5` draw
  decides a +1 extension — fired only at the milestone (short-circuited), so
  the RNG stream is byte-identical below prestige 9 and no pre-perk roll ever
  changes amount. Determinism holds: same save state + same seed → same egg.
- New tests: `packages/sim/src/ap.test.ts` (head-start unit table + ticker
  integration + graduation seams + cup-day boundary), extended
  `legacy.test.ts` (perk table, constants, single-parent floor guard,
  `graduate` head-start day) and `breeding.test.ts` (0.55 floor both sides of
  the 6/7 boundary, refined-floor egg sweep, +1..+3 band edges, no-lowering
  twin test).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `bun run check` | 0 | 62 + 94 + 301 files, no type errors |
| unit | `bun test --timeout 120000` | 0 | 2113 pass, 1 skip, 0 fail, 88,211 expect() calls, 156 files, ~70 s |
| combined | `bun run check && bun test --timeout 120000` (phase verification command) | 0 | both halves green on the committed tree (shell policy ran them as two sequential invocations of the brief's exact commands) |
| full gate | `bun run verify` (extra: adds `biome check`, determinism gate, `--check --parallel`) | 0 | 478 files lint/format-clean; parallel run 2113 pass / 0 fail in ~17 s; all 9 creature GLBs + 5 props regenerate byte-identically |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 | Prestige 7 uses the 0.55 floor; prestige 6 does not | `breeding.test.ts` → `inheritedFloorFromPair(strong, weak, DRAKE, 6, [])` = `{hp:77, atk:12, def:9, spd:10}` (0.5 share) vs prestige 7 = `{hp:77, atk:13, def:10, spd:11}` (0.55 share; hp stays species-clamped on both sides); "keeps the refined share cumulative at higher prestige" (9 ≡ 7); end-to-end: 40 seeds of `createBredCreature(..., 7)` all ≥ the refined floor with a dedicated unclamped fixture proving the boundary bites | pass |
| AC-5 | At prestige 9: +1 AP on days 1–5, normal from day 6; mutation band reaches +3 | `ap.test.ts` → `headStartAp` table pays `HEAD_START_AP_BONUS` for life days 1..5 and 0 from day 6; `advanceDay` integration budgets 4 on hatch+0..4 and 3 from hatch+5; `breeding.test.ts` → 80-seed prestige-9 sweep shows deltas within [0,3] with at least one true +3, one mutation per egg, and the prestige-8 twin never rolls lower | pass |
| FR-4 | Stronger-parent floor 0.5 → 0.55 at prestige ≥ 7 only | Implementation reads `lineagePerks(prestige).refinedBlood` inside `inheritedFloorFromPair`; guard test keeps the single-parent `inheritedFloor(parentStats, drake, PRESTIGE_REFINED_BLOOD)` at the 0.5 values (a 0.55 share would lift hp to 89) | pass |
| FR-5 | Champion Stable: +1 max AP first 5 days (auto-expiring, derived), band +1..+3 | `headStartAp` is a pure function of `hatchDayOf(lineage)` (derived, never stored — no extra save state, auto-expires); `docs/save-schema.md` untouched; band edges tested as above | pass |
| NFR-3 | Pure, seeded, DOM-free, TDD'd; suite in seconds | All new logic is pure functions over explicit inputs; seeded determinism asserted (`stable` ≡ re-rolled prestige-9 egg per seed); every task was red→green (below); sequential suite ~70 s, parallel ~17 s | pass |

## Edge cases covered

- **Prestige 6/7 boundary (floor):** both sides asserted exactly; the
  difference is proven on atk/def/spd and via the unclamped end-to-end
  fixture (the drake's hp floor always clamps to the species minimum, so hp
  cannot show the share bump for realistic pairs — by design, not accident).
- **Prestige 8/9 boundary (perks):** `lineagePerks(8)` has `refinedBlood`
  true / `championStable` false; `lineagePerks(9)` both true. The prestige-8
  mutation twin keeps the +1..+2 band; `graduateWithPair` at successor
  prestige 8 pays a plain 3-AP hatch day, at 9 it pays 4.
- **Day 5→6 AP expiry:** `headStartAp` table (life day 5 → 1, day 6 → 0) and
  the ticker integration (`advanceDay` at hatch+4 vs hatch+5).
- **Cup spanning day 6:** a cup day falling on life day 6 budgets a plain 3
  (phase `"cup"`), a cup day on life day 5 budgets 4 — the budget is derived
  at `advanceDay`/match-prep time from the same pure rule, so no cup-side
  special case exists.
- **Mutation band preservation:** the widened band extends the top only —
  the key draw and `int(2)` amount draw are unchanged, and the extension
  draw is consumed only at prestige ≥ 9, so pre-perk streams stay
  byte-identical (affinity-drift stream untouched, its own salted RNG).
- **Species clamps:** mutation deltas may sit below the rolled amount at a
  stat's bound (asserted ≤ bounds on every seed).

## Balance guardrails (explicitly checked)

- **Boss win-rate bands:** `bosses.balance.test.ts` (six rivals — Koda,
  Hesse, Marlow, Delmar, Fenn, Thessa — within their authored win-rate
  bands) passes in every full-suite run; perks live in `legacyPerks` /
  `inheritedFloorFromPair` / `createBredCreature` / budget math that only
  the player's lineage reaches — bosses and rivals never receive perks
  (rival sides carry no lineage, and prestige is derived from the player's
  `lineage` + `cupsWon` alone).
- **Legacy/breeding goldens:** all existing `legacy.test.ts` /
  `breeding.test.ts` goldens (seeded egg goldens, floor tables, retirement
  records) and the cup goldens / battle contract digest matrix pass
  unchanged. The only pre-existing expectations edited were the
  `lineagePerks` milestone-table `toEqual` shapes in `legacy.test.ts`, which
  assert the perk object itself and by contract gained the two new fields.

## Deviations

- `packages/sim/src/index.ts` (outside Touches): added the two new prestige
  constants to the existing `./legacy` re-export group and extended the
  `./ap` re-export with `headStartAp` / `HEAD_START_DAYS` /
  `HEAD_START_AP_BONUS`. Smallest change that keeps the sim package's public
  API complete (the barrel already exported `INHERITANCE_FRACTION`,
  `lineagePerks`, and `spendActionPoints`); no client code touched.
- `packages/sim/src/ticker.ts` (the day/AP settlement seam, explicitly
  allowed by the brief's "co-located day/care seam if needed"): `advanceDay`
  adds the derived head-start bonus to the day budget.
- No save-shape change: the head-start derives from existing Hall of Fame
  day data (`hatchDayOf`), so **`docs/save-schema.md` was not touched** and
  no additive v20 field was added.

## Notes

- Red→green evidence: T1 first run failed on
  `Export named 'PRESTIGE_CHAMPION_STABLE' not found in module 'legacy.ts'`;
  T2 first run failed the prestige-7 floor expectation (got the 0.5 values)
  and the refined-floor egg sweep; T3.1 first run failed on
  `HEAD_START_AP_BONUS` not found; T3.2 first run failed `sawThree` (band
  still +1..+2). One test-side arithmetic fix during T3.1 (the below-nine
  graduation case needs lineage generation 7, since the successor's prestige
  is `generation + 1`) and one over-assertion relaxed in T3.2 (a widened +3
  that clamps at a species bound shows a visible delta of 2) — both were
  test corrections, the implementation was never bent to fit.
- The phase verification command's two halves were each run to exit 0 on the
  committed tree; `bun run verify` (extra gate) also exited 0, including the
  voxel determinism gate.
- Head-start derivation assumption (report as required): a successor always
  hatches on the day its predecessor graduated (`graduate` /
  `graduateWithPair` run in the day phase and stamp `retiredOnDay`), and a
  founder is chosen on day 1 — so `hatchDayOf` is exact for every current
  succession path and needs no stored field. If a future feature ever hatches
  a creature mid-career by another route, that route must stamp an
  equivalent day datum (or the derived helper gains a second source).
- Mutation widening approach (reported per brief): top-of-band extension via
  one milestone-gated extra draw, preserving all pre-perk rolls exactly.

## Primary verification

Run by the primary agent on the squashed checkpoint.

- Task commits squashed to **checkpoint `f0f067f`**
  (`feat(sim): prestige milestones 7 and 9 - refined blood floor and
  champion stable`); range matched the reported commits exactly, tree clean
  before acceptance.
- Full project gate re-run independently: `bun run verify` → exit 0
  (2113 pass / 1 skip / 0 fail, biome 478 files clean, determinism gate OK).
- Files changed match the reported list. Deviations reviewed and accepted
  (`index.ts` barrel re-exports keep the public API complete; `ticker.ts`
  is the day/AP settlement seam the brief explicitly allowed).
- Save-shape result confirmed: the head-start AP is derived from existing
  Hall of Fame day data — no v20 field added, `docs/save-schema.md`
  untouched (this satisfies the brief's conditional).
- The `hatchDayOf` derivation assumption (successors hatch on graduation
  day; founder = day 1) is recorded in the evidence as a standing
  assumption for future hatch routes.
- Verdict: **Phase 3 accepted.**
