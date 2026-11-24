# Telemetry Fixture Re-stratification — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This chore closes D-4 by making the telemetry gate's 42-fight sample represent the population the balance matrix measures, and by re-deriving only the bounds that the new composition breaks. Today the gate samples reference stats with split doctrine over a stride-11 walk; the matrix samples each species' typical (midpoint) stats under the press doctrine over four seeds per ordered pairing. The four-cell audit measured that gap and the prior track (`20261120-telemetry-fixture-debt`) recorded D-4 as diagnosed and bounded, explicitly deferring re-stratification to a product-decision track with its own before/after. This is that track: `bun run telemetry` becomes the representative gate at the same 42-fight budget, the historical sample survives as a named ungated smoke diagnostic, two bounds move with a recorded derivation, and every other gate, fence, sim constant, and historical figure stays intact.

## Problem / Motivation

The telemetry gate reads its own composition rather than the roster's. One seed per strided pairing, reference stats, and split doctrine made the fixture's cap share read `11/42 (26.2%)` against the matrix's `370/1680 (22.0%)`, and the earlier four-cell audit attributed a 35.7-point cell gap to stat basis (28.6) and doctrine mix (7.1) with an interaction term. The prior track repaired the audit arithmetic but deliberately left the fixture unchanged, so the required check still gates a known-biased diagnostic. Leaving D-4 there means every future balance conclusion is qualified by an unmeasured sampling bias, and the next reader cannot tell which numbers describe the gate and which describe history. Re-stratifying is a gate redesign, not a fix to smuggle into a balance track: it needs an explicit before/after and an owner-frozen bound table.

## Goals & Success Metrics

- **Goal:** Make the telemetry gate sample the matrix population at the same 42-fight CI cost, with a frozen, evidence-backed bound table and the old diagnostic preserved under an honest name.
- **Metric:** `bun run telemetry` uses midpoint stats and press doctrine over the same 42 distinct stride-11 pairings and one seed each; its readings match the derived after-values below; `bun packages/sim/scripts/battle-telemetry.ts --smoke` still reads the historical reference/split sample; `bun run balance`, `bun run verify`, `bun run build`, `bun run gate:determinism`, and `bun run test:fuzz` stay green with sim hash `0xff6f3d62`.

### Frozen bound derivation (before → after, same 42 pairings)

Derived read-only from the current tree on 2026-11-24 with a scratch script calling `measure()` and `pool(matchups().map((m) => measureFight(m, { statBasis: "midpoint", doctrine: "press" })))`. Before = reference + split; after = midpoint + press.

| Metric | Kind | Current bound | Before | After | Approved bound |
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

Exactly two bounds move: `engagementMax` 4500 → 8000 (ceiling raised with ~32% headroom over the representative reading, still catching gross disengagement) and `distinctPositions` 20 → 16 (floor lowered three cells below the representative minimum, preserving the "many positions" intent). Both keep their original direction. All other twelve values, including the `capShare` ceiling, are frozen; the one-in-three D-1 fence stays on the 840-fight matrix, not in the telemetry gate.

## Scope

### In Scope

- Evidence-only baseline of `bun run telemetry`, `bun run balance`, `bun run fixture-audit`, and the bound readings from the unchanged tree.
- A representative sample mode in `packages/sim/scripts/battle-telemetry.ts`: same 42 distinct stride-11 pairings and one contiguous seed each, `statBasis: "midpoint"`, `doctrine: "press"`; `measure()` and `bun run telemetry` use it.
- A separate named smoke diagnostic (`bun packages/sim/scripts/battle-telemetry.ts --smoke`) that keeps the reference + split composition, its historical readings, and no gate enforcement.
- The two approved bound value changes with `why` strings citing the before/after table; no other bound value changes.
- Failing-first regression tests pinning the representative composition, the two bound values, and the unchanged smoke composition.
- Updating `packages/sim/scripts/fixture-audit.ts` so the four-cell explanation names both samples and current matrix arithmetic, with historical figures explicitly labelled.
- Dated product and tech-stack notes recording D-4 closure, the frozen bound table, the preserved smoke diagnostic, and the unchanged D-1 fence.
- `verification/integrated.md`, phase evidence, and a scope proof of unchanged sim constants, controller policy, species stats, balance fences, and matrix gates.

### Out of Scope

