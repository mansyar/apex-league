# Phase 1 Evidence — Baseline and reproduced derivation evidence

- **Track:** `20261124-telemetry-fixture-restratification` (Telemetry Fixture Re-stratification)
- **Phase:** 1 — Baseline and frozen derivation evidence
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-telemetry-fixture-restratification`
- **Phase base commit:** `d2a08ca09c9df2d9811fc714a93ccc69dfd051c7`
- **Track base:** `main` @ `d29042de1c9019189373beb763baa1805dd78541`
- **Head at baseline capture:** `d2a08ca09c9df2d9811fc714a93ccc69dfd051c7` (the evidence commit SHAs are reported separately by the phase subagent)
- **Result:** verified

## Summary

The unchanged-tree baseline was captured successfully for `bun run telemetry` and
`bun run balance`, and the tree was proven clean before and after that sweep.
All frozen before-column telemetry readings and the `370/1680 (22.0%)` matrix
gate were reproduced exactly, with every bound gate green.

The two commands that the phase subagent's shell refused were run by the primary
on the same clean phase-base tree `d2a08ca0`, separately and with no pipes or
`&&`; both exited `0`. Their outputs are treated as primary-run results here:
`bun run fixture-audit` recorded the four-cell audit and the `+12.5 points`
same-doctrine attribution, and `bun .conductor/derive-restrat-bounds.ts`
reproduced all fourteen after-column readings with exactly two violations
(`engagementMax` and `distinctPositions`). The after-column below is therefore
first-class reproduced evidence, not a restatement of the approved spec. AC-1 is
satisfied with no outstanding blockers. The original shell denials are retained
as a historical note.

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| baseline | `bun run telemetry` | 0 | 42 seeded matchups; cap share `11/42 (26.2%)`; engagement `345/1102/3992`; idle `0.28795`; contact `0.05853`; dead zone `0.02617`; exchange `0.3117/0.3193`; distinct positions `31`; retreats `20749/19631`; duration `9080..45000 ms`; all 14/14 bounds `ok`. |
| baseline | `bun run balance` | 0 | 1680 matrix fights; cap share `370/1680 (22.0%)`; reference line cap `580/1680` diagnostic; all species, capShare, decisiveShare, capWinQuality, duration and damage-band gates green; boss gates all green. |
| baseline | `bun run fixture-audit` (primary-run) | 0 | Four-cell A/B/C/D table on 42 pairings; cell A (reference + split) `11/42 (26.2%)`, cell D (midpoint + press) `5/42 (11.9%)`; same-doctrine check at 1680 fights: reference `580/1680 (34.5%)` -> midpoint `370/1680 (22.0%)` = `+12.5 points`. |
| derivation | `bun .conductor/derive-restrat-bounds.ts` (primary-run) | 0 | 14 metric rows; `violations_before: 0`, `violations_after: 2`; `engagementMax` 3992 -> 6061 fails and `distinctPositions` 31 -> 19 fails; the other twelve bounds pass. |
| static | `git status --porcelain` (pre and post sweep) | 0 | Empty output both times: clean tree, no tracked source/config/package/product change during the baseline sweep. |
| static | `git rev-parse HEAD` / `git branch --show-current` | 0 | `d2a08ca...` on `chore/20261124-telemetry-fixture-restratification`, matching the phase contract. |

## Fixture audit reading (primary-run)

`Fixture audit — 42 pairings x 4 cells (FR-8; diagnostic, never gated)`. Stat
basis: `reference` = both sides at REFERENCE clamped into bounds, `midpoint` =
each species' roll midpoint. Doctrine: `split` = seed parity (press vs
specials), `press` = balanced on both sides.

| Cell | Stat basis | Doctrine | Fights | Caps | Cap share | Median | KO |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | reference | split | 42 | 11 | 26.2% | 38.01s | 31 |
| B | reference | press | 42 | 8 | 19.0% | 35.12s | 34 |
| C | midpoint | split | 42 | 7 | 16.7% | 29.88s | 35 |
| D | midpoint | press | 42 | 5 | 11.9% | 31.26s | 37 |

Attribution — points of cap share, same 42 pairings:

- gap A - D (fixture - matrix cell): `+14.3` (`26.2% - 11.9%`)
- doctrine A - B (split -> press, ref): `+7.1`
- stat basis B - D (ref -> midpoint, press): `+7.1`
- interaction (A - B) - (C - D): `+2.4`
- order check: stat A - C `+9.5`, doctrine C - D `+4.8`

Same-doctrine check at 1680 fights (press on both sides, `bun run balance`):
reference `580/1680 (34.5%)` -> midpoint `370/1680 (22.0%)` = `+12.5 points`.

## Frozen before/after bound table (before observed; after reproduced)

The **Before** column is confirmed by the subagent's telemetry sweep and the
**After** column is reproduced by the primary-run derivation
(`violations_before: 0`, `violations_after: 2`). Same 42 stride-11 pairings,
one seed each.

| Metric | Kind | Current bound | Before (observed) | After (reproduced) | Approved bound |
| --- | --- | --- | --- | --- | --- |
| engagementMin | max | 900 | 345 | 340 | 900 (unchanged) |
| engagementMedian | max | 1500 | 1102 | 946 | 1500 (unchanged) |
| engagementMax | max | 4500 | 3992 | 6061 | **8000** |
| exchangeHome | max | 2.5 | 0.3117/s | 0.3488/s | 2.5 (unchanged) |
| exchangeAway | max | 2.5 | 0.3193/s | 0.3440/s | 2.5 (unchanged) |
| idleShare | max | 0.5 | 0.2880 | 0.3030 | 0.5 (unchanged) |
| distinctPositions | min | 20 | 31 | 19 | **16** |
| contactShare | max | 0.7 | 0.0585 | 0.1035 | 0.7 (unchanged) |
| retreatHome | min | 42 | 20749 | 14872 | 42 (unchanged) |
| retreatAway | min | 42 | 19631 | 15001 | 42 (unchanged) |
| deadZoneShare | max | 0.5 | 0.0262 | 0.0513 | 0.5 (unchanged) |
| capShare | max | 0.6 | 11/42 (26.2%) | 5/42 (11.9%) | 0.6 (unchanged, D-1) |
| durationMin | min | 8000 ms | 9080 ms | 12500 ms | 8000 (unchanged) |
| durationMax | max | 45000 ms | 45000 ms | 45000 ms | 45000 (unchanged) |

Reproduced violations: exactly two — `engagementMax` 6061 > 4500 and
`distinctPositions` 19 < 20; the other twelve bounds pass. Approved target
values: `engagementMax = 8000`, `distinctPositions = 16`; all other values,
including `capShare = 0.6`, stay frozen.

Full-precision raw readings from the reproduction (basis for the rounded table
above):

- before: cap `11/42 (0.2619047619047619)`, duration `9080..45000`, idle
  `0.2879534320471184`, engagement `345/1102/3992`, contact
  `0.058526449055980624`, deadZone `24 (0.026172300981461286)`.
- after: cap `5/42 (0.11904761904761904)`, duration `12500..45000`, idle
  `0.3029989825745708`, engagement `340/946/6061`, contact
  `0.10347055118618885`, deadZone `44 (0.05128205128205128)`.

## Acceptance-criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Phase 1 evidence shows telemetry `11/42 (26.2%)`, the frozen before-column readings, and the unchanged matrix gate readings | `.conductor/evidence/.../baseline/telemetry.txt`, `balance.txt`, the fixture-audit section and the reproduced before/after table above | satisfied — telemetry before-column, four-cell audit (`1680/580/370`, `+12.5 points`) and unchanged matrix gate readings all reproduced; the derivation confirms the after-column and exactly two violations |

## Evidence paths

- `conductor/tracks/20261124-telemetry-fixture-restratification/verification/phase-1.md` (this report, committed)
- `.conductor/runs/20261124-telemetry-fixture-restratification/phase-1-primary-outputs.md` (primary-run outputs for the two commands; verbatim source for the audit and after-column readings)
- `.conductor/evidence/20261124-telemetry-fixture-restratification/baseline/telemetry.txt` (gitignored scratch)
- `.conductor/evidence/20261124-telemetry-fixture-restratification/baseline/balance.txt` (gitignored scratch)
- `.conductor/evidence/20261124-telemetry-fixture-restratification/baseline/git-status.txt` (gitignored scratch)

## Deviations

None. No file outside the phase `Touches` set was changed; the only committed
files are this evidence report and its earlier revision.

## Notes

- This phase is evidence-only: no source, config, package, product-doc, or
  Conductor state file was edited.
- The phase base, HEAD and branch all match the contract, and `git status
  --porcelain` was empty both before and after the baseline sweep.
- Historical denial record (resolved): the phase subagent's shell initially
  refused `bun run fixture-audit` and `bun .conductor/derive-restrat-bounds.ts`
  with `Permission denied: shell`; per the phase rules they were not retried,
  rephrased, or worked around. The primary then ran both separately on the same
  clean base tree with exit `0`, and those outputs are recorded above as
  primary-run results. No blocker remains.

## Primary verification

- `git status --porcelain` — exit 0, empty after both phase commits.
- `git diff --name-only d2a08ca0..HEAD` — exit 0, only this evidence file; matches `Touches`.
- `bun run telemetry` — exit 0; `11/42 (26.2%)` cap share, engagement `345/1102/3992`, idle `28.8%`, contact `5.9%`, positions min `31`, dead zone `2.6%`, duration `9.08s .. 45.00s`; all 14 bounds `ok`.
- `bun run balance` — exit 0; `370/1680 (22.0%)` cap share, 21 species and all pacing/gate/boss assertions `ok`.
- `bun run fixture-audit` — exit 0; cells A `11/42 (26.2%)` through D `5/42 (11.9%)`, attribution `+14.3 / +7.1 / +7.1 / +2.4`, same-doctrine `580/1680 (34.5%) -> 370/1680 (22.0%) = +12.5 points`.
- `bun .conductor/derive-restrat-bounds.ts` — exit 0; 14 rows, `violations_before: 0`, `violations_after: 2` (`engagementMax` 3992 -> 6061, `distinctPositions` 31 -> 19), the other twelve pass.

Outcome: AC-1 is satisfied on first-class primary and subagent evidence. No source, config, package, product doc, or Conductor state file was changed in this phase.
