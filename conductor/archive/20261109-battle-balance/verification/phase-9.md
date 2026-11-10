# Phase 9 — Roster Re-tune

- **Track:** `20261109-battle-balance`
- **Phase:** 9 (Roster Re-tune)
- **Date:** 2026-11-09
- **Branch:** `feat/20261109-battle-balance`
- **Base commit:** `34178e0c`
- **Code commit:** `b2af04e5`
- **Result:** **not met.** The tier-order fix (P9.T1.2) is done and proved. The
  roster band (P9.T1.1 / FR-5) is **not** met: 5 of 15 species sit inside
  45–55% before this phase and 5 of 15 after it. `bun run balance` still exits 1
  on ten species rows. Every other gate — pacing, cap share, knockout share,
  duration band, damage band, bosses — passes. The reason FR-5 cannot be met
  from the levers this phase is allowed to touch is measured and set out below.

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | **0** | typecheck clean (voxel 160, sim 233, server 44, client 511 files); 3949 pass, 1 skip, 0 fail, 455,137 `expect()` calls, 3950 tests / 366 files, 40.79 s; biome 911 files clean; determinism gate OK (46 species meshes + 5 props byte-identical) |
| `bun run build` | **0** | vite 409 modules, 299 ms; only the chunk-size warning |
| `bun run telemetry` | **0** | 13/13 bounds `ok`; cap 5/14 (35.7%) |
| `bun run balance` | **1** | 10 species targets `FAIL`; capShare, durationBand, durationMin, durationMax, damageBand and all six boss targets `ok` |

## What was actually changed

Two edits, both minimal, both measured.

| File | Change | Mechanism |
| --- | --- | --- |
| `packages/sim/src/battle/moves.ts` | tier-2 mid power `18 → 19` on all six element ladders (cinder_shot, spore_burst, foam_volley, arc_shot, clay_burst, gale_cutter) | P9.T1.2 tier order. The mid row earned `19 × 0.85 × 1000 / 2000 = 8.075` expected power/s against the light row's `12 × 1.00 × 1000 / 1500 = 8.00`, so the mid tier no longer sits *below* the light it displaces. 19 is the smallest integer that clears 8.00; anything lower leaves the ladder inverted and anything higher costs band headroom. Base hit `19/189 = 10.05%`, still inside 4–12%. |

Everything else in the phase-9 search was **rejected and reverted**; the
reasons are in the finding below. `species/`, `bosses.ts` and `frames.ts` are
untouched (`git diff --stat` on this phase lists only `moves.ts` and the
co-located re-pins).

## The finding: FR-5 cannot be met from stat bounds

### The measurement is narrower than its own noise

56 games per species is not 56 independent fights. The continuous engine is
seed-free — the seed only breaks a tie in a capped fight — so of the 210 ordered
pairings only **8 change outcome across four seeds** (measured directly). The
matrix's 56 games are 28 distinct fights counted twice, and every observed
numerator is even (10, 14, 16, 20, 28, 30, 32, 44, 46, 52 of 56).

At the effective sample size of 28, the binomial standard error at a true 50% is
`0.5/√28 = 9.4` percentage points. The 45–55% band is ±5 points, i.e. **0.53
standard errors**. A species that is genuinely 50% lands outside the band about
**60% of the time** by chance alone. The brief warned it would be about a third;
with the duplicated sample it is worse.

Classifying the ten failing rows against that error bar:

| Row | Rate | Z vs 50% | Verdict |
| --- | --- | --- | --- |
| voltfox | 92.9% (52/56) | +4.5σ | genuinely out |
| shalemole | 85.7% (48/56) | +3.8σ | genuinely out |
| galeheron | 82.1% (46/56) | +3.4σ | genuinely out |
| electric_hound | 17.9% (10/56) | −3.4σ | genuinely out |
| mistkit | 17.9% (10/56) | −3.4σ | genuinely out |
| wind_falcon | 25.0% (14/56) | −2.6σ | genuinely out |
| plant_ox | 28.6% (16/56) | −2.3σ | genuinely out |
| fire_drake | 35.7% (20/56) | −1.5σ | genuinely out, but nearest the bar |
| reefclaw | 57.1% (32/56) | +0.75σ | **noise — not tuned** |
| cindermoor | 57.1% (32/56) | +0.75σ | **noise — not tuned** |

