# Phase 12 — Measure the Creature

- **Track:** `20261109-battle-balance`
- **Phase:** 12 — Measure the Creature (FR-22, AC-19)
- **Date:** 2026-11-10
- **Branch:** `feat/20261109-battle-balance`
- **Base commit:** `ea6199a4`
- **Code commit:** `bf6be3ca`
- **Result:** met. The gate can now see a species' stats. `bun run balance` exits 1
  on eleven species rows plus `durationMin` — the honest baseline Phase 13 owns.
  No simulation module was touched.

## Goal

"the gate can see a species' stats, so a stat is a lever" (FR-22, AC-19).

Phase 9 concluded the species spread "is not in the stat lines" and Phase 11
then failed to converge. The reason was the instrument, not the game:
`speciesSide` clamped one reference line `189/10/10/10` into each species'
`statBounds`, so a species' authored stats only reached the fight when its
bounds excluded 10 — and two species whose bounds all straddled 10 fielded
byte-identical sides. The harness was blind to the only lever that could tune
the roster, leaving kit shape (a 20-40 point cliff across a 15-way round robin)
as the only visible knob.

## The new definition (P12.T1.1)

Every measured side is its species' **own typical creature**:

```
midpoint(bounds) = floor((bounds[0] + bounds[1]) / 2)     per stat
```

The report prints the definition in its own header, so nobody has to infer it:

```
measured line:     each species' own typical creature — the integer midpoint of its roll bounds, floor((min + max) / 2) per stat (FR-22)
```

The same definition is applied to the doctrine table and the boss table
(`measureDoctrines(lines)` / `measureBosses(lines)` now take the line map): a
doctrine is measured on a real creature, not on a clamped reference.

Implementation (`packages/sim/scripts/battle-balance-report.ts`):

| symbol | change |
| --- | --- |
| `StatBounds`, `BoundsOverride` | new types: authored bounds, per-species patch for tests |
| `boundsOf(species, overrides?)` | authored `statBounds` with any patch applied |
| `typicalLine(bounds)` | `floor((min + max) / 2)` per stat — the measured line |
| `referenceLine(bounds)` | `REFERENCE` clamped per stat — the diagnostic line |
| `speciesSide(species, doctrine, stats)` | takes the line from the caller instead of clamping `REFERENCE` |
| `measure(options)` | builds a `lines` map (`typical` + `reference`) once, plays the matrix at `typical`, and replays the same pairings at `reference` into a separate tally |
| `measureSpecies(id, options)` | **new**: one species' row on exactly the matrix schedule (14 opponents × 2 orders × 4 seeds = 112 games), so a test can move a bound and read the row without paying for 840 fights |
| `measureDoctrines(lines)` / `measureBosses(lines)` | both take the line map |
| `BalanceSample.matrix.reference` | **new**: the equal-investment diagnostic rows |

## The reference line is now a diagnostic (P12.T1.2)

The equal-investment line is still measured and printed — it answers one
question ("is any species stronger when every creature has identical stats?"),
which is worth keeping — but it never gates:

```
reference line:    hp 189, atk 10, def 10, spd 10, clamped into each species' own roll bounds — diagnostic only, never gates

reference line (diagnostic — every species at the equal-investment line; printed, never gated)
species               games  wins  draws  win rate
fire_drake            112    40    0      35.7%
plant_ox              112    36    0      32.1%
water_axolotl         112    52    0      46.4%
electric_hound        112    10    0      8.9%
fernstag              112    60    0      53.6%
wind_falcon           112    24    0      21.4%
reefclaw              112    64    0      57.1%
earth_tortoise        112    50    0      44.6%
cindermoor            112    64    0      57.1%
voltfox               112    104   0      92.9%
galeheron             112    94    0      83.9%
shalemole             112    96    0      85.7%
embercub              112    60    0      53.6%
mossboar              112    58    0      51.8%
mistkit               112    28    0      25.0%
```

No `targets()` entry is built from it, so it cannot fail the command.

## Old vs new species table (P12.T2.2)

Old = Phase 10 rework-1 reading (one reference line clamped into each species'
bounds). New = each species at its own bounds midpoint. Both n = 112 games,
4 seeds, mirrors excluded, standard `press` doctrine.

