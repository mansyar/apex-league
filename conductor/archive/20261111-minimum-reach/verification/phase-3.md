# Phase 3 verification — Widen the telemetry sample and re-derive its bounds

- Track: 20261111-minimum-reach — Minimum Reach
- Phase: 3 — Widen the telemetry sample and re-derive its bounds
- Date: 2026-11-12
- Branch: `feat/20261111-minimum-reach`
- Base: `8b414378`
- Head: `4aad7c0e` (code); this evidence is committed on top
- Result: **verified** — sample widened 14 → 42 fights, all 13 bounds re-derived
  and pinned, `bun run telemetry`, `bun run verify` and `bun run build` green.
  One pacing finding recorded for Phase 4: the fixture's cap share is 52.4% and
  the spec's one-in-two target is missed on it (the 840-fight balance matrix is
  still at 23.5%).

## What changed

| file | change |
| --- | --- |
| `packages/sim/scripts/battle-telemetry.ts` | sample 14 → 42 (14 pairings × 3 seeds); `pool()` extracted from `measure()`; a stability table prints every metric re-pooled at 14 / 30 / 42 fights; all 13 bound values and `why` strings re-derived from the 42-fight measurement; the approval for the widening exception recorded in the bound docs |
| `packages/sim/src/battle/continuous/telemetry.test.ts` | pins 42 fights, `cap.total === 42`, the re-derived 3/5 ceiling in exact integer form, the one-in-three debt (still missed), and a new table pinning all 13 bound values |

No simulation code changed. The harness is a consumer of `resolveContinuous`'s
stream; every movement below is a better estimate of today's behaviour, not a
regression. Proof the fights themselves are unchanged: row 1 of the old sample
and row 1 of the new sample are the same fight, byte for byte
(`fire_drake v earth_tortoise`, 40.00 s, 6-9 blows, gap 560/969/3984, 95-94
cells, 18.9% idle).

## Sample-size rationale

**42 fights = the same 14 pairings, three seeds each.**

- The 14-fight sample was a coin flip. Phase 2 measured it: 50 mm of dead zone
  moved `capShare` from 7/14 to 10/14, 150 mm to 9/14, 300 mm to 8/14 and 400 mm
  back to 10/14. A sweep tuned against that is tuning to noise.
- **Keeping the 14 pairings is what makes the before/after table meaningful.**
  The same families, drawn three times, differ only by seed; a composition
  change cannot masquerade as a measurement change.
- **Three draws per pairing average seed luck.** A single draw per pairing is
  the failure mode Phase 2 hit: the same pairing lands on a knockout or on the
  cap depending on the draw. `pacing.test.ts` already uses this exact shape for
  its own 42-fight sample, so the two samples now agree on what is played (they
  still build the walk independently; the telemetry docs no longer claim the
  script calls into that test).
- **42 is the smallest sample with a useful resolution.** The cap share moves in
  steps of 1/42 = 2.4 points, under the 2.5 points a 40-fight sample gives, and
  it is the smallest multiple of the 14-family walk.
- **Rejected: 45 fights (three roster walks).** It invents three new pairings
  (mistkit as home), gives each pairing only one draw, and measures 27/45 (60.0%)
  on a different composition, so its number cannot be compared with the shipped
  7/14. It also still rides the walk's three-species away orbit. 42 was chosen
  for the like-for-like comparison, not because it is the smaller number.

**Known limitations (pre-existing, unchanged by this phase).** The walk visits 14
of the 15 species as home — mistkit never appears — and the away side rides a
three-species orbit (`5i + 7` mod 15: `earth_tortoise`, `embercub`,
`water_axolotl`, plus one mirror hop to `electric_hound`). The harness also gives
every side the reference stat line, so it is a smoke fixture, not the balance
verdict; the 840-fight standard-doctrine matrix carries that verdict and covers
all 15 species.

**Cost.** `bun test packages/sim/src/battle/continuous/telemetry.test.ts
--timeout 120000` → 12 pass, 0 fail, **3.81 s** (the file measures the sample
twice: once memoised, once for the byte-for-byte replay test).

## Before / after, all 13 bounds