`water_axolotl` (46.4%), `embercub` (53.6%) and the three rows on exactly 50.0%
are also inside one standard error and were not touched. So eight rows are
genuinely out of band and two of the ten failures are measurement noise. I did
not tune either noise row.

### The spread is not in the stat lines — it is in the kits

The report clamps one reference line (`189/10/10/10`) into each species' roll
bounds, so a species whose bounds contain the reference fields the reference.
Six species field **exactly** `189/10/10/10`:

| Species | Fielded line | Rate |
| --- | --- | --- |
| galeheron | 189/10/10/10 | 82.1% |
| embercub | 189/10/10/10 | 53.6% |
| water_axolotl | 189/10/10/10 | 46.4% |
| fire_drake | 189/10/10/10 | 35.7% |
| mistkit | 189/10/10/10 | 17.9% |

**An identical stat line spans 64 percentage points.** Two more species share
`189/10/11/9` and land 35 points apart (`mossboar` 50.0%, `shalemole` 85.7%).

A stat-bound change therefore cannot equalise the roster: to close a 64-point
spread on one line you must give the five species five *different* lines, which
is not "tune the stat line", it is compensation. What actually separates them is
kit shape — how many cooldown-1 rows a kit's first four moves field, and what
they cost. Three cheap rows ≈ 78–93%; the cheap tail ≈ 18–57%. Kit composition
is out of this phase's scope.

### The levers were measured anyway, and they do not reach

One stat ±1…±4 at a time, 56-game units, measured against the unchanged field:

| Species | Needed | Best single-stat move available | Reaches band? |
| --- | --- | --- | --- |
| voltfox 92.9 | −38 pts | atk −4 → 42.9% | **no** — and atk −4 means a ceiling of 8 against an authored floor of 9, not expressible as a legal range |
| shalemole 85.7 | −31 pts | atk −4 → 35.7% | overshoots to the other side; −3 → 50.0% works but is a 3-point attack ceiling cut chosen for its sample value |
| galeheron 82.1 | −27 pts | atk −4 → 32.1%, def −4 → 39.3% | no monotone 1–2 point move lands in band |
| electric_hound 17.9 | +27 pts | def +4 → 46.4% | only at a 4-point defence ceiling raise (`[5,8] → [5,12]`) |
| mistkit 17.9 | +27 pts | def +4 → 46.4% | only at a 4-point defence ceiling raise (`[8,11] → [8,15]`) |
| wind_falcon 25.0 | +20 pts | def +4 → 60.7% | overshoots; +3 → 53.6% works, but see below |
| plant_ox 28.6 | +16 pts | atk +4 → 57.1% | overshoots; +3 → 57.1% |
| fire_drake 35.7 | +9 pts | atk +4 → 50.0% | 4-point attack ceiling raise |

Every in-band landing point is a 3–4 point bounds shift selected because it
produced the number. That is precisely the overfitting the brief warned about,
and it is not a mechanism.

One candidate *was* mechanism-defensible and was tried and rejected: raising
`wind_falcon`'s defence ceiling `7 → 9` (the falcon is the frailest record in
the game and was dying in 14 of 56). It moved the row 25.0% → 39.3% — still out
of band — and it broke `species.test.ts`'s authored invariant that the falcon
must be strictly frailer than every other species (the next-lowest ceiling is 8).
Falcon identity won; the edit was reverted.

Two unconstrained coordinate-descent searches were also run and discarded: they
reach 13–14 of 15 in band in 186–475 s, but only by identity-destroying extremes
(falcon `spd` 20, shalemole `atk` 6, embercub `spd` 6, reefclaw `spd` 5,
tortoise `hp` 219). A tuning pass that reaches 14/15 by making the falcon the
fastest thing in the game is fitting 28 deterministic fights, not balancing a
roster.

