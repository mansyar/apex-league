## Summary

Every fire move gets its own visual signature. GIF review of the Elemental
Identity Pass showed all 8 fire rows reading as the same orange fireball, so
this track adds a per-row shot-look override mechanism plus bespoke geometry
(fork, chunk, needle, jet, spear), zero-shot body-first dashes with attacker
transit and flame envelopes, and a ground-erupting fire tower — each move
identifiable in motion at a glance. Client side only; sim, save, deps, and
other elements untouched.

## Track

- **ID:** `20261028-fire-move-identity`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261028-fire-move-identity/spec.md`](conductor/archive/20261028-fire-move-identity/spec.md)
- **Plan:** [`conductor/archive/20261028-fire-move-identity/plan.md`](conductor/archive/20261028-fire-move-identity/plan.md)
- **Review:** [`conductor/archive/20261028-fire-move-identity/review.md`](conductor/archive/20261028-fire-move-identity/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Per-Row Look Override + Geometry Pieces | `lookFor` mechanism + fork/chunk/needle/jet/gather | verified | `5e317577` | spawn path carries `moveId`; empty-table look-override pin updated |
| 2: Fast Pair | spark fork + flare needle | verified | `bd7e21f4` | 2 GIFs |
| 3: Heavy Pair | cinder lob + blaze artillery | verified | `88c43787` | 2 GIFs; blaze keeps 300ms flight |
| 4: Pyre Wall Encirclement | 2.5x ring, denser jets | verified | `3ddef325` | timing held; later superseded by tower rework |
| 5: Body-First Dash Trio | zero-shot charge/dive/lance + fix round (transit mechanism, dive arc, lance exit) | verified | `91f48906` | stale-bundle lesson; live body-motion proof |
| 6: GIF Catalog + Acceptance | 8 GIFs + grayscale + sign-off | verified | `046efcfd` | user "good" on 4 rework GIFs; 4 untouched stand |
| 7: Feedback Rework | envelope trails, spear, grounded tower | verified | `bca29351` | size-cap extraction (`fire-transit.ts`, `shot-spear.ts`); 4 GIFs re-captured |
| R1: Review Fixes | 4 Low findings | verified | `bc42fdc4` | dead `buildGather` deleted; cast widened |

## Requirements

- [x] `FR-1` — per-row look override (test: `move-fx/look-override.test.ts`)
- [x] `FR-2` — spark zigzag fork, no travel ball
- [x] `FR-3` — cinder lobbed chunk, drip trail, scorch
- [x] `FR-4` — flare flat needle, pierce impact
- [x] `FR-5` — blaze gather + heavy bloom + burn
- [x] `FR-6` — wall as circular ground-erupting fire tower
- [x] `FR-7` — zero-shot wreathed charge, enveloped dive, spear lance, mutually distinct
- [x] `FR-8` — 8 per-move Move Lab GIFs
- [x] `NFR-1` — all move-fx modules within 12 KB (test: `module-size.test.ts`)
- [x] `NFR-2` — sim untouched (name-only diff: client + conductor)
- [x] `NFR-3` — no save bump, no new deps, hues single-sourced
- [x] `NFR-4` — visual only, no audio paths
- [x] `NFR-5` — reduced-motion dampening pinned (no perf harness exists — partial)
- [x] `AC-1..AC-6` — per-move GIF reads + grayscale STRONG PASS
- [x] `AC-7` — user GIF sign-off + green gate

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun run verify` | pass | `conductor/archive/20261028-fire-move-identity/verification/integrated.md` — 3500 pass / 0 fail, determinism gate OK |
| lint | `biome check` (inside verify) | pass | clean |
| typecheck | `bun run check` (inside verify) | pass | 160+169+44+468 files, no errors |
| build | `bun run build` | pass | exit 0, pre-existing chunk-size warning only |

## Media

Final clips (re-captured after the Phase-7 rework):

![Spark zigzag fork](.conductor/media/20261028-fire-move-identity/fire-spark.gif)
![Flare dart needle](.conductor/media/20261028-fire-move-identity/fire-flare_dart.gif)
![Cinder lobbed chunk](.conductor/media/20261028-fire-move-identity/fire-cinder_shot.gif)
![Blaze gathered comet](.conductor/media/20261028-fire-move-identity/fire-blaze_bolt.gif)
![Flame charge crossing](.conductor/media/20261028-fire-move-identity/fire-flame_charge.gif)
![Cinder dive crater](.conductor/media/20261028-fire-move-identity/fire-cinder_dive.gif)
![Pyre lance spear](.conductor/media/20261028-fire-move-identity/fire-pyre_lance.gif)
![Pyre wall fire tower](.conductor/media/20261028-fire-move-identity/fire-pyre_wall.gif)

## Review

- **Verdict:** `PASS`
- **Rounds:** 2 (round 1: PASS WITH FINDINGS, 4 Low)
- **Fixed:** 4 findings (dead gather builder, stale comment, unjustified cast, plan typo)
- **Accepted/deferred:** 0

## Deviations and risks

- `moves.ts` gained `transit.trail` + `BurstStyle.grounded` schema fields
  (row-local, sim untouched). Risk: low — pinned and size-capped.
- Phase-7 size-cap extraction split `steps/fire-transit.ts` and
  `fx/shot-spear.ts` out of capped modules; public APIs unchanged.
- NFR-5 partial: no frame-rate harness; reduced-motion behavior pinned,
  no perf delta measured.

## Follow-ups

- none (other 5 elements' rows are a later track, out of scope here)

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

Client-visual only: no migration, no flag, no data to roll back. Reverting
restores the shared ember-grammar fire rows from the merged Elemental
Identity Pass.
