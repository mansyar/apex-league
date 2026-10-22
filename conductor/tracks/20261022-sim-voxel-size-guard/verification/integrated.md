# Integrated verification — 20261022-sim-voxel-size-guard

- Track: `20261022-sim-voxel-size-guard` — Sim & Voxel Size Guard + Save-Migration Decomposition
- Branch: `refactor/20261022-sim-voxel-size-guard`
- Base: `main` @ `06a82fce96271fc6b857a0735b39cdf663a057c3`
- Verified at HEAD: `4245c780e2cc0ea51191c03327f8f5816faa857c`
- Date: 2026-10-22
- Result: **PASS**

The full verification strategy from `conductor/workflow.md` was run on the track
branch after all three phases were verified and squashed. Every layer the
workflow config declares was exercised: `static`, `unit`, `determinism`. The
`visual` layer does not apply to this track — see the note at the end.

## Commands and results

| Layer | Command | Exit | Result |
|---|---|---|---|
| static — typecheck | `bun run check` | 0 | `@apex/voxel` — no type errors in 72 files; `@apex/sim` — no type errors in 144 files; `@apex/client` — no type errors in 349 files. |
| static — lint | `biome check` (via `bun run verify`) | 0 | 547 files checked, no fixes applied. |
| static — build | `bun run build` | 0 | `@apex/client` build succeeded. |
| unit | `bun test --check --parallel --timeout 120000` (via `bun run verify`) | 0 | **2340 pass, 0 fail** across 176 files. (1 skipped test, pre-existing.) |
| determinism | `bun run gate:determinism` (via `bun run verify`) | 0 | All 14 digests byte-identical: 12 creature GLBs (draconic x3, bovine x3, axolotl x3, storm_hound x3 — baby/juvenile/champion at seed 42) and 5 props (tuft, bush, broadleafTree, rock, foodPile). |
| integrated | `bun run verify` | 0 | The full gate: typecheck + whole-repo test suite + lint + determinism. |
| integrated | `bun run build` | 0 | The build leg of `verify_phase` (`bun run verify && bun run build`). |

Direct re-runs by the primary, outside the `bun run verify` wrapper, for
independent confirmation:

| Command | Exit | Result |
|---|---|---|
| `bunx biome check` | 0 | 547 files checked, 0 errors, 0 warnings. |
| `bun test --timeout 120000 module-size` | 0 | 15 pass, 0 fail across the three guards (client + sim + voxel), 282 ms. |
| `bun test --timeout 120000` | 0 | 2340 pass, 1 skip, 0 fail across 176 files, 90,778 expect() calls. |

## Summary

The whole strategy is green on the track branch. The baseline before the track
was 2330 pass / 1 skip / 0 fail across 174 files; the track adds 10 guard tests
(5 in the sim guard, 5 in the voxel guard) and no test file was edited or
removed. The determinism gate's committed artifact hashes are unchanged, which
is the strongest available evidence that no behaviour changed — the track
touched only module boundaries inside `packages/sim`.

## Per-requirement outcome

| Requirement | Verified by | Result |
|---|---|---|
| FR-1 (sim guard at 12,288 B) | `packages/sim/src/module-size.test.ts`; primary probe with a 12,998 B module in the real tree → guard exits 1 and names the offender | Pass |
| FR-2 (voxel guard at 24,576 B) | `packages/voxel/src/module-size.test.ts`; primary probe with a 24,998 B module in the real tree → guard exits 1 and names the offender | Pass |
| FR-3 (migrate split) | `save/migrate.ts` 1,370 B; 24 step modules plus a barrel under `save/migrations/`; base-commit differential: 24/24 step bodies identical | Pass |
| FR-4 (five sim modules under the cap) | Size sweep of `packages/sim/src` — no non-test module over 12,288 B; largest `bosses.ts` 11,654 B | Pass |
| FR-5 (migration chain locked) | `save/migrations.test.ts` — exact key list 0…23, full-chain walk, mid-chain start, rejection paths; negative control removing a step fails 35 assertions | Pass |
| FR-6 (public surface unchanged) | Export-name differential against the base commit: 11/19/28/32/7 names, 0 added, 0 removed; `src/index.ts` and `battle/index.ts` byte-identical | Pass |
| FR-7 (voxel package untouched) | `git diff --name-only <base>..HEAD -- packages/voxel` → only the new guard test | Pass |
| NFR-1 (behaviour-identical) | Base-commit source differential (0 differences) + 600-scenario battle-clock differential (0 mismatches) + 2340 passing tests | Pass |
| NFR-2 (determinism preserved) | `bun run gate:determinism` — 14 digests byte-identical | Pass |
| NFR-3 (no new dependency) | `package.json` and `bun.lock` untouched by the track | Pass |
| NFR-4 (cheap, side-effect free) | Both guards complete in under 300 ms; fixtures live in an OS temp dir and are removed in a `finally`; `git status --porcelain` empty after every run | Pass |
| NFR-5 (typecheck clean, no `any`) | `bun run check` clean in all three workspaces; no `any` and no `@ts-ignore` in the new code | Pass |
| NFR-6 (style clean) | `biome check` clean at 547 files; named exports, no default exports, explicit return types | Pass |
| NFR-7 (no import cycle) | Each step module and each split module imports its siblings by direct path, never its own barrel; the legacy ↔ breeding coupling stays one-way | Pass |

## Visual layer

The visual layer does not apply. This track changes no rendering, no copy, no
layout and no asset; it moves TypeScript declarations between module files
inside `packages/sim` and adds two test files. The save format is untouched
(`SAVE_VERSION` stays 24), the client is not touched at all, and the
determinism gate confirms the voxel artifacts are byte-identical. There is
nothing for a player to see, so no `playwright-cli` capture was taken and none
is required by the spec (AC-9 is satisfied by the integrated `bun run verify`).