- Changing `SIM_VERSION`, ghost pins, species authored stats or stat bounds, controller policy, `FIGHT_CAP_MS`, `CAP_MAX`, `DISTINCT_FLOOR`, `DECISIVE_SHARE_MIN`, `CAP_MARGIN_FLOOR_BP`, boss bounds, or the resolver.
- Changing the 840/1680 balance matrix, its seeds, its bounds, or the D-1 one-in-three cap-share fence; tightening the telemetry `capShare` ceiling to 1/3.
- Changing sample size (42 fights), `SEEDS_PER_PAIRING`, the stride-11 pairing walk, or its mirror-slot exchange.
- Deleting or rewriting historical audit/prose figures; supersession must be dated, not silent.
- Adding a gate, CI step, or pass/fail criterion to the smoke diagnostic or the fixture audit.
- Any save-schema, protocol, API, CORS, deploy, dependency, manifest, client, or server change.
- The hardware device-lab pass, D-1 reopening, or new product direction.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Evidence records the unchanged-tree baseline: telemetry `11/42 (26.2%)`, the frozen before-column bound readings, the four-cell audit explanation, and green balance gates. | must |
| FR-2 | `measure()` and `bun run telemetry` use a representative 42-fight sample with midpoint stats, press doctrine, the unchanged stride-11 pairings, and one seed each. | must |
| FR-3 | `bun packages/sim/scripts/battle-telemetry.ts --smoke` preserves the reference + split sample and its historical readings, ungated and separately named. | must |
| FR-4 | `BOUNDS` changes exactly two values: `engagementMax` 4500 → 8000 and `distinctPositions` 20 → 16, each with a `why` citing the before/after; the other twelve values stay frozen. | must |
| FR-5 | Regression tests fail before and pass after: they pin the representative composition, the two bound values, and the unchanged smoke composition, without adding a CI gate to the smoke diagnostic. | must |
| FR-6 | `fixture-audit.ts` explains both samples and the current matrix arithmetic, with every historical figure explicitly labelled as historical. | must |
| FR-7 | Product and tech-stack documentation carry a dated 2026-11-24 note recording D-4 closure, the frozen bound table, the preserved smoke diagnostic, and the unchanged D-1 fence. | must |
| FR-8 | `verification/integrated.md` records exact commands, counts, hash, module-cap result, scope proof, and the D-4 disposition. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No change to `SIM_VERSION`, ghost pins, species stats or bounds, controller policy, fight cap, balance fences, boss bounds, or the resolver. |
| NFR-2 | The 840/1680 matrix gate and the D-1 one-in-three fence are unchanged; telemetry `capShare` ceiling stays 0.6. |
| NFR-3 | No new dependency, manifest, save-schema, protocol, API, CORS, deploy, client, or server change. |
| NFR-4 | Google TypeScript style: `const`/`let`, named exports, double quotes, `===`, no `any`/`var`; no module-cap allowlist; no module exceeds 12,288 B client/sim or 24,576 B voxel. |
| NFR-5 | No real player data, credentials, or passphrases are introduced. |
| NFR-6 | All five configured commands pass on the final tree (`verify`, `build`, `balance`, `gate:determinism`, `test:fuzz`) with sim hash `0xff6f3d62`; `bun run telemetry` is green on the representative sample. |
| NFR-7 | Sample budget stays 42 fights; telemetry runtime does not grow beyond the current gate's cost. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Phase 1 evidence shows telemetry `11/42 (26.2%)`, the frozen before-column readings, and the unchanged matrix gate readings. | FR-1 |
| AC-2 | The representative sample is proven to use midpoint stats, press doctrine, 42 distinct stride-11 pairings, and one seed each; `bun run telemetry` reads the frozen after-column values. | FR-2 |
| AC-3 | `bun packages/sim/scripts/battle-telemetry.ts --smoke` still reads the reference + split sample with its historical readings and is not wired into CI. | FR-3 |
| AC-4 | `git diff <base>..HEAD -- packages/sim/scripts/battle-telemetry.ts` shows exactly the two approved bound value changes and their `why` strings; the other twelve values match the frozen table. | FR-4 |
| AC-5 | The new regression test fails on the pre-change tree and passes after, pinning representative composition, both bound values, and the unchanged smoke composition. | FR-5 |
| AC-6 | `bun run fixture-audit` names both samples, prints the current `1680/580/370` and `+12.5 points` arithmetic, and labels every historical figure. | FR-6 |
| AC-7 | `conductor/product.md` and `conductor/tech-stack.md` carry a dated 2026-11-24 D-4 closure note with the frozen bound table and no new product direction. | FR-7 |
| AC-8 | Scope diff excludes `SIM_VERSION`, ghost, controller, species, cap/fence, balance matrix, fixture-audit gate, schema, protocol, and deploy files; only telemetry script, its tests, the audit script, docs, and this track's Conductor artifacts change. | FR-2, FR-4, NFR-1, NFR-2, NFR-3 |
| AC-9 | All five configured commands pass on the final tree with sim hash `0xff6f3d62`; telemetry stays at 42 fights with no runtime regression. | NFR-4, NFR-6, NFR-7 |
| AC-10 | `verification/integrated.md` is committed with commands, counts, module-cap result, scope proof, and D-4 disposition. | FR-8 |
| AC-11 | The pre-existing per-fight structural assertions (both sides commit, and a knockout winner lands a blow) tolerate exactly one zero-commit fight, labelled `gale_moth v emberwing` at seed `20261146`; any other zero-commit fight still fails, and the cadence resonance is recorded as a follow-up. | FR-5 |

