# Phase 3 verification — A sample that measures the roster, not its own composition

**Track:** `20261112-capshare-pacing`
**Phase:** 3 of 3
**Branch:** `chore/20261112-capshare-pacing`
**Phase base:** `4f7ef057`
**Head:** `928fa2bb` (code and tests; this evidence file is committed after it)
**Outcome:** **verified** — the sample is now 42 distinct pairings, one seed each.
`capShare` measures **20/42 (47.6%)** against the untouched `3/5` (60.0%) ceiling
and the track's 52% target (≤ 21/42): one fight of headroom under the target,
five under the ceiling. Every other bound is unchanged in value and green. The
one-in-three debt is still owed at 20/42.

## 1. What changed, file by file

| file | change |
| --- | --- |
| `packages/sim/scripts/battle-telemetry.ts` | `PAIRINGS` 14 → 42, `SEEDS_PER_PAIRING` 3 → 1 (`SAMPLE_SIZE` stays 42). `matchups()` draws the pairings by the written rule below, still hops past a mirror, still guards `if (!home \|\| !away) throw`. Its doc block was rewritten: it claimed "the 14 matchups `pacing.test.ts` pins", which was false, and now states the rule with its distinctness, coverage and no-mirror proof. `BOUNDS` values are all unchanged; `capShare.why` now records both readings and says they are not comparable. |
| `packages/sim/src/battle/continuous/telemetry.test.ts` | Header rewritten (42 distinct pairings, one seed each, why the old 14×3 walk measured its own composition). New pin: 42 fights, 42 distinct pairings, 42 distinct seeds, no mirrors, every species home and away at least twice, and the same list on two calls. Cap test: added the `cap.count * 100 <= cap.total * 52` target; the `3/5` integer form is unchanged; the one-in-three debt pin is kept with the new number. No `14 matchups` wording remains. |
| `packages/sim/src/battle/continuous/pacing.test.ts` | **Untouched.** See §7. |

No simulation file changed, `SIM_VERSION` stays 3, and no replay hash moved —
`bun run verify` re-ran the byte-for-byte replay test and the voxel determinism
gate green.

## 2. The pairing rule, and why it is distinct and covered

```ts
const home = roster[i % roster.length]
const lap = Math.floor(i / roster.length)
let away = roster[(i * 11 + lap + 1) % roster.length]   // gcd(11, 15) = 1
// then hop past a mirror exactly as before
```

**The suggested stride of 7 does not survive the hop.** With `away = (7i + lap) % 15`
the pre-hop pairs are distinct, but the three lap-0 mirrors (`i = 0, 5, 10`,
home = away = 0, 5, 10) hop to `(0,1)`, `(5,6)`, `(10,11)` — which are exactly
the lap-1 pairs for homes 0, 5 and 10 (`(7h + 1) % 15`). The suggested walk
therefore yields **39 distinct pairings, not 42**, and the new composition pin
would have failed. The `+1` offset and the stride of 11 are what fix it.

**Distinctness.** `home` is fixed by `i % 15` and `lap` by `floor(i / 15)`, so
the pair (home index, lap) is unique for every `i < 225`. For a fixed home,
`away = (11 * home + lap + 1) mod 15` differs between laps; different homes are
different pairings. Therefore no pairing can repeat. Verified by the new pin
(`Set` of `home v away` has size 42).

**No mirrors.** A mirror needs `10 * home + lap + 1 ≡ 0 (mod 15)`. Since
`gcd(10, 15) = 5`, that is solvable only when `5 | (lap + 1)`; this sample visits
laps 0, 1, 2, where `lap + 1` is 1, 2, 3. The hop therefore never fires on this
roster, and is kept as the guard for a future roster change. Verified by the pin.

**Coverage.** `gcd(11, 15) = 1`, so as home runs 0..14 in lap 0 the away index
runs through all 15 residues exactly once; lap 1 does it again. Every species is
therefore away at least twice. Home cycles the roster: homes 0–11 appear three
times, homes 12–14 twice. Measured on the drawn list: 12 species home 3×, 3 home
2×; 12 species away 3×, 3 away 2×. Verified by the pin.

**Seeds.** `20261108 + i`, one per pairing, contiguous. `20261108` is even, so
parity alternates: 21 fights with the home side on `balanced` and 21 with it on
`specials`. Neither doctrine is starved. (This is why the old `SEEDS_PER_PAIRING
= 3` comment about averaging seed luck is replaced: there is no repeat to
average, and the parity alternation is what keeps both tactics in play.)

