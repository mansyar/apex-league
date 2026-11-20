# Telemetry Fixture Debt Reconciliation — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This chore closes the recorded D-3 and D-4 telemetry-fixture debt without changing the game, the telemetry gate, or the 42-pairing smoke fixture. D-3 ("the fixture missed the one-in-three cap target") is now met as a side effect of the owner-approved D-2 45 s fight cap: `bun run telemetry` reads `11/42 (26.2%)`, below the old 21/42 smoke ceiling, while `bun run balance` keeps all 34 gates green. D-4 (the fixture is not a representative sample of the matrix fight population) was decomposed in earlier tracks but is not fixed by this track; the owner has chosen to close it as diagnosed and bounded. The remaining defect is truth: `bun run fixture-audit` still prints the old 840-fight arithmetic, and product documentation still speaks as if both debts were open.

## Problem / Motivation

The telemetry fixture is a deliberately biased diagnostic: one seed per 42 strided pairings, `REFERENCE` stat basis, and split press/specials doctrine. Earlier tracks measured why it reads differently from the 1,680-fight matrix: stat basis, doctrine mix, and pairing/seed selection. Since D-2 shipped, the fixture has also drifted to `11/42`, so the old "20/42" audit comments and the hardcoded `RECORDED = { fights: 840, referencePress: 377, midpointPress: 224 }` no longer describe the tree. A reader of `bun run fixture-audit` sees `+18.2 points` where the live matrix comparison is `580/1680 -> 370/1680 = +12.5 points`. Leaving this stale reconciles nothing: it hides D-3's resolution, leaves D-4 ambiguous, and makes a diagnostic contradict the gate it explains.

## Goals & Success Metrics

- **Goal:** Make the code, evidence, and product documentation state exactly which telemetry debt is met, which is diagnosed/bounded, and what the current matrix arithmetic is.
- **Metric:** `bun run telemetry` reads `11/42 (26.2%)`; `bun run balance` keeps 34/34 gates at `370/1680 (22.0%)`; `bun run fixture-audit` prints `1680`, `580`, `370`, and `+12.5 points` with no current-tense claim of `840/377/224` or `20/42`; all configured checks stay green with sim hash `0xff6f3d62`.

## Scope

### In Scope

- Record an evidence-only baseline of telemetry, balance, fixture-audit, and trace output from the unchanged tree.
- Apply the owner's recorded decisions: D-3 met by the D-2 side effect; D-4 closed as diagnosed and bounded with the fixture unchanged; stale audit arithmetic repaired.
- Update `packages/sim/scripts/fixture-audit.ts` so `RECORDED` and its comments use `1680/580/370` and the derived `+12.5 points`, and add a failing-first regression test that pins the repaired report.
- Add dated product/tech-stack notes recording D-3/D-4 disposition and the audit repair, without changing product direction.
- Write `verification/integrated.md`, phase evidence, and a scope proof that no gate, fence, fixture, controller, species, or replay contract changed.

### Out of Scope

