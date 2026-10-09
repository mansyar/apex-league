# Plan: Creature Ownership & Care Loop (`care_loop_20261010`)

Workflow: `conductor/workflow.md` (TDD for logic-bearing code; phases end
with a verification & checkpoint task).

## Phase A — Creature Entity & Starter Catalog (sim)

- [x] Task: Failing tests — creature creation & catalog (`64dba27`)
  - [ ] seeded creature creation produces deterministic stats within species bounds (Rng seam)
  - [ ] starter catalog exposes Fire drake + Plant ox selectable, Water axolotl locked/"coming soon"
  - [ ] creature rejected/invalid cases (unknown archetype, out-of-bounds rolls)
- [x] Task: Implement creature module (state shape, seeded stat roll, element type, stage field) (`64dba27`)
- [x] Task: Implement starter catalog (species data: archetype id, element, base-stat bounds, display name/flavor) (`64dba27`)
- [x] Task: Integrate creature into `GameState` (nullable — pre-starter saves exist) (`64dba27`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 64dba27]

## Phase B — Daily Settlement Tick (sim)

- [ ] Task: Failing tests — day-advance settlement (fixed order, seeded)
  - [ ] hunger falls; waking starving → mood penalty + raised sickness risk
  - [ ] night energy recovery: full when well-fed/healthy; partial when starving/sick
  - [ ] sickness roll probabilities (seeded); existing sickness worsens instead of re-rolling
  - [ ] mood settles toward care quality; bond slow-decay without bonding actions
  - [ ] misery floor: no death, refusal-to-play state, recoverable
- [ ] Task: Implement settlement in `advanceDay` (pure, ordered steps 1–6)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase C — Care Actions (sim)

- [ ] Task: Failing tests — care actions & AP economy
  - [ ] feed: hunger restore (+small energy), AP cost
  - [ ] rest (nap): energy restore, AP cost
  - [ ] treat: cures sickness; severity affects recovery; AP cost
  - [ ] play: mood + bond gain, energy cost; blocked when sick or exhausted (friendly rejection)
  - [ ] AP insufficiency rejections for all actions
  - [ ] care quality modulates mood/bond gains (e.g. feeding starving vs. fed)
- [ ] Task: Implement care action module (pure functions over state + AP)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — Save Migration v1→v2 (sim)

- [ ] Task: Failing tests — v2 schema & migration
  - [ ] v2 save round-trips creature state
  - [ ] v1 save migrates with default Fire drake starter granted
  - [ ] corrupt/future-version saves still rejected
- [ ] Task: Implement `SAVE_VERSION = 2` + v1→v2 migration step in chain
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase E — Client: Starter Choice & Care UI (rendering/UI — manual verification)

- [ ] Task: Starter choice screen (3 cards: Fire/Plant selectable, Water teased; writes creature into state)
- [ ] Task: Creature condition panel (name, element badge, five 0–100 bars, sickness callout) — warm broadcast-overlay aesthetic per spec §5
- [ ] Task: Care action menu (Feed/Rest/Treat/Play with AP costs; disabled states with reasons; Advance Day retained)
- [ ] Task: Ranch scene via archetype registry — owned creature rendered instead of hardcoded drake
- [ ] Task: Visual condition states — sluggish idle (low energy), droopy (sick), happy bounce (high mood) via existing rig
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase F — Integration & Verification Gate

- [ ] Task: Full gate — `bun run verify` (check, tests, biome, determinism) green
- [ ] Task: Browser manual verification pass (starter → care day → sickness → cure → visual states) with screenshot evidence
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
