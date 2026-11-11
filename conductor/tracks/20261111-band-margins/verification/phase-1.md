# Phase 1 — Re-measure: Evidence

- Track: 20261111-band-margins — Band Margins
- Phase: 1 — Re-measure
- Date: 2026-11-11
- Branch: chore/20261111-band-margins
- Base commit: ca2e94af1369c0b5399752d4f72718a654b0ff34
- Head commit: ca2e94af1369c0b5399752d4f72718a654b0ff34 (read-only phase, no code change)
- Result: verified (GREEN — track closes with evidence only, no Phase 2)

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| balance | `bun run balance` | 0 | All 15 species ok, all pacing/boss/damage targets ok, zero FAIL lines |
| telemetry | `bun run telemetry` | 0 | 13/13 ok, capShare 7/14 = 50.0% exactly at bound |

## Per-row results (standard doctrine, mirrors excluded, 112 games per species)

| Species | Win rate | Distinct | SE | Bound verdict |
| --- | --- | --- | --- | --- |
| fire_drake | 50.9% (57/112) | 108 | 4.8% | ok \|rate − 50%\| ≤ 9.4% |
| plant_ox | 46.4% (52/112) | 103 | 4.9% | ok \|rate − 50%\| ≤ 9.7% |
| water_axolotl | 57.1% (64/112) | 110 | 4.8% | ok \|rate − 50%\| ≤ 9.3% (design-band 45–55% miss, pre-existing waiver, unchanged) |
| electric_hound | 47.8% (53/112) | 107 | 4.8% | ok \|rate − 50%\| ≤ 9.5% |
| fernstag | 47.8% (53/112) | 108 | 4.8% | ok \|rate − 50%\| ≤ 9.4% |
| wind_falcon | 52.7% (59/112) | 110 | 4.8% | ok \|rate − 50%\| ≤ 9.3% |
| reefclaw | 48.2% (54/112) | 109 | 4.8% | ok \|rate − 50%\| ≤ 9.4% |
| earth_tortoise | 50.9% (57/112) | 106 | 4.9% | ok \|rate − 50%\| ≤ 9.5% |
| cindermoor | 51.8% (58/112) | 110 | 4.8% | ok \|rate − 50%\| ≤ 9.3% |
| voltfox | 45.5% (51/112) | 105 | 4.9% | ok \|rate − 50%\| ≤ 9.6% |
| galeheron | 53.6% (60/112) | 109 | 4.8% | ok \|rate − 50%\| ≤ 9.4% |
| shalemole | 47.3% (53/112) | 102 | 5.0% | ok \|rate − 50%\| ≤ 9.7% |
| embercub | 53.6% (60/112) | 108 | 4.8% | ok \|rate − 50%\| ≤ 9.4% |
| mossboar | 49.1% (55/112) | 106 | 4.9% | ok \|rate − 50%\| ≤ 9.5% |
| mistkit | 47.3% (53/112) | 108 | 4.8% | ok \|rate − 50%\| ≤ 9.4% |

DISTINCT_FLOOR check: every row's distinct count (102–110) is far above the floor of 12; no row's distinct-derived error collapses.

## Pacing figures (shipped bounds)

| Target | Observed | Bound | Verdict |
| --- | --- | --- | --- |
| capShare | 23.5% (197/840) | ≤ 33.3% | ok |
| medianDuration | 30.16s | inside 25.00s..40.00s | ok |
| durationP05 | 15.56s (min 6.66s, diagnostic) | ≥ 8.00s | ok |
| durationMax | 40.00s | ≤ 40.00s | ok |
| decisiveShare | 94.9% (797/840; 642 ko + 155 cap wins ≥ 5.00 pts) | ≥ 66.7% | ok |
| capWinQuality | 78.7% (155/197 cap wins clear 5.00 pts) | ≥ 66.7% | ok |
| damageBand | 49/49 moves inside 4–12% of the 189 pool | 49/49 inside | ok |
| bosses | koda 46.7%, hesse 16.7%, marlow 30.0%, delmar 20.0%, fenn 53.3%, thessa 36.7% (all 0 < wins < 30) | beatable and non-trivial | ok |

## Telemetry result (14 seeded matchups)

13/13 checks ok. capShare 7/14 = 50.0% exactly at the ≤ 50.0% bound — zero headroom, as at baseline; recorded, still green. All other telemetry figures well inside bounds (engagement min 380 mm ≤ 900 mm, median 1076 mm ≤ 1500 mm, max 3992 mm ≤ 4500 mm; exchange 0.32/0.27/s ≤ 2.50/s; idle 25.9% ≤ 50.0%; distinct positions 94 ≥ 20; contact 8.5% ≤ 70.0%; duration 26.76s..40.00s within 8.00s..40.00s).

## Verdict

GREEN. The gate exits 0 on the current tree: no red rows, so the named-red list for Phase 2 is empty and Phase 2 does not execute. Thin margins from the track context are unchanged, not worsened: plant_ox 46.4% (1.4 pts inside the band), voltfox 45.5% (0.5 pts inside), water_axolotl 57.1% (the pre-existing waived row, statistical bound ok). The roadmap forbids pre-emptive hardening, so these stay as-measured.

## Deviations

None. No file outside Touches was read for modification; `packages/sim/src/battle/continuous/balance-report.test.ts` was not touched (no output-format drift — both commands ran clean against current expectations). No code or test change of any kind.

## Notes

Read-only phase by design: ran the two gate commands, recorded figures, no fixes applied. No FAIL lines in either output. Evidence file committed on the track branch.

## Primary verification

- Independent `bun run balance` exit 0: 15/15 species ok, capShare 23.5%, median 30.16s, decisive 94.9%, damage 49/49. Matches the evidence tables row for row.
- Independent `bun run telemetry` exit 0: 13/13 ok, capShare 7/14 = 50.0% at bound.
- Range `ca2e94af..HEAD` holds exactly the one reported evidence commit; working tree clean.
- AC-1 satisfied: gate state on file, green, Phase 2 does not execute. Thin margins unchanged (ox 46.4%, voltfox 45.5%, water 57.1% waived) — recorded, not hardened, per the roadmap rule.
- Squashed to the track-level message below; no code or test changed at any point.
