# refactor/feat(sim): earth & wind species line — per-tier league rewards, save v25, two voxel archetypes

## Summary

The roster reaches one species per element. Two reward species join the league — **Zephyr Falcon** (`wind_falcon`, Gold tier) and **Basalt Tortoise** (`earth_tortoise`, Legend tier) — each with a full three-stage lifecycle, champion branch forms, and an eight-move pool. The one-time Storm Gift generalizes into a **per-tier league reward record** (save v25), and two hand-authored voxel archetypes extend the determinism gate from 12 to 18 creature GLBs.

## Track

- Spec: [`conductor/archive/20261023-earth-wind-species-line/spec.md`](https://github.com/mansyar/apex-league/blob/feat/20261023-earth-wind-species-line/conductor/archive/20261023-earth-wind-species-line/spec.md)
- Plan: [`conductor/archive/20261023-earth-wind-species-line/plan.md`](https://github.com/mansyar/apex-league/blob/feat/20261023-earth-wind-species-line/conductor/archive/20261023-earth-wind-species-line/plan.md)
- Verification: `conductor/archive/20261023-earth-wind-species-line/verification/` (phase 1–4, R1, integrated)

## What happened

| Phase | Goal | Checkpoint | Evidence |
| --- | --- | --- | --- |
| 1 — Species Data & Move Pools | Both species at the stat extremes, 16 moves, learn schedules, breeding acceptance, tier-gated rival rosters, balance probes green | `8132e0b` | `verification/phase-1.md` |
| 2 — League Reward Seam & Save v25 | Storm gift → per-tier record (`claimedTiers` + `pendingRewards` queue), honest renames, lossless v24→v25 migration | `5fed606` | `verification/phase-2.md` |
| 3 — The Voxel Archetypes | `falcon` + `tortoise` builders, full registry/budget/face/stage registration, seed-42 artifacts, gate 12→18 | `4c5d29d` | `verification/phase-3.md` |
| 4 — Integration & the Full Gate | Both lifecycles end-to-end through real seams, data-only client surfaces, visual pass | `b49e2bf` | `verification/phase-4.md` |
| R1 — Review Fixes | F1 falcon whole-roll-range speed, F2 handbook roster note, F3 full-state lossless proof | `1deae83` | `verification/phase-R1.md` |

## Requirements

- [x] FR-1 — full 3-stage lifecycle for both reward species, end to end
- [x] FR-2 — two voxel archetypes, 6 new GLBs in the determinism gate, accent-tint champion branches
- [x] FR-3 — stat extremes (falcon fastest by whole roll range; tortoise highest HP/DEF, slowest)
- [x] FR-4 — 8 Earth + 8 Wind moves on the existing effect vocabulary, standard schedule, equip-4
- [x] FR-5 — per-tier grant on non-forfeit finalize, at-most-once, independent tiers
- [x] FR-6 — pure reward eggs (affinity null, no drift RNG draw, preview = hatch)
- [x] FR-7 — rivals field the new species from their tiers; six authored bosses unchanged
- [x] FR-8 — save v25 persistence + linear migration + docs updated in the same phase
- [x] FR-9 — client surfaces data-only (no special-casing)
- [x] FR-10 — standard breeding acceptance for both species
- [x] NFR-1…NFR-6 — caps, no deps, purity, boss bands, palette rules, lossless migration

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Static | `bun run check` | ✅ voxel 90 / sim 147 / client 352 files, 0 errors | phase 1–4 + integrated |
| Static | `biome check` | ✅ 569 files clean | integrated |
| Unit | `bun test --check --parallel --timeout 120000` | ✅ 2,452 pass / 1 skip / 0 fail, 126,818 expect() | integrated |
| Determinism | `bun run gate:determinism` | ✅ 18 creature GLBs byte-identical (12 pre-existing unchanged) + 5 props | integrated |
| Build | `bun run build` | ✅ exit 0 | integrated |
| Visual | `playwright-cli` against `bun run dev` | ✅ desktop + iPhone 15, 0 console errors/warnings | phase-4 |
| Guards | `module-size` suites | ✅ sim 12 KB / voxel 24 KB caps hold | integrated |

## Media

Captured against branch head `56e5f0d` (post-R1), seeded through the real sim seams:

![The Zephyr Falcon in the ranch](.conductor/media/20261023-earth-wind-species-line/ranch-falcon.png)

![Handbook type chart with the full 6×6 matrix and the updated roster note](.conductor/media/20261023-earth-wind-species-line/handbook-chart.png)

![Falcon partner detail](.conductor/media/20261023-earth-wind-species-line/detail-falcon.png)

## Review

PASS (round 2) — round 1 returned PASS WITH FINDINGS (1 Medium, 2 Low); all three fixed by Phase R1 (`1deae83`) and verified genuinely fixed in the round-2 delta re-review: falcon spd floor raised so "highest SPD" holds by whole roll range, handbook population note updated to the shipped roster, lossless test now asserts full-state equality. See `review.md`.

## Deviations and risks

- All 24 pre-existing migration steps were touched (mechanical `rewardRecordOf` reshaping, forced by the GameState field rename) — semantics preserved, verified by the golden chain suite and a full-state lossless `toEqual`.
- `cup/rival-roster.test.ts` was rewritten from a tier-blind pin to a tier-derived pin — a third reward species invalidated the old assertion.
- The falcon spd floor raise in R1 re-pinned two final-rival probe cells (both re-measured inside the unchanged 0.15–0.9 band; no band weakened).
- Risk: low. `SAVE_VERSION` 25 ships with a lossless, idempotent, deterministic migration; the twelve pre-existing GLB digests are unchanged.

## Follow-ups

- Authored `choreo.ts` body profiles for falcon/tortoise (currently the `DEFAULT_PROFILE` fallback, matching the storm hound precedent).
- Art pass on the falcon silhouette (reads chunky for a speedster); iPhone 15 starter-card nav overlap is cosmetic.

## Rollback

Plain `git revert` of the squash commit; the save v25 migration is linear and forward-only but v24 saves remain readable only through the migrated code path, so a revert should be paired with a save backup notice.
