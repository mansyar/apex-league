# D-2 Kite Band Reachability — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track resolves the standing D-2 pacing debt: a slow creature at `spd 5`
(about 0.55 mm/ms) cannot hold the Kite doctrine's 1,472–1,600 mm preferred band
against press bodies moving at 1.0–1.63 mm/ms, so retreat decisions win instead
of commits and the fight drifts toward the 40 s cap. The track first records a
current baseline, then implements a deterministic, speed-aware reachable band
for Kite in the shared controller, and finally proves that the representative
matrix's cap-decided share decreases while every balance fence stays green. It
ships no new dependency, no content, and no fence movement; if no in-scope
candidate both reduces the cap-decided share and keeps all gates green, the
track ships no game change and reports a measured block.

## Problem / Motivation

The archived diagnosis (`20261117-global-pacing`, phase 1 §4) found that at
`spd 5` a slow body's median gap sits at 949–1,305 mm while the Kite band's
floor sits at 1,472–1,600 mm. The kiter therefore keeps retreating into a band
it cannot hold, dodged shots remove landed damage without removing committed
attacks, and both sides miss the damage pool before the cap. The gate-cost
audit (`20261112-gate-cost-and-fixture-audit`, phase 3 §6) later showed the
doctrine axis is worth up to 19.0 points of cap share on the representative
midpoint stat line, so D-2 is the only lever on that axis even though it does
not explain the old fixture's inflated headline. The product decision of
2026-11-18 closed D-1 and explicitly left D-2 open, with every pacing fence
pinned. If it is not addressed, the slow-kiter throughput defect remains a
known, measured gameplay flaw and the ≤1/3 cap fence passes for the wrong
reason on some slow-body pairings.

## Goals & Success Metrics

- **Goal:** Kite's hold point and floor are reachable by the slow bodies that
  use it, so a slow kiter converts retreats into commits instead of stalling.
- **Metric:** on the current full species matrix (1,680 fights with 21 species;
  historically called the 840-fight matrix when the roster had 15), the
  cap-decided share (`capShare`) is strictly lower than the recorded baseline
  while every configured balance gate remains green.
- **Secondary evidence:** the focused slow-kiter reproduction moves from an
  unreachable-band failure before the fix to a reachable-band pass after it,
  and the Kite doctrine row's gap/retreat profile is recorded before and after.
- **Non-goal:** no numeric cap-share ceiling beyond the standing `CAP_MAX` fence
  is invented by this track.

## Scope

### In Scope

- Record a pre-change baseline with `bun run balance` output and a focused,
  pure-controller reproduction of the slow-kiter band defect.
- Change Kite's band calculation so the preferred gap and floor are clamped by
  what the fighter's own speed can actually maintain against the opponent's
  closing speed, using integer arithmetic and the existing one RNG stream.
- Add failing-first regression tests for the slow-kiter case and for the
  preserved band invariants (reach edge, doctrine ordering, temperament shade).
- If a policy change ships, bump `SIM_VERSION` 3 → 4 with a dated note in
  `packages/sim/src/cup/ghost.ts`, update the ghost version pins accordingly,
  and record the new battle hash.
- Run the full configured verification chain before and after, and commit
  `verification/integrated.md` with the before/after tables and scope proof.

### Out of Scope

- Moving any balance fence or target: `BOUNDS`, `CAP_MAX`, `DISTINCT_FLOOR`,
  `DECISIVE_SHARE_MIN`, `CAP_MARGIN_FLOOR_BP`, cap duration, species stat or
  sibling bands, boss stat pins, damage band, telemetry fixture target, or
  pacing pins.
- Movement kinematics changes: top speed, acceleration, dodge speed/energy,
  stamina, frame data, move recovery, damage, HP pools, or animation.
- New dependencies, new game content, save-schema migration, protocol or
  live-PvP changes, client/server/API/CORS/deploy/config changes.
- Re-stratifying the 42-fight telemetry fixture (D-3/D-4) or changing its debt
  pins.