## 3. Before / after

**These two readings are not comparable.** The old number measured a sample that
replayed ten stalled pairings three times each; the new number measures 42
different pairings. This is not "improved from 59.5% to 47.6%". The old fixture
measured its own composition; the new one measures the roster.

Sample:

| | old (shipped) | new |
| --- | --- | --- |
| pairings | 14 | 42 |
| seeds per pairing | 3 | 1 |
| fights | 42 | 42 |
| distinct pairings | 14 (each replayed 3×; 10 of them stalled) | 42 |
| distinct away species | 3 (`gcd(5, 15) = 5`) | 15 |

Cap share:

| | old (shipped) | new |
| --- | --- | --- |
| `cap.count` / `cap.total` | 25 / 42 | 20 / 42 |
| percent | 59.5% | 47.6% |
| ceiling | 3/5 = 60.0% | 3/5 = 60.0% (unchanged) |
| headroom to ceiling | 1 fight (26/42 fails) | 5 fights (26/42 fails) |
| track target 52% (≤ 21/42) | missed (25) | met, 1 fight of headroom (22 fails) |
| one-in-three (≤ 14/42) | missed (25) | still missed (20) |

Every bound, with its measured value on each sample:

| metric | bound | old (14×3) | new (42 distinct) | verdict |
| --- | --- | --- | --- | --- |
| `engagementMin` | ≤ 900 mm | 379 mm | 380 mm | ok |
| `engagementMedian` | ≤ 1500 mm | 1087 mm | 1079 mm | ok |
| `engagementMax` | ≤ 4500 mm | 3992 mm | 3992 mm | ok |
| `exchangeHome` | ≤ 2.50/s | 0.31/s | 0.32/s | ok |
| `exchangeAway` | ≤ 2.50/s | 0.28/s | 0.32/s | ok |
| `idleShare` | ≤ 50.0% | 26.6% | 25.7% | ok |
| `distinctPositions` | ≥ 20 cells | 63 (min) | 46 (min) | ok |
| `contactShare` | ≤ 70.0% | 7.1% | 6.7% | ok |
| `retreatHome` | ≥ 42 orders | 20977 | 18948 | ok |
| `retreatAway` | ≥ 42 orders | 20263 | 19333 | ok |
| `deadZoneShare` | ≤ 50.0% | 2.4% (22 commits) | 2.9% (27 commits) | ok |
| `capShare` | ≤ 60.0% | 25/42 (59.5%) | 20/42 (47.6%) | ok |
| `durationMin` | ≥ 8.00 s | 18.44 s | 14.48 s | ok |
| `durationMax` | ≤ 40.00 s | 40.00 s | 40.00 s | ok |

No bound, floor, tolerance or `DISTINCT_FLOOR` was widened or lowered. The
`capShare` value in source is still `3 / 5`; the test still pins `capShare: 0.6`.

## 4. `bun run telemetry` (exit 0), pasted

