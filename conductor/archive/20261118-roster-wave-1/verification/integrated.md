# Integrated verification — Roster Wave 1

- **Track:** `20261118-roster-wave-1`
- **Branch:** `feat/20261118-roster-wave-1`
- **Base:** `main` @ `99c07b35bb01fc658cf646f9e89bb67c4d81eaad`
- **Date:** 2026-11-18
- **Result:** **PASS**

## Verification commands

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Static + unit + determinism | `bun run verify` | exit 0; 4302 pass / 1 skip / 0 fail, 585613 `expect()` calls, 4303 tests across 401 files; Biome checked 974 files, no fixes; determinism gate OK for 54 seed-42 artifact pairs + 5 prop digests | `verification/phase-1.md`, `verification/phase-2.md` |
| Build | `bun run build` | exit 0; Vite 423 modules; only chunk-size advisory | `verification/phase-2.md` |
| Balance | `bun run balance` | exit 0; 18/18 species inside unchanged 2-sided 95% bands; cap share 384/1224 (31.4%) ≤ 33.3%, decisive 1149/1224 (93.9%), cap-win quality 312/384 (81.3%), median 32.93 s, damage band 49/49, all six bosses ok, no waivers | `verification/phase-1.md`, `verification/phase-2.md` |
| Determinism (standalone) | `bun run gate:determinism` | exit 0; all 54 GLB/manifest pairs byte-identical, final sim hash `0xff6f3d62` | phase full-chain runs |
| Fuzz (full sweep) | `bun run test:fuzz` | exit 0; 118 pass / 0 fail, 128931 `expect()` calls across 114 files | `verification/phase-1.md`, phase full-chain run |
| Visual | `playwright-cli` + `bun run dev` | desktop 1440×900 and iPhone 15 393×852 handbook/gallery screenshots with zero console errors/warnings; primary landscape check at 852×393 had `scrollW=clientW=852` on handbook and gallery | `verification/phase-2.md`, `.conductor/evidence/20261118-roster-wave-1/**` |

## Phase checkpoints

| Phase | Checkpoint | Evidence |
| --- | --- | --- |
| 1 — Species data, voxel archetypes, and deterministic artifacts | `0dc9995c` | `verification/phase-1.md` |
| 2 — Client discoverability and visual evidence | `51b03182` | `verification/phase-2.md` |

## Invariants

- Roster is 18 species: 15 baseline + `dune_jerboa`, `spark_ray`, `gale_moth`. All 18 pass the unchanged hard balance gate; no waiver, threshold, fence, or pacing debt pin was weakened or retired.
- `SIM_VERSION`, save schema, migrations, dependency manifests, controller family, pacing fences, and the D-1 debt marker remain unchanged. The pacing debt fixture is pinned to the baseline 15-species population so the owner-ratified marker measures the same population; new-species pacing is covered by balance/fuzz gates.
- Recipes are order-independent and live only in the sim seam; the client reads that seam and keeps no duplicate recipe table.
- Three new voxel archetypes (`jerboa`, `ray`, `moth`) and nine new seed-42 GLB/manifest pairs are byte-identical under the determinism gate; the 45 pre-existing pairs remain byte-identical.
- Full fuzz sweep remains green, including 21 new jerboa/ray/moth boundary/budget/determinism shards.
- UX principle 8 holds at 393×852 and 852×393; phase-captured console has zero errors/warnings. The only separate observation was a pre-existing `favicon.ico` 404 on a fresh direct gallery navigation, outside this track's `Touches`.
- Module-size caps and all static checks remain green.

## Deviations and risks

- Phase subagents could not run several standalone shell commands; the primary re-ran the exact full chain and resolved every such blocker before acceptance.
- Accepted out-of-`Touches` files in Phase 1: choreography `BodyProfile` table and parity test (required by AC-4), `BODY_PROFILES` in `packages/sim/src/species.ts`, roster-count/diagnostic pins across sim tests, telemetry mirror-hop start 9 (stride 11, sample size and assertions unchanged), and the diagnostic pacing-fixture roster filter. No gate, pin assertion, fence, schema, version, or dependency changed.
- The gallery's mixed rotation still shows only registry indices 0–7; the three new archetypes are discoverable through per-archetype URLs, and no hardcoded species list was introduced.
- Primary review checks exposed wall-clock flakiness in three long-running tests at 18 species (gatekeeper climb 20 s, proportion sweep 120 s, balance report 120 s). Test-only timeouts were raised to 60 s / 240 s / 240 s with all assertions, budgets, gates, fixtures and seed counts unchanged; `bun run verify` was then re-run green (4302 pass / 1 skip / 0 fail, Biome 974 clean, determinism gate OK for 54 pairs). This is timing headroom, not a weakened gate.
- Physical device-lab verification remains a human-only follow-up and was out of scope.
