# Phase R3 — The Gate Can See

Branch `feat/20261109-battle-balance` (started at `ed9bf7f8`). Round 3 review blocked on one
defect: the species gate passed because it could not see. This phase fixes the measurement,
records the corrected baseline, tunes the rows that actually fail, gates cap-win quality on its
own, pins branch expected-damage parity, and corrects the shipped record in code.

## T1 — the measurement defect and the corrected baseline

### The defect

`measure()` and `measureSpecies()` built each species' distinct-fight signature from
`result.finalHp[side === 0 ? homeSide.name : awaySide.name]`. `finalHp` is keyed by
`fighterKey = side.id ?? side.name` (`clock/types.ts:36-41`, `report.ts:38-46`), and
`speciesSide()` sets `id: species.id`, so the lookup was always `undefined`. Every signature
degenerated to `outcome|duration|undefined`, `distinct` counted only winner-and-duration pairs,
and `se = sqrt(0.25 / distinct)` was computed from that undercount.

Both call sites now read the key the resolver actually emits (`homeKey` / `awayKey`), and both
go through one exported helper:

```ts
export function fightSignature(key, outcome, ms, finalHp): string {
  if (finalHp === undefined) throw new Error(`no final HP for ${key}: the distinct count would go blind`)
  return `${outcome}|${ms}|${finalHp}`
}
```

The throw is deliberate: a missing key is now a loud failure instead of a silent undercount.
`measureSpecies()` also reported a games-based `se` (`sqrt(rate*(1-rate)/games)`), which is the
same trap the gate exists to avoid — it now returns `distinct` and uses the distinct rule.

### The corrected baseline is not the predicted one

The brief expected `distinct` 42-64, `se` 6.3-7.7%, and five failing rows. Measured, with the
keys fixed and no stat changes:

- `distinct` is **21-34** of 112 games, `se` **8.6-10.9%**, slack ±16.8-21.4 points.
- **Two** rows fail, not five.

The 42-64 figure was itself a projection, never a measurement. A separate audit of every
plausible signature variant (`.conductor/evidence/r3-probe.ts`, replayed over the full matrix)
found no variant that reproduces it: one side's HP gives 21-32 distinct, both sides' HP 25-46,
and a full event-stream signature ~92-110. Only the `(winner, duration, own final HP)` signature
the resolver's own key implies lands where the gate now measures. The five-row prediction
depended on the same wrong `distinct`: with slack ±16.8-21.4 instead of ±12-15, cindermoor
(|17.9| ≤ 19.6), voltfox (|17.9| ≤ 19.6) and shalemole (|16.1| ≤ 20.0) pass on their own
intervals. That is the honest baseline, and it is why only two rows were tuned.

### Corrected baseline (no stat moves, keys fixed)

| species | games | distinct | wins | rate | se | slack | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fire_drake | 112 | 29 | 66 | 58.9% | 9.3% | 18.2 | ok |
| plant_ox | 112 | 26 | 64 | 57.1% | 9.8% | 19.2 | ok |
| water_axolotl | 112 | 26 | 56 | 50.0% | 9.8% | 19.2 | ok |
| electric_hound | 112 | 32 | 54 | 48.2% | 8.8% | 17.3 | ok |
| fernstag | 112 | 26 | 68 | 60.7% | 9.8% | 19.2 | ok |
| wind_falcon | 112 | 26 | 48 | 42.9% | 9.8% | 19.2 | ok |
| reefclaw | 112 | 29 | 80 | 71.4% | 9.3% | 18.2 | **FAIL** |
| earth_tortoise | 112 | 30 | 30 | 26.8% | 9.1% | 17.9 | **FAIL** |
| cindermoor | 112 | 25 | 76 | 67.9% | 10.0% | 19.6 | ok |
| voltfox | 112 | 25 | 36 | 32.1% | 10.0% | 19.6 | ok |
| galeheron | 112 | 28 | 44 | 39.3% | 9.4% | 18.5 | ok |
| shalemole | 112 | 23 | 38 | 33.9% | 10.4% | 20.4 | ok |
| embercub | 112 | 24 | 48 | 42.9% | 10.2% | 20.0 | ok |
| mossboar | 112 | 21 | 72 | 64.3% | 10.9% | 21.4 | ok |
| mistkit | 112 | 26 | 60 | 53.6% | 9.8% | 19.2 | ok |

