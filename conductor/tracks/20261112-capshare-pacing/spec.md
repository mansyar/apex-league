# Capshare Pacing — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The telemetry smoke gate reads `capShare` from a 42-fight fixture that is the
only place a fight's *ending* is measured on every CI run. It currently reads
**25 of 42 fights decided at the 40 s cap (59.5%)** against a ceiling of 3/5
(60.0%) — one fight of headroom — while the 840-fight balance matrix reads
**224 of 840 (26.7%)**. This track closes that gap: it diagnoses why the fixture's
fights time out, fixes the one species the stalls concentrate on, and
re-composes the fixture so one stalled pairing can no longer count as three
fights.

## Problem / Motivation

The 42-fight sample is 14 pairings × 3 seeds, and the time-outs are not spread
across it:

| Pairing | Time-outs | Seeds |
| --- | --- | --- |
| `fire_drake` v `earth_tortoise` | 3 / 3 | 20261108–10 |
| `reefclaw` v `earth_tortoise` | 3 / 3 | 20261114–16 |
| `earth_tortoise` v `embercub` | 3 / 3 | 20261115–17 |
| `embercub` v `earth_tortoise` | 3 / 3 | 20261120–22 |
| `electric_hound` v `earth_tortoise` | 3 / 3 | 20261111–13 |
| `shalemole` v `water_axolotl` | 3 / 3 | 20261119–21 |
| `mossboar` v `embercub` | 3 / 3 | 20261121–23 |
| `water_axolotl` v `electric_hound` | 2 / 3 | 20261110–11 |
| `plant_ox` v `embercub`, `wind_falcon` v `water_axolotl` | 1 / 3 each | — |

Two facts follow, and both are defects of measurement as much as of pacing:

1. **The stall is species-shaped.** `earth_tortoise` is a side in **12 of the 25**
   time-outs. This is the long-standing "mobility residual" debt: a spd-5 body
   whose reach and threat band leave it unable to close, so both sides hold and
   the fight runs out. Fixing it fixes most of the fixture.
2. **The fixture triple-counts a pairing.** Nine stalled pairings produce
   twenty-five time-outs because each pairing is fought three times. `capShare`
   is therefore not a rate over forty-two fights; it is closer to "nine of
   fourteen pairings stalled, weighted". The balance matrix — 210 ordered
   pairings, one doctrine, four seeds — reads 26.7%, so the fixture is
   measuring its own composition, not the game's pacing.

If this is not fixed, the ceiling that the Minimum Reach track consumed two
fights of headroom from will be tripped by the next mechanic that lengthens a
fight — and the fix will then have to be made under pressure, against a red gate,
with no room to measure.

## Goals & Success Metrics

- **Goal:** the fixture's cap share reflects the roster's pacing rather than its
  own composition, and the one species that stalls is left **intact** — its caps
  are its identity, not a defect.
- **Metric:** `capShare` at most **52%** on a re-composed 42-distinct-pairing
  sample (at most 21 of 42), with the 3/5 ceiling left at its current value, and
  the 840-fight balance matrix still green.
- **Metric:** the identity guard holds — `spd` still `[3, 5]`, `temperament`
  still `"slow"`, the kit still its own six moves, `hp`/`def` not lowered — and
  no species value ships changed at all, because the six measured rungs showed the
  fix would cost the tortoise its balance.
- **Goal:** the diagnosis is written down before anything is changed, so any fix
  is traceable to a cause rather than to a number — including the fix that was
  measured, rejected and withdrawn.

## Scope

### In Scope

- A written diagnosis of the stalling pairings: which side fails to close, what
  its threat band, reach and kit say, and why the fight reaches the cap.
- An identity guard on `earth_tortoise` — a test that pins the slowest body in the
  roster (`spd` bounds `[3, 5]`), the tankiest earth wall (`hp`/`def` bounds not
  lowered), `temperament: "slow"`, `archetypeId: "tortoise"` and a kit drawn only
  from the six moves it already owns — so that no future pacing pass can "fix" the
  stall by quietly deleting the species. **No species value changes.** A fix inside
  the tortoise's own data was measured across six rungs and withdrawn; the
  evidence and the reason are in `verification/phase-2.md`.
