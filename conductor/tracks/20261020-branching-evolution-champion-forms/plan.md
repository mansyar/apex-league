# Implementation Plan: Branching Evolution & Champion Forms

## Phase 1: Branch contract, derivation, and evolution

**Goal:** Two branches per starter species exist in the sim, a pure rule derives the earned branch from trained stats, and evolution applies the branch's boosts and signature move.
**Depends on:** none
**Covers:** FR-1, FR-2, FR-3, FR-4
**Touches:** `packages/sim/src/branches.ts` (new), `packages/sim/src/branches.test.ts` (new), `packages/sim/src/creature.ts`, `packages/sim/src/evolution.ts`, `packages/sim/src/evolution.test.ts`, `packages/sim/src/settlement.ts`, `packages/sim/src/battle/moves.ts`, `packages/sim/src/battle/moves.test.ts`, `packages/sim/src/loadout.ts`, `packages/sim/src/loadout.test.ts`, `packages/sim/src/index.ts`
**Verification:** `bun test --timeout 120000 packages/sim/src/branches.test.ts packages/sim/src/evolution.test.ts packages/sim/src/loadout.test.ts packages/sim/src/battle/moves.test.ts && bun run verify && bun run build`
**Status:** verified

- [x] **P1.T1 - Author the branch catalog and the synthetic legacy branch**
  - [x] Define six real branches (two per starter) with id, species, label, coach line, favored pair, juvenile boost, champion-step boost, signature move, and accent hue.
  - [x] Define the legacy boost literals in `branches.ts` and re-export them from `evolution.ts` under the historical names, so the old numbers have one source and the modules do not cycle.
  - [x] Export `getBranch` and `branchesForSpecies`; assert two real branches per shipped species, unique ids, known move ids, and equal effective budgets (11 juvenile, 22 champion, HP double).
- [x] **P1.T2 - Implement `branchLean` with the documented tie-break**
  - [x] Compare trained `atk+spd` vs `hp+def`, then the highest single trained stat, then effective stats, then species order.
  - [x] Return the branch plus the lean source (`trained` or `nature`); no randomness, no floats.
  - [x] Test each fallback in isolation and assert repeated calls are identical.
- [x] **P1.T3 - Apply the branch in evolution**
  - [x] Add `branch: string | null` to `Creature` and carry it through `settleCreature`, `createCreature`, and bred successors.
  - [x] Derive and store the branch at the juvenile gate; keep it and apply its champion-step boost at the champion gate; keep `legacy` exactly on the old numbers.
  - [x] Add golden tests proving a legacy evolution is byte-identical to today and both real branches land on their budget.
- [x] **P1.T4 - Add signature moves and branch-aware loadouts**
  - [x] Append six specials, one per real branch, with equal expected damage per cooldown and different variance.
  - [x] Make `knownMoves` append the signature at juvenile and `requiredDays` accept it only for that branch; keep the default loadout at the first four species moves and never include the signature.
  - [x] Test accept, sibling-branch reject, legacy reject, and unchanged default (including a branched juvenile under six trained days).

## Phase 2: Save v19, migration, and records

**Goal:** Every existing save migrates deterministically, the branch survives export/import, and retired creatures record their form.
**Depends on:** Phase 1
**Covers:** FR-7, FR-8, NFR-4
**Touches:** `packages/sim/src/save/schema.ts`, `packages/sim/src/save/migrate.ts`, `packages/sim/src/save/storage.ts`, `packages/sim/src/save/transfer.ts`, `packages/sim/src/save/*.test.ts`, `packages/sim/src/legacy.ts`, `packages/sim/src/breeding.ts`, `packages/sim/src/breeding.test.ts`, `packages/sim/src/graduation.test.ts`, `apps/client/src/save-transfer.test.ts` (fixture only), `docs/save-schema.md`
**Verification:** `bun test --timeout 120000 packages/sim/src/save packages/sim/src/breeding.test.ts packages/sim/src/graduation.test.ts && bun run verify && bun run build`
**Status:** verified

