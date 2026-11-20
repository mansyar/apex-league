# Owner Decision — Telemetry Fixture Debt Reconciliation

- Track: 20261120-telemetry-fixture-debt
- Phase: 1 — Baseline evidence and debt disposition
- Date: 2026-11-20
- Branch: chore/20261120-telemetry-fixture-debt
- Tree state at baseline capture: unchanged at e4695d058c1263d3a61f1f83890c4698728e0728
- Head after evidence commits: 67b7c74b55326234401e7cce64e56835c3347878 (source still unchanged)

This record captures the owner's resolved disposition for D-3, D-4, and the stale
audit arithmetic. It is written before any file repair, as required by Phase 1.
It is a decision record, not a code change.

## D-3 — "fixture missed the one-in-three cap target" — RESOLVED (met by D-2 side effect)

Decision: close D-3 as met. No fixture, bound, or controller change is made for it.

Rationale:
- The owner-approved D-2 change (Kite Band Reachability, commit d5baa0ab) introduced
  the 45 s fight cap. The live telemetry fixture now reads `cap share: 11/42 (26.2%)`.
- 26.2% is below the old 21/42 (50.0%) smoke ceiling and below the historical
  20/42 (47.6%) reading that D-3 described, so the one-in-three target is satisfied
  as a side effect of D-2 rather than by any new fixture edit.
- `bun run telemetry` reports all 14 bounds `ok`, including
  `ok capShare: observed 26.2%, bound <= 60.0%` and
  `ok durationMax: observed 45.00s, bound <= 45.00s`.
- Evidence: `.conductor/evidence/20261120-telemetry-fixture-debt/telemetry.txt`.

## D-4 — "fixture is not population-representative" — CLOSED as diagnosed and bounded

Decision: close D-4 as diagnosed and bounded. This track does NOT fix D-4.

Rationale:
- D-4 is a sampling/composition limitation of the 42-pairing telemetry fixture, not a
  regression introduced by D-2. It is not repairable without changing fixture
  composition or species/bounds, which this track explicitly forbids (NFR-1).
- The condition is now bounded and visible: the `fixture-audit` decomposes the fixture
  into four cells (reference/midpoint x split/press) and attributes the gap, and the
  telemetry script prints a stability re-pool at 14, 30 and 42 fights. Both make the
  limitation measurable without gating on it.
- Live `bun run fixture-audit` / `--json` (primary re-run, exit 0) confirm the
  four-cell decomposition: cell A reference/split 11/42 (26.2%), B reference/press
  8/42 (19.0%), C midpoint/split 7/42 (16.7%), D midpoint/press 5/42 (11.9%), with
  attribution gap +14.3, doctrine +7.1, stat +7.1, interaction +2.4 points. The
  diagnosis is therefore grounded in live audit output as well as unchanged source.
  Evidence: `fixture-audit.txt` and `fixture-audit-json.txt`.
- `fixture-audit` remains diagnostic and never gated (NFR-2): its `run()` returns 0
  unconditionally.

## Stale audit arithmetic — RESOLVED (to be repaired in Phase 2)

Decision: the 840-fight arithmetic printed by `fixture-audit` is stale and must be
repaired to the live 1,680-fight matrix this track's Phase 2 owns.

Rationale:
- `packages/sim/scripts/fixture-audit.ts` still records
  `RECORDED = { fights: 840, referencePress: 377, midpointPress: 224 }`, whose formula
  `(377 - 224) / 840 * 100` yields `+18.2 points`, and still prints
  `same-doctrine check at 840 fights ... reference 377/840 44.9% -> midpoint 224/840 26.7% = +18.2 points`.
  Doc comments still assert in the present tense that cell A is `20/42`.
- The live matrix is `bun run balance`: 1,680 fights, `reference line cap share: 580/1680 (34.5%)`,
  and `cap share: 370/1680 (22.0%)`. The correct live stat effect is
  `(580 - 370) / 1680 * 100 = +12.5 points`.
- Cell A is `11/42 (26.2%)`, confirmed by live telemetry and by live
  `bun run fixture-audit` (11 caps of 42, `capShare` 0.2619047619047619) — not `20/42`.
- The live audit still prints the stale `same-doctrine check at 840 fights ...
  reference 377/840 44.9% -> midpoint 224/840 26.7% = +18.2 points` line and JSON
  `recordedStatPoints` 18.21428571428571, confirming the defect is truth, not
  arithmetic drift. `fixture-audit.txt` / `fixture-audit-json.txt` hold the captures.
- Phase 2 target: `fixture-audit` prints `1680`, `580`, `370`, `+12.5 points` and
  `11/42`, with no current-tense `840/377/224` or `20/42`. The sim hash remains
  `0xff6f3d62` and balance keeps 34/34 gates green.
- Phase 1 makes no source change for this; the values above are the repair
  specification, not an accomplished repair.

## Decision summary

| Item | Disposition | Code action in Phase 1 |
| --- | --- | --- |
| D-3 | Met by D-2 side effect; close | none |
| D-4 | Diagnosed and bounded; close, not fixed | none |
| Stale audit arithmetic | Repair in Phase 2 to live 1,680-fight matrix | none (specification only) |