- The hardware device-lab verification pass.
- Shipping a policy change that keeps all gates green but does not lower
  `capShare`; such a candidate is recorded as rejected, not shipped.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Before any source change, `verification/phase-1.md` records the current full-matrix `capShare`, `decisiveShare`, `capWinQuality`, Kite doctrine row, and a focused slow-kiter reproduction showing doctrinal floor/preferred gap versus the gap a `spd 5` body can maintain against a press foe. | must |
| FR-2 | Kite's band calculation gains a deterministic speed-aware reachability clamp so a slow kiter holds a gap it can maintain rather than retreating into an unreachable band; the calculation is pure, uses integer arithmetic, and keeps the existing single RNG stream. | must |
| FR-3 | Band invariants hold for every speed pair: the floor never drops inside the reach edge or below the Press band at the reference stat line, floor ≤ preferred ≤ ceiling, and temperament shading still cannot cross the doctrine floor or ceiling. | must |
| FR-4 | If controller policy ships, `SIM_VERSION` moves from 3 to 4 with a dated v4 note, ghost version pins are updated in the same change, mismatched v3 bundles remain rejected, and the new battle hash is recorded. If no policy ships, `SIM_VERSION` and pins stay at 3. | must |
| FR-5 | Every configured balance gate stays green, including `capShare ≤ 1/3`, `decisiveShare ≥ 2/3`, `capWinQuality ≥ 2/3`, species significance/design bands, boss pins, and the 49-move damage band. | must |
| FR-6 | The final full-matrix `capShare` is strictly lower than the FR-1 baseline while every gate in FR-5 is green. If no in-scope candidate achieves this, no game change ships; the phase reports blocked with the measured grid and exact reason. | must |
| FR-7 | `verification/integrated.md` records exact commands, exit codes, counts, sim hash, module caps, before/after metrics, screenshots not applicable, and a scope proof. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No new runtime or dev dependency; no save-schema, live protocol, API, CORS, deploy, client or server change. |
| NFR-2 | No fence moves: every bound, target, pin, species value, boss pin, cap duration and fixture target named in Out of Scope remains byte-identical. |
| NFR-3 | Battle simulation stays deterministic: integer arithmetic, one RNG stream, no real timers, no network, no floating-point policy decision; the determinism gate is byte-identical after the change with the new hash recorded. |
| NFR-4 | Write scope is limited to `packages/sim/src/battle/continuous/**`, `packages/sim/src/cup/ghost.ts` and `ghost.test.ts` when FR-4 applies, the track's `verification/` files, and Conductor state owned by the primary. |
| NFR-5 | Sim module cap of 12,288 bytes holds with no allowlist; TypeScript style follows Google TS conventions (const/let, double quotes, named exports, `===`, no `any`, no default exports). |
| NFR-6 | Verification uses the exact configured commands: `bun run verify`, `bun run build`, `bun run balance`, `bun run gate:determinism`, `bun run test:fuzz`, plus the configured `verify_phase` chain where required. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `verification/phase-1.md` contains the pre-change baseline and slow-kiter reproduction, and the source tree is unchanged in that phase. | FR-1 |
| AC-2 | A pure regression test fails before the fix for the `spd 5` slow-kiter case and passes after; the test is committed as evidence, not as a supposed proof of the matrix result. | FR-2 |
| AC-3 | Band-invariant tests pass for equal speed, fast kiter/slow foe, slow kiter/fast foe, all three temperaments, and mirrored radii. | FR-3 |
| AC-4 | If policy ships, `SIM_VERSION` is 4, ghost pins read 4/5, the v4 note is dated 2026-11-20, and the new battle hash is recorded; otherwise no sim/ghost file changed and version stays 3. | FR-4 |
| AC-5 | `bun run balance` reports all 34 gates green and a diff of the fence files named in NFR-2 is empty. | FR-5, NFR-2 |
| AC-6 | Final `capShare` is strictly below the FR-1 baseline (currently 30.8% / 517 of 1,680) on the same full matrix, with the before/after table in evidence. | FR-6 |
| AC-7 | If no candidate satisfies AC-5 and AC-6 together, the phase is `blocked`, no controller/sim/ghost file is changed, and the evidence contains the measured grid and the owner decision needed to move a fence. | FR-6 |
| AC-8 | `verification/integrated.md` is committed with commands, exit codes, counts, hash, module caps, scope proof, and the before/after metric table. | FR-7, NFR-3, NFR-5 |
| AC-9 | All configured verification commands exit 0 on the final tree; determinism is byte-identical and no allowlist was added. | NFR-3, NFR-6 |
| AC-10 | The final diff changes no dependency manifest, save schema, protocol, API, CORS, deploy config, client or server file; the only version change is the FR-4 replay guard. | NFR-1, NFR-2 |

