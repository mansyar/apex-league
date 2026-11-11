## Summary

Long moves now have a blind spot. Every frame row carries an authored
`minReachMm` (90 mm on all 42 rows with `reachMm >= 5000`, `0` on the six short
rows and the innate basic), and strikes and shots resolve only inside
`[minReach + both radii, reach + both radii]`; a blow that fails only the inner
edge reports a `range` miss instead of a silent geometry rejection. The chooser
judges the gap at the move's **active frame**, and a fighter with no landing move
fires a backing shot that gives ground so the launch opens past the inner edge,
falling back to a step back and then to the basic.

Telemetry's sample grew from 14 to 42 fights, all thirteen bounds were re-derived
with before/after figures, and a fourteenth metric (`deadZoneShare`, 2.4%) gates
the blind spot. The client's tell wedge derives its inner edge from the same
authored value. `SIM_VERSION` is 3.

## Track

- **ID:** `20261111-minimum-reach`
- **Type:** feature
- **Spec:** [`conductor/archive/20261111-minimum-reach/spec.md`](conductor/archive/20261111-minimum-reach/spec.md)
- **Plan:** [`conductor/archive/20261111-minimum-reach/plan.md`](conductor/archive/20261111-minimum-reach/plan.md)
- **Review:** [`conductor/archive/20261111-minimum-reach/review.md`](conductor/archive/20261111-minimum-reach/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Authored minimum reach | every frame row carries a validated `minReachMm` | verified | `493f201a` | field + tenth builder arg + two validator rules; 42 rows authored |
| 2: Interval geometry, the range miss, and the controller | blows resolve inside an interval; the chooser respects it | verified | `dd3ab23d` | merged with the old Phase 3 so every checkpoint stayed green; value held at 0 until the sample was fixed |
| 3: Widen the telemetry sample and re-derive its bounds | the gate can measure the change | verified | `09ca1ee3` | 42 fights = the same 14 pairings × 3 seeds, so the first fight still matches byte for byte; 9 of 13 bounds kept, retreat floors and `capShare` re-derived under the approved FR-7 exception |
| 4: The chooser strikes from where the blow lands | commit only where the blow lands; answer the blind spot | verified | `32e1044f` | active-frame gap, backing shot, step back; 90 mm authored after a sweep of 1,000 → 50 mm |
| 5: The wedge tells the truth | the tell draws its inner edge | verified | `9ef1ebcb` | client-only; `tellInnerWorld`, no stream word, replay hash unchanged |

Three design decisions were reversed by measurement during Phase 4 and are
recorded in the spec's Open Questions: the first-pass 1,200 mm value (it
deadlocked the doctrine hold point), avoid-only AI (it cost `voltfox` 3.8σ of win
rate), and the band-lift alternative (the projection-aware chooser was chosen
instead).

## Requirements

- [x] `FR-1` — authored `minReachMm`, `0 ≤ minReach < reach`, basic pinned 0
- [x] `FR-2` — one integer interval test shared by strikes and shots
- [x] `FR-3` — a shot is judged at its launch gap; inside the inner edge it passes and is spent
- [x] `FR-4` — chooser and punish chooser reject a move whose active-frame gap is outside the interval; basic is the fallback
- [x] `FR-5` — a distinct `range` miss, never reported as `accuracy` or a dodge
- [x] `FR-6` — the balance gate is green on the final tree
- [x] `FR-7` — widened sample, re-derived bounds, one gated dead-zone metric
- [x] `FR-8` — `SIM_VERSION` 3
- [x] `FR-9` — the tell wedge shows the inner edge
- [x] `FR-10` — a backing shot, then a step back, then the basic
- [x] `NFR-1` — integer arithmetic, no new RNG stream, same seed → same hash
- [x] `NFR-2` — no bound widened except the approved sample re-derivation
- [x] `NFR-3` — every phase inside the time budget
- [x] `NFR-4` — no new stream field
- [x] `AC-1` … `AC-10` — see `verification/integrated.md`

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit + static + determinism | `bun run verify` | pass — 4,146 pass / 1 skip / 0 fail, 4,147 tests / 373 files, biome 933 files, 46 GLBs + 5 props byte-identical | `conductor/archive/20261111-minimum-reach/verification/integrated.md` |
| balance | `bun run balance` | pass — 840 fights, 15/15 species, cap 26.7%, decisive 95.6%, 49/49 moves in the 4–12% band | same |
| telemetry | `bun run telemetry` | pass — 14/14 bounds, `deadZoneShare` 2.4%, `capShare` 59.5% (≤ 60.0%) | same |
| trace | `bun run trace --seed 20261111 --check` | pass — hash `0xb6cce858`, 5 invariants | same |
| build | `bun run build` | pass — 418 modules | same |

## Review

- **Verdict:** `PASS WITH DEBT`
- **Rounds:** 1
- **Fixed:** 8 findings (four Medium: stale `capShare` / `deadZoneShare` rationales, the test that repeated them, and FR-3's swept-contact wording; four Low: an unseeing metric pin, an overstated `inReach` doc, misattributed trace hashes, two stale comments)
- **Accepted/deferred:** 2 (`hurricane_spiral`'s line wrapping; the debt below)

## Deviations and risks

- **`capShare` has 0.5 points of headroom** (59.5% vs 60.0%) on the 42-fight
  sample while the 840-fight matrix reads 26.7%. Fixed seeds cannot flake, the
  value cannot move down (50/75 mm fail telemetry) or up (100 mm fails the roster
  by one `embercub` win), and the bound was re-derived once under the approved
  exception. **Any future mechanic that lengthens fights trips this first.**
- **The authored value is gate-limited, not tuned.** The accepted window is
  ~85–99 mm because the effective blind spot is `minReachMm + closing × startup`
  — a switch near the basic's standoff, not a dial.
- **The wedge's hole is invisible at 90 mm** (0.248 world, under the wedge's
  fixed inner floor of 0.3). The derivation is correct and tested; the hole
  appears once an authored value clears ~155 mm.
- **Five test files outside the declared Touches were re-pinned** (cup goldens,
  cup contracts, bracket model, morning-after derive, and Phase 5's new playback
  test) — values and seeds only, each with a comment, no assertion weakened.
- **`damage.ts` was extracted** from `strike.ts` because `strike.ts` had 71 B of
  module-cap headroom; `StrikeStats`, `NEUTRAL_STATS` and `typeAgainst` moved and
  are re-exported, so no caller changed.
- **Save compatibility:** `SIM_VERSION` 2 → 3 means v2 ghost bundles no longer
  verify; cup saves are unaffected.

## Follow-ups

- none opened (issues are disabled for this repo); the debt above lives in
  `verification/integrated.md` and `review.md`.

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

No migration and no feature flag. Reverting restores the one-sided reach test and
the 14-fight telemetry sample; any ghost bundle built after this track (v3) will
stop verifying against a reverted tree, which is the intended behaviour.
