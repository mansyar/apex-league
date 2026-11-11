# Phase 4 — The chooser strikes from where the blow lands

- **Track:** `20261111-minimum-reach` (Minimum Reach)
- **Phase:** 4 of 5 — "The chooser strikes from where the blow lands" (FR-4, FR-6, FR-7, FR-10, AC-4, AC-5, AC-6, AC-9)
- **Date:** 2026-11-12
- **Branch:** `feat/20261111-minimum-reach`
- **Phase base:** `d3012d73` (reworked spec, plan and brief; attempt 1 recorded below at base `bd5aad68`)
- **Result:** **BLOCKED (attempt 2)** — the projection-aware chooser is built, measured and green at
  `minReachMm = 0`, but the dead zone still cannot ship: `bun run balance` fails at the *smallest
  possible* positive value (1 mm) with three species out of band, and `bun run telemetry` accepts only
  up to 10 mm, with zero fights of headroom. The failure is a step at `minReachMm > 0`, not a slope,
  so no positive integer passes both gates.

## Attempt 2 — the projection-aware chooser (current)

Attempt 1 (below) concluded that FR-10 was unreachable because the innate basic covers every blind
spot up to 420 mm. The approved unblock was not a band lift but a chooser that judges a move by the
gap its **active frame** will stand at: a fast closer must commit from further out, so the basic no
longer covers the clinch for a special and the fighter has a real reason to step back. That is built
and measured here. It works mechanically and is exactly inert with no dead zone authored — and it
still cannot ship, for a reason attempt 1 could not see: **any positive dead zone turns the clinch
into a basic-only exchange, and the 15-species gate rejects that at every value, including 1 mm.**

### What was built (kept, inert at `0`)

`controller-moves.ts`

- `closingMm(me, foe, gap, ms)` — the relative velocity projected on the line to the foe,
  `Math.trunc(dot * ms / (1000 * gap))`, floored at zero, read exactly like
  `controller-punish.ts`'s closing term (velocity is thousandths of a mm per ms).
- `landingGapMm(me, foe, gap, row)` — `max(r₁+r₂, gap − closingMm(…, row.startupMs))`, floored at
  the two radii because `separateBodies` never lets bodies overlap.
- `inReach` — outer edge read at the gap **now** (`gapSq > (reach + r₁+r₂)² → false`), inner edge
  read at the **landing** gap. With `minReachMm = 0` the inner edge is the contact point itself and
  the early return makes the chooser byte-identical to Phase 2's.
- `shortOfInner(me, foe, moveId, gapSq)` — true when a move is inside its outer reach but its
  landing gap is inside the blind spot. `chooseMove` records that and, if nothing else is legal,
  falls back to the innate strike (FR-4 "basic is fallback"), so a punish window is not simply
  stood out. Gated on a move actually being shorted, so it is dead at `minReachMm = 0`.
- `landingEdgeMm(me, foe, kit, gapSq, reserve)` — the smallest `minReachMm + r₁+r₂ + closingMm(row)`
  over the kit rows that pass the same cooldown/affordability/reserve filters, or `null`.

`controller.ts` — in the inside-band press branch, when `chooseMove` returns `null`, the fighter
retreats while `gapSq < edge²` and `retreatRoom(...) >= radiusMm * RETREAT_ROOM_RADII`, keeping the
existing fence guard and the `retreating` latch. No new RNG draw; `stateHash` folds no new field.

`battle-telemetry.ts` — the dead-zone metric (P4.T4): `FightTelemetry.deadZone`,
`SampleTelemetry.deadZone { misses, share }`, `Metric` `"deadZoneShare"`, a bound, a report header
line, a summary line and a `show()` percentage case. It counts commits whose only failure was the
move's inner edge — `whiff.reason === "range"` in `StepReport.whiffs` plus
`shot.outcome === "range"` — from the same order replay the retreat count uses.

### The chooser is exactly inert with no dead zone (FR-1, NFR-1)

`bun run telemetry` at `minReachMm = 0` is **byte-identical to Phase 3**, row for row: fight 1
`fire_drake v earth_tortoise` 40.00 s, 6-9 blows, gap 560/969/3984, 95-94 cells, 18.9% idle;
cap 22/42 (52.4%); retreats 20157/19826; every one of the 14 bounds `ok`, with `deadZoneShare`
reading 0.0%. So the projection, the fallback and the retreat branch all cost nothing until a dead
zone is authored.