Before = the shipped 14-fight sample, measured on the phase base tree before any
edit. After = the 42-fight sample. "Kept" means the value still holds with
headroom and was not tightened, per the phase rule.

| metric | kind | old bound | new bound | measured @14 | measured @42 | headroom | why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| engagementMin | max | 900 | 900 (kept) | 380 mm | 380 mm | 520 mm (2.4×) | the fighters must close to strike range |
| engagementMedian | max | 1500 | 1500 (kept) | 1076 mm | 1085 mm | 415 mm (1.4×) | the fight must be fought at fighting range, not at opposite ends |
| engagementMax | max | 4500 | 4500 (kept) | 3992 mm | 3992 mm | 508 mm (1.1×) | the max is the opening stance; the bound only catches gross disengagement |
| exchangeHome | max | 2.5 | 2.5 (kept) | 0.32/s | 0.31/s | 2.19/s (8.1×) | attack rate is a ceiling, not a floor |
| exchangeAway | max | 2.5 | 2.5 (kept) | 0.27/s | 0.27/s | 2.23/s (9.3×) | same, away side |
| idleShare | max | 0.5 | 0.5 (kept) | 25.9% | 26.1% | 23.9 points (1.9×) | at least half the fight has an attack running somewhere |
| distinctPositions | min | 20 | 20 (kept) | 94 cells | 65 cells | 45 cells (3.3×) | every side visits many positions, not two poses; the fastest fight is 18.44 s, so it has less time to walk |
| contactShare | max | 0.7 | 0.7 (kept) | 8.5% | 7.3% | 62.7 points (9.6×) | the bodies must not spend most of the fight pressed together |
| retreatHome | min | 14 | **42** | 6846 orders | 20157 orders | 20115 orders (480×) | AC-3: at least one retreat order per fight. The bound is an absolute count, so it must scale with the sample; 14 over 42 fights would mean a third of one order per fight |
| retreatAway | min | 14 | **42** | 6792 orders | 19826 orders | 19784 orders (472×) | same, away side (472 orders per fight measured) |
| capShare | max | 1/2 | **3/5** | 7/14 (50.0%) | 22/42 (52.4%) | 7.6 points = 3 fights (25/42) | AC-24's one-in-two target is missed on this fixture; the smoke ceiling is re-derived under the approved exception (see below) |
| durationMin | min | 8000 ms | 8000 ms (kept) | 26.76 s | 18.44 s | 10.44 s (2.3×) | AC-7: no fight may end before the tuned floor |
| durationMax | max | 40000 ms | 40000 ms (kept) | 40.00 s | 40.00 s | 0 by construction | AC-7: the cap stops the fight at 40.00 s, so the ceiling is exact |

Nine values were kept because they still hold with headroom. Nothing was
tightened because a measurement came in lower, and no floor was lowered.

### Why the retreat floors scale to 42

`retreatHome`/`retreatAway` are absolute order counts over the whole sample,
while `distinctPositions` is per fight. Leaving the floors at 14 would have
silently weakened them from "one order per fight" to "one order per three
fights". Scaling them to the sample keeps the intent (one per fight), the units
and the code path; a per-fight rate would have meant changing `observed()`,
`show()` and every consumer. Measured 479.93 / 472.05 orders per fight, so the
floor is 480× / 472× below the measurement — it still only catches a controller
that stops retreating.

### Why the cap-share ceiling moved, and why that is not a hidden regression

The shipped bound sat exactly on its own measurement (7/14 = 50.0% against
`≤ 1/2`), which is the stated reason for the one approved exception to the
no-widening rule (spec FR-7 / NFR-2, approved 2026-11-12, recorded in the
`BOUNDS` doc comment). The widened sample measures 22/42 = 52.4%, so the smoke
ceiling is 3/5 (25/42): three fights of headroom, on the 0.05 grid the phase
brief allows for a share.

- **+20% relative** to the old value — exactly at the "more than about 20%"
  threshold, so it is flagged in `notes` as a pacing finding rather than
  treated as routine.
- **Not a relaxation to hide a regression.** No simulation code changed, and the
  new sample opens with the old sample's first fight, byte for byte. The 840-fight
  balance matrix still reports 23.5% cap for this build; the balance verdict is
  unaffected.
