# Phase 2 Evidence — Warm the Cold Rows

Track base: `7a08d427` (roster-retune track base, per Phase 1 evidence).
Phase 2 head: `97168d86` (galeheron commit; tortoise commit `0400e568` below it).
Branch: `feat/20261111-roster-retune` (never left).

## Commands and exit codes (each run separately, never chained)

| Command | Exit code | Result |
|---|---|---|
| `bun run verify` | 1 | 3980 pass, 1 skip, 7 fail — ONLY the known inventory below (pins/goldens Phase 3 owns, values shifted, recorded row by row). `bun run check` passed (tests ran); biome + determinism-gate did not execute because the `&&` chain stops at the test failures. |
| `bun run build` | 0 | `@apex/client` built in 412 ms (chunk-size warning only, pre-existing). |
| `bun run balance` | 0 | Gate GREEN: every species row `ok`, no FAIL lines. Both Phase 2 rows in-band; no other row gate-red. |
| `bun run telemetry` | 0 | 13/13 `ok`, cap share 7/14 (50.0%) at bound, unchanged by either accepted move. |

## Starting numbers (baseline `bun run balance` before any Phase 2 edit)

- earth_tortoise: 33.9% (38/112, 100 distinct, se 5.0%), gap to band edge 11.1 pts.
- galeheron: 37.5% (42/112, 112 distinct, se 4.7%), gap 7.5 pts.
- Galeheron HP check: current `[140, 169]` (mid 154). No `[183, 208]` inflation
  present, so no revert was needed before buffing.
- No boss uses either species (bosses field fire_drake / plant_ox / water_axolotl
  only), so the boss-absolute rule constrains nothing here; both moves raise.
- frames.ts untouched throughout: `boulder_toss` startup stays 512.

## Per-candidate score table (full-matrix `bun run balance` per candidate)

Tortoise (base 33.9%, d100, se 5.0; identity: slowest record, atk ceiling ≤ 15,
startup-512 row untouched, hp ceiling tallest at 209):

| Candidate | Bounds change (whole-band, widths kept) | Rate before → after | Δ vs se | Distinct | Verdict |
|---|---|---|---|---|---|
| T-C1 | def `[9,12]` → `[10,13]` (atk held) | 33.9% → 44.6% (50/112, d101, se 5.0) | +10.7 > se | 101 ≥ floor | REJECTED as ship: gate-ok but 44.6% is an edge kiss, 0.4 below the 45% line — no margin. Frontier recorded. |
| T-C2 (ACCEPT) | def `[9,12]` → `[10,13]` AND atk `[10,14]` → `[11,15]` | 33.9% → 50.0% (56/112, d106, se 4.9) | +16.1 >> se | 106 ≥ floor | ACCEPTED: mid-band with margin. Ceiling 15 equals fire_drake (allowed: may not exceed). spd `[3,5]` untouched (slowest kept). hp `[163,209]` untouched (tallest kept). No other row gate-red. Telemetry 13/13, cap 50.0%. |

Prior-track rejected frontier (not re-run; recorded per brief): 11 whole-band
candidates were measured before; only atk `[13,17]` moved the row and it was
reverted because ceiling 17 breaks the ≤ 15 identity rule. atk `[11,15]` alone
was a zero-flip change there — the accepted T-C2 pairs it with the def shift,
which is the lever that moved (+10.7 alone).

Galeheron (base 37.5%, d112, se 4.7; kit untouched — stats only, buff wins ties):

| Candidate | Bounds change (whole-band, width kept) | Rate before → after | Δ vs se | Distinct | Verdict |
|---|---|---|---|---|---|
| G-C1 (ACCEPT) | def `[6,9]` → `[7,10]` (hp/atk/spd held) | 37.5% → 53.6% (60/112, d108, se 4.8) | +16.1 >> se | 108 ≥ floor | ACCEPTED: in-band with margin past se. Identity intact: falcon still fastest (spd0 17 > 13) and frailest (def1 8 < 10); tortoise still tallest (209 > 169) and slowest (5 < 13); kit untouched. No boss uses galeheron. No other row gate-red. Telemetry 13/13, cap 50.0%. No kit reorder needed (stats alone sufficed without breaking identity). |

## Final `bun run balance` species table (both rows in-band, gate exit 0)

```
earth_tortoise  112  106  56  0  50.0%  4.9%  ok
galeheron       112  108  60  0  53.6%  4.8%  ok
```

All 15 species rows `ok` (zero FAIL lines). Point-wise outside 45.0–55.0% but
still gate-ok (|rate−50%| within per-row se bound): plant_ox 44.6%
(50/112, d103, se 4.9%), water_axolotl 56.3%, voltfox 55.8%, embercub 55.4%.
Note: plant_ox drifted 51.8% → 44.6% across the Phase 2 runs as a relative-matrix
effect of the two buffs (−3.6 on the last step, inside its se 4.9) — gate-ok,
not a red flip. No row flipped to FAIL.

