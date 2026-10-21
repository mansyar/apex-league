# Phase 1 — Affinity Roll & Save v20

**Track:** 20261021-affinity-drift-prestige-perks
**Phase:** 1
**Date:** 2026-10-21
**Branch:** feat/20261021-affinity-drift-prestige-perks
**Base:** eac19f4
**Head:** e79d09f
**Result:** verified

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| static | `bun run check` (within `bun run check && bun test --timeout 120000`) | 0 | Type-checks clean across voxel/sim/client |
| unit | `bun test --timeout 120000` (same command) | 0 | 2075 tests across 153 files: 2074 pass, 1 skip, 0 fail |
| biome (rework 1) | `bun run verify` | pass for phase files | Phase-caused findings fixed: breeding.ts formatting drift and save.test.ts import order (`assist/source/organizeImports`) resolved in commit a7ac606 |

Note: the "migrates a synthetic v0 save to current" full-chain test in
save.test.ts now walks v0→v20; its sibling title "a v0 save walks the whole
chain to v18" is stale wording only (the assertion checks the current
version). Title left as-is per the "never edit an existing step" spirit and
to keep the diff minimal.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-1 | Seeded unit tests: drift fires at the threshold with different-element parents, does not below it, same-element parents never drift | breeding.test.ts: "affinity drift — the seeded roll" and "createBredCreature — affinity drift" describes (stub draws at/above threshold, below-threshold null, same-element no draw, stream byte-identical) | pass |
| AC-2 | A v19 payload migrates with `affinity: null`; validation rejects secondary == primary and unknown elements; export/import round-trips affinity | save.test.ts: "a v19 creature and Hall record migrate with affinity null", "loadGame rejects a secondary affinity equal to the primary element", "loadGame rejects an unknown affinity element", plus Hall-record reject/accept tests; transfer.test.ts: "affinity drift — transfer round-trip (v20)" | pass |

## Evidence paths

- packages/sim/src/breeding.ts — AFFINITY_DRIFT_CHANCE, AFFINITY_DRIFT_SALT, driftSource(), rollAffinityDrift()
- packages/sim/src/creature.ts, packages/sim/src/legacy.ts — affinity fields on Creature and RetiredRecord
- packages/sim/src/save/schema.ts — SAVE_VERSION 20
- packages/sim/src/save/migrate.ts — v19→v20 step
- packages/sim/src/save/storage.ts — affinity validation in isValidCreature and isValidRetiredRecord
- docs/save-schema.md — v20 field rows, v19→v20 migration row, "At v20" validation paragraph

## Deviations

- `packages/sim/src/creature.ts` — outside Touches; the plan said `types.ts`
  "if the creature/record types live there", but they live in creature.ts.
  Added the `affinity` field there (smallest necessary change).
- `apps/client/src/graduation.test.ts`,
  `apps/client/src/graduation/nursery-vm.test.ts`,
  `apps/client/src/save-transfer.test.ts` — required by the `affinity` field
  addition and the SAVE_VERSION bump (fixture updates / cast change only).

## Notes

- The v0→current full-chain test in save.test.ts now walks v0→v20; its title
  still says "to v18" (stale title, assertion checks the current version) —
  left as-is to keep the chain-edit minimal.
- The rival-kit salt pattern was mirrored: `AFFINITY_DRIFT_SALT = 0x85ebca6b`,
  a distinct constant from `RIVAL_KIT_SALT = 0x9e3779b9`.
- `docs/save-schema.md` updated in the same phase per project rule
  (P1.T2.3).
- One mid-phase failing check (branchesSave.test.ts expecting no `affinity`
  key pre-migration) was the expected red for T2 and resolved by the
  migration step; no retry-cycle failures occurred.

### Rework 1 (2026-10-21) — biome layer

- `bun run verify` failed at its biome step with two phase-caused findings:
  `packages/sim/src/breeding.ts` format error (an 82-char ternary line in
  `rollAffinityDrift`), and `packages/sim/src/save/save.test.ts:1:1`
  `assist/source/organizeImports` (the `retireeRecord` import from `../legacy`
  was out of alphabetical order). Both fixed in commit a7ac606 (breeding.ts
  ternary wrapped across lines; legacy import moved to its alphabetical slot
  between `../ladder` and `../loadout`). Diff confirmed to be exactly those
  two files / two hunks.
- After the fix, `bun run check && bun test --timeout 120000` re-run green:
  2074 pass, 1 skip, 0 fail.
- The 7 `lint/style/noNonNullAssertion` findings in
  `apps/client/src/cup/view-models.test.ts`,
  `apps/client/src/scene-logic/play.test.ts`, and
  `apps/client/src/scene-logic/treat.test.ts` are pre-existing main debt in
  files outside this phase's Touches; left unfixed, out of scope.

## Primary verification

Run by the primary agent after rework 1, on the squashed checkpoint.

- Range squashed to **checkpoint `7deec17`**
  (`feat(sim): decide affinity drift at breeding and persist save v20`).
- Phase-caused biome findings confirmed fixed (independent `bunx biome check`).
- The 7 pre-existing `noNonNullAssertion` errors were fixed as an approved
  separate maintenance commit `5e0151e`
  (`style(client): replace non-null assertions with explicit guards in test
  fixtures`) — test-only, mechanical, no behavior change.
- Full project gate re-run independently:

| Layer | Command | Exit | Summary |
|---|---|---|---|
| full gate | `bun run verify` | 0 | typecheck + biome + tests (2074 pass, 0 fail) + determinism gate all green |
| build | `bun run build` | 0 | client build clean |

- Files changed in the phase match the reported list (sim breeding/save/legacy
  sources + tests, `docs/save-schema.md`, three client test fixtures).
- All reported deviations reviewed and accepted (types in `creature.ts`;
  client test fixtures forced by the record type change; legacy v19 fixture
  cast is still a v19→v20 migration test at runtime).
- AC-1 and AC-2 evidence tables present and consistent with the test files.
- Verdict: **Phase 1 accepted.**
