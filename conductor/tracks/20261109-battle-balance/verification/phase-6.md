# Phase 6 — Balance Report Harness

- **Track:** 20261109-battle-balance
- **Phase:** 6 — Balance Report Harness
- **Date:** 2026-11-09
- **Branch:** `feat/20261109-battle-balance`
- **Base:** `a7f50e84`
- **Code commit:** `2cde9cee` (`feat(sim): measure the roster, doctrines, bosses and band in one command (FR-4..FR-7, AC-4..AC-7)`)
- **Goal:** every claim in the spec is one deterministic command (FR-4, FR-5, FR-6,
  FR-7, AC-4, AC-5, AC-6, AC-7).

## Result

`bun run balance` is now the instrument Phase 8 tunes against. It measures the
species matrix, the doctrine table, the boss table, the 49-move base-hit band and
the duration distribution from the public resolver, prints an `ok`/`FAIL` line per
target in the same shape as `battle-telemetry.ts`, and exits non-zero naming each
violated target with its observed value and bound.

The roster does **not** pass today. That is expected: Phase 8 owns the re-tune.
The gate is honest, no bound was weakened, and today's misses are recorded by name
in the co-located test so a stale list fails loudly instead of passing quietly.

The harness is new files plus one `package.json` entry. No simulation behaviour,
frame data, power, cooldown, doctrine row, chart entry or bound was changed.

## Commands

| Command | Exit | Notes |
| --- | --- | --- |
| `bun run verify` | 0 | typecheck clean (160 voxel / 233 sim / 44 server / 511 client files); 3943 pass, 1 skip, 0 fail, 454,684 expects, 3944 tests / 366 files, 49.41 s; biome 911 files clean; determinism gate 46 meshes + 5 props byte-identical |
| `bun run build` | 0 | vite 409 modules, 362 ms, chunk-size warning only |
| `bun run balance` | 1 (by design) | prints the full report, then 13 `FAIL` lines naming today's misses; see below |

Runtime: the whole report is ~7 s on this machine (the co-located test measures
and prints it in 6.66 s), well inside the CI budget.

## Sample size and why

- **Species matrix:** 15 species, mirrors excluded, so 15 × 14 = 210 ordered
  pairings, each fought under both matrix seeds = **420 fights**, 56 games per
  species. Two seeds — one odd, one even — are enough because the continuous
  engine draws nothing from the seed; the seed only decides a capped fight's
  tiebreak (`resolve.ts`). More seeds would repeat the same 420 results.
- **Doctrine table:** 4 doctrines × 2 orders × 3 seeds = **24 fights**, 6 per
  doctrine, with the measured side taking each side once so a side bias cannot
  read as a doctrine effect.
- **Boss table:** 6 bosses × 15 species × 2 seeds = **180 fights**, 30 per boss.
- The matrix is quadratic, so the sample covers every ordered pairing exactly once
  rather than growing the seed count.

## Separation rules (FR-5, AC-5)

- **Species** are measured under one stated standard doctrine (`press`, the mapped
  default of the legacy `balanced` tactic and the most neutral band in the table).
- **Doctrines** are measured under one stated standard species (`fire_drake`)
  against one fixed opponent (`electric_hound`, chart-neutral against fire), with
  only the measured side's doctrine varying.
- Species and doctrines are never in the same table, and mirrors are excluded from
  the species matrix.

## Species matrix (standard doctrine, mirrors excluded)

| Species | Games | Wins | Draws | Win rate |
| --- | --- | --- | --- | --- |
| fire_drake | 56 | 18 | 0 | 32.1% |
| plant_ox | 56 | 18 | 0 | 32.1% |
| water_axolotl | 56 | 30 | 0 | 53.6% |
| electric_hound | 56 | 16 | 0 | 28.6% |
| fernstag | 56 | 28 | 0 | 50.0% |
| wind_falcon | 56 | 20 | 0 | 35.7% |
| reefclaw | 56 | 36 | 0 | 64.3% |
| earth_tortoise | 56 | 32 | 0 | 57.1% |
| cindermoor | 56 | 34 | 0 | 60.7% |
| voltfox | 56 | 46 | 0 | 82.1% |
| galeheron | 56 | 40 | 0 | 71.4% |
| shalemole | 56 | 40 | 0 | 71.4% |
| embercub | 56 | 30 | 0 | 53.6% |
| mossboar | 56 | 12 | 0 | 21.4% |
| mistkit | 56 | 20 | 0 | 35.7% |

Worst: `mossboar` 21.4%. Best: `voltfox` 82.1%. In band: water_axolotl, fernstag,
embercub only.

## Doctrine table (one species, one matchup, one row per doctrine)

| Doctrine | Fights | Win rate | Rear-or-flank | Median gap | Dodge rate |
| --- | --- | --- | --- | --- | --- |
| Press | 6 | 100.0% | 0.0% | 832 mm | 0.0% |
| Circle | 6 | 0.0% | 16.7% | 1106 mm | 0.0% |
| Kite | 6 | 100.0% | 0.0% | 1109 mm | 0.0% |
| Counter | 6 | 100.0% | 0.0% | 926 mm | 0.0% |