### Sweep — `bun run telemetry` (42 fights, 14 bounds; ceiling `capShare` 25/42)

All rows `reachMm >= 5000` carry the value; the six short rows and the innate basic stay `0`.

| `minReachMm` | exit | `capShare` | dead zone | idle | contact | exchange h/a/c | retreats h/a | positions min/med | engagement min/med/max | duration | bounds failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **0** | **0** | 22/42 52.4% | 0 (0.0%) | 26.1% | 7.3% | 0.31/0.27/0.57 | 20157/19826 | 65/167 | 380/1085/3992 | 18.44–40.00 s | none (14/14) |
| **10** | **0** | 25/42 59.5% | 5 (0.5%) | 27.2% | 7.5% | 0.31/0.28/0.59 | 20688/20475 | 65/178 | 376/1080/3992 | 18.44–40.00 s | none (14/14), **zero headroom** |
| 25 | 1 | 27/42 64.3% | 9 (1.0%) | 27.7% | 7.2% | 0.32/0.28/0.59 | 20672/20908 | 65/177 | 376/1085/3992 | 18.44–40.00 s | `capShare` |
| 100 | 1 | 27/42 64.3% | 20 (2.2%) | 26.9% | 7.1% | 0.31/0.28/0.60 | 21160/20177 | 63/174 | 379/1087/3992 | 18.44–40.00 s | `capShare` |
| 200 | 1 | 34/42 81.0% | 63 (6.7%) | 27.4% | 7.1% | 0.30/0.28/0.59 | 22468/21168 | 54/182 | 379/1112/3992 | 18.44–40.00 s | `capShare` |
| 400 | 1 | 38/42 90.5% | 204 (21.7%) | 27.0% | 7.4% | 0.30/0.27/0.57 | 23200/22452 | 69/186 | 379/1103/3992 | 25.84–40.00 s | `capShare` |
| 600 † | 1 | 39/42 92.9% | — | 30.2% | 7.1% | 0.30/0.26/0.57 | 23840/22388 | 77/189 | 379/1166/3992 | 29.10–40.00 s | `capShare` |
| 800 † | 1 | 39/42 92.9% | — | 39.1% | 6.4% | 0.25/0.22/0.47 | 26972/23372 | 43/176 | 379/1254/3992 | 25.08–40.00 s | `capShare` |
| 1000 † | 1 | 42/42 100.0% | — | 53.1% | 2.7% | 0.20/0.16/0.36 | 28260/28896 | 88/152 | —/1337/— | 40.00–40.00 s | `capShare`, `idleShare` |

† measured with the intermediate projection that also projected the **outer** edge. That version
changed the chooser even at `minReachMm = 0` (52.4% → 64.3%), so the outer edge was pinned to the
current gap and only the inner edge is projected; 400 and below were re-measured on the final code.
The high rungs are not re-run because the low rungs already decide the sweep: 10 mm is the largest
value telemetry accepts, and it has no headroom.

Stability, `capShare` at n=14/30/42: 0 mm 50.0/43.3/52.4%; 10 mm 64.3/56.7/59.5%; 25 mm
71.4/60.0/64.3%; 100 mm 71.4/60.0/66.7%; 200 mm 85.7/76.7/81.0%; 400 mm 85.7/86.7/90.5%.
`deadZoneShare` at n=14/30/42: 10 mm 0.6/0.6/0.5%; 25 mm 0.6/0.9/1.0%; 100 mm 2.4/2.1/2.2%;
200 mm 7.3/6.6/6.7%; 400 mm 20.8/22.5/21.7%.

### Sweep — `bun run balance` (840 fights, 15 species, bosses, damage band)