- [x] **P2.T1 - Bump the schema to v19 and validate the field**
  - [x] Add `creature.branch` and `RetiredRecord.branch`; a baby must be `null`, older stages accept `null`, `legacy`, or a species-matched real branch, and Hall records accept any known id with a species match for real forms.
  - [x] Keep the failure path on the existing corrupt-save recovery flow with no partial writes.
- [x] **P2.T2 - Migrate v18 fixtures**
  - [x] Map v18 babies to `null`, v18 juveniles and champions to `legacy`, and Hall records to `legacy`.
  - [x] Hold stats, training, loadouts, and lineage constant; assert totals and exported JSON.
  - [x] Cover baby, juvenile, champion, mid-cup, and Hall-record fixtures.
- [x] **P2.T3 - Carry the branch through records, breeding, and transport**
  - [x] Store it on `RetiredRecord` (rendering is Phase 4); keep new eggs at `null` and do not pre-select from parents.
  - [x] Round-trip v19 through export/import and document the field, migration table, and legacy exception.

## Phase 3: Rivals, bosses, and balance

**Goal:** Generated rivals show both forms deterministically, bosses stay on their pinned legacy numbers, and the two branches are proven to be sidegrades.
**Depends on:** Phase 2
**Covers:** FR-9, FR-4, NFR-1, NFR-6
**Touches:** `packages/sim/src/battle/rival-kit.ts`, `packages/sim/src/battle/rival-kit.test.ts`, `packages/sim/src/battle/exhibition.ts`, `packages/sim/src/battle/resolver.ts`, `packages/sim/src/battle/branch-balance.test.ts` (new), `packages/sim/src/cup/verdicts.ts`, `packages/sim/src/bosses.ts`, `packages/sim/src/bosses.test.ts`, `conductor/tracks/20261020-branching-evolution-champion-forms/verification/phase-3.md`
**Verification:** `bun test --timeout 120000 packages/sim/src/battle packages/sim/src/bosses.test.ts packages/sim/src/battle/branch-balance.test.ts && bun run verify && bun run build`
**Status:** verified

- [x] **P3.T1 - Derive rival branches from their seeded profile**
  - [x] Apply the same `branchLean` rule to generated rivals, using their stat profile with a zeroed training record; a cup slot derives at battle time so brackets and sessions stay unchanged.
  - [x] Assert determinism per seed, that a cup field can contain both forms, and that stats, kits, and outcomes are unchanged by the display field.
  - [x] Carry the earned form on the owner's battle side too, so both sides expose the same display field.
- [x] **P3.T2 - Pin bosses to legacy and assert no drift**
  - [x] Mark all six boss definitions `legacy`; verify pinned stats, loadouts, and tactics are unchanged.
  - [x] Assert no boss loadout references a signature move.
- [x] **P3.T3 - Run and record branch balance probes**
  - [x] Mirror each branch against itself and against legacy across all three species and a fixed seed set.
  - [x] Confirm neither branch exceeds 55% in mirrors or leaves the 40-70% legacy band, and that all six signatures appear in viable loadouts.
  - [x] Retune four champion-step rows after the first probe left the legacy band (juvenile boosts, signatures, and the 22-point budget unchanged), then rerun the full gate.

## Phase 4: Lean preview, reveal, and detail surfaces

**Goal:** The player can see which form the training favors before the gate and understands the form they earned afterwards, with no new modal.
**Depends on:** Phase 3
**Covers:** FR-5, FR-6, FR-10, FR-12
**Touches:** `apps/client/src/growth.ts`, `apps/client/src/growth-panel.ts`, `apps/client/src/growth-panel.test.ts`, `apps/client/src/hud/copy-branch.ts`, `apps/client/src/hud/copy-growth.ts`, `apps/client/src/hud/plates-creature.ts`, `apps/client/src/hud/plates.test.ts`, `apps/client/src/hud/update.ts`, `apps/client/src/hud/copy.test.ts`, `apps/client/src/creature-detail.ts`, `apps/client/src/detail/path.ts`, `apps/client/src/ui/kit.css`, `apps/client/src/ranch.css`, `packages/sim/src/stats.ts`, `packages/sim/src/stats.test.ts`
**Verification:** `bun test --timeout 120000 apps/client/src/growth-panel.test.ts apps/client/src/hud/copy.test.ts apps/client/src/creature-detail.test.ts apps/client/src/hud/plates.test.ts packages/sim/src/stats.test.ts && bun run verify && bun run build`
**Status:** verified

