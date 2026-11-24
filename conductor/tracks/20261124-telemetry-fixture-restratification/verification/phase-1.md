# Phase 1 Evidence — Baseline and frozen derivation evidence

- **Track:** `20261124-telemetry-fixture-restratification` (Telemetry Fixture Re-stratification)
- **Phase:** 1 — Baseline and frozen derivation evidence
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-telemetry-fixture-restratification`
- **Phase base commit:** `d2a08ca09c9df2d9811fc714a93ccc69dfd051c7`
- **Track base:** `main` @ `d29042de1c9019189373beb763baa1805dd78541`
- **Head at baseline capture:** `d2a08ca09c9df2d9811fc714a93ccc69dfd051c7` (the evidence commit SHA is reported separately by the phase subagent)
- **Result:** blocked

## Summary

The unchanged-tree baseline was captured successfully for `bun run telemetry` and
`bun run balance`, and the tree was proven clean before and after that sweep.
All frozen before-column telemetry readings and the `370/1680 (22.0%)` matrix
gate were reproduced exactly, with every bound gate green.

Two required verification actions could not run: `bun run fixture-audit` and the
read-only derivation script `bun .conductor/derive-restrat-bounds.ts`. Both shell
invocations returned `Permission denied: shell` from the execution environment.
Per the phase rules they were not retried, rephrased, or worked around. As a
result the four-cell audit reading (`1680/580/370`, `+12.5 points`) and the
derive-after readings / two-violation confirmation are **not independently
reproduced in this phase**; the after-column values below are the frozen values
from the approved specification, reproduced for completeness and explicitly
labelled as spec-sourced rather than observed.

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| baseline | `bun run telemetry` | 0 | 42 seeded matchups; cap share `11/42 (26.2%)`; engagement `345/1102/3992`; idle `0.28795`; contact `0.05853`; dead zone `0.02617`; exchange `0.3117/0.3193`; distinct positions `31`; retreats `20749/19631`; duration `9080..45000 ms`; all 14/14 bounds `ok`. |
| baseline | `bun run balance` | 0 | 1680 matrix fights; cap share `370/1680 (22.0%)`; reference line cap `580/1680` diagnostic; all species, capShare, decisiveShare, capWinQuality, duration and damage-band gates green; boss gates all green. |
| baseline | `bun run fixture-audit` | blocked | Permission denied (`Permission denied: shell`). Expected `1680/580/370` and `+12.5 points` per spec; not observed. |
| derivation | `bun .conductor/derive-restrat-bounds.ts` | blocked | Permission denied (`Permission denied: shell`). Expected after-column readings and exactly two violations per spec; not observed. |
| static | `git status --porcelain` (pre and post sweep) | 0 | Empty output both times: clean tree, no tracked source/config/package/product change during the baseline sweep. |
| static | `git rev-parse HEAD` / `git branch --show-current` | 0 | `d2a08ca...` on `chore/20261124-telemetry-fixture-restratification`, matching the phase contract. |

## Frozen before/after bound table (from the approved spec)

The **Before** column below is independently confirmed by the telemetry sweep
above. The **After**, **Violations** and **Approved bound** columns are the
frozen values recorded in `spec.md` §Frozen bound derivation; they could not be
re-derived in this phase because the derivation command was permission-denied.
Same 42 stride-11 pairings, one seed each.

| Metric | Kind | Current bound | Before (observed) | After (spec-frozen) | Approved bound |
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

Expected violations under the representative composition (spec-frozen, not
reproduced): exactly two — `engagementMax` 6061 > 4500 and `distinctPositions`
19 < 20; the other twelve bounds pass. Approved target values:
`engagementMax = 8000`, `distinctPositions = 16`; all other values, including
`capShare = 0.6`, stay frozen.

## Acceptance-criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Phase 1 evidence shows telemetry `11/42 (26.2%)`, the frozen before-column readings, and the unchanged matrix gate readings | `.conductor/evidence/.../baseline/telemetry.txt` and `balance.txt` | partial — telemetry and matrix readings reproduced; the four-cell fixture-audit reading is blocked by shell permission |

## Evidence paths

- `conductor/tracks/20261124-telemetry-fixture-restratification/verification/phase-1.md` (this report, committed)
- `.conductor/evidence/20261124-telemetry-fixture-restratification/baseline/telemetry.txt` (gitignored scratch)
- `.conductor/evidence/20261124-telemetry-fixture-restratification/baseline/balance.txt` (gitignored scratch)
- `.conductor/evidence/20261124-telemetry-fixture-restratification/baseline/git-status.txt` (gitignored scratch)

## Blockers

1. `bun run fixture-audit` — denied with `Permission denied: shell`. Needed to
   record the unchanged-tree four-cell audit reading (`1680/580/370`,
   `+12.5 points`) required by P1.T1.2 / AC-1. Expected: exit 0 with those
   figures. Not retried or worked around.
2. `bun .conductor/derive-restrat-bounds.ts` — denied with
   `Permission denied: shell`. Needed to reproduce the frozen after-column
   readings and the exactly-two-violation confirmation required by P1.T2.
   Expected: exit 0 with 14 rows, `violations_after = 2`, all other bounds
   passing. Not retried or worked around.

## Deviations

None. No file outside the phase `Touches` set was changed; the only committed
file is this evidence report.

## Notes

- This phase is evidence-only: no source, config, package, product-doc, or
  Conductor state file was edited.
- The phase base, HEAD and branch all match the contract, and `git status
  --porcelain` was empty both before and after the baseline sweep.
- The primary agent should arrange for the two denied commands to be executed
  (or the shell allowlist extended) so the after-column and audit readings can
  be independently reproduced and AC-1 fully satisfied; this phase is reported
  `blocked` until then.