| `minReachMm` | exit | cap share | median | decisive | species out of band |
| --- | --- | --- | --- | --- | --- |
| **0** | **0** | 197/840 23.5% | 30.21 s | 95.0% | none (15/15) |
| **1** | **1** | 183/840 21.8% | 29.78 s | 96.0% | `wind_falcon` 59.4% (66/112, bound 9.3), `voltfox` 32.1% (36/112, bound 9.4), `mossboar` 39.3% (44/112, bound 9.6) |
| 10 | 1 | 193/840 23.0% | 30.63 s | 95.4% | `wind_falcon` 62.5% (70/112, bound 9.3), `voltfox` 36.6% (41/112, bound 9.4), `mossboar` 40.2% (45/112, bound 9.6) |
| 25 ‡ | 1 | 251/840 29.9% | 32.75 s | 93.9% | `wind_falcon` 67.0% (bound 9.5) |
| 400 ‡ | 1 | 815/840 97.0% | 40.00 s | 87.7% | eight species, plus `capShare` and `medianDuration` |

‡ measured in attempt 1 with the static chooser. Every other `bun run balance` figure at 1 mm and
10 mm is green: 49/49 moves inside the 4–12% damage band, all six bosses beatable and not trivial
(koda 36.7%, hesse 23.3%, marlow 36.7%, delmar 20.0%, fenn 40.0%, thessa 30.0% at 1 mm), cap share
inside 33.3%, `durationP05` 15.88 s, `durationMax` 40.00 s. Only the species band fails.

