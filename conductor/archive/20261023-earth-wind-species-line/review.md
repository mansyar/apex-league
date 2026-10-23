# Review — Earth & Wind Species Line

- **Verdict:** PASS (round 2 re-review; round 1 was PASS WITH FINDINGS, all findings fixed by Phase R1)
- **Track:** 20261023-earth-wind-species-line · **Type:** feature
- **Branch:** `feat/20261023-earth-wind-species-line`
- **Range:** `e9fea33945c340e7a5e33d81a88796547fe71302..3bc03df` (excluding `conductor/`)
- **Date:** 2026-10-23

## Summary

The earth/wind species line is faithfully implemented with green gates (2,452 tests, biome 569 files, typecheck, 18-GLB determinism gate, build) and a verifiably lossless v24→v25 migration. The reviewer independently scrutinized every migration step's reshaping through `rewardRecordOf` (v21's seed formula unchanged, hatched-marker logic unchanged), the grant edge cases (past-tier, forfeits, ascending order, promotion-cup, idempotence, purity — all pinned), and the deviation record (existing test edits are renames/version pins only except `rival-roster.test.ts`, whose tier-blind pin was genuinely invalidated by a third reward species). One Medium gap remains on the falcon "highest SPD" assertion and two Low copy/test-rigor nits.

## Verification