```text
$ bun packages/sim/scripts/battle-telemetry.ts
Battle telemetry — 42 seeded matchups through resolveContinuous (FR-14, AC-14)
engagement distance: centre-to-centre gap per step, mm (opening pose excluded)
exchange rate:       committed attacks (none -> startup) per second of fight time
idle time:           share of fight time with no attack running on either side
distinct positions:  distinct 100 mm cells each side visits
contact share:       share of fight time inside both body radii + 40 mm
retreats:            retreat orders issued, home then away
dead zone:           commits that missed only the move's inner edge, as a share of commits (FR-7)
cap share:           fights decided at FIGHT_CAP_MS (40000 ms) rather than by knockout (AC-7)

#  matchup                               time    ending blows   commits   gap min/med/max   cells     idle
1  fire_drake v plant_ox                 28.24s  ko     9-5     11-6      559/1268/3984     143-174   27.0%
2  plant_ox v embercub                   40.00s  time   9-8     11-13     499/1157/3984     238-233   30.0%
3  water_axolotl v cindermoor            19.44s  ko     7-5     9-7       441/945/3984      55-46     16.6%
4  electric_hound v fernstag             39.42s  ko     11-10   13-15     520/1028/3984     188-150   29.0%
5  fernstag v fire_drake                 27.26s  ko     7-7     10-8      540/1061/3984     83-105    24.2%
6  wind_falcon v shalemole               29.34s  ko     1-6     10-11     409/1071/3984     280-143   22.0%
7  reefclaw v earth_tortoise             40.00s  time   8-5     13-7      579/1222/3984     173-176   32.3%
8  earth_tortoise v electric_hound       40.00s  time   8-8     9-14      539/1008/3984     123-167   22.6%
9  cindermoor v mistkit                  22.08s  ko     6-6     7-6       450/1016/3984      55-48     15.1%
10 voltfox v galeheron                   14.48s  ko     4-6     5-8       390/919/3984      48-56     25.3%
11 galeheron v reefclaw                  34.72s  ko     13-8    15-10     459/1018/3992     171-140   26.5%
12 shalemole v water_axolotl             40.00s  time   9-12    13-13     420/987/3984      182-170   23.8%
13 embercub v mossboar                   40.00s  time   8-9     12-9      470/1016/3984     180-225   23.6%
14 mossboar v voltfox                    40.00s  time   6-13    8-16      480/985/3984      152-135   23.1%
15 mistkit v wind_falcon                 34.18s  ko     7-10    14-11     400/1144/3984     137-265   30.7%
16 fire_drake v water_axolotl            24.20s  ko     2-8     8-10      460/878/3984      57-67     19.8%
17 plant_ox v mossboar                   40.00s  time   9-7     13-8      569/1097/3984     169-182   22.9%
18 water_axolotl v voltfox               40.00s  time   8-9     10-14     409/1093/3984     205-193   34.9%
19 electric_hound v wind_falcon          32.32s  ko     11-9    12-15     428/1092/3984     179-232   35.3%
20 fernstag v plant_ox                   40.00s  time   10-11   14-12     580/1135/3984     149-130   35.3%
21 wind_falcon v embercub                40.00s  time   12-7    17-10     381/977/3984      303-262   33.5%
22 reefclaw v cindermoor                 32.66s  ko     7-10    8-12      519/1017/3984     131-105   13.1%
23 earth_tortoise v fernstag             40.00s  time   6-10    10-12     579/1305/3984     124-262   20.0%
24 cindermoor v fire_drake               39.96s  ko     7-11    11-14     499/969/3984      115-134   23.2%
25 voltfox v shalemole                   16.08s  ko     8-2     8-4       430/1068/3992     105-99    15.8%
26 galeheron v earth_tortoise            33.78s  ko     9-6     11-9      480/1252/3984     189-108   15.5%
27 shalemole v electric_hound            40.00s  time   8-7     13-14     459/1136/3984     155-247   23.6%
28 embercub v mistkit                    29.44s  ko     5-8     9-11      410/1011/3984     128-149   25.9%
29 mossboar v galeheron                  40.00s  time   8-11    13-14     449/1052/3984     157-227   24.3%
30 mistkit v reefclaw                    40.00s  time   5-5     10-14     489/1225/3992     268-169   21.5%
31 fire_drake v electric_hound           38.54s  ko     12-10   14-11     500/1046/3984     159-219   26.0%
32 plant_ox v mistkit                    36.38s  ko     8-8     10-11     510/1020/3984     222-176   35.3%
33 water_axolotl v galeheron             32.56s  ko     11-5    11-7      380/1169/3984     226-239   33.0%
34 electric_hound v reefclaw             40.00s  time   5-10    10-13     520/1299/3984     291-157   22.4%
35 fernstag v water_axolotl              23.18s  ko     9-5     10-8      480/1077/3984     121-124   26.2%
36 wind_falcon v mossboar                40.00s  time   11-7    14-14     460/1301/3984     304-142   32.2%
37 reefclaw v voltfox                    40.00s  time   8-9     13-11     485/1129/3984     152-250   17.5%
38 earth_tortoise v wind_falcon          40.00s  time   6-8     11-15     489/949/3984      101-177   27.4%
39 cindermoor v plant_ox                 27.16s  ko     10-5    12-6      540/1294/3984     125-195   18.7%
40 voltfox v embercub                    40.00s  time   9-6     11-14     410/1104/3984     243-217   28.3%
41 galeheron v cindermoor                28.90s  ko     12-5    13-9      420/966/3984      146-139   23.9%
42 shalemole v fernstag                  40.00s  time   9-10    11-14     500/1092/3984     231-228   31.2%

engagement:  min 380 mm  median 1079 mm  max 3992 mm
exchange:    home 0.32/s  away 0.32/s  combined 0.64/s
idle:        25.7%
contact:     6.7%
retreats:    home 18948  away 19333
dead zone:   27 commits (2.9%)
positions:   min 46 cells  median 163 cells
cap share:   20/42 (47.6%)
duration:    14.48s .. 40.00s

estimate stability: each metric re-pooled at 14, 30, 42 fights (retreats per fight)
metric            n=14          n=30          n=42          
engagementMin     390 mm        381 mm        380 mm        
engagementMedian  1048 mm       1069 mm       1079 mm       
engagementMax     3992 mm       3992 mm       3992 mm       
exchangeHome      0.32/s        0.32/s        0.32/s        
exchangeAway      0.31/s        0.32/s        0.32/s        
idleShare         25.0%         25.1%         25.7%         
distinctPositions 46 cells      46 cells      46 cells      
contactShare      6.6%          7.0%          6.7%          
retreatHome       434.86/fight  441.87/fight  451.14/fight  
retreatAway       448.21/fight  455.20/fight  460.31/fight  
deadZoneShare     3.1%          3.4%          2.9%          
capShare          42.9%         46.7%         47.6%         
durationMin       14.48s        14.48s        14.48s        
durationMax       40.00s        40.00s        40.00s        

ok   engagementMin: observed 380 mm, bound <= 900 mm
ok   engagementMedian: observed 1079 mm, bound <= 1500 mm
ok   engagementMax: observed 3992 mm, bound <= 4500 mm
ok   exchangeHome: observed 0.32/s, bound <= 2.50/s
ok   exchangeAway: observed 0.32/s, bound <= 2.50/s
ok   idleShare: observed 25.7%, bound <= 50.0%
ok   distinctPositions: observed 46 cells, bound >= 20 cells
ok   contactShare: observed 6.7%, bound <= 70.0%
ok   retreatHome: observed 18948 orders, bound >= 42 orders
ok   retreatAway: observed 19333 orders, bound >= 42 orders
ok   deadZoneShare: observed 2.9%, bound <= 50.0%
ok   capShare: observed 47.6%, bound <= 60.0%
ok   durationMin: observed 14.48s, bound >= 8.00s
ok   durationMax: observed 40.00s, bound <= 40.00s
```