**1 mm is the decisive row.** It is the smallest positive integer the validator accepts, and it
already puts three species 10–13 points outside the band (`voltfox` 45.5% → 32.1%, `mossboar`
49.1% → 39.3%, `wind_falcon` 51.8% → 59.4% against Phase 3's 840-fight baseline). No value below it
exists, so the roster gate rejects the mechanic outright rather than at some threshold.

### Why a 1 mm dead zone behaves like a 100–250 mm one

The interval is tested at the gap the blow **resolves** at, not the gap it is committed from, so the
moment any dead zone is authored a special that resolves at the bodies' contact distance (440 mm)
whiffs where it used to hit: `minReachMm = 1` moves the inner edge to 441 and the clinch stops being
a place a special can land. The projection-aware chooser then refuses those commits instead of
whiffing them, and the fighter uses the innate strike (FR-4) or steps back (FR-10) — which is the
mechanic working. But the resolution gap still reaches contact whenever the foe closes through the
active window, and the chooser's own refusal window is `minReachMm + closing × startup`, i.e.
100–250 mm for the fastest rows (a 6,500 mm row starts up over 400 ms). So the authored value is a
switch, not a dial: it turns on a speed-dependent dead zone, and speed is exactly what the roster
band is made of.

This is why the sweep has no passing rung and why the two gates disagree: the telemetry fixture
gives both sides the reference stat line (`hp 189, atk 10, def 10, spd 10`), so it sees a small
effective dead zone (5 whiffs at 10 mm); the roster gate plays 15 real stat lines and sees the
speed-dependent one.

### Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 | `chooseMove` point-blank returns basic, long move at the same gap once the foe is outside the dead zone | `controller.test.ts` "the chooser stands outside a move's dead zone (FR-4, AC-4)" still passes: `chooseMove(…, ["pyre_lance"], 439², 0, false)` → `null`, `440²` → `"pyre_lance"`; the projection is inert at `0` (telemetry byte-identical) | met at `0`, untested against an authored value |
| AC-5 | `bun run balance` exit 0, 15 species in band, every moved figure recorded | exit 1 at 1, 10, 25, 400; table above | **not met** |
| AC-6 | `bun run telemetry` exit 0 on the widened sample, printing the dead-zone share and every bound with visible headroom | exit 0 at 0 and 10; 10 mm has zero headroom, and 0 mm means no dead zone is measured | **not met** |
| AC-9 | a full telemetry fight shows the fighter leaving its own blind spot, commits above zero, `idleShare` inside bound, test proving the retreat order moved it | the retreat branch cannot fire at `0` (no move is ever shorted), so no test can prove it; `landingEdgeMm`/`inReach` unit-testable but the order is unreachable | **not met** |

### Commands (attempt 2, on the shipped tree)

See the combined command table at the end of this file.

### What is left to decide

The mechanic is faithful and inert at `0`; the gate is what rejects it. The options are the
primary's, not this phase's:

1. **Re-derive the species band** (45–55% / `|rate − 50| ≤ se`) for a track that ships a dead zone.
   At 1 mm the misses are `voltfox` −17.9, `mossboar` −9.8 and `wind_falcon` +7.6 points from 50%;
   at 10 mm −13.4, −9.8 and +12.5. That is a bound change and needs the same explicit approval
   Phase 3 got for the telemetry sample.
2. **Narrow the projection's closing term** so the effective dead zone is the authored value rather
   than `authored + closing × startup` — e.g. cap `closingMm` at the row's own `minReachMm`. This
   would make the authored value the real one, but it also makes the chooser commit blows that
   resolve inside their blind spot, which is what the metric was added to count. It is a design
   decision about what "the gap at its active frame" means.
3. **Accept `minReachMm = 0`** and drop FR-10/AC-9 from the track, recording that the mechanic is
   unshippable under the current gates.

Until one is chosen, `frames.ts` authors `0` on every row, which is what the shipped tree below
verifies.

---

## Attempt 1 — the block (static chooser, base `bd5aad68`)

- **Phase base:** `bd5aad68` (Phase 3 verified, checkpoint `09ca1ee3` / `5b054301`)
- **Code head:** `bd5aad68` — **no simulation change shipped**; this evidence file is the only committed artifact
- **Result:** **BLOCKED** — no dead-zone value satisfies both gates, and every value that would make FR-10 reachable fails them by a wide margin. The working tree was restored byte-identical to `bd5aad68` (`git diff --stat` empty).

### Why that was blocked, in one paragraph

A fighter can only be "inside its own blind spot with no legal move" when the innate
basic does not cover the gap. Basic's interval is `[r₁+r₂, 420 + r₁+r₂]` and it is
always tried first, so for any authored `minReachMm ≤ 420` every long row's blind spot
lies **inside** basic's interval: `chooseMove` returns `"basic"`, `moveId` is never
`null` for range reasons, and the FR-10 retreat order is unreachable. FR-10 only
becomes reachable at `minReachMm > 420` (inner edge > 860 mm, beyond basic). At every
measured value from 425 mm up, and already at 25–400 mm from the interval mechanic
alone, `bun run telemetry` and `bun run balance` fail. The two deliverables of this
phase are therefore mutually unsatisfiable under the bounds pinned in Phase 3:
FR-10 needs a dead zone the gates reject, and the gates only accept a dead zone FR-10
cannot act on.

### Attempt 1 candidate sweep

One value authored on all 42 rows with `reachMm >= 5000` (every element kit row plus
`cinder_dive`, `thorn_charge`, `riptide_rush`, `storm_surge`, `quake_stomp`,
`cyclone_dive`); the six short rows (`pyre_wall` 4,200, `bramble_guard` 4,000,
`tide_aegis` 4,200, `ion_wall` 4,400, `basalt_guard` 3,800, `zephyr_veil` 4,400) and
`basic` stayed `0`. Inner edge = `minReachMm + r₁ + r₂`; for the 220 mm reference pair
that is `minReach + 440`. Sweep order: 1,000 → 800 → 600 → 400 (the brief's ladder),
then 200, 100, 50, 25 to find the smallest value that could still be called a blind
spot.

#### `bun run telemetry` — 42 fights, 14 bounds (`capShare` max 25/42, all others as Phase 3)

| value | inner edge | exit | capShare (bound ≤ 25/42) | idle | dead-zone share | contact | exchange h/a | retreats h/a | positions min | duration | bounds failed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **0** (HEAD) | 440 | **0** | 22/42 52.4% | 26.1% | n/a (metric absent) | 7.3% | 0.31 / 0.27 | 20157 / 19826 | 65 | 18.44–40.00 s | none |
| 25 | 465 | 1 | **26/42 61.9%** | 27.1% | 19 commits 2.1% | 7.3% | 0.30 / 0.27 | 21526 / 20620 | 65 | 18.44–40.00 s | capShare |
| 50 | 490 | 1 | **27/42 64.3%** | 26.9% | 23 commits 2.5% | 7.4% | 0.30 / 0.27 | 21642 / 20456 | 65 | 18.44–40.00 s | capShare |
| 100 | 540 | 1 | **28/42 66.7%** | 26.9% | 31 commits 3.4% | 7.6% | 0.31 / 0.27 | 21852 / 20584 | 33 | 18.44–40.00 s | capShare |
| 200 | 640 | 1 | **29/42 69.0%** | 26.6% | 83 commits 9.1% | 8.0% | 0.30 / 0.27 | 22690 / 20418 | 63 | 18.20–40.00 s | capShare |
| 400 | 840 | 1 | **39/42 92.9%** | 26.5% | 291 commits 31.4% | 10.6% | 0.30 / 0.26 | 23384 / 21392 | 67 | 28.90–40.00 s | capShare |
| 600 | 1040 | 1 | **41/42 97.6%** | 27.9% | 401 commits 45.7% | 10.5% | 0.28 / 0.24 | 24428 / 21060 | 96 | 32.04–40.00 s | capShare |
| 800 | 1240 | 1 | **40/42 95.2%** | 32.2% | 411 commits 59.2% | 5.4% | 0.22 / 0.20 | 26468 / 23988 | 25 | 24.96–40.00 s | capShare |
| 1000 | 1440 | 1 | **42/42 100.0%** | **53.4%** | 360 commits 92.5% | 0.2% | 0.13 / 0.10 | 30500 / 30948 | — | 40.00–40.00 s | capShare, idleShare |

Stability (n = 14 / 30 / 42) shows the cap share is not a seed artefact:

| value | capShare n=14 | n=30 | n=42 | dead-zone n=14 | n=30 | n=42 |
|---|---|---|---|---|---|---|
| 25 | 57.1% | 53.3% | 61.9% | 2.2% | 2.4% | 2.1% |
| 50 | 64.3% | 56.7% | 64.3% | 3.1% | 3.0% | 2.5% |
| 100 | 71.4% | 60.0% | 66.7% | 4.0% | 3.6% | 3.4% |
| 200 | 71.4% | 63.3% | 69.0% | 10.0% | 9.2% | 9.1% |
| 400 | 100.0% | 90.0% | 92.9% | 35.6% | 33.0% | 31.4% |
| 600 | 100.0% | 100.0% | 97.6% | — | — | 45.7% |
| 800 | 100.0% | 93.3% | 95.2% | — | — | 59.2% |
| 1000 | 100.0% | 100.0% | 100.0% | — | — | 92.5% |

#### `bun run balance` — 840 fights (bounds: capShare ≤ 33.3%, median 25–40 s, every species `|rate−50| ≤ se`, damage 4–12%, bosses)

| value | exit | cap share (≤ 33.3%) | median duration | species out of bound | damage band | bosses |
|---|---|---|---|---|---|---|
| **0** (HEAD) | **0** | 197/840 23.5% | 30.21 s | none (`water_axolotl` 57.1% is inside its 9.3% bound) | 49/49 | all ok |
| 25 | 1 | 251/840 29.9% | 32.75 s | `wind_falcon` 67.0% (bound 9.5%) | 49/49 | all ok |
| 50 | 1 | 262/840 31.2% | 32.89 s | `wind_falcon` 62.5% (9.5%), `embercub` 35.7% (9.7%) | 49/49 | all ok |
| 100 | 1 | **289/840 34.4%** | 34.62 s | `wind_falcon` 62.5% (9.3%), `embercub` 36.6% (9.6%) | 49/49 | all ok |
| 200 | not run | — | — | — | — | — |
| 400 | 1 | **815/840 97.0%** | **40.00 s** | `water_axolotl` 33.0%, `fernstag` 63.4%, `earth_tortoise` 33.9% | 49/49 | all ok |
| 600 / 800 / 1000 | not run | — | — | — | — | — |

The 200/600/800/1000 balance runs were not spent: the 400 rung is the mildest of
those four and already fails `capShare` at 97.0% and the median at exactly 40.00 s,
while its telemetry cap share (92.9%) is *lower* than 600/800/1000 (97.6/95.2/100%).
The balance gate measures the same fights over a wider roster; a larger dead zone
cannot recover a 97% cap share. Every figure above is a measured run, not an estimate.

#### Chosen / rejected

- **Chosen:** none. **`minReachMm` stays `0` on every row** (Phase 1/2 authored state).
- **Rejected 1,000 / 800 / 600:** telemetry `capShare` 100.0% / 95.2% / 97.6% and
  `idleShare` 53.4% at 1,000 — the fight becomes a standoff: the dead zone exceeds the
  doctrine hold point, so neither side can land.
- **Rejected 400:** both gates fail hard — telemetry 39/42 cap (92.9%), balance 97.0%
  cap, median pinned at 40.00 s, three species out of bound.
- **Rejected 200 / 100 / 50 / 25:** telemetry `capShare` fails at every rung
  (69.0 / 66.7 / 64.3 / 61.9% against a 60.0% ceiling; 25 mm is one fight over), and
  25/50/100 also fail the balance species bound (`wind_falcon` +15…+17 points). These
  are all *below* 420 mm, i.e. values FR-10 can never act on.
- **Below 25 mm:** not swept. Even if a 5–20 mm value slipped through both gates it
  would be inert (edge ≤ 460 mm, fully covered by basic's 860 mm edge), unmeasurable
  as a blind spot (a 20 mm body step crosses it), and AC-9's "fighter leaves its own
  blind spot" could not be shown in any fight. Shipping it would satisfy the letter of
  "largest value both gates accept" while leaving FR-10 and AC-9 unmet.

### Why the gates move so hard (static chooser, measured not guessed)

The dead zone does not merely refuse a few point-blank specials. It removes the
bottom of the band the doctrine actually fires from:

- The doctrine hold point is ~1,085 mm (telemetry `engagementMedian`). For a 220 mm
  pair the press band is floor 602 / preferred 946 / ceiling 1,290 mm.
- A shot is judged on **launch** geometry (`ProjectileState.launchGapSq`, Phase 2).
  With startup 200–800 ms and a closing foe at ~0.6 mm/ms, the gap shrinks 150–700 mm
  between commit and launch. At 400 mm (edge 840) the preferred 946 mm launch lands
  around 790 mm — inside the edge — so the shot is a `range` miss even though the
  chooser committed legally. That is the 31.4% dead-zone share and the 92.9% cap share
  at 400 mm.
- `range` commits cost a full startup + recovery and deal nothing, so damage
  throughput halves and fights run to `FIGHT_CAP_MS`.

The fix that would make a real dead zone playable is **not** the retreat order: it is
the band. `threatBandFor`/`bandFor` scale the hold point from the *basic's* reach edge
(860 mm) and know nothing about the kit's own inner edge, so a fighter holds where it
cannot legally launch. Lifting the preferred range to `kit inner edge + closing lead`
(and the ceiling with it) is a controller-policy change outside Phase 4's Touches and
outside FR-10's stated shape ("where `moveId === null` would circle or advance"), so it
was not attempted. It is the recommended next lever.

### What was built, then reverted (attempt 1)

`git diff --stat` is empty at head, so none of this is committed. It was written,
type-checked by the full suite, and measured; it is recorded here so the phase does not
have to be re-derived.

**`controller-moves.ts` (+~2,000 B, 4,918 → ~7,000 B, under the 12,288 B cap)** — extract
the shared filters and add the query beside `chooseMove`:

```ts
export function retreatEdgeMm(
  me: FighterState, foe: FighterState, kit: readonly string[], reserve = 0,
): number | null {
  const radii = me.radiusMm + foe.radiusMm
  const holding = holdsForBreak(foe, reserve)          // reserve hold, FR-19/FR-14
  let edge: number | null = null
  for (const moveId of kit) {
    const move = getMove(moveId); const row = getFrameData(moveId)
    if (!move || !row) continue
    if (!spendable(me, moveId, reserve, holding)) continue
    const inner = row.minReachMm + radii
    if (edge === null || inner < edge) edge = inner
  }
  return edge
}
```

with `spendable(me, moveId, reserve, holding)` = `isCooldownReady` && `canAfford` &&
`!(holding && me.stamina - cost < reserve)`, and `holdsForBreak(foe, reserve)` = the
existing `RESERVE_POISE` test. `chooseMove` was rewritten to call both, so the query and
the chooser cannot drift.

**`controller.ts` (+~800 B, 11,153 → ~11,950 B, ~340 B under the cap)** — inside the
`slot < press` branch, after the failed/refused commit and before the
`withRule(settle("advance", …))` fallback:

```ts
if (!moveId) {
  const edge = retreatEdgeMm(me, foe, kit, PUNISH_RESERVE_STAMINA)
  if (edge !== null && gapSq < edge * edge) {
    const away = awayFrom(me, foe)
    if (retreatRoom(me, away, state.bounds) >= me.radiusMm * RETREAT_ROOM_RADII) {
      return settle("retreat", away)
    }
  }
}
```

No new RNG draw: the branch reads only positions, radii, stamina and cooldowns and
returns a direction. Overshoot is bounded by the decision interval: the order is dropped
the moment the gap reaches the edge, and the existing `retreating` latch then backs to
`band.preferredMm` (≤ one 240 ms walk beyond the edge).

**`battle-telemetry.ts` (+~90 lines)** — `FightTelemetry.deadZone`,
`SampleTelemetry.deadZone {misses, share}`, `replayOf` renamed from `retreatsOf` and
counting `whiff.reason === "range"` plus `shot.outcome === "range"` per replayed step,
`Metric += "deadZoneShare"`, `observed`/`show`/`report` rows, and a provisional bound.
Measured with the metric in place: 0.0% at 0 mm, 2.1% at 25, 2.5% at 50, 3.4% at 100,
9.1% at 200, 31.4% at 400, 45.7% at 600, 59.2% at 800, 92.5% at 1,000. No ceiling was
pinned because no value ships; a loose ceiling (the metric proves the blind spot is
real, not that it is small) would sit at ~70% to catch the 1,000 mm runaway while
passing the whole expected 400–800 mm band with headroom.

**Why the FR-10 unit test cannot be written at `minReachMm = 0`:** `decide` reaches the
new branch only when `chooseMove` returns `null`; at 0 the only causes are stamina,
cooldown or the poise reserve, and `retreatEdgeMm` applies the same filters, so it
returns `null` too. `getFrameData` is a frozen table with no injection seam (Phase 2's
AC-4 test injects a row value by building a `ProjectileState` literal, which is not
available to the chooser). T1.1's "test proves direction and that the order stops at
the inner edge" is therefore only writable with a positive authored value — the same
value this phase could not author.

### Attempt 1 acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-5 | `bun run balance` exit 0, 15 species in bound, every moved figure recorded | Sweep table above: exit 1 at 25/50/100/400 mm; 840-fight figures recorded for each. Exit 0 only at `minReachMm = 0`, which is the Phase 2 state | **not met** |
| AC-6 | `bun run telemetry` exit 0 on the widened sample, printing the dead-zone share and every re-derived bound with headroom | Harness at 0: exit 0, 13/13 bounds, no dead-zone metric. With the metric built: exit 1 at every positive value (capShare); measured shares 2.1–92.5% | **not met** |
| AC-9 | A full telemetry fight shows the fighter leaving its own blind spot; a test/trace proves the retreat order moved it | At 0 the retreat path is unreachable (proof above); at > 420 mm both gates fail. No fight was produced in which the order fires | **not met** |

### Attempt 1 commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| unit + static + determinism | `bun run verify` | **0** | 4,129 pass, 1 skip, 0 fail — 4,130 tests / 373 files, 115.54 s; biome 932 files clean; 46 GLBs + 5 props byte-identical |
| build | `bun run build` | **0** | vite 8.3.4, 417 modules, `dist/assets/index-DLOuCLoN.js` 1,065.23 kB / gzip 292.94 kB (529 ms) |
| gate (balance) | `bun run balance` | **0** | 840 fights (ko 642 / time 197 / draw 1), all 15 species in bound, 49/49 damage band, cap 23.5%, decisive 95.0%, every pinned figure identical to Phase 3 |
| gate (telemetry) | `bun run telemetry` | **0** | 42 fights, 13/13 bounds, byte-identical to Phase 3: engagement 380/1085/3992 mm, idle 26.1%, contact 7.3%, cap 22/42 (52.4%), duration 18.44–40.00 s |
| targeted sweep runs | `bun run telemetry` × 8 values, `bun run balance` × 4 values | 1 each | Tables above; each positive value failed at least one gate |

### Attempt 1 deviations

None. `packages/sim/src/battle/frames.ts` was restored byte-for-byte (the 41 single-line
long rows and `hurricane_spiral`'s multi-line row were hand-reverted; `git diff --stat`
is empty), and the three modified files (`controller-moves.ts`, `controller.ts`,
`battle-telemetry.ts`) were reverted to `bd5aad68` before the four gate commands ran.

### Attempt 1 notes for the primary

1. **The decision needed:** either (a) approve the band lift described above
   (`threatBandFor`/`bandFor` preferred = kit inner edge + closing lead), then re-run
   this phase; (b) approve a `capShare` re-derivation on the telemetry fixture for a
   real dead zone — that is a bound change and needs the same explicit approval Phase 3
   got; or (c) accept a dead zone ≤ 420 mm with FR-10 unreachable and AC-9 unmet.
2. Phase 2's 14-fight sample hid this: at 200 mm on the old sample the setting was 7/14
   (exactly the old 50% ceiling). The 42-fight sample reads 29/42 (69.0%) — the same
   setting, measured properly. The widened sample did its job; it just says no.
3. `controller.ts` was at 11,153 B before this phase. The FR-10 block lands at ~11,950 B,
   ~340 B under the 12,288 B cap — any further addition there needs a split first.
4. The dead-zone metric itself is worth keeping even if the value decision is deferred:
   it is the only measurement that says the blind spot is real, and it costs one replay
   that the retreat tally already pays for.

---

## Commands (attempt 2, shipped tree)

| Layer | Command | Exit | Summary |
|---|---|---|---|
| gate (balance) | `bun run balance` | **0** | 840 fights (ko 642 / time 197 / draw 1), all 15 species in band, 49/49 damage band, cap 23.5%, decisive 95.0%, every pinned figure identical to Phase 3 |
| gate (telemetry) | `bun run telemetry` | **0** | 42 fights, **14/14** bounds, fight table and all summary figures byte-identical to Phase 3 plus `ok deadZoneShare: observed 0.0%, bound <= 50.0%` |
| unit + static + determinism | `bun run verify` | **0** | 4,130 pass, 1 skip, 0 fail — 4,131 tests / 373 files, 121.52 s, 464,928 `expect()` calls; biome 932 files clean; determinism gate OK on 46 creature GLBs + 5 props; trace seed 20261111 hash `0x9dc8c2a1`, 5 invariants ok |
| build | `bun run build` | **0** | vite 8.3.4, 417 modules, `dist/assets/index-B-S1xWAH.js` 1,066.30 kB / gzip 293.27 kB (603 ms) |
| sweep runs | `bun run telemetry` × 6 values, `bun run balance` × 2 values | 1 each | Tables above; 10 mm passes telemetry with zero headroom and fails balance on three species; 1 mm fails balance |

## Deviations (attempt 2)

- `packages/sim/scripts/battle-telemetry.ts` — the dead-zone metric is wired through
  `FightTelemetry`, `SampleTelemetry`, `Metric`, `BOUNDS`, `observed`, `show` and `report`. It lives
  in the gate script because that is where the retreat tally already replays the orders and reads
  `StepReport`; no simulation change was needed (FR-5 already reports `reason: "range"`).
- `packages/sim/src/battle/continuous/telemetry.test.ts` — 13 → 14 metrics, the pinned bound object
  gains `deadZoneShare`, and a new test pins that the metric is measured and reported (FR-7, AC-6).
- No bound, floor, tolerance or `DISTINCT_FLOOR` was edited. `frames.ts` ships `0` on every row, so
  `frames.test.ts`'s "no dead zone yet" pin still holds and needed no edit.

## Notes for the primary (attempt 2)

1. **The step is the finding.** `bun run balance` is green at `0` and fails three species at `1` —
   the smallest positive integer the validator accepts. There is no rung to ship, so the choice is a
   design decision, not a tuning one: the three options are listed under "What is left to decide".
2. **The chooser is worth keeping.** It is byte-identical to Phase 2 at `minReachMm = 0` (telemetry
   row for row), it closes AC-4's gap for a closing fighter, and it is what makes FR-10 reachable at
   all. If the track ships `0`, this code is inert and safe; if the gates are re-derived, it is
   already the right chooser.
3. **The dead-zone metric is live and green**: 14/14 bounds at `0`, reading 0.0% with no dead zone
   and 0.5–21.7% as the value rises. Its ceiling (`1/2`) is loose by design and pinned in
   `telemetry.test.ts`.
4. **`controller.ts` size**: the retreat branch adds ~17 lines. Check the module-size guard in
   `bun run verify` — it passed on this tree, but the file is close to the 12,288 B cap.