A pacing-first asymmetric-cost search landed 13/15 in band at a legal-looking
set — but at `durationMin` 7.74 s, below the 8 s floor. The brief's point 2 is
exactly this: fifteen stat lines moving is how a stalemate (or a blowout) comes
back, and that set traded one gate for another.

## Species table — before and after

| Species | Element | Fielded line | Phase 8 | Phase 9 | Δ | Mechanism of the change |
| --- | --- | --- | --- | --- | --- | --- |
| fire_drake | fire | 189/10/10/10 | 35.7% | 35.7% | 0 | — |
| plant_ox | plant | 189/10/10/8 | 28.6% | 28.6% | 0 | — |
| water_axolotl | water | 189/10/10/10 | 53.6% | 46.4% | −7.2 | tier-2 mid power 18 → 19 changed the whole matrix; it lost the marginal fights |
| electric_hound | electric | 176/10/8/12 | 17.9% | 17.9% | 0 | — |
| fernstag | plant | 176/10/10/10 | 50.0% | 50.0% | 0 | — |
| wind_falcon | wind | 143/10/7/17 | 25.0% | 25.0% | 0 | defence-ceiling candidate tried, broke the frailest-record invariant, reverted |
| reefclaw | water | 189/10/12/7 | 57.1% | 57.1% | 0 | noise row (±0.75σ), deliberately not tuned |
| earth_tortoise | earth | 221/10/15/4 | 50.0% | 50.0% | 0 | — |
| cindermoor | fire | 189/11/10/8 | 57.1% | 57.1% | 0 | noise row (±0.75σ), deliberately not tuned |
| voltfox | electric | 185/10/10/11 | 92.9% | 92.9% | 0 | no legal single-stat move reaches band |
| galeheron | wind | 189/10/10/10 | 82.1% | 82.1% | 0 | shares its stat line with a 17.9% species; kit-driven |
| shalemole | earth | 189/10/11/9 | 78.6% | 85.7% | **+7.1** | tier-2 mid power 18 → 19; the same line as mossboar (50.0%), so the rise is kit + cascade, not stats |
| embercub | fire | 189/10/10/10 | 53.6% | 53.6% | 0 | — |
| mossboar | plant | 189/10/11/9 | 50.0% | 50.0% | 0 | — |
| mistkit | water | 189/10/10/10 | 17.9% | 17.9% | 0 | no legal single-stat move reaches band |

In band before: 5 (axolotl, fernstag, tortoise, embercub, mossboar).
In band after: 5 (same set). Worst row `electric_hound` / `mistkit` 17.9%,
best `voltfox` 92.9%.

## Tier order (P9.T1.2) — done and proved

Expected power/s on the damage clock = `power × accuracy/100 × 1000 / max(cooldown, swing)`:

| Tier | Row (fire) | Power | Accuracy | Cooldown | Swing | Expected power/s |
| --- | --- | --- | --- | --- | --- | --- |
| 0 basic | Strike | 10 | 100 | 0 | 606 + 160 + 120 | 16.50 |
| 1 light | spark | 12 | 100 | 1500 | 1106 | 8.00 |
| 2 mid | cinder_shot | **19** | 85 | 2000 | 1738 | **8.075** |
| 3 chip | flare_dart | 14 | 95 | 1500 | 1106 | 8.87 |
| 4 heavy-ish | blaze_bolt | 20 | 75 | 2000 | 1952 | 7.50 |
| 5 heavy | pyre_lance | 22 | 100 | 2600 | 2690 | 8.18 |

The mid tier now clears the light (`8.075 > 8.00`), which was the P9.T1.2 defect
(`7.65 < 8.00` at power 18). `moves-band.test.ts` proves the ordering that is
claimed — `basic < light < mid < heavy` on base damage, plus the heavy out-earns
its light on the damage clock in all six elements. The tier-4 row still measures
below the light (7.50 vs 8.00); it is a 75%-accuracy row whose value is its
poise and its reach, and re-pricing it is a band decision this phase did not
take. Recorded, not hidden.

Base-hit band is untouched: all 49 rows inside 4–12% of the 189 pool
(basic 5.29%, ladder 6.35–11.64%, mid now 10.05%). Rear counter still 1.875×,
heaviest 22 → 82/189 = 43.4% of the pool, unchanged from Phase 8.

