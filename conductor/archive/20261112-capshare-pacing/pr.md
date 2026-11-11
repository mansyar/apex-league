## Summary

The 42-fight telemetry gate read **59.5% cap share** while the 840-fight balance
matrix read **26.7%** on the same tree. The fixture was the problem: its roster walk
was `away = (i * 5 + 7) % 15` with `gcd(5, 15) = 5`, so only **three** species ever
appeared on the away side, and it played each pairing three times, so ten stalled
pairings contributed twenty-five caps. It was measuring its own composition.

This track re-composes the sample to **42 distinct pairings, one seed each**, drawn
by a written stride-11 rule, and the gate now reads **20/42 (47.6%)** against a 21/42
target with every other bound untouched. It also diagnoses every one of the original
25 time-outs, and — after six measured rungs — **withdraws** the attempt to "fix" the
tortoise, because its caps turned out to be its identity working. An identity guard
now makes that permanent.

**No simulation code changed.** `SIM_VERSION` stays 3, the replay hash is unmoved,
and `rewards.ts` is byte-identical.

## Track

- **ID:** `20261112-capshare-pacing`
- **Type:** chore · **Priority:** high
- **Spec:** [spec.md](../../conductor/archive/20261112-capshare-pacing/spec.md)
- **Plan:** [plan.md](../../conductor/archive/20261112-capshare-pacing/plan.md)
- **Review:** [review.md](../../conductor/archive/20261112-capshare-pacing/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1 | Diagnose the stall | verified | `8023c00f` | 25 time-outs named per fight. Nine were the tortoise's own, sixteen were global throughput. Corrected the brief's "12 of 25" to 15. |
| 2 | The tortoise fixes itself, not its identity | **blocked** | `99d2a618` | Six identity-preserving rungs: every green one resolves **zero** of the nine collapse fights; the cheapest that resolves any takes the species to 65.2% and the matrix red. Fix withdrawn, guard kept. |
| 3 | A sample that measures the roster | verified | `c08ff05a` | 42 distinct pairings, cap 20/42 (47.6%), no bound moved. |
| R1 | Review fixes | verified | `3bab33c7` | Five findings (1 Medium, 4 Low), all documentation accuracy. |

**The tortoise was not fixed, deliberately.** It sits at **52.7%** on the 840-fight
matrix *as an outlaster*, and this project already rules that a cap win is an
outlasting win (`decisive share 95.6%; 615 ko + 188 cap wins at ≥ 5.00 pts`). Making
it knock opponents out is what breaks it. `identity.test.ts` pins `spd` exactly
`[3, 5]`, `hp`/`def` as floors, `temperament: "slow"`, `archetypeId: "tortoise"`,
`element: "earth"`, and its kit as a set of its own six moves — written and made
green **before** any value was touched, so it is a fence and not a wish.

## Requirements

- [x] FR-1 — every time-out named with its stalling side and reason (`verification/phase-1.md` Tables A and B)
- [x] FR-2 — **Withdrawn 2026-11-12** with the six-rung evidence; no species value ships changed
- [x] FR-2a — the identity guard pins all six invariants (`packages/sim/src/species/identity.test.ts`)
- [x] FR-3 — 42 distinct pairings by a written rule, no mirrors, full home/away coverage (`telemetry.test.ts` composition pin)
- [x] FR-4 — `capShare` at most 21/42 with the `3/5` ceiling unchanged in the source
- [x] FR-5 — `bun run balance` green: 15/15 species, cap 26.7%, median 31.21 s, decisive 95.6%, 49/49 moves
- [x] FR-6 — no `test.failing` promoted or `.skip` added; `pacing.test.ts` untouched and re-run
- [x] FR-7 — `SIM_VERSION` still 3; no policy or frame-data file in the diff
- [x] FR-8 — every other `BOUNDS` value byte-identical; no floor, tolerance or `DISTINCT_FLOOR` moved
- [x] FR-9 — both readings recorded side by side with a not-comparable statement
- [x] NFR-1 — integer arithmetic unchanged; trace hash `0xb6cce858` identical to the base
- [x] NFR-2 — no bound widened or lowered; the composition change is recorded before/after
- [x] NFR-3 — the telemetry leg runs well inside budget
- [x] NFR-4 — no stream field added; no `apps/` file in the diff

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Gate | `bun run telemetry` | exit 0 — 14/14 bounds, cap 20/42 (47.6%), dead zone 2.9% | `verification/integrated.md` |
| Balance | `bun run balance` | exit 0 — 840 fights, 15/15 species, cap 26.7%, median 31.21 s, decisive 95.6%, 49/49 moves | `verification/integrated.md` |
| Determinism | `bun run trace --seed 20261111 --check` | exit 0 — hash `0xb6cce858`, 5/5 invariants | `verification/integrated.md` |
| Static + unit | `bun run verify` | exit 0 — 4,151 pass / 1 skip / 0 fail; 4,152 tests across 374 files; Biome 935 files; determinism 46 GLBs + 5 props | `verification/integrated.md` |
| Build | `bun run build` | exit 0 — only the pre-existing >500 kB chunk warning | `verification/integrated.md` |

## Media

None — no visual change.

## Review

- **Verdict:** PASS WITH FINDINGS
- **Rounds:** 1
- **Fixed:** 5 of 5 (F1 Medium: an unmeasured attribution stated as fact; F2–F5 Low: spec figures, "every green rung", stale `BOUNDS` rationale, mislabelled AC verdicts)
- **Accepted-deferred:** the one-in-three cap target (20/42, still owed) and debts D-1/D-2/D-4 below

## Deviations and risks

- **The phase 2 goal was not met, and the phase is recorded as `blocked`.** The
  spec was amended the same day: FR-2 and AC-2 are **Withdrawn** with the evidence,
  FR-2a/AC-2a ship. This is a withdrawal on measurement, not a scope cut.
- **AC-8 was amended.** It froze `deadZoneShare` at 2.4%; the reading is 2.9%
  because the fight set changed, not the mechanic. Amended with a dated note rather
  than ticked.
- **The fixture still reads 47.6% against the matrix's 26.7%**, and the track does
  **not** claim to know why: the samples differ in stat basis (reference bodies vs
  bounds midpoints) *and* doctrine mix (press-vs-kite vs press-vs-press), and no
  measurement separates them. Recorded as D-4 with the isolation step written down.
- **The `capShare` ceiling is untouched at 3/5.** The target of 21/42 is asserted in
  the test; the ceiling remains the bound.
- **No simulation file changed**, so no ghost bundle is invalidated. `rewards.ts` is
  byte-identical to the base, proven by `git diff --stat`.

## Follow-ups

Issues are disabled for this repository, so the debts live in
`verification/integrated.md`:

- **D-1** — global pacing: sixteen of the original time-outs had both sides
  converting; 2.5–7.6 dps against 160–189 HP pools needs 41–73 s against a 40 s cap.
- **D-2** — the kite doctrine's floor (1,472–1,600 mm) is unholdable at `spd 5`.
- **D-3** — the spec's one-in-three target is still missed at 20/42.
- **D-4** — the fixture is not a sample of the matrix's fight population; add a
  reference-line cap share to `battle-balance-report.ts` before acting on either
  suspected cause.

## Rollback

Squash-merged, so revert the single commit on `main`:

```bash
git revert <squash-sha>
```

The revert restores the old 14 × 3 walk and removes the identity guard. It cannot
change any fight outcome: no simulation file is touched by this track, and the
replay hash is identical on both sides of it.
