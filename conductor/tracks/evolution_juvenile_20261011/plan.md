# Plan — Evolution I: Juvenile Stage

**Track ID:** `evolution_juvenile_20261011`
**Spec:** [./spec.md](./spec.md) · **Status:** approved 2026-10-11

Workflow: TDD for logic-bearing tasks (tests first, red → green → refactor),
manual verification for presentation tasks, phase checkpoints per
`conductor/workflow.md`.

## Phase 1 — Sim Core: Evolution Trigger, Stats & Save v6

*(all logic-bearing — strict TDD)*

- [x] Task: Evolution gate pure function *(write failing tests first)* — [checkpoint: a72e962]
  - [x] Tests: `evaluateEvolution` — passes at day ≥ 10 with clean last-3-days + mood ≥ 40; fails on recent sickness onset; fails on mood < 40; re-check semantics on later nights; deterministic (seeded fixtures)
  - [x] Implement `evaluateEvolution` in `packages/sim/src/` (new `evolution.ts`), pure + DOM-free
- [x] Task: Settlement integration — [checkpoint: a72e962] *(folded into the gate commit: the gate verdict is meaningless without the hook, and the settlement tests were written red first in the same cycle)*
  - [x] Tests: settlement calls the gate nightly; delayed evolution resolves on a later night; evolution applies **after** the full settlement (mood/health the gate judges are the settled values)
  - [x] Implement hook in `settlement.ts` (new closing-day parameter from `advanceDay`; sick-cooldown bookkeeping stamps post-settlement health)
- [ ] Task: Stat boost + kit gate change
  - [ ] Tests: +3/+2/+2/+1 applied to rolled base within bounds; `effectiveStats` reflects it; tier-3 unlocked at evolution, tier-4 still gated at 6 trained days; loadout helpers agree
  - [ ] Implement boost + extend `loadout.ts` gate helpers
- [ ] Task: Save v6 migration
  - [ ] Tests: v5 fixture migrates to v6 (stage = baby, gate bookkeeping derived from day); v6 schema validation rejects malformed stage; round-trip save/load
  - [ ] Implement schema bump + v5→v6 migration in `save/`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Voxel Pipeline: Juvenile Stage Builds

- [ ] Task: Stage-variant build API (TDD)
  - [ ] Tests: same seed → identical juvenile build across runs; baby build unchanged (digest-stable); stage variant passes proportion-budget audit; signature part absent in baby build, present in juvenile
  - [ ] Implement stage-gating + per-archetype signature parts (drake horn nubs / bovine brow horns / axolotl gill branch) in `packages/voxel/src/`
- [ ] Task: Determinism gate + artifacts
  - [ ] Extend `scripts/determinism-gate.ts` to hash juvenile-variant GLBs; generate + commit stage-variant artifacts
  - [ ] Verify `bun run gate:determinism` green
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Client: Evolution Moment, HUD & Hints

*(presentation — manual verification path)*

- [ ] Task: Evolution ceremony — walk-to-center, glow/scale-up mesh swap, coach callout with stat gains; reduced-motion instant variant; non-blocking HUD input
- [ ] Task: HUD stage badge + stat row — nameplate badge, boosted stats visible
- [ ] Task: Growth hint line — coach-voice hint from day 5, threshold undisclosed
- [ ] Task: Kit picker rows — locked/unlocked rows reflect new tier-3 rule
- [ ] Task: Baby scale — 0.6× holder scale for baby stage (respecting rig-units contract from learnings.md)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Wrap-up

- [ ] Task: Full `bun run verify` green; end-to-end manual playthrough plan (fresh run → day 10 evolution; neglected save → delayed evolution; v5 save load)
- [ ] Task: Docs sync — `product.md` landed annotation, README roadmap note, tech-stack dated note if warranted
- [ ] Task: Final review readiness — all tasks `[x]` with commit SHAs, ready for `conductor-review`