## T2 — the two failing rows, tuned with whole-band stat shifts

Rule applied to every move: one species, one stat, floor and ceiling moved together so the roll
width is unchanged; accepted only when the row moves by more than its own standard error.
`measureSpecies(id)` scored each candidate, then a full `bun run balance` re-checked every
pacing target before the move was kept. No bounds floor was pushed across 10.

### Accepted

| species | stat | before | after | row before | row after | shift | row se | pacing after |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reefclaw | atk | 10-13 | 8-11 | 71.4% | 55.4% | −16.0 | 9.3-10.2% | all targets ok |
| earth_tortoise | atk | 10-14 | 13-17 | 26.8% | 35.7% | +8.9 | 8.6% | cap 31.0%, median 31.60 s, decisive 90.2%, damage 49/49, bosses 10-16/30 |
| voltfox | atk | 7-10 | 8-11 | 33.9% | 51.8% | +17.9 | 9.1% | cap 30.5%, median 31.04 s, decisive 89.5% |
| shalemole | atk | 7-10 | 8-11 | 33.9% | 57.1% | +23.2 | 10.2% | cap 30.5%, median 31.04 s, decisive 89.5% |

`earth_tortoise` is the marginal one: +8.9 against a 8.6% standard error clears one error by
3% of a point. Its alternative atk `[14,18]` measured 50.0% (+23.2) but was rejected — it would
put a slow tank's attack ceiling at 18, above every starter's and above cindermoor's 16, which
is an identity break for no gate benefit.

`voltfox` and `shalemole` were moved while the printed 45-55% design band was still the
objective; that band stopped gating in the same rework (see the gate table below). Both moves
are kept, and this is stated rather than implied: each was measured, each cleared its own
standard error, each moved its row toward 50%, and neither is load-bearing for the gate. A
reviewer can revert either without changing a single gate verdict.

### Rejected (measured, not accepted)

| species | candidate | row | why rejected |
| --- | --- | --- | --- |
| reefclaw | atk 9-12 | 64.3% (−7.1) | shift under one standard error |
| reefclaw | hp 150-179 | 71.4% | no effect |
| reefclaw | hp 144-173 | 64.3% | no gate benefit |
| reefclaw | def 7-11 | 64.3% | no gate benefit |
| reefclaw | spd 3-6 | 62.5% | speed is last preference; no gate benefit |
| reefclaw | def 6-10 | 44.6% (−26.8) | breaks the axolotl pin (reefclaw def ceiling must exceed 11) |
| earth_tortoise | atk 11-15 | 26.8% | no effect |
| earth_tortoise | atk 12-16 | 33.9% (+7.1) | shift under one standard error |
| earth_tortoise | atk 13-16 | 33.9% | no gate benefit over 13-17 |
| earth_tortoise | atk 14-18 | 50.0% (+23.2) | identity break (see above) |
| earth_tortoise | def 10-13 | 26.8% | no effect |
| earth_tortoise | hp 170-216 | 26.8% | no effect |
| earth_tortoise | spd 4-6 | 37.5% | breaks the "tortoise is slower than every other species" pin |
| cindermoor | atk 8-14 / 8-15 | 67.9% | same midpoint, no effect |
| cindermoor | atk 8-13 | 69.6% | wrong direction |
| cindermoor | atk 7-12 | 60.7% (−7.1) | shift under one standard error |
| cindermoor | hp 146-176 / 146-181 | 67.9% | no effect |
| cindermoor | def 8-11 / 8-13 | 67.9% | no effect |
| cindermoor | def 7-10 | 58.9% (−8.9) | shift under one standard error (9.4) |
| cindermoor | spd 5-7 | 69.6% | wrong direction |
| voltfox | atk 9-12 | 57.1% | overshoots past the row's target for no gain |
| voltfox | hp 141-171 | 37.5% | under one standard error |
| shalemole | hp 156-186 | 48.2% (+14.3) | accepted on merit, then replaced by the atk move, which shifted the row further (57.1 vs 48.2, both within 10 points of 50) |
| shalemole | hp 161-191 | 55.4% | no gain over the atk move |
| shalemole | def 11-14 | 57.1% | no gain over the atk move |