- Re-stratifying the 42-pairing fixture, changing `SEEDS_PER_PAIRING`, the stride-11 walk, `REFERENCE`, `BOUNDS`, `tacticsFor`, or any telemetry bound.
- Changing `CAP_MAX`, `DISTINCT_FLOOR`, `DECISIVE_SHARE_MIN`, `CAP_MARGIN_FLOOR_BP`, fight duration, species bounds, boss pins, controller policy, `SIM_VERSION`, ghost pins, or determinism hashes.
- Any save-schema, protocol, API, CORS, deploy, dependency, manifest, client, or server change.
- Editing archived ADRs; they remain historical. Dated supersession belongs in current product/tech-stack documentation.
- Claiming D-4 is fixed; it is diagnosed, measured, and explicitly bounded.
- Introducing a CI step, gate, or pass/fail threshold for the fixture audit.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Evidence records the unchanged-tree baseline: telemetry `11/42`, balance `370/1680` with 34 green gates, audit cell A `11/42`, and the stale `840/377/224` report. | must |
| FR-2 | Current documentation records D-3 as met on 2026-11-20 by the approved D-2 cap side effect, not by a new pacing change in this track. | must |
| FR-3 | Current documentation records D-4 as diagnosed and bounded, with the telemetry fixture deliberately unchanged and gate redesign deferred. | must |
| FR-4 | `fixture-audit.ts` uses the current matrix figures `1680/580/370`, derives `+12.5 points`, and updates its current-tense comments to the 42-fight/gate reading `11/42`. | must |
| FR-5 | A pure regression test fails before the audit repair and passes after: it pins the new report line and rejects the stale `840`, `377`, `224`, and `+18.2 points` values as current claims. | must |
| FR-6 | Product and tech-stack documentation carry a dated 2026-11-20 reconciliation note that references this track and leaves historical narrative intact. | must |
| FR-7 | Integrated evidence records exact commands, counts, hashes, module-cap result, scope proof, and the D-3/D-4 disposition. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No change to telemetry fixture code, telemetry bounds, balance fences, controller policy, species stats, `SIM_VERSION`, or ghost pins. |
| NFR-2 | The fixture audit remains a diagnostic: no gate, bound, target, CI step, or new pass/fail criterion is added. |
| NFR-3 | No new dependency, manifest, save-schema, protocol, API, CORS, deploy, client, or server change. |
| NFR-4 | Google TypeScript style: `const`/`let`, named exports, double quotes, `===`, no `any`/`var`; no module-cap allowlist; no module exceeds 12,288 B client/sim or 24,576 B voxel. |
| NFR-5 | No real player data, credentials, or passphrases are introduced. |
| NFR-6 | All configured checks pass on the final tree: `verify`, `build`, `balance`, `gate:determinism`, `test:fuzz`; hash remains `0xff6f3d62`; focused `fixture-audit` and `telemetry` commands pass. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Phase 1 evidence shows telemetry `11/42 (26.2%)`, balance `370/1680 (22.0%)` with 34/34 gates, audit cell A `11/42`, and the stale audit line from the unchanged tree. | FR-1 |
| AC-2 | `conductor/product.md` records D-3 as met by the D-2 side effect on 2026-11-20 and makes no new pacing claim. | FR-2, FR-6 |
| AC-3 | `conductor/product.md` records D-4 as diagnosed/bounded, with re-stratification explicitly deferred and the fixture unchanged. | FR-3, FR-6 |
| AC-4 | `bun run fixture-audit` prints `1680`, `580`, `370`, and `+12.5 points`; current-tense comments no longer claim `840/377/224` or `20/42`; source comments preserve the historical 2026-11-12 figures only where labelled historical. | FR-4 |
| AC-5 | The new regression test is proven failing before the repair and passing after, and pins the repaired report without adding a gate. | FR-5, NFR-2 |
| AC-6 | `git diff <base>..HEAD -- packages/sim/scripts/battle-telemetry.ts packages/sim/src/battle/continuous/telemetry.test.ts packages/sim/src/battle/continuous/controller-*.ts packages/sim/src/cup/ghost.ts` is empty; no SIM_VERSION/ghost/fence file changed. | NFR-1 |
| AC-7 | `conductor/tech-stack.md` has a dated note covering the D-3/D-4 disposition, audit repair, and unchanged gate contracts. | FR-6 |
| AC-8 | All configured checks pass on the final tree with sim hash `0xff6f3d62`; `bun run telemetry` remains green at `11/42`; `bun run fixture-audit` and its focused test pass. | NFR-6, FR-4, FR-5 |
| AC-9 | `verification/integrated.md` is committed with commands, counts, screenshot requirement marked N/A, scope proof, and D-3/D-4 disposition. | FR-7 |

## Edge Cases

- The audit is never gated: a future fixture drift can fail the new pin without failing CI, by design.
- Historical prose in `product.md` that says "20/42" describes the 2026-11-12 measurement; the reconciliation note must not silently rewrite history.
- `RECORDED` is a diagnostic comparison, not a target; updating it must not imply a new balance gate.
- Cell A is asserted against `measure()` rather than a literal, so telemetry and audit cannot disagree about the current fixture.
- If a configured check regresses, stop and report; do not widen a bound or re-pin a game gate to make it green.
- If the owner later wants a representative fixture, that is a separate product-decision track with re-derived bounds.

## Dependencies

- **Tracks:** `20261112-capshare-pacing`, `20261112-gate-cost-and-fixture-audit`, `20261117-global-pacing`, `20261120-kite-band-reachability` (all merged; imported as evidence).
- **External:** none.

## Open Questions & Assumptions

- **Resolved:** D-3 disposition — met by the approved D-2 45 s cap side effect; no new pacing change.
- **Resolved:** D-4 disposition — close as diagnosed and bounded; do not re-stratify the fixture.
- **Resolved:** stale audit arithmetic — repair to the live 1,680-fight matrix population.
- **Assumption:** The 42-fight telemetry fixture remains a smoke diagnostic even though it is not population-representative; this is now explicit, not a hidden target.
- **Assumption:** Archived ADRs remain historical; dated current docs reference the closure.

## References

- `conductor/product.md` (D-3/D-4 history and Phase 4 roadmap)
- `conductor/archive/20261112-capshare-pacing/verification/*`
- `conductor/archive/20261112-gate-cost-and-fixture-audit/verification/*`
- `conductor/archive/20261117-global-pacing/verification/*`
- `conductor/archive/20261120-kite-band-reachability/verification/*`
- `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/scripts/battle-balance-report.ts`, `packages/sim/scripts/fixture-audit.ts`