## Pacing gate — Phase 8 survived

| Metric | Bound | Phase 8 | Phase 9 | |
| --- | --- | --- | --- | --- |
| cap share | ≤ 33.3% | 31.4% (132/420) | **31.4% (132/420)** | ok |
| knockout share | ≥ 66.7% | 68.6% (288/420) | **68.6% (288/420)** | ok |
| median duration | < 40 s and in 25–40 s | 28.86 s | **27.48 s** | ok |
| duration min | ≥ 8 s | 9.30 s | **9.30 s** | ok |
| duration max | ≤ 40 s | 40.00 s | **40.00 s** | ok |
| 25–40 s band | ≥ 50% | 63.8% | **58.1% (244/420)** | ok |
| damage band | 49/49 in 4–12% | 49/49 | **49/49** | ok |
| telemetry bounds | 13/13 | 13/13 | **13/13** | ok |
| telemetry cap | ≤ 50% | 42.9% (6/14) | **35.7% (5/14)** | ok |

Median is strictly below `FIGHT_CAP_MS` (27.48 s vs 40 s), so the cap is not the
mechanism. Telemetry aggregates: engagement 374 / 1115 / 3984 mm; exchange
0.30/s home, 0.25/s away (0.55 combined); idle 25.8%; contact 7.3%; retreats
6468 / 6023; positions 92 / 146 cells; duration 15.28–40.00 s.

Two telemetry rows improved relative to Phase 8 (`voltfox` 38.86 s → 36.72 s,
`shalemole` 40.00 s time → 37.30 s knockout) because the mid row hits harder.

## Boss table (P9.T3.1)

Bosses stay outside the 45–55% band; each must be beatable at its stage and not
trivial. Measured 6 bosses × 15 species × 2 seeds = 30 fights each, player
perspective, standard press doctrine at the reference line.

| Boss | Species | Intended stage | Answer | Fights | Player won | Rate |
| --- | --- | --- | --- | --- | --- | --- |
| Koda | fire_drake | bronze promotion | bring water/earth; out-trade the rush | 30 | 10 | 33.3% |
| Hesse | plant_ox | silver checkpoint | bring fire; the wall is slow, punish the recovery | 30 | 6 | 20.0% |
| Marlow | water_axolotl | silver apex | bring plant; its kit is slow and long-ranged | 30 | 18 | 60.0% |
| Delmar | water_axolotl | silver promotion | bring plant; short kit, low reach | 30 | 6 | 20.0% |
| Fenn | fire_drake | gold checkpoint | bring water; heavy finisher, punish the cooldown | 30 | 17 | 56.7% |
| Thessa | plant_ox | gold apex | bring fire; highest HP, lowest tempo | 30 | 14 | 46.7% |

Every boss is inside `0 < player wins < fights`: none is a wall, none falls to
an unprepared player at the reference line. All six `boss:*` targets print `ok`.

## Re-pinned rows

Every row below moved because `MoveDef.power` feeds `strikeDamage`, which the
frozen legacy clock reads (FR-10). None is a relaxed bound.

| File | Row | Old → new | Why |
| --- | --- | --- | --- |
| `battle/moves.test.ts` | tier table row 2 | `18/85/2` → `19/85/2` | P9.T1.2 |
| `battle/moves.test.ts` | original-row pins cinder_shot, spore_burst, foam_volley | `[18,85,2]` → `[19,85,2]` | P9.T1.2 |
| `battle/moves.test.ts` | electric / earth / wind TIERS arc_shot, clay_burst, gale_cutter | `[18,85,2]` → `[19,85,2]` | P9.T1.2 |
| `battle/clock.contract.test.ts` | 18 of 27 digests (every `kit3` and `kit4` case) | recaptured; `kit2` unchanged | FR-10 legacy drift; kit2 does not field a tier-2 row |
| `battle/clock.contract.test.ts` | `GOLDEN` header note | added the Phase 9 / FR-10 sentence | provenance |
| `battle/continuous/balance-report.test.ts` | `KNOWN_MISSES` shalemole | `78.6% (44/56)` → `85.7% (48/56)` | observed value updated; the bound is untouched |
| `species-electric.balance.test.ts` | "every cap cell sits inside the existing roster's envelope" | `test.failing` → `test` | **un-marked deliberately**: the marker's assertion now holds |

