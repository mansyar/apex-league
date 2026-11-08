# Phase 12 — Telemetry Harness (FR-14, AC-14, AC-24)

- Track: `20261108-continuous-arena-battle`
- Branch: `feat/20261108-continuous-arena-battle`
- Phase base: `bb76bef6d8d0178f9724a1f5e73bd5d802e16fe3`
- Status: **verified** (one command could not be run by the phase executor; see §6)

"Not turn-based" is now a measurement. The harness plays the same 14 seeded
matchups `pacing.test.ts` pins, through the same `resolveContinuous` the cup
calls, and reads the per-step stream the resolver already records
(`streamOf`). No file under `packages/sim/src/battle/continuous/` changed except
the new test.

## 1. The command

```
bun run telemetry
```

which runs `bun packages/sim/scripts/battle-telemetry.ts` (one `package.json`
entry, matching `gate:determinism`). It prints the table and the bound lines,
exits `0` when every bound holds, and exits `1` with a `FAIL <metric>: observed
…, bound …` line when one does not.

## 2. Measured table (14 matchups, seeds `20261108 + i`)

`blows` and `commits` are home-away; `gap` is the centre-to-centre distance in
mm as min/median/max over the fight's steps; `cells` is the count of distinct
100 mm positions each side visited.

| # | matchup | duration | ending | blows | commits | gap min/med/max | cells | idle |
|---|---------|---------:|--------|-------|---------|-----------------|-------|------|
| 1 | fire_drake v earth_tortoise | 40.00 s | time | 85-85 | 85-86 | 558/562/3984 | 102-91 | 36.1% |
| 2 | plant_ox v embercub | 29.24 s | ko | 46-59 | 46-59 | 499/538/3984 | 92-90 | 36.9% |
| 3 | water_axolotl v electric_hound | 27.20 s | ko | 46-59 | 46-60 | 439/450/3984 | 83-66 | 22.2% |
| 4 | electric_hound v earth_tortoise | 40.00 s | time | 91-38 | 92-38 | 539/542/3984 | 123-121 | 22.8% |
| 5 | fernstag v embercub | 25.28 s | ko | 53-55 | 53-56 | 479/503/3984 | 66-82 | 38.2% |
| 6 | wind_falcon v water_axolotl | 29.60 s | ko | 67-53 | 68-53 | 389/415/3984 | 91-89 | 22.2% |
| 7 | reefclaw v earth_tortoise | 40.00 s | time | 54-84 | 55-86 | 579/616/3984 | 116-45 | 40.3% |
| 8 | earth_tortoise v embercub | 40.00 s | time | 66-85 | 67-86 | 482/541/3984 | 94-111 | 37.0% |
| 9 | cindermoor v water_axolotl | 34.40 s | ko | 74-57 | 74-57 | 439/508/3984 | 89-110 | 25.9% |
| 10 | voltfox v earth_tortoise | 39.68 s | ko | 90-58 | 90-58 | 509/520/3984 | 137-82 | 38.4% |
| 11 | galeheron v embercub | 40.00 s | time | 61-55 | 62-57 | 379/465/3984 | 201-136 | 35.4% |
| 12 | shalemole v water_axolotl | 39.68 s | ko | 88-69 | 89-69 | 419/468/3984 | 50-87 | 22.4% |
| 13 | embercub v earth_tortoise | 40.00 s | time | 85-66 | 86-67 | 482/541/3984 | 111-93 | 37.0% |
| 14 | mossboar v embercub | 38.48 s | ko | 86-71 | 87-71 | 469/478/3984 | 60-90 | 22.2% |

Sample totals:

| metric | value |
|---|---|
| engagement distance | min 379 mm, median 539 mm, max 3984 mm |
| exchange rate | home 1.99 attacks/s, away 1.79 attacks/s, combined 3.78 attacks/s |
| idle time | 31.4% of fight time |
| distinct positions | min 45 cells, median 91 cells |
| cap share | 6/14 (42.9%) |

This reproduces the Phase 10 reference sample exactly: 14 matchups, 25.28-40.00 s,
8 knockouts and 6 cap decisions, both sides landing in all 14. Blow counts match
Phase 10 row for row, which is the cross-check that the stream reader sees the
same fight the event log does.

### What each metric means (also printed by the harness)

- **Engagement distance** — centre-to-centre gap in mm, sampled once per step.
  Stream index 0 is the opening pose, which is staging, so it is excluded.
- **Exchange rate** — a commit is a step where a side's attack phase moves from
  `none` to `startup`. It counts even if the attack is later interrupted,
  because the fighter still chose to commit. Reported per side and combined.
- **Idle time** — the share of steps on which neither side has an attack in any
  phase. Hitstun counts as idle: a body held in hitstun has no attack running.
- **Distinct positions** — distinct 100 mm cells visited per side. Two poses
  score two; continuous movement scores many.

## 3. Bounds, and why each has headroom

The engine is deterministic, so the seeded sample cannot flake. The risk the
headroom guards against is a one-point move in an unrelated constant on another
track.