Cindermoor is the honest frontier note: it passes the gate at 67.9% on a 19.6-point slack, and
**no** whole-band stat move shifts it by one standard error in the useful direction. Its high
win rate is kit shape (a rush fire kit into the sampled field), not a stat line the tuning
budget can reach. Reported, not forced.

## Gate rows (observed vs bound)

| target | observed | bound | verdict |
| --- | --- | --- | --- |
| species (15 rows) | 35.7%-67.9%, 21-34 distinct | \|rate−50%\| ≤ slack (16.8-21.4) | all ok |
| capShare | 29.8% (250/840) | ≤ 33.3% | ok |
| decisiveShare | 92.4% (776/840; 590 ko + 186 cap wins) | ≥ 66.7% | ok |
| **capWinQuality** (new) | **74.4% (186/250)** | **≥ 66.7%** | ok |
| medianDuration | 30.58 s | 25.00-40.00 s | ok |
| durationP05 | 14.60 s (min 6.68 s diagnostic) | ≥ 8.00 s | ok |
| durationMax | 40.00 s | ≤ 40.00 s | ok |
| damageBand | 49/49 | 4-12% of the 189 pool | ok |
| boss rows (6) | 10-16 of 30 | 0 < wins < 30 | ok |

`capWinQuality` exists because `decisiveShare` cannot fail on cap-win quality: knockouts alone
are 590/840 (70.2%) of the matrix, already past the 66.7% bound, so every near-tie cap win could
be non-decisive and the ratio would still pass. Its test builds exactly that sample — 100 cap
wins, every margin one basis point under the floor — and asserts `decisiveShare` passes while
`capWinQuality` fails, then pins 67/33 passing and 66/34 failing.

## Re-pins and new tests

- `balance-report.test.ts` — `DESIGN_BAND_MISSES` re-pinned to the shipped 12 ids in roster
  order (fire_drake, plant_ox, water_axolotl, electric_hound, fernstag, wind_falcon, reefclaw,
  earth_tortoise, cindermoor, shalemole, embercub, mossboar; inside the band: voltfox,
  galeheron, mistkit).
- `balance-report.test.ts` — new T1 test: two fights with the same winner and duration but
  different final HP are two distinct fights; a missing final HP throws `/go blind/`;
  `earth_tortoise` distinct pinned at 34 and `reefclaw` at 24 from the matrix, with
  `measureSpecies(id)` agreeing.
- `balance-report.test.ts` — new T3 test for `capWinQuality` (near-ties, 67/33, 66/34).
- `moves-band.test.ts` — new T4 test: for all six elements the `accuracy === 80` branch and the
  `power === 12 && accuracy === 100` branch have equal expected damage, pinned as
  15 × 80 = 12 × 100 = 1200.
- `module-size.test.ts` — two new tests: `scripts/` is walked and held to a stated 64 KB
  ceiling (the four tools enumerated), and no `src/` module may import `scripts/`. This is the
  NFR-3 answer for `scripts/battle-balance-report.ts`: the guard was extended rather than the
  script exempted, because a report script is a linear procedure by design and 12 KB is the
  wrong ceiling for it — but leaving it entirely unmeasured is what let a 1,400-line gate hide.
- `species.test.ts` untouched and green (87 pass): every relational and identity pin survives
  the four stat moves.

## Record corrections landed in code

- `moves.ts` header rewritten to the shipped ladder: basic 9, kit 10/12/14/16/17/19, branches
  15/80% and 12/100%, base hits 4.76-10.05%, ascending order basic < light < chip < mid < mid2 <
  bolt < heavy, millisecond `COOLDOWN_MS` tiers instead of action-counted cooldowns. The R1/R2
  history line states that R2 compressed the ladder to move a metric retired in the same phase,
  and that the compression was kept.
- `continuous/roll.ts` spread note: the finisher is 19 now, so a heavy rolls 18-19, not 21-22.
- `CAP_MARGIN_FLOOR_BP` rationale: measured per side's own pool (bounds 130-209 HP, typical pools
  145-186), so one basic hit is 4.9-6.2% of a typical pool rather than 4.76% of the 189 line;
  five points is a scale, not a guarantee — a single final exchange can cross it; knockouts
  alone are 70.0%, which is why cap-win quality gates separately.

## Not landed — blocked on file permissions

`conductor/product.md`, `conductor/tracks/20261109-battle-balance/spec.md` and
`conductor/learnings.md` are outside this agent's write permissions (both edits were rejected
with `Permission denied: edit`). The corrections are specified in the phase brief and listed in
the report's `blockers` for the primary to apply.