Pacing / quality rows (all `ok`): capShare 23.7% (199/840), decisiveShare 94.4%
(639 ko + 154 cap wins ≥ 5.00 pts), capWinQuality 77.4% (154/199),
medianDuration 30.08s (25–40s), durationP05 16.04s (≥ 8s), durationMax 40.00s,
damageBand 49/49 inside 4–12% of the 189 pool, all 6 bosses beatable and
nontrivial (hesse 5/30 … fenn 16/30). Diversity 35.7%.

## Telemetry per accepted move

- After T-C2: 13/13 `ok`, cap share 7/14 (50.0%, exactly at bound, unchanged).
- After G-C1: 13/13 `ok`, cap share 7/14 (50.0%, unchanged — identical fight
  table: same endings, blows, commits, gaps).
- Neither accepted move reds telemetry; no rejection on telemetry grounds.

## Known-red inventory for Phase 3 (verify exit 1 = ONLY these)

Gate pins (balance-report.test.ts, values shifted by the Phase 2 moves):

1. `a distinct fight is more than its winner and duration` — tortoise distinct
   pin expects 100, now 106.
2. `the report names the design-band misses it computes` — point-wise list is
   now `[plant_ox 44.6%, water_axolotl 56.3%, voltfox 55.8%, embercub 55.4%]`.
3. `today's target misses are named with their observed values` — `violations()`
   now returns `[]` (was 4 KNOWN_MISSES lines): the balance gate is genuinely
   green. Companion signal, NOT silent: `the gate is green end to end (R5)` now
   PASSES (it was red at baseline). Phase 3 re-baseline: KNOWN_MISSES → empty,
   DESIGN_BAND_MISSES → the 4-line point-wise list above (or its then-measured
   values), distinct pins → tortoise 106 / galeheron 108.

Goldens (already red per the Phase 1 inventory; Phase 3 owns the re-pin):

4. `exhibition.test.ts` seeded-rival golden — pinned `{atk 11, def 14, hp 171}`,
   now `{atk 10, def 13, hp 171}` (rival species untouched by Phase 2 bounds;
   pre-existing red, recorded with current values).
5. `cup.test.ts` makeBracket draw-stream golden (seed 21 day 7) — plotted stats
   shifted, e.g. atk 11→10 / 12→11, def 13→12 / 12→11 across slots.
6. `cup-contracts.test.ts` player-lifecycle golden — QF2 winner flipped
   `Reedle Mirefin` → `Tidecaller Nibbles` (fight-outcome churn from the buffs).
7. `clock.contract.test.ts` seeded event-stream contract — `impactStagger` /
   `staggers` coverage true → false.

Unrelated / needs primary triage:

8. `scripts/smoke/smoke.test.ts` — `RESULT fail (the check could not complete):
   not an http(s) URL: file:///tmp/x`, target null. Environmental (no URL or
   network path touched by this phase); not a species/stat signal.

No co-located species-test re-pins were needed: `species.test.ts` asserts only
identity relations (tortoise tallest ceiling / slowest range, falcon fastest /
frailest, legal rolls), all of which still hold — no exact-bound pins exist for
the moved rows (verified by grep: the old/new bound tuples appear only in the
species source files).

## AC table

| AC | Requirement | Result |
|---|---|---|
| AC-2 | earth_tortoise 45–55%, still slowest, boulder_toss startup 512 | 50.0% (d106, se 4.9) ✓; spd `[3,5]` untouched, still below every other roll range ✓; frames.ts untouched (512) ✓ |
| AC-4 | galeheron 45–55% | 53.6% (d108, se 4.8) ✓, accepted past its se (+16.1) with kit untouched |

## Commits

- `0400e568` feat(sim): lift earth_tortoise into the design band with
  ceiling-respecting whole-band shifts (`packages/sim/src/species/rewards.ts`:
  atk `[10,14]` → `[11,15]`, def `[9,12]` → `[10,13]`).
- `97168d86` feat(sim): lift galeheron into the design band with a
  ceiling-respecting whole-band shift (`packages/sim/src/species/discovery.ts`:
  def `[6,9]` → `[7,10]`).

Deviations: none (no files outside Touches; no product/design decisions taken).
Frozen items untouched: FIGHT_CAP_MS, chart, damage ratios, 4–12% band,
DECISION_MS, training caps, doctrines, turn budgets, MISS_SCALE,
DISTINCT_FLOOR, global move powers, guard rails.
