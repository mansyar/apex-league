# Phase 7 — Chart Symmetry

- **Track:** `20261109-battle-balance`
- **Phase:** 7
- **Date:** 2026-11-09
- **Branch:** `feat/20261109-battle-balance`
- **Base:** `770c483b`
- **Code commit:** `fe4458fa`
- **Result:** the chart is two 3-cycles; every element wins exactly once and
  loses exactly once; the doc comment now matches the code. The new matrix is
  recorded as a finding for Phase 9, and the pacing regression it forces
  (cap share 57.1% against the 50% ceiling) is recorded as a miss for Phase 8.

## Commands

| # | Command | Exit | Read |
|---|---------|------|------|
| 1 | `bun run verify` | 0 | typecheck clean (voxel 160, sim 233, server 44, client 511 files); 3947 pass, 1 skip, 0 fail, 454,721 expects, 3948 tests / 366 files, 46.90 s; biome 911 files clean; determinism gate all 46 meshes + 5 props byte-identical |
| 2 | `bun run build` | 0 | vite 409 modules, 355 ms, chunk-size warning only |
| 3 | `bun run balance` | 1 | by design: 12 species targets and cap share are the Phase 9/Phase 8 baseline, named with observed values |
| 4 | `bun run telemetry` | 1 | cap share 8/14 (57.1%) exceeds the 50% ceiling — a miss owned by Phase 8 (P8.T4), not relaxed |

## The chart

Old table (asymmetric): `electric > water`, `earth > electric`, `wind > earth`
alongside `fire > plant > water > fire`.

| Element | Old wins | Old losses | New wins | New losses |
|---------|----------|-----------|----------|-----------|
| fire | plant | water | plant | water |
| plant | water | fire | water | fire |
| water | fire | plant, electric | fire | plant |
| electric | water | earth | earth | wind |
| earth | electric | wind | wind | electric |
| wind | earth | — | electric | earth |

Old: water lost twice and wind lost never — the asymmetry that made the second
triangle structurally unfair. New: every element appears exactly once on each
side of `BEATS` (6 edges, two disjoint 3-cycles).

Strength is unchanged (FR-17): `typeFactor` still returns `{3,2}` for a beating
edge, `{2,3}` for the reverse and `{1,1}` otherwise. The doc comment that
claimed "2× / 0.5×" while the code used 3/2 and 2/3 is fixed — that mismatch is
how the asymmetry survived review. `incomingTypeFactor`'s collapse (super-
effective against the primary plus resisted by the secondary → neutral) is
untouched and is now covered against the new edges.

## Tests proving symmetry (AC-10)

`packages/sim/src/battle/chart.test.ts`:

- "every element wins exactly once and loses exactly once" — counts each
  element's appearances as attacker and as defender in `BEATS`.
- "the two cycles are the only edges and they are disjoint" — six edges, no
  edge crossing between the fire/plant/water group and the electric/earth/wind
  group; pins `electric>earth`, `earth>wind`, `wind>electric` at 3/2 and the
  reverses at 2/3; pins `electric↔water` and `water↔electric` at 1/1.
- "the strength stays 3/2 and 2/3, never 2× or 0.5×" — every edge and its
  reverse.
- "the affinity collapse still reads the new edges" — `electric` into an `earth`
  body with a `wind` affinity is neutral; a neutral secondary leaves 3/2; a
  resisted primary stays 2/3.

## New matrix (`bun run balance`, 420 fights, press as the standard doctrine)

| Species | Wins/games | Rate | Band |
|---------|-----------|------|------|
| fire_drake | 18/56 | 32.1% | miss |
| plant_ox | 18/56 | 32.1% | miss |
| water_axolotl | 30/56 | 53.6% | ok |
| electric_hound | 12/56 | 21.4% | miss |
| fernstag | 28/56 | 50.0% | ok |
| wind_falcon | 24/56 | 42.9% | miss |
| reefclaw | 36/56 | 64.3% | miss |
| earth_tortoise | 32/56 | 57.1% | miss |
| cindermoor | 34/56 | 60.7% | miss |
| voltfox | 50/56 | 89.3% | miss |
| galeheron | 40/56 | 71.4% | miss |
| shalemole | 36/56 | 64.3% | miss |
| embercub | 30/56 | 53.6% | ok |
| mossboar | 12/56 | 21.4% | miss |
| mistkit | 20/56 | 35.7% | miss |

Worst: electric_hound and mossboar at 21.4%. Best: voltfox at 89.3%. Only three
species sit inside 45-55%. **Finding, not a fix:** electric lost its water edge
and gained one into earth, so the electric line fell from 28.6% to 21.4% while
the earth/wind species moved the other way (tortoise 57.1%, falcon 42.9%).
Roster re-tune is Phase 9; resolvability is Phase 8. No species stat was touched
in this phase.

Cap share 356/420 (84.8%), median duration 40.00 s, min 12.28 s, 86.7% of
fights inside the 25-40 s band. The damage band is untouched: 49/49 moves
inside 4-12% (5.29-11.64%).

## Telemetry before → after (14 matchups)

