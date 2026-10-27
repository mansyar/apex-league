# PR: Roster Wave 4 (Fire/Plant/Water Discovery) — 12 → 15 species

## Summary

Three new breeding-discovery lines — Embercub (fire), Mossboar (plant), Mistkit (water) — take the roster from twelve to fifteen species. Each line ships a distinct voxel archetype (cub/boar/otter), a six-move kit from the existing vocabulary, full lifecycle parity with two branch forms, rival-field integration, and openly listed handbook recipes. No save change (stays v25); all six bosses keep with probe-gate validation.

## Track

- **ID:** `20261027-roster-wave-4`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261027-roster-wave-4/spec.md`](conductor/archive/20261027-roster-wave-4/spec.md)
- **Plan:** [`conductor/archive/20261027-roster-wave-4/plan.md`](conductor/archive/20261027-roster-wave-4/plan.md)
- **Review:** [`conductor/archive/20261027-roster-wave-4/review.md`](conductor/archive/20261027-roster-wave-4/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Species & discovery lookup | 15-species registry + fire-triangle lookup, save v25 | verified | `1d249352` | test-only pins in cup/gatekeeper-reach + nursery-vm + breeding speciesOptions |
| 2: Voxel archetypes | cub/boar/otter, gated + pinned | verified | `030cd383` | budges/face/choreo adjustments; otter fin geometry fix (not threshold) |
| 3: Client presentation | render + lifecycle + handbook | verified | `9ed5c037` | 6 sim branch defs (in-scope deviation); boss-test allowlist +8; crest-glyph pin rework |
| 4: Rivals & bosses | 15-pool fields, boss validation, browser | verified | `02a524b6` | primary rewrote subagent's draw test onto the file's own helpers; bosses kept 0-delta with probe numbers |
| R1: Review fixes | resolve R1 (AC-6) + R2 (landscape) | verified | `dc41b98c` | spec/plan keep-with-gates amendment; 852×393 pass |

## Requirements

- [x] `FR-1` — three SpeciesDefs, locked, breeding-only (test: `packages/sim/src/species/species.test.ts`)
- [x] `FR-2` — cub/boar/otter archetypes, determinism gate + ≤320 KiB (test: `packages/voxel/src/*.test.ts`, gate)
- [x] `FR-3` — kits from existing vocabulary, probe-tuned (test: `species-wave4-discovery.balance.test.ts`)
- [x] `FR-4` — pure order-independent lookup, both orders, v25 (test: `breeding/discovery.test.ts`)
- [x] `FR-5` — hatch → train → two branch forms (test: lifecycle + `branch-catalog` pins)
- [x] `FR-6` — 15-pool fields; bosses validated (test: `cup/rival-roster.test.ts` + probe gates)
- [x] `FR-7` — render + handbook recipes, desktop + phone (test: `handbook.test.ts`, browser pass)
- [x] `FR-8` — voice copy, single-sourced (test: handbook copy/sentence pins)
- [x] `NFR-1..NFR-6` — v25, caps, determinism, hues, probe, both orientations (landscape captured in R1)
- [x] `AC-1..AC-8` — all covered (AC-6 via keep-with-gates amendment, re-reviewed PASS)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --check --parallel=4 --timeout 120000` | pass | `conductor/archive/20261027-roster-wave-4/verification/integrated.md` |
| lint/format | `biome check` | pass | 812 files clean |
| typecheck | `bun run check` | pass | sim/voxel/server/client clean |
| determinism | `bun run gate:determinism` | pass | 15 archetypes × 3 stages + 5 props |
| build | `bun run build` | pass | client bundle succeeds |
| visual | `playwright-cli` vs `bun run dev` | pass | Raising/Paths/battle desktop, ranch phone, landscape; console 0/0 |

## Media

Media: handbook Raising + battle screenshots (desktop 1280×720), ranch screenshot (iPhone 15 portrait), handbook Raising screenshot (landscape 852×393) in `.conductor/evidence/20261027-roster-wave-4/` (phase-4-raising-desktop.png, phase-4-battle-desktop.png, phase-4-ranch-phone.png, phase-R1-landscape.png).

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 2 findings (R1 High: AC-6 keep-with-gates amendment; R2 Medium: landscape pass)
- **Accepted/deferred:** 0 (strict mode, issues disabled — see `review.md` Debt)

## Deviations and risks

- Bosses kept 0-delta (no retune fired): validated by exact probe matrices (disadvantaged fresh cells 0/36, trained+6 caps ≥66.7% vs 35% bar) + `cup.boss.test.ts` routing. Risk: none to balance; spec/plan amended to codify keep-with-gates.
- P3 added 6 sim branch defs though plan Touches were client-only: required (branch forms are sim-side); documented in phase-3 evidence.
- P4 subagent authored a draw test against a fictional API; primary rewrote it on the file's own helpers. Risk: none (suite green).
- Desktop captures ran at the environment's 1280×720 viewport rather than the nominal 1440×900; actuals recorded in phase-R1 evidence. Risk: none (responsive layout, element-true at captured sizes).

## Follow-ups

- none

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

No migration, no feature flag, no persisted state (save stays v25) — rollback is a clean revert.