- Re-composing `matchups()` in `packages/sim/scripts/battle-telemetry.ts` from
  14 pairings × 3 seeds to **42 distinct pairings, one seed each**, keeping the
  roster walk, the no-mirror rule and determinism.
- Recording the before/after for **both** readings (the shipped 14 × 3 sample
  and the new 42-distinct sample) in the phase evidence.
- Re-pinning `pacing.test.ts`'s `test.failing` debt pin if the behaviour it pins
  changes, so no test is left asserting a failure that no longer happens.
- Keeping every other bound at its value: `deadZoneShare`, the retreat floors,
  the duration band, `DISTINCT_FLOOR`, and the statistical species tolerance.

### Out of Scope

- Any change to the shared threat band (`threatBandFor` / `bandFor`), the
  controller, movement, stamina, damage or the resolution loop.
- Any change to frame data (`FRAME_DATA`, reach, startup, recovery, minimum
  reach).
- Any species other than `earth_tortoise` — including a second stall fix if the
  diagnosis finds one. That is recorded as debt and proposed as its own track.
- A global late-fight escalation rule (damage ramp, stamina drain, arena shrink,
  sudden death). Rejected for this track: it changes every fight's tail and every
  replay, which is more than a chore.
- Raising `capShare`'s ceiling, or any other bound, floor, tolerance or
  `DISTINCT_FLOOR`.
- Changing the `pacing.test.ts` sample composition (it is a separate fixture; only
  its debt pin may be re-pinned).
- A `SIM_VERSION` bump unless controller policy, frame data or the resolution
  loop turns out to move.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Before any change, the track records a per-pairing diagnosis of every time-out in the shipped sample: the stalling side, its gap at the cap, its threat band versus its own reach, and its kit. | Must |
