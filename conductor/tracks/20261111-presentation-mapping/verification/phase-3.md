# Phase 3 verification — Telegraph + Shader Accents

## Summary

- Base: `a06c9978` (phase marked in progress).
- Head: `HEAD` after the two `feat(client)` commits + this evidence file.
- Result: **verified** — `bun run verify` (exit 0: 4073 pass, 1 skip, 0 fail;
  Biome check clean; determinism gate OK) and `bun run build` (exit 0)
  run as two separate commands. Zero changes under `packages/sim/`.

## Commands

- `bun run verify` → exit code 0.
- `bun run build` → exit code 0 (vite build, 415 modules, 390 ms).

## What changed

- `apps/client/src/tell-scale.ts` (new, P3.T1): pure reach mapping. Builds a
  frozen `(startupMs → reachMm)` table from the sim's published frame data
  (longest reach wins collisions); `estimateStartupMs` recovers the startup
  length from the phaseT span across a startup run; `tellOuterWorld`
  (`(reach + radius) × MM_TO_WORLD`, clamped to the 4.0 show-floor
  half-diagonal); `tellHalfAngle` (wide fan for short reach, narrow for a
  lance); `tellRing` (progress-driven pulse, no clock).
- `apps/client/src/tell-wedge.ts` (new, P3.T1): per-side Tell lifecycle
  (wedge + one pulse ring, fixed two meshes per side). Tracks the startup run
  per side, refines reach from the second sample, rebuilds geometry only when
  the reach bucket changes, keeps the Phase 2 anchor (feet, stream facing).
- `apps/client/src/dense-playback.ts` (P3.T1/P3.T2): delegates telegraphs to
  the Tell set (threading radii + `stepMs` through); topple burst formalized
  as `KO_DISSOLVE` (dust palette, grounded, no flash). Net shrink — the Tell
  block moved out, so `fighter-driver.ts` and other capped modules untouched.
- `apps/client/src/fx/bursts.ts` (P3.T2): `BURST_MAX = 8` with oldest-first
  (FIFO) recycling + a `live()` accessor. Deterministic: spawn order decides.
- `apps/client/src/dense-playback.test.ts`, `tell-scale.test.ts` (new),
  `apps/client/src/fx/bursts.test.ts` (new): reach goldens (basic 420,
  lance 6500), estimator math, collision tiebreaks, outer/arc/ring curves,
  geometry-rebuild-once, repeat-step guard, ring visibility, burst cap +
  eviction + expiry + reduced-motion skip.
- No deviations: no file outside Touches was touched; `staging.ts`,
  mapping/pose modules, and `packages/sim` are unchanged.

## AC table

- AC-6 (wedge length matches reachMm per move; basic short, lance long):
  proven by `tell-scale.test.ts` (160 ms → 420, 720 ms → 6500) and the
  `dense-playback.test.ts` "reach-derived telegraph" block (basic outer
  0.512 vs lance clamped 4.0, lance arc narrower than basic arc).
- AC-6 (both widths): wedge math is resolution-independent (world units off
  the sim millimetres); the headless tests drive the same code path at any
  camera. Full visual pass is Phase 4's.
- AC-8 (only the bounded set is present; instances capped): the set is
  squash-stretch (driver spring kick, unchanged), hit flash/wobble
  (unchanged flash + spring decay), KO dissolve (`KO_DISSOLVE`, dust, no
  flash), telegraph rings (one fixed ring per side). Caps: bursts 8
  (oldest-evicted, tested), flash single slot, decals 6 (pre-existing),
  rings fixed 2 (by construction). Projectiles are shot choreography outside
  the FR-8 set and unchanged.

## Deviations

None — every change sits inside Touches (dense-playback, effects, co-located
tests). The stream carries no move id, so reach is inferred from the
authored startup length (startup is never `spd`-scaled), per the spec's
"approximate, never block" edge case; collisions read the longest threat.

## Notes (for Phase 4)

- Instance caps: bursts `BURST_MAX = 8` (FIFO), decals 6 (FIFO), flash 1
  slot, telegraph rings 2 fixed. State it in the visual pass if the KO
  pileup ever wants more than 8 concurrent bursts.
- Life-gate: bursts/flash/decals skip under reduced motion (as built);
  squash/pose contributions stay life-gated in the driver; the wedge, its
  rings, and the pin/KO dust marks are ungated telegraphs/marks — Phase 4
  owns the flash language and any reduced-motion gating of the tell.
- Wedge scale table (attacker radius 220): basic 420 → 0.512 outer / 0.59
  arc; 5000 → 4.0 clamped / 0.31; lance 6500 → 4.0 clamped / 0.22.
  5200-reach rows also clamp at 4.0 — arc is the only lance-vs-mid read.
- Known approximation: same-startup rows (e.g. 500 ms: sky_bolt 6200 /
  riptide 5800 / ion_wall 4400) all read the longest (6200). If playtesting
  shows ion_wall's tell overstating, the fix is a client-side per-move
  override table, never a sim export.
- First startup frame still shows the basic-size default until the second
  sample firms the estimate (one step).
