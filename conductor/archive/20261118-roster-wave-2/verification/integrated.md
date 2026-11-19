# Integrated Verification - Roster Wave 2

- **Track:** `20261118-roster-wave-2` (Roster Wave 2)
- **Branch:** `feat/20261118-roster-wave-2`
- **Base:** `main` @ `7dd56544a10a203621e522bedaa15ee047b300b3`
- **Date:** 2026-11-19
- **Result:** **PASS**

## Verification commands

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Static + unit + determinism | `bun run verify` | exit 0; 4367 pass / 1 skip / 0 fail; 665357 `expect()` calls; 4368 tests across 426 files; Biome 1005 files clean; determinism gate OK | `verification/phase-2.md` |
| Build | `bun run build` | exit 0; Vite 8.3.4; 428 modules; chunk-size warning only | `verification/phase-2.md` |
| Balance | `bun run balance` | exit 0; 21/21 species inside the unchanged hard band; all global gates ok; final hash `0xff6f3d62` | `verification/phase-2.md` |
| Determinism | `bun run gate:determinism` | exit 0; 63 seed-42 artifact pairs byte-identical (21 archetypes × 3 stages) plus 5 prop digests | `verification/phase-1.md`, `verification/phase-2.md` |
| Fuzz | `bun run test:fuzz` | exit 0; 139 pass / 0 fail; 129015 `expect()` calls; 139 tests across 135 files | `verification/phase-2.md` |
| Visual | `playwright-cli` against `bun run dev` | 12 screenshots at 1440×900, 393×852, and 852×393; zero console errors/warnings on captured surfaces; no document horizontal scroll | `verification/phase-2.md`, `.conductor/evidence/20261118-roster-wave-2/` |

The exact combined phase chain `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` was re-run by the primary at both final phase heads and exited 0 each time.

## Phase checkpoints

| Phase | Checkpoint | Result |
| --- | --- | --- |
| 1 - Species data, voxel archetypes, and deterministic artifacts | `64b28e1c` | verified |
| 2 - Client discoverability and visual evidence | `4dca8020` | verified |

## Invariants and scope

- Roster is 21 species. Three new breeding-discovery lines: Thornvolt (wind; `plant + electric` recipe), Siltback (water; `water + earth`), Emberwing (fire; `fire + wind`). All three recipes are order-independent.
- Six new branch forms have globally unique, element-true signatures; gate assertions unchanged.
- Three new voxel archetypes (`sprite`, `golem`, `wing`) are registered, budgeted, fuzzed, and paired with nine new seed-42 artifact GLBs/manifests. All 63 artifact pairs regenerate byte-identically.
- Balance passes 21/21 with no waiver and no gate/threshold/fence change. Cap share 517/1680 (30.8%), decisive share 1574/1680 (93.7%), cap-win quality 415/517 (80.3%), median 32.82s, damage band 49/49, all six bosses ok.
- Owner-approved rework: Thornvolt is wind; a minimum evidence-demonstrated stat-bound adjustment was applied only to voltfox (HP +8/ATK +1), embercub (HP +8/ATK +1), and emberwing (ATK +1). The original nine-kit sustained-band source and all gate assertions are restored.
- Pacing debt pin remains byte-for-byte from base; its diagnostic fixture still measures the original 15-species population.
- `SIM_VERSION`, save schema, dependency manifest, battle controller, and balance thresholds are unchanged; final sim hash remains `0xff6f3d62`.
- Client module caps hold without allowlists (`choreo.ts` split into `choreo_wave.ts`); voxel modules stay under 24,576 B.
- UX principle 8 holds at 393×852 and 852×393 on changed surfaces: no document horizontal scroll, no occluded controls, clean console.
- No gallery hardcoded species list; new archetypes are reachable via `?archetype=sprite|golem|wing`, and the handbook derives recipe rows from simulation data.

## Deviations

- Phase subagents could not run several `bun`/hash commands under their restricted shells; the primary ran every listed command independently and recorded exact counts/hashes in phase evidence.
- Phase 1 required three rework rounds: artifact authoring, owner-directed wind redesign, and owner-approved minimal existing-bound retune. All are recorded in `verification/phase-1.md`; the final gate is green.
- `apps/client/src/choreo_wave.ts` and `packages/voxel/src/wave_body.ts` are shared helper modules outside the literal Phase 1 Touches, added to honor module caps without allowlists.
- Two-pass telemetry mirror-target exchange remains diagnostic-only bookkeeping (stride 11, 42 pairings, sample size 42, BOUNDS and assertions unchanged).
- Temporary probe tests were retained as permanent authored-envelope and 42-pairing coverage regressions because shell deletion was denied.
- Pre-existing, out-of-scope: favicon 404 on a fresh direct gallery load; `#app` internal fixed-width specimen clipping at 393px under `overflow-x: hidden` with no document horizontal scroll.
- Physical device-lab verification remains human-only and outside this track.
