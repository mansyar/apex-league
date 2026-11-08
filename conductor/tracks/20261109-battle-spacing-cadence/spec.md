# Battle Spacing and Cadence — Specification

> Stable IDs. Never renumber; mark withdrawn items `Withdrawn`.

## Overview

The continuous engine resolves fights correctly but they read as a clinch
slugfest: bodies overlap, nobody retreats, and both sides attack continuously
until one falls. This track tunes the numbers that produce spacing, cadence and
stamina pressure, and adds an attack-speed property derived from `spd`.

## Problem / Motivation

Measured on the current engine:

- `controller-profile.ts` prefers **450 / 550 / 650 mm** (rush / obedient /
  slow). Body radii sum to roughly 440–560 mm, so the preferred range is contact
  distance and the `retreat` verb has no trigger that fires.
- `DECISION_MS = 120`, so the controller may re-commit the moment recovery ends.
- A basic strike is 80 + 60 + 140 = 280 ms, and stamina regen is **20/s** against
  a **2-point** basic, so the pool never binds.
- Result: ~3 attacks per second sustained, telemetry median engagement **539 mm**,
  and no space-making of any kind.
- There is **no attack-speed stat**: cadence is frame data plus decision cadence
  plus stamina, and `spd` only sets walk speed and dodge burst.

## Goals & Success Metrics

- Median engagement distance **≥ 900 mm**; time spent inside body contact
  **< 40%** of fight time.
- Sustained attack rate **≤ 0.7 attacks/s** per side.
- Stamina refusals observable in most fights, i.e. the pool binds.
- `spd` has a measurable effect on recovery time.
- Fights stay **25–40 s** and the cap share drops to **≤ 1/3** (tightening
  AC-24 of the previous track).

## Scope

**In:** engagement profiles, retreat trigger, decision cadence, stamina costs and
regen, recovery scaled by `spd`, telemetry metrics for contact share and attack
rate, re-pinning the balance and cup suites the change moves.

**Out:** verticality, blocking, ring-out, player input, new moves or species,
animation changes, the frozen gauge clock, `SIM_VERSION`.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Preferred engagement range sits between the move's reach edge and 1.5× it, per archetype, so fighters stand at the edge of reach rather than inside the bodies | must |
| FR-2 | A fighter closer than 0.6× its preferred range retreats, and the order is observable | must |
| FR-3 | The controller decides on a 200–240 ms cadence | must |
| FR-4 | Stamina binds: sustained output is at most one attack per 1.5 s, and refusals are observable | must |
| FR-5 | Recovery time scales inversely with `spd`, so attack speed is a derived property of the stat | must |
| FR-6 | Fight length stays in the 25–40 s band and the cap share is at most one in three | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Integer-only arithmetic, no randomness, one seeded RNG stream, identical state hash |
| NFR-2 | A full 45 s fight resolves headless under 50 ms |
| NFR-3 | New or changed modules stay under the 12 KB guard |
| NFR-4 | Every changed constant is exported, named and documented as a tunable |
| NFR-5 | Telemetry runs in CI and fails on a violated bound |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Median engagement distance ≥ 900 mm over the seeded sample | FR-1 |
| AC-2 | Time inside body contact < 40% of fight time | FR-1, FR-2 |
| AC-3 | At least one retreat order per fight, and a retreat fires when a fighter is inside 0.6× preferred range | FR-2 |
| AC-4 | Measured attack rate ≤ 0.7/s per side over the sample | FR-3, FR-4 |
| AC-5 | A stamina refusal is observable in most fights | FR-4 |
| AC-6 | Two creatures differing only in `spd` recover at different rates, by a stated amount | FR-5 |
| AC-7 | Every sampled fight is 25–40 s and at most one in three ends at the cap | FR-6 |

## Edge Cases

- A slow creature cornered at the fence cannot retreat: it must not oscillate.
- Preferred range longer than the arena's short axis: clamp without spinning.
- Recovery scaled to zero or below by an extreme `spd`: rejected at validation.
- Two fighters at exactly the retreat threshold: one retreats, not both forever.
- Stamina empty while an attack is committed: the attack completes, the next is refused.

## Dependencies

- Requires the continuous engine (track `20261108-continuous-arena-battle`), so
  this track is based on that branch, not `main`.

## Open Questions & Assumptions

- **Assumption:** the 25–40 s band and a lower cap share are jointly achievable;
  if not, spacing wins and the band is reported as missed rather than re-widened.
- **Assumption:** recovery-scaled-by-`spd` is the right shape for attack speed;
  a separate authored stat is out of scope.

## References

`conductor/product.md`, `conductor/workflow.md`,
`packages/sim/src/battle/continuous/controller-profile.ts`,
`controller.ts`, `controller-moves.ts`, `stamina.ts`, `strike.ts`,
`resolve.ts`, `packages/sim/scripts/battle-telemetry.ts`.
