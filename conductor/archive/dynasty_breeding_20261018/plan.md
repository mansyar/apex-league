# Plan: Dynasty Breeding & Nursery

**Track ID:** `dynasty_breeding_20261018` · **Spec:** [spec.md](./spec.md) ·
**Workflow:** `conductor/workflow.md`

TDD applies to all sim and pure client logic. Scene/UI wiring is verified
manually with screenshots and console evidence. Every phase ends with a
verification checkpoint and user approval.

## Phase 1 — Sim foundations: traits, pool, inheritance (TDD)

- [x] Task: Trait catalog + derivation (`packages/sim/src/traits.ts`, new;
      `breeding.ts` re-exports) — 6326a26
  - [x] Failing tests: highest **trained** stat maps to sturdy/fierce/guarded/
        quick; tie-break HP > ATK > DEF > SPD; all-zero trained falls back to
        highest effective stat; a pre-v15 record with `traits: []` derives the
        same trait deterministically; unknown ids are not produced.
  - [x] Implement `LineageTrait`, `TRAITS` (label/description/stat bonus),
        `deriveTrait(record)`, `effectiveTraits(record)`, `traitBonus(traits)`.
  - [x] Export from `packages/sim/src/index.ts`.
- [x] Task: Breeding pool, pair validation, species options — 6326a26
  - [x] Failing tests: pool = hall + retiring champion; `canBreed` false at
        generation 1 (pool size 1) and true at 2+; pair needs two distinct
        known generations; pair lookup returns records; `speciesOptions(pair)`
        returns 1 or 2 unique species; the retiree is built with effective
        stats/trained/generation/day/derived trait/its own parents.
  - [x] Implement `breedingPool(state)`, `canBreed(state)`,
        `validatePair(pool, generations)`, `pairFor(pool, generations)`.
- [x] Task: Dual-parent floor, mutation, `createBredCreature` — 6326a26
  - [x] Failing tests: per-stat `round(0.5×max + 0.1×min)` with known pairs;
        trait bonuses applied before clamp; species-bound clamps; established-
        line `+1`; mutation is one stat `+1..+2` and clamped; same seed
        reproduces stats, mutation, traits, parents; parent generations sorted;
        duplicate traits deduped; single-parent founder path unchanged.
  - [x] Implement `inheritedFloorFromPair`,
        `createBredCreature(speciesId, seed, pair, prestige)` using one
        `makeRng(seed)` stream (base roll → mutation).
  - [x] Golden fixture: fixed pair + seed → exact successor snapshot (the
        reproducibility test pins every stat, trait, and parent).
- [~] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] `bun test packages/sim/src/breeding.test.ts`; coverage check on
        `breeding.ts`; `bun run check`; commit `6326a26`.
  - [ ] Record `[checkpoint: <sha>]` after user approval.

## Phase 2 — Sim succession & save v15

- [x] Task: Succession — `graduateWithPair` + founder parentage
      (`legacy.ts`)
  - [x] Failing tests: pair graduation archives the retiree with traits +
        parents, increments generation, keeps AP/day/ladder/session, and sets
        successor `parents` to the pair; founder path sets
        `parents: [generation]`; invalid/duplicate pairs rejected; founder
        behavior otherwise identical. `legacy.test.ts` (+7 tests).
  - [x] Implement `graduateWithPair(state, generations, speciesId, seed)`;
        refactor shared archiving/successor code with `graduate`; keep
        `graduate` as the founder wrapper. Implemented in `breeding.ts` to
        avoid a `legacy` ↔ `breeding` cycle; `retireeRecord` was extracted to
        `legacy.ts` and is now shared by both graduates.
  - [x] Update `legacy.test.ts` fixtures for new fields; add a bred-succession
        golden (seeded golden added to `breeding.test.ts`, plus the exact
        dual-parent floor test).
- [x] Task: Save v15 + validation (`save/schema.ts`, `save/migrate.ts`,
      `save/storage.ts`)
  - [x] Failing tests: v14 fixture migrates to v15 with creature/records
        gaining `traits: []`, `parents: []`; all other data forwarded;
        `SAVE_VERSION === 15`; `serializeSave` stamps 15; validation rejects
        unknown trait ids, >2 parents, duplicate parents, negative/non-integer
        parents. `save/breedingSave.test.ts` (+7 tests).
  - [x] Implement the v14→v15 step after the existing v13→v14 step; extend
        `isValidRetiredRecord` and creature shape validation.
  - [x] Update save fixtures and `legacySave.test.ts` / `save.test.ts` for v15
        (plus the `cupSave.test.ts` version assertion).
- [x] Task: Documentation truth pass (`docs/save-schema.md`, `README.md`)
  - [x] Rewrite the schema doc for **v15**, backfill `settings.muted` (v13),
        `legendTitles` + Gold/Legend (v14), and the v15 additions; update the
        migration table.
  - [x] README roadmap: replace the "Silver ladder in progress" line with the
        current Gold→Legend state + breeding.
  - [x] Sweep `conductor/product.md` Phase 2 status wording only where it is
        now factually wrong (no vision rewrites).
- [~] Task: Phase Verification & Checkpoint
  - [x] `bun test packages/sim/src`; migration round-trip; `bun run check`;
        commit `e180eeb`; `bun run verify` green.
  - [x] `[checkpoint: e180eeb]`.

## Phase 3 — Client view-models (TDD, DOM-free)

