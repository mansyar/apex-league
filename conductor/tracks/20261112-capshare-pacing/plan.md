# Capshare Pacing — Implementation Plan

> **Branch:** `chore/20261112-capshare-pacing`
> **Base:** `main` @ `76ea4ee8`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Diagnose the stall

- **Goal:** every one of the shipped sample's 25 time-outs has a written cause —
  which side failed to close and why — and the cause is confirmed tortoise-local
  before any value changes.
- **Depends on:** none
- **Covers:** FR-1, AC-1
- **Touches:** `conductor/tracks/20261112-capshare-pacing/verification/phase-1.md`
  (evidence only; no source file is edited in this phase)
- **Verification:** `bun run telemetry` reproduces 25/42 and the evidence names a
  cause for each; `bun run trace --seed 20261108 --check` replays a stalled fight
  and its summary shows the standoff.
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 8023c00f
- **Evidence:** conductor/tracks/20261112-capshare-pacing/verification/phase-1.md

- [x] **P1.T1: Reproduce the sample and tabulate the time-outs** — covers: FR-1
  - [x] **P1.T1.1: List every time-out with its pairing, seed and both sides' tactic** (seed parity flips `balanced`/`specials`)
  - [x] **P1.T1.2: Record the gap at the cap, the commits each side made, and the idle share for each stalled fight**
- [x] **P1.T2: Name the cause and confirm the fix surface** — covers: FR-1
  - [x] **P1.T2.1: For each stall, compare the stalling side's threat band against its own reach, kit and `spd`, and say which one leaves it unable to commit**
  - [x] **P1.T2.2: State whether the cause is tortoise-local. If any stall is not, record it as debt and say so explicitly instead of widening scope**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261112-capshare-pacing/verification/phase-1.md
-->

## Phase 2: The tortoise fixes itself, not its identity

- **Goal:** the stalls the diagnosis blamed on `earth_tortoise` stop timing out,
  using only its own stat bounds and kit selection, with its identity pinned by a
  test that fails the build if it is sped up or re-tempered.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-2a, FR-5, FR-7, AC-2, AC-2a, AC-5, AC-7
- **Touches:** `packages/sim/src/species/rewards.ts`,
  `packages/sim/src/species/identity.test.ts`,
  `packages/sim/src/battle/continuous/balance-report.test.ts`,
  `packages/sim/src/battle/continuous/telemetry.test.ts`,
  `packages/sim/src/cup/**`
- **Verification:** `bun run balance`, then `bun run telemetry`, then
  `bun run verify`, then `bun run build` (four separate commands)
- **Status:** blocked
- **Result:** blocked — resolved by withdrawing FR-2 on 2026-11-12; the identity
  guard is the surviving deliverable
- **Checkpoint:** 99d2a618
- **Evidence:** conductor/tracks/20261112-capshare-pacing/verification/phase-2.md

- [x] **P2.T1: Write the identity guard first** — covers: FR-2a
  - [x] **P2.T1.1: A test pins `spd` bounds exactly `[3, 5]`, `hp`/`def` bounds no lower than shipped, `temperament === "slow"`, `archetypeId === "tortoise"`, `element === "earth"`, and every kit id inside the six it shipped with**
  - [x] **P2.T1.2: Confirm the guard passes on the untouched tree, so it is a fence and not a wish**
- [x] **P2.T2: Choose the lever inside the tortoise's own data** — covers: FR-2
  - [x] **P2.T2.1: Try stat movement inside the existing bounds first (its `atk`/`hp` envelope), measuring `bun run telemetry` after each candidate**
  - [x] **P2.T2.2: If stats are not enough, change which four of its six moves the kit selects — never add a move it does not own, never raise `spd`**
  - [x] **P2.T2.3: Record every candidate and its telemetry reading, including the rejected ones** — six rungs; none resolved a collapse fight without breaking the species band
- [x] **P2.T3: Keep the 840-fight roster honest** — covers: FR-5
  - [x] **P2.T3.1: `bun run balance` stays green: 15/15 species in band, cap ≤ 1/3, median 25–40 s, decisive ≥ 2/3, 49/49 moves in the 4–12% damage band**
  - [x] **P2.T3.2: Re-pin only the figures the change moved, each with a comment; no tolerance, floor or `DISTINCT_FLOOR` is edited** — nothing moved, so nothing was re-pinned