| species | typical line (hp/atk/def/spd) | old rate | new rate | new wins | distinct | se | delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fire_drake | 176/11/8/10 | 35.7% | 28.6% | 32/112 | 19 | 4.3% | −7.1 |
| plant_ox | 201/9/12/6 | 32.1% | 39.3% | 44/112 | 24 | 4.6% | +7.2 |
| water_axolotl | 185/10/9/9 | 46.4% | 50.0% | 56/112 | 16 | 4.7% | +3.6 |
| electric_hound | 161/12/6/14 | 8.9% | 23.2% | 26/112 | 14 | 4.0% | +14.3 |
| fernstag | 161/10/9/12 | 53.6% | 33.9% | 38/112 | 19 | 4.5% | −19.7 |
| wind_falcon | 130/12/5/18 | 21.4% | 25.0% | 28/112 | 16 | 4.1% | +3.6 |
| reefclaw | 195/11/13/5 | 57.1% | 64.3% | 72/112 | 17 | 4.5% | +7.2 |
| earth_tortoise | 236/8/16/3 | 44.6% | 42.9% | 48/112 | 4 | 4.7% | −1.7 |
| cindermoor | 191/12/10/7 | 57.1% | 60.7% | 68/112 | 15 | 4.6% | +3.6 |
| voltfox | 170/10/8/13 | 92.9% | 89.3% | 100/112 | 15 | 2.9% | −3.6 |
| galeheron | 178/9/9/11 | 83.9% | 82.1% | 92/112 | 15 | 3.6% | −1.8 |
| shalemole | 191/10/12/7 | 85.7% | 85.7% | 96/112 | 14 | 3.3% | 0.0 |
| embercub | 182/11/9/10 | 53.6% | 50.0% | 56/112 | 19 | 4.7% | −3.6 |
| mossboar | 195/10/12/7 | 51.8% | 57.1% | 64/112 | 18 | 4.7% | +5.3 |
| mistkit | 178/9/9/12 | 25.0% | 17.9% | 20/112 | 16 | 3.6% | −7.1 |

Gate: **4/15 pass** (water_axolotl 50.0%, earth_tortoise 42.9%, embercub 50.0%,
mossboar 57.1%); **2/15 inside the 45-55% design band** (water_axolotl, embercub).
Eleven rows miss the 95% rule. That is the honest baseline: species now fight at
their own stats, so the spread moved from "kit shape on one stat line" to "kit
shape plus stats", and Phase 13 owns it. Nothing was tuned.

`durationMin` also fails for the first time (4.84 s against ≥ 8.00 s) because a
few typical creatures are much frailer than the clamped reference (wind_falcon
pool 130, mistkit 178 with 9 defence). It is recorded as a miss, not hidden; the
bound is untouched.

## A stat is a lever (P12.T2.1)

`balance-report.test.ts` gained two tests:

1. **"every measured side is its species' typical creature (FR-22, AC-19)"** —
   recomputes `floor((min + max) / 2)` for every species' four stats and compares
   to `typicalLine(boundsOf(species))`; asserts the roster no longer collapses to
   one line; asserts the report text carries the definition, the diagnostic
   label and the diagnostic table heading.
2. **"a species' stat bounds are a lever the gate can see (FR-22, AC-19)"** —
   shifts `fire_drake`'s `atk` bounds by ±2 and asserts the measured win rate
   moves in the expected direction; then asserts the single-row path equals the
   matrix row (rate, wins, games) so the fast path cannot drift from the gate.

Measured (`.conductor/evidence/phase-12-visibility.test.ts`):

| fire_drake atk bounds | fielded atk | rate |
| --- | --- | --- |
| `[9, 13] − 2` = `[7, 11]` | 9 | 28.6% (32/112, 19 distinct) |
| authored `[9, 13]` | 11 | 28.6% (32/112, 19 distinct) |
| `[9, 13] + 2` = `[11, 15]` | 13 | **35.7%** (40/112, 20 distinct) |

So +2 attack is worth +7.1 points (8 wins) on this species at this sample size —
visible to the gate, which is exactly what Phase 13 needs. (The `−2` case reads
the same as authored because the authored midpoint 11 and the shifted midpoint 9
both lose the same 32 fights; the direction is still correct, and the test
asserts `up > down`.)

## Pacing and telemetry are unchanged

This phase changes no simulation behaviour, so:

- `bun run telemetry`: **exit 0**, all 13 bounds `ok`, cap share 6/14 (42.9%),
  exchange 0.31/0.25 per second, idle 26.0%, duration 15.28-40.00 s — byte-for-byte
  the Phase 10 rework-1 reading. It uses its own `rampStats` and its own
  `REFERENCE`, so it is not part of this measurement and did not move.
