# Sim & Voxel Size Guard + Save-Migration Decomposition — Implementation Plan

> **Branch:** `refactor/20261022-sim-voxel-size-guard`
> **Base:** `main` @ `06a82fc`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

**Constraints that apply to every phase**

- The cap counts **bytes, not lines**. Only `*.test.ts` files are exempt.
- **No behaviour change.** No gameplay, balance, content, copy, art, or schema
  change. `SAVE_VERSION` stays 24 and the persisted shape is unchanged, so the
  save-schema quality gate does not apply.
- **No new dependency**, no new source of truth, no `any` escape, no
  `@ts-ignore`.
- **No existing test file is edited.** The only new test files are the ones this
  plan names.
- **The visual layer does not apply** — this track changes no client file, no
  asset, and no user-facing surface. The determinism layer does apply and runs
  inside `bun run verify`.
- A module that holds one concern may be split; a module that *is* one concern
  is not split for the sake of the cap.
- `verify_phase` (`bun run verify && bun run build`) runs at every phase
  acceptance, in addition to the phase's own `Verification` command.
- Task commits are made by the phase subagent with conventional messages; the
  primary squashes them into one phase commit.
- **Global NFR coverage:** every phase verifies **NFR-1** (behaviour-identical),
  **NFR-2** (determinism preserved), **NFR-3** (no new dependency), **NFR-5**
  (typecheck clean) and **NFR-6** (style clean) through its own Verification
  command, because `bun run verify` runs the full typecheck, test, lint and
  determinism layers. **AC-8** and **AC-9** are covered by Phase 3's
  `bun run verify && bun run build`.

## Phase 1: Save-Migration Decomposition

- **Goal:** `packages/sim/src/save/migrate.ts` is at most 12,288 B, each of the
  24 version steps lives in its own module under
  `packages/sim/src/save/migrations/`, and a new suite locks the migration
  chain.
- **Depends on:** none
- **Covers:** FR-3, FR-5, NFR-1, NFR-7, AC-3, AC-5
- **Touches:** `packages/sim/src/save/migrate.ts`,
  `packages/sim/src/save/migrations/**`,
  `packages/sim/src/save/migrations.test.ts`, `docs/save-schema.md`
- **Verification:** `bun test packages/sim/src/save --timeout 120000 && bun run check && biome check`
- **Status:** in_progress

- [ ] **P1.T1: Extract the migration steps** — covers: FR-3
  - [ ] **P1.T1.1: Move each version step into its own module** — create
    `packages/sim/src/save/migrations/v0.ts` … `v23.ts`, one per step, moving
    each function **verbatim** out of the `migrations` record. No logic, naming,
    ordering, or error-message change. A step that needs `initialLineage`,
    `createCreature`, `isCupDay` or any other sim value imports it from its
    direct module path (`../../legacy/...`, `../../creature`, `../../calendar`),
    never through a barrel it belongs to.
  - [ ] **P1.T1.2: Compose the record in a barrel** — create
    `packages/sim/src/save/migrations/index.ts` exporting the 24 steps as a
    `Record<number, (raw: Record<string, unknown>) => Record<string, unknown>>`
    keyed `0`…`23` in ascending order. The record is the only place that knows
    the chain's order.
  - [ ] **P1.T1.3: Slim `migrate.ts` down to the driver** — rewrite
    `packages/sim/src/save/migrate.ts` to import the record from `./migrations`
    and keep `STARTER_GRANT_SEED`, `validateStateShape`, the private
    `persistedCreature` helper, and the `migrate()` driver. `migrate` and
    `validateStateShape` stay exported from `save/migrate.ts` —
    `save/storage.ts`, `save/transfer.ts`, `save.test.ts` and
    `packages/sim/src/index.ts` import them from there.
  - [ ] **P1.T1.4: Respect the no-cycle rule** — no module under
    `save/migrations/` imports `save/migrations/index.ts`. Siblings import each
    other by direct path only. (NFR-7)
  - [ ] **P1.T1.5: Prove the size** — confirm `save/migrate.ts` and every file
    under `save/migrations/` is at most 12,288 B, and record each file's byte
    size in the phase evidence.
