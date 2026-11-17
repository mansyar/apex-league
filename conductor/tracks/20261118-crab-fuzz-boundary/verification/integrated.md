# Integrated Verification — Nightly fuzz red: crab boundary

- **Track:** 20261118-crab-fuzz-boundary
- **Type:** bug
- **Branch:** `fix/20261118-crab-fuzz-boundary`
- **Base:** `main` @ `b7fcaf47fad9810396b13c3776589448423d4fda`
- **Date:** 2026-11-18
- **Result:** **PASS**

## Commands

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Static/unit/determinism | `bun run verify` | exit 0 — 4,207 pass / 1 skip / 0 fail, 491,341 `expect()` calls, 4,208 tests across 377 files; Biome checked 946 files with no fixes; determinism gate OK for all 15 species GLBs and 5 prop seed-42 digests | `phase-1.md`, `phase-2.md` |
| Build | `bun run build` | exit 0 — Vite 8.3.4, 420 modules, built in 326 ms (chunk-size warning only) | `phase-2.md` |
| Full fuzz sweep | `bun run test:fuzz` (`APEX_FUZZ_SWEEP=full`) | exit 0 — 97 pass / 0 fail, 1,007 `expect()` calls across 93 fuzz files; seeds 24 and 37 PR-visible and green | `phase-2.md` |
| Phase leg (exact) | `bun run verify && bun run build && bun run test:fuzz` | exit 0 in both phases | `phase-1.md`, `phase-2.md` |
| Visual | not applicable | voxel-only generator/fuzz change; no user-facing DOM or rendering surface changed | spec Out of scope |

## Phase checkpoints

| Phase | Name | Checkpoint | Result |
| --- | --- | --- | --- |
| 1 | Correct crab foot placement and refresh deterministic artifacts | `d2c9f679788b3f49d8fd36c1b1ab33bf859df3e1` | verified |
| 2 | Gate-visible regression coverage and scope proof | `8de7d999afc4aec34cf2a55b2802190ef186ae6d` | verified |

## Invariants

- `SIM_VERSION` and the continuous-battle final hash are unchanged (`0xff6f3d62`); the 840-fight cap share remains `224/840 (26.7%)`.
- Determinism gate is byte-identical after explicit regeneration of all three seed-42 crab GLB/manifest pairs through `export-artifact.ts`: baby `180,608 B`, juvenile `178,844 B`, champion `192,800 B`.
- No leg radius or coarse `AUDIT_STEP=2` lattice change; `footY = 1.9 * bg + 1.0` holds the capsule bottom 1.0 above `y = 0` for every girth.
- Full fuzz boundary invariant `0 < coordinate < CRAB_GRID - 1` now holds for every sampled seed, including previously failing seeds 24 and 37.
- PR-visible smoke prefix preserved; `APEX_FUZZ_SWEEP=full` remains exclusive to `bun run test:fuzz`, so negative cases now fail PR checks without expanding the nightly-only runner.
- Scope confined to `packages/voxel/src/crab.ts`, six `artifacts/crab-42*` files, two fuzz shards, and Conductor state/evidence. No sim/battle/save/UI/dependency change.

## Deviations / notes

- The Phase 1 and Phase 2 subagents were shell-denied for `bun`, `Get-FileHash`, and `git hash-object`. The primary ran every denied command exactly, recorded the results, and the phases were accepted only after independent re-verification.
- Phase 2 initially failed Biome formatting on two `const CHUNK` assignments. The subagent fixed formatting only in one rework attempt; the primary re-ran the full gate to green.
- The expected non-gating `smoke: RESULT fail ... not an http(s) URL: file:///tmp/x` diagnostic from `scripts/smoke/smoke.test.ts` remains unchanged and does not fail `verify`.
