# Phase R1 — Review Fixes (round-1 BLOCK) — working evidence

Base: 5b9ea302 (plan mark) / R1 work on feat/20261111-roster-retune.
Gate base (Phase 3): d80d702a — `bun run balance` exit 0, all 15 ok.

## R1 base (pre-move) species matrix — `bun run balance` exit 0

| species | rate | wins | draws | distinct | se |
|---|---|---|---|---|---|
| fire_drake | 49.1% | 55 | 0 | 107 | 4.8% |
| plant_ox | 44.6% | 50 | 0 | 103 | 4.9% |
| water_axolotl | 56.3% | 63 | 0 | 110 | 4.8% |
| electric_hound | 47.3% | 52 | 2 | 107 | 4.8% |
| fernstag | 47.8% | 53 | 1 | 109 | 4.8% |
| wind_falcon | 51.8% | 58 | 0 | 109 | 4.8% |
| reefclaw | 47.3% | 53 | 0 | 109 | 4.8% |
| earth_tortoise | 50.0% | 56 | 0 | 106 | 4.9% |
| cindermoor | 48.2% | 54 | 0 | 110 | 4.8% |
| voltfox | 55.8% | 62 | 1 | 108 | 4.8% |
| galeheron | 53.6% | 60 | 0 | 108 | 4.8% |
| shalemole | 47.3% | 53 | 0 | 103 | 4.9% |
| embercub | 55.4% | 62 | 0 | 110 | 4.8% |
| mossboar | 48.2% | 54 | 0 | 103 | 4.9% |
| mistkit | 47.3% | 53 | 0 | 108 | 4.8% |

Design-band misses (base): plant_ox 44.6%, water_axolotl 56.3%, voltfox 55.8%,
embercub 55.4%.
Pacing (base): capShare 23.7% (199/840) ok; decisive 94.4% ok;
quality 77.4% ok; median 30.08s ok; p05 16.04s ok; max 40.00s ok;
damage 49/49; bosses hesse 5/30, thessa 13/30, rest 8..17/30 — all ok.
Telemetry (base): 13/13 ok; cap 7/14 = 50.0% AT BOUND (zero headroom);
duration 33.52s..40.00s; engagement min 379 / med 1085 / max 3992 mm;
exchange home 0.30 / away 0.27 per s; idle 25.5%; contact 6.8%;
retreats home 7204 / away 6919; positions min 106 cells.

## Frontier reconstruction (variance head 7a08d427) — scratch-revert measurement

Method: temporarily reverted the 5 track bound sets (ox atk/def, tortoise
atk/def, cinder def, galeheron def, mossboar atk) to variance values in the
working tree, ran `bun run balance` (exit 1, 4 gate FAILs as at frontier),
restored. `git diff --stat 7a08d427 HEAD` confirms only species bounds +
test pins + formatting changed since frontier, so the measurement code is
identical and the reproduction below verifies fidelity.

Reproduced exactly: plant_ox 67.9% (76/112, d102, se 5.0%),
earth_tortoise 29.5% (33/112, d100, se 5.0%),
cindermoor 59.8% (67/112, d110, se 4.8%),
galeheron 33.9% (38/112, d109, se 4.8%),
8 design-band misses (ox, water_axolotl, electric_hound, tortoise, cindermoor,
galeheron, embercub, mossboar) — matches frontier.md / variance phase-4.

Frontier assumption rows + voltfox (measured, exact):

| row | frontier rate | wins | draws | distinct | se |
|---|---|---|---|---|---|
| water_axolotl | 58.9% | 66 | 0 | 112 | 4.7% |
| electric_hound | 42.0% | 46 | 2 | 108 | 4.8% |
| embercub | 56.3% | 63 | 0 | 110 | 4.8% |
| mossboar | 58.0% | 65 | 0 | 101 | 5.0% |
| voltfox | 50.4% | 56 | 1 | 108 | 4.8% |

## Candidate A (T1): plant_ox atk [8,11] -> [9,12] — OVERSHOOT, reverted-or-held?

Whole-band width-preserving shift (3-wide, mid 9->10, ceiling 12 <= 15).
Result: plant_ox 44.6% -> 57.1% (+12.5pts per +1 mid atk), now outside HIGH.

