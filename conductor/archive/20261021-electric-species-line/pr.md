## Summary

Closes out the first slice of Phase 3 content: the league's roster grows from
three species to four with the **Electric storm hound** (`electric_hound`) —
a complete three-stage, two-branch line delivered as a **Silver tier-reward
egg**. The hound is a fast striker (SPD/ATK tilt, frailer than every starter)
with six Electric kit moves plus two champion signature specials written
against the existing effect vocabulary, rendered by a new voxel archetype
(`storm_hound`) in the same pipeline as the other three. Generated rival
rosters may field it from Silver up; the six authored bosses carry no new
species and no behaviour change. The reward is **pure**: fixed Electric,
`affinity: null`, no drift draw, previewed exactly as it hatches.

Save schema advances v20 → **v22** (the Silver claim flag and lineage marker,
then the persisted pending egg). The determinism gate now covers **twelve**
creature GLBs, all byte-identical.

## Track

- **ID:** `20261021-electric-species-line`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261021-electric-species-line/spec.md`](conductor/archive/20261021-electric-species-line/spec.md)
- **Plan:** [`conductor/archive/20261021-electric-species-line/plan.md`](conductor/archive/20261021-electric-species-line/plan.md)
- **Review:** [`conductor/archive/20261021-electric-species-line/review.md`](conductor/archive/20261021-electric-species-line/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 0: Conductor Housekeeping | stale `.conductor/runs/*` removed; `tracks.md` mojibake fixed | verified | `5771e1f` | rode along as a pre-task |
| 1: Species Data & Balance Probe | the species record, its branches, eight Electric specials, a balance probe | verified | `c33482d` | probe mirrors the boss-band methodology |
| 2: Silver Reward & Gift Egg | the one-time grant, the pure gift egg, save v21 | verified | `8486942` | retroactive for saves already past Silver |
| 3: Voxel Archetype & GLBs | the `storm_hound` archetype, three stage GLBs, a calibrated proportion budget | verified | `abcd400` | 2,556 / 2,420 / 2,674 tris; the nine pre-existing artifacts regenerate byte-identical |
| 4: Rivals, UI & Client Integration | the tier-gated rival pool, the handbook, the phone reflow | verified | `d3c05ad` | Bronze brackets stay byte-identical to the pre-track draw |
| 5: Docs Sync & Integrated Verification | roadmap/stack/README truth; the full-lifecycle evidence | verified | `f873b66` | AC-1 lifecycle: Silver reward → hatch → juvenile → champion `storm_courser` → cup win |
| R1: Review Fixes | close all eight round-1 findings | verified | `b3e800a` | the reward now reaches the player (save v22 + a Storm Gift card); two High, three Medium, three Low findings fixed |

## Requirements

- [x] `FR-1` - full three-stage line, playable end to end (`packages/sim/src/species.ts`, `branches.ts`, `battle/moves.ts`; AC-1 lifecycle + the R1 browser pass)
- [x] `FR-2` - the `storm_hound` archetype, three gated GLBs, accent-tint branch forms, fuzz coverage (`packages/voxel/src/storm_hound.ts`, `packages/voxel/src/fuzz/`)
- [x] `FR-3` - a fast-striker stat profile distinct from all three starters (`packages/sim/src/species.test.ts`)
- [x] `FR-4` - a six-move Electric pool on the existing effect vocabulary, with the standard learn schedule and equip-4 (`packages/sim/src/battle/moves.test.ts`)
- [x] `FR-5` - the grant fires once at tier ≥ Silver on a non-forfeit finalize (`packages/sim/src/cup/storm-gift.test.ts`)
- [x] `FR-6` - a pure gift egg: fixed Electric, `affinity: null`, no drift draw, previewed = hatched (`packages/sim/src/breeding.ts`, `apps/client/src/gift.ts`)
- [x] `FR-7` - generated rival rosters may field the species from Silver up; the bosses are untouched (`packages/sim/src/cup/rival-roster.test.ts`)
- [x] `FR-8` - save persistence for the claim, the lineage marker and the pending egg; v20 → v22 with linear migrations (`packages/sim/src/save/giftSave.test.ts`, `docs/save-schema.md`)
- [x] `FR-9` - handbook and client surfaces present the species with no special-casing beyond data (`apps/client/src/handbook/moves.ts`, `chart.ts`, `apps/client/src/gift.ts`)
- [x] `FR-10` - Phase 0 housekeeping (`conductor/tracks/20261021-electric-species-line/verification/phase-0.md`)
- [x] `NFR-1` - every client module ≤ 12,288 B (`apps/client/src/module-size.test.ts`)
- [x] `NFR-2` - no new dependencies; the gate covers 12 GLBs, byte-identical
- [x] `NFR-3` - pure, seeded, DOM-free sim changes; the gift consumes no drift draw
- [x] `NFR-4` - the six boss bands stay within 40–70%; every existing golden unchanged
- [x] `NFR-5` - palette semantics, AO 0.72 floor, bead eyes, Electric hue 50° from the shared element table
- [x] `AC-1`..`AC-10` - all mapped criteria verified (see the verification files below)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit + static + determinism | `bun run verify` | pass — 2,235 pass / 1 skip / 0 fail across 170 files; biome clean (496 files); 12 GLBs + 5 props byte-identical | `conductor/archive/20261021-electric-species-line/verification/phase-5.md` |
| build | `bun run build` | pass | same |
| visual (surfaces) | desktop + iPhone 15 screenshots, clean console | pass | `verification/phase-4.md` (screenshots under `.conductor/evidence/`, gitignored) |
| visual (gift flow) | chip → card → hatch at desktop + iPhone 15, clean console | pass | `verification/phase-r1.md` |
| lifecycle | Silver reward → hatch → juvenile → champion → cup win | pass | `verification/phase-5.md` |

## Review

- **Verdict:** `PASS` (approved at round 2)
- **Rounds:** 2 (+ R1 fix phase)
- **Fixed:** 8 findings — 2 High, 3 Medium, 3 Low; none deferred (`review.strict: true`)
- **Accepted/deferred:** 0

## Deviations and risks

- **Save v21 and v22 in one track.** v21 carried the Silver claim flag and the
  gift lineage marker; review round 1 found the granted egg had to persist so
  the preview could be exact, which needed a new field and a second linear
  migration. Documented in `docs/save-schema.md`.
- **The gift hatches into the ranch.** The game holds one active creature, so
  the Storm Gift takes the ranch when it hatches; the outgoing partner is
  archived in the Hall of Fame, and the card says so before the player
  commits.
- **The storm hound has no bespoke choreography profile.** Unknown archetypes
  resolve the neutral body language by design; a species-specific profile is
  polish, not a spec requirement.
- **A pre-existing phone overflow was fixed in passing.** The handbook's
  non-wrapping tab row set the modal wider than a 393 px viewport, clipping
  every panel it held; a phone-only block in `ranch.css` wraps the tabs and
  reflows the move rows.

## Known issue (tracked)

- **The Storm Gift takes the pet in the ranch with it.** The game holds one
  active creature, so hatching the gift swaps the current partner out to the
  Hall of Fame. The card states the trade before the player commits, and the
  hatch is opt-in — but a reward that *replaces* your companion is the wrong
  shape, and the player should never have to give up a pet to take a gift.
  The fix is a **stable**: the gift hatches into a reserve slot, the current
  partner stays in the ranch, and the two can be swapped. Tracked by the
  follow-up track `20261022-stable-partner-reserve`.

## Follow-ups

- `20261022-stable-partner-reserve` — a stable slot: the Storm Gift hatches
  into a reserve creature instead of replacing the ranch partner, with a
  swap surface (save v23).

## Rollback

```bash
# Squash commits (one per phase/checkpoint)
git revert --no-edit 5771e1f c33482d 8486942 abcd400 d3c05ad f873b66 b3e800a
```

Save v22 is backward-compatible additive: older saves migrate with a `null`
pending gift (and a v21 save that already claimed the gift receives the egg it
was promised); reverting the code keeps v22 saves loadable through the linear
migration chain if a future track bumps the version again.
