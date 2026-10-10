# Plan: Living Ranch — wind, feeding ceremony, wandering

Spec: [spec.md](./spec.md) · Branch: `track/living_ranch_20261010`
Type: Feature · Order: cheap → architecture (wind → ceremony → wander)

Each phase follows workflow.md TDD where logic is pure and ends with a Phase
Verification & Checkpoint gate run before moving on.

## Phase A — Wind sway on scenery

- [x] Task: Scene-logic module (failing tests) — extract pure wind math:
  - [x] per-class amplitude table (tuft > bush > tree, rocks/foodPile = 0) + position-hash phase offsets (stable per prop world position, seeded — no Math.random)
  - [x] gust envelope: low-frequency smooth noise mapped into [0.4, 1.2] × base amplitude, no discontinuities
  - [x] `prefers-reduced-motion` flattens every amplitude to 0
  - [x] boundary tests: gust continuity, amplitude table completeness for every registry prop id, phase-hash stability, reduced-motion zeroing (`9b7755c`)
- [x] Task: Wire scene.ts — attach per-prop `{group, baseAmp, phase}` at scatter time; per-tick rotation around base axis; no geometry/material edits; landmark trees included, rocks/pile excluded (`d104fe7`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — bun run check, targeted tests, biome, browser screenshot confirming visible sway across multiple props *(checkpoint: d104fe7)*

## Phase B — Feeding ceremony

- [x] Task: Ceremony state machine (failing tests) in the scene-logic module:
  - [x] phases `turn → walk-out → nibble(2–3 dips) → walk-home` with fixed durations totaling ~4–6 s; phase transitions from tick deltas; invalid-phase guards
  - [x] instant-cancel from ANY user input path → single `cancel()` that returns the machine to `home-idle` (position lerps home); never queues
  - [x] reduced-motion variant: turn+travel collapsed to in-place nibble at anchor, still cancellable
  - [x] successive feeds re-trigger cleanly even while pile already visible (`be47529`)
- [x] Task: Wire scene.ts + main.ts — creature yaw target, walk target near pile (seeded side offset, pile anchor from existing scatter data), head-dip overlay on the existing head-bob pivot; main.ts onCare feed branch calls `scene.startFeedCeremony()` only after a successful feed; care/train/advance callers already flow through `scene.cancelFeedCeremony()` — add call, never the reverse (`4999be2`)
- [x] Task: Diagonal-pair walk gait (failing tests) in the scene-logic module — `legFL`+`legBR` in phase, `legFR`+`legBL` counterphase, sinusoidal swing at a walking cadence, walk-bob overlay; amplitude eased with the walk phase so it blends in/out; reduced-motion → zero; applied to ceremony travel phases now, reused by wander travel in Phase C (`cbc6852`)
- [x] Task: Position-driven ceremony walk (rework) — stride by position, not by clock: walk from the current position to the pile stand spot at a constant speed, nibble in place, walk back to the home anchor; dt-stepped with a clamp so pauses/frame gaps can never skip a phase or freeze the body mid-path; TDD in the scene-logic module, replacing the fixed-duration ceremony machine. Includes the fixes surfaced during live review: turn-then-walk with a `pivoting` flag (legs frozen during the pivot, stride-then-translate never crab-walks), straight-line stand spot on the creature→pile line, rig re-anchor via an identity-scale holder (grid-vs-world units bug), heading flip to the mesh's true +z rest-facing, deeper nibble dip, and debug scaffolding removed (`21be1b9`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — unit tests green; browser evidence: feed → pile up + creature nibbling; mid-ceremony HUD input applies to sim while ceremony plays out (non-cancelable, 2026-10-10 decision); legs visibly swing during ceremony travel; creature always ends back at the home anchor *(checkpoint: 21be1b9)*

## Phase C — Sparse wandering

- [x] Task: Wander scheduler (failing tests) in the scene-logic module:
  - [x] gap chooser 20–40 s from free-running Rng seeded `visualSeed ^ stepCount` (never wall-clock; no save interaction)
  - [x] target chooser: near a visible tuft/bush, min distance from pile anchor and inside moss disc; deterministic per (seed, step)
  - [x] visit pause with look-around head turns (1–2 s); droopy/sick mood profiles (from existing scenes mapping) suppress wandering; end state always `home-idle` (`955280a`)
- [x] Task: Locomotion + camera — diagonal-pair gait (from the Phase B scene-logic module) on existing leg pivots at walking cadence; orbit target soft-lerps to creature pos, returns to home anchor; user drag/wheel remains authoritative (wired with the wander task — `drive = wandDrive ?? wd` gies trips the same applyGait path; camera eases toward the creature during trips and drifts home in idle; verified live on :5178 — trip frames show tracking + look-around sweep; commit `2d8d218`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — unit tests; browser evidence: a full wander trip + camera tracking, reduced-motion shows no wandering *(checkpoint: sha)*

## Phase D — Integration and Verification Gate

- [ ] Task: Full gate — `bun run verify` green everywhere; `bun run gate:determinism` reports byte-identical creature GLBs and matching prop digests (zero geometry churn)
- [ ] Task: Browser manual verification — screenshot evidence: swaying meadow, ceremony sequence (3 shots), one wander trip; reduced-motion check of both
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) *(checkpoint: sha)*

## Notes

- Estimated diff surface: `apps/client/src/` only (scene-logic module new; scene.ts, main.ts touched) + one new test file. No sim, no save, no voxel data.
- Also at lines 86 and 123 of spec.md: ceremony behavior referenced as "cancel + home" and
  "Any HUD input during ceremony cancels instantly" — superseded 2026-10-10: ceremony is
  non-cancelable (see FR2 revision); those summary lines were updated in the same commit.