- [ ] **P1.T2: Lock the migration chain** — covers: FR-5
  - [ ] **P1.T2.1: Assert the exact key list** — `save/migrations.test.ts`
    asserts the record's keys are exactly `0`…`23`: none missing, none extra.
    An exact list, not a count, so a dropped or duplicated key fails.
  - [ ] **P1.T2.2: Assert the full chain** — a v0 payload
    (`{ version: 0, day: 1 }`) migrates through every step to `SAVE_VERSION`,
    and the result validates through `validateStateShape`.
  - [ ] **P1.T2.3: Assert the chain starts where it should** — a mid-chain
    payload (v18) does not pass through the v0 step; only the steps above its
    own version run.
  - [ ] **P1.T2.4: Assert the rejection paths** — migrating an already-current
    save is a no-op; a save with no `version` is rejected with
    `invalid save: missing version`; a save above `SAVE_VERSION` is rejected
    with `invalid save: future version N`.
  - [ ] **P1.T2.5: Leave every existing test file untouched.** (AC-6)
- [ ] **P1.T3: Repoint the save-schema doc** — covers: FR-3
  - [ ] **P1.T3.1: Update the stale file references** — `docs/save-schema.md`
    points at `migrate.ts` in two places (the chain walk and the "add a
    migration" checklist). Repoint them at
    `packages/sim/src/save/migrations/`. The persisted shape, the per-version
    table, and every migration's described behaviour stay exactly as they are —
    only the file reference changes.

## Phase 2: Sim Module Splits

- **Goal:** the five named sim modules are each at most 12,288 B, split along
  the seams they already have, with every existing import path and the
  package's public surface unchanged.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-6, NFR-1, NFR-6, NFR-7, AC-4, AC-6
- **Touches:** `packages/sim/src/save/storage.ts`,
  `packages/sim/src/save/validators.ts`, `packages/sim/src/battle/clock.ts`,
  `packages/sim/src/battle/clock/**`, `packages/sim/src/legacy.ts`,
  `packages/sim/src/legacy/**`, `packages/sim/src/breeding.ts`,
  `packages/sim/src/breeding/**`, `packages/sim/src/cup/session.ts`,
  `packages/sim/src/cup/session/**`
- **Verification:** `bun test --timeout 120000 && bun run check && biome check`
- **Status:** pending

- [ ] **P2.T1: Split the save validators out of `save/storage.ts`** — covers:
  FR-4
  - [ ] **P2.T1.1: Move the validators** — the eight `isValid*` helpers
    (`isValidTraitList`, `isValidParentList`, `isValidCreatureBranch`,
    `isValidCreature`, `isValidRetiredRecord`, `isValidSession`,
    `isValidSaveState`, `isValidPendingGift`) move to
    `packages/sim/src/save/validators.ts`. `save/storage.ts` keeps the adapter
    I/O (`createMemoryAdapter`, `saveGame`, `loadSave`, `loadGame`,
    `clearSave`, `readRawSave`, `loadBoot`) and re-exports `isValidSaveState`,
    so `packages/sim/src/index.ts` and `graduation.test.ts` are untouched.
  - [ ] **P2.T1.2: Prove the size** — both files at most 12,288 B; record the
    sizes in the evidence.
- [ ] **P2.T2: Split the battle clock** — covers: FR-4
  - [ ] **P2.T2.1: Keep `battle/clock.ts` as the barrel** — move the
    implementation into `packages/sim/src/battle/clock/` (`types.ts` for
    `BattleFighter`, `ClockFighter`, `PlannedAction`, `PlanFn`, `BattleEvent`,
    `BattleEventKind`, `TickOutcome`, `Clock`, `Range` and the `STAGGER_*`
    constants; `engine.ts` for `createClock`, `createClockFighter`,
    `createTieOrder` and its private helpers). This is the `cup.ts` + `cup/`
    pattern from `cup_module_refactor_20261018`.
  - [ ] **P2.T2.2: Keep every name the consumers import from `"./clock"`** —
    `battle/index.ts` and the eight test files (`clock`, `clock.contract`,
    `policy`, `playback`, `resolver`, `projectile`, `heavy-hit`) import types,
    `BASIC`, `CLOSE`, `HOLD` and `STAGGER_DAMAGE_FRACTION` from `"./clock"`;
    the barrel re-exports all of them.
  - [ ] **P2.T2.3: Prove the size** — every new file at most 12,288 B; record
    the sizes in the evidence.
- [ ] **P2.T3: Split lineage and graduation out of `legacy.ts`** — covers: FR-4
  - [ ] **P2.T3.1: Keep `legacy.ts` as the barrel** — move the implementation
    into `packages/sim/src/legacy/` (`lineage.ts` for the lineage state,
    prestige constants, `lineagePrestige`, `lineagePerks`, `initialLineage`,
    `hatchDayOf`; `graduation.ts` for `canGraduate`, `graduate`,
    `graduateFromStable`, the graduation constants; `inheritance.ts` for
    `inheritedFloor` and `createInheritedCreature`).
  - [ ] **P2.T3.2: Keep every name the 8 consumers import from `"./legacy"` /
    `"../legacy"`** — including `RetiredRecord`, `retireeRecord`,
    `GRADUATION_DAY`, `GRADUATION_HINT_DAY`, `initialLineage`, `lineagePerks`,
    `lineagePrestige`, `hatchDayOf`, `inheritedFloor`, `canGraduate`,
    `graduate`, `graduateFromStable`, `createInheritedCreature`, and the
    `PRESTIGE_*` constants. `state.ts`, `stats.ts`, `ticker.ts`, `breeding.ts`,
    `storage.ts` and `migrate.ts` must not need a change.
  - [ ] **P2.T3.3: Prove the size** — every new file at most 12,288 B; record
    the sizes in the evidence.
- [ ] **P2.T4: Split breeding from gift handling** — covers: FR-4
  - [ ] **P2.T4.1: Keep `breeding.ts` as the barrel** — move the implementation
    into `packages/sim/src/breeding/` (`pairing.ts` for `validatePair`,
    `pairFor`, `speciesOptions`, `inheritedFloorFromPair`, `createBredCreature`;
    `drift.ts` for `driftSource`, `rollAffinityDrift` and the affinity
    constants; `gift.ts` for `createGiftEgg`, `hatchGiftEgg`,
    `stormGiftPending`, `stormGiftPreview`).
  - [ ] **P2.T4.2: Keep the `legacy` re-export and every consumer name** —
    `breeding.ts` keeps re-exporting `retireeRecord` from `"./legacy"` exactly
    as today, and every name the 7 consumers import from `"./breeding"` stays
    exported, including `TRAITS`, `TRAIT_ORDER`, `traitBonus`, `deriveTrait`,
    `effectiveTraits`, `isLineageTrait`, `STORM_GIFT_SPECIES_ID` and
    `AFFINITY_DRIFT_CHANCE`.
  - [ ] **P2.T4.3: Prove the size** — every new file at most 12,288 B; record
    the sizes in the evidence.
- [ ] **P2.T5: Split placement out of the cup session** — covers: FR-4
  - [ ] **P2.T5.1: Keep `cup/session.ts` as the barrel** — move the
    implementation into `packages/sim/src/cup/session/` (`walk.ts` for
    `startCupSession`, `resolvePlayerMatch`, `completeCup`, `forfeitCup`;
    `standing.ts` for `cupPlacement` and `bossScalps`). `cup/session.ts` is
    12,661 B — 373 B over — so the standing helpers alone may be enough; move
    more if the cap needs margin.
  - [ ] **P2.T5.2: Keep every name `cup.ts` re-exports from `"./cup/session"`**
    — `cupPlacement`, `bossScalps`, `completeCup`, `forfeitCup`,
    `resolvePlayerMatch`, `startCupSession` and `type CupSession`.
  - [ ] **P2.T5.3: Prove the size** — every new file at most 12,288 B; record
    the sizes in the evidence.
- [ ] **P2.T6: Prove the public surface is unchanged** — covers: FR-6
  - [ ] **P2.T6.1: Assert the barrels are byte-identical** —
    `packages/sim/src/index.ts` and `packages/sim/src/battle/index.ts` must be
    byte-identical to their pre-track content. Any edit to either is a red
    flag: it means an import path moved.
  - [ ] **P2.T6.2: Leave every existing test file untouched** — the eight clock
    tests, the eight legacy tests, the seven breeding tests, the six cup tests,
    `graduation.test.ts` and the eleven `save/*.test.ts` files all pass
    unmodified. (AC-6)

## Phase 3: The Package Guards

- **Goal:** `packages/sim` and `packages/voxel` each enforce their module-size
  cap, and each guard proves it can fail.
- **Depends on:** Phase 2
- **Covers:** FR-1, FR-2, FR-7, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5, NFR-6, AC-1,
  AC-2, AC-7, AC-8, AC-9
- **Touches:** `packages/sim/src/module-size.test.ts`,
  `packages/voxel/src/module-size.test.ts`
- **Verification:** `bun test module-size --timeout 120000 && bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Add the sim guard** — covers: FR-1
  - [ ] **P3.T1.1: Mirror the client guard** — create
    `packages/sim/src/module-size.test.ts` on the shape of
    `apps/client/src/module-size.test.ts`: a recursive walk of
    `packages/sim/src`, a 12,288 B cap, a report naming path, byte size and
    bytes-over, largest first, and a rule that exempts only `*.test.ts` (this
    package has no `vite-env.d.ts` shim, so it needs no name exemption).
  - [ ] **P3.T1.2: Assert the walk is real** — the suite asserts the walk finds
    more than 40 modules, that it descends into `save/`, `battle/` and `cup/`,
    and that no `*.test.ts` file is counted.
  - [ ] **P3.T1.3: Assert the boundary** — a module of exactly 12,288 B is
    accepted; 12,289 B is rejected.
  - [ ] **P3.T1.4: Add the negative control** — write an oversized module into
    a temp directory, prove the guard rejects it, and remove the fixture in a
    `finally` block so a killed run leaves nothing behind. (NFR-4)
  - [ ] **P3.T1.5: Prove it passes today** — the guard passes against the tree
    Phase 2 left clean; record the largest sim module's size in the evidence.
- [ ] **P3.T2: Add the voxel guard** — covers: FR-2
  - [ ] **P3.T2.1: Same shape, 24,576 B cap** — create
    `packages/voxel/src/module-size.test.ts` with the same walk, report,
    boundary and negative control, at the 24 KB cap.
  - [ ] **P3.T2.2: Assert the boundary at 24,576 / 24,577 B** and the same walk
    assertions.
  - [ ] **P3.T2.3: Record the headroom** — the largest voxel module is
    `axolotl.ts` at 20,598 B; record it and its headroom in the evidence.
- [ ] **P3.T3: Prove the voxel package was not touched** — covers: FR-7
  - [ ] **P3.T3.1: Record the diff scope** — `git diff --name-only` shows no
    modified file under `packages/voxel/src` other than the new guard test.
    Record the output in the evidence.
- [ ] **P3.T4: Run the full gate** — covers: FR-1, FR-2
  - [ ] **P3.T4.1: Run the whole verification** — `bun run verify && bun run
    build` green, including the determinism gate with unchanged artifact
    hashes. Record the exit codes.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261022-sim-voxel-size-guard/verification/phase-1.md
-->

---

**Primary follow-up (not a phase task):** the phase subagent's edit permission
denies `conductor/**`, so before the PR the primary adds a dated note to
`conductor/tech-stack.md` recording that the 12 KB cap now covers
`packages/sim` (and the new 24 KB cap covers `packages/voxel`), and that the
save-migration steps now live in `packages/sim/src/save/migrations/`.
