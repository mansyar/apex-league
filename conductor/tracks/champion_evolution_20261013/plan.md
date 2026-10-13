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
- [x] Task: Hint constant *(tests first)* — 46f873a *(constant) / 641b2cb *(guard test)*
  - Tests: `CHAMPION_HINT_DAY = 20` exposed from the sim; hint copy function returns direction-only guidance per the discovered-not-hidden guideline *(client copy lands in the Phase 3 HUD task, per the juvenile track's layering)*
  - Implement constant + hint entry in the evolution module
- [x] Task: Save roundtrip *(tests first)* — f8601db
  - Tests: champion-stage creature saves and loads through the existing validator (SAVE_VERSION stays 9); no migration step; malformed stages still rejected
  - Implement only if a gap appears (validator already accepts `"champion"` — none did)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — **[checkpoint: 12e05e1]**
  - Tests: all sim suites green — champion gate, stat application, settlement hook, hint, save roundtrip
  - Manual verification: scripted headless playthrough `artifacts/champion-demo.ts` — Path 1 qualified juvenile evolves night of day 25 with exact +6/+4/+4/+2; Path 2 low bond blocks with `low_bond`; Path 3 no cup win blocks with `no_cup_win`; **[checkpoint: 12e05e1]** (verification note appended)

## Phase 2 — Voxel Pipeline: Champion Stage

- [x] Task: Stage-variant build API extension (TDD) - c902a4d
  - Tests: champion builds digest-stable per seed; champion adds exactly the champion signature parts (absent in baby/juvenile, pivots/colors/parents rigged); every earlier part survives (identity layer); palette family kept, shade lifted again; 200-seed x 3 archetype budget audit green; `parseStage` accepts champion, still throws unknown
  - Implement `Stage` includes `"champion"`, `CHAMPION_MATURITY` applied cumulatively over `JUVENILE_MATURITY` (bodyGirth 1.04 - champions fill out; slimming broke the drake head-height ratio), champion-gated signature parts in all three archetype builders

- [x] Task: Signature upgrades + silhouette tuning — 7038bb2
  - Drake crown horns, bovine full horn curls, axolotl grand frills + tail fin; render → vision-check iterate per the drake-tuning loop; manual verification path (not unit-tested)
  - Tuning loop notes: preview served grey materials by default (color reads were invalid until a `color` param was added); bovine curls originally hugged the main-horn path and fused (first-wins paint order) — restructured to rise steeply between the horns, colored brass; axolotl grandFin recentered on the tail axis and colored coral (dark fin vanished against the backdrop)
- [x] Task: Determinism gate + artifacts — 2a64a01
  - Extend `scripts/determinism-gate.ts` to byte-compare champion builds; export-artifact champion argv; commit 3 champion GLBs + manifest
  - Verify `bun run gate:determinism` green — all 9 archetype-stage builds byte-identical
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Tests: voxel suites green (stage suite + champion budget audits); `bun run check` clean; gate:determinism green; browser visual check deferred to the Phase 3 checkpoint (user-approved pattern from Evolution I) — **[checkpoint: 4472809]**

## Phase 3 — Client: Ceremony, HUD & Casting

*(presentation — manual verification path)*

- [x] Task: Champion rendering — 743ee6b
  - Ranch + arena build paths accept champion; `CHAMPION_SCALE` (1.15×) holder-scale only (rig-units contract from learnings.md); no per-frame regressions
  - `stageScale()` single-sources the ladder in scene-logic (replaces the scattered baby/juvenile ternaries in ranch-motion); scene `setCreature` no longer coerces champion → juvenile
- [x] Task: Ceremony champion variant — 743ee6b
  - Grander glow/swap in the existing position-driven ceremony machine (`begin` takes `{fromScale, toScale}` — champion starts at the juvenile scale, settles at 1.15×); reduced-motion instant variant; non-cancelable; dt-clamped; main.ts triggers on the juvenile→champion transition
- [x] Task: HUD badge, hint & callout — 9a7147b
  - "Champion" stage badge was already stage-aware (`stageLabel`); day-20 hint line added to the coach priority chain (direction-only: bond + cups, no thresholds); `evolveCallout` picks the boost by stage (+6/+4/+4/+2 for champion); condition-plate reflects the boost automatically via effectiveStats
- [x] Task: Arena cast check — 743ee6b
  - `FightCasting`/`CastInfo`/`castFighter` carry an optional `stage`; `roster.buildSpot` passes it to `generate` — this also fixes the pre-existing gap where arena fighters always rendered as baby builds; cup + spar pass the owned creature's stage (rivals keep the stats-only seed); no re-roll between ranch and arena (same `visualSeedOf(stats, stage)`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Browser-driven verification: dev server + sim-generated v9 save seeded via localStorage; screenshots at each step (hint → ceremony → badge → arena cast → reduced motion); console clean; **[checkpoint: 9a7147b]** (verification note appended)

## Phase 4 — Wrap-up

- [ ] Task: Full `bun run verify` green; end-to-end manual playthrough plan (fresh run → day-25 champion; blocked paths: low bond / no cup win; reduced motion)
- [ ] Task: Docs sync — `product.md` landed annotation (Phase 1 evolution tree complete), README roadmap note, tech-stack dated note only if warranted
- [ ] Task: Final review readiness — all tasks `[x]` with commit SHAs, ready for `conductor-review`