| bound | threshold | measured | headroom |
|---|---|---|---|
| engagement min | <= 900 mm | 379 mm | 2.4x; a body would have to stop closing by 137% to fail |
| engagement median | <= 1500 mm | 539 mm | 2.8x; the widest per-fight median is 616 mm |
| engagement max | <= 4500 mm | 3984 mm | 516 mm; a gross-disengagement guard, see below |
| exchange, home | >= 1.00 attacks/s | 1.99/s | 2.0x |
| exchange, away | >= 1.00 attacks/s | 1.79/s | 1.8x |
| idle time | <= 40.0% | 31.4% | 8.6 points (27% relative) |
| distinct positions | >= 30 cells | 45 cells (worst side in the worst fight) | 1.5x |
| cap share | <= 50.0% | 42.9% | one more cap fight (7/14) still passes; AC-24's own ceiling |

**Honest limitation of `engagement max`.** It reads 3984 mm in all 14 fights
because the first sampled step is still the opening stance: the bodies open
4,000 mm apart and have closed 16 mm. So the max is *not* an engagement claim;
the median is. The max bound exists only to catch a regression where a side
flees across the 8 x 6 m arena (up to 10,000 mm apart) for most of the fight.
This is stated in the harness output's metric definition and here rather than
dressed up as a tight bound.

`capShare` is the spec's ceiling (AC-24), not a measured choice. The measured
42.9% is the same six fights Phase 10 recorded, so the gate confirms the status
quo rather than tightening it.

## 4. AC table

| AC | requirement | harness output | named test(s) |
|---|---|---|---|
| AC-14 | the harness reports the four metrics and fails when a threshold is violated | the table and the four summary lines; `FAIL <metric>: observed <value>, bound <op> <value>` | `telemetry.test.ts` — "reports the four metrics for every matchup"; "a violated threshold is named with its observed value (AC-14)"; "the harness exits non-zero when a bound is violated (AC-14)" (calls `run()` with a stalled sample and asserts `1`); "every metric has a bound, so none can be reported unenforced" |
| AC-14 | the four metrics are bounded, not just printed | `BOUNDS` (8 rows: three engagement, two exchange, idle, distinct, cap) | "the fighters close to fighting range and stay engaged"; "both sides keep committing attacks and the fight is not idle"; "every side visits many distinct positions" |
| AC-24 | the sample reports the share of fights decided at the cap, and it does not exceed one in two | `cap share: 6/14 (42.9%)` | "at most one fight in two is decided at the cap (AC-24)" |
| FR-14 | thresholds are enforced in CI | the bound lines and the non-zero exit | the CI step `bun run telemetry`; the same `BOUNDS` are asserted inside `bun run verify` by `telemetry.test.ts` |

The sample replays byte for byte ("the sample replays byte for byte"), and
`run(measure())` is the single code path the test and the command share, so the
readable report and the CI gate cannot drift.

## 5. Commands

| command | exit | result |
|---|---|---|
| `bun test --timeout 120000 packages/sim/src/battle/continuous/telemetry.test.ts` | 0 | 9 pass, 0 fail, 185 `expect()` calls, 0.46 s |
| `bun run verify` | 0 | 3,774 pass, 1 skip, 0 fail, 465,682 `expect()` calls, 3,775 tests across 351 files, 64.56 s; typecheck clean on all four packages; Biome clean on 879 files; determinism gate byte-identical |
| `bun run build` | 0 | Vite 8.3.4, 396 modules, 559 ms; only the pre-existing chunk-size warning |
| `bun run telemetry` | not run by the phase executor — permission denied (see §6) | — |

The suite grew by 9 tests and ~0.5 s; it is still well inside the 150 s budget.

## 6. Blockers

`bun run telemetry` (and the direct `bun packages/sim/scripts/battle-telemetry.ts`
form) is not in the phase executor's permitted shell commands; both were denied.
The exact same code path is exercised by `telemetry.test.ts`, which calls
`run(measure())` and asserts exit `0` on the sample and exit `1` on a violated
bound, so the behaviour is verified — only the standalone invocation is not. The
primary should run:

```
bun run telemetry
```

Expected: the table in §2, eight `ok …` lines, exit `0`.

## 7. Deviations

| file | why |
|---|---|
| `package.json` (root) | added `"telemetry": "bun packages/sim/scripts/battle-telemetry.ts"`, matching the existing `gate:determinism` entry, so the harness is one command and CI calls the same string |
| `.github/workflows/ci.yml` | the telemetry step after `bun run verify` (the file is in Touches) |
| `telemetry.test.ts` imports `../../../scripts/battle-telemetry` | deliberate: the brief names exactly two new files, so the bound table and the measurement live in the script and the test consumes them. `packages/sim`'s `tsconfig` includes only `src`, but the import pulls the script into the type-checked program, so both files are checked |

Untouched: every file under `packages/sim/src/battle/continuous/` except the new
test; `*.balance.test.ts`; `battle/resolver.ts`; the legacy clock; `SIM_VERSION`.
