## Summary

Gives every battle move an element-true visual identity: all 48 specials now
own bespoke `MOVE_FX` rows (fire flicker, water droplets, plant seed rake,
electric arc-tendrils, earth grit, wind streaks), unauthored ids fall back to
six authored per-element bodies, wind is decoupled onto its own geometry, and
a dev-only Move Lab rig makes every move triggerable on demand for
deterministic visual evidence. Client side only — sim, save schema, and
dependencies untouched.

## Track

- **ID:** `20261028-elemental-identity`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261028-elemental-identity/spec.md`](conductor/archive/20261028-elemental-identity/spec.md)
- **Plan:** [`conductor/archive/20261028-elemental-identity/plan.md`](conductor/archive/20261028-elemental-identity/plan.md)
- **Review:** [`conductor/archive/20261028-elemental-identity/review.md`](conductor/archive/20261028-elemental-identity/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Identity foundation | 6 fallback bodies + verb builders | verified | `ec724ede` | `fxFor` optional-element fallthrough; `steps/fire.ts` element threading |
| 1.5: Move Lab | deterministic visual rig (?movelab=1, dev-only) | verified | `404921cd` | guards stage foe-targeted per sim targeting; spec amended |
| 2: Fire | 4 new + 4 upgraded rows | verified | `9ec453fd` | legacy guard pin trimmed to un-bespoke guards |
| 3: Water | 4 new + 4 upgraded rows | verified | `3e5043c1` | — |
| 4: Plant | 4 new + 4 upgraded rows | verified | `4ad63e4f` | vine_lash reworked to simultaneous 3-streak rake |
| 5: Electric | 8 new rows + `electric.ts` | verified | `f406eb2a` | — |
| 6: Earth | 7 new + 1 upgraded row | verified | `32b8cbd1` | low-contrast dust ring recorded as P8 grayscale input |
| 7: Wind | 7 new + 1 upgraded, decoupled parts | verified | `ae892e38` | new `streak`/`streaks` geometry; FR-4 vertex-level pin |
| 8: Catalog/grayscale/acceptance | 204-frame catalog, blind shape test, sweep | verified | `b4cc94f0` | PASS: no element depends on hue alone; P8.T4 phone-toggle fix |
| R1: Review fixes | F1–F4 (all Low) | verified | `45ff6766` | F2 extended to module docstring (same contradiction) |

## Requirements

- [x] `FR-1` — per-element fallback bodies (test: `move-fx/moves/fallback.test.ts`)
- [x] `FR-2` — 48 bespoke rows (test: per-element AC-1 pins + `movelab/catalog.test.ts`)
- [x] `FR-3` — electric arc-tendril identity (test: `fallback.test.ts` electric pins)
- [x] `FR-4` — wind decoupled parts (test: `move-fx.test.ts` no-shared-parts pin)
- [x] `FR-5` — tier-scaled treatments (test: per-element verb pins)
- [x] `FR-6` — element-typed floor marks (test: `fx/fx-data.test.ts`)
- [x] `FR-7` — screenshot catalog + grayscale (evidence: `verification/phase-8.md` + 216 PNGs)
- [x] `FR-8` — Move Lab on-demand trigger rig (test: `movelab/*.test.ts`)
- [x] `NFR-1` — 12 KB module caps (test: `module-size.test.ts`)
- [x] `NFR-2` — sim untouched + deterministic (gate byte-identical every phase)
- [x] `NFR-3` — no save change (save v25 pinned, no save files touched)
- [x] `NFR-4` — no new deps, hues single-sourced (`EARTH_DUST_TINT`, `ui/element.ts`)
- [x] `NFR-5` — no frame regression (no `PLAYBACK_BEATS` edits, console-clean captures)
- [x] `NFR-6` — lab dev-only, own bundle chunk
- [x] `AC-1` — all-48 bespoke lookup pins per element
- [x] `AC-2` — grayscale readability pass per element
- [x] `AC-3` — verb spot-checks per element
- [x] `AC-4` — verify + build green, desktop/phone catalog
- [x] `AC-5` — size tests green, no save bump, no new deps
- [x] `AC-6` — lab triggers all moves; no lab code in prod bundle

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static | `bun run check` | pass | `conductor/archive/20261028-elemental-identity/verification/integrated.md` |
| unit | `bun test --check --parallel` | pass | 3454 pass / 1 skip / 0 fail |
| lint | `biome check` | pass | clean |
| determinism | `bun run gate:determinism` | pass | all species x stages + props byte-identical |
| build | `bun run build` | pass | lab in own chunk |
| visual | Move Lab captures | pass | 12 + 204 + 12 PNGs, console clean |

## Media

Captured in the Move Lab on this branch (desktop 1280x800, travel anchors):

![Fire: pyre lance beam](https://github.com/user-attachments/assets/db7de4b2-7a50-45ed-b9fa-83c6cd64d2e5)
![Water: maelstrom vortex](https://github.com/user-attachments/assets/0303c60e-9a3d-404e-bd3f-e74f75e5c31f)
![Plant: vine lash rake](https://github.com/user-attachments/assets/9b929190-2cae-409e-98a7-7f211ea37357)
![Electric: gigavolt charge](https://github.com/user-attachments/assets/10e5ee2d-bea7-4379-bcf8-4dc37aba9265)
![Earth: tectonic slam](https://github.com/user-attachments/assets/a9f1b1eb-1e19-404f-9740-56f44c3fef4d)
![Wind: hurricane spiral](https://github.com/user-attachments/assets/9cccbec0-c7fa-4edb-a3d3-055c2135132b)

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 4 Low findings (stale headers, dead requirement ref, shared dust-tint constant)
- **Accepted/deferred:** 0

## Deviations and risks

- `fxFor(moveId, element?)` optional-element fallthrough (backward compatible); `steps/fire.ts` threads element end-to-end.
- Phase task commits were kept per task (not squashed per phase) for a legible trail; final PR uses squash merge.
- Barrier/guard rows stage foe-targeted eruptions (sim targets opponent for all specials) — documented in spec, not a defect.
- Electric in-flight core remains generic `orb` geometry; arc-tendril identity is parametric — candidate follow-up (see review O1).

## Follow-ups

- none (review O1 electric tendril-trail family is unfiled polish, not tracked debt)

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

No migration, feature flag, or data rollback notes — client-visual only, save schema untouched.