## 5. Command table

| command | exit | result |
| --- | --- | --- |
| `bun run telemetry` | 0 | 42 fights printed, `cap share: 20/42 (47.6%)`, all 14 bounds `ok` |
| `bun run verify` | 0 | 4151 pass, 1 skip, 0 fail, 4152 tests / 374 files, 491140 assertions; Biome clean (935 files); voxel determinism gate OK (45 meshes + 5 props byte-identical) |
| `bun run build` | 0 | `@apex/client` 418 modules transformed, built in 324 ms (pre-existing >500 kB chunk warning only) |

The first `bun run verify` attempt exited 1 on a Biome `organizeImports` error in
`telemetry.test.ts` (the new `ALL_SPECIES` import was above the
`battle-telemetry` import). Fixed exactly as Biome suggested and re-run green;
all tests had already passed on that attempt (4151/0).

## 6. The one-in-three debt: still owed

`cap.count * 3 = 60 > 42`, so the debt pin stays. **20 of 42 fights (47.6%) still
run out the clock**, against a one-in-three target of 14/42. The re-composition
removed the fixture's inflation, not the pacing shortfall: Phase 1's D-1 (global
throughput shortfall) and D-2 (the tortoise's kite band at `spd 5`) remain open,
and `earth_tortoise` is still a side in several caps (rows 7, 8, 23, 38).
The 840-fight matrix is unchanged at 224/840 (26.7%) and still green.

## 7. `pacing.test.ts`: untouched

It builds its **own** 14 × 3 walk (home `roster[i % roster.length]`, away
`roster[(i * 5 + 7) % roster.length]` with the hop, offsets `[0, 1, 2]`) and does
not call `matchups()`. Re-composing it would be a second, unapproved goalpost
move, so its composition is left alone. Checked for state change: it was run
before and after this phase's edits and is byte-identical in behaviour — 4 pass,
0 fail, 87 assertions, and its `test.failing("the sample finishes a majority of
fights by knockout")` still fails as designed (no promotion, no `.skip`, no
comment change). Nothing in that file names 14 pairings or the telemetry sample
in a way this phase made false.

## 8. Decisions I had to make

1. **Stride 11 with a `+1` offset, not the suggested stride 7.** The suggested
   rule collides after the mirror hop (three duplicates, 39 distinct pairings —
   see §2). The offset also means the hop never fires on this roster, which makes
   distinctness provable without reasoning about hop collisions. The hop and the
   `throw` guard are kept as written.
2. **`capShare`'s `why` records both readings; the other 13 `why` strings were
   left byte-identical.** Their quoted measurements are the shipped 14×3
   readings and several have moved on the new sample (e.g. `distinctPositions`
   quotes 65, now 46; `durationMin` quotes 18.44 s, now 14.48 s). The brief asked
   for `capShare`'s `why` to carry both readings and for the evidence to carry
   the per-bound old/new values, so the table in §3 is the record and no other
   `BOUNDS` entry was edited. Refreshing those annotations would be a separate,
   purely documentary change.
3. **Seeds stay `20261108 + i`.** Contiguous, deterministic, and — because the
   base is even — exactly 21 even and 21 odd, so the balanced/specials split is
   even. No other seed scheme was needed.
4. **The new composition pin lives in `telemetry.test.ts`, not `pacing.test.ts`.**
   `pacing.test.ts` deliberately keeps its own independent walk; the pin that
   stops the *gate* sample drifting belongs with the gate.

## Deviations

None. Only the two files in `Touches` changed, plus this evidence file.

## Primary verification

Run independently by the primary on the phase tip.

| Command | Exit | Result |
| --- | --- | --- |
| `bun run telemetry` | 0 | `cap share: 20/42 (47.6%)`, `dead zone: 27 commits (2.9%)`, 14/14 bounds `ok`, `durationMin` 14.48 s, `distinctPositions` 46 |
| `bun run verify` | 0 | 4,151 pass / 1 skip / 0 fail, 4,152 tests across 374 files, 76.54 s; Biome 935 files clean; determinism gate 46 GLBs + 5 props byte-identical |
| `bun run build` | 0 | only the pre-existing >500 kB chunk warning |

**Diff review.** `git diff --name-only 4f7ef057..HEAD` lists exactly three files:
`battle-telemetry.ts`, `telemetry.test.ts` and this evidence file. `PAIRINGS`
14 → 42 and `SEEDS_PER_PAIRING` 3 → 1, so `SAMPLE_SIZE` stays 42 and the gate costs
what it cost before. No `BOUNDS` value changed — the only `BOUNDS` edit in the diff
is `capShare.why` prose. No file under `packages/sim/src/` other than a test was
touched, so no simulation behaviour, replay hash or `SIM_VERSION` could move.

**Rule check.** The pairing rule is `away = (i * 11 + lap + 1) % 15`, stride 11
coprime to 15. Distinctness holds because `home` fixes `i % 15` and `lap` fixes
`floor(i / 15)`, so the pair determines `i`; coverage holds because lap 0 and lap 1
each place every species on the away side once and home cycles the roster. The new
pin proves all of it at run time rather than by argument: 42 distinct pairings,
42 distinct seeds, no mirrors, every species home and away at least twice, and a
second `matchups()` call returning the same list. I re-ran `bun run telemetry`
myself and got the same `20/42`.

**Finding — the fixture still does not read like the matrix, and the reason is the
stat basis, not this change.** The re-composed sample measures 47.6% cap while the
840-fight balance matrix measures 26.7% on the same tree. The difference is not
composition any more: `measureFight` builds both sides from
`REFERENCE = { hp: 189, atk: 10, def: 10, spd: 10 }` clamped *up* into each
species' bounds (`atk 10` → 11 for the tortoise, 15 for a striker), whereas the
balance report fights each species at its **bounds midpoint** (`atk` 13 for the
tortoise). Reference-stat bodies hit softer and carry deeper effective pools, so
more fights run out the clock. Recorded as **debt D-4**: the harness measures
reference-stat pacing, not species pacing, and closing that gap means changing the
stat basis of the gate — a measurement redesign this track did not approve. The
`capShare` ceiling was chosen to absorb exactly that conservatism.

**Debt still owed.** The spec's own one-in-three target is still missed: 20/42
(47.6%) against 14/42. The pin is kept, not promoted. Phase 1's **D-1** (global
throughput shortfall) and **D-2** (kite band vs `spd 5`) remain the causes, and
`earth_tortoise` is still a side in four of the twenty caps.

**AC verdicts.** AC-3 met (42 distinct pairings, every species home and away ≥ 2,
pinned). AC-4 met (20/42 ≤ 21/42, with one fight of headroom, asserted in
`telemetry.test.ts`). AC-6 met (14/14 bounds green, none widened or lowered). AC-8
met trivially and provably (`SIM_VERSION` still 3; no simulation file in the diff).
AC-9 met (both readings recorded side by side, with the not-comparable statement
in the `BOUNDS` rationale, the test comment and this file).