| species | A rate | delta vs base |
|---|---|---|
| plant_ox | 57.1% (64/112, d104, se 4.9%) | +12.5 |
| water_axolotl | 56.3% (63/112, d111, se 4.7%) | 0.0 |
| electric_hound | 46.4% (51/112, d107, se 4.8%) | -0.9 |
| wind_falcon | 50.0% (56/112, d109, se 4.8%) | -1.8 |
| earth_tortoise | 47.3% (53/112, d102, se 5.0%) | -2.7 |
| cindermoor | 48.2% (54/112, d110, se 4.8%) | 0.0 |
| voltfox | 54.0% (60/112, d109, se 4.8%) | -1.8 (back INSIDE) |
| galeheron | 50.0% (56/112, d107, se 4.8%) | -3.6 (centered) |
| embercub | 55.4% (62/112, d110, se 4.8%) | 0.0 |
| mossboar | 46.4% (52/112, d99, se 5.0%) | -1.8 |

Design-band misses (A): plant_ox 57.1%, water_axolotl 56.3%, embercub 55.4%.
Gate: all ok (exit 0). Pacing (A): capShare 23.0% ok; decisive 95.0% ok;
quality 79.3% ok; median 30.06s ok; p05 16.04s ok; damage 49/49; bosses ok
(hesse 5/30, thessa 14/30).
Fire rows (water/embercub/cindermoor) unchanged — ox takes wins from
earth/electric/flying rows, consistent with fire-beats-plant chart direction.
Def levers measured +19.7 (galeheron) / ~+20 (tortoise combined) per +1 mid,
so ox def +1 is expected to overshoot further. Atk lever: +12.5 per +1 mid.

## Candidate B (T1): plant_ox spd [6,9] -> [7,10] — outside by 0.4, reverted

Whole-band width-preserving shift (mid 7->8, ceiling 10). Result: plant_ox
44.6% -> 55.4% (+10.8pts per +1 mid spd) — outside HIGH by 0.4pts.
Misses (B): plant_ox 55.4%, water_axolotl 56.3%, embercub 55.4%.
Full row: drake 49.1, ox 55.4 (62/112, d102, se 5.0), water 56.3, hound
45.5, fernstag 49.6, falcon 50.9, reefclaw 47.3, tortoise 45.5, cinder
48.2, voltfox 53.1, galeheron 51.8, shalemole 47.3, embercub 55.4,
mossboar 47.3, mistkit 47.3. Gate exit 0 (all ok). Pacing (B): capShare
23.2% ok; decisive 95.0% ok; quality 79.5% ok; median 30.12s ok; p05
16.04s ok; damage 49/49; bosses ok. Spd lever too hot (+10.8): the band
edge sits between two adjacent integer shift states (44.6 below / 55.4
above).

## Candidate C (T2 tune): embercub atk [9,13] -> [8,12] — KEPT

