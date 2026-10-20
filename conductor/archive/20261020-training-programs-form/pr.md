## Summary

Training is now a choice of four conditioning programs rather than a single stat pick: each night spends 10 Energy to build its primary stat, pays a trickle on every third trained night, and dries up when the partner is sick, starving or under 30 Energy. Care also reaches the arena for the first time — a derived form tier reads mood, bond and health and moves ATK by ±1/±2 through one `battleStats()` seam, so a bonded partner hits harder and a neglected one hits softer. Save v18 migrates the old `trainingFocus` value, and the dock picker, detail-modal Training tab, coach room, spar card, plate chip and handbook all explain the trade.

## Track

- **ID:** `20261020-training-programs-form`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261020-training-programs-form/spec.md`](conductor/archive/20261020-training-programs-form/spec.md)
- **Plan:** [`conductor/archive/20261020-training-programs-form/plan.md`](conductor/archive/20261020-training-programs-form/plan.md)
- **Review:** [`conductor/archive/20261020-training-programs-form/review.md`](conductor/archive/20261020-training-programs-form/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Form Model | Pure form model in `@apex/sim`, neutral for a fresh creature | verified | `411f20c` | Steady band starts at 40 so starting mood 60 / bond 10 is neutral and the existing goldens stay byte-identical |
| 2: Training Programs and Save v18 | Programs replace focus end to end; night payout per spec; v18 migration | verified | `26e8d1c` | Trickle cadence is lifetime `trainingDays`; `trainingPlan` is the single source for payout and preview |
| 3: Battle Wiring and Balance Evidence | Form reaches the arena through one seam; brackets and rivals unchanged | verified | `47e7cb6` | Probe measured ±1/±2 ATK+SPD breaking the FR12 band, so form was narrowed to ATK only and AC-9's per-tier floor set at 15% |
| 4: Dock Picker and Training Tab | Ranch surfaces programs legibly and keyboard-operably | verified | `c69f9cf` | Ring Craft's mood/bond payoff is shown; assigned chip made legible; narrow sheet measured at 393x659 |
| 5: Form in the Fight Surfaces, Handbook and Docs Sync | Fight surfaces, handbook, README and tech-stack | verified | `d7d9a86` | `.cup-form` collapsed the sentence in a two-column grid, fixed to a column |
| R1: Review Fixes | Close F1–F6 | verified | `2ed7781` | Projection moved into the sim (`previewProgram`), breakthrough line counts tonight, focus lands in the sheet |

## Requirements

- [x] `FR-1` Four programs with primary and trickle stats (`packages/sim/src/training.test.ts`)
- [x] `FR-2` One program a day, first assignment 1 AP, re-point free (`care.test.ts`)
- [x] `FR-3` Rejections `no-creature`, `no-ap`, `at-cap` (`care.test.ts`)
- [x] `FR-4` 10 Energy on paying nights, gated at 30, nothing on sick/starving nights (`settlement.test.ts`)
- [x] `FR-5` Trickle every third trained night, both capped at +6 (`settlement.test.ts`)
- [x] `FR-6` Ring Craft lifts mood and bond on paying nights (`settlement.test.ts`)
- [x] `FR-7` `exhausted` result and exact-delta preview (`settlement.test.ts`)
- [x] `FR-8` Form tiers from mood, bond and health, sick pinned (`form.test.ts`)
- [x] `FR-9` `battleStats` as the single ATK-only seam (`form.test.ts`, `battle/form-seam.test.ts`)
- [x] `FR-10` Form never touches bracket seeding or rivals (`cup/form-seam.test.ts`)
- [x] `FR-11` Save v18 with `trainingProgram` and the focus mapping (`save/*`, `docs/save-schema.md`)
- [x] `FR-12` Dock picker rows with tradeoffs and tonight's projection (`hud/programs.test.ts`)
- [x] `FR-13` Training tab with program, progress, form and the program table (`detail/training-tab.test.ts`)
- [x] `FR-14` Form on the coach room, spar card and plate chip (`hud/copy.test.ts`, `hud/plates.test.ts`)
- [x] `FR-15` Handbook Raising section (`handbook.test.ts`)
- [x] `FR-16` Balance probe per species and program mix (`battle/form.balance.test.ts`, phase 3 evidence)
- [x] `NFR-1` No new RNG draw, determinism gate green
- [x] `NFR-2` Fresh-creature goldens byte-identical
- [x] `NFR-3` v0→v18 chain, corrupt program id refused, round-trip
- [x] `NFR-4` Every client module under 12,288 B
- [x] `NFR-5` Form conveyed in text, focus order sane, reduced motion unchanged
- [x] `AC-1`…`AC-10` per `verification/integrated.md`

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --timeout 120000` | pass — 1924 pass / 1 skip / 0 fail, 149 files | `verification/integrated.md` |
| static | `bun run check` | pass — 62 / 86 / 297 files | `verification/phase-r1.md` |
| lint | `bunx --bun biome check` | pass — 0 errors, 7 pre-existing warnings | `verification/phase-r1.md` |
| determinism | `bun run gate:determinism` | pass — nine GLBs byte-identical, 5 prop digests match | `verification/integrated.md` |
| build | `bun run build` | pass — 241 modules, 835.25 kB / 228.32 kB gzip | `verification/phase-r1.md` |
| visual | desktop + 393x659 browser pass, keyboard-only drive | pass | `verification/phase-4.md`, `phase-5.md`, `phase-r1.md` |

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 6 findings (F1 High, F2/F3 Medium, F4/F5/F6 Low)
- **Accepted/deferred:** 0 (strict review)

## Deviations and risks

- Form moves ATK only. The phase 3 probe showed ±1/±2 SPD flips initiative on the FR12 fixtures, which moved cells from 63.9% to 91.7% (sharp) and 0.0% (sluggish) against Koda; the spec records the decision (`spec.md`, "Decision (2026-10-20, phase 3)").
- AC-9's per-tier guardrail is a 15% floor rather than 25%: four soft cells at flat/sluggish bottom out at 16.7% (Delmar × fire_drake sluggish, 6 of 36) and no lever inside FR-9 fixes them without making sluggish identical to flat.
- `cup-contracts.test.ts`'s day-7 fixture was repaired to `CONDITION_START`: the old fixture arrived sick and starved after `advanceDay`, and the new form read would have moved two lifecycle goldens that are unrelated to form.
- Pre-existing, out of scope: a real four-move 24-night build clears every boss at 79–100% while the FR12 probe uses the two-move birth kit — the boss calibration gap needs its own track.

## Follow-ups

- none filed (issues disabled in this repository); the boss-calibration gap is recorded in `review.md` under Out of scope.

## Rollback

```bash
# Squash merge commit
git revert --no-edit <merge-commit>

# Or revert the track's commits
git revert --no-edit d7d9a86 2ed7781
```

Save note: v18 is additive. Reverting the code leaves existing v18 saves unreadable by
the older build (it expects v17 and the `trainingFocus` field), so a rollback should be a
save reset or a forward fix, not a drop to `main`.
