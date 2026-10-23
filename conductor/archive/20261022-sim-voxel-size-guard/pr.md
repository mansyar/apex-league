# Sim & Voxel Size Guard + Save-Migration Decomposition

## Summary

The 12 KB module cap that already disciplines `apps/client` now disciplines
`packages/sim` too, and `packages/voxel` gets its own 24 KB cap — each
enforced by a self-proving guard test with a negative control that writes an
oversized module into a temp folder and proves the guard rejects it. The
save-migration monolith at the heart of the sim
(`packages/sim/src/save/migrate.ts`, 40,587 B, 24 version steps in one record
literal) is decomposed into one module per version step behind a barrel, and
the five other oversized sim modules are split along the seams they already
had. Zero behaviour change: save v24 and the exact migration semantics are
unchanged, the two public barrels of `@apex/sim` are **byte-identical** to
their base revisions, and every existing test passes unmodified (2,340 pass /
1 skip / 0 fail across 176 files).

## Track

- **ID:** `20261022-sim-voxel-size-guard`
- **Type:** `refactor`
- **Spec:** [`conductor/archive/20261022-sim-voxel-size-guard/spec.md`](conductor/archive/20261022-sim-voxel-size-guard/spec.md)
- **Plan:** [`conductor/archive/20261022-sim-voxel-size-guard/plan.md`](conductor/archive/20261022-sim-voxel-size-guard/plan.md)
- **Review:** [`conductor/archive/20261022-sim-voxel-size-guard/review.md`](conductor/archive/20261022-sim-voxel-size-guard/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Save-Migration Decomposition | `save/migrate.ts` ≤ 12,288 B; each of the 24 version steps in its own module under `save/migrations/`; a new suite locks the chain | verified | `e2a7350` | migrate.ts 40,587 → 1,370 B; largest step module 2,454 B; one deviation — the shared primitives live in `save/migrations/common.ts` so no step imports the driver back (NFR-7) |
| 2: Sim Module Splits | the five other oversized sim modules each ≤ 12,288 B, split along existing seams, public surface unchanged | verified | `ac4fbda` | a second seam inside `save/validators/` and a third inside `battle/clock/` were needed — both inside Touches globs; a 600-scenario clock differential proved the `HitContext` threading behaviour-identical |
| 3: The Package Guards | a 12 KB guard in `packages/sim` and a 24 KB guard in `packages/voxel`, each self-proving | verified | `1305de1` | both guards prove the cap boundary exactly (12,288/12,289 and 24,576/24,577 B) and both carry a temp-dir negative control; voxel sources untouched (FR-7) |
| R1: Review Fixes (round 1) | F1 the validators' name has one owner; F2 the save-schema doc names driver + step folder; F3 the plan's Touches reconciled | verified | `0db693c` | the old `save/validators.ts` forwarder deleted; `save/validators/index.ts` is the barrel; the deletion was run by the primary (`git rm` is outside the phase agent's allowlist) |
| R2: Review Fixes (round 2) | F4 the two validator headers no longer cite the deleted forwarder | verified | `c2e70cd` | comment-only fix; one phase execution was interrupted by an infra failure and completed by a fresh session |

## Requirements

- [x] `FR-1` — a sim guard test fails on any non-test module over 12,288 B, naming path, size and bytes over (`packages/sim/src/module-size.test.ts`)
- [x] `FR-2` — a voxel guard test fails on any non-test module over 24,576 B (`packages/voxel/src/module-size.test.ts`)
- [x] `FR-3` — `save/migrate.ts` ≤ 12,288 B with all 24 steps one-per-module behind a barrel (now 1,370 B)
- [x] `FR-4` — `battle/clock.ts`, `save/storage.ts`, `legacy.ts`, `breeding.ts`, `cup/session.ts` each ≤ 12,288 B
- [x] `FR-5` — a suite locks the migration chain: the exact key list, the full v0 walk, mid-chain starts, the rejection paths (`save/migrations.test.ts`)
- [x] `FR-6` — the public surface of `@apex/sim` unchanged: both barrels byte-identical, export-name differential 0 added / 0 removed across all five split modules
- [x] `FR-7` — no voxel source modified apart from the new guard (`git diff` proof in the evidence)
- [x] `NFR-1..NFR-7` — behaviour-identical, determinism preserved, no dependency, cheap side-effect-free guards, typecheck clean, style clean, no import cycle
- [x] `AC-1..AC-9` — full coverage; the table is in [`verification/integrated.md`](verification/integrated.md)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| types | `bun run check` | pass — no type errors in any of the three workspaces | `verification/integrated.md` |
| unit | `bun test --check --parallel --timeout 120000` | pass — 2,340 pass / 1 skip / 0 fail across 176 files (3 new suites; no existing test edited) | `verification/integrated.md` |
| lint | `biome check` | pass — 548 files, no fixes applied | `verification/integrated.md` |
| determinism | `bun run gate:determinism` | pass — 14 digests byte-identical at seed 42 | `verification/integrated.md` |
| build | `bun run build` | pass | `verification/integrated.md` |
| visual | not applicable | this track changes no client file, no copy, no asset | `verification/integrated.md` |

## Review

- **Verdict:** `PASS WITH FINDINGS`
- **Rounds:** 2
- **Fixed:** 4 findings (F1–F3 in round 1's fix phase; F4, raised by round 2, in its own fix phase)
- **Accepted/deferred:** 0 — `review.strict` is `true`; nothing deferred, nothing filed as an issue (`review.issues.enabled: false`)

## Deviations and risks

- **Two extra seams appeared mid-split.** Phase 2's brief named one target file per module, but the moved material did not always fit the cap as one file: the validators split into `save/validators/{creature,session}.ts` (16,794 B as one file) and the clock engine needed `battle/clock/hits.ts` (the engine alone was 14,532 B). Both were inside the phase's glob `Touches` and are recorded in the evidence and in the plan.
- **The clock's shared state became an explicit `HitContext`.** The clock closure held the tick, the fight's single RNG stream and the HP snapshot; extracting the hit rules required threading them through an argument. A 600-scenario differential against the base clock (60 seeds × 5 plan modes × 2 tick lengths) proved event traces and final fighter state byte-identical.
- **One command had to be run by the primary.** The phase agent's shell allowlist has no `git rm`; the agent reported the denial rather than working around it, and the primary ran the deletion (`bb10b6f`, since squashed).
- **Risk:** none — the refactor is behaviour-identical and the save format is unchanged (`SAVE_VERSION` stays 24). The determinism gate, the whole test suite and the export-surface diff all say the same thing.

## Follow-ups

- none

## Rollback

```bash
git revert --no-edit <squash-commit>
```

No migration, feature flag or data rollback is involved: the save format is
untouched and no committed asset changes, so reverting is a plain code
revert. The new guards and suites go with it.