- [x] Task: Nursery selection VM
      (`apps/client/src/graduation/nursery-vm.ts`, new)
  - [x] Failing tests: initial selection includes the retiring champion; toggle
        on/off; max two; `hatchEnabled` false with 0/1 parent or no species;
        species options update when the pair changes; selecting a third is
        rejected with a state flag (no silent eviction); preselected species
        stays valid or resets.
  - [x] Implement `createNurseryState(pool)`, `toggleParent`, `chooseSpecies`,
        `hatchEnabled`.
- [x] Task: Hatch preview VM
  - [x] Failing tests: preview calls `inheritedFloorFromPair` and renders one
        row per stat with parent-best annotation; trait union badges; mutation
        note; parent names; preview equals the hatched stats for the same seed
        (property-style check over seeds 1/42/99).
  - [x] Implement `hatchPreview(parents, speciesId, seed, prestige)`; it uses
        the same seeded `createBredCreature` as the hatch, so the shown value
        is the exact result.
- [x] Task: Parentage + trait copy
  - [x] Failing tests: `parentageLabel` → "Founder", "Child of Gen 0",
        "Child of Gen 0 × Gen 1"; trait labels/descriptions from the catalog;
        badge order stable (canonical `TRAIT_ORDER`).
  - [x] Implement `parentageLabel(parents)` and `traitCopy(id)`. The signature
        takes the stored parent list (the VM has no `GameState` need); trait
        badges use the catalog order via the preview's `traits` array.
- [~] Task: Phase Verification & Checkpoint
  - [x] 18 pure tests; 99.34% lines / 100% funcs on `nursery-vm.ts`;
        `bun run --filter @apex/client check`; commit `6083a3b`.
  - [ ] `[checkpoint: <sha>]` after approval.

## Phase 4 — Nursery surface & wiring

- [x] Task: Nursery surface (`apps/client/src/graduation/nursery.ts`, new;
      split from `graduation.ts` if the size budget is exceeded)
  - [x] Parent card grid (crest, name, species, gen, cups, stats, trait badge,
        "Retiring" marker); two-select state; species choice; floor preview
        table; mutation note; "Hatch egg" primary action; focus trap,
        Escape/backdrop close, keyboard selection, `aria-pressed`; reduced-
        motion-safe.
  - [x] Use shared `ui/kit.ts` primitives and `graduation.css`/kit styles only;
        no new palette.
  - [x] Commit `712ea15`.
- [x] Task: Wire the graduation flow (`graduation.ts`, `main.ts`)
  - [x] Send-off → `showNursery(state)` when `canBreed`, else existing founder
        `showEggScreen`.
  - [x] `main.ts`: `onHatch({ generations, speciesId })` →
        `graduateWithPair`; founder path still `graduate`; commit, close, sync
        scene, announce; preserve close-before-hatch.
  - [x] Commit `712ea15`.
- [x] Task: Hall of Fame + creature detail
  - [x] Trait badges and parentage line on Hall entries; "Lineage" row + trait
        badges in `creature-detail.ts`; legacy records derive traits for
        display.
  - [x] Commit `712ea15`.
- [x] Task: Phase Verification & Checkpoint (manual evidence)
  - [x] Manual: founder pick unchanged; breed two records; preview matches
        hatch; duplicate trait dedupes; Hall metadata; detail Lineage row;
        save→reload keeps the successor; console clean; narrow 393×659 pass
        with tap selection; `bun run verify` green.
  - [x] `[checkpoint: 712ea15]` after approval.

## Phase 5 — Final acceptance & close

- [x] Task: Full acceptance matrix
  - [x] Every `spec.md` criterion walked: founder graduation unchanged
        (Phase 4 screenshot + `legacy.test.ts`); second+ graduation opens the
        Nursery with any two pool records, parent-limited species, and a
        preview that matches the hatch (manual Ember x Tide exact match +
        `breeding.test.ts`); both parents' traits on egg/Hall/detail with
        duplicates collapsed; seed reproducibility and baked mutation
        (`breeding.test.ts`, `creature.test.ts`); v14 migration loses nothing
        and malformed trait/parent arrays are rejected (`breedingSave.test.ts`);
        docs match v15 (`save-schema.md`, `README.md`, `product.md`).
  - [x] Balance probe (567 floor samples over 3 stat profiles x 3 species x
        prestige 0-6 x three trait sets; floor as % of the best parent):
        HP 76.8 / 88.9 / 105.8, ATK 72.7 / 81.8 / 137.5, DEF 63.6 / 81.8 /
        120.0, SPD 54.5 / 81.8 / 142.9 (min / median / max). No stat collapses;
        the >100% tail is trait/milestone bonuses on small stats.
  - [x] No new per-frame work: the Nursery is DOM-only (`nursery.ts` has no
        rAF, timers, or per-frame allocation); the render loop is untouched.
  - [x] `bun run verify` exit 0; `bun test --parallel` 1492 pass / 1 skip /
        0 fail; biome only the four pre-existing cup warnings; determinism
        gate byte-identical. Manual desktop + 393x659 pass from Phase 4.
  - [x] Close-before-hatch keeps the champion (gen 2, Hall 2, no new record)
        and reload mid-Nursery boots the same champion with no partial state.
  - [x] Commit `f1d8b3c` (docs truth: the legacy type-affinity claim).
- [x] Task: Track close
  - [x] Git-note verification report on the last functional commit.
  - [x] Mark plan complete; archive the track; update `conductor/tracks.md`;
        commit.

## Sequencing notes

- Phases 1–2 are sim-only and can land without UI.
- Phase 3 is pure and test-first.
- Phase 4 is the only manual-evidence-heavy phase.
- No phase touches the unmerged `ranch_rituals` surfaces (`ranch-motion.ts`,
  `scene-logic.ts`, care cues).
