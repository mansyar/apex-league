# Phase 1 Evidence — Ghost bundle + deterministic replay

- **Track:** 20261027-ghost-data-async-rivals (Ghost Data & Async Rivals)
- **Phase:** 1 (Ghost bundle + deterministic replay)
- **Date:** 2026-10-27
- **Branch:** `feat/20261027-ghost-data-async-rivals` (base `main` @ `b88f211f`)
- **Result:** verified

## What changed

- `packages/sim/src/cup/ghost.ts` (new, ~3 KB): `SIM_VERSION` pin (1),
  `GhostBundle` shape (simVersion, seed, day, round, player + rival sides,
  winner, events), `buildGhostBundle` (captures from a champion session's
  deciding final; null otherwise), `replayGhost` (re-resolves from the
  bundle alone), `verifyGhostBundle` (version match + byte-identical log).
- `packages/sim/src/cup/verdicts.ts`: `RoundVerdict` gains optional
  `sides` (present exactly when `battle` is present); `resolvePairing`
  populates it. No existing shape broken (optional field).
- `packages/sim/src/cup/session/walk.ts`: `resolvePlayerMatch` names both
  sides and stores them on the player verdict.
- `packages/sim/src/cup/ghost.test.ts` (new): 6 tests, fixed seeds only
  (champion path seed 17, exit path seed 101 — both pinned goldens).
- Deliberately untouched: `packages/sim/src/index.ts` (barrel export left
  for the Phase 2 server consumer), `finalizeCup`/`GameState` (no
  save-schema bump per NFR-2), all goldens byte-identical.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `bun test packages/sim/src/cup/ghost.test.ts --timeout 120000` | 0 | 6 pass / 0 fail |
| unit | `bun test packages/sim --parallel=4 --timeout 120000` | 0 | 1387 pass / 1 skip / 0 fail, 70 files (incl. module-size guard) |
| static | `bun run check` | 0 | no type errors (sim 167, client 432, server 36, voxel 145 files) |
| static | `bunx biome check` (4 touched files) | 0 | clean after `--write` + one manual optional-chain narrowing |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Cup win creates a bundle that playback verifies byte-identical | `ghost.test.ts`: shape test + `JSON.stringify` replay equality + rebuild-twice equality + JSON round-trip verify | pass |
| FR-1 | Bundle = seed, both kits, event log, sim version | `GhostBundle` interface + capture test asserting `cupMatchSeed(day,3,0)`, both kits, non-empty log, version pin | pass |
| NFR-1 | Same bundle + resolver yields identical event log | `replayGhost`/`verifyGhostBundle` tests; tampered-log and foreign-version cases fail quiet (false) | pass |

## Deviations

None — all edits inside `packages/sim/src/cup/*`. No `index.ts`, client,
server, plan, or spec changes. New-file sizes (~3 KB bundle, ~5 KB test)
and line-level deltas keep every module under the 12 KB cap (enforced by
the passing `module-size.test.ts` in the suite run).

## Notes

- `sides` is optional on `RoundVerdict` so forfeit verdicts, boss
  walkovers, and existing test-constructed sessions stay valid untouched.
- No PII in the bundle (names are creature names only); trainer display
  name attaches server-side in Phase 2.
- `SIM_VERSION` must be bumped whenever battle/cup resolution changes
  meaning; the verifier treats mismatch as quiet skip (false).
