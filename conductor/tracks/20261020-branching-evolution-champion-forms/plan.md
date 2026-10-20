# Implementation Plan: Branching Evolution & Champion Forms

## Phase 1: Branch contract, derivation, and evolution

**Goal:** Two branches per starter species exist in the sim, a pure rule derives the earned branch from trained stats, and evolution applies the branch's boosts and signature move.
**Depends on:** none
**Covers:** FR-1, FR-2, FR-3, FR-4
**Touches:** `packages/sim/src/branches.ts` (new), `packages/sim/src/branches.test.ts` (new), `packages/sim/src/creature.ts`, `packages/sim/src/evolution.ts`, `packages/sim/src/evolution.test.ts`, `packages/sim/src/settlement.ts`, `packages/sim/src/battle/moves.ts`, `packages/sim/src/battle/moves.test.ts`, `packages/sim/src/loadout.ts`, `packages/sim/src/loadout.test.ts`, `packages/sim/src/index.ts`
**Verification:** `bun test --timeout 120000 packages/sim/src/branches.test.ts packages/sim/src/evolution.test.ts packages/sim/src/loadout.test.ts packages/sim/src/battle/moves.test.ts && bun run verify && bun run build`
**Status:** pending

- [ ] **P1.T1 — Author the branch catalog and the synthetic legacy branch**
  - [ ] Define six real branches (two per starter) with id, species, label, coach line, favored pair, juvenile boost, cumulative champion boost, signature move, and accent hue.
  - [ ] Define `legacy` from the existing `EVOLUTION_STAT_BOOST` and `CHAMPION_STAT_BOOST` so the old numbers have one source.
  - [ ] Export `getBranch` and `branchesForSpecies`; assert two real branches per shipped species, unique ids, known move ids, and equal effective budgets (11 juvenile, 22 champion, HP double).
- [ ] **P1.T2 — Implement `branchLean` with the documented tie-break**
  - [ ] Compare trained `atk+spd` vs `hp+def`, then the highest single trained stat, then effective stats, then species order.
  - [ ] Return the branch plus the lean source (`trained` or `nature`); no randomness, no floats.
  - [ ] Test each fallback in isolation and assert repeated calls are identical.
- [ ] **P1.T3 — Apply the branch in evolution**
  - [ ] Add `branch: string | null` to `Creature` and carry it through `settleCreature`, `createCreature`, and bred successors.
  - [ ] Derive and store the branch at the juvenile gate; keep it and apply the cumulative boost at the champion gate; keep `legacy` exactly on the old numbers.
  - [ ] Add golden tests proving a legacy evolution is byte-identical to today and both real branches land on their budget.
- [ ] **P1.T4 — Add signature moves and branch-aware loadouts**
  - [ ] Append six specials, one per real branch, with equal expected damage per cooldown and different variance.
  - [ ] Make `knownMoves` append the signature at juvenile and `requiredDays` accept it only for that branch; keep the default loadout at the first four species moves.
  - [ ] Test accept, sibling-branch reject, legacy reject, and unchanged default.

## Phase 2: Save v19, migration, and records

**Goal:** Every existing save migrates deterministically, the branch survives export/import, and retired creatures record their form.
**Depends on:** Phase 1
**Covers:** FR-7, FR-8, NFR-4
**Touches:** `packages/sim/src/save/schema.ts`, `packages/sim/src/save/migrate.ts`, `packages/sim/src/save/storage.ts`, `packages/sim/src/save/transfer.ts`, `packages/sim/src/save/*.test.ts`, `packages/sim/src/legacy.ts`, `packages/sim/src/breeding.ts`, `packages/sim/src/breeding.test.ts`, `packages/sim/src/graduation.test.ts`, `docs/save-schema.md`
**Verification:** `bun test --timeout 120000 packages/sim/src/save packages/sim/src/breeding.test.ts packages/sim/src/graduation.test.ts && bun run verify && bun run build`
**Status:** pending

- [ ] **P2.T1 — Bump the schema to v19 and validate the field**
  - [ ] Add `creature.branch` and `RetiredRecord.branch`; accept only known ids or `null`, and reject a branch on a baby.
  - [ ] Keep the failure path on the existing corrupt-save recovery flow with no partial writes.
- [ ] **P2.T2 — Migrate v18 fixtures**
  - [ ] Map v18 babies to `null`, v18 juveniles and champions to `legacy`, and Hall records to `legacy`.
  - [ ] Hold stats, training, loadouts, and lineage constant; assert totals and exported JSON.
  - [ ] Cover baby, juvenile, champion, mid-cup, and Hall-record fixtures.
- [ ] **P2.T3 — Carry the branch through records, breeding, and transport**
  - [ ] Store and render it on `RetiredRecord`; keep new eggs at `null` and do not pre-select from parents.
  - [ ] Round-trip v19 through export/import and document the field, migration table, and legacy exception.

## Phase 3: Rivals, bosses, and balance

