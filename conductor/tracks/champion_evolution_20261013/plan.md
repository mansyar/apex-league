# Plan — Evolution II: Champion Stage

**Track ID:** `champion_evolution_20261013`
**Spec:** [./spec.md](./spec.md) · **Status:** approved 2026-10-13

Workflow: TDD for logic-bearing tasks (tests first, red → green → refactor),
manual verification for presentation tasks, phase checkpoints per
`conductor/workflow.md`.

## Phase 1 — Sim Core: Champion Gate & Stats

*(all logic-bearing — strict TDD)*

- [x] Task: Champion evolution gate *(write failing tests first)* — 46f873a
  - Tests: juvenile at day ≥ 25 with mood ≥ 40, sickCooldown 0, bond ≥ 60, cupsWon ≥ 1 → `ready`; each failing condition yields its reason (`too_young`, `recently_sick`, `low_mood`, `low_bond`, `no_cup_win`); `not_juvenile` for baby/champion stages; baby→juvenile path byte-identical to current behavior; deterministic (seeded fixtures)
  - Implement `CHAMPION_EVOLUTION_DAY = 25`, `CHAMPION_BOND = 60`, `CHAMPION_CUPS = 1` + stage-aware gate in `packages/sim/src/evolution.ts`
- [x] Task: Champion stat application + settlement hook *(tests first)* — 591429f
  - Tests: `evolveCreature` champion branch applies pinned +6/+4/+4/+2 to rolled base; juvenile boost unchanged; settlement calls the gate on the juvenile path and applies the boost **after** the full settlement; bond/cups judged from settled values; integration: night ending day 25 evolves a qualified juvenile
  - Implement in `evolution.ts` (generalized `evolveCreature`) + `settlement.ts` hook
- [ ] Task: Hint constant *(tests first)*
  - Tests: `CHAMPION_HINT_DAY = 20` exposed from the sim; hint copy function returns direction-only guidance per the discovered-not-hidden guideline
  - Implement constant + hint entry in the evolution module
- [ ] Task: Save roundtrip *(tests first)*
  - Tests: champion-stage creature saves and loads through the existing validator (SAVE_VERSION stays 9); no migration step; malformed stages still rejected
  - Implement only if a gap appears (validator already accepts `"champion"`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Tests: all sim suites green — champion gate, stat application, settlement hook, hint, save roundtrip
  - Manual verification: scripted headless playthrough `artifacts/champion-demo.ts` — Path 1 qualified juvenile evolves night of day 25 with exact +6/+4/+4/+2; Path 2 low bond blocks with `low_bond`; Path 3 no cup win blocks with `no_cup_win`; **[checkpoint: <sha>]** (verification note appended)

## Phase 2 — Voxel Pipeline: Champion Stage

- [ ] Task: Stage-variant build API extension (TDD)
  - Tests: `Stage` includes `"champion"`; baby/juvenile builds digest-stable (unchanged); champion passes proportion-budget audit (200 seeds × 3 archetypes); signature parts absent in juvenile, present in champion; `parseStage` accepts champion and still throws on unknown
  - Implement `CHAMPION_MATURITY` multipliers + champion-gated signature parts in `packages/voxel/src/stage.ts` + archetype builders
- [ ] Task: Signature upgrades + silhouette tuning
  - Drake crown horns, bovine full horn curls, axolotl grand frills + tail fin; render → vision-check iterate per the drake-tuning loop; manual verification path (not unit-tested)
- [ ] Task: Determinism gate + artifacts
  - Extend `scripts/determinism-gate.ts` to byte-compare champion builds; export-artifact champion argv; commit 3 champion GLBs + manifest
  - Verify `bun run gate:determinism` green
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Tests: voxel suites green (stage suite + champion budget audits); `bun run check` clean; gate:determinism green; browser visual check deferred to the Phase 3 checkpoint (user-approved pattern from Evolution I)

## Phase 3 — Client: Ceremony, HUD & Casting

*(presentation — manual verification path)*

- [ ] Task: Champion rendering
  - Ranch + arena build paths accept champion; `CHAMPION_SCALE` (~1.15×) holder-scale only (rig-units contract from learnings.md); no per-frame regressions
- [ ] Task: Ceremony champion variant
  - Grander glow/swap in the existing position-driven ceremony machine; reduced-motion instant variant; non-cancelable; dt-clamped
- [ ] Task: HUD badge, hint & callout
  - "Champion" stage badge on the name row; day-20 hint line in the coach priority chain; unlock callout with stat gains; condition-plate reflects the boost automatically
- [ ] Task: Arena cast check
  - Cup and spar opponents + player cast champion correctly via the stage-aware `visualSeedOf`; no re-roll between ranch and arena
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Browser-driven verification: dev server + sim-generated v9 save seeded via localStorage; screenshots at each step (hint → ceremony → badge → arena cast → reduced motion); console clean; **[checkpoint: <sha>]** (verification note appended)

## Phase 4 — Wrap-up

- [ ] Task: Full `bun run verify` green; end-to-end manual playthrough plan (fresh run → day-25 champion; blocked paths: low bond / no cup win; reduced motion)
- [ ] Task: Docs sync — `product.md` landed annotation (Phase 1 evolution tree complete), README roadmap note, tech-stack dated note only if warranted
- [ ] Task: Final review readiness — all tasks `[x]` with commit SHAs, ready for `conductor-review`