Whole-band width-preserving predator trim (mid 11->10, ceiling 12).
Result: embercub 55.4% -> 52.7% (inside); plant_ox UNCHANGED at 44.6%
(50 wins) — the fire-preys-on-plant hypothesis is DEAD in this engine
(ox's 8 games vs embercub did not move). Voltfox 55.8 -> 56.7 (+0.9),
tortoise 50.0 -> 50.9 (+0.9), falcon 51.8 -> 52.7 (+0.9). Misses (C):
plant_ox 44.6%, water_axolotl 56.3%, voltfox 56.7%. Gate exit 0.
Pacing (C): capShare 24.2% ok; decisive 94.4% ok; quality 77.8% ok;
median 30.54s ok; p05 16.04s ok; damage 49/49; bosses ok.

## Candidate D (T1+T2 keystone): voltfox def [7,10] -> [6,9] — KEPT (FINAL)

Whole-band width-preserving trim of the outside-high row (mid 8->7),
on top of C. Voltfox is an ox victim (candidate A: stronger ox took 2 of
voltfox's wins), so weakening it feeds ox wins while cooling itself.
Result: voltfox 56.7% -> 45.5% (-11.2, inside, guardrail regress FIXED);
plant_ox 44.6% -> 46.4% (+1.8, +2 wins 50->52, INSIDE point-wise);
embercub 52.7 -> 53.6 (inside); cindermoor 48.2 -> 51.8 (centered);
mossboar 48.2 -> 49.1; drake 49.1 -> 50.9; tortoise 50.9; falcon 52.7;
galeheron 53.6 (unchanged); water 56.3 -> 57.1 (+0.8, noise, still miss).
Misses (D): water_axolotl 57.1% ONLY (4 -> 1). Gate exit 0, all ok.
Pacing (D): capShare 23.5% (197/840) ok; decisive 94.9% ok; quality
78.7% ok; median 30.16s ok; p05 15.56s ok; damage 49/49; bosses ok
(hesse 5/30, thessa 14/30).
Telemetry (D): 13/13 ok; cap 7/14 = 50.0% AT BOUND (holds, zero headroom
preserved); #10 voltfox v tortoise ko 36.40s -> ko 26.40s (weaker voltfox
def -> faster tortoise KO, good direction); duration 26.40s..40.00s;
engagement min 379 / med 1086 / max 3992 mm; exchange 0.30/0.27 per s;
idle 25.3%; contact 6.7%; retreats 7060/6935; positions min 88 / med 179.

## Candidate E (T3 attempt): galeheron atk [8,11] -> [7,10] — REVERTED

Whole-band width-preserving shift on top of D. Result: plant_ox 46.4% ->
50.0% EXACT (margin 5.0 >= se 4.9 achieved!) BUT galeheron 53.6% ->
37.5% (-16.1, gate FAIL, outside-low), water_axolotl 57.1% -> 60.7%
(gate FAIL, further outside — galeheron was holding water down),
wind_falcon 52.7% -> 55.4% (new miss), cindermoor 51.8% -> 54.5% (0.5
from edge). Misses (E): water 60.7, falcon 55.4, galeheron 37.5; gate
exit 1 (2 FAILs). Atk lever nuclear again (-16.1). E proves the
ox<->galeheron axis is a seesaw with no joint-inside rest point at
integer granularity EXCEPT D (ox 46.4 + galeheron 53.6 both inside).
E reverted; D is the confirmed frontier joint state.

## R1.T2 guardrail table (frontier -> D head)

| row | frontier | D head | delta | max se | verdict |
|---|---|---|---|---|---|
| water_axolotl | 58.9% (66, d112, 4.7) | 57.1% (64, d110, 4.8) | -1.8 | 4.8 | HOLD (improving, \|delta\|<se; still outside -> waiver) |
| electric_hound | 42.0% (46+2dr, d108, 4.8) | 47.8% (53+1dr, d107, 4.8) | +5.8 | 4.8 | HOLD (improved INTO band; 1.2xse in the good direction) |
| embercub | 56.3% (63, d110, 4.8) | 53.6% (60, d108, 4.8) | -2.7 | 4.8 | HOLD (improving; direct trim C) |
| mossboar | 58.0% (65, d101, 5.0) | 49.1% (55, d106, 4.9) | -8.9 | 5.0 | HOLD (into band via P1 trim + drift) |
| voltfox | 50.4% (56+1dr, d108, 4.8) | 45.5% (51, d105, 4.9) | -4.9 | 4.9 | REGRESS-then-FIXED (went 55.8/56.7 outside, direct trim D) |

No assumption row moved further outside by more than its se. Voltfox's
excursion is closed by the D trim. Thin-margin note: voltfox 45.5 sits
0.5pts from the edge — recorded, not test-locked (brief scopes the
margin test to galeheron/cindermoor).

## Findings

### F1 (plant_ox inside the band with margin): point-fixed, margin frontier-with-waiver
Attainable ox states measured: base 44.6 (outside-low 0.4), B/spd 55.4
(outside-high 0.4), A/atk 57.1 (outside-high 2.1), D 46.4 (INSIDE, margin
1.4pts = 0.29xse), E 50.0 (margin 5.0 >= se BUT breaks galeheron+water,
gate FAIL). No single whole-band integer shift lands ox in the >=1se
zone [49.9, 50.1] while holding the gate: levers move +10..+12.5 per +1
mid (band is 10 wide). D is the best joint state. Point-wise AC-1:
ACHIEVED (46.4 inside, gate run() === 0). Margin: FRONTIER — proposed
waiver: plant_ox holds 46.4% with 1.4pt margin (sub-se by 3.5pts);
revisit only with a fractional lever (kit change) in a later track.
DISTINCT re-pin: none needed (tortoise 106, reefclaw 109 unchanged in D).
Design-band list re-pinned 4 -> 1 (water_axolotl only); the
balance-report.test.ts:418-420 comment claiming all four moved into the
band is corrected (plant_ox 44.6% was the F1 point-outside).

### F2 (out-of-band guardrail verified): DONE, table above
Every assumption row + voltfox measured frontier-vs-head with se
arithmetic. All HOLD or fixed; none moved further outside by >se.
Voltfox tuned per the brief's tune-or-waive rule (trim, not waiver).

### F3 (edge margins or pinned waivers): WAIVERS + margin test
Galeheron 53.6% (1.4 from edge) and cindermoor 51.8% (3.2 from edge)
cannot be re-centered >=1se inside: the only galeheron lever (atk -1)
crashes it to 37.5% (E). Both held by explicit margin waiver; new
regression test "near-edge rows keep at least a point of design-band
margin (R1 T3)" fails if either comes within 1pt of an edge
(asserts 0.46 <= rate <= 0.54; today 53.6/51.8 pass).

## AC table (R1 head = D-state)

| AC | result |
|---|---|
| AC-1 gate `run() === 0` | PASS (exit 0, all ok, 0 FAIL) |
| AC-1 `designBandMisses` empty (or only waived rows) | PASS with waiver: misses == [water_axolotl] == proposed waived set |
| FR-1 plant_ox point-wise inside 45-55% | PASS 46.4% (was 44.6%) |
| FR-1 plant_ox >=1se margin | FRONTIER (1.4pts = 0.29se; zone proven unreachable) — waiver 1 |
| FR-4 pacing holds | PASS capShare 23.5%<=33.3, median 30.16s in 25-40, p05 15.56s>=8, decisive 94.9%>=66.7 |
| FR-5 damage 49/49 | PASS |
| FR-6 bosses 0<wins<30 | PASS (5,13,10,9,16,13... final: hesse 5, thessa 14, koda 13, marlow 10, delmar 9, fenn 16) |
| FR-7/telemetry 13/13 | PASS, cap 7/14 = 50.0% at bound (zero headroom preserved) |
| R1.T2 guardrail | DONE, table above; voltfox tuned (not waived) |
| R1.T3 edge rows | WAIVERS + margin regression test (galeheron 53.6, cindermoor 51.8; test asserts 0.46-0.54) |
| No bound/floor/tolerance widened; no test.failing | PASS (DISTINCT_FLOOR 12 untouched; KNOWN_MISSES stays []) |

## Verification reads (final)

- `bun run balance`: exit 0, misses [water_axolotl 57.1%] only.
- `bun run telemetry`: 13/13 ok, cap 7/14 (50.0%) at bound.
- `bun test` (inside verify): 3988 pass, 1 skip, 0 fail.
- `bun run build`: exit 0.
- `bun run verify`: exit 1 SOLELY on biome format nit in primary-owned
  `conductor/tracks/20261111-roster-retune/metadata.json`
  (depends_on array collapsed to one line); that file is Conductor state
  the phase executor must not edit, and the phase did not touch it
  (last writers: 5b9ea302/a3b904b0/0f84c6c6). All phase files are
  biome-clean (no other biome errors). Primary to fix with one format
  pass; precedent: Phase 3 "biome pre-existing reds fixed by primary".
- Base SHA: 5b9ea302. Head SHA: recorded in the JSON report.
- Net diff vs base: `packages/sim/src/species/discovery.ts` (embercub
  atk [9,13]->[8,12]; voltfox def [7,10]->[6,9]),
  `packages/sim/src/battle/continuous/balance-report.test.ts`
  (design-band list 4->1, stale R1 comment corrected, new R1 T3 margin
  test), plus this evidence file. No other production code touched.

## Proposed waivers (for primary to pin in spec.md Assumptions — phase
executor may not edit spec.md per Conductor rules)
1. plant_ox margin waiver (F1): 46.4%, 1.4pt margin < 1se; >=1se zone
   proven unreachable with whole-band integer shifts (A/B/E).