`clock.contract` digests that changed: fire mirror kit3/kit4, plant mirror
kit3/kit4, water mirror kit3/kit4, fire>plant kit3/kit4, plant>fire kit3/kit4,
fire>water kit3/kit4, water>fire kit3/kit4, plant>water kit3/kit4, water>plant
kit3/kit4. All nine `kit2` digests are byte-identical, which is the check that
the drift is the tier-2 row and nothing else.

No cup golden, bracket fixture, ghost test or client golden moved.

## `test.failing` marker state

| Marker | State |
| --- | --- |
| `species-electric` "every cap cell sits inside the existing roster's envelope" | **un-marked** (now passes) |
| all other roster markers (bosses ×3, branch-balance, form.balance ×4, species-electric ×3, species-balance ×2, species-discovery, species-roster ×5, tactics balanced×mirrors, chart.balance, pacing) | still marked — none started passing |

## AC map

| AC | Test / command | Result |
| --- | --- | --- |
| AC-5 every species 45–55% | `balance-report.test.ts` species targets; `bun run balance` | **not met** — 10 rows `FAIL`, 8 genuinely out, 2 noise |
| AC-4 cap ≤ 1/3, majority 25–40 s | `bun run balance` capShare / durationBand; `pacing.test.ts`; `telemetry.test.ts` | met — 31.4%, 58.1%, 13/13 telemetry bounds |
| AC-6 bosses documented and beatable | `bun run balance` `boss:*` targets | met — all six `ok` |
| FR-5 (species spread) | see finding above | **not met** |
| FR-4 (pacing) | telemetry + balance gates | met |
| FR-6 (bosses) | boss table | met |
| P9.T1.2 (tier order) | `moves-band.test.ts` ordering + heavy-DPS tests | met |

## Deviations

| File | Reason |
| --- | --- |
| `packages/sim/src/battle/clock.contract.test.ts` | 18 legacy digests re-pinned under FR-10; the phase brief authorises outcome re-pins |
| `packages/sim/src/species-electric.balance.test.ts` | un-marked a `test.failing` whose assertion now holds, as the brief directs |
| `packages/sim/src/battle/continuous/balance-report.test.ts` | `KNOWN_MISSES` shalemole value updated; no species added, no bound widened |

No change to the type chart, damage ratios, the 4–12% band, recovery, cooldowns,
stamina, the controller, doctrine definitions, `DECISION_MS`, `FIGHT_CAP_MS`, or
the training caps.

## Notes for the next phase

1. **The roster band needs a kit-shape pass, not a stat pass.** Five species
   fielding `189/10/10/10` span 17.9%–82.1%. Until the number of cheap rows in
   the first four kit slots is levelled, no legal stat line brings FR-5 home.
   The concrete lever is which four moves a kit leads with, and the cooldown tier
   of each — both outside this phase's touch list.
2. **The sample cannot resolve a 5-point band.** 28 independent fights per
   species gives ±9.4 pp at one standard error. Either the band widens, or the
   sample needs ~380 independent fights per species to hold ±5 pp at one sigma,
   or the gate should be a *significance* test rather than a point band. This is
   the single most important measurement finding of the phase: as built, a
   perfectly balanced roster would fail the gate about 60% of the time.
3. **The mid-tier fix cost shalemole 7 points** (78.6 → 85.7) because the tier-2
   row is in its first four. That is a cascade, not a regression in the roster —
   the ordering requirement and the band requirement pull against each other on
   any kit that leads with a tier-2 row.
4. The tier-4 row (blaze_bolt and its peers, 75% accuracy) still measures below
   the light on the damage clock (7.50 vs 8.00). Recorded as a finding; its value
   is poise and reach, and re-pricing it is a band decision.
5. The trace header still prints the cosmetic literal "hp 90" while the pool is
   189 — a Phase 5 leftover, deliberately untouched.
