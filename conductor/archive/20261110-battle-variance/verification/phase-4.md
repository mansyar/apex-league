# Phase 4 Evidence — Gate and Re-measure (FR-5, FR-8 / AC-5, AC-8)

- Branch: `feat/20261110-battle-variance`
- Base SHA: `d7e5af3c4427acf87670ad8ebde467fc12331c9f` (track base)
- Measurement head: `b9ff2ec0` (phase marked in-progress, no production change)
- Re-baseline commit: `8c52990a` (`test(sim): re-baseline balance-report pins to
  measured variance reality (phase 4)`)
- Production diff this phase: none. Only
  `packages/sim/src/battle/continuous/balance-report.test.ts` changed (pin
  values + comments). `DISTINCT_FLOOR` stays 12; no bound, floor, ladder,
  noise rate, damage path, doctrine, controller, or simulation module touched.

## Commands (four separate runs, never chained)

| Command | Exit code | Result |
|---|---|---|
| `bun run balance` | 1 | gate red on 4 species rows (all pacing green) |
| `bun run verify` | 1 | 3986 pass, 1 skip, 1 fail — the single fail is the end-to-end gate assertion |
| `bun run build` | 0 | client builds clean |
| `bun run telemetry` | 0 | 13/13 green, cap 7/14 = 50.0% exactly at bound (zero headroom, held) |

## Re-measured gate table (head `b9ff2ec0`, deterministic — identical to the Phase-3 baseline)

Pacing (all green, unchanged): capShare 176/840 = 21.0% (bound <= 33.3%);
decisive 816/840 = 97.1% (662 ko + 154 cap wins >= 5.00 pts, bound >= 66.7%);
cap-win quality 154/176 = 87.5% (bound >= 66.7%); median 30.04 s (25–40 s);
p05 16.38 s (min 6.66 s, bound >= 8.00 s); max 40.00 s; damage 49/49 inside
4–12% of the 189 pool; 6/6 bosses in range (beatable, not trivial);
diversity 34.8% of ordered pairings change winner across seeds; distinct per
row 100–112 of 112 (median 109/112 — FR-5's headline number holds, asserted
not chased).

Species rows: 11/15 pass. The 4 FAIL rows (all far outside their intervals,
so variance tightening cannot move them in):

| Row | Rate (wins/112, distinct, se) | Bound | Miss |
|---|---|---|---|
| plant_ox | 67.9% (76, 102, 5.0%) | ±9.7% | +8.2 pts over the 54.7% edge |
| earth_tortoise | 29.5% (33, 100, 5.0%) | ±9.8% | −10.7 pts under the 40.2% edge |
| cindermoor | 59.8% (67, 110, 4.8%) | ±9.3% | +5.5 pts over the 54.3% edge |
| galeheron | 33.9% (38, 109, 4.8%) | ±9.4% | −6.7 pts under the 40.6% edge |

Design-band misses (printed list): 8 ids — plant_ox, water_axolotl,
electric_hound, earth_tortoise, cindermoor, galeheron, embercub, mossboar.
Reefclaw, voltfox and mistkit moved back inside the band under variance
reality.

## The 4 pins: asserted vs measured vs changed

1. **Distinct pins** — asserted tortoise 48 / reefclaw 50 → measured 100 /
   109 (execution noise plus honest misses make more of the 112 games
   distinct). Changed: values only (48→100, 50→109) plus comment. ✅ now
   green.
2. **Design-band list** — asserted 11 ids → measured 8 (reefclaw, voltfox,
   mistkit inside). Changed: list only (dropped the 3) plus comment. ✅ now
   green.
3. **KNOWN_MISSES** — asserted 2 lines (cindermoor 64.3%, capShare 33.6%) →
   measured 4 species lines (plant_ox 67.9%, earth_tortoise 29.5%, cindermoor
   59.8%, galeheron 33.9%); capShare healed 33.6% → 21.0% PASS, cindermoor
   moved 64.3% → 59.8% (still red). Changed: refilled to the 4 measured
   strings, nothing else; bounds untouched. ✅ now green.
4. **End-to-end gate (`run(...) === 0`)** — asserts green, measures red
   (exit 1, the 4 FAIL lines above). NOT changed: no stat tuning (out of
   scope), no bound/floor widened, no `test.failing` conversion. ❌ stands as
   the frontier.

The gate's arithmetic was checked, not blamed: slack is
1.96·sqrt(0.25/max(12, distinct)) and the misses are ±5–11 pts beyond the
interval edges — no mis-measurement to tighten, so no script change was made.

## Primary verification

- Independently confirmed at `03bbb4d0`: verify exit 1 with 1 fail of 3988 (only the end-to-end gate assertion); build exit 0; balance exit 1 on exactly 4 species rows (plant_ox +8.2, earth_tortoise −10.7, cindermoor +5.5, galeheron −6.7 pts outside); telemetry exit 0, 13/13.
- Pins 1–3 re-baselined values-only and green; pin 4 (gate exit 0) stands red by decision, not omission. No production diff this phase; DISTINCT_FLOOR 12; nothing widened.
- Track position: all 4 phases executed. P1/P2/P3 mechanism-complete with waivers recorded; P4 frontier-recorded. The only remaining lever (species stat tuning) is out of scope. Phase NOT squashed.

## Frontier verdict: gate red, carried as a finding (status `blocked`)

The matrix reports median distinct 109/112 (≥ 56, FR-5 headline met) with
every pacing, cap, decisive, quality, damage and boss bound green — but 4
species rows cannot enter the 45–55% design band under any variance lever,
because variance tightens intervals around the same point estimates. The only
remaining lever is species stat tuning, which is a roster re-tune track's
job, explicitly out of scope. Pins 1–3 above record the measured variance
reality; pin 4 stays red to prove it.

## Telemetry read

13/13 green. Cap line 7/14 = 50.0% exactly at its bound — zero headroom,
held on this run.

## Replay determinism

Green: the same-seed replay checks (battle-trace deterministic check and the
report replay assertions) pass inside the 3986 — one seeded RNG per fight,
integer arithmetic, no wall clock.

## AC-5 / AC-8 table

| Criterion | Verdict |
|---|---|
| AC-5: matrix reports median distinct ≥ 56/112 with distinct-derived errors | ✅ MET — median 109/112, DISTINCT_FLOOR 12 untouched |
| AC-8: pacing, cap, decisive, quality, damage bounds hold, no bound widened | ⚠️ PARTIAL — every pacing/cap/decisive/quality/damage/boss bound green, but 4 species rows red; closing them needs stat tuning (out of scope) |