- [x] **P2.T4: Settle the version guard** — covers: FR-7
  - [x] **P2.T4.1: Prove the fix touched neither controller policy nor frame data, so `SIM_VERSION` stays 3 and the ghost pins pass unchanged; if it did, bump to 4 and update the pins**

> **Why this phase is blocked, and why that is the answer.** Six
> identity-preserving rungs were measured. Every green rung resolves **zero** of
> the tortoise's nine collapse fights; the cheapest rung that resolves any takes it
> to **65.2%** on the 840-fight matrix. The species is already balanced at
> **52.7% as an outlaster**, and this project rules that a cap win is an outlasting
> win — so its caps are its identity working. FR-2 and AC-2 were withdrawn
> (`spec.md`, 2026-11-12); the guard (FR-2a/AC-2a) ships, no species value changed,
> and `rewards.ts` is byte-identical to the phase base.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261112-capshare-pacing/verification/phase-2.md
-->

## Phase 3: A sample that measures the roster, not its own composition

- **Goal:** `matchups()` returns 42 distinct pairings spread across the roster,
  `capShare` reads at most 52% on them with the 3/5 ceiling untouched, and both
  readings are recorded side by side.
- **Depends on:** Phase 2 (blocked, resolved by withdrawing FR-2 — the guard is in
  place and no species value moved, so the sample can be re-composed against a
  stable roster)
- **Covers:** FR-3, FR-4, FR-6, FR-8, FR-9, AC-3, AC-4, AC-6, AC-8, AC-9
- **Touches:** `packages/sim/scripts/battle-telemetry.ts`,
  `packages/sim/src/battle/continuous/telemetry.test.ts`,
  `packages/sim/src/battle/continuous/pacing.test.ts`
- **Verification:** `bun run telemetry`, then `bun run verify`, then
  `bun run build` (three separate commands)
- **Status:** verified
- **Result:** verified — `capShare` 20/42 (47.6%), every other bound unchanged
- **Checkpoint:** c08ff05a
- **Evidence:** conductor/tracks/20261112-capshare-pacing/verification/phase-3.md

- [x] **P3.T1: Replace the 14 × 3 walk with 42 distinct pairings** — covers: FR-3
  - [x] **P3.T1.1: Draw the pairings by a written rule over the full 210-pair enumeration (fixed stride, mirrors skipped), not by hand — the rule lives in `matchups()`'s doc so the sample is reproducible** — stride 11 plus a per-lap carry; the brief's suggested stride 7 collided after the mirror hop (39 distinct), which the new pin would have caught
  - [x] **P3.T1.2: Pin the coverage the old walk lacked: 42 entries, all distinct, no mirrors, every species appearing as home and as away at least twice, and the same list on two calls**
- [x] **P3.T2: Hold the line on every other bound** — covers: FR-4, FR-8
  - [x] **P3.T2.1: `capShare` reads at most 21/42 with the ceiling still 3/5 in the source; `deadZoneShare`, retreat floors, duration band and `distinctPositions` keep their values** — 20/42; no `BOUNDS` value edited, only `capShare.why` prose
  - [x] **P3.T2.2: If the new sample cannot reach 52% without a second species fix, stop and report blocked — do not pick pairings that dodge the stalls and do not move the bound** — not needed; the rule was fixed before measuring and was not iterated
- [x] **P3.T3: Leave `pacing.test.ts` truthful** — covers: FR-6
  - [x] **P3.T3.1: A `test.failing` whose body now passes is promoted to a normal assertion; a pin that still fails keeps a comment saying why. No `.skip` is added** — untouched and re-run to prove no pin changed state (4 pass, 0 fail, 87 assertions)
- [x] **P3.T4: Record both readings** — covers: FR-9
  - [x] **P3.T4.1: The evidence carries the shipped 14 × 3 reading and the new 42-distinct reading side by side, with a verdict per bound and the reason each still holds**
  - [x] **P3.T4.2: State plainly that the two readings are not comparable — the claim is "the new sample reads ≤ 52%", never "we removed eight time-outs"**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261112-capshare-pacing/verification/phase-3.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