- [x] **P4.T1 - Add the day-5 lean row to the growth panel**
  - [x] Render the path title, branch label and trained/nature qualifier from `branchPath`/`branchLean`; update after settlement and after evolution (earned label replaces the preview).
  - [x] Show nothing before day 5 and never print an undiscovered threshold.
- [x] **P4.T2 - Reveal the earned form and label the plate**
  - [x] Name the earned form in the evolution-morning callout, reading that branch's own applied boost and keeping the legacy output unchanged.
  - [x] Render the form label as its own full-width plate line (not a third chip): full label plus favored stats, legacy without "favors —", hidden for a baby and on the collapsed plate. A seeded 1400px browser check caught the chip truncating both the label and the name; the line fixes it.
- [x] **P4.T3 - Show the branch in the detail modal**
  - [x] Add the Path section to the Stats tab: form/preview, favors, signature and one coach line; legacy shows no signature. The sibling signature is not offered in the move pool, so there is no tag to add there.
  - [x] Make `statBreakdown` branch-aware so the "evolved" chips match the boost actually applied (Courser juvenile +2/+4/+1/+2, champion +7/+11/+4/+4); legacy chips unchanged.
- [x] **P4.T4 - Verify text, contrast, and reduced motion**
  - [x] Text plus accent hue on every surface; no added motion; plate line and lean row tested for position and hidden states.
  - [x] Desktop visually verified in a seeded browser (baby lean, Courser plate line, Courser detail, legacy detail); the narrow viewport could not be resized in the harness, so wrap/collapse behavior rests on the DOM tests.

## Phase 5: Tint, handbook, and documentation

**Goal:** The branch reads at a glance in the ranch and arena, the handbook teaches the rule, and every doc matches the shipped behavior.
**Depends on:** Phase 4
**Covers:** FR-10, FR-11, NFR-1, NFR-2, NFR-3, NFR-5, NFR-7
**Touches:** `apps/client/src/creature.ts`, `apps/client/src/creature.test.ts`, `apps/client/src/ranch/mount.ts`, `apps/client/src/ranch/types.ts`, `apps/client/src/ranch/api.ts`, `apps/client/src/ranch/frame.ts`, `apps/client/src/scene.ts`, `apps/client/src/staging.ts`, `apps/client/src/roster.ts`, `apps/client/src/cup/arena.ts`, `apps/client/src/spar/casting.ts`, `apps/client/src/handbook.ts`, `apps/client/src/handbook/paths.ts`, `apps/client/src/handbook.test.ts`, `apps/client/src/ui/kit.css`
**Verification:** `bun test --timeout 120000 apps/client/src/creature.test.ts apps/client/src/handbook.test.ts apps/client/src/face-arena.test.ts && bun run verify && bun run build && bun run gate:determinism`
**Status:** in_progress

- [ ] **P5.T1 - Apply the per-instance accent tint**
  - [ ] Tint from the branch accent hue at spawn and on evolution; never tint `legacy`; set only the material colour multiplier (vertex colours carry the coat), adding no geometry, material, or draw call.
  - [ ] Test that tinting one creature leaves another's materials unchanged, that the mesh count is unchanged, and that the legacy group stays at the untinted colour.
- [ ] **P5.T2 - Teach paths in the handbook**
  - [ ] Explain the stat split, the pre-gate preview, the signature move, and the legacy exception from sim constants and labels.
  - [ ] Keep every tooltip within two sentences and avoid spoiling thresholds.
- [ ] **P5.T3 - Visual evidence (orchestrator)**
  - [ ] Capture desktop screenshots of the tinted forms, the lean row, the reveal and the detail Path. Product/README/tech-stack doc sync runs in the Conductor doc-sync step, not in this phase.