| Layer | Command | Result | Summary |
| --- | --- | --- | --- |
| Test | `bun test --timeout 120000` | pass | 2,452 pass / 1 skip / 0 fail, 126,818 expect() across 194 files (incl. the three module-size guards). |
| Lint/format | `biome check` (via `bun run verify`) | pass | 569 files clean, no fixes needed (bare `bunx biome check` denied in the reviewer sandbox; the primary's direct run was 569 files, exit 0). |
| Typecheck | `bun run check` | pass | 0 type errors — voxel 90 / sim 147 / client 352 files. |
| Determinism | `bun run gate:determinism` | pass | 18 creature GLBs byte-identical (incl. falcon/tortoise × 3 stages) + 5 prop digests. |
| Build | `bun run build` | pass | Production build exit 0; pre-existing >500 kB chunk-size warning only. |
| Integrated | `bun run verify` | pass | Green end to end. |
| Coverage | — | n/a | `coverage.gate: "none"` (not configured). |

## Volume strategy

LARGE — per-phase checkpoint diffs (`86e6ef5..8132e0b`, `02dfc2c..5fed606`, `eebda52..4c5d29d`, `f432798..b49e2bf`), then the cross-phase integration diff `e9fea33..HEAD` excluding `conductor/`. GLBs/manifests treated as generated artifacts.

## Requirements coverage

| Requirement | Task | Test / evidence | Status |
| --- | --- | --- | --- |
| FR-1 lifecycle end-to-end | P4.T1 | `lifecycle-integration.test.ts` (grant → hatch → raise → branch → real cup win, both species) | covered |
| FR-2 archetypes + gate | P3.T1-T3 | gate 18 GLBs byte-identical; `falcon.test.ts`/`tortoise.test.ts`; stage signatures | covered |
| FR-3 stat extremes | P1.T1 | `species.test.ts:222-244` (falcon), `:329-350` (tortoise); probes | **partial** → F1 |
| FR-4 move pools | P1.T2 | `moves.test.ts` earth/wind kit describes (schedule, equip-4, sibling-signature) | covered |
| FR-5 per-tier grant | P2.T1 | `cup/league-reward.test.ts` (forfeit, past-tier, promotion, idempotence, purity) | covered |
| FR-6 pure eggs | P2.T1/T4 | drift-stream purity + `giftSave.test.ts` round trips | covered |
| FR-7 rivals + bosses | P1.T3 | roster pools derived from `obtainableSpecies`; boss-side byte pins; `bosses.ts` 0-delta | covered |
| FR-8 save v25 + docs | P2.T2 | v24 mapping/lossless/validation describes; `docs/save-schema.md`; chain 0→24 | covered |
| FR-9 client data-only | P4.T2 | accessors + visual pass (0 console errors/warnings) | covered |
| FR-10 breeding | P1.T3 | species breeding tests extended to falcon/tortoise pairs | covered |
| NFR-1 caps | all | module-size guards green; sizes under cap | covered |
| NFR-2 no deps + determinism | all | `bun.lock` 0-delta; gate green | covered |
| NFR-3 sim purity | P2.T1 | purity tests; seed from day/points only | covered |
| NFR-4 boss bands | all | golden suites untouched and green; byte pins | covered |
| NFR-5 palette rules | P3.T1-T2 | hue 165/28 pins; shared face/palette pipeline; visual pass | covered |
| NFR-6 lossless migration | P2.T2 | v24→v25 mapping tests; reshaped v0-v23 semantics preserved | covered (test rigor → F3) |
| AC-1…AC-10 | P1-P4 | per-phase evidence tables + integrated.md | covered |

## Findings

### F1 · Medium · `packages/sim/src/species.test.ts:222-228`

- **What:** The falcon "highest SPD" assertion checks only per-bound dominance (`spd[0] > other spd[0]`, `spd[1] > other spd[1]`) while the bounds keep an overlap: `electric_hound` rolls up to spd 16 against falcon's floor 15, so an individual hound can out-roll a falcon.
- **Why:** FR-3 (spec.md:47) grants wind_falcon "highest SPD", and the house convention for that claim is whole-roll-range dominance — the hound test (`species.test.ts:101-103`) asserts `spd[0]` ≥ the fastest starter's ceiling. As written the criterion is satisfiable by a weaker reading.
- **Fix:** Raise the falcon spd floor to 17 (bounds `[17, 19]`) so no existing species can out-roll it, then re-pin the balance-probe tallies that shift; or keep the bounds and pin the weaker "highest SPD ceiling" reading explicitly. **Disposition (primary): fix the bounds** — the stronger reading is the spec's intent and the species is unshipped new content, so this is a mechanical data fix, not a balance change to shipped content.
- **Requirement:** FR-3 · **Test gap:** assert `falcon.statBounds.spd[0] > every other species' statBounds.spd[1]`.

### F2 · Low · `apps/client/src/handbook/chart.ts:21-24`

- **What:** The handbook's population note still reads "Earth and Wind matchups are charted and waiting for their species", which this track makes false.
- **Why:** Player-facing copy in the handbook directly contradicts the shipped feature.
- **Fix:** Update `POPULATION_NOTE` to the current roster: three starters + the Silver/Gold/Legend reward lines (hound, falcon, tortoise).
- **Requirement:** FR-9.

### F3 · Low · `packages/sim/src/save/giftSave.test.ts:250-264`

- **What:** The test titled "the mapping is lossless — the migrated state equals the equivalent v25 state" asserts only `claimedTiers` and `pendingRewards`, not full-state equality.
- **Why:** The title promises more than the body proves; full-state losslessness rests on inference from the field-by-field forward plus chain tests rather than one direct `toEqual`.
- **Fix:** Build `equivalent` as a full GameState and assert `expect(migrated.state).toEqual(equivalent)`.
- **Requirement:** NFR-6.

## Overrides

None.

## Plan compliance

| Phase | Status | Checkpoint | Evidence |
| --- | --- | --- | --- |
| Phase 1: Species Data & Move Pools | verified | `8132e0b` | `verification/phase-1.md` |
| Phase 2: The League Reward Seam & Save v25 | verified | `5fed606` | `verification/phase-2.md` |
| Phase 3: The Voxel Archetypes | verified | `4c5d29d` | `verification/phase-3.md` |
| Phase 4: Integration & the Full Gate | verified | `b49e2bf` | `verification/phase-4.md` |

15/15 top-level tasks `[x]`; the final diff stays within the union of the phases' Touches except the recorded deviations. Note: the Phase 3 `Status` line correction rode in the Phase 4 completion commit (`cab8f4d`) — the checkpoint was already recorded in metadata at Phase 3 acceptance.

## Out of scope

- `choreo.ts` `profileFor()` falls back to `DEFAULT_PROFILE` for falcon/tortoise — by design, matching the storm_hound precedent; an authored profile is a future polish item, not a defect of this diff.
- Eggs granted in one finalize share `leagueRewardSeed(day, points)` — deterministic by design; distinct species bounds keep individuals distinct.
- Voxel palette hues hardcoded per archetype (established template convention; `element.ts` carries the UI hues) — pre-existing practice, no cross-package pin exists.
- Falcon silhouette chunkiness / iPhone 15 starter-card nav overlap — art-pass polish notes.

## Debt

None — `review.strict` is `true`, so all three findings are fixed in the review-fix phase rather than deferred; `review.issues.enabled` is `false`, so no issues are filed.

## Doc sync

updated (pre-review sync committed as `3bc03df`; the review-fix changes touch no contract documented there)

## History

| Round | Verdict | Critical | High | Medium | Low | Fixes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 2 | → Phase R1 (`1deae83`), verified |
| 2 | PASS | 0 | 0 | 0 | 0 | — all three round-1 findings verified fixed; no new findings; gates re-run green |
