# Phase R1 verification: review fixes

- Base commit: `99028ed` (`conductor(review): Add review fixes phase ...`)
- Branch: `feat/20261020-branching-evolution-champion-forms`
- Date: 2026-10-21

## Commands

| Command | Result |
| --- | --- |
| `bun test --timeout 120000 apps/client/src/staging-seed.test.ts packages/sim/src/evolution.test.ts packages/sim/src/stats.test.ts` | pass — 73 tests, 273 expects, 0 fail |
| `bun run verify` | pass — typecheck clean (voxel 62, sim 91, client 301 files), full suite green, biome 0 errors / 7 pre-existing `noNonNullAssertion` warnings, determinism gate byte-identical (9 creature GLBs + 5 props) |
| `bun run build` | pass — 245 modules |

## F1: the visual seed used the legacy tables

`staging-seed.ts` subtracted `EVOLUTION_STAT_BOOST` / `CHAMPION_STAT_BOOST`, which
are now aliases of the legacy branch's tables. A branched form's boost is
different, so the offset no longer cancelled and the creature's DNA seed changed
on the evolution morning — and differed between the ranch and the arena, because
the two paths computed the offset from different values.

Fix: the sim now owns the mapping. `evolutionBoost(stage, branch)` in
`packages/sim/src/evolution.ts` returns zeros for a baby, the branch's juvenile
boost (or `legacy` for null/unknown ids), and the juvenile + champion sum for a
champion. `stats.ts` (`stageBoostFor`) and `staging-seed.ts` (`visualSeedOf`) both
read it, so the stat chips and the visual seed can never disagree again.

Owned-creature call sites now pass the branch: `app/scene-sync.ts`,
`app/hud-screen.ts`, `app/screens.ts`, `cup/arena.ts` (owned side),
`spar/casting.ts` (owned side). The rival legs in `cup/arena.ts` and
`spar/casting.ts` stay stats-only — rival slots carry no stage and their seed is
already pinned to the stats the bracket drew.

| Case | Seed |
| --- | --- |
| baby at creation | creation seed |
| `cinder_courser` juvenile | creation seed |
| `cinder_courser` champion | creation seed |
| `pyre_warden` juvenile + champion | creation seed |
| `legacy` juvenile | creation seed (old tables) |
| branched juvenile read with the other branch's boost | different seed (guarded) |

Tests: `describe("visualSeedOf earned branches")` in
`apps/client/src/staging-seed.test.ts` covers each row above, plus the
"subtracting another branch's boost re-rolls the individual" guard;
`describe("evolutionBoost - the shared stage offset")` in
`packages/sim/src/evolution.test.ts` covers the helper directly (baby zeros,
null/unknown read legacy, a real branch matches `evolveCreature`'s deltas).

## F2: stale header

The `staging-seed.ts` header described the old "+3/+2/+2/+1" fixed boost and told
the next author to "extend the offset here". Rewritten to say the earned branch's
pinned boost is subtracted, that `evolutionBoost` owns the tables, and that the
individual keeps its creation seed whichever form it grows into.

## Acceptance criteria touched

| AC | Status | Evidence |
| --- | --- | --- |
| AC-8 (form is the same individual) | pass | seed tests above; evolution morning no longer re-rolls DNA |
| AC-12 (determinism, no cross-instance tint) | pass | determinism gate byte-identical; no GLB or voxel change in this phase |

## Notes

- The champion case previously asserted in `staging-seed.test.ts` treated
  `CHAMPION_STAT_BOOST` as the whole champion offset; the real offset is the
  juvenile step plus the champion step, so the test now sums both pinned tables.
- `stats.ts` lost its private `branchOf` helper; `getBranch`/`LEGACY_BRANCH` are
  no longer imported there.
- No save, schema, migration or doc change: the persisted shape is unchanged.