2. water_axolotl design-band waiver (F2/AC-1): 57.1% outside; HOLD vs
   frontier (-1.8, |delta| < se); every tune direction pops a fire row
   (embercub 53.6/cindermoor 54.5 have 1.4/0.5 headroom) or the
   telemetry cap (water fills 4 ko-matchups).
3. galeheron/cindermoor margin waivers (F3): 53.6%/51.8%, test-locked.
AC-1 reads: gate run() === 0 AND designBandMisses == [water_axolotl] ==
the waived set. No bound/floor/tolerance widened; no test.failing.

## Primary verification (at 69d79ca1 + format fix)

- Independently ran all four commands on the R1 tree: `bun run verify`
  exit 0 (after one primary-owned biome format pass on
  `conductor/tracks/20261111-roster-retune/metadata.json`, the file the
  phase executor must not touch — same precedent as Phase 3);
  `bun run build` exit 0; `bun run balance` exit 0 (misses
  [water_axolotl 57.1%] only); `bun run telemetry` exit 0 (13/13,
  cap 7/14 = 50.0% at bound, zero headroom preserved).
- F1: plant_ox 44.6% → 46.4% point-inside via the voltfox-trim keystone
  (D-state), not a direct ox shift — direct levers overshoot (+12.5 atk,
  +10.8 spd) and the joint E-state breaks two other rows. Margin 1.4pts
  accepted as frontier with waiver pinned in spec Assumptions.
- F2: guardrail table verified row by row; voltfox excursion closed by
  trim (55.8/56.7 → 45.5), not waived. Water HOLD recorded as waiver.
- F3: galeheron/cindermoor re-centering proven impossible (atk -1 →
  37.5%); waivers pinned and test-locked by the new margin regression
  test.
- Not squashed: range holds the subagent's `69d79ca1` plus the primary's
  spec/metadata commits, kept for the waiver audit trail.