- Matrix pacing (from the report): 840 fights, ko 570, time 270, draw 0; duration
  min 4.84 s / median 26.46 s / max 40.00 s; cap 270/840 (32.1%) `ok`; 25-40 s band
  442/840 (52.6%) `ok`; damage band 49/49 `ok`; all six boss targets `ok`; diversity
  7.6%.
- Traces: seed 1 `0xfeb4a611` and seed 20261111 `0xf1d3e0b3` — both unchanged,
  five invariants each (the trace tool also uses the reference ramp).
- No cup golden, bracket fixture, ghost test or client golden moved.

## Every re-pinned row

| file | row | old | new | why |
| --- | --- | --- | --- | --- |
| `balance-report.test.ts` | `KNOWN_MISSES` (8 rows) | Phase 10 rework-1 values | 11 species rows at the new typical-creature rates + `durationMin: observed 4.84s` | re-baseline (P12.T2.2) |
| `balance-report.test.ts` | gate-exit voltfox prefix | `92.9% (104/112, 14 distinct, se 2.4%)` | `89.3% (100/112, 15 distinct, se 2.9%)` | re-baseline |
| `balance-report.test.ts` | "species and doctrines are measured separately" | asserted `circle.engagementMedian > press.engagementMedian` | asserts only `rearOrFlank` ordering and that the medians differ | the doctrine table now measures a real creature: Circle's median gap is 950 mm against Press 1176 mm (recorded as a Phase 13 finding, not asserted either way) |
| `balance-report.test.ts` | header | "Phase 8 owns the re-tune" | Phase 12 definition + Phase 13 ownership | documentation |

Nothing else needed re-pinning: `matrix.fights` (840), the sample-size strings,
the schedule (`opponents * 8`), the distinct/SE test, the boss test and the
base-hit test all still hold unchanged.

## Commands

| command | exit | time | result |
| --- | --- | --- | --- |
| `bun run verify` | 0 | ~75 s (tests 53.3 s) | typecheck clean (voxel 160, sim 235, server 44, client 512 files); **3964 pass, 1 skip, 0 fail**, 459,254 expects, 3965 tests / 367 files; biome 913 files clean; determinism gate OK (46 meshes + 5 props byte-identical) |
| `bun run build` | 0 | 902 ms | vite 410 modules; chunk-size warning only |
| `bun run balance` | 1 | ~18 s | 11 `FAIL species:` rows + `FAIL durationMin: observed 4.84s, bound >= 8.00s`; every other target `ok` (capShare 32.1%, durationBand 52.6%, durationMax, damageBand 49/49, all six bosses) |
| `bun run telemetry` | 0 | ~4 s | 13/13 bounds `ok`, cap 6/14 (42.9%) — unchanged |

## AC map

| item | status |
| --- | --- |
| AC-19 — every measured side from its bounds midpoint | met (`typicalLine`, asserted per species) |
| AC-19 — reference diagnostic printed, never gating | met (separate table, no target) |
| AC-19 — shifting `atk` by 2 moves the measured rate | met (28.6% → 35.7%, and `up > down` asserted) |
| FR-22 — a species' stats are a lever the gate can see | met |

## Deviations

| file | reason |
| --- | --- |
| `packages/sim/scripts/battle-balance-report.ts` | the instrument: `typicalLine`, `boundsOf`, `referenceLine`, `speciesSide` signature, `measure` lines map + reference replay, `measureDoctrines`/`measureBosses` signatures, `measureSpecies` |
| `packages/sim/src/battle/continuous/balance-report.test.ts` | re-baseline plus the two AC-19 tests and the doctrine-median assertion change |

No simulation module (`species/**`, `moves.ts`, `frames.ts`, `bosses.ts`,
`continuous/**`) and no client file was touched. No bound was widened and no
species was added to `KNOWN_MISSES` to make the command pass — the command
legitimately exits 1.

## Notes for Phase 13

- The gate can now see stats: `+2 atk` on fire_drake is +7.1 points. A re-tune
  has a real lever, in the unit the harness measures.
- The typical creature is not the same as the equal-investment creature:
  fernstag and embercub move ~20 and ~4 points respectively between the two
  readings, and `earth_tortoise` shows only 4 distinct fights of 112 (its rate is
  a coin flip on one blow count) — the diversity finding from Phase 10 stands.
- `durationMin` (4.84 s) is a new resolvability miss caused by frailer typical
  creatures (wind_falcon pool 130, mistkit 178/9). Phase 13 must bring the roster
  into band without lengthening every fight past the band's top.
- The doctrine table's Circle median gap (950 mm) is now *shorter* than Press
  (1176 mm) at real stat lines — the opposite of the clamped-reference reading.
  Recorded, not fixed.