## Edge Cases

- Equal-speed kiter and foe: the reachability clamp is inert and the doctrinal band is unchanged.
- Fast kiter versus slow foe: the clamp never pulls the floor below the reach edge or inverts floor/preferred/ceiling.
- Very slow kiter versus much faster press foe: the clamp chooses the largest maintainable gap at or above the reach edge; if none exists, the phase records the case rather than forcing an unsafe band.
- `rush`, `slow`, and `obedient` temperaments: shading still changes aggression/strafe/dodge only, never crossing the clamped doctrine floor or ceiling.
- Different body radii and move reach: the band is recomputed against the actual pair's reach edge, not a hardcoded global gap.
- Ghost replay after a shipped policy change: v3 bundles are rejected by the v4 guard; a newly captured v4 bundle verifies byte-identically.
- No green candidate: the track ships no change, records blocked evidence, and leaves D-2 open with a fence-decision request.

## Dependencies

- **Tracks:** `20261117-global-pacing`, `20261112-gate-cost-and-fixture-audit`, `20261112-capshare-pacing` (all complete; imported as measurement precedent, not blockers).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** the “840-fight matrix” name in product/archive prose is historical. The current 21-species roster produces 1,680 full-matrix fights; this track measures the current full matrix and records the historical label in evidence so the metric is not silently redefined.
- **Assumption:** `SIM_VERSION` 3 → 4 with ghost pin updates is a replay-version guard, not a fence move, and is required only if controller policy actually ships.
- **Assumption:** a strict `capShare` decrease is achievable without moving a fence; if the measured search disproves this, AC-7 applies and the track stops as blocked rather than weakening the target.
- **Question:** none — all owner decisions were resolved 2026-11-20 (chore/high, no fence moves, speed-aware band, measured matrix reduction, import archived diagnostics).

## References

- `conductor/product.md` — Phase 4 D-1 decision (2026-11-18), D-2/D-3/D-4 residual debt.
- `conductor/archive/20261117-global-pacing/verification/phase-1.md` §4 — unholdable `spd 5` kite band, 0.55 vs 1.0–1.63 mm/ms.
- `conductor/archive/20261117-global-pacing/verification/integrated.md` §6 — D-2 residual-debt statement and standing advice on fences.
- `conductor/archive/20261112-gate-cost-and-fixture-audit/verification/phase-3.md` §6 — doctrine axis worth 19.0 points at midpoint stats.
- `conductor/archive/20261112-capshare-pacing/verification/phase-2.md` §4 — tortoise's nine unresolved pairings are the kite band plus the 40 s cap.
- `packages/sim/src/battle/continuous/controller-profile.ts`, `controller-reach.ts` — current band construction.
- `packages/sim/src/battle/continuous/balance-report.ts`, `packages/sim/scripts/battle-balance-report.ts` — matrix gates and `capShare` definition.
- `packages/sim/src/cup/ghost.ts`, `ghost.test.ts` — replay-version guard and pins.
- `conductor/workflow.md` — verification commands, module caps, phase evidence rules.
