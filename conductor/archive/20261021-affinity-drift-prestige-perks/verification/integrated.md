# Integrated Verification — Type Affinity Drift & Extended Prestige

**Track:** 20261021-affinity-drift-prestige-perks
**Date:** 2026-10-21
**Branch:** `feat/20261021-affinity-drift-prestige-perks`
**Base:** `main` @ `8a9dfdb`
**Head:** `9b3c9e6`

## Full-track gate

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | typecheck (voxel/sim/client) + biome (479 files) + full test suite (2119 pass / 1 skip / 0 fail, `--check --parallel`) + module-size guard + determinism gate (9 creature GLBs + 5-prop digest byte-identical) |
| `bun run build` | 0 | Vite production build clean |

## Phase checkpoints

| Phase | Checkpoint | Commit |
| --- | --- | --- |
| 1 — Affinity Roll & Save v20 | `7deec17` | feat(sim): decide affinity drift at breeding and persist save v20 |
| 2 — Cancel-to-Neutral Defense Rule | `67660bb` | feat(sim): cancel-to-neutral secondary defense with cup-side threading |
| 3 — Prestige Milestones 7 & 9 | `f0f067f` | feat(sim): prestige milestones 7 and 9 — refined blood floor and champion stable |
| 4 — Client Surfaces | `d2bef0b` | feat(client): surface affinity drift and prestige perks across the client |
| 5 — Docs Sync & Integrated Verification | `c657b9c` | docs: sync roadmap, stack notes and README for affinity drift and prestige perks |

## Requirements coverage

- **FR-1** seeded 15% drift roll at breeding — Phase 1 ✅
- **FR-2** save v20 additive `affinity` + migration + validation — Phase 1 ✅
- **FR-3** cancel-to-neutral incoming defense — Phase 2 ✅ (cup-side threading included)
- **FR-4** Refined Blood floor 0.55 at prestige ≥ 7 — Phase 3 ✅
- **FR-5** Champion Stable head-start AP + +1..+3 mutation band — Phase 3 ✅
- **FR-6** client full pass (preview, dual crest, ticker, Handbook) — Phase 4 ✅ (visual evidence at desktop + iPhone 15)
- **FR-7** docs sync (save-schema, product, tech-stack, README) — Phase 1 + Phase 5 ✅

## Cross-cutting invariants

- **Previewed = hatched (NFR-4):** preview and hatch read the same seeded `createBredCreature` roll.
- **Determinism (NFR-3):** drift roll has its own salted RNG stream; mutation widening keeps pre-perk streams byte-identical; all goldens and boss win-rate bands pass unchanged.
- **Module cap (NFR-1):** `module-size.test.ts` green, 0 offenders.
- **No new dependencies (NFR-2):** no `package.json` change across the track; determinism gate untouched.

## Docs sync

- `docs/save-schema.md` — v20 rows, migration, validation (Phase 1, same phase per project rule).
- `conductor/product.md` — Phase 2 items marked landed 2026-10-21; Core Loop sentence updated (Phase 5).
- `conductor/tech-stack.md` — dated 2026-10-21 note (Phase 5).
- `README.md` — save version and training-program truth fixes; drift mentioned where breeding genetics already described (Phase 5).
