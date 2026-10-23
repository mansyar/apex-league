# Integrated Verification — Test Suite Speedup

- **Track:** `20261023-test-suite-speedup`
- **Date:** 2026-10-24
- **Branch:** `chore/20261023-test-suite-speedup`
- **Range:** `18eebd04065dc971c38e5e16c8dfa721f55ea277` (base, merged #49) → `a454fb14` + the LF fix
- **Result:** ✅ green

## Strategy

| Layer | Command | Exit | Result |
|---|---|---|---|
| Static (types) | `bun run check` | 0 | voxel 90 / sim 147 / client 352 files, no type errors |
| Static (lint+format) | `bunx biome check` | 0 | 570 files clean (after restoring LF in metadata.json — the only defect the integrated pass caught) |
| Unit (whole suite) | `bun test --check --parallel --timeout 120000` (inside verify) | 0 | 2,452 pass / 1 skip / 0 fail, 126,720 expect(), 194 files |
| Determinism | `bun run gate:determinism` (inside verify) | 0 | 18 GLBs + 5 props byte-identical, committed hashes unchanged |
| Fuzz sweep | `bun run test:fuzz` | 0 | 44 tests / 765 expect() / 42 files / 41 s — full seed lists (+92 expects vs the gate's smoke mode, restoring the sliced −92) |
| Phase runner | `bun run test:phase` | 0 | 2,453 tests / 126,720 expect() / 194 files / 57.6 s — final AC-1 measure |
| Integrated | `bun run verify && bun run build` | 0 / 0 | verify 77 s (≤ 120 s, AC-6); build exit 0 |
| Coverage | — | n/a | `coverage.gate: "none"` |
| Visual | — | n/a | no player-visible change; the workflow's visual layer does not apply |

## What the track proved (per phase)

- **Phase 1 (capped runner + tiered policy):** `test:phase` script added; the Worker sweep table (serial 206 s / 4→210 s / 8→167 s / 12→163 s / uncapped→92 s) grounds the design decision — a worker cap costs speed on heavy files, so the speedup must come from seed slicing; guards proven to fire under workers (15/0 incl. negative controls); the tiered policy documented in `conductor/workflow.md` (Phase Test Tiers).
- **Phase 2 (voxel smoke slices):** all 41 fuzz files sliced (89 gate seeds vs 303 full), gate voxel leg measured (69 s capped-4; per-file import overhead identified), sweep spot-check restored full lists; user-approved spec revision moved the voxel-alone target 35 s → 70 s; whole-suite phase leg already met at 73 s.
- **Phase 3 (nightly sweep):** `test:fuzz` lands as `APEX_FUZZ_SWEEP=full bun test --check --parallel --timeout 120000 packages/voxel/src/fuzz` (POSIX-prefix env, runtime-proven on Windows via the +92-expect sweep delta and the single-file 0.98 s → 2.61 s probe); nightly.yml gained one `Fuzz sweep` step after the determinism gate; final numbers: phase leg 53–58 s (≤ 150 s ✅), verify 77–80 s (≤ 120 s ✅), sweep 41 s "completes comfortably" ✅.

## Defects found and fixed during the integrated pass

- `conductor/tracks/20261023-test-suite-speedup/metadata.json` had been rewritten with CRLF line endings by the Phase-3 acceptance script (the earlier acceptance scripts explicitly wrote LF; this one omitted it) — biome's format check caught it in `bun run verify`. Fixed by restoring LF (`fix(conductor)` commit) and re-running: verify exit 0.

## Numeric targets summary

| Metric | Baseline (pre-track) | Final | Target | Verdict |
|---|---|---|---|---|
| Whole-suite phase test leg (capped 4 workers) | 210 s (measured at Phase 1) / 206 s serial | **53–58 s** | ≤ 150 s | ✅ |
| `bun run verify` | ~120–157 s | **77–80 s** | ≤ 120 s | ✅ |
| Voxel-alone PR-gate leg | 141 s serial / 61 s uncapped | **69 s** capped-4 | ≤ 70 s (revised) | ✅ |
| Full fuzz sweep | n/a (new) | 41 s | completes comfortably | ✅ |
| CI | ~1m20–1m40s | unchanged by design (ci.yml untouched) | no regression | ✅ |
