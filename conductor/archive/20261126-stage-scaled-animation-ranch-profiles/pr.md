## Summary

Client-only presentation pass: the arena now composes each archetype's authored
`BodyProfile` with the life-stage ladder for motion amplitude, and the ranch now
uses that single shared profile table for amplitude and tempo across all seven
ceremonies. Physical scale, sim coordinates, ceremony outcomes, save schema,
voxel digests and audio cues are unchanged; calm/reduced motion damps the new
factors toward neutral.

## Track

- **ID:** `20261126-stage-scaled-animation-ranch-profiles`
- **Type:** feature
- **Spec:** [`conductor/archive/20261126-stage-scaled-animation-ranch-profiles/spec.md`](conductor/archive/20261126-stage-scaled-animation-ranch-profiles/spec.md)
- **Plan:** [`conductor/archive/20261126-stage-scaled-animation-ranch-profiles/plan.md`](conductor/archive/20261126-stage-scaled-animation-ranch-profiles/plan.md)
- **Review:** [`conductor/archive/20261126-stage-scaled-animation-ranch-profiles/review.md`](conductor/archive/20261126-stage-scaled-animation-ranch-profiles/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Arena stage motion profile | Compose `profileFor(archetype) ├ù stageScale(stage)` for presentation amplitudes; missing stage neutral; physical footprint untouched | verified | `c652a56c` | Formatter-only rework; four declared files only |
| 2: Ranch ceremony profile and tempo adoption | Apply shared profile amplitude/tempo to all seven ceremonies, multiplying authored curves and damping under calm | verified | `1d9129f7` | Two formatter/import-order reworks; one-line `mount.ts` archetype latch |
| 3: Visual evidence and integrated gate | Desktop/phone captures of ranch stage contrast and arena stage contrast, full stack green | verified | `033c410c` | Arena captures wide/dark; amplitudes pinned by table tests |

## Requirements

- [x] `FR-1` ΓÇö arena stage-composed motion amplitudes, neutral `1` when stage missing
- [x] `FR-2` ΓÇö ranch consumes the single `choreo.ts` profile table with `DEFAULT_PROFILE` fallback
- [x] `FR-3` ΓÇö feed, rest, treat, play, pet, evolution and morning-after apply amplitude and tempo
- [x] `FR-4` ΓÇö reduced motion damps factors toward neutral, no new cue or state
- [x] `FR-5` ΓÇö unknown archetype, missing stage, rig swap, pause/hidden tab and dense field handled
- [x] `FR-6` ΓÇö desktop and iPhone captures show ranch and arena contrast with clean console
- [x] `NFR-1` ΓÇö no sim/state/save, voxel, ceremony outcome or audio cue change
- [x] `NFR-2` ΓÇö client 12 KB module caps green
- [x] `NFR-3` ΓÇö no dependency or generated file
- [x] `NFR-4` ΓÇö full configured stack green, including `module-size.test.ts`
- [x] `NFR-5` ΓÇö no sim payload, damage, timing, cooldown or outcome change
- [x] `AC-1` ΓÇö archetype ├ù baby/juvenile/champion table tests, `bodyScaleFor` unchanged
- [x] `AC-2` ΓÇö shared table and fallback pinned; no duplicate table in `ranch/`
- [x] `AC-3` ΓÇö seven ceremonies covered; authored curves and scale journeys intact
- [x] `AC-4` ΓÇö calm damping pinned; no new cue or state
- [x] `AC-5` ΓÇö five edge cases show no NaN, leak, overshoot or cross-creature drift
- [x] `AC-6` ΓÇö four required screenshots plus extras, clean console
- [x] `AC-7` ΓÇö full gate, module caps, no dependency/save/voxel/audio diff

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit (phase) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/stage-motion.test.ts apps/client/src/roster.test.ts` | pass (11/0, 2410 expect()) | `conductor/archive/20261126-stage-scaled-animation-ranch-profiles/verification/phase-1.md` |
| unit (phase) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ranch/profile.test.ts apps/client/src/ranch/motion.test.ts apps/client/src/ranch/frame.test.ts apps/client/src/ranch/morning-after.test.ts` | pass (56/0, 1984 expect()) | `conductor/archive/20261126-stage-scaled-animation-ranch-profiles/verification/phase-2.md` |
| unit (full) | `bun test --check --parallel --timeout 120000` | pass (4531 pass / 1 skip / 0 fail, 675694 expect()) | `conductor/archive/20261126-stage-scaled-animation-ranch-profiles/verification/integrated.md` |
| typecheck / lint | `bun run verify` (`bun run check` + `biome check`) | pass | `conductor/archive/20261126-stage-scaled-animation-ranch-profiles/verification/integrated.md` |
| determinism | `bun run gate:determinism` via `bun run verify` | pass (all archetype GLBs + 5 props) | `conductor/archive/20261126-stage-scaled-animation-ranch-profiles/verification/integrated.md` |
| build | `bun run build` | pass | `conductor/archive/20261126-stage-scaled-animation-ranch-profiles/verification/integrated.md` |
| visual | `playwright-cli` desktop 1440├ù900 + iPhone 15 393├ù852 | pass, console clean | `conductor/archive/20261126-stage-scaled-animation-ranch-profiles/verification/phase-3.md` |

## Media

> Both captures are hosted as PR attachments; the raw files remain under
> gitignored `.conductor/evidence/...` and `.conductor/media/...`.

Champion ranch play beat with the shared-profile factors active:

![Ranch champion stage-scaled beat](https://github.com/user-attachments/assets/6acf15ed-e4c9-4120-bd6c-ff78f2b2b9c0)

Arena stage-contrast frame (owned champion vs rival) on desktop:

![Arena stage contrast](https://github.com/user-attachments/assets/b772ef46-0eff-4932-8a6f-fdc5bb2874ea)

## Review

- **Verdict:** `PASS`
- **Rounds:** 1
- **Fixed:** 0 findings
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- `apps/client/src/ranch/mount.ts` gained one line latching `s.archetypeId` in
  `rebuild()`; this is the single rig path for set-creature and the evolution
  swap, without it per-frame factors would read a stale identity after a swap.
- `apps/client/src/ranch/frame.ts` changed as the per-frame factor dispatch root
  required by P2.T2; it is recorded in phase-2 evidence but missing from that
  file's Deviations table ΓÇö bookkeeping only, noted in `review.md`.
- `api.ts` and `mood.ts` were intentionally unchanged so ceremony order,
  callbacks and condition-driven mood profiles stay authored.
- Formatter/import-order reworks are recorded in phase evidence; no behavior
  changed. Arena captures remain wide/dark with small bodies, so stage amplitude
  differences are proven by table tests rather than pixels.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commits
git revert --no-edit 033c410c
git revert --no-edit 1d9129f7
git revert --no-edit c652a56c
```

No migration, feature flag or data rollback is needed: the change is a
client-only presentation layer with no save-schema, voxel or sim change.

