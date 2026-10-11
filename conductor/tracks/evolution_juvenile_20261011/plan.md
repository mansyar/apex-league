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
- [x] Task: Stat boost + kit gate change — [checkpoint: dd9ec78]
  - [x] Tests: +3/+2/+2/+1 applied to rolled base (flat boost, no clamp — statBounds are roll ranges, not combat caps); `effectiveStats` reflects it; tier-3 unlocked at evolution, tier-4 still gated at 6 trained days; loadout helpers agree
  - [x] Implement boost (`evolveCreature` + `EVOLUTION_STAT_BOOST`) + stage-aware `loadout.ts` gate helpers (required stage param; client call sites pass `creature.stage`)
- [x] Task: Save v6 migration — [checkpoint: deda2f1]
  - [x] Tests: v5 fixture migrates to v6 (sickCooldown stamped clean, stage/stats untouched — migrated babies mature on their next well-cared night via the gate); v6 validation rejects malformed sickCooldown; round-trip save/load; migrated day-10 creature evolves on its next settled night
  - [x] Implement schema bump (SAVE_VERSION 6) + v5→v6 migration step + `isValidCreature` cooldown validation in `save/`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Tests: all sim suites green (332 pass) — evolution gate, settlement hook, stat boost/kit gate, save v6 migration
  - [x] Manual verification: scripted headless playthrough `artifacts/evolution-demo.ts` — Path 1 matures night of day 10 with exact +3/+2/+2/+1 boost; Path 2 sick night stamps cooldown 3 and delays to night of day 13; Path 3 v5 payload (day 12, no cooldown field) loads as baby and matures next settled night. Browser verification deferred to Phase 3 checkpoint (ceremony/HUD UI does not exist yet). **[checkpoint: deda2f1]** (verification note appended to deda2f1)

## Phase 2 — Voxel Pipeline: Juvenile Stage Builds

- [x] Task: Stage-variant build API (TDD) — [checkpoint: 0cd197d]
  - [x] Tests: same seed → identical juvenile build across runs; baby build unchanged (digest-stable); stage variant passes proportion-budget audit (200 seeds × 3 archetypes); signature part absent in baby build, present in juvenile; pivot-level hip maturation
  - [x] Implement stage-gating + per-archetype signature parts (drake horn nubs / bovine horn buds / axolotl gill frills) + hip-lift/slim/palette-lift maturation in `packages/voxel/src/stage.ts` + builders
- [x] Task: Determinism gate + artifacts — [checkpoint: b888979]
  - [x] Extend `scripts/determinism-gate.ts` to byte-compare both stages; export-artifact stage argv; committed 3 juvenile GLB + manifest artifacts
  - [x] Verify `bun run gate:determinism` green (6 creature artifacts byte-identical, 5 props digest-match)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — [checkpoint: b888979]
  - [x] Tests: 129 voxel tests pass (incl. stage suite + 200-seed juvenile budget audits); bun run check clean; gate:determinism green
  - [x] Manual visual verification deferred to the Phase 3 browser checkpoint (user-approved); evidence recorded as a git note on b888979

## Phase 3 — Client: Evolution Moment, HUD & Hints

*(presentation — manual verification path)*

- [x] Task: Evolution ceremony — walk-to-center, glow/scale-up mesh swap, coach callout with stat gains; reduced-motion instant variant; non-blocking HUD input — [checkpoint: 69a87b5]
  - Position-driven machine (walk → glow swell → one-frame swap → settle), reduced-motion swaps in place, dt-clamped convergence; `hud.announceEvolution` carries the stat-gain callout
- [x] Task: HUD stage badge + stat row — nameplate badge, boosted stats visible
  - `.stage-badge` on the name row; the stat row reflects boosted base automatically (sim mutated `stats`)
- [x] Task: Growth hint line — coach-voice hint from day 5, threshold undisclosed
  - `growthHint(day, creature)` below condition coach lines in the status priority chain; `EVOLUTION_HINT_DAY = 5` lives in the sim
- [x] Task: Kit picker rows — locked/unlocked rows reflect new tier-3 rule
  - Rows recompute through the stage-aware sim helpers; freshly evolved juveniles see "Evolution unlocked move 3 — …"
- [x] Task: Baby scale — 0.6× holder scale for baby stage (respecting rig-units contract from learnings.md)
  - Holder-scale only (BABY_SCALE 0.6 / JUVENILE_SCALE 1.0), never on rig children; arena casts are stage-seed-aware so the individual never re-rolls
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — [checkpoint: 69a87b5]
  - Browser-driven verification (2026-10-11): dev server + sim-generated v6 save seeded via localStorage, screenshots at each step
  - Verified: baby 0.6× + BABY badge + growth hint (day 9) → advance → JUVENILE badge, boosted stat row (47/14/12/12), evolve callout with gains, walk/glow/swap/settle ceremony → settled juvenile with horn nubs and matured proportions → spar prep shows "Evolution unlocked move 3" with Cinder Shot unlocked at 0 trained days → arena cast preserves the juvenile look → reduced-motion pref gives instant in-place swap
  - Full report attached as a git note on 69a87b5; seed helper committed as checkpoint tooling

## Phase 4 — Wrap-up

- [x] Task: Full `bun run verify` green; end-to-end manual playthrough plan (fresh run → day 10 evolution; neglected save → delayed evolution; v5 save load)
  - `bun run verify` green (559 tests, types, biome, determinism gate). Playthrough scenarios covered by recorded evidence: sim demo Paths 1–3 (fresh/devoted → day-10 evolution with exact boosts; sickness → delayed to day 13; mood 0 → blocked; v5 payload → real save→load pipeline migration) and the browser checkpoint (fresh seeded run through the evolution morning, spar prep, arena cast, reduced motion)
- [ ] Task: Docs sync — `product.md` landed annotation, README roadmap note, tech-stack dated note if warranted
- [ ] Task: Final review readiness — all tasks `[x]` with commit SHAs, ready for `conductor-review`