| FR-2 | **Withdrawn 2026-11-12.** ~~The fix changes only `earth_tortoise`'s authored stat bounds and kit selection.~~ Six identity-preserving rungs were measured and every one of them resolves **zero** of the tortoise's nine collapse fights; the cheapest rung that resolves any takes it to 65.2% on the 840-fight matrix and fails the species band. The species is already balanced at 52.7% *as an outlaster*, and this project rules that a cap win is an outlasting win, so its stalls are its identity working rather than a defect to fix. Evidence: `verification/phase-2.md`. | Withdrawn |
| FR-2a | The fix preserves the tortoise's identity: `spd` bounds stay `[3, 5]`, `hp`/`def` bounds are not lowered, `temperament` stays `"slow"`, `archetypeId` stays `"tortoise"`, `element` stays `earth`, and the kit is drawn only from the six moves it already owns (`pebble_shot`, `dust_devil`, `clay_burst`, `boulder_toss`, `sand_blast`, `tectonic_slam`). A fix that only works by making it faster is out of bounds. | Must |
| FR-3 | `matchups()` returns 42 distinct pairings, one seed each, no mirrors, drawn by a written rule over the full 210-pair enumeration (not hand-picked), so the sample stays deterministic, reproducible, and spread across the roster rather than reusing three away species. | Must |
| FR-4 | `capShare` reads at most 52% (`cap.count * 100 <= 52 * cap.total`, i.e. at most 21 of 42) on the re-composed sample, and the ceiling stays 3/5. | Must |
| FR-5 | The 840-fight balance matrix stays green: 15/15 species inside the statistical bound, cap at most 1/3, median 25–40 s, decisive at least 2/3, all 49 moves inside the 4–12% damage band. | Must |
| FR-6 | `pacing.test.ts` is left in a truthful state: a debt pin that now passes is promoted to a normal assertion, and a pin that still fails says why. | Must |
| FR-7 | `SIM_VERSION` stays 3 unless the fix moves controller policy, frame data or the resolution loop; if it does, it becomes 4 with the ghost pins updated. | Must |
| FR-8 | Every other bound keeps its value: `deadZoneShare` ≤ 50%, retreat floors ≥ 42, `durationMin` ≥ 8 s, `durationMax` ≤ 40 s, `distinctPositions` ≥ 20, and the species tolerance unchanged. | Must |
| FR-9 | The evidence records the before/after for both the shipped 14 × 3 sample and the new 42-distinct sample, with the reason each bound still holds. | Must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism: integer arithmetic only, no new RNG stream, same seed → same hash and event sequence; `bun run trace --check` still passes. |
| NFR-2 | No bound, floor, tolerance or `DISTINCT_FLOOR` is widened. The sample composition is this track's approved change and is recorded before/after, not discovered afterwards. |
| NFR-3 | The telemetry sample stays inside the phase time budget (well under the 150 s leg; it currently costs ~4 s). |
| NFR-4 | No new stream field or event kind; the client is untouched. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The diagnosis exists and names, for every time-out in the shipped sample, the stalling side and the geometric or policy reason it did not close. | FR-1 |
| AC-2 | **Withdrawn 2026-11-12** with FR-2. No species value ships changed; `packages/sim/src/species/rewards.ts` is byte-identical to the phase base, which `git diff --stat` proves. | FR-2 |
| AC-2a | A test pins the identity invariants: `spd` bounds exactly `[3, 5]`, `hp`/`def` bounds no lower than shipped, `temperament === "slow"`, `archetypeId === "tortoise"`, `element === "earth"`, and every kit id inside the six it shipped with. | FR-2a |
| AC-3 | `matchups()` returns 42 entries, all pairings distinct, no mirrors, the same list on two calls, and every species appears as home and as away at least twice (the shipped walk only ever put three species on the away side). | FR-3 |
| AC-4 | `bun run telemetry` exits 0 and prints `capShare` at most 21/42 with the 3/5 bound unchanged in the source. | FR-4 |
| AC-5 | `bun run balance` exits 0 with 15/15 species, cap ≤ 1/3, median in 25–40 s, decisive ≥ 2/3, 49/49 moves in band. | FR-5 |
| AC-6 | No test is left as a `test.failing` whose body now passes; the suite is green with no `.skip` added. | FR-6 |
| AC-7 | `SIM_VERSION` is 3 and the ghost tests pass, unless the fix moved policy or frame data — in which case it is 4 and the pins say so. | FR-7 |
| AC-8 | Every other bound in `BOUNDS` is byte-identical to the shipped value, and `deadZoneShare` still reads 2.4% ± the pacing change. | FR-8 |
| AC-9 | The evidence file contains both readings (14 × 3 and 42 distinct) side by side, with the per-bound verdict for each. | FR-9 |

## Edge Cases

- **The re-composed sample is not comparable to the old one.** 42 distinct
  pairings measure different fights, so the new `capShare` cannot be subtracted
  from 59.5%. Both readings are recorded, and the claim is only "the new sample
  reads ≤ 52%", never "we removed 8 time-outs".
- **A second species stalls.** If the diagnosis finds a non-tortoise stall, this
  track does not fix it. It records the pairing, the reason and the cost, and the
  ≤ 52% target is judged on what remains.
- **The tortoise becomes too strong.** Making a tank close can flip it from
  harmless to oppressive. The 840-fight species band is the check; if it cannot
  be satisfied inside the tortoise's own data, the track reports blocked rather
  than reaching for the shared band.
- **The fix makes it a fast brawler.** The cheapest way to stop a slow body from
  stalling is to speed it up, and that would delete the species. The lever must
  make the tortoise *win from where it stands* — a better move choice, or a
  stat line inside its existing bounds — never a higher `spd` bound, a faster
  temperament, or an aggressive move it does not own. AC-2a fails the build if
  this happens, so the temptation is caught mechanically rather than by review.
- **The identity is preserved but the species stops being a wall.** Raising `atk`
  to make its shots bite is legitimate; dropping `hp` or `def` to pay for it is
  not, because "outlasting is a valid victory" is the tortoise's whole thesis.
