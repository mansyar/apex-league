## Summary

This doc-only chore ratifies the stable/ranch policy that the product already implied: the stable is unlimited, exactly one pet is active in the ranch, and there is no permanent release seam. It also aligns `docs/save-schema.md` with the shipped `SAVE_VERSION = 26`, records the shipped `v25 ΓåÆ v26` stat-fold migration, and pins a revisit trigger for changing these decisions later. No game code, save version, migration, dependency, or generated file changed.

## Track

- **ID:** `20261126-stable-capacity-ranch-release`
- **Type:** chore
- **Spec:** [`conductor/archive/20261126-stable-capacity-ranch-release/spec.md`](conductor/archive/20261126-stable-capacity-ranch-release/spec.md)
- **Plan:** [`conductor/archive/20261126-stable-capacity-ranch-release/plan.md`](conductor/archive/20261126-stable-capacity-ranch-release/plan.md)
- **Review:** [`conductor/archive/20261126-stable-capacity-ranch-release/review.md`](conductor/archive/20261126-stable-capacity-ranch-release/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Ratify stable and ranch decisions | State the three owner decisions in product and save-schema docs and correct the stale current version | verified | `35dc87a8` | Product-doc edits drafted by the phase agent and applied by the primary because agent policy forbids editing `conductor/**` outside track verification; historical `v25` references preserved |
| 2: Decision record and integrated verification | Record the revisit trigger and roadmap-only policy, prove the diff is doc-only, pass the full gate | verified | `208ddff0` | Phase evidence diff line corrected from 9 to 10 files; AC-7 terminal proof left to completion by design |
| R1: Review fixes | Document the shipped `v25 ΓåÆ v26` stat-fold migration and reconcile progress counters | verified | `9bc8592c` | F1 (Medium) and F2 (Low) fixed; F2 metadata counters corrected at `0c76ce36` |

## Requirements

- [x] `FR-1` ΓÇö stable capacity is unlimited, stated in product and save-schema docs
- [x] `FR-2` ΓÇö exactly one active `creature`; other owned pets wait in `stable`, frozen
- [x] `FR-3` ΓÇö no permanent release seam; retirement and breeding remain the lifecycle path
- [x] `FR-4` ΓÇö save-schema doc reports v26 and includes the shipped `v25 ΓåÆ v26` migration row
- [x] `FR-5` ΓÇö revisit trigger and roadmap-Later-only follow-up policy recorded
- [x] `FR-6` ΓÇö full configured gate green and doc-only diff proven
- [x] `NFR-1` ΓÇö changes confined to Conductor state, `conductor/product.md` and `docs/save-schema.md`
- [x] `NFR-2` ΓÇö no dependency, lockfile, generated-file, save-version, migration-code or determinism-hash change
- [x] `NFR-3` ΓÇö edits ratify decided policies only and introduce no new rule
- [x] `NFR-4` ΓÇö FR/NFR/AC IDs stable and mapped across spec, plan and evidence
- [x] `AC-1` ΓÇö product note states unlimited stable, one active partner and no release path
- [x] `AC-2` ΓÇö save-schema current version 26, no cap, one active, frozen stable, no release; migration chain terminal at v26
- [x] `AC-3` ΓÇö revisit trigger (~40 pets or a multi-partner feature) and new-track-with-save-review rule recorded
- [x] `AC-4` ΓÇö no sim/client/server/save/generated diff
- [x] `AC-5` ΓÇö full gate, determinism and module-size checks green
- [x] `AC-6` ΓÇö no stale capacity, release, multi-partner or `current: 25` claim remains
- [x] `AC-7` ΓÇö gate/diff/module-cap portion proven; registry, archived metadata, PR and roadmap proof completed at archive time

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --check --parallel --timeout 120000` | pass ΓÇö `4531 pass / 1 skip / 0 fail`, `675694 expect()` calls, 443 files | `conductor/archive/20261126-stable-capacity-ranch-release/verification/integrated.md` |
| lint | `bun run check` + `biome check` (via `bun run verify`) | pass ΓÇö Biome checked 1054 files, no fixes | `conductor/archive/20261126-stable-capacity-ranch-release/verification/integrated.md` |
| determinism | `bun run gate:determinism` (via `bun run verify`) | pass ΓÇö 21 archetypes ├ù 3 seed-42 stages and 5 prop digests byte-identical | `conductor/archive/20261126-stable-capacity-ranch-release/verification/integrated.md` |
| module caps | `bun test` across four `module-size.test.ts` files | pass ΓÇö `22 pass / 0 fail` | `conductor/archive/20261126-stable-capacity-ranch-release/verification/integrated.md` |
| build | `bun run build` | pass ΓÇö 441 modules, `index-DADRLmAJ.js`, only pre-existing chunk advisory | `conductor/archive/20261126-stable-capacity-ranch-release/verification/integrated.md` |
| integrated | `bun run verify && bun run build` | pass ΓÇö exit 0 on the primary re-run after R1 | `conductor/archive/20261126-stable-capacity-ranch-release/verification/phase-R1.md` |

## Review

- **Verdict:** `PASS`
- **Rounds:** 3
- **Fixed:** 2 findings (F1 Medium migration row, F2 Low progress counters)
- **Accepted/deferred:** 0 (AC-7 terminal proof is owned by completion and was accepted as not a defect; see `review.md`)

## Deviations and risks

- Product-doc edits were drafted by the phase agent and applied by the primary because `conductor-phase` may not edit `conductor/**` outside track verification. This is a process boundary, not a policy decision made by the agent.
- The Phase 2 evidence initially counted 9 files in the diff scope; the primary corrected it to 10, including the evidence file itself.
- Reversing these decisions later would affect save semantics; the revisit trigger requires a new track with save and migration review. No reversal is proposed here.

## Follow-ups

- Review the stable/ranch decision when the stable approaches ~40 pets or a multi-partner feature is requested; record follow-ups in `conductor/roadmap.md` Later only (issues are disabled). No follow-up track is opened now.

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commits
git revert --no-edit 35dc87a8
git revert --no-edit 208ddff0
git revert --no-edit 9bc8592c
git revert --no-edit 0c76ce36
git revert --no-edit 9e6947d8
```

No data migration or save-version change is introduced by this track, so rollback is documentation-only. Any future reversal of the ratified policy needs its own save/migration track.

