# Mobile Layout Pass ΓÇö PR notes

## Summary

Makes the whole game fully playable at phone size (393px) in both
orientations: a two-tier responsive baseline in the UI kit (40px touch
floors on phone), a mutually-exclusive ranch panel layout in portrait, an
orientation-gated landscape arrangement with a phone-default collapsed
dock, and adapted cup/battle/spar plus all secondary surfaces. The
measurable bar is recorded as UX Principle 8 in the product guidelines;
desktop and tablet layouts are pixel-guarded unchanged every phase.

## Track

- **ID:** `20261025-mobile-layout-pass`
- **Type:** feature
- **Spec:** [`conductor/tracks/20261025-mobile-layout-pass/spec.md`](conductor/tracks/20261025-mobile-layout-pass/spec.md)
- **Plan:** [`conductor/tracks/20261025-mobile-layout-pass/plan.md`](conductor/tracks/20261025-mobile-layout-pass/plan.md)
- **Review:** [`conductor/tracks/20261025-mobile-layout-pass/review.md`](conductor/tracks/20261025-mobile-layout-pass/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Kit baseline & ranch portrait | kit tiers + 393px ranch/HUD portrait | verified | `9e4e7b12` | bottom panels mutually exclusive via `:has()`; 40px touch floors |
| 2: Landscape & dock adaptation | 852├ù393 layout + phone-default collapsed dock | verified | `319bd9d7` | orientation-gated block (no third width breakpoint); pure `hud/dock-collapse.ts` session seam, failing-first TDD |
| 3: Cup, battle & spar | cup flow + battle HUD + spar at both orientations | verified | `90d7431d` | fixed real pre-fix defects: dead pre-rework `.spar-hud*` selectors, landscape coach-room flow dead-end, clipped spar panel |
| 4: Secondary surfaces, docs & integrated audit | stable/graduation/handbook/starter/gift/settings/recovery/save-transfer + guidelines + full sweep | verified | `980d050b` | STABLE/DRAFT-DAY 393px overlap fixed; mobile bar recorded as UX Principle 8 |
| R1: Review fixes | resolve review finding F1 | verified | `fab6267d` | doc-only NFR numbering fix in the integrated summary |

## Requirements

- [x] `FR-1` ΓÇö kit width breakpoints (phone Γëñ767.98px / tablet 768ΓÇô1023.98px) (evidence: `verification/phase-1.md`)
- [x] `FR-2` ΓÇö ranch + HUD pass the bar at 393├ù852 (evidence: `verification/phase-1.md`)
- [x] `FR-3` ΓÇö ranch + HUD pass at 852├ù393 (evidence: `verification/phase-2.md`)
- [x] `FR-4` ΓÇö cup flow key states at both orientations (evidence: `verification/phase-3.md`)
- [x] `FR-5` ΓÇö spar operable at both orientations (evidence: `verification/phase-3.md`)
- [x] `FR-6` ΓÇö secondary surfaces pass (graduation/nursery/gift static-review partial, documented)
- [x] `FR-7` ΓÇö dock collapses by default on phone widths, in-session toggle (test: `hud/dock-collapse.test.ts`)
- [x] `FR-8` ΓÇö battle HUD readable mid-battle in both orientations
- [x] `FR-9` ΓÇö mobile bar recorded in product guidelines (UX Principle 8)
- [x] `NFR-1` ΓÇö no sim/save changes (save stays v25), no new dependencies
- [x] `NFR-2` ΓÇö desktop 1440├ù900 + tablet band guarded unchanged per phase
- [x] `NFR-3` ΓÇö reduced-motion blocks untouched
- [x] `NFR-4` ΓÇö 40px touch floors; a11y semantics preserved
- [x] `NFR-5` ΓÇö CSS-first; single ~1.5 KB pure module; module caps green
- [x] `NFR-6` ΓÇö clean console everywhere
- [x] `AC-1`..`AC-8` ΓÇö see `review.md` requirements table (AC-4 partial visual coverage documented via fallback ladder)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --timeout 120000` | 2640 pass / 1 skip / 0 fail, 209 files | `verification/integrated.md` |
| typecheck/lint/format/determinism | `bun run verify` | pass | `verification/integrated.md` |
| build | `bun run build` | pass | `verification/integrated.md` |
| visual | Playwright, real taps, hit-test sweeps | both orientations + guards, console 0/0 | `verification/phase-1..4.md` |

## Media

- ![Portrait ranch after the pass](https://github.com/user-attachments/assets/860778a1-39a5-45e2-a119-852523ebda76) ΓÇö 393├ù852 ranch day, panels mutually exclusive (captured on this branch)
- ![Landscape ranch](https://github.com/user-attachments/assets/058f3714-1013-4e27-b450-a4b7d362983e) ΓÇö 852├ù393 landscape arrangement, dock right / plate left
- ![Portrait cup bracket](https://github.com/user-attachments/assets/2b7dab65-bd62-4c93-98bf-93375c1cf8e9) ΓÇö cup bracket playable at 393├ù852
- ![Stable in landscape](https://github.com/user-attachments/assets/07c9cfa4-f1c5-446f-a977-e93505d4680f) ΓÇö secondary surfaces pass

## Review

- **Verdict:** `PASS` (round 2; round 1 PASS WITH FINDINGS)
- **Rounds:** 2
- **Fixed:** 1 finding (Low, doc numbering)
- **Accepted/deferred:** 0

## Deviations and risks

- `spar.css` gained one `.hud-lineage` rule inside the existing
  `.app-in-arena` block (Phase 3 deviation, smallest necessary) ΓÇö it
  depends on `hud/update.ts` continuing to *clear* the inline display; if
  that line is refactored, re-check the arena plate.
- Graduation/nursery/gift were verified by static CSS review only
  (unreachable by real play in one session) ΓÇö a future full-sweep track
  can close the visual gap.
- Known cosmetic residual: at 852├ù393 the battle verdict stamp passes
  behind the open log box (transient, non-interactive).

## Follow-ups

- none

## Rollback

```bash
git revert --no-edit <squash-commit>
```

No schema, dependency, or data migration involved ΓÇö save stays v25;
rollback is a pure UI revert.