- **Fights get too fast.** Reducing caps by shortening fights can break
  `durationMin` (8 s). A fix that produces sub-8-second knockouts is a
  regression, not a win.
- **The debt pin flips.** `pacing.test.ts` currently pins "a KO majority" as
  `test.failing`. If the fix makes that pin pass, leaving it is a suite error; it
  must be promoted in the same phase.
- **Ghosts.** A stats-only fix leaves existing v3 bundles replaying unchanged,
  because each bundle carries its own stat line and kit. If the fix touches
  policy, the version guard must move instead.
- **The sample's roster walk.** 15 species give 210 ordered pairs, so 42 distinct
  pairings are available without repeats; the hop-past-mirrors rule still applies.

## Dependencies

- **Tracks:** none. Base `main` @ `76ea4ee8` (Minimum Reach merged).
- **External:** none.

## Open Questions & Assumptions

- **Decided 2026-11-12:** type `chore`, priority `high`; both levers (targeted
  stall fix *and* fixture re-composition); target ≤ 52% with the ceiling
  untouched; the fix may move `earth_tortoise`'s stats and kit only; the sample
  becomes 42 distinct pairings.
- **Decided 2026-11-12 (identity):** the tortoise must not lose its identity. It
  stays the slowest, tankiest earth body with `temperament: "slow"` and its own
  six moves; the fix may make it effective from a standstill, never fast. Pinned
  mechanically by AC-2a so the cheapest fix — raising `spd` — cannot pass.
- **Decided 2026-11-12 (withdrawal):** the fix is withdrawn and the guard kept.
  Six rungs were measured (`verification/phase-2.md`): the brief's preferred kit
  reorder resolves 0 of the 9 collapses; reorder + `atk` 13 resolves 0; evicting
  `boulder_toss` resolves 2 but takes the tortoise to 71.4% and the matrix red;
  the same kit at shipped `atk` still reads 65.2%, so the kit is the oppressor.
  The tortoise sits at 52.7% on the 840-fight matrix *as an outlaster*, and this
  project already rules that a cap win is an outlasting win — so its nine caps are
  its design working. The guard ships; the sample re-composition carries the
  target; the global 16 become debt **D-1** and the kite-band/spd mismatch **D-2**.
- **Assumption:** the stall is tortoise-shaped. The diagnosis phase exists to
  confirm or refute this before any value changes; if refuted, the track reports
  rather than widening its own scope. **Refuted 2026-11-12:** 9 of 25 time-outs are
  the tortoise's own, 16 are global throughput (D-1), and six identity-preserving
  rungs resolved none of the 9 — so FR-2 was withdrawn and the track reports, as
  this assumption required.
- **Assumption:** ≤ 52% is reachable without engine pressure. If the fixture
  cannot get there by re-composing the sample, that is a finding about the game's
  pacing, not a reason to move the bound. **Still open:** Phase 3 is now the only
  lever, and if the re-composed sample lands above 52% the track stops and reports
  rather than relaxing the target or re-picking pairings.
- **Assumption:** `pacing.test.ts` and the telemetry sample are separate fixtures
  that happen to share a roster walk today; only telemetry is re-composed here.

## References

- `conductor/archive/20261111-minimum-reach/verification/integrated.md` — the
  debt this track pays down (0.5-point headroom, gate-limited dead zone).
- `conductor/archive/20261111-minimum-reach/verification/phase-3.md` — the
  sample-widening precedent and its before/after discipline.
- `packages/sim/scripts/battle-telemetry.ts` — `matchups()`, `BOUNDS`, `pool()`.
- `packages/sim/src/battle/continuous/pacing.test.ts` — the sibling fixture and
  its `test.failing` debt pin.
- `packages/sim/src/battle/continuous/resolve.ts` — `FIGHT_CAP_MS = 40000`,
  `pointsWinner`, `reason: "time"`.
- `packages/sim/src/species/` — `earth_tortoise` stat bounds and kit.