The doctrine effect is visible as a doctrine effect: Circle is the only row that
earns flank-or-rear blows (16.7% vs Press's 0.0%) and it holds the longest median
engagement (1106 mm vs 832 mm) — and in this particular matchup it loses all six
fights, because the fire drake's straight-line Press pressure beats a rear hunt
that spends its openings walking. The dodge column is measured, not asserted: no
shot in these 24 fights was slipped for `dodge`, so it reads 0.0% on every row.
The win-rate column at n=6 is a reading, not a gate; the movement columns are the
reason the table exists.

## Boss table (excluded from 45-55%, each must be beatable and not trivial)

| Boss | Species | Stage | Fights | Player won | Rate |
| --- | --- | --- | --- | --- | --- |
| koda | fire_drake | bronze promotion | 30 | 10 | 33.3% |
| hesse | plant_ox | silver checkpoint | 30 | 6 | 20.0% |
| marlow | water_axolotl | silver apex | 30 | 14 | 46.7% |
| delmar | water_axolotl | silver promotion | 30 | 8 | 26.7% |
| fenn | fire_drake | gold checkpoint | 30 | 17 | 56.7% |
| thessa | plant_ox | gold apex | 30 | 14 | 46.7% |

Every boss is beatable at the reference line and none is trivial (`0 < wins < 30`),
which is the documented answer FR-6 asks for. The intended stage is printed from
the boss definition's tier and milestone.

## Base-hit band (FR-1)

Measured on the reference body (`hp 189, atk 10, def 10, spd 10`), front, no
counter, chart-neutral — the same definition as `moves-band.test.ts`. The report
prints all 49 rows; the shares collapse to five values because the ladder is one
authored set:

| Power | Share of pool | Moves |
| --- | --- | --- |
| 10 | 5.29% | basic |
| 12 | 6.35% | tier-1 light rows (6) |
| 14 | 7.41% | fast chip rows (6) |
| 16 | 8.47% | tier-2 rows + signature defence rows (14) |
| 18 | 9.52% | tier-3 rows (6) |
| 20 | 10.58% | tier-4 rows + signature offence rows (12) |
| 22 | 11.64% | heavy finishers (6) |

49/49 inside 4-12%; observed median landed blow 9.52% of the victim's pool.

## Fight length and cap share (FR-4, AC-4)

- Fights: 420 — 68 knockout, 352 at cap, 0 draws.
- Duration: min 10.38 s, median 40.00 s, max 40.00 s.
- In the 25-40 s band: 360/420 (85.7%).
- **Cap share: 352/420 (83.8%)**, bound ≤ 33.3% — FAIL.

That 83.8% is much higher than telemetry's 50.0% because telemetry mixes
`balanced`/`specials` tactics (i.e. press and kite) while the standard matrix
measures press against press, and two press controllers at the reference line
grind to the cap. It is the honest baseline for the standard doctrine and is
Phase 8's to move (P8.T4 owns pacing).

## Known misses (recorded in the test, not weakened)

| Target | Observed | Bound |
| --- | --- | --- |
| species:fire_drake | 32.1% (18/56) | 45.0%..55.0% |
| species:plant_ox | 32.1% (18/56) | 45.0%..55.0% |
| species:electric_hound | 28.6% (16/56) | 45.0%..55.0% |
| species:wind_falcon | 35.7% (20/56) | 45.0%..55.0% |
| species:reefclaw | 64.3% (36/56) | 45.0%..55.0% |
| species:earth_tortoise | 57.1% (32/56) | 45.0%..55.0% |
| species:cindermoor | 60.7% (34/56) | 45.0%..55.0% |
| species:voltfox | 82.1% (46/56) | 45.0%..55.0% |
| species:galeheron | 71.4% (40/56) | 45.0%..55.0% |
| species:shalemole | 71.4% (40/56) | 45.0%..55.0% |
| species:mossboar | 21.4% (12/56) | 45.0%..55.0% |
| species:mistkit | 35.7% (20/56) | 45.0%..55.0% |
| capShare | 83.8% (352/420) | ≤ 33.3% |

`balance-report.test.ts` asserts `violations(sample()).map(describe)` equals this
list exactly, so Phase 8 fixing a row fails the test until the row is updated —
the bound itself is never touched.

## Determinism (AC-7)

- Fixed seed sets: matrix `[20261109, 20261110]`, doctrines
  `[20261109, 20261110, 20261111]`, bosses `[20261109, 20261110]`.
- The test resolves the sample twice and asserts the printed report is byte
  identical, and asserts the output contains no clock time (`\d{2}:\d{2}`).
- No wall clock, no `Date`, no unseeded randomness in the harness.

## AC map

| AC | Test |
| --- | --- |
| AC-1 (band) | `the base-hit band is measured, not assumed (FR-1)` — min 5.29%, max 11.64%, `damageBand` ok |
| AC-4 (cap, duration) | `reports the roster...` and the `capShare`/`durationBand`/`durationMin`/`durationMax` targets |
| AC-5 (species band) | `today's misses are named targets with their observed values` (the gate fails by name) |
| AC-6 (bosses) | `bosses are a separate table, each beatable and not trivial (FR-6)` |
| AC-7 (one command) | `the gate exits non-zero and names the violated target`, `the report replays byte for byte with no wall clock in it` |
| FR-5 separation | `species and doctrines are measured separately (FR-5, AC-5)` — Circle's rear-or-flank > Press's, and Circle's median gap > Press's |

## Deviations

| File | Why |
| --- | --- |
| `package.json` | added `"balance": "bun packages/sim/scripts/battle-balance-report.ts"` after `trace` (the brief's Touches list) |

Roster and pacing `test.failing` markers were not touched and remain Phase 8's.

## Notes

- The species matrix shows a clear spread the current roster cannot hide: 12 of 15
  species sit outside 45-55% under the standard doctrine. That is the Phase 8
  baseline, not a harness defect.
- The report prints the doctrine matchup and the reference line in its header so a
  reader never has to guess which species or doctrine a row belongs to.
- The harness is a consumer of the public resolver (`resolveContinuous`), not a
  re-implementation; `battle-telemetry.ts` stays the movement/pacing read and
  `battle-balance-report.ts` is the roster/band/boss read.
