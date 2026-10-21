## Summary

Closes out Phase 2 of the roadmap: breeding can now roll a **secondary type affinity** (15%, seeded, decided at breeding so the nursery preview shows it before hatching), a defender's secondary can cancel an incoming super-effective hit down to neutral, and the lineage prestige ladder gains two milestones — **Refined Blood** (prestige 7: stronger-parent inheritance floor 0.50 → 0.55) and **Champion Stable** (prestige 9: +1 max AP for the hatchling's first 5 days and a widened +1..+3 mutation band). Save schema advances v19 → v20; every client surface (nursery preview, creature plate, detail modal, coach ticker, Handbook) reflects the new mechanics.

## Track

- **ID:** `20261021-affinity-drift-prestige-perks`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261021-affinity-drift-prestige-perks/spec.md`](conductor/archive/20261021-affinity-drift-prestige-perks/spec.md)
- **Plan:** [`conductor/archive/20261021-affinity-drift-prestige-perks/plan.md`](conductor/archive/20261021-affinity-drift-prestige-perks/plan.md)
- **Review:** [`conductor/archive/20261021-affinity-drift-prestige-perks/review.md`](conductor/archive/20261021-affinity-drift-prestige-perks/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Affinity Roll & Save v20 | seeded 15% drift roll at breeding; save v20 | verified | `7deec17` | own salted RNG stream; previewed = hatched; v19→v20 stamps `null` (no backfill) |
| 2: Cancel-to-Neutral Defense Rule | ×2-vs-primary + ×0.5-vs-secondary → ×1 | verified | `67660bb` | incoming-only; amended to thread affinity through cup battle sides |
| 3: Prestige Milestones 7 & 9 | Refined Blood floor 0.55; Champion Stable AP + mutation band | verified | `f0f067f` | head-start fully derived (no new save field); milestone-gated extra draw keeps pre-perk RNG streams byte-identical |
| 4: Client Surfaces | preview badge, dual crest, ticker, Handbook | verified | `d2bef0b` | visual evidence at desktop + iPhone 15; module cap green |
| 5: Docs Sync & Integrated Verification | roadmap/stack/README truth; full gate | verified | `c657b9c` | product.md marks both Phase 2 items landed 2026-10-21 |
| R1: Review Fixes | resolve 4 Low review findings | verified | `eadd17c` | shared sim constants, `hatchDayOf` reuse, composed graduation+drift callout, element-independent drift precedence |

## Requirements

- [x] `FR-1` - seeded 15% secondary-affinity roll at breeding (test: `packages/sim/src/breeding.test.ts`)
- [x] `FR-2` - save v20 additive `affinity` + migration + validation (test: `packages/sim/src/save/save.test.ts`)
- [x] `FR-3` - cancel-to-neutral incoming defense (test: `packages/sim/src/battle/affinity.test.ts`)
- [x] `FR-4` - Refined Blood 0.55 floor at prestige ≥ 7 (test: `packages/sim/src/breeding.test.ts`)
- [x] `FR-5` - Champion Stable head-start AP + wider mutation band (test: `packages/sim/src/ap.test.ts`)
- [x] `FR-6` - client full pass (tests: `apps/client/src/hud/copy.test.ts` + visual evidence)
- [x] `FR-7` - docs sync (evidence: `docs/save-schema.md`, `conductor/product.md`, `conductor/tech-stack.md`, `README.md`)
- [x] `NFR-1` - 12 KB module cap green (`apps/client/src/module-size.test.ts`)
- [x] `NFR-2` - no new dependencies; determinism gate untouched
- [x] `NFR-3` - pure/seeded/DOM-free sim changes, TDD'd
- [x] `NFR-4` - previewed = hatched invariant
- [x] `AC-1`..`AC-7` - all mapped criteria verified (see `verification/integrated.md`)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit + static + determinism | `bun run verify` | pass | `conductor/archive/20261021-affinity-drift-prestige-perks/verification/integrated.md` |
| build | `bun run build` | pass | same |
| visual | desktop + iPhone 15 screenshots, clean console | pass | `verification/phase-4.md` (screenshots under `.conductor/evidence/`, gitignored) |

## Review

- **Verdict:** `PASS`
- **Rounds:** 1 (+ R1 fix phase)
- **Fixed:** 4 Low findings
- **Accepted/deferred:** 0

## Deviations and risks

- Balance scope intentionally limited to **incoming-only** defense and player-only secondaries, so all boss win-rate bands and goldens stay valid (pinned by tests).
- Head-start AP is derived from the lineage's last graduation day (exact for every current succession path; assumption recorded in phase-3 evidence).
- On drifted hatches the ticker now composes the graduation send-off with the drift statement (review finding F3 resolved).

## Follow-ups

- none

## Rollback

```bash
# Squash commits (one per phase/checkpoint)
git revert --no-edit 7deec17 67660bb f0f067f d2bef0b c657b9c eadd17c
```

Save v20 is backward-compatible additive: old saves migrate with `affinity: null`; reverting the code keeps v20 saves loadable via the linear migration chain if a future track bumps the version again.
