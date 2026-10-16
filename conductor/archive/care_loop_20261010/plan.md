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

- [x] Task: Failing tests — day-advance settlement (fixed order, seeded) (`6894405`)
  - [x] hunger falls; waking starving → mood penalty + raised sickness risk
  - [x] night energy recovery: full when well-fed/healthy; partial when starving/sick
  - [x] sickness roll probabilities (seeded); existing sickness worsens instead of re-rolling
  - [x] mood settles toward care quality; bond slow-decay without bonding actions
  - [x] misery floor: no death, refusal-to-play state, recoverable
- [x] Task: Implement settlement in `advanceDay` (pure, ordered steps 1–6) (`6894405`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 6894405]

## Phase C — Care Actions (sim)

- [x] Task: Failing tests — care actions & AP economy (`b216855`)
  - [x] feed: hunger restore (+small energy), AP cost
  - [x] rest (nap): energy restore, AP cost
  - [x] treat: cures sickness; severity affects recovery; AP cost
  - [x] play: mood + bond gain, energy cost; blocked when sick or exhausted (friendly rejection)
  - [x] AP insufficiency rejections for all actions
  - [x] care quality modulates mood/bond gains (e.g. feeding starving vs. fed)
- [x] Task: Implement care action module (pure functions over state + AP) (`b216855`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: b216855]

## Phase D — Save Migration v1→v2 (sim)

- [x] Task: Failing tests — v2 schema & migration (`022d8aa`)
  - [x] v2 save round-trips creature state
  - [x] v1 save migrates with default Fire drake starter granted
  - [x] corrupt/future-version saves still rejected
- [x] Task: Implement `SAVE_VERSION = 2` + v1→v2 migration step in chain (`022d8aa`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 022d8aa]

## Phase E — Client: Starter Choice & Care UI (rendering/UI — manual verification)

- [x] Task: Starter choice screen (3 cards: Fire/Plant selectable, Water teased; writes creature into state) (`ef94929`)
- [x] Task: Creature condition panel (name, element badge, five 0–100 bars, sickness callout) — warm broadcast-overlay aesthetic per spec §5 (`ef94929`)
- [x] Task: Care action menu (Feed/Rest/Treat/Play with AP costs; disabled states with reasons; Advance Day retained) (`ef94929`)
- [x] Task: Ranch scene via archetype registry — owned creature rendered instead of hardcoded drake (`ef94929`)
- [x] Task: Visual condition states — sluggish idle (low energy), droopy (sick), happy bounce (high mood) via existing rig (`ef94929`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: ef94929]

## Phase F — Integration & Verification Gate

- [x] Task: Full gate — `bun run verify` (check, tests, biome, determinism) green (`ef94929`)
- [x] Task: Browser manual verification pass (starter → care day → sickness → cure → visual states) with screenshot evidence (`ef94929`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: ef94929]

## Review — Apply review suggestions

- [x] Task: Apply review suggestions (threshold centralization, copy/doc nits) (`95a34cf`)