- **Why 52.4% is the better estimate.** The cap outcome is set by which pairings
  are glacial, not by seed luck: 6 of the 14 families cap all three of their
  draws (`fire_drake`, `electric_hound` and `reefclaw` v `earth_tortoise`,
  `earth_tortoise` v `embercub`, `shalemole` v `water_axolotl`, `embercub` v
  `earth_tortoise`), five cap none, and only three are mixed (`fernstag` 1/3,
  `galeheron` 1/3, `mossboar` 2/3). The 14-fight draw happened to sample the low
  side of a near-deterministic composition.

## Per-metric spread (estimate stability)

Printed by `bun run telemetry`; each metric re-pooled as the sample grows. The
`n=14` column is a 14-fight prefix of the same fights — the size the harness
shipped before this phase, not the old sample itself (the old sample used one
seed per pairing, so only its first fight is shared).

```
estimate stability: each metric re-pooled at 14, 30, 42 fights (retreats per fight)
metric            n=14          n=30          n=42
engagementMin     439 mm        385 mm        380 mm
engagementMedian  1045 mm       1094 mm       1085 mm
engagementMax     3984 mm       3992 mm       3992 mm
exchangeHome      0.32/s        0.31/s        0.31/s
exchangeAway      0.27/s        0.27/s        0.27/s
idleShare         23.9%         25.4%         26.1%
distinctPositions 82 cells      65 cells      65 cells
contactShare      9.3%          8.2%          7.3%
retreatHome       495.14/fight  461.97/fight  479.93/fight
retreatAway       505.71/fight  459.07/fight  472.05/fight
capShare          50.0%         43.3%         52.4%
durationMin       29.38s        18.44s        18.44s
durationMax       40.00s        40.00s        40.00s
```

Reading it: every continuous metric settles by 30 fights — engagement, exchange
rate, idle and contact move by less than 2 points or 10 mm from 30 to 42. The
two that still move are the ones this phase exists to expose: `capShare`
(50.0 → 43.3 → 52.4, a 9-point swing across the growth path) and `durationMin`
(29.38 → 18.44 s, because the prefix's fastest fight was a 29 s knockout and the
full sample contains an 18.44 s one). Those two are the metrics Phase 4's sweep
must read at 42 fights, not at 14.

## Telemetry output summary

```
Battle telemetry — 42 seeded matchups through resolveContinuous (FR-14, AC-14)
engagement:  min 380 mm  median 1085 mm  max 3992 mm
exchange:    home 0.31/s  away 0.27/s  combined 0.57/s
idle:        26.1%
contact:     7.3%
retreats:    home 20157  away 19826
positions:   min 65 cells  median 167 cells
cap share:   22/42 (52.4%)
duration:    18.44s .. 40.00s

ok   engagementMin: observed 380 mm, bound <= 900 mm
ok   engagementMedian: observed 1085 mm, bound <= 1500 mm
ok   engagementMax: observed 3992 mm, bound <= 4500 mm
ok   exchangeHome: observed 0.31/s, bound <= 2.50/s
ok   exchangeAway: observed 0.27/s, bound <= 2.50/s
ok   idleShare: observed 26.1%, bound <= 50.0%
ok   distinctPositions: observed 65 cells, bound >= 20 cells
ok   contactShare: observed 7.3%, bound <= 70.0%
ok   retreatHome: observed 20157 orders, bound >= 42 orders
ok   retreatAway: observed 19826 orders, bound >= 42 orders
ok   capShare: observed 52.4%, bound <= 60.0%
ok   durationMin: observed 18.44s, bound >= 8.00s
ok   durationMax: observed 40.00s, bound <= 40.00s
```

Exit code 0. 13/13 bounds hold.

## Commands

| command | exit | result |
| --- | --- | --- |
| `bun run telemetry` | 0 | 42 fights, 13/13 bounds ok, cap 22/42 (52.4%) |
| `bun run verify` | 0 | 4129 pass, 1 skip, 0 fail — 4130 tests across 373 files, 123.10 s; biome checked 932 files, no fixes; voxel determinism gate ok (46 GLBs byte-identical) |
| `bun run build` | 0 | `@apex/client` vite 8.3.4, 417 modules transformed, built in 604 ms (existing chunk-size warning only) |
| `bun test packages/sim/src/battle/continuous/telemetry.test.ts --timeout 120000` | 0 | 12 pass, 0 fail, 745 expect() calls, 3.81 s (targeted check) |

