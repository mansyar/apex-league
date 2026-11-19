# Review: Roster Wave 2

- **Track:** `20261118-roster-wave-2`
- **Type:** `feature`
- **Branch:** `feat/20261118-roster-wave-2`
- **Range:** `7dd56544a10a203621e522bedaa15ee047b300b3..1ecf3535`
- **Date:** `2026-11-19`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

All FR/NFR/AC requirements for Roster Wave 2 are implemented and evidenced. The 21-species hard balance gate, original nine-kit sustained-score source, byte-identical 63-pair determinism gate, full fuzz sweep, order-independent recipes, globally unique signatures, three new voxel archetypes and artifacts, derived client recipe rows, and three-orientation visual evidence are all green. There are no Critical, High, or Medium findings. One Low finding was found: a stale telemetry doc comment names the wrong mirror indices. `review.strict: true` requires fixing it in a Review Fixes phase before completion.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| typecheck | `bun run check` | pass | 214 voxel / 244 sim / 44 server / 536 client files, no type errors |
| lint | `bunx biome check` | pass | 1005 files, no fixes |
| unit | `bun test --check --parallel --timeout 120000` | pass | 4367 pass / 1 skip / 0 fail, 665357 `expect()` calls, 426 files |
| build | `bun run build` | pass | Vite 428 modules, exit 0 (chunk-size warning only) |
| determinism | `bun run gate:determinism` | pass | 63 seed-42 artifact pairs + 5 prop digests byte-identical; hash `0xff6f3d62` |
| balance | `bun run balance` | pass | 21/21, cap `517/1680 (30.8%)`, decisive `1574/1680 (93.7%)`, cap-win quality `415/517 (80.3%)`, median `32.82s`, damage band `49/49`, 6/6 bosses |
| fuzz | `bun run test:fuzz` | pass | 139 pass / 0 fail, 129015 `expect()` calls, 135 files |
| exact phase leg | `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` | pass | exit 0 at final code heads |
| visual | `playwright-cli` desktop/portrait/landscape | pass | 12 screenshots, console 0 errors / 0 warnings, no horizontal scroll at 393/852 |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1.1 | `species.test.ts`, `roster-wave-4.sweep.test.ts`, `species-discovery-balance.test.ts` | covered |
| FR-2 | P1.T1.2 | `breeding/discovery.test.ts` | covered |
| FR-3 | P1.T1.3 | `branches.test.ts`, `bosses.test.ts` | covered |
| FR-4 | P1.T2.1, P1.T2.2 | `wave_archetypes.test.ts`, voxel fuzz shards, `module-size.test.ts`, `choreo.test.ts` | covered |
| FR-5 | P1.T3.1 | `bun run gate:determinism` (63 pairs + 5 props), artifact manifests | covered |
| FR-6 | P1.T3.2 | `bun run balance` (21/21), `tune-probe.test.ts`, `species-discovery-balance.test.ts` | covered |
| FR-7 | P2.T1.1, P2.T1.2 | `handbook.test.ts`, `handbook/discovery.ts`, `?archetype=sprite\|golem\|wing` | covered |
| FR-8 | P2.T2.1 | `verification/phase-2.md` (12 PNGs), clean console | covered |
| FR-9 | P1.T3, P2.T3 | `verification/integrated.md`, exact full chain exit 0 | covered |
| NFR-1 | P1.T3.1, P1.T3.2 | determinism gate, final hash `0xff6f3d62`, no `SIM_VERSION` diff | covered |
| NFR-2 | P1.T2, P2.T3 | voxel/client `module-size.test.ts`, `bun run check` | covered |
| NFR-3 | P1.T3.2, P2.T3.1 | scope proof, pacing `test.failing` pin intact | covered |
| NFR-4 | P1.T3.2 | `species-discovery-balance.test.ts`, `balance-report.test.ts` | covered |
| NFR-5 | P2.T2.1 | `scrollWidth == clientWidth` at 393 and 852, clean console | covered |
| NFR-6 | P2.T2.2, P2.T3.1 | phase-1/phase-2/integrated evidence | covered |
| AC-1 | P1.T1.1 | `species.test.ts` | covered |
| AC-2 | P1.T1.2 | `breeding/discovery.test.ts` | covered |
| AC-3 | P1.T1.3 | `branches.test.ts`, `bosses.test.ts` | covered |
| AC-4 | P1.T2.2 | `wave_archetypes.test.ts`, full fuzz sweep | covered |
| AC-5 | P1.T3.1 | determinism gate | covered |
| AC-6 | P1.T3.2 | `bun run balance` 21/21 with unchanged gate | covered |
| AC-7 | P2.T1 | `handbook.test.ts`, derived recipe table, gallery URLs | covered |
| AC-8 | P2.T2 | 12 PNGs, console 0/0, layout check | covered |
| AC-9 | P2.T3.1 | exact full chain exit 0 | covered |
| AC-10 | P2.T3.1 | scope proof; no save/schema/dependency/gate/fence/pacing-pin change | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — stale telemetry mirror-index comment**
  - **File:** `packages/sim/scripts/battle-telemetry.ts:268-269`
  - **What:** The "No mirrors" doc comment says the two natural mirrors sit at home indices 2 and 4. With the current away formula `roster[(i * 11 + lap) % 21]`, the mirrors are at home indices 0 (lap 0) and 2 (lap 1). The 2 and 4 values came from the old `+1` formula.
  - **Why:** The comment contradicts the walking rule it documents and can mislead future edits to the mirror-exchange logic. Runtime behavior is unaffected; mirrors are discovered dynamically and `telemetry-probe.test.ts` proves 42 distinct, mirror-free pairings with each species appearing at least twice on each side.
  - **Fix:** Change line 269 to say the mirrors sit at home indices 0 and 2, or state the general rule `10h ≡ -lap (mod 21)`.
  - **Requirement:** none (documentation accuracy).
  - **Test gap:** none.

## Overrides

- <none>

## Plan compliance

Both phases are marked `verified` with checkpoints `64b28e1c` and `4dca8020`, and written evidence (`phase-1.md`, `phase-2.md`, `integrated.md`). All P1/P2 tasks and sub-tasks are checked off. The final diff stays within the approved Touches plus documented owner-approved deviations: wind Thornvolt with `plant + electric` recipe and signatures `gust`/`talon_slash`; owner-approved minimal existing bound adjustments (voltfox HP `[144,174]`/ATK `[9,12]`, embercub HP `[152,181]`/ATK `[9,13]`, emberwing ATK `[15,18]`); original nine-kit sustained band restored; telemetry two-pass mirror exchange; `choreo_wave.ts` and `wave_body.ts` helper splits; retained probe regression tests; gallery mixed-mode registry rotation. No balance gate, threshold, fence, pacing pin, `SIM_VERSION`, save schema, or dependency manifest changed.

## Out of scope

- Generated binary GLB byte-level review (verified via manifests, recorded hashes, exporter source, determinism fuzz shards, and green gate).
- Gitignored evidence PNGs under `.conductor/evidence/20261118-roster-wave-2/`.
- Conductor prose and state files.
- Pre-existing favicon 404 and 393px internal gallery clipping.
- Physical device-lab verification (human-only).

## Debt

- <none — `review.strict: true` forbids deferring F1; it will be fixed in Phase R1.>

## Doc sync

`pending` — product.md and tech-stack.md were synced pre-review with owner approval; this review will be updated after the R1 fix and final verdict.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 |
