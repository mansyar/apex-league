# Phase 5 Verification — Docs Sync & Integrated Verification

**Track:** 20261021-affinity-drift-prestige-perks
**Date:** 2026-10-21
**Branch:** feat/20261021-affinity-drift-prestige-perks

## Commands

| Command | Result |
| --- | --- |
| `bun run verify && bun run build` | Exit 0. `bun run check`: no type errors in @apex/voxel (62 files), @apex/sim (94 files), @apex/client (302 files). `bun test --check --parallel --timeout 120000`: 2119 pass / 1 skip / 0 fail across 156 files (48.70s). `biome check`: checked 479 files, no fixes applied. `gate:determinism`: all nine creature artifacts plus the 5-prop digest regenerate byte-identical. `bun run build`: Vite production build, 246 modules, built in 867ms, exit 0. |

## AC-7 — Docs match the shipped schema and roadmap truth

| Check | Result |
| --- | --- |
| `docs/save-schema.md` states v20 | ✅ Verified by inspection (no changes needed): `version: number // current: 20 (SAVE_VERSION)`, `GameState` at v20, `affinity` documented on the active creature (line 44) and `RetiredRecord` (line 114), v19→v20 migration stamps `null` with no backfill (line 141), load/import validation rejects secondary == primary and unknown elements (lines 220–225). |
| `conductor/product.md` Phase 2 items marked landed | ✅ Applied by the primary agent (the subagent session could not write `conductor/` files): Core Loop legacy sentence updated, Phase 2 ladder bullet marks both items landed 2026-10-21, breeding bullet marks prestige perks and type affinity drift landed with their parameters. |
| `conductor/tech-stack.md` dated note (save v20, drift roll, cancel rule, two milestones) | ✅ Applied by the primary agent: dated `2026-10-21` entry appended to the Client notes list before `## Quality Gates`, covering v20, the drift roll, the cancel rule, both milestones, the client surfaces, and "No new dependency; the determinism gate is untouched." |
| `README.md` truth fixes | ✅ Committed 39cb008: release-checklist save migration updated v15→v16 → v19→v20; "one training focus" replaced with the four training programs (Power Lifting, Endurance Circuit, Sprint Work, Ring Craft); "training focus" in the intro now "training programs"; breeding-genesis sentence gained the seeded 15% secondary-affinity roll (README already described breeding genetics, so drift is mentioned there); Phase 2 roadmap row no longer lists prestige perks/affinity drift as remaining (extra lineages still remain). No new feature marketing added. |

## Full-track summary (one line per phase)

- **Phase 1** (checkpoint 7deec17): seeded 15% drift roll at breeding with distinct RNG constant; save v20 additive `affinity` on active creature + `RetiredRecord`; v19→v20 migration stamps `null`; validation on load/import; `docs/save-schema.md` updated.
- **Phase 2** (checkpoint 67660bb): incoming cancel-to-neutral defense rule in the resolver (×2-vs-primary + ×0.5-vs-secondary → ×1), outgoing untouched, boss win-rate bands re-proven; cup-side affinity threading via `CupSlot` → `battleSideForSlot`.
- **Phase 3** (checkpoint f0f067f): prestige milestones 7 (Refined Blood, floor 0.5→0.55) and 9 (Champion Stable: +1 max AP days 1–5 post-hatch, mutation band +1..+2 → +1..+3) in `LineagePerks`; player-lineage-only, boss goldens unchanged.
- **Phase 4** (checkpoint d2bef0b): client pass — nursery preview shows the rolled secondary, dual-element crest on plate + detail modal, coach ticker drift announcement, Handbook documents cancel rule and both perks; all modules ≤ 12,288 B with `detail/kit-rows.ts` extracted.
- **Phase 5** (this phase): README truth fixes committed; product.md and
  tech-stack.md sync applied by the primary; integrated gate green.

## NFR-2 / dependency confirmation

- `git status` after all Phase 5 work shows only `README.md` modified — no `package.json` touched anywhere in the workspace, so no new dependencies.
- The determinism gate ran as part of `bun run verify` and regenerated all nine creature artifacts and the 5-prop digest byte-identically — no generator, DNA, or GLB change; the gate itself is untouched.

## Deviations / blockers for the primary

1. ~~`conductor/product.md` and `conductor/tech-stack.md` edits were denied by
   the session's permission layer~~ **Resolved:** the primary applied both
   syncs directly (see the AC-7 table and the dated `2026-10-21` note in
   `conductor/tech-stack.md`).
2. A stale sentence outside the Phase 2 section was left untouched per the
   brief's scope limit: `product.md` Core Loop still said "type affinity drift
   remains on the roadmap." **Resolved:** updated by the primary when applying
   the product.md sync.