## Acceptance criteria

| criterion | status | evidence |
| --- | --- | --- |
| FR-7 — sample widened and every bound re-derived with the approval recorded | met | 14 → 42 fights; the exception and its date are in the `BOUNDS` doc comment; table above |
| AC-10 — sample size, every re-derived bound and the before/after recorded with visible headroom | met | this file; `telemetry.test.ts` pins the size and all 13 values |
| AC-6 — `bun run telemetry` exits 0 on the widened sample printing every re-derived bound | met for the bounds; the dead-zone share metric is Phase 4's (not in this phase's contract) | output above |
| NFR-2 — no bound widened outside the FR-7 exception | met | only `capShare`'s ceiling moved; no floor lowered; 9 values kept |
| NFR-3 — suite inside the phase budget (≤ 150 s) | met | verify test leg 123.10 s |
| AC-24 — at most one fight in two decided at the cap | **missed on this fixture** (22/42 = 52.4%); the 840-fight matrix is at 23.5% | recorded as a pacing finding, not papered over; see `notes` |
| AC-7 duration band, AC-3 retreats | met | both bounds still hold with headroom |

## Deviations

None. Both edited files are inside the phase's `Touches`.

## Notes for the primary

1. **Pacing finding (flagged per the >20% rule):** `capShare` moved 1/2 → 3/5
   (+20% relative) because the same 14 families measure 52.4% at 42 fights. This
   fixture now misses AC-24's one-in-two target. Phase 4's dead zone adds misses,
   which lengthens fights and pushes cap share up — the balance pass must watch
   `capShare` at 42 fights (the ceiling is 3/5, not a target) alongside the
   840-fight matrix, which still reads 23.5%.
2. **Stale bound docs found and refreshed.** The old `why` strings recorded
   measurements that no longer matched the shipped 14-fight sample
   (engagementMedian 807 vs 1076 mm, idle 28.2% vs 25.9%, distinct 23 vs 94
   cells, contact 15.5% vs 8.5%, retreats 5003/5260 vs 6846/6792, fastest 8.78 s
   vs 26.76 s). No bound value moved because of that drift; the strings now carry
   the 42-fight measurements.
3. **Coverage limitation, unchanged:** the sample visits 14 of 15 species as
   home (mistkit absent) and only three species on the away side. Phase 4 should
   keep using `bun run balance` for breadth.
4. **`bun run verify` took 123.10 s on this host** (Phase 2 recorded 54.87 s).
   The telemetry file itself is 3.81 s, so the widened sample is not the cause;
   the run is inside the 150 s phase leg but above the 120 s figure in
   `tech-stack.md`. Worth a re-check on a quieter host before the PR.

## Primary verification

Run by the primary agent after the subagent report, before acceptance.

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| pacing gate | `bun run telemetry` | 0 | 13/13 ok; capShare 52.4% against a 60.0% ceiling; retreats 20,157 / 19,826 against a 42-order floor |
| static + unit + lint + determinism | `bun run verify` | 0 | 4,129 pass / 1 skip / 0 fail, 4,130 tests across 373 files in 115.46 s; four package typechecks clean; determinism gate 45 GLBs byte-identical |
| build | `bun run build` | 0 | Vite exit 0, only the pre-existing >500 kB chunk warning |

Diff review: `git diff --name-only 68a6a2ed..HEAD` lists only the two `Touches`
files plus this evidence file. `battle-telemetry.ts` widens `matchups()` to the
same 14 pairings across three seeds (42 fights), prints the 14/30/42 stability
table, scales the two retreat floors to one order per fight, raises `capShare` to
3/5, and refreshes the stale `why` strings. `telemetry.test.ts` re-pins the
sample size, `cap.total`, the one-in-two ceiling and the pinned-debt line. No
simulation module changed, so the measured values are a better estimate of the
same build, not a behaviour change.

Independent check of the claim that nothing but measurement moved: the new sample
opens with the shipped sample's first fight byte for byte, and the 840-fight
matrix still reads 23.5% cap.