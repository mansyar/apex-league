# Integrated Verification — Earth & Wind Species Line

- **Track:** 20261023-earth-wind-species-line
- **Date:** 2026-10-23
- **Branch:** `feat/20261023-earth-wind-species-line`
- **Range:** `e9fea33945c340e7a5e33d81a88796547fe71302` (base, merged main) → `cab8f4d`
- **Result:** ✅ **green** — the complete configured verification strategy passes on the track branch after all four phases.

## The strategy, executed end to end

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static | `bun run check` | 0 | No type errors — voxel 90, sim 148, client 352 files. |
| Static | `biome check` | 0 | 569 files checked, no fixes applied (direct `bunx biome check` by the primary). |
| Unit | `bun test --check --parallel --timeout 120000` | 0 | **2,452 pass / 1 skip / 0 fail**, 126,818 expect() calls across 195 files — includes the three module-size guards, the boss-band suites, the rival-roster pins, the migration chain suite, and the new lifecycle integration tests. |
| Determinism | `bun run gate:determinism` | 0 | **18 creature GLBs byte-identical** (6 archetypes × 3 stages @ seed 42, incl. the new falcon and tortoise) + 5-props digest match. The 12 pre-existing GLBs carry unchanged digests. |
| Integrated | `bun run verify` | 0 | All of the above in one pass, green. |
| Build | `bun run build` | 0 | `@apex/client` vite build, 294 modules (pre-existing chunk-size warning only). |
| Visual | `playwright-cli` against `bun run dev` | — | Desktop + iPhone 15 pass across ranch / nursery gift flow / handbook chart-moves-paths / detail modal / coaching room / battle HUD; **0 console errors, 0 warnings on both viewports**; evidence in `verification/phase-4.md` (screenshots under `.conductor/evidence/phase-4/`). |
| Coverage | not configured | — | `coverage.gate: "none"` in the workflow config. |

## What the track proved

- **Phase 1** — both species authored at the stat extremes (falcon: highest SPD / lowest HP+DEF; tortoise: highest HP+DEF / lowest SPD), 16-move pools with the standard learn schedule, breeding acceptance, tier-gated rival rosters (Gold → falcon, Legend → tortoise), balance probes green, boss sides pinned byte-identical.
- **Phase 2** — the storm gift generalized into a per-tier league reward record (`claimedTiers` + `pendingRewards` queue), save v24 → v25 lossless migration, honest renames across the seam, nursery and cup-results clients generalized, grant/purity tests green.
- **Phase 3** — two hand-authored voxel archetypes (falcon / tortoise), full registration (registry, budgets, face plans, stage signatures, barrel), fuzz suites, seed-42 artifacts committed, determinism gate extended 12 → 18 GLBs with the 12 pre-existing digests unchanged.
- **Phase 4** — both lifecycles proven end-to-end through real seams (cup finalize → queue hatch → care nights → champion branch → clock-driven cup win), client surfaces confirmed data-only, visual pass green.

## Known flags (carried to review)

1. Stale handbook type-chart population note ("waiting for their species") — client copy now factually wrong.
2. `choreo.ts` `profileFor()` falls back to `DEFAULT_PROFILE` for falcon/tortoise — plausible but unauthored battle animation.
3. Falcon silhouette reads chunky for a speedster; iPhone 15 starter-card nav overlap is cosmetic.
