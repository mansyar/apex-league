## Summary

A behavior-preserving UI cleanliness and clarity pass over the ranch HUD: one
shared modal helper with tokenized z-layers, a consolidated broadcast kit
(single 44px touch floor, generic focus ring, `hidden`-driven visibility),
secondary chips grouped behind a collapsible More panel, a flow/grid ranch
layout with measured seats instead of hardcoded tops, honest Board/Ghost/Cloud
states, and a voice-consistent copy pass. No sim, save-schema, or voxel change.

## Track

- **ID:** `20261027-ui-cleanliness-clarity-pass`
- **Type:** `refactor`
- **Spec:** [`conductor/archive/20261027-ui-cleanliness-clarity-pass/spec.md`](conductor/archive/20261027-ui-cleanliness-clarity-pass/spec.md)
- **Plan:** [`conductor/archive/20261027-ui-cleanliness-clarity-pass/plan.md`](conductor/archive/20261027-ui-cleanliness-clarity-pass/plan.md)
- **Review:** [`conductor/archive/20261027-ui-cleanliness-clarity-pass/review.md`](conductor/archive/20261027-ui-cleanliness-clarity-pass/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Modal system + z-index tokens | one helper, token layers | verified | `14966520` | ~14 overlays migrated; Escape + focus discipline |
| 2: Kit consolidation | chamfer/keyline/elevation into kit, `hidden` visibility | verified | `94cc830b` | ~80 declarations deduped; whole-rule consolidation left out (would change computed styles) |
| 3: Ranch HUD declutter | More panel, lineage collapse, score-bug owner module | verified | `eabfe5a6` | measured below-lineage seat; seat/settle race fixed |
| 4: Responsive ranch layout | flow/grid, no magic numbers | verified | `8965e7d3` | squat-viewport absolute seat + pointer-events + reseat-after-hints fix rounds |
| 5: Board/Ghosts/Cloud + copy | explicit states, ghost parity, honest queue, voice pass | verified | `da696dd9` | new `cloud/queue-depth.ts` owner module; phone dock-aria fix found by matrix |
| R1: Review fix | trophy accessible name | verified | `4a21c419` | `role="img"` + 3 tests |

## Requirements

- [x] `FR-1` — shared modal helper (test: `apps/client/src/ui/modal.test.ts`)
- [x] `FR-2` — `--z-*` layer tokens, token-only usage
- [x] `FR-3` — kit surface/keyline/elevation consolidation
- [x] `FR-4` — single 44px touch floor in kit responsive tiers
- [x] `FR-5` — generic focus ring, no hand-maintained allowlist
- [x] `FR-6` — `hidden`/`is-hidden` visibility (documented trophy-display residual kept)
- [x] `FR-7` — collapsible More overflow for secondary chips
- [x] `FR-8` — collapsible lineage plate with detail-on-click
- [x] `FR-9` — score-bug paint hierarchy preserved
- [x] `FR-10` — flow/grid ranch layout, no hardcoded tops
- [x] `FR-11` — gift chip folds inside the panel, never overlaps
- [x] `FR-12` — board explicit states with snapshot age
- [x] `FR-13` — ghost preview shows the kit the spar borrows
- [x] `FR-14` — actionable cloud errors + honest queue sentence (tests: `push-queue.test.ts`, `queue-depth.test.ts`)
- [x] `FR-15` — deduped ladder teaser, period/jargon fixes
- [x] `FR-16` — facts inline (form chip, picker blurb, trophy name)
- [x] `NFR-1..6` — no sim/save/voxel change; caps hold; reduced-motion, keyboard, 393px gates intact
- [x] `AC-1..AC-14` — covered (see phase evidence; AC-13 closed by R1)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static | `bun run check` + `biome check` | pass | `conductor/archive/20261027-ui-cleanliness-clarity-pass/verification/integrated.md` |
| unit | `bun test --timeout 120000` | pass | 3320 pass / 0 fail |
| determinism | voxel regeneration gate | pass | 12 species × 3 stages + 5 props byte-identical |
| visual | Playwright matrices per phase | pass | phase evidence + PNG/JSON reports, 0 pageerrors |
| build | `bun run build` | pass | exit 0 |

## Media

Desktop ranch with the More panel open below the lineage plate (captured at `702ac98f`):
![Ranch with grouped More panel open, desktop](https://github.com/user-attachments/assets/db690326-8c5b-4340-b4f4-b6e25938eda3)
Mobile shut stack, no overlaps (captured at `702ac98f`):
![Ranch shut stack, mobile 393px](https://github.com/user-attachments/assets/4df4ff50-e1d1-454d-8de0-7bab7cfcd3db)

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 1 (F1 — trophy `role="img"`, Medium)
- **Accepted/deferred:** 0

## Deviations and risks

- P2 left whole-rule CSS consolidation undone: merging would have changed computed styles; recorded, not debt.
- P3/P4 use measured JS seats (`seatOverflowBelow`, `seatRanchFlow`) instead of pure flow in squat landscape — same pattern as the existing overflow seat, covered by rAF/font/resize/animationend reseats.
- `PushQueue.flush` drops failed payloads by design (pre-existing); the queue sentence reads inside the retry window only. Documented, out of scope.
- Day-one hint callout can briefly overlap the open More panel (one dismissible click, day 1 only); revisit with a callout-system rework.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

No migration, feature flag, or data change — pure client refactor plus copy.