## Owner revision (2026-11-24)

Owner decision recorded after Phase 2 failing-first implementation (2026-11-24T13:48:33+11:00). With the approved representative composition (midpoint stats, press doctrine, 42 stride-11 pairings, one seed each), exactly one fight resolves as a 45 s zero-commit stalemate: `gale_moth v emberwing`, seed `20261146`. Instrumentation shows the 240 ms controller decision cadence sampling the gap below the safe retreat floor (~826 mm) or above the hold point (~1270-1372 mm), so the press branch is never reached; the same pairing commits 12-10 times under reference + press and 7-8 under midpoint + split. This is a cadence/body-radius/speed resonance, not a stat-bound violation.

To keep the frozen measurement intact, the owner approved this narrow, dated exception to the stop-and-report edge case below:

- The sample, seeds, doctrine, stat basis, and the two approved bound values remain exactly as frozen above. No bound is widened beyond 8000/16, no game gate is re-pinned, and no controller, species, resolver, or cap-fence code changes.
- The pre-existing per-fight structural assertions (both sides commit, and a knockout winner lands a blow) may tolerate exactly one zero-commit fight, pinned to the named pairing and seed; they must still fail for any other zero-commit fight. The reason is recorded in the test and in `verification/phase-2.md`.
- The cadence resonance is recorded as a follow-up for a separate controller-policy track; it is not fixed here.
- AC-11 is added without renumbering any approved ID.

## Edge Cases

- Under the representative composition the current bound table has exactly two violations (`engagementMax`, `distinctPositions`); implementation must change only those two values, never mask a violation by weakening an unrelated bound.
- If any configured check regresses, stop and report; do not widen a bound or re-pin a game gate to force green.
- The smoke sample remains a diagnostic: a future drift can fail a pin without failing CI, by design.
- Historical prose saying "20/42", "840/377/224" or `+18.2 points` describes the 2026-11-12/13 measurements; dated supersession must not silently rewrite it.
- The representative sample's cap share (`5/42`, 11.9%) is below one third; this does not authorize tightening the `capShare` ceiling — D-1 stays on the matrix.
- A bound's `why` string must state both the before and after readings so a future reader can reconstruct the decision.
- Added script/test code must stay under the 12,288 B client/sim module cap; no allowlist is allowed.
- No hardware device-lab dependency is introduced by this track.

## Dependencies

- **Tracks:** `20261120-telemetry-fixture-debt`, `20261120-kite-band-reachability`, `20261117-global-pacing`, `20261112-capshare-pacing` (all merged; imported as evidence).
- **External:** none.

## Open Questions & Assumptions

- **Resolved:** scope — representative fixture with re-derived bounds, not diagnostic-only or matrix-scale.
- **Resolved:** smoke fixture — preserved as a named, ungated diagnostic.
- **Resolved:** sample budget — 42 fights, stratified by stat basis and doctrine, no seed-count increase.
- **Resolved:** bound approval — the frozen table above is authoritative; exactly two values move.
- **Resolved:** cap ceiling — stays 0.6; D-1's one-in-three fence stays on the matrix.
- **Resolved:** gate owner — `bun run telemetry` becomes representative; smoke moves to a separate command.
- **Assumption:** the stride-11 walk and mirror-slot exchange remain the correct pairing rule; re-stratification changes population composition, not pairing coverage.
- **Assumption:** the frozen readings were derived read-only on the current `main` (`d29042de`) with the scratch command recorded in §Goals; implementation must reproduce them before changing any bound.

## References

- `conductor/product.md` (D-1/D-4 history and Phase 4 roadmap)
- `conductor/archive/20261120-telemetry-fixture-debt/spec.md` and `verification/*`
- `conductor/archive/20261120-kite-band-reachability/verification/*`
- `conductor/archive/20261117-global-pacing/verification/*`
- `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/scripts/fixture-audit.ts`, `packages/sim/scripts/battle-balance-report.ts`
- `packages/sim/src/battle/continuous/telemetry.test.ts`, `packages/sim/src/battle/continuous/telemetry-probe.test.ts`