**Goal:** Generated rivals show both forms deterministically, bosses stay on their pinned legacy numbers, and the two branches are proven to be sidegrades.
**Depends on:** Phase 2
**Covers:** FR-9, FR-4, NFR-1, NFR-6
**Touches:** `packages/sim/src/battle/rival-kit.ts`, `packages/sim/src/battle/rival-kit.test.ts`, `packages/sim/src/battle/exhibition.ts`, `packages/sim/src/bosses.ts`, `packages/sim/src/bosses.test.ts`, `conductor/tracks/20261020-branching-evolution-champion-forms/verification/phase-3.md`
**Verification:** `bun test --timeout 120000 packages/sim/src/battle packages/sim/src/bosses.test.ts && bun run verify && bun run build`
**Status:** pending

- [ ] **P3.T1 — Derive rival branches from their seeded profile**
  - [ ] Apply the same `branchLean` rule to generated rivals, using their trained profile and falling back to natural stats.
  - [ ] Assert determinism per seed and that a cup field can contain both forms.
- [ ] **P3.T2 — Pin bosses to legacy and assert no drift**
  - [ ] Mark boss definitions legacy or leave them branchless; verify pinned stats, loadouts, and tactics are unchanged.
  - [ ] Assert no boss loadout references a signature move.
- [ ] **P3.T3 — Run and record branch balance probes**
  - [ ] Mirror each branch against itself and against legacy across all three species and a fixed seed set.
  - [ ] Confirm neither branch exceeds 55% in mirrors or leaves the 40–70% legacy band, and that both signatures appear in viable loadouts.
  - [ ] Tune branch boosts or signature numbers in Phase 1 files only if a probe fails, then rerun the full gate.

## Phase 4: Lean preview, reveal, and detail surfaces

**Goal:** The player can see which form the training favors before the gate and understands the form they earned afterwards, with no new modal.
**Depends on:** Phase 3
**Covers:** FR-5, FR-6, FR-10, FR-12
**Touches:** `apps/client/src/growth-panel.ts`, `apps/client/src/growth-panel.test.ts`, `apps/client/src/hud/plates.ts`, `apps/client/src/hud/copy-care.ts`, `apps/client/src/hud/copy-cup.ts`, `apps/client/src/hud/copy.test.ts`, `apps/client/src/creature-detail.ts`, `apps/client/src/detail/*`, `apps/client/src/ui/kit.css`, `apps/client/src/ranch.css`
**Verification:** `bun test --timeout 120000 apps/client/src/growth-panel.test.ts apps/client/src/hud/copy.test.ts apps/client/src/creature-detail.test.ts && bun run verify && bun run build`
**Status:** pending

- [ ] **P4.T1 — Add the day-5 lean row to the growth panel**
  - [ ] Render the branch label and a trained/nature qualifier from `branchLean`; update after settlement.
  - [ ] Show nothing before day 5 and never print an undiscovered threshold.
- [ ] **P4.T2 — Reveal the earned form and label the plate**
  - [ ] Extend the evolution morning copy to name the branch in coach voice without asking for confirmation.
  - [ ] Add the branch label and crest to the creature plate, with a text equivalent for screen readers.
- [ ] **P4.T3 — Show the branch in the detail modal**
  - [ ] Add the form and signature move with its branch tag to the detail tabs and move pool.
  - [ ] Keep the signature out of the pool for the sibling branch and legacy.
- [ ] **P4.T4 — Verify keyboard, contrast, and reduced motion**
  - [ ] Assert the new text is conveyed without hue and the reveal does not depend on animation.
  - [ ] Check the lean row and branch badge at the desktop and narrow breakpoints.

## Phase 5: Tint, handbook, and documentation

**Goal:** The branch reads at a glance in the ranch and arena, the handbook teaches the rule, and every doc matches the shipped behavior.
**Depends on:** Phase 4
**Covers:** FR-10, FR-11, NFR-1, NFR-2, NFR-3, NFR-5, NFR-7
**Touches:** `apps/client/src/creature.ts`, `apps/client/src/creature.test.ts`, `apps/client/src/handbook/*`, `apps/client/src/handbook/handbook.test.ts`, `conductor/product.md`, `conductor/tech-stack.md`, `README.md`, `conductor/tracks/20261020-branching-evolution-champion-forms/verification/phase-5.md`
**Verification:** `bun test --timeout 120000 apps/client/src/creature.test.ts apps/client/src/handbook && bun run verify && bun run build && bun run gate:determinism`
**Status:** pending

- [ ] **P5.T1 — Apply the per-instance accent tint**
  - [ ] Tint from the branch accent hue at spawn and on evolution, cloning materials where they would otherwise be shared.
  - [ ] Test that tinting one creature leaves another's materials unchanged and that no geometry or draw call is added.
- [ ] **P5.T2 — Teach paths in the handbook**
  - [ ] Explain the stat split, the day-5 preview, the signature move, and the legacy exception from sim constants and labels.
  - [ ] Keep every tooltip within two sentences and avoid spoiling thresholds.
- [ ] **P5.T3 — Sync docs and capture visual evidence**
  - [ ] Update the roadmap, tech stack, and README claims; note the derived-branch rule and the runtime tint.
  - [ ] Capture desktop and narrow-viewport screenshots of the lean row, reveal, detail modal, and both tinted forms.
