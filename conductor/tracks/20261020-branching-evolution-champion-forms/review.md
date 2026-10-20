# Review: Branching Evolution & Champion Forms

- **Track:** `20261020-branching-evolution-champion-forms`
- **Type:** `feature`
- **Branch:** `feat/20261020-branching-evolution-champion-forms`
- **Range:** `ec8d7168e1113807889843566df0d61f6bad4722..HEAD`
- **Date:** `2026-10-20T23:59:00+11:00`
- **Verdict:** `BLOCK`

## Summary

The track delivers the earned-branch contract end to end: six branches with equal
effective budgets, a pure `branchLean` that is the single source for both the
day-5 preview and the evolution outcome, save v19 with a deterministic v18
migration and hardened validation, derived rival forms, branch-aware stat
breakdowns, and the tint/handbook presentation. One High finding blocks: the
visual seed that keeps a creature's voxel identity stable across evolution still
subtracts the old straight-line boosts, so a branched partner would re-roll its
appearance on the morning it evolves and would not match between ranch and arena.

The reviewer subagent could not be launched (the agent model reported no
available seat), so this round was reviewed by the orchestrator: per-phase diffs,
the full integrated diff, the checks below, and targeted contract probes.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun run verify` | pass (2046 pass, 1 skip) | `verification/phase-1..5.md` |
| lint | `biome check` (via verify) | pass (7 pre-existing warnings) | same |
| typecheck | `bun run check` (via verify) | pass | same |
| build | `bun run build` | pass (one pre-existing chunk-size warning) | phase 5 evidence |
| determinism | `bun run gate:determinism` | pass, byte-identical (9 creatures, 5 props) | phase 5 evidence |
| contract probe | branch budgets | pass: every branch 11 juvenile / 33 cumulative effective, equal to `legacy` | orchestrator probe |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 branch catalog | P1.T1 | `packages/sim/src/branches.test.ts` | covered |
| FR-2 derivation | P1.T2 | `branches.test.ts`, 630-distribution probe | covered |
| FR-3 evolve applies branch | P1.T3 | `evolution.test.ts` | covered |
| FR-4 signature moves / loadout | P1.T4 | `battle/moves.test.ts`, `loadout.test.ts` | covered |
| FR-5 save v19 | P2.T1/T2 | `save/branchesSave.test.ts` | covered |
| FR-6 migration | P2.T2 | `save/*Save.test.ts`, corrupt-recovery fixtures | covered |
| FR-7 records / legacy | P2.T3 | `graduation.test.ts` | covered |
| FR-8 rivals and bosses | P3.T1/T2 | `branch-balance.test.ts` | covered |
| FR-9 balance | P3.T3 | `branch-balance.test.ts` (45-55% / 40-70%) | covered |
| FR-10 presentation | P4.T1-T3, P5.T1 | `creature.test.ts`, visual captures | partial (F1) |
| FR-11 handbook and copy | P5.T2 | `handbook.test.ts` | covered |
| FR-12 accessibility | P4, P5 | text carriers asserted, no pointer gate | covered |
| NFR-1 determinism | P1-P5 | determinism gate | covered |
| NFR-2 module cap | P4/P5 | `module-size.test.ts` | covered |
| NFR-3 no save regressions | P2 | save suites incl. v15-v18 fixtures | covered |
| NFR-4 test coverage | P1-P5 | per-phase evidence | covered |
| NFR-5 copy rules | P4/P5 | `copy*.test.ts`, `handbook.test.ts` | covered |
| NFR-6 performance | P5.T1 | mesh/material count assertions | covered |
| NFR-7 no new dependency | all | diff | covered |
| AC-1..AC-6 | P1/P2 | sim suites | covered |
| AC-7..AC-9 | P4/P5 | client suites + captures | partial (F1) |
| AC-10 rival determinism | P3 | `branch-balance.test.ts` | covered |
| AC-11 balance bounds | P3.T3 | `branch-balance.test.ts` | covered |
| AC-12 determinism + cap | P5 | gate + module-size | covered |

## Findings

### Critical

- none

### High

- **F1 - The visual seed still subtracts the legacy boosts, so a branched form
  changes appearance when it evolves**
  - **File:** `apps/client/src/staging-seed.ts:22-27` (defect), call sites
    `apps/client/src/app/scene-sync.ts:44`, `app/hud-screen.ts:75`,
    `app/screens.ts:140`, `cup/arena.ts:46`, `spar/casting.ts:20`
  - **What:** `visualSeedOf(stats, stage)` recovers the creation seed by
    subtracting `EVOLUTION_STAT_BOOST` / `CHAMPION_STAT_BOOST`. Those are now
    only the `legacy` tables. A `cinder_courser` juvenile has +4 ATK where the
    function subtracts +2, so the recovered base stats (and therefore the voxel
    DNA seed) differ from the baby's.
  - **Why:** The module's documented contract is that the individual keeps the
    one look it rolled at creation. With a real branch the ranch rig, the arena
    cast and the HUD portrait would re-roll on evolution morning, and the same
    creature would look different between the ranch and the cup arena. That
    undercuts FR-10 and AC-9/AC-10 ("the grown form is visible without reading a
    stat block") because the form's identity is no longer carried by the same
    individual.
  - **Fix:** Export one boost helper from the sim (`evolutionBoost(stage,
    branch)`) and use it in both `stats.ts` (`stageBoostFor`) and
    `visualSeedOf`, which gains a `branch` parameter. Pass `creature.branch` at
    every owned-creature call site. Rival casts keep the stats-only seed because
    their branch is display-only and their stats carry no boost.
  - **Requirement:** FR-10, AC-9, AC-10, NFR-1
  - **Test gap:** `staging-seed.test.ts` only exercises the legacy constants;
    add branched juvenile/champion cases and a legacy-unchanged case.

### Medium

- none

### Low

- **F2 - `staging-seed.ts` header comment names the old fixed boost values**
  - **File:** `apps/client/src/staging-seed.ts:5-9`
  - **What:** "evolution boosts the rolled base stats (+3/+2/+2/+1)" and "if a
    later stage adds another boost, extend the offset here" describe the
    pre-branch design.
  - **Why:** The next reader would re-introduce the F1 defect.
  - **Fix:** Rewrite the comment around the branch boost helper.
  - **Requirement:** none
  - **Test gap:** none

## Overrides

- none

## Plan compliance

All five planned phases have a result, checkpoint, and evidence file; every task
is checked and maps to commits in the range. Deviations were reported per phase
(mechanical fixtures in `stats.test.ts` / client graduation fixtures, extra
`ranch`/`scene` files in Phase 5, and the Phase 5 metadata CRLF repair done by the
orchestrator). The Phase 4 `stats.ts` fix and the Phase 5 chip/badge layout fix
were caught in review and are reflected in the plan notes. `Touches` union covers
the diff.

## Out of scope

- Rival `BattleSide.branch` is display-only, so a cup rival's pinned stats do not
  include its derived branch's boosts. Balanced and deterministic, but it means
  the tint and the stat block can tell slightly different stories; a future
  roster/rival track should decide whether rivals should train.
- Real branching geometry (per-branch GLBs). Deliberately tint-only here;
  the determinism gate would need ten more artifacts.

## Debt

- Rival stage handling in `spar/casting.ts:33` passes `setup.rival.stage` to a
  stats-only seed. Pre-existing, unchanged by this track, and harmless because
  rival stats are pinned profiles. Recorded instead of filed: no open issue.

## Doc sync

`none` - doc sync ran before review: README, `conductor/product.md`, and
`conductor/tech-stack.md` describe the earned branches; `docs/save-schema.md`
documents v19.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 0 | 1 | 0 |
