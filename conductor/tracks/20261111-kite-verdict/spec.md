# Kite Verdict — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Kite wins 0 of 6 on the pinned fire_drake-vs-electric_hound probe while
logging ~24 paid dodges per fight. This track delivers a verdict, by
measurement: either Kite is missing a tool (which this track then ships),
or Kite is a trap doctrine (which this track then labels honestly in the
product). No species stat or move changes; only Kite's range band and
strafe bias may move, and only to test the diagnosis.

## Problem / Motivation

The doctrine table promises four credible plans, but one of them loses
every sampled fight. That blocks doctrine credibility: a player who picks
Kite on the coach's description is picking a plan that cannot win, and no
finding in the track record says whether the plan is one tool short or
structurally hopeless. The roadmap orders this verdict before any tuning
("do not tune around it") — tuning a roster around a broken doctrine
would bake the breakage into every species row.

## Goals & Success Metrics

- **Goal:** a measured verdict on Kite, plus the fix or the warning.
- **Metric:** Kite takes at least 2 of 6 on the fixed probe
  (viable-but-weak), or the evidence names the mechanism that keeps it
  at 0–1 and the product labels Kite situational with those conditions.
- **Metric:** dodges-per-fight stay non-zero on the probe (the tool
  triggers); the verdict explains conversion, not volume.
- **Metric:** all pacing and balance bounds hold (cap share, decisive
  share, median, p05, damage band, telemetry 13/13) — a verdict that
  breaks the gate is not a verdict.

## Scope

### In Scope

- Probe traces on the pinned matchup explaining why triggered dodges do
  not convert to wins.
- Range-band and strafe-bias experiments, each scored on the 6-fight
  probe, to test the diagnosis.
- The missing tool, designed and shipped in-track, if the verdict is
  "missing tool" (doctrine-level only: no new stats, no new moves).
- The situational warning (HUD + coach room copy + spec record) if the
  verdict is "trap".
- Re-pins forced by the above, listed row by row.

### Out of Scope

- Species stats, move powers, cooldowns, stamina, frame data — frozen.
- Tuning any species row "around" Kite.
- Doctrine redesign beyond Kite's one missing tool.
- Minimum reach / dead zones (ships with the balance track).
- New species, bosses, or server/API changes.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The track scores Kite on the fixed 6-fight probe (fire_drake vs electric_hound, pinned seeds and orders) and reports wins plus paid dodges per fight. | must |
| FR-2 | The evidence names the mechanism that keeps Kite at 0–1 wins (traces cited: gap trace, dodge timing vs swing windows, retreat/fence behaviour). | must |
| FR-3 | Range-band and strafe-bias moves are tried one at a time, each scored on the probe, kept only when wins move without breaking any pacing or balance bound. | must |
| FR-4 | If the mechanism is a missing tool, the track ships it at doctrine level and Kite reaches at least 2 of 6 on the probe. | must |
| FR-5 | If the mechanism is structural, Kite is labelled situational in the spar picker and coach room with the matchup conditions where it fails, and stays pickable. | must |
| FR-6 | Paid dodges per fight stay non-zero on the probe throughout; a lever that silences the dodge tool fails the phase. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Integer arithmetic, one seeded RNG, byte-identical replay for the same seed. |
| NFR-2 | Full suite inside the 150 s budget; probe fights headless. |
| NFR-3 | New modules under the 12 KB cap; doctrine row changes stay inside existing tables. |
| NFR-4 | No network/API change; no save-format change. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The probe reports Kite wins and paid dodges per fight on pinned seeds, and the pre-change baseline (0/6, ~24 dodges/fight) is recorded. | FR-1 |
| AC-2 | The evidence cites trace excerpts showing where Kite's fight is lost (gap, timing, or fence), not just the score. | FR-2 |
| AC-3 | Every lever move lists its probe delta and the pacing/balance re-check; a move that breaks a bound is reverted, not kept. | FR-3 |
| AC-4 | Tool verdict: Kite wins at least 2 of 6 on the probe with dodges still firing and all bounds green. | FR-4 |
| AC-5 | Trap verdict: the spar picker and coach room carry the situational label with failing conditions, and the spec records the verdict. | FR-5 |
| AC-6 | No phase lands with the probe dodge rate at zero. | FR-6 |

## Edge Cases

- Kite already at 2/6 on the current tree: the track re-baselines and the verdict becomes "viable but weak — no tool shipped, margins recorded".
- A tool fix that wins the probe but breaks cap share or median: reverted; the bound outranks the probe.
- A lever that moves wins by less than the probe's own noise: not a finding; report, don't ship.
- Probe and matrix disagree (probe fixed, matrix moves): the probe rules; matrix drift belongs to band-margin hardening, never pre-emptive.
- Dodge tool silenced as a side effect: phase fails even if wins rise.

## Dependencies

- **Tracks:** none (presentation-mapping merged as `3d9dbd23`).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** the pinned probe matchup is representative enough to judge the doctrine; matrix-wide Kite viability is explicitly not this track's question.
- **Assumption:** 2 of 6 is "viable but weak" rather than noise; a 1/6 outcome keeps the trap verdict on the table with the mechanism named.
- **Assumption:** a doctrine-level tool exists in the space of range/strafe/dodge-policy; if the diagnosis points outside it (e.g. needs a new verb), the track records that as the verdict instead of forcing it.
- **Resolved (2026-11-11, tool verdict):** the missing tool was engagement — Kite aggression 40 → 55, measured 2/6 → 5/6 on the fixed probe with paid dodges intact and every pacing bound green. The trap branch (FR-5) was evaluated and deliberately not shipped.

## References

- `conductor/product.md` — roadmap follow-up #2 (Kite verdict).
- `conductor/archive/20261111-presentation-mapping/verification/phase-R2.md` — probe figures (Kite 0/6, 24 paid dodges/fight).
- `packages/sim/src/battle/continuous/balance-report.test.ts` — doctrine probe block.
- `packages/sim/src/battle/continuous/controller-profile.ts` — Kite row and band tables.