| Metric | Before | After |
|--------|--------|-------|
| cap share | 7/14 (50.0%) | 8/14 (57.1%) — **miss** vs the 50% ceiling |
| duration | 13.06-40.00 s | 13.06-40.00 s |
| engagement min/median/max | 379/1152/3984 mm | 379/1161/3984 mm |
| exchange home/away | 0.24/0.22 per s | 0.25/0.22 per s |
| idle | 37.6% | 36.5% |
| contact | 3.5% | 3.5% |
| retreats home/away | 6875/7388 | 7013/7064 |
| positions min/median | 74/152 cells | 83/142 cells |

Rows that moved (the flipped pairs only):

| # | Matchup | Before | After | Why |
|---|---------|--------|-------|-----|
| 3 | water_axolotl v electric_hound | 40.00 s, time, 10-2 blows | 18.12 s, ko, 7-0 | electric no longer beats water; water's second counter is gone, so the hound is beaten quickly |
| 4 | electric_hound v earth_tortoise | 21.12 s, ko, 1-5 | 40.00 s, time, 4-8 | electric now beats earth, so the hound survives the tortoise's old edge |
| 10 | voltfox v earth_tortoise | 38.04 s, ko, 12-7 | 40.00 s, time, 12-7 | same flip: the electric attacker keeps the tortoise alive to the cap |

All other rows are byte-identical, and both traces are unchanged: seed 1
(`plant_ox` v `embercub`, fire vs plant) still hashes `0x31f1fe02` and seed
20261111 (`wind_falcon` v `water_axolotl`, neutral either way) still hashes
`0xc0498d29`, each with all five invariants ok. That is the check that only the
flipped pairs moved.

## Re-pinned rows

| File | Row | Change | Reason |
|------|-----|--------|--------|
| `battle/chart.ts` | `BEATS`, `typeFactor` doc | six old edges → `electric>earth>wind>electric`; "2× / 0.5×" → "3/2× / 2/3×" | FR-18, AC-10; the comment had lied since the first triangle |
| `battle/chart.test.ts` | local `BEATS` | same six edges | mirrors the table under test |
| `battle/chart.test.ts` | four new symmetry tests | added | AC-10 proof, incl. the affinity collapse against the new edges |
| `battle/continuous/telemetry.test.ts` | "at most one fight in two is decided at the cap (AC-24)" | `test` → `test.failing`, bound and text unchanged | cap share is 8/14 (57.1%) after the flip; Phase 8 (P8.T4) owns the pacing |
| `battle/continuous/telemetry.test.ts` | "a violated threshold is named…" and "the harness exits non-zero…" | the "passing sample" fixtures zero the cap share (`cap.share: 0`) instead of using the live sample | the live sample now carries a real cap violation; the tests' claims (silence for a holding bound, exit 0 for a passing report) are unchanged and still asserted |
| `battle/continuous/balance-report.test.ts` | `KNOWN_MISSES` | electric_hound 28.6→21.4, wind_falcon 35.7→42.9, voltfox 82.1→89.3, shalemole 71.4→64.3, capShare 83.8→84.8 | the harness baseline is measured, so the named misses must match the new matrix |
| `battle/continuous/balance-report.test.ts` | gate-exit assertions | voltfox line and capShare line re-pinned | same |
| `species-electric.balance.test.ts` | "a fresh hound can still pay the water tax forward" | `test` → `test.failing`, target and text unchanged; comment records Tide Regent Marlow at trained+0 now 1/36 (2.8%) vs ≥40% | electric no longer beats water, so the hound's "water tax" edge is gone. Phase 8 (P8.T1/P8.T2) owns it |

Cup and client goldens: **none moved.** The full suite is green with no cup
transcript re-pinned, which means no golden depended on the second triangle —
recorded as a finding.

## `test.failing` markers

Roster and pacing markers were left marked. None started passing, so none was
un-marked. One test joined them (`species-electric` "a fresh hound can still pay
the water tax forward"), and one pacing bound test joined them (`telemetry`
cap share), both recorded above with their new observed values.

## AC map

| AC | Where |
|----|-------|
| FR-18 / AC-10 | `chart.test.ts` "every element wins exactly once and loses exactly once", "the two cycles are the only edges and they are disjoint", "the strength stays 3/2 and 2/3", "the affinity collapse still reads the new edges" |
| FR-17 (strength unchanged) | `typeFactor` still 3/2 and 2/3; the symmetry test pins both directions |
| AC-4 (cap share) | `telemetry.test.ts` cap test now `test.failing` at 8/14 (57.1%); Phase 8 owns it |
| AC-5 (species band) | `balance-report.test.ts` `KNOWN_MISSES` records the new matrix; Phase 9 owns it |

## Deviations

| File | Why |
|------|-----|
| `battle/continuous/telemetry.test.ts` | forced: the chart flip moved cap share past the 50% ceiling, and a bound may not be relaxed. The two "passing sample" fixtures were given a clean cap so their claims still hold. |
| `species-electric.balance.test.ts` | forced: the hound's water edge disappeared, so a previously-passing roster target now misses. Marked failing rather than deleted or weakened. |

## Notes

- No power, frame data, cooldown, stamina, doctrine row, damage ratio,
  `FIGHT_CAP_MS`, roster stat or bound was touched.
- The trace header still prints the literal "hp 90" reference line while the
  folded pool is 189 — a cosmetic string from Phase 5, not a chart issue.
- The new matrix is a *finding*: the chart is now fair in shape but the roster
  was tuned against the old shape, so 12 of 15 species are outside the band.
  Phase 9 must re-tune against this table, not the old one.
