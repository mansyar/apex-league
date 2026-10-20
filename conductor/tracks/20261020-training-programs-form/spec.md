# Raising Depth: Training Programs & Form — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track replaces tonight's single-stat training focus with four conditioning
programs that trade stat yield against energy, and makes the care loop visible
in the arena through a small, deterministic **form** modifier derived from mood,
bond and health. Today a creature's care state is invisible to the battle
resolver, and training is a straight line that runs out of decisions around day
25. After this track, preparation is a real choice — and a neglected champion
visibly underperforms a bonded one.

## Problem / Motivation

Two design gaps undermine the product pitch ("Raise the champion. Win the
league." / "battles are the exam; raising is the game"):

1. **Care never reaches the arena.** `BattleSide.stats` is built from
   `effectiveStats(creature)`, which reads `stats + trained` only. `bond`,
   `mood` and `health` appear nowhere in `packages/sim/src/battle`. At equal
   stats a beloved champion and a neglected one fight identically, so the care
   loop cannot be felt where it matters.
2. **Training is shallow and exhaustible.** `assignTraining(state, stat)` is one
   stat, +1 per night, capped at 6 — 24 focused nights total. There is no
   tradeoff, no energy cost, no failure state, and after roughly day 25 the
   training decision disappears from the dock entirely.

If this is not solved, the raising loop stays a checklist and the battle layer
stays a stat comparison, which is exactly what the product guidelines say the
game must not be.

## Goals & Success Metrics

- **Goal:** Every point of care has a legible, bounded expression at battle
  start, and training offers a repeatable decision with a real cost.
- **Metric:** A fresh creature is form-neutral (existing battle goldens stay
  byte-identical); a fully neglected creature fights at −2 ATK/−2 SPD and a
  fully bonded one at +1 ATK/+1 SPD, and the balance probe keeps every
  playable species inside the FR12 fairness bands with program-built caps.
- **Goal:** Training remains a decision after the first cap.
- **Metric:** Each program caps its primary in 6 paid nights and pays its trickle
  on every third trained night, so a creature can keep developing a second stat
  after the primary caps.

## Scope

### In Scope

- Four training programs with a primary stat and a trickle stat, replacing the
  four-way stat focus in the dock.
- A per-night energy cost and an energy gate on training payout, with a new
  `exhausted` training result.
- A derived form tier from mood/bond/health, its stat deltas, and one pure
  `battleStats()` seam used by spar, cup and every pre-fight readout.
- Save v18 with a `trainingFocus` → `trainingProgram` migration, validation, and
  `docs/save-schema.md`.
- Dock program picker, a Training tab in the creature detail modal, form on the
  cup coach room, the spar prep card and the creature plate.
- Handbook "Raising" updates and coach copy.
- Balance-probe evidence for program-built creatures.

### Out of Scope

- New species, new voxel archetypes, new moves, new elements.
- Any percentage-based HP effect from form; form never touches `hp`.
- Per-program energy costs, per-program sickness chances, or a training
  "load/periodization" system.
- Evolution branching (separate track).
- Rival creatures gaining form from care (they are generated; form is neutral
  for them by construction).
- Backend/cloud anything.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Four programs exist — `power`, `endurance`, `sprint`, `ring` — each with a display label, a one-line tradeoff blurb, a primary stat, and a trickle stat (`power`: ATK/DEF, `endurance`: HP/DEF, `sprint`: SPD/ATK, `ring`: ATK/DEF). | must |
| FR-2 | At most one program may be assigned per day. The first assignment of the day costs 1 AP and advances `trainingDays` by 1; re-assigning the same day is free, does not spend AP, and does not advance `trainingDays` (today's re-point rule, kept). | must |
| FR-3 | `assignTraining` rejects with `no-creature`, `no-ap`, or `at-cap`; `at-cap` now means the chosen program's **primary** stat is at `TRAINING_CAP`. Clearing the assignment is allowed and free. | must |
| FR-4 | A program night costs 10 energy and pays +1 to the primary stat only when, at lights-out and before night recovery, the creature was not sick, was not starving, and had energy ≥ `EXHAUSTED_ENERGY` (30). A night that does not pay costs no energy. | must |
| FR-5 | Every third trained night (`trainingDays % 3 === 0`) a paying night also grants +1 to the program's trickle stat. Both components clamp at `TRAINING_CAP`. | must |
| FR-6 | `ring` additionally grants mood +5 and bond +2 on any paying night. | should |
| FR-7 | `TrainingResult` gains `"exhausted"`, and the pre-night preview returns the projected result plus the exact stat deltas for the assigned program, before AP is spent. | must |
| FR-8 | `formTier(creature)` returns `sharp`, `steady`, `flat`, or `sluggish` from `0.6 × mood + 0.4 × bond` (≥65 sharp, 40–64 steady, 20–39 flat, <20 sluggish), except that any creature with health < `SICK_HEALTH` (80) is pinned to `sluggish`. Starting conditions (mood 60, bond 10, health 100) are `steady`. | must |
| FR-9 | `battleStats(creature)` returns `effectiveStats` plus the form deltas (`sharp` +1 ATK/+1 SPD, `steady` 0, `flat` −1 ATK/−1 SPD, `sluggish` −2 ATK/−2 SPD), each stat floored at 1. It is the single seam used for the owned side of a spar, the cup entry snapshot, and every client stat readout that feeds a fight. | must |
| FR-10 | Form never changes bracket seeding or rival generation: `prepareCup`/`makeBracket` keep seeding from `effectiveStats`, and generated rivals keep their rolled stats, so form cannot reshuffle a bracket or alter an opponent. | must |
| FR-11 | Save v18 stores `trainingProgram: TrainingProgram \| null` in place of `trainingFocus: StatKey \| null`. The v17→v18 migration maps `hp→endurance`, `atk→power`, `def→power`, `spd→sprint`, `null→null`. Validation rejects an unknown program id. `docs/save-schema.md` documents v18 and the mapping. | must |
| FR-12 | The dock's train control is a program picker: four rows with label, one-line tradeoff, tonight's projected gains, and a clear capped/tired note; the button label reflects the assigned program. The picker is reachable and operable by keyboard, and disabled exactly as today when every primary stat is capped or AP is 0 with no assignment. | must |
| FR-13 | The creature detail modal gains a Training tab showing the assigned program, trained nights, the next breakthrough night, form tier with its deltas, and the program table. | should |
| FR-14 | The cup coach room and the spar prep card show the form tier and a plain-language consequence line next to the stat readout; the creature plate carries a form chip. | should |
| FR-15 | The handbook "Raising" section explains programs, the energy gate, breakthrough nights, and form; coach copy uses the same wording as the dock. | should |
| FR-16 | A balance probe builds a capped creature per playable species under each program mix through the public sim API and records win rates against the FR12 bands, with the result written to phase evidence. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism: settlement adds no RNG draw; identical save + seed produces identical battles; the determinism gate stays green. |
| NFR-2 | Golden stability: with no program assigned and starting conditions, cup and spar battle goldens remain byte-identical to v17 output. |
| NFR-3 | Save safety: the v0→v18 chain loads, a v17 fixture migrates to a mapped program, a corrupt program id makes `loadGame` return null, and save/load round-trips. |
| NFR-4 | Every client module stays ≤ 12,288 B under `module-size.test.ts`; split rather than grow a near-cap module. |
| NFR-5 | Accessibility: form is conveyed in text, never by color alone; the program picker has a sane focus order; reduced-motion behavior is unchanged. |
| NFR-6 | Performance: form is O(1), pure, and computed on demand — no per-frame work, no new dependency. |
| NFR-7 | Test-first on sim surfaces: form tiers, program payout, energy gate, migration and the battle seam each land with a failing test first. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `battleStats` equals `effectiveStats` for a freshly created creature, and `formTier` is `steady`. | FR-8, FR-9 |
| AC-2 | A creature with mood 100 and bond 100 yields +1 ATK/+1 SPD; mood 20 and bond 0 yields −2/−2; any sick creature yields the sluggish delta regardless of mood. | FR-8, FR-9 |
| AC-3 | Assigning `power` spends 1 AP once, and re-pointing to `sprint` on the same day costs nothing and leaves `trainingDays` unchanged. | FR-2 |
| AC-4 | A rested, fed creature trickles +1 ATK and −10 energy over a program night; the same creature at energy 30 still pays, at 29 it reports `exhausted` and pays nothing. | FR-4, FR-7 |
| AC-5 | The third paid night also grants the trickle stat, and neither component exceeds `TRAINING_CAP`. | FR-5 |
| AC-6 | Assigning a program whose primary is capped is rejected with `at-cap`; assigning one whose trickle is capped is allowed. | FR-3 |
| AC-7 | A v17 save with `trainingFocus: "spd"` loads with `trainingProgram: "sprint"`, and one with `trainingFocus: "def"` loads with `"power"`. | FR-11 |
| AC-8 | `bun run verify` is green, including determinism. | NFR-1, NFR-3 |
| AC-9 | The balance probe reports every playable species inside the FR12 band under each program mix. | FR-16 |
| AC-10 | The dock picker, Training tab, coach-room form line, spar form line and plate chip all render on desktop and at 393×659 without clipping, with keyboard-only operation verified. | FR-12, FR-13, FR-14, NFR-5 |

## Edge Cases

- Energy exactly 30 pays; 29 does not. The check reads pre-recovery energy.
- A creature that wakes starving or sick pays nothing and loses no energy; the
  failure state is "no gain", never a double penalty.
- A creature whose primary is capped but whose trickle is not is steered to a
  different program rather than paying into a capped stat.
- Evolution landing on the same night: program payout applies first, evolution
  boosts after, matching today's settlement order.
- Default/corrupt save value: a missing `trainingProgram` in a v17 payload maps
  to `null`; an unknown id fails validation.
- All four primaries capped: the dock's train control is disabled with the
  existing "as sharp as it can get" style note.
- Cup day or cup phase: assignment stays unavailable exactly as today (the dock
  is not reachable mid-cup); the cup snapshot is frozen at entry.
- A save imported mid-cup keeps the frozen stats; form is not recomputed
  mid-bracket.

## Dependencies

- **Tracks:** none. This builds on the shipped live-cup session, the save v17
  chain and the client decomposition.
- **External:** none. No new services, credentials or artifacts.

## Open Questions & Assumptions

- **Question:** Should DEF eventually get a dedicated program?
  **Assumption:** `power` and `ring` cover DEF for now; a fifth program is
  deferred until the ladder needs it.
- **Question:** Should the trickle cadence be per-program rather than lifetime?
  **Assumption:** Lifetime (`trainingDays % 3`) — no new persisted counter, and
  it reads as a "breakthrough night" every three trained nights.
- **Assumption:** Energy cost is flat 10 for all four programs, including `ring`.
- **Assumption:** Form deliberately excludes HP so the FR12 probe bands and the
  doubled-HP tuning stay untouched.
- **Assumption:** Rival creatures are form-neutral because they are generated at
  starting conditions; no rival balancing pass is required.

## References

- `conductor/product.md` — raising loop, "battles are the exam", Phase 2 status.
- `conductor/product-guidelines.md` — coach voice, legible previews, never
  punishing, color never the sole carrier.
- `conductor/learnings.md` §12 — measure through `resolveBattle`, probe sweeps.
- `docs/save-schema.md` — v17 shape and the additive migration recipe.
- `packages/sim/src/battle/tactics.balance.test.ts`,
  `packages/sim/src/bosses.balance.test.ts` — the FR12 fairness bands.