## Verification

| command | exit |
| --- | --- |
| `bun run verify` | 0 — type check clean (5 packages), 3,975 pass / 1 skip / 0 fail across 367 files, `biome check` clean (913 files), determinism gate OK (45 regenerations byte-identical) |
| `bun run build` | 0 — 410 modules, 358 ms, chunk-size warning only |
| `bun run balance` | 0 — every target `ok`, 840 matrix fights |
| `bun run telemetry` | 0 — cap share 7/14 (50.0%), exactly at its bound; all 13 targets ok |

Report replay is byte-identical (existing test). Integers only, no clock reads, no RNG change.
`FIGHT_CAP_MS`, the chart, the 4-12% band, damage ratios, `DECISION_MS`, training caps, doctrine
definitions, turn budgets, `MISS_SCALE` and `DISTINCT_FLOOR` are untouched.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 3,975 pass, 1 skip, 0 fail across 367 files |
| `bun run build` | 0 | client bundle clean |
| `bun run balance` | 0 | every row ok - cap 29.8%, decisive 92.4%, cap-win quality 74.4%, median 30.58 s, p05 14.60 s, damage 49/49 |
| `bun run telemetry` | 0 | 13/13 bounds (cap share 7/14 = 50.0%, exactly at its bound) |

Checkpoint: `326d3fcc` plus the primary's doc corrections (product bullet, two spec paragraphs,
learnings 16 and 19).

### The blocking finding was real, and the predicted fix was wrong twice

Round 3 blocked because `measure()` read `result.finalHp[side.name]` while the map is keyed by
`fighterKey = id ?? name`, so the HP component was always `undefined` and `distinct` counted
`(winner, duration)` pairs only. The review predicted 42-64 distinct, `se` 6.3-7.7% and five
failing rows. Measured after the fix: **21-34 distinct, `se` 8.6-10.9%, two failing rows**
(reefclaw 71.4%, earth_tortoise 26.8%). A signature audit (own HP, both HP, event stream)
reproduced no variant near 42-64, so the five-row prediction was itself an unmeasured
projection. Two wrong numbers in a row is the reason the fix shipped with a test that a pair of
fights sharing winner and duration but differing in final HP counts as two, rather than with a
tuned constant.

### Tuning, and what was refused

Four whole-band stat moves were accepted, each shifting its row by more than its own standard
error and each followed by a full pacing re-check: reefclaw atk 10-13 -> 8-11 (71.4 -> 55.4),
earth_tortoise atk 10-14 -> 13-17 (26.8 -> 35.7, +8.9 against `se` 8.6 - the marginal one, and
`atk 14-18` measured 50.0 but was rejected as an identity break), voltfox atk 7-10 -> 8-11
(33.9 -> 51.8), shalemole atk 7-10 -> 8-11 (33.9 -> 57.1). Cindermoor (67.9%) is reported as a
frontier: it passes on its own 19.6-point interval and no whole-band move shifts it by one
standard error, so it was not forced. No bounds floor was pushed across 10.

### New gate row

`decisiveShare` could not fail on cap-win quality - knockouts alone are 70.2%, above its 66.7%
bound - so `capWinQuality` (186/250 = 74.4% of cap wins clearing the margin floor) is gated
separately, with a test where every cap win is a near tie: `decisiveShare` passes and
`capWinQuality` fails. The 500 bp rationale now states the truth - it is measured against each
side's own pool (bounds 130-209, typical 145-186, so one basic hit is 4.9-6.2%), which means a
single final exchange can cross it, and 92.4% means "not a near-tie", not "survives another hit".

### NFR-3 answered by extending the guard

`module-size.test.ts` walked `packages/sim/src` only, so the 1,389-line report script escaped it.
The guard now walks `scripts/` under a stated 64 KB ceiling and forbids `src/` importing it -
extended rather than exempted.

### Still not claimed

The roster is not balanced: three of fifteen rows are inside the printed 45-55% design band and
twelve outside it, on intervals 17-21 points wide because 112 games are 21-34 distinct fights.
That is stated in the spec, the product doc and learnings 16/19, and the next balance track's
first job is variance, not the band. Kite still loses all six sampled fights at 24 paid dodges
per fight - an owner decision, not a tuning number.
